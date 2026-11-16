import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const guan = __HEROS__.find(hero => hero.name === '关羽');
    const skill = __SKILLS__.find(item => item.id === guan.skill);
    assert.deepEqual([guan.camp, guan.star, guan.cost, guan.army, guan.limit], [1, 5, 30, 3, 2]);
    assert.deepEqual([skill.name, skill.type, skill.ready, skill.rate, skill.limit], ['樊渊泅囚', 2, true, 40, 5]);

    const records = [];
    const manager = { Round: 1, Over: false, Record: { Records: records,
        pushRecord(_hero, message) { records.push({ message }); },
        pushActionRecord(_source, _target, _prefix, message) { records.push({ message }); }
    }, addStat() {} };
    const config = id => ({ id, level: 1, up: 0, arms: 10000,
        equipskill: [0, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } });
    const self = new BattleHero(config(guan.id), 'blue', manager, 100);
    const enemies = [1003, 1004, 1009].map(id => new BattleHero(config(id), 'red', manager, 100));
    manager.BlueTeam = { hero: [self] };
    manager.RedTeam = { hero: enemies };
    const hits = [];
    for (const enemy of enemies) enemy.beHurt = (_source, info) => hits.push({ enemy, info });

    assert.equal(skill.callskill(self, 100), true);
    assert.equal(self.IN_READY_SKILL[0].round, 1);
    assert.equal(hits.length, 0);
    manager.Round = 2;
    self.subReadySkillRound(skill);
    assert.equal(hits.length, 3);
    assert.ok(hits.every(hit => hit.info.type === 1 && hit.info.rate === 190));
    assert.ok(enemies.every(enemy => enemy.State.activeLimit.rounds === 1));
    console.log('Verified Guan Yu data, one-round preparation, three attacks and hesitation');
} finally {
    await vite.close();
}
