import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const skill = __SKILLS__.find(item => item.name === '三术奇谋');
    assert.deepEqual([skill.ready, skill.type, skill.target, skill.limit, skill.rate, skill.study],
        [true, 2, 1, 4, 50, true]);

    const config = id => ({ id, level: 1, up: 0, arms: 10000,
        equipskill: [0, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } });
    for (const [intelligence, expectedRate, expectedReduction] of [[80, 178, 18], [176.25, 356, 36]]) {
        const manager = { Round: 1, Over: false, Record: { Records: [],
            pushRecord() {}, pushActionRecord() {} }, addStat() {} };
        const self = new BattleHero(config(1001), 'blue', manager, 100);
        const enemies = [1003, 1004, 1009].map(id => new BattleHero(config(id), 'red', manager, 100));
        manager.BlueTeam = { hero: [self] };
        manager.RedTeam = { hero: enemies };
        self.Attrs.int = intelligence;
        let selection = 0;
        self.getTarget = () => [enemies[selection++]];
        const hits = [];
        for (const enemy of enemies) enemy.beHurt = (source, info, from) => hits.push({ enemy, source, info, from });
        const before = enemies.map(enemy => ({ ...enemy.Attrs }));

        assert.equal(skill.callskill(self, 100), true);
        assert.equal(self.IN_READY_SKILL[0].round, 1);
        assert.equal(hits.length, 0);
        manager.Round = 2;
        self.subReadySkillRound(skill);
        assert.equal(selection, 3);
        assert.deepEqual(hits.map(hit => hit.enemy), enemies);
        assert.ok(hits.every(hit => hit.source === self && hit.from === skill &&
            hit.info.type === 2 && hit.info.rate === expectedRate));
        for (let i = 0; i < 3; i++) {
            const attribute = ['atk', 'def', 'int'][i];
            assert.ok(Math.abs(enemies[i].Attrs[attribute] - (before[i][attribute] - expectedReduction)) < 1e-8);
        }
        manager.Round = 3;
        for (const enemy of enemies) enemy.callHook('回合开始时');
        assert.ok(Math.abs(enemies[0].Attrs.atk - (before[0].atk - expectedReduction)) < 1e-8);
        manager.Round = 4;
        for (const enemy of enemies) enemy.callHook('回合开始时');
        for (let i = 0; i < 3; i++) {
            const attribute = ['atk', 'def', 'int'][i];
            assert.ok(Math.abs(enemies[i].Attrs[attribute] - before[i][attribute]) < 1e-8);
        }
    }
    console.log('Verified 三术奇谋 preparation, three independent targets and intelligence scaling');
} finally {
    await vite.close();
}
