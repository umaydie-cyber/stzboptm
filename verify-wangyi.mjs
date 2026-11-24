import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const hero = __HEROS__.find(item => item.name === '王异');
    const skill = __SKILLS__.find(item => item.id === hero.skill);
    assert.deepEqual([hero.camp, hero.army, hero.cost, hero.limit], [2, 1, 25, 4]);
    assert.deepEqual(hero.attrs_grow, { atk: 1.42, def: 0.84, int: 1.70, spd: 0.86, des: 0.72 });
    assert.equal(skill.name, '世仇');
    assert.equal(skill.type, 3);
    assert.equal(skill.study, false);

    const manager = {
        Round: 3, Over: false, Record: { pushRecord() {}, pushActionRecord() {} }, addStat() {}
    };
    const config = id => ({
        id, level: 1, up: 0, arms: 10000, extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [0, 0]
    });
    const wangyi = new BattleHero(config(hero.id), 'blue', manager, 100);
    const target = new BattleHero(config(1002), 'red', manager, 100);
    const otherEnemy = new BattleHero(config(1001), 'red', manager, 100);
    manager.BlueTeam = { hero: [wangyi] };
    manager.RedTeam = { hero: [target, otherEnemy] };
    const hits = [];
    target.beHurt = (attacker, damage, source) => hits.push({ attacker, damage, source });
    otherEnemy.beHurt = () => assert.fail('世仇必须追击普攻目标');

    const originalRandom = Math.random;
    const pursue = roll => {
        let calls = 0;
        try {
            // Keep the probability table in order, then select the desired roll.
            Math.random = () => ++calls < 100 ? 0.99999 : roll;
            wangyi.callPursuitSkill(target);
        } finally {
            Math.random = originalRandom;
        }
    };
    for (const [intelligence, expected] of [[80, 233], [90, 254], [100, 275]]) {
        wangyi.Attrs.int = intelligence;
        pursue(0.59);
        assert.deepEqual(hits.at(-1), { attacker: wangyi, damage: { type: 2, rate: expected }, source: skill });
    }
    pursue(0.60);
    assert.equal(hits.length, 3, '100 士气时发动率为 60%');

    target.Arms = 9000;
    target.HurtArms = 1000;
    for (const [round, recovery] of [[3, 0], [4, 0], [5, 100]]) {
        manager.Round = round;
        assert.equal(target.revocer(100, target, '测试恢复'), recovery);
    }
    target.State.noRecoverUntil = 0;
    target.beHurt = () => { target.Arms = 0; };
    pursue(0);
    assert.equal(target.State.noRecoverUntil, 0, '阵亡目标无需施加围困');
    console.log('王异倍率、同目标追击、发动率与两回合围困验证通过');
} finally {
    await vite.close();
}
