import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalLog = console.log;
const originalRandom = Math.random;
try {
    const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
    const config = (id, equipskill = []) => ({ id, level: 40, up: 5, arms: 10000,
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill });
    console.log = () => {};
    const battle = new BattleManger({
        blue: { morale: 120, heros: [config(1003, [1078]), config(1044), config(1004)] },
        red: { morale: 100, heros: [config(1002), config(1002), config(1002)] }
    });
    const [ally, dianwei] = battle.BlueTeam.hero;
    const attacker = battle.RedTeam.hero[1]; // 中军距典韦3格
    battle.Over = false;
    battle.Round = 1;
    Math.random = () => 0;
    assert.equal(dianwei.Skills[1104].limit, 3);
    for (const hero of battle.BattleHeros) hero.Arms = 10000;
    const allyArms = ally.Arms;
    const dianweiArms = dianwei.Arms;
    const recordStart = battle.Record.Records.length;
    ally.beHurtByNum(attacker, { type: 1, rate: 100 }, null, 300);
    assert.equal(ally.Arms, allyArms);
    assert(dianwei.Arms < dianweiArms);
    assert(battle.Record.Records.slice(recordStart).some(r => r.msg?.includes('反击判定') &&
        r.msg?.includes(`${dianwei.getRealSkillRate(60)}%`) && r.msg?.includes('距离3/3')));
    battle.Round = 4;
    dianwei.Arms = dianweiArms;
    ally.beHurtByNum(attacker, { type: 1, rate: 100 }, null, 300);
    assert(ally.Arms < allyArms, '第四回合不再承担伤害');
    console.log = originalLog;
    console.log('典韦援护、士气反击、合纵连横距离及持续回合验证通过');
} finally {
    console.log = originalLog;
    Math.random = originalRandom;
    await vite.close();
}


