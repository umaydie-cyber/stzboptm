import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalRandom = Math.random;
try {
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const skill = __SKILLS__.find(item => item.name === '先声夺人');
    assert.ok(skill);
    const hits = [];
    const target = { beHurt: (_attacker, info) => hits.push(info) };
    const hero = {
        Arms: 1000, Manger: { Round: 1, Over: false, Record: { pushRecord() {}, pushActionRecord() {} } },
        State: { doubleAttack: { rounds: 0 } },
        addHook: (_event, _name, callback) => { hero.onAction = callback; },
        getRealSkillRate: rate => rate,
        applySplitAttack: rate => { hero.splitRate = rate; },
        getTarget: () => [target]
    };
    skill.callskill(hero);
    Math.random = () => 0;
    hero.onAction();
    assert.equal(hero.State.doubleAttack.rounds, 1);
    assert.equal(hero.splitRate, 70);
    assert.deepEqual(hits, [{ type: 1, rate: 110 }]);
    hero.Manger.Round = 4;
    hero.splitRate = 0;
    hero.onAction();
    assert.equal(hero.splitRate, 0);
    assert.equal(hits.length, 1);
    hero.Manger.Round = 2;
    hero.State.doubleAttack.rounds = 0;
    hero.getRealSkillRate = () => 0;
    hero.onAction();
    assert.equal(hero.State.doubleAttack.rounds, 0);
    assert.equal(hits.length, 1);
    console.log('Verified 先声夺人 effects, round limit and morale-adjusted probability');
} finally {
    Math.random = originalRandom;
    await vite.close();
}
