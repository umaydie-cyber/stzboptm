import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const hero = __HEROS__.find(item => item.name === '马良');
    const skill = __SKILLS__.find(item => item.id === hero.skill);
    assert.deepEqual([hero.camp, hero.star, hero.cost, hero.army, hero.limit], [1, 5, 25, 2, 2]);
    assert.deepEqual([skill.name, skill.type, skill.limit], ['雅虑适时', 1, 5]);
    const messages = [];
    const records = [];
    const manager = { Round: 0, Over: false, Record: { Records: records,
        pushRecord(_hero, message) { messages.push(message); records.push({}); },
        pushActionRecord() { records.push({}); } }, addStat() {} };
    const config = { id: hero.id, level: 1, up: 0, arms: 10000,
        equipskill: [0, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } };
    const allies = Array.from({ length: 3 }, () => new BattleHero(config, 'blue', manager, 100));
    const enemy = new BattleHero(config, 'red', manager, 100);
    manager.BlueTeam = { hero: allies };
    manager.RedTeam = { hero: [enemy] };
    skill.callskill(allies[0]);
    allies[0].Attrs.int = 80;
    manager.Round = 3;
    allies[0].activateMaliangRound();
    assert.equal(allies[1].Storage.maliangReduction.value, 24);
    const info = { type: 1, rate: 100 };
    getDamageAddition(enemy, allies[0], info, null);
    assert.ok(info.damageModifiers.entries.some(entry => entry.name === '雅虑适时' && entry.value === -24));
    for (const type of [1, 2]) {
        const before = allies.map(item => item.Arms);
        allies[0].beHurt(enemy, { type, rate: 100 }, null, 100);
        assert.equal(before[0] - allies[0].Arms, 70);
        assert.equal(before[1] - allies[1].Arms, 15);
        assert.equal(before[2] - allies[2].Arms, 15);
    }
    assert.ok(messages.some(message => message.includes('分担攻击伤害')));
    assert.ok(messages.some(message => message.includes('分担策略伤害')));
    manager.Round = 4;
    assert.notEqual(allies[0].Storage.maliangSharedRound, manager.Round);
    console.log('Verified Ma Liang data, round buff, damage reduction and typed shared damage');
} finally {
    await vite.close();
}
