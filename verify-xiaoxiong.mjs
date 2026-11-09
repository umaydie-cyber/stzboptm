import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalRandom = Math.random;
try {
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const skill = __SKILLS__.find(item => item.name === '枭雄');
    const manager = { Round: -1, Over: false, Record: { pushRecord() {}, pushActionRecord() {} } };
    const hero = new BattleHero({ id: 1012, level: 50, up: 0, extraAttrsAlloc: {}, equipskill: [] }, 'blue', manager, 100);
    const initial = { ...hero.Attrs };
    skill.callskill(hero);
    for (const attr of ['atk', 'def', 'int']) assert.ok(hero.Attrs[attr] > initial[attr]);
    Math.random = () => 0;
    manager.Round = 1;
    hero.State.confusion = { rounds: 1, from: { hero, skill } };
    hero.callHook('速度排序前');
    assert.equal(hero.State.confusion.rounds, 0);
    hero.State.attackLimit = { rounds: 1, from: { hero, skill } };
    assert.equal(hero.State.attackLimit.rounds, 0);
    let activeCasts = 0;
    hero.SkillsOrder = [skill.id];
    hero.Skills[skill.id] = { ...skill, type: 2, callskill: () => { activeCasts++; return true; } };
    hero.callActiveSkill();
    assert.equal(activeCasts, 0);
    manager.Round = 2;
    hero.getRealSkillRate = () => 0;
    hero.callHook('速度排序前');
    hero.State.attackLimit = { rounds: 1, from: { hero, skill } };
    assert.equal(hero.State.attackLimit.rounds, 1);
    manager.Round = 5;
    hero.callHook('速度排序前');
    assert.notEqual(hero.Storage.xiaoxiongInsightRound, 5);
    console.log('Verified 枭雄 morale chance, insight control immunity, active restriction and Cao Cao bonus');
} finally {
    Math.random = originalRandom;
    await vite.close();
}
