import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalLog = console.log;
try {
  const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
  const hero = (id, equipskill = []) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill });
  console.log = () => {};
  const battle = new BattleManger({ blue: { morale: 100, heros: [hero(1002, [1051]), hero(1004)] },
    red: { morale: 100, heros: [hero(1009)] } });
  const source = battle.BlueTeam.hero[0];
  const target = battle.BlueTeam.hero[1];
  const enemy = battle.RedTeam.hero[0];
  battle.Over = false;
  battle.Round = 0;
  for (const unit of battle.BattleHeros) unit.Arms = 10000;
  const start = battle.Record.Records.length;
  source.Skills[1051].callskill(source);
  const applied = battle.Record.Records.slice(start).map(item => item.msg || '');
  assert(applied.some(msg => msg.includes('前2次策略伤害大幅降低')));
  assert(applied.some(msg => msg.includes('桃源问津') || msg.includes('受到攻击伤害降低')));
  assert(target.Storage.taoyuanStrategyReduction);
  const snapshot = () => ({ type: 2, rate: 100, troopBaseDamage: 100,
    damageModifiers: { total: 0, entries: [] } });
  battle.Round = 1;
  for (let hit = 0; hit < 3; hit++) {
    target.Arms = 10000;
    const recordStart = battle.Record.Records.length;
    target.beHurtByNum(enemy, snapshot(), null, 1000);
    const result = battle.Record.Records.slice(recordStart).find(item => item.msg?.includes('损失'));
    assert(result?.damageModifiers);
    if (hit < 2) {
      assert(target.Arms > 9000, '前两次预计算策略伤害受到大幅减伤');
      assert(result.damageModifiers.entries.some(entry => entry.name === '桃源问津'));
    } else {
      assert.equal(target.Arms, 9000, '第三次不再享受当回合减伤');
      assert(!result.damageModifiers.entries.some(entry => entry.name === '桃源问津'));
    }
  }
  console.log = originalLog;
  console.log('桃源问津双效果战报、前两次预计算策略减伤与第三次失效通过');
} finally {
  console.log = originalLog;
  await vite.close();
}
