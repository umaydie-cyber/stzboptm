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

    const build = { morale: 100, generalPlatformLevel: 10,
        fourCampLevels: { swift: 10, iron: 10, strategy: 10, martial: 10 },
        heros: [config(bow.id, 'deadly'), config(bow.id), config(horse.id)] };
    assert.equal(validateBuild(build).heros[0].bowType, 'deadly');
    build.heros[2].bowType = 'crossbow';
    assert.throws(() => validateBuild(build), /弓兵兵种/);
    console.log('Verified bow range, first action, attributes, damage report, and build validation');
} finally {
    await vite.close();
}
