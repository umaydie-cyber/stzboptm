import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { validateBuild } = await vite.ssrLoadModule('/src/buildPresets.js');
    const manager = { Round: 1 };
    const unit = (arm, infantryType = 'basic') => ({
        Name: '测试武将', BisicArm: arm, InfantryType: infantryType,
        Storage: {}, State: {}, Manger: manager, getDamageStateValue: () => 0
    });
    const entries = (attacker, target, skill = null) => {
        const info = { type: 1 };
        getDamageAddition(attacker, target, info, skill);
        return info.damageModifiers.entries;
    };
    const has = (list, name, value) => list.some(e => e.name === name && e.value === value);
    assert(has(entries(unit(3), unit(2, 'pike')), '长枪兵克制', -30));
    assert(has(entries(unit(2, 'pike'), unit(1)), '长枪兵克制', -30));
    assert(!entries(unit(2, 'pike'), unit(2)).some(e => e.name === '兵种相克'));
    assert(has(entries(unit(2, 'pike'), unit(3)), '长枪兵', 8));
    assert(has(entries(unit(2, 'tribal'), unit(3)), '蛮兵', 18));
    assert(has(entries(unit(3), unit(2, 'guard')), '禁卫', -6));
    assert(has(entries(unit(3), unit(2, 'guard'), { type: 3 }), '禁卫·追击防护', -20));
    const heavy = unit(2, 'heavy');
    assert(has(entries(unit(3), heavy, { type: 2 }), '重步兵', -12));
    heavy.Storage.heavyInfantryActions = 2;
    assert(has(entries(unit(3), heavy, { type: 2 }), '重步兵', -28));

    const foot = __HEROS__.find(h => h.army === 2);
    const bow = __HEROS__.find(h => h.army === 1);
    const hero = id => ({ id, level: 40, up: 5, arms: 10000, equipskill: [0, 0],
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } });
    const build = { morale: 100, generalPlatformLevel: 10,
        fourCampLevels: { swift: 10, iron: 10, strategy: 10, martial: 10 },
        heros: [hero(foot.id), hero(bow.id), hero(foot.id)] };
    build.heros[0].infantryType = 'heavy';
    assert.equal(validateBuild(build).heros[0].infantryType, 'heavy');
    build.heros[1].infantryType = 'pike';
    assert.throws(() => validateBuild(build), /步兵兵种/);
    const config = hero(foot.id);
    config.infantryType = 'heavy';
    const battle = { Over: false, Record: { pushRecord() {} } };
    const basic = new BattleHero({ ...config, infantryType: 'basic' }, 'blue', battle, 100);
    const converted = new BattleHero(config, 'blue', battle, 100);
    assert.equal(converted.Attrs.spd, basic.Attrs.spd);
    assert.equal(converted.OriginAttrs.spd, basic.OriginAttrs.spd);
    battle.Round = 0;
    converted.callHook('速度排序前');
    assert.equal(converted.Attrs.spd, basic.Attrs.spd);
    battle.Round = 1;
    converted.callHook('速度排序前');
    assert(Math.abs(converted.Attrs.spd - (basic.Attrs.spd - 15)) < 0.001);
    converted.callHook('速度排序前');
    assert(Math.abs(converted.Attrs.spd - (basic.Attrs.spd - 15)) < 0.001);
    assert.equal(converted.OriginAttrs.spd, basic.OriginAttrs.spd);
    converted.callHook('行动前');
    assert.equal(converted.Storage.heavyInfantryActions, 1);
    const traitConfig = { ...config, infantryType: 'pike', infantryTraits: ['sharp', 'defense'], equipskill: [1045, 1044] };
    const sharp = new BattleHero(traitConfig, 'red', battle, 100);
    const plain = new BattleHero({ ...traitConfig, infantryTraits: [] }, 'red', battle, 100);
    const nonActive = sharp.SkillsOrder.filter(id => sharp.Skills[id]?.type !== 2).length;
    assert.equal(sharp.Attrs.atk, plain.Attrs.atk + nonActive * 22);
    const defender = unit(2, 'basic');
    defender.InfantryTraits = ['defense', 'brave'];
    defender.BattleCamp = 'red';
    assert(has(entries(unit(1), defender, { type: 2 }), '步兵·守备', -16));
    const strategyInfo = { type: 2 };
    getDamageAddition(unit(1), defender, strategyInfo, { type: 2 });
    assert(has(strategyInfo.damageModifiers.entries, '步兵·勇毅', -15));
    defender.BattleCamp = 'blue';
    assert(has(entries(unit(1), defender), '步兵·守备', -6));
    const traitAttacker = unit(2, 'pike');
    traitAttacker.InfantryTraits = ['formation', 'strategy'];
    assert(has(entries(traitAttacker, unit(3), { type: 2 }), '步兵·列阵', 10));
    manager.Round = 3;
    const firstStrategy = { type: 2 };
    getDamageAddition(traitAttacker, unit(3), firstStrategy, { type: 2 });
    assert(has(firstStrategy.damageModifiers.entries, '步兵·文韬', 15));
    traitAttacker.Storage.wentaoUsedRound = 3;
    const secondStrategy = { type: 2 };
    getDamageAddition(traitAttacker, unit(3), secondStrategy, { type: 2 });
    assert(!secondStrategy.damageModifiers.entries.some(entry => entry.name === '步兵·文韬'));
    build.heros[1].infantryType = 'basic';
    build.heros[2].infantryType = 'heavy';
    build.heros[2].infantryTraits = ['defense', 'strategy'];
    assert.deepEqual(validateBuild(build).heros[2].infantryTraits, ['defense', 'strategy']);
    build.heros[2].infantryTraits.push('sharp');
    assert.throws(() => validateBuild(build), /步兵特性/);
    console.log('Verified infantry traits, counter relationships, report entries, and build validation');
} finally {
    await vite.close();
}
