import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalLog = console.log;
const originalRandom = Math.random;
try {
    const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
    const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const hero = (id, equipskill = []) => ({ id, level: 40, up: 5, arms: 10000,
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill });
    console.log = () => {};
    const battle = new BattleManger({
        blue: { morale: 120, heros: [hero(1002, [1069])] },
        red: { morale: 100, heros: [hero(1004, [1069])] }
    });
    const [defender, attacker] = [battle.BlueTeam.hero[0], battle.RedTeam.hero[0]];
    assert.equal(defender.Storage.jianzuBudai?.id, 1069, '被动已在战前生效');
    assert.equal(defender.getRealSkillRate(50), 56, '50% 减伤按受伤者 120 士气变为 56%');
    battle.Over = false;
    battle.Round = 1;
    defender.Arms = attacker.Arms = 10000;
    defender.State.confusion.rounds = defender.State.attackLimit.rounds = 0;
    attacker.State.confusion.rounds = attacker.State.attackLimit.rounds = 0;

    // 预计算伤害仍区分兵力基础和受增减伤影响的部分。
    const snapshot = { type: 2, rate: 100, troopBaseDamage: 100 };
    const before = getDamageAddition(attacker, defender, snapshot);
    const after = getDamageAddition(attacker, defender, { ...snapshot, jianzuReduction: true });
    Math.random = () => 0;
    defender.beHurtByNum(attacker, snapshot, null, 1000);
    assert.equal(10000 - defender.Arms, Math.round(100 + 900 * after / before));
    assert(battle.Record.Records.some(r => r.msg?.includes('减伤判定（56%）：成功')));

    // 反击只造成一次 40% 攻击类型伤害，不反触发对方的反击。
    defender.Arms = attacker.Arms = 10000;
    const start = battle.Record.Records.length;
    defender.beHurtByNum(attacker, { type: 1, rate: 100, isBasicAttack: true }, null, 400);
    assert(attacker.Arms < 10000, '攻击者受到反击伤害');
    assert.equal(battle.Record.Records.slice(start).filter(r => r.msg?.includes('反击')).length, 1);

    // 无射程、怯战、混乱时均不能反击；减伤失败时伤害原值不变。
    for (const condition of ['range', 'attackLimit', 'confusion']) {
        defender.Arms = attacker.Arms = 10000;
        defender.Limit = condition === 'range' ? 0 : 1;
        defender.State.attackLimit.rounds = condition === 'attackLimit' ? 1 : 0;
        defender.State.confusion.rounds = condition === 'confusion' ? 1 : 0;
        Math.random = () => 0.99;
        defender.beHurtByNum(attacker, { type: 1, rate: 100, isBasicAttack: true }, null, 400);
        assert.equal(attacker.Arms, 10000, `${condition} 时不反击`);
        assert.equal(defender.Arms, 9600, `${condition} 时减伤失败保留原伤害`);
    }
    console.log = originalLog;
    console.log('健卒不殆：士气概率、预计算减伤、单次反击及射程/控制限制通过');
} finally {
    console.log = originalLog;
    Math.random = originalRandom;
    await vite.close();
}
