import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
    const { clacAttackDamage, clacInteDamage } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const hero = (id, equipskill = []) => ({ id, level: 40, up: 5, arms: 10000,
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill });
    const team = {
        blue: { morale: 120, heros: [hero(1002), hero(1004), hero(1024, [1066])] },
        red: { morale: 120, heros: [hero(1012), hero(1022), hero(1023)] }
    };
    const originalLog = console.log;
    let battle;
    try { console.log = () => {}; battle = new BattleManger(team); }
    finally { console.log = originalLog; }

    const [source, ally] = [battle.BlueTeam.hero[2], battle.BlueTeam.hero[1]];
    assert(battle.BlueTeam.hero.every(item => item.Storage.chuewujin));
    battle.Over = false;
    battle.Round = 4;
    source.Arms = 0;
    const recordStart = battle.Record.Records.length;
    for (let i = 0; i < 100; i++) {
        ally.State.doubleAttack.rounds = 0;
        ally.callHook('行动前');
    }
    const decisions = battle.Record.Records.slice(recordStart).map(item => item.msg).filter(msg => msg?.includes('除恶务尽】连击判定'));
    assert.equal(decisions.length, 100, '阵亡后仍逐回合判定');
    assert(decisions.every(msg => msg.includes('78%')), '70%按施加者120士气修正为78%');
    assert(decisions.some(msg => msg.includes('成功')) && decisions.some(msg => msg.includes('未触发')));

    const attacker = { Name: '攻击者', Arms: 10000, Attrs: { atk: 200, int: 200 }, Storage: {}, Manger: battle,
        getDamageStateValue: () => 0 };
    const target = { Name: '目标', Attrs: { def: 100, int: 100 }, Storage: { chuewujin: true }, Manger: battle,
        getDamageStateValue: () => 0, isAttackLimit: () => true, State: {} };
    battle.Round = 2;
    const originalRandom = Math.random;
    let normalAttack, protectedAttack, normalStrategy, protectedStrategy;
    try {
        Math.random = () => 0;
        target.Storage.chuewujin = false;
        normalAttack = clacAttackDamage(attacker, target, { type: 1, rate: 100 });
        normalStrategy = clacInteDamage(attacker, target, { type: 2, rate: 100 });
        target.Storage.chuewujin = true;
        protectedAttack = clacAttackDamage(attacker, target, { type: 1, rate: 100 });
        protectedStrategy = clacInteDamage(attacker, target, { type: 2, rate: 100 });
    } finally { Math.random = originalRandom; }
    const physicalBase = attacker.Arms * 373 / (7700 + attacker.Arms);
    const strategyBase = attacker.Arms * 178 / (6459 + attacker.Arms);
    assert(Math.abs(protectedAttack - Math.round(physicalBase + (normalAttack - physicalBase) * 0.7)) <= 1, '攻击的兵力基础伤害不受减伤影响');
    assert(Math.abs(protectedStrategy - Math.round(strategyBase + (normalStrategy - strategyBase) * 0.7)) <= 1, '策略的兵力基础伤害不受减伤影响');
    console.log('除恶务尽减伤、阵亡后连击判定及士气概率通过');
} finally {
    await vite.close();
}
