import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const hero = __HEROS__.find(item => item.name === '马谡');
    const skill = __SKILLS__.find(item => item.name === '心战为上');
    assert.equal(hero.skill, skill.id);
    assert.equal(hero.attrs.int, 90);

    const records = [];
    const manager = { BlueTeam: { hero: [] }, RedTeam: { hero: [] }, Record: {
        pushRecord: (...args) => records.push(args),
        pushActionRecord: (...args) => records.push(args)
    } };
    const makeAlly = name => ({
        Name: name, BattleCamp: 'blue', Arms: 10000, hooks: [], recovered: [],
        addHook(event, tag, callback) { assert.equal(event, '造成伤害后'); this.hooks.push(callback); },
        revocer(amount) { this.recovered.push(amount); }
    });
    const masu = { ...makeAlly('马谡'), Attrs: { int: 330 }, Manger: manager };
    const ally = makeAlly('队友');
    manager.BlueTeam.hero = [masu, ally];
    skill.callskill(masu);
    const enemy = { Name: '敌军', BattleCamp: 'red', Morale: 120 };
    masu.Arms = 0; // 指挥战法施加后，马谡阵亡。
    for (let i = 0; i < 10; i++) ally.hooks[0](ally, enemy, { type: 1 }, null, 100);
    assert.equal(enemy.Morale, 75, '全队降低士气最多九次');
    assert.deepEqual(ally.recovered, Array(10).fill(100), '马谡阵亡后攻击恢复仍生效，330谋略为100%');
    assert.equal(records.filter(row => String(row[3]).includes('/9')).length, 9);
    console.log('马谡指挥效果、阵亡后持续生效与九次士气上限通过');
} finally {
    await vite.close();
}
