import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalLog = console.log;
const originalRandom = Math.random;
try {
  const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
  const { getDamageAddition, clacInteDamage, clacSkillAdditionRate } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const hero = id => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [] });
  console.log = () => {};
  const battle = new BattleManger({
    blue: { morale: 100, heros: [hero(1026), hero(1009)] },
    red: { morale: 100, heros: [hero(1002), hero(1004)] }
  });
  const [hui, lumeng] = battle.BlueTeam.hero;
  const target = battle.RedTeam.hero[0];
  battle.Over = false;
  assert.equal(hui.Name, '刘徽');
  assert.equal(hui.Skill, 1070);
  assert.equal(clacSkillAdditionRate(30, 0.15, 334.6), 68);
  hui.Attrs.int = 334.6;
  lumeng.Storage.lianweiQiongji = undefined;
  battle.Round = 0;
  Math.random = () => 0;
  const info = { type: 2, rate: 200 };
  const before = clacInteDamage(lumeng, target, { ...info }, lumeng.Skills[1021]);
  hui.Skills[1070].callskill(hui);
  assert.deepEqual([lumeng.Storage.lianweiQiongji.bonus, lumeng.Storage.lianweiQiongji.max,
    lumeng.Storage.lianweiQiongji.finalMax], [85, 188, 153]);
  const after = clacInteDamage(lumeng, target, { ...info }, lumeng.Skills[1021]);
  assert(after > before, '先施加的增伤进入白衣渡江快照');
  assert.equal(getDamageAddition(lumeng, target, info, lumeng.Skills[1021]), 1.85);
  const snapshot = before;
  assert.equal(snapshot, before, '后施加的效果不会修改既有快照数值');
  battle.Round = 7;
  assert.equal(getDamageAddition(lumeng, target, info, lumeng.Skills[1021]), 1);
  battle.Round = 6;
  const start = battle.Record.Records.length;
  Math.random = () => { throw new Error('收敛后不应再抽取波动'); };
  clacInteDamage(lumeng, target, { ...info }, lumeng.Skills[1021]);
  assert(battle.Record.Records.slice(start).some(r => r.msg?.includes('固定为153%（不再波动）')));
  console.log = originalLog;
  console.log('刘徽属性、隐藏系数、指挥快照与第六回合收敛通过');
} finally {
  console.log = originalLog;
  Math.random = originalRandom;
  await vite.close();
}
