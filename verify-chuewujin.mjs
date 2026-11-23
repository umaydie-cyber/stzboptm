import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
    const { clacAttackDamage, clacInteDamage } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const hero = (id, equipskill = []) => ({ id, level: 40, up: 5, arms: 10000,
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill });
    const team = {
        blue: { morale: 120, heros: [hero(1002), hero(1001), hero(1024, [1066])] },
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

    const attacker = { Name: '攻击者', Arms: 10000, BisicArm: 3, Attrs: { atk: 200, int: 200 }, Storage: {}, Manger: battle,
        getDamageStateValue: () => 0 };
    const target = { Name: '目标', BisicArm: 3, Attrs: { def: 100, int: 100 }, Storage: { chuewujin: true }, Manger: battle,
        getDamageStateValue: () => 0, isAttackLimit: () => true, State: {} };
    battle.Round = 2;
    const originalRandom = Math.random;
    const strategySkill = { id: 1058, type: 2, name: '伐谋' };
    for (const [speedPoints, firstSkill, blockedSkill] of [
        [0, '其疾如风', '除恶务尽'],
        [90, '除恶务尽', '其疾如风']
    ]) {
        const lineup = structuredClone(team);
        lineup.blue.heros[1] = hero(1004);
        lineup.blue.heros[2].extraAttrsAlloc.spd = speedPoints;
        let combined;
        try { console.log = () => {}; combined = new BattleManger(lineup); }
        finally { console.log = originalLog; }
        for (const member of combined.BlueTeam.hero) {
            assert.equal(member.Storage.doubleAttackPreparation, firstSkill, '指挥阶段先施加的连击预备生效');
            assert(member.Storage.chuewujin, '除恶务尽的怯战减伤仍然保留');
        }
        const logs = combined.Record.Records.map(item => item.msg);
        assert(logs.some(msg => msg?.includes(`已有【${firstSkill}】的连击预备，【${blockedSkill}】的连击预备冲突`)));
        assert(logs.some(msg => msg?.startsWith('的速度属性提高了')), '其疾如风的速度加成仍然施加');

        const target = combined.BlueTeam.hero[0];
        combined.Over = false;
        let randomCalls = 0;
        try {
            Math.random = () => ++randomCalls % 100 === 0 ? 0 : 0.99999;
            for (const [round, expected] of [[1, '其疾如风'], [4, '除恶务尽']]) {
                target.State.doubleAttack = { rounds: 0, from: {} };
                combined.Round = round;
                target.callHook('行动前');
                target.callHook('普攻前');
                assert.equal(target.State.doubleAttack.from.skill?.name,
                    firstSkill === expected ? expected : undefined, `第 ${round} 回合只允许先施加的预备在其有效期内判定`);
            }
        } finally { Math.random = originalRandom; }
        assert.equal(randomCalls, 100, '被冲突的连击预备不进行掷骰');
    }

    let normalAttack, protectedAttack, normalStrategy, protectedStrategy;
    try {
        Math.random = () => 0;
        target.Storage.chuewujin = false;
        normalAttack = clacAttackDamage(attacker, target, { type: 1, rate: 100 });
        normalStrategy = clacInteDamage(attacker, target, { type: 2, rate: 100 }, strategySkill);
        target.Storage.chuewujin = true;
        protectedAttack = clacAttackDamage(attacker, target, { type: 1, rate: 100 });
        protectedStrategy = clacInteDamage(attacker, target, { type: 2, rate: 100 }, strategySkill);
    } finally { Math.random = originalRandom; }
    const physicalBase = attacker.Arms * 373 / (7700 + attacker.Arms);
    const strategyBase = attacker.Arms * 178 / (6459 + attacker.Arms);
    assert(Math.abs(protectedAttack - Math.round(physicalBase + (normalAttack - physicalBase) * 0.7)) <= 1, '攻击的兵力基础伤害不受减伤影响');
    assert(Math.abs(protectedStrategy - Math.round(strategyBase + (normalStrategy - strategyBase) * 0.7)) <= 1, '策略的兵力基础伤害不受减伤影响');
    console.log('除恶务尽减伤、阵亡后连击判定、士气概率和其疾如风冲突通过');
} finally {
    await vite.close();
}
