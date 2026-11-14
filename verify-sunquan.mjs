import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const hero = __HEROS__.find(item => item.name === '孙权');
    const skill = __SKILLS__.find(item => item.id === hero.skill);
    assert.deepEqual([hero.camp, hero.star, hero.cost, hero.army, hero.limit], [3, 5, 30, 1, 4]);
    assert.deepEqual([skill.name, skill.type, skill.limit, skill.rate], ['九锡黄龙', 2, 3, 35]);

    const messages = [];
    const manager = { Round: 1, Over: false, Record: {
        pushRecord(_hero, message) { messages.push(message); }, pushActionRecord() {} } };
    const config = { id: hero.id, level: 40, up: 5, arms: 10000,
        equipskill: [0, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } };
    const allies = Array.from({ length: 3 }, () => new BattleHero(config, 'blue', manager, 100));
    const enemy = new BattleHero(config, 'red', manager, 100);
    manager.BlueTeam = { hero: allies };
    manager.RedTeam = { hero: [enemy] };
    for (const ally of allies) {
        ally.State.confusion = { rounds: 2, from: { hero: null, skill: 0 } };
        ally.State.continuousDamage.burn = { rounds: 2 };
    }
    assert.equal(skill.callskill(allies[0], 100), true);
    for (const ally of allies) {
        assert.equal(ally.State.confusion.rounds, 0);
        assert.deepEqual(ally.State.continuousDamage, {});
        assert.equal(ally.Storage.jiuxiHuanglongEvades, 2);
        const arms = ally.Arms;
        ally.beHurt(enemy, { type: 1, rate: 100 }, null);
        ally.beHurt(enemy, { type: 2, rate: 100 }, null);
        assert.equal(ally.Arms, arms);
        assert.equal(ally.Storage.jiuxiHuanglongEvades, 0);
    }
    assert.equal(messages.filter(message => message.includes('【九锡黄龙】规避了本次伤害')).length, 6);
    console.log('Verified Sun Quan data, team cleanse, and two damage evades per ally');
} finally {
    await vite.close();
}
