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

    const build = { morale: 100, generalPlatformLevel: 10,
        fourCampLevels: { swift: 10, iron: 10, strategy: 10, martial: 10 },
        heros: [config(horse.id, 'light'), config(foot.id), config(horse.id)] };
    assert.equal(validateBuild(build).heros[0].cavalryType, 'light');
    build.heros[1].cavalryType = 'iron';
    assert.throws(() => validateBuild(build), /骑兵兵种/);
    console.log('Verified cavalry speed, damage charges, counterattack, skill ranges, iron defense, and builds');
} finally {
    await vite.close();
}
