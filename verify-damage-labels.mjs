import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalLog = console.log;
try {
    const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
    const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const hero = (id, equipskill = []) => ({ id, level: 40, up: 5, arms: 10000,
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill });
    console.log = () => {};
    const battle = new BattleManger({
        blue: { morale: 100, heros: [hero(1036, [1012])] },
        red: { morale: 100, heros: [hero(1002)] }
    });
    const [attacker, target] = [battle.BlueTeam.hero[0], battle.RedTeam.hero[0]];
    assert.equal(attacker.State.attackDamageAdd.passive.from?.name, '愈战愈勇');
    const attack = { type: 1 };
    getDamageAddition(attacker, target, attack);
    assert(attack.damageModifiers.entries.some(entry => entry.name === '愈战愈勇'));
    attacker.State.attackDamageAdd.passive = { value: 10, rounds: -1 };
    const fallback = { type: 1 };
    getDamageAddition(attacker, target, fallback);
    assert(fallback.damageModifiers.entries.some(entry => entry.name === '造成攻击伤害提高'));
    assert(fallback.damageModifiers.entries.every(entry => !/^[a-z]+(?:[A-Z][a-z]+)+$/.test(entry.name)));
    console.log = originalLog;
    console.log('伤害加成来源名称与中文回退名称验证通过');
} finally {
    console.log = originalLog;
    await vite.close();
}
