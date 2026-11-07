import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition, clacAttackDamage } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const records = [];
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} },
    Record: { Records: records, pushRecord(hero, msg) { records.push({ hero, msg }); },
      pushActionRecord(hero, target, predicate, msg) { records.push({ hero, target, predicate, msg }); } },
    addStat() {}, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (id, treasure) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const weapon = { id: 'fenran', xiaorui: 1, buyi: 2, forge: 'xianzhen', forgeValue: 20 };
  const attacker = new BattleHero(config(1002, weapon), 'blue', manager, 100);
  const plain = new BattleHero(config(1002), 'blue', manager, 100);
  const target = new BattleHero(config(1001, weapon), 'red', manager, 100);
  attacker.Index = 1; target.Index = 2;
  manager.BlueTeam.hero = [attacker]; manager.RedTeam.hero = [target];
  assert.equal(attacker.Attrs.atk - plain.Attrs.atk, 2.5);
  const info = { type: 1, rate: 100, isBasicAttack: true };
  getDamageAddition(attacker, target, info, null);
  assert.equal(info.damageModifiers.entries.find(x => x.name === '奋髯·陷阵')?.value, 20);
  assert.equal(info.damageModifiers.entries.find(x => x.name === '奋髯·不移')?.value, -2);

  attacker.Treasure = { ...weapon, forge: 'podi', forgeValue: 20 };
  attacker.State.attackDamageAdd.passive = { value: 250, rounds: -1, from: { name: '测试增伤' }, hero: attacker };
  target.Storage.evadeNextDamage = true;
  target.beHurt(attacker, { type: 1, rate: 100, isBasicAttack: true });
  assert.equal(target.Storage.evadeNextDamage, false, '250% 不满足超过 250%');
  attacker.State.attackDamageAdd.passive.value = 251;
  target.Storage.evadeNextDamage = true;
  const before = target.Arms;
  target.beHurt(attacker, { type: 1, rate: 100, isBasicAttack: true });
  assert.equal(target.Storage.evadeNextDamage, true, '超过 250% 时不消耗规避');
  assert.ok(target.Arms < before);

  attacker.Treasure = { ...weapon, forge: 'qiangji', forgeValue: 2 };
  attacker.State.attackDamageAdd.passive = null;
  target.Storage.jianzuBudai = { id: 'counter', name: '健卒不殆' };
  let counterattacks = 0;
  attacker.beHurt = () => { counterattacks++; };
  target.beHurt(attacker, { type: 1, rate: 100, isBasicAttack: true });
  assert.equal(counterattacks, 0);

  attacker.Treasure = { ...weapon, forge: 'qingyi', forgeValue: 7 };
  manager.Round = 5;
  attacker.State.confusion = { rounds: 1 };
  attacker.State.rage = { rounds: 1 };
  attacker.State.attackLimit = { rounds: 1 };
  attacker.State.activeLimit = { rounds: 1 };
  assert.equal(attacker.State.confusion.rounds, 0);
  assert.equal(attacker.State.rage.rounds, 0);
  assert.equal(attacker.State.attackLimit.rounds, 0);
  assert.equal(attacker.State.activeLimit.rounds, 0);
  manager.Round = 4;
  attacker.State.confusion = { rounds: 2 };
  manager.Round = 5;
  attacker.applyTreasureRoundStart();
  assert.equal(attacker.State.confusion.rounds, 0, '洞察生效时应解除之前的混乱');
  manager.Round = 8;
  attacker.State.confusion = { rounds: 1 };
  assert.equal(attacker.State.confusion.rounds, 1);

  attacker.Treasure = { ...weapon, forge: 'cangfeng', forgeValue: 30 };
  attacker.State.confusion.rounds = 0;
  manager.Round = 1;
  attacker.finishRound();
  assert.equal(attacker.Storage.fenranCangfengReady, true);
  attacker.Storage.fenranCangfengCurrentAttack = true;
  const originalRandom = Math.random;
  Math.random = () => 0;
  const withIgnore = clacAttackDamage(attacker, target, { type: 1, rate: 100, isBasicAttack: true }, null);
  attacker.Storage.fenranCangfengCurrentAttack = false;
  const withoutIgnore = clacAttackDamage(attacker, target, { type: 1, rate: 100, isBasicAttack: true }, null);
  Math.random = originalRandom;
  assert.ok(withIgnore > withoutIgnore);
  const attackFlags = [];
  target.beHurt = () => attackFlags.push(attacker.Storage.fenranCangfengCurrentAttack);
  attacker.getSplitAttackTargets = () => [];
  attacker.callPursuitSkill = () => {};
  manager.Round = 2;
  attacker.basicAttack(target);
  attacker.basicAttack(target);
  assert.deepEqual(attackFlags, [true, false], '仅下回合首次普通攻击无视防御');
  const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
  const originalLog = console.log;
  console.log = () => {};
  try {
    for (const [forge, forgeValue] of [['xiaorui', 10], ['podi', 15], ['xianzhen', 20],
      ['qiangji', 3], ['qingyi', 7], ['cangfeng', 20]]) {
      new BattleManger({ blue: { morale: 100, heros: [config(1002, { ...weapon, forge, forgeValue })] },
        red: { morale: 100, heros: [config(1001)] } }, { records: false });
    }
  } finally {
    console.log = originalLog;
  }
  console.log('Verified 奋髯 damage, 250% threshold, counterattack immunity, insight rounds, and 藏锋 defense bypass');
} finally {
  await vite.close();
}
