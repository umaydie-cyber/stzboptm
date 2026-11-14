import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
    const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const { validateBuild } = await vite.ssrLoadModule('/src/buildPresets.js');
    const bow = __HEROS__.find(hero => hero.army === 1);
    const horse = __HEROS__.find(hero => hero.army === 3);
    const config = (id, bowType = 'basic') => ({ id, bowType, level: 40, up: 5, arms: 10000,
        equipskill: [0, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } });
    const battle = { Round: 1, Over: false, Record: { pushRecord() {} } };
    const basic = new BattleHero(config(bow.id), 'blue', battle, 100);
    const longbow = new BattleHero(config(bow.id, 'longbow'), 'blue', battle, 100);
    const deadly = new BattleHero(config(bow.id, 'deadly'), 'blue', battle, 100);
    assert.equal(longbow.Limit, basic.Limit + 1);
    assert.equal(deadly.Limit, basic.Limit - 1);
    assert.equal(longbow.BasicLimit, basic.BasicLimit + 1);
    assert.equal(deadly.BasicLimit, basic.BasicLimit - 1);
    for (const attr of ['atk', 'def', 'int']) {
        assert.equal(deadly.Attrs[attr], basic.Attrs[attr] + 18);
        assert.equal(deadly.OriginAttrs[attr], basic.OriginAttrs[attr] + 18);
    }
    const faster = { Attrs: { spd: longbow.Attrs.spd + 100 }, State: { firstAction: { rounds: 0 } } };
    const order = { Round: 1, BlueTeam: { hero: [longbow] }, RedTeam: { hero: [faster] } };
    BattleManger.prototype.sortBattleHerosBySpd.call(order);
    assert.equal(order.SortSpdHeros[0], longbow);
    order.Round = 2;
    BattleManger.prototype.sortBattleHerosBySpd.call(order);
    assert.equal(order.SortSpdHeros[0], longbow);
    order.Round = 3;
    BattleManger.prototype.sortBattleHerosBySpd.call(order);
    assert.equal(order.SortSpdHeros[0], faster);

    const crossbow = new BattleHero(config(bow.id, 'crossbow'), 'blue', battle, 100);
    const target = { Name: '目标', BisicArm: 1, Storage: {}, State: {}, Manger: { Round: 1 },
        getDamageStateValue: () => 0 };
    const info = { type: 1 };
    getDamageAddition(crossbow, target, info, null);
    assert(info.damageModifiers.entries.some(entry => entry.name === '弩兵' && entry.value === 8));

    const traitConfig = config(bow.id, 'longbow');
    traitConfig.bowTraits = ['terrain', 'volley'];
    const traitHero = new BattleHero(traitConfig, 'blue', battle, 100);
    traitHero.Posname = '前锋';
    traitHero.applyBowTraitPositionBonuses();
    assert.equal(traitHero.Attrs.def, longbow.Attrs.def + 24);
    traitHero.Index = 2;
    target.Index = 3;
    const traitInfo = { type: 1 };
    getDamageAddition(traitHero, target, traitInfo, null);
    assert(traitInfo.damageModifiers.entries.some(entry => entry.name === '弓兵·齐射' && entry.value === 15));
    battle.Round = 4;
    const lateInfo = { type: 1 };
    getDamageAddition(traitHero, target, lateInfo, null);
    assert(!lateInfo.damageModifiers.entries.some(entry => entry.name === '弓兵·齐射'));
    traitHero.BowTraits = ['direct', 'detour'];
    target.Index = 5;
    const directInfo = { type: 1 };
    getDamageAddition(traitHero, target, directInfo, null);
    assert(directInfo.damageModifiers.entries.some(entry => entry.name === '弓兵·直射' && entry.value === 6));
    const incomingInfo = { type: 1 };
    getDamageAddition(basic, traitHero, incomingInfo, null);
    assert(incomingInfo.damageModifiers.entries.some(entry => entry.name === '弓兵·迂回' && entry.value === -8));
    const near = { Arms: 100, BattleCamp: 'red' };
    const center = { Arms: 100, BattleCamp: 'red' };
    const far = { Arms: 100, BattleCamp: 'red' };
    traitHero.Manger = { BlueTeam: { hero: [traitHero] }, RedTeam: { hero: [far, center, near] } };
    assert.deepEqual(traitHero.getAdjacentEnemyTargets(center), [near, far]);
    const hits = [];
    traitHero.BowTraits = ['scatter'];
    traitHero.Storage.bowScatterUsed = false;
    traitHero.Manger.Over = false;
    traitHero.Manger.Record = { pushRecord() {}, pushActionRecord() {} };
    traitHero.resolveBasicAttackGuard = target => target;
    traitHero.getSplitAttackTargets = () => [];
    traitHero.performSplitAttack = () => {};
    traitHero.callHook = () => {};
    traitHero.callPursuitSkill = () => {};
    traitHero.registerYuanrongBasicAttack = () => {};
    for (const [targetUnit, name] of [[center, 'center'], [near, 'near'], [far, 'far']]) {
        targetUnit.beHurt = (_source, damage) => hits.push([name, damage.rate]);
    }
    traitHero.basicAttack(center);
    assert.deepEqual(hits, [['center', 100], ['near', 40], ['far', 40]]);
    traitHero.basicAttack(center);
    assert.deepEqual(hits.slice(3), [['center', 100]]);

    const build = { morale: 100, generalPlatformLevel: 10,
        fourCampLevels: { swift: 10, iron: 10, strategy: 10, martial: 10 },
        heros: [config(bow.id, 'deadly'), config(bow.id), config(horse.id)] };
    assert.equal(validateBuild(build).heros[0].bowType, 'deadly');
    build.heros[0].bowTraits = ['terrain', 'scatter'];
    assert.deepEqual(validateBuild(build).heros[0].bowTraits, ['terrain', 'scatter']);
    build.heros[0].bowTraits.push('volley');
    assert.throws(() => validateBuild(build), /弓兵特性/);
    build.heros[0].bowTraits.pop();
    build.heros[2].bowType = 'crossbow';
    assert.throws(() => validateBuild(build), /弓兵兵种/);
    console.log('Verified bow range, first action, attributes, damage report, and build validation');
} finally {
    await vite.close();
}
