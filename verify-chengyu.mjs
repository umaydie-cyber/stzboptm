import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const hero = __HEROS__.find(item => item.name === '程昱');
    const skill = __SKILLS__.find(item => item.id === hero.skill);
    assert.deepEqual([hero.camp, hero.star, hero.cost, hero.army, hero.limit], [2, 5, 30, 1, 3]);
    assert.deepEqual([skill.name, skill.type, skill.limit, skill.rate], ['审时定计', 1, 5, '--']);

    const messages = [];
    const manager = { Round: 1, Over: false, Record: {
        pushRecord(_hero, message) { messages.push(message); },
        pushActionRecord(_source, _target, prefix, message) { messages.push(prefix + message); }
    } };
    const config = { id: hero.id, level: 1, up: 0, arms: 10000,
        equipskill: [0, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } };
    const chengyu = new BattleHero(config, 'blue', manager, 100);
    const ally = new BattleHero(config, 'blue', manager, 100);
    const enemy = new BattleHero(config, 'red', manager, 100);
    manager.BlueTeam = { hero: [chengyu, ally] };
    manager.RedTeam = { hero: [enemy] };
    skill.callskill(chengyu);
    chengyu.getRealSkillRate = () => 100;
    const heals = [];
    ally.revocer = (amount, source, name) => heals.push({ amount, source, name });
    chengyu.getTarget = (_range, _num, type) => {
        assert.equal(type, chengyu.isRage() ? 1 : 2);
        return [chengyu.isRage() ? enemy : ally];
    };
    enemy.revocer = (amount, source, name) => heals.push({ amount, source, name, enemy: true });
    const baseHeal = Math.round(chengyu.Arms * 300 / (3500 + chengyu.Arms));

    chengyu.Attrs.int = 80;
    enemy.tryChengyuDebuff('special', ally);
    assert.equal(enemy.Storage.chengyuDamageTaken.value, 30);
    assert.equal(heals[0].amount, Math.floor(baseHeal * 0.65));
    assert.equal(heals[0].name, '审时定计');
    chengyu.Attrs.int = 280;
    enemy.tryChengyuDebuff('special', ally);
    assert.equal(enemy.Storage.chengyuDamageTaken.value, 60);
    assert.equal(heals[1].amount, Math.floor(baseHeal * 1.3));
    const damageInfo = { type: 1, rate: 100 };
    getDamageAddition(ally, enemy, damageInfo, null);
    assert.ok(damageInfo.damageModifiers.entries.some(entry => entry.name === '审时定计' && entry.value === 60));

    chengyu.State.rage = { rounds: 1, from: { hero: null, skill: 0 } };
    enemy.tryChengyuDebuff('special', ally);
    assert.equal(heals[2].enemy, true);
    assert.equal(heals[2].source, chengyu);

    assert.equal(ally.applyNoRecoverUntil(2, enemy), false);
    assert.equal(ally.State.noRecoverUntil || 0, 0);
    ally.State.confusion = { rounds: 1, from: { hero: enemy, skill: 0 } };
    assert.equal(ally.State.confusion.rounds, 0);
    assert.ok(messages.some(message => message.includes('受到所有伤害提高60%')));
    console.log('Verified Cheng Yu data, intelligence scaling, rage healing target, and allied resistance');
} finally {
    await vite.close();
}
