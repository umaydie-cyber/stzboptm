import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const { validateBuild } = await vite.ssrLoadModule('/src/buildPresets.js');
    const horse = __HEROS__.find(hero => hero.army === 3);
    const foot = __HEROS__.find(hero => hero.army === 2);
    const config = (id, cavalryType = 'basic') => ({ id, cavalryType, level: 40, up: 5, arms: 10000,
        equipskill: [1045, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } });
    const manager = { Round: 1, Over: false, Record: { pushRecord() {} } };
    const basic = new BattleHero(config(horse.id), 'blue', manager, 100);
    const light = new BattleHero(config(horse.id, 'light'), 'blue', manager, 100);
    assert.equal(light.Attrs.spd, basic.Attrs.spd + 15);
    assert.equal(light.OriginAttrs.spd, basic.OriginAttrs.spd + 15);
    const target = { Name: '目标', BisicArm: 3, InfantryType: 'basic', CavalryType: 'basic',
        Storage: {}, State: {}, Manger: manager, getDamageStateValue: () => 0 };
    const entries = (source, destination, skill = null) => {
        const info = { type: 1 };
        getDamageAddition(source, destination, info, skill);
        return info.damageModifiers.entries;
    };
    const contains = (list, name, value) => list.some(entry => entry.name === name && entry.value === value);
    for (let i = 0; i < 4; i++) {
        assert(contains(entries(light, target), '轻骑兵', 18));
        light.callHook('造成伤害后', light, target, { type: 1 }, null, 100);
    }
    assert.equal(light.Storage.lightCavalryHits, 4);
    assert(!entries(light, target).some(entry => entry.name === '轻骑兵'));

    const archer = new BattleHero(config(horse.id, 'archer'), 'blue', manager, 100);
    assert.equal(archer.Limit, basic.Limit);
    assert.equal(archer.Skills[archer.Skill].limit, basic.Skills[basic.Skill].limit + 1);
    assert.equal(archer.Skills[1045].limit, basic.Skills[1045].limit + 1);
    assert.equal(basic.Skills[1045].limit, 4);

    const iron = new BattleHero(config(horse.id, 'iron'), 'blue', manager, 100);
    assert(!entries(basic, iron).some(entry => entry.name === '铁骑兵'));
    iron.State.confusion.rounds = 1;
    assert(contains(entries(basic, iron), '铁骑兵', -25));
    iron.State.activeLimit.rounds = 1;
    assert(contains(entries(basic, iron), '铁骑兵', -50));

    const heavy = new BattleHero(config(horse.id, 'heavy'), 'blue', manager, 100);
    const counters = [];
    const attacker = { Arms: 1000, beHurt(_source, info, skill) { counters.push({ info, skill }); } };
    heavy.callHook('受伤时', attacker, { type: 1, isBasicAttack: true }, null, 100);
    assert.equal(counters.length, 1);
    assert.deepEqual([counters[0].info.rate, counters[0].info.isCounterattack], [75, true]);
    manager.Round = 3;
    heavy.callHook('受伤时', attacker, { type: 1, isBasicAttack: true }, null, 100);
    assert.equal(counters.length, 1);

    manager.Round = 1;
    const traitConfig = (traits) => ({ ...config(horse.id, 'light'), cavalryTraits: traits });
    const swift = new BattleHero(traitConfig(['swift', 'surprise']), 'blue', manager, 100);
    assert.equal(swift.State.firstAction.rounds, 3);
    assert.equal(swift.State.firstAction.from.skill.name, '骑兵·疾行');
    assert(contains(entries(basic, swift), '骑兵·出奇', -60));
    manager.Round = 2;
    assert(!entries(basic, swift).some(entry => entry.name === '骑兵·出奇'));

    const guarded = new BattleHero(traitConfig(['guarded', 'break']), 'blue', manager, 100);
    assert(contains(entries(basic, guarded, { type: 3 }), '骑兵·难测', -25));
    const basicInfo = { type: 1, isBasicAttack: true };
    getDamageAddition(basic, guarded, basicInfo, null);
    assert(contains(basicInfo.damageModifiers.entries, '骑兵·难测', -25));
    assert(!entries(basic, guarded, { type: 2 }).some(entry => entry.name === '骑兵·难测'));

    const front = new BattleHero(config(horse.id), 'red', manager, 100);
    const middle = new BattleHero(config(horse.id), 'red', manager, 100);
    const back = new BattleHero(config(horse.id), 'red', manager, 100);
    front.Posname = '前锋'; middle.Posname = '中军'; back.Posname = '大营';
    front.Arms = 9000; middle.Arms = 8000; back.Arms = 7000;
    manager.RedTeam = { hero: [front, middle, back] };
    manager.BlueTeam = { hero: [guarded] };
    assert(contains(entries(guarded, front), '骑兵·挫锐', 18));
    assert(!entries(guarded, middle).some(entry => entry.name === '骑兵·挫锐'));
    middle.Arms = 9500;
    assert(contains(entries(guarded, middle), '骑兵·挫锐', 18));
    const rear = new BattleHero(traitConfig(['rear']), 'blue', manager, 100);
    assert(!entries(rear, front).some(entry => entry.name === '骑兵·扰后'));
    assert(contains(entries(rear, middle), '骑兵·扰后', 10));
    assert(contains(entries(rear, back), '骑兵·扰后', 10));

    const build = { morale: 100, generalPlatformLevel: 10,
        fourCampLevels: { swift: 10, iron: 10, strategy: 10, martial: 10 },
        heros: [config(horse.id, 'light'), config(foot.id), config(horse.id)] };
    assert.equal(validateBuild(build).heros[0].cavalryType, 'light');
    build.heros[0].cavalryTraits = ['swift', 'surprise'];
    assert.deepEqual(validateBuild(build).heros[0].cavalryTraits, ['swift', 'surprise']);
    build.heros[0].cavalryTraits = ['swift', 'swift'];
    assert.throws(() => validateBuild(build), /骑兵特性/);
    build.heros[0].cavalryTraits = ['swift', 'invalid'];
    assert.throws(() => validateBuild(build), /骑兵特性/);
    build.heros[0].cavalryTraits = ['swift', 'surprise'];
    build.heros[1].cavalryType = 'iron';
    assert.throws(() => validateBuild(build), /骑兵兵种/);
    console.log('Verified cavalry types, five selectable traits, damage sources, and builds');
} finally {
    await vite.close();
}
