import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalRandom = Math.random;
try {
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const skill = __SKILLS__.find(item => item.name === '疾战');
    const manager = { Round: 1, Over: false, Record: { pushRecord() {}, pushActionRecord() {} } };
    const hero = new BattleHero({ id: 1001, level: 50, up: 0, extraAttrsAlloc: {}, equipskill: [] }, 'blue', manager, 100);
    const debuff = { rounds: 2, from: { hero, skill: { name: '测试怯战' } } };
    hero.State.attackLimit = debuff;
    Math.random = () => 0;
    assert.equal(skill.callskill(hero, 40), true);
    assert.equal(hero.State.doubleAttack.rounds, 1);
    assert.equal(hero.isAttackLimit(), false);
    hero.State.attackLimit = { ...debuff, rounds: 1 };
    assert.equal(hero.isAttackLimit(), false);
    manager.Round = 2;
    hero.State.attackLimit = { ...debuff, rounds: 1 };
    assert.equal(hero.isAttackLimit(), true);
    console.log('Verified 疾战 double attack and round-scoped 怯战 immunity');
} finally {
    Math.random = originalRandom;
    await vite.close();
}
