import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const hero = __HEROS__.find(h => h.name === '郭嘉');
    const skill = __SKILLS__.find(s => s.id === hero.skill);
    assert.deepEqual([hero.camp, hero.star, hero.cost, hero.army, hero.limit], [2, 5, 30, 3, 2]);
    assert.deepEqual([hero.attrs.atk, hero.attrs.def, hero.attrs.int, hero.attrs.spd, hero.attrs.des], [40, 87, 100, 78, 2]);
    assert.deepEqual([skill.type, skill.rate, skill.limit, skill.target], [2, 35, 5, 2]);

    const records = [];
    const manager = { Round: 1, Record: {
        pushRecord: (...args) => records.push(args),
        pushActionRecord: (...args) => records.push(args)
    } };
    const makeUnit = (int) => ({
        Attrs: { int }, Storage: {}, Arms: 1000, Manger: manager, StateFlag: {},
        State: Object.fromEntries(['confusion', 'rage', 'attackLimit', 'activeLimit'].map(k => [k, { rounds: 0 }])),
        hooks: {},
        addHook(on, name, fn) { this.hooks[name] = fn; return name; },
        clearHook(_on, tag) { delete this.hooks[tag]; }
    });
    const self = makeUnit(100), ally = makeUnit(80), enemies = [makeUnit(90), makeUnit(90)];
    self.getTarget = (_range, _count, type) => type === 3 ? [ally] : enemies;
    const random = Math.random;
    try {
        Math.random = () => 0; // 发动成功，控制抽中混乱。
        assert.equal(skill.callskill(self, 35), true);
        assert.equal(self.Attrs.int, 122);
        assert.equal(ally.Attrs.int, 97.6);
        assert(enemies.every(e => e.State.confusion.rounds === 2));
        assert.equal(skill.callskill(self, 35), true); // 重复发动刷新加成，不叠加。
        assert.equal(self.Attrs.int, 122);
        assert.equal(ally.Attrs.int, 97.6);
        manager.Round = 2;
        self.hooks['奇佐鬼谋谋略恢复']();
        ally.hooks['奇佐鬼谋谋略恢复']();
        assert.equal(self.Attrs.int, 100);
        assert.equal(ally.Attrs.int, 80);
    } finally {
        Math.random = random;
    }
    console.log('Verified Guo Jia attributes, skill targets, control, and buff expiry');
} finally {
    await vite.close();
}
