import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const records = [];
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} }, SortSpdHeros: [],
    Record: { Records: records, pushRecord(_, msg) { records.push({ msg }); },
      pushActionRecord(_, __, ___, msg) { records.push({ msg }); } },
    addStat() {}, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (id, treasure) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const treasure = { id: 'qianjun', wengu: 4, anzhen: 6, forge: 'wengu', forgeValue: 15 };
  const owner = new BattleHero(config(1007, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1007), 'blue', manager, 100);
  const ally = new BattleHero(config(1001), 'blue', manager, 100);
  const enemy = new BattleHero(config(1002), 'red', manager, 100);
  manager.BlueTeam.hero = [owner, ally]; manager.RedTeam.hero = [enemy];
  owner.Index = 1; ally.Index = 2; enemy.Index = 3;
  assert.equal(owner.Attrs.def, Math.round((plain.Attrs.def + 12) * 1.15 * 100) / 100);
  const entries = (attacker, target, skill = null) => { const info = { type: 1, rate: 100 };
    getDamageAddition(attacker, target, info, skill); return info.damageModifiers.entries; };
  assert.equal(entries(enemy, owner).find(x => x.name === '千钧·安贞'), undefined);
  owner.State.confusion = { rounds: 1, from: { hero: enemy, skill: 1004 } };
  assert.equal(entries(enemy, owner).find(x => x.name === '千钧·安贞')?.value, -6);
  owner.State.confusion.rounds = 0;

  const active = { id: 9001, name: '主动增益', type: 2 };
  const command = { id: 9002, name: '指挥增益', type: 1 };
  enemy.State.attackDamageAdd.active = { type: 1, value: 20, rounds: 2, from: active, hero: enemy };
  enemy.State.attackDamageAdd.command = { type: 1, value: 20, rounds: 2, from: command, hero: enemy };
  assert.equal(enemy.clearOneActiveBuff(owner), true);
  assert.equal(enemy.State.attackDamageAdd.active, undefined);
  assert.ok(enemy.State.attackDamageAdd.command, '指挥增益不能被破障移除');
  enemy.State.attackDamageAdd.active = { type: 1, value: 20, rounds: 2, from: active, hero: enemy };
  owner.SkillsOrder = [];
  const originalRandom = Math.random, originalLog = console.log;
  Math.random = () => 0; console.log = () => {};
  try { owner.basicAttack(enemy); } finally { Math.random = originalRandom; console.log = originalLog; }
  assert.equal(enemy.State.attackDamageAdd.active, undefined, '普通攻击结算后触发破障');

  owner.Treasure.forge = 'huoyan'; owner.Treasure.forgeValue = 2;
  const main = owner.Skills[owner.Skill];
  enemy.Treasure = { id: 'yuanrong', forge: 'jianyi', forgeValue: 3 };
  enemy.State.confusion = { rounds: 1, from: { hero: owner, skill: main } };
  assert.equal(enemy.State.confusion.rounds, 0, '被免疫的控制不计次数');
  assert.equal(owner.Storage.qianjunHuoyanCount || 0, 0);
  enemy.Treasure = null;
  manager.Round = 0;
  enemy.State.confusion = { rounds: 1, from: { hero: owner, skill: main } };
  assert.equal(enemy.State.confusion.rounds, 1, '战前施加不触发惑言');
  manager.Round = 1;
  enemy.State.confusion = { rounds: 1, from: { hero: owner, skill: main } };
  enemy.State.rage = { rounds: 1, from: { hero: owner, skill: main.id } };
  enemy.State.activeLimit = { rounds: 1, from: { hero: owner, skill: main } };
  assert.equal(enemy.State.confusion.rounds, 2);
  assert.equal(enemy.State.rage.rounds, 2);
  assert.equal(enemy.State.activeLimit.rounds, 1, '超过所选个数后不再延长');
  assert.equal(owner.Storage.qianjunHuoyanCount, 2);
  enemy.State.attackLimit = { rounds: 1, from: { hero: owner, skill: { id: 9999, type: 2 } } };
  assert.equal(enemy.State.attackLimit.rounds, 1, '携带战法不触发惑言');

  owner.Treasure.forge = 'jimin'; owner.Treasure.forgeValue = 9;
  assert.equal(owner.getTreasureMainRateBonus(main), 9);
  assert.equal(owner.getTreasureMainRateBonus({ ...main, id: 9999 }), 0);
  owner.SkillsOrder = [owner.Skill];
  owner.Skills[owner.Skill] = { ...main, callskill: (_, rate) => {
    assert.equal(rate, owner.getRealSkillRate(main.rate) + 9); return false;
  } };
  console.log = () => {};
  try { owner.callActiveSkill(); } finally { console.log = originalLog; }
  assert.ok(records.some(r => r.msg?.includes('千钧·机敏+9%')));
  owner.Skills[owner.Skill] = main;
  owner.Treasure.forge = 'jishi'; owner.Treasure.forgeValue = 10;
  ally.Arms = 8000; ally.HurtArms = 2000;
  ally.revocer(200, owner, main.name);
  assert.equal(ally.Storage.xinghanJishiCharges?.length, 1);
  console.log = () => {};
  try { ally.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 200); }
  finally { console.log = originalLog; }
  assert.ok(records.some(r => r.damageModifiers?.entries?.some(x => x.name === '千钧·济世' && x.value === -10)));
  owner.Treasure.forge = 'buqu'; owner.Treasure.forgeValue = 5;
  console.log = () => {};
  try {
    owner.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 200);
    assert.equal(owner.Storage.xinghanBuquStacks, 1);
    owner.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 200);
    assert.ok(records.some(r => r.damageModifiers?.entries?.some(x => x.name === '千钧·不屈' && x.value === -5)));
    owner.Treasure.forge = 'weishi'; owner.Treasure.forgeValue = 15;
    const lowerCostEnemy = new BattleHero(config(1001), 'red', manager, 100);
    assert.ok(lowerCostEnemy.Cost < owner.Cost);
    owner.beHurtByNum(lowerCostEnemy, { type: 1, rate: 100 }, null, 200);
    assert.ok(records.some(r => r.damageModifiers?.entries?.some(x => x.name === '千钧·威势' && x.value === -15)));
  } finally { console.log = originalLog; }
  const faster = new BattleHero(config(1007, { ...treasure, forge: 'lingdong', forgeValue: 20 }), 'blue', manager, 100);
  assert.ok(faster.Attrs.spd > owner.Attrs.spd);
  console.log('千钧战斗规则验证通过');
} finally { await vite.close(); }
