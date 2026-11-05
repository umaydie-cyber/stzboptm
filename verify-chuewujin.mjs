import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
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

    const attacker = battle.RedTeam.hero[1];
    attacker.Arms = 10000;
    battle.Round = 2;
    ally.Arms = 10000;
    ally.HurtArms = 0;
    ally.State.attackLimit.rounds = 1;
    ally.beHurtByNum(attacker, { type: 1, rate: 100 }, null, 1000);
    assert.equal(ally.Arms, 9300, '前三回合怯战时所有伤害降低30%');
    ally.Arms = 10000;
    ally.State.attackLimit.rounds = 0;
    ally.beHurtByNum(attacker, { type: 1, rate: 100 }, null, 1000);
    assert.equal(ally.Arms, 9000, '未怯战时不减伤');
    console.log('除恶务尽减伤、阵亡后连击判定及士气概率通过');
} finally {
    await vite.close();
}
