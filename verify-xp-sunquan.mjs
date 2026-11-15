import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const hero = __HEROS__.find(item => item.name === 'XP孙权');
    const skill = __SKILLS__.find(item => item.id === hero.skill);
    assert.deepEqual([hero.camp, hero.star, hero.cost, hero.army, hero.limit], [3, 5, 35, 1, 4]);
    assert.deepEqual([skill.name, skill.type, skill.limit, skill.rate], ['自擅江表', 2, 5, 50]);
    const hits = [];
    const heals = [];
    const ally = { beHurt: (_source, info) => hits.push(['ally', info]) };
    const enemy = { beHurt: (_source, info) => hits.push(['enemy', info]) };
    const self = {
        Attrs: { int: 80 }, OriginAttrs: { int: 80 }, Arms: 10000, Storage: {},
        Manger: { Record: { pushRecord() {} } },
        getTarget(_range, _count, type) { return type === 3 ? [ally] : [enemy]; },
        revocer(amount) { heals.push(amount); }
    };
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
        assert.equal(skill.callskill(self, 50), true);
        assert.equal(hits[0][1].rate, 60);
        assert.equal(hits[1][1].rate, 160);
        assert.equal(heals[0], Math.floor(Math.round(10000 * 300 / 13500) * 1.2));
        self.Attrs.int = 173.75;
        assert.equal(skill.callskill(self, 50), true);
        assert.equal(hits[3][1].rate, 380);
        assert.equal(heals[1], Math.floor(Math.round(10000 * 300 / 13500) * 2.4));
        assert.equal(self.Storage.zishanJiangbiaoCasts, 2);
    } finally {
        Math.random = originalRandom;
    }
    console.log('Verified XP Sun Quan data, friendly attack, recovery and stacking strategy rate');
} finally {
    await vite.close();
}
