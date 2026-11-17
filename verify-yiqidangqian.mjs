import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const skill = __SKILLS__.find(item => item.name === '一骑当千');
    assert.deepEqual([skill.type, skill.ready, skill.rate, skill.limit, skill.target, skill.target_type],
        [2, true, 30, 5, 3, 'enemy']);
    assert.match(skill.desc, /1回合准备.*敌军全体.*280\.0%/);

    const records = [];
    const manager = { Round: 1, Over: false, Record: {
        Records: records,
        pushRecord(_hero, message) { records.push(message); },
        pushActionRecord(_source, _target, _prefix, message) { records.push(message); }
    }, addStat() {} };
    const config = id => ({ id, level: 1, up: 0, arms: 10000,
        equipskill: [0, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } });
    const self = new BattleHero(config(1001), 'blue', manager, 100);
    const enemies = [1003, 1004, 1009].map(id => new BattleHero(config(id), 'red', manager, 100));
    manager.BlueTeam = { hero: [self] };
    manager.RedTeam = { hero: enemies };
    const hits = [];
    for (const enemy of enemies) enemy.beHurt = (source, info, from) => hits.push({ enemy, source, info, from });

    assert.equal(skill.callskill(self, 100), true);
    assert.equal(self.IN_READY_SKILL[0].round, 1);
    assert.equal(hits.length, 0);
    manager.Round = 2;
    self.subReadySkillRound(skill);
    assert.equal(hits.length, 3);
    assert.deepEqual(new Set(hits.map(hit => hit.enemy)), new Set(enemies));
    assert.ok(hits.every(hit => hit.source === self && hit.from === skill &&
        hit.info.type === 1 && hit.info.rate === 280));
    console.log('Verified 一骑当千: one-round preparation and 280% attack on all three enemies');
} finally {
    await vite.close();
}
