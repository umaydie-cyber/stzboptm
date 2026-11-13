import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const hero = __HEROS__.find(h => h.name === '张春华');
    const skill = __SKILLS__.find(s => s.id === hero.skill);
    assert.deepEqual([hero.camp, hero.star, hero.cost, hero.army, hero.limit], [2, 5, 25, 1, 3]);
    assert.deepEqual([hero.attrs.atk, hero.attrs.def, hero.attrs.int, hero.attrs.spd, hero.attrs.des], [77, 56, 82, 55, 9]);
    assert.deepEqual([skill.type, skill.rate, skill.limit, skill.target], [2, 40, 5, 2]);

    const reductions = [];
    const targets = Array.from({ length: 2 }, () => ({
        State: { activeLimit: { rounds: 0 } }, StateFlag: {},
        addState(name, value, rounds) { reductions.push([name, value, rounds]); }
    }));
    const self = {
        Attrs: { int: 80 },
        Manger: { Record: { pushRecord() {}, pushActionRecord() {} } },
        getTarget(range, count) { assert.deepEqual([range, count], [5, 2]); return targets; }
    };
    const random = Math.random;
    try {
        Math.random = () => 0;
        assert.equal(skill.callskill(self, 40), true);
        assert.deepEqual(reductions, Array(2).fill(['attackDamageSub', 48, 2]));
        assert(targets.every(t => t.State.activeLimit.rounds === 2));
        self.Attrs.int = 160;
        assert.equal(skill.callskill(self, 40), true);
        assert.deepEqual(reductions.slice(2), Array(2).fill(['attackDamageSub', 66, 2]));
    } finally {
        Math.random = random;
    }
    console.log('Verified Zhang Chunhua attributes, 48%/66% reduction, and hesitation');
} finally {
    await vite.close();
}
