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
  const battle = new BattleManger({ blue: { morale: 100, heros: [hero(1002, [1072, 1038])] },
    red: { morale: 100, heros: [hero(1004)] } });
  const source = battle.BlueTeam.hero[0];
  const target = battle.RedTeam.hero[0];
  battle.Over = false;
  battle.Round = 1;
  source.Arms = target.Arms = 10000;
  source.Storage.shiwuStacks = 0;
  source.Storage.shiwuIgnoreNextDamage = false;
  assert.equal(source.Skills[1072].type, 4);
  Math.random = () => 0.99;
  for (let i = 0; i < 4; i++) source.callPursuitSkill(target);
  assert.equal(source.Storage.shiwuStacks, 3, '四次失败尝试最多积累三层');
  assert.equal(source.Storage.shiwuIgnoreNextDamage, true);
  const info = { type: 1, rate: 100 };
  const base = getDamageAddition(source, target, info, source.Skills[1038]);
  source.Storage.shiwuPursuitBonus = 120;
  assert(Math.abs(getDamageAddition(source, target, info, source.Skills[1038]) - base - 1.2) < 1e-9);
  source.Storage.shiwuPursuitBonus = 0;
  target.Storage.evadeNextDamage = true;
  target.beHurtByNum(source, info, source.Skills[1038], 100);
  assert.equal(target.Arms, 9900, '下一次伤害无视规避');
  assert.equal(target.Storage.evadeNextDamage, true, '被无视的规避保留');
  target.beHurtByNum(source, info, source.Skills[1038], 100);
  assert.equal(target.Arms, 9900, '随后的一次伤害被规避');
  const qiqin = { source: target, count: 0, completed: false };
  target.Storage.qiqinQizong = qiqin;
  source.Storage.shiwuIgnoreNextDamage = true;
  Math.random = () => 0;
  target.beHurtByNum(source, info, source.Skills[1038], 100);
  assert.equal(target.Arms, 9800, '势无虚动应先于七擒七纵判定并无视其规避');
  assert.equal(qiqin.count, 0, '被无视的七擒七纵规避不消耗判定次数');
  target.beHurtByNum(source, info, source.Skills[1038], 100);
  assert.equal(target.Arms, 9800, '没有势无虚动时仍可被七擒七纵规避');
  assert.equal(qiqin.count, 1);
  target.Storage.qiqinQizong = null;
  Math.random = () => 0;
  source.callPursuitSkill(target);
  assert.equal(source.Storage.shiwuStacks, 0, '成功发动后消耗叠层');
  assert.equal(source.Storage.shiwuPursuitBonus, 0);
  console.log = originalLog;
  console.log('势无虚动失败叠层、追击增伤与无视规避通过');
} finally {
  console.log = originalLog;
  Math.random = originalRandom;
  await vite.close();
}
