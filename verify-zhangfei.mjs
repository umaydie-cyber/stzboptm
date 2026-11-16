import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const zhang = __HEROS__.find(hero => hero.name === '张飞');
    const skill = __SKILLS__.find(item => item.id === zhang.skill);
    assert.deepEqual([zhang.camp, zhang.star, zhang.cost, zhang.army, zhang.limit], [1, 5, 30, 3, 2]);
    assert.deepEqual([zhang.attrs.atk, zhang.attrs.def, zhang.attrs.int, zhang.attrs.spd, zhang.attrs.des], [103, 87, 45, 71, 10]);
    assert.deepEqual([skill.name, skill.type, skill.ready, skill.rate, skill.limit], ['长坂之吼', 2, true, 75, 4]);

    const records = [];
    const manager = { Round: 1, Over: false, Record: { Records: records,
        pushRecord(_hero, message) { records.push({ message }); },
        pushActionRecord(_source, _target, _prefix, message) { records.push({ message }); }
    }, addStat() {} };
    const config = id => ({ id, level: 1, up: 0, arms: 10000,
        equipskill: [0, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } });
    const self = new BattleHero(config(zhang.id), 'blue', manager, 100);
    const enemies = [1001, 1003, 1009].map(id => new BattleHero(config(id), 'red', manager, 100));
    manager.BlueTeam = { hero: [self] };
    manager.RedTeam = { hero: enemies };
    const hits = [];
    for (const enemy of enemies) enemy.beHurt = (_source, info) => hits.push({ enemy, info });

    assert.equal(skill.callskill(self, 100), true);
    assert.equal(self.IN_READY_SKILL[0].round, 2);
    manager.Round = 2;
    self.subReadySkillRound(skill);
    assert.equal(hits.length, 0);
    manager.Round = 3;
    self.subReadySkillRound(skill);
    assert.ok(hits.length >= 2 && hits.length <= 3);
    assert.equal(new Set(hits.map(hit => hit.enemy)).size, hits.length);
    assert.ok(hits.every(hit => hit.info.type === 1 && hit.info.rate === 450 && hit.info.ignoreTroopCounter));
    console.log('Verified Zhang Fei data, two-round preparation, 2-3 distinct targets and troop-counter immunity');
} finally {
    await vite.close();
}
