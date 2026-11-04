import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const records = [];
    const manager = {
        Round: 1, Over: false,
        Record: { pushRecord: (...args) => records.push(args), pushActionRecord: (...args) => records.push(args) },
        BlueTeam: { hero: [] }, RedTeam: { hero: [] }
    };
    const config = id => ({ id, level: 50, up: 0, extraAttrsAlloc: {}, equipskill: [] });
    const liuxiu = new BattleHero(config(1021), 'blue', manager, 100);
    const ally = new BattleHero(config(1020), 'blue', manager, 100);
    const enemy = new BattleHero(config(1018), 'red', manager, 100);
    manager.BlueTeam.hero.push(liuxiu, ally);
    manager.RedTeam.hero.push(enemy);
    assert.equal(liuxiu.Name, '刘秀');
    assert.equal(liuxiu.Skills[1048].name, '光武中兴');
    const skill = id => __SKILLS__.find(item => item.id === id);
    const originalHurt = enemy.beHurt.bind(enemy);
    const hits = [];
    enemy.beHurt = (source, damage, from) => { hits.push({ damage, from: from.id }); };
    liuxiu.Attrs.int = 80;
    skill(1045).callskill(liuxiu, 100, true, 5);
    skill(1046).callskill(liuxiu, 100, true, 5);
    assert.deepEqual(hits.map(hit => hit.from), [1045, 1046]);
    assert.equal(hits[0].damage.rate, 148);
    assert.equal(hits[1].damage.rate, 92.2);
    assert.equal(enemy.State.confusion.rounds, 1);
    assert.equal(enemy.Attrs.def, enemy.OriginAttrs.def - 5.2);
    manager.Round = 2;
    enemy.callHook('回合开始时');
    assert.equal(enemy.Attrs.def, enemy.OriginAttrs.def);
    liuxiu.Attrs.int = 230;
    skill(1046).callskill(liuxiu, 100, true, 5);
    assert.equal(hits.at(-1).damage.rate, 184.4);
    assert.equal(enemy.Attrs.def, enemy.OriginAttrs.def - 10.4);
    manager.Round = 3;
    enemy.callHook('回合开始时');
    assert.equal(enemy.Attrs.def, enemy.OriginAttrs.def);
    enemy.beHurt = originalHurt;
    skill(1047).callskill(liuxiu, 100, true, 5);
    assert.equal(enemy.State.noRecoverUntil, 4);
    ally.Arms -= 500;
    ally.HurtArms = 500;
    manager.Round = 3;
    skill(1048).callskill(liuxiu, 100);
    assert.ok(ally.Arms > 0);
    assert.ok(records.some(row => row.some(value => String(value).includes('光武中兴'))));
    console.log('Verified Liu Xiu and three linked skills');
} finally {
    await vite.close();
}
