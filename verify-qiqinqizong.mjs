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
    blue: { morale: 120, heros: [hero(1002, [1073]), hero(1004), hero(1024)] },
    red: { morale: 100, heros: [hero(1009), hero(1027)] }
  });
  const [caster, ally] = battle.BlueTeam.hero;
  const [enemy, topEnemy] = battle.RedTeam.hero;
  battle.Over = false;
  battle.Round = 1;
  for (const unit of battle.BattleHeros) unit.Arms = 10000;
  caster.Morale = 120;
  battle.Stats.red = { [`${enemy.Index}:basic`]: { damage: 100 },
    [`${topEnemy.Index}:basic`]: { damage: 900 } };
  Math.random = () => 0.99;
  caster.Skills[1073].callskill(caster);
  const protectedAllies = battle.BlueTeam.hero.filter(unit => unit.Storage.qiqinQizong);
  assert(protectedAllies.length >= 2);
  const effect = protectedAllies[0].Storage.qiqinQizong;
  assert(protectedAllies.every(unit => unit.Storage.qiqinQizong === effect));
  assert.equal(caster.getRealSkillRate(25), 28);
  assert.equal(caster.getRealSkillRate(50), 56);
  Math.random = () => 0;
  for (let i = 0; i < 7; i++) {
    const victim = protectedAllies[i % protectedAllies.length];
    victim.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 100);
  }
  assert.equal(effect.count, 7);
  assert.equal(effect.completed, true);
  assert(protectedAllies.every(unit => unit.Arms === 10000));
  assert.equal(topEnemy.Storage.qiqinAllDamageSub.value, 9999);
  assert.equal(topEnemy.Storage.qiqinAllDamageSub.round, 2);
  const snapshot = { type: 2, rate: 100, troopBaseDamage: 100 };
  const before = getDamageAddition(topEnemy, caster, snapshot);
  battle.Round = 2;
  assert.equal(getDamageAddition(topEnemy, caster, { type: 1, rate: 100 }), 0.1);
  const after = getDamageAddition(topEnemy, caster, { type: 2, rate: 100 });
  assert.equal(after, 0.1);
  caster.Arms = 10000;
  caster.beHurtByNum(topEnemy, snapshot, null, 1000);
  assert.equal(10000 - caster.Arms, Math.round(100 + 900 * after / before), '预计算伤害在实际受伤回合仍受减伤');
  battle.Round = 3;
  assert.equal(topEnemy.Storage.qiqinAllDamageSub.round, 2);
  const fresh = { source: caster, skill: caster.Skills[1073], count: 0, completed: false };
  ally.Storage.qiqinQizong = fresh;
  ally.State.confusion = { rounds: 1, from: { hero: enemy, skill: enemy.Skills[1021] } };
  assert.equal(fresh.count, 1);
  assert.equal(ally.State.confusion.rounds, 0, '控制被抵御');
  console.log = originalLog;
  console.log('七擒七纵共享七次判定、士气概率、控制抵御和-9999%下回合减伤通过');
} finally {
  console.log = originalLog;
  Math.random = originalRandom;
  await vite.close();
}
