import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const hero = __HEROS__.find(item => item.name === '司马炎');
    const skill = __SKILLS__.find(item => item.id === hero.skill);
    assert.deepEqual([hero.camp, hero.star, hero.cost, hero.army, hero.limit], [6, 5, 35, 2, 3]);
    assert.deepEqual(hero.attrs, { atk: 69, def: 89, int: 88, spd: 42, des: 15 });
    assert.deepEqual(hero.attrs_grow, { atk: 1.01, def: 1.98, int: 2.12, spd: 0.86, des: 1.31 });
    assert.deepEqual([skill.type, skill.target, skill.limit, skill.rate], [1, 3, 5, '--']);

    const config = id => ({ id, level: 1, up: 0, arms: 10000,
        equipskill: [0, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } });
    const manager = { Round: 0, Over: false, Record: { Records: [],
        pushRecord() {}, pushActionRecord() {} }, addStat() {} };
    const self = new BattleHero(config(hero.id), 'blue', manager, 100);
    const ally = new BattleHero(config(1003), 'blue', manager, 100);
    const enemy = new BattleHero(config(1004), 'red', manager, 100);
    manager.BlueTeam = { hero: [self, ally] };
    manager.RedTeam = { hero: [enemy] };
    self.Attrs.int = 260;
    skill.callskill(self);
    assert.equal(ally.Storage.simayanReduction.value, 60);
    for (const [round, reduction] of [[1, 60], [2, 52.5], [8, 7.5], [9, 0]]) {
        manager.Round = round;
        const info = { type: 1 };
        getDamageAddition(enemy, ally, info, null);
        const effect = info.damageModifiers.entries.find(entry => entry.name === '谋议宏图');
        assert.equal(effect?.value ?? 0, reduction ? -reduction : 0);
    }
    manager.Round = 1;
    ally.callHook('回合开始时');
    assert.equal(ally.Morale, 108);
    manager.Round = 2;
    ally.callHook('回合开始时');
    assert.equal(ally.Morale, 116);
    console.log('Verified 司马炎 data, 60% reduction at 260 intelligence, decay and morale');
} finally {
    await vite.close();
}
