import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition, calcRecover } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const records = [];
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} }, SortSpdHeros: [],
    Record: { Records: records, pushRecord(_, msg) { records.push({ msg }); },
      pushActionRecord(_, __, ___, msg) { records.push({ msg }); } },
    addStat() {}, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (id, treasure) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const treasure = { id: 'xinghan', wengu: 4, buyi: 3, forge: 'jishi', forgeValue: 10 };
  const owner = new BattleHero(config(1003, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1003), 'blue', manager, 100);
  const ally = new BattleHero(config(1001), 'blue', manager, 100);
  const enemy = new BattleHero(config(1002), 'red', manager, 100);
  manager.BlueTeam.hero = [owner, ally]; manager.RedTeam.hero = [enemy];
  owner.Index = 1; ally.Index = 2; enemy.Index = 3;
  assert.equal(owner.Cost, 35); assert.equal(enemy.Cost, 30);
  assert.equal(owner.Attrs.def, Math.round(plain.Attrs.def * 1.04 * 100) / 100);
  const info = { type: 1, rate: 100 };
  getDamageAddition(enemy, owner, info, null);
  assert.equal(info.damageModifiers.entries.find(entry => entry.name === '星汉·不移')?.value, -3);
  owner.Treasure.forge = 'jianren'; owner.Treasure.forgeValue = 15;
  const activeDamage = { type: 1, rate: 100 };
  getDamageAddition(enemy, owner, activeDamage, { id: 1234, type: 2 });
  assert.equal(activeDamage.damageModifiers.entries.find(entry => entry.name === '星汉·坚忍')?.value, -15);
  owner.Treasure.forge = 'jiebei'; owner.Treasure.forgeValue = 20;
  const guarded = { type: 1, rate: 100 };
  getDamageAddition(enemy, owner, guarded, null);
  assert.equal(guarded.damageModifiers.entries.find(entry => entry.name === '星汉·戒备')?.value, -20);
  owner.Treasure.forge = 'jishi'; owner.Treasure.forgeValue = 10;
  owner.Treasure.forge = 'buxie'; owner.Treasure.forgeValue = 5;
  owner.Arms = 7000; owner.HurtArms = 3000;
  owner.revocer(100, owner, '测试恢复');
  assert.equal(owner.Arms, 7110, '不懈按损失的两个15%档位增加受疗效果');
  owner.Treasure.forge = 'jishi'; owner.Treasure.forgeValue = 10;

  owner.Arms = 7000; owner.HurtArms = 3000;
  const expectedHeal = calcRecover(owner, 150, 0, 2);
  const active = { id: 9998, name: '测试主动', type: 2 };
  ally.callHook('战法成功发动后', active);
  assert.equal(owner.Storage.xinghanActiveCasts, 1);
  assert.equal(owner.Arms, 7000);
  owner.callHook('战法成功发动后', active);
  assert.equal(owner.Storage.xinghanActiveCasts, 2);
  assert.equal(owner.Arms, 7000 + expectedHeal, '我军两次主动战法后归心恢复一次');
  owner.callHook('战法成功发动后', { ...active, type: 3 });
  assert.equal(owner.Storage.xinghanActiveCasts, 2, '追击不计入归心');

  ally.Arms = 7000; ally.HurtArms = 3000;
  ally.revocer(200, owner, owner.Skills[owner.Skill].name);
  ally.revocer(200, owner, owner.Skills[owner.Skill].name);
  assert.equal(ally.Storage.xinghanJishiCharges.length, 2);
  ally.Storage.evadeNextDamage = true;
  const originalLog = console.log; console.log = () => {};
  try {
    ally.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 1000);
    assert.equal(ally.Storage.xinghanJishiCharges.length, 2, '规避不消耗济世');
    const armsBefore = ally.Arms;
    ally.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 1000);
    assert.equal(ally.Storage.xinghanJishiCharges.length, 0);
    assert.ok(ally.Arms > armsBefore - 1000, '济世叠层减少下一次实际伤害');
    assert.ok(records.some(entry => entry.damageModifiers?.entries?.some(mod => mod.name === '星汉·济世' && mod.value === -20)));

    owner.Treasure.forge = 'buqu'; owner.Treasure.forgeValue = 5;
    owner.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 200);
    assert.equal(owner.Storage.xinghanBuquStacks, 1);
    owner.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 200);
    assert.equal(owner.Storage.xinghanBuquStacks, 2);
    assert.ok(records.some(entry => entry.damageModifiers?.entries?.some(mod => mod.name === '星汉·不屈' && mod.value === -5)));
    manager.Round = 2;
    owner.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 200);
    assert.equal(owner.Storage.xinghanBuquStacks, 1, '新回合重新计层');

    owner.Treasure.forge = 'weishi'; owner.Treasure.forgeValue = 15;
    owner.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 200);
    assert.ok(records.some(entry => entry.damageModifiers?.entries?.some(mod => mod.name === '星汉·威势' && mod.value === -15)));
    const equalCost = new BattleHero(config(1004), 'red', manager, 100);
    assert.equal(equalCost.Cost, 35);
    const recordCount = records.filter(entry => entry.damageModifiers?.entries?.some(mod => mod.name === '星汉·威势')).length;
    owner.beHurtByNum(equalCost, { type: 1, rate: 100 }, null, 200);
    assert.equal(records.filter(entry => entry.damageModifiers?.entries?.some(mod => mod.name === '星汉·威势')).length, recordCount);
  } finally { console.log = originalLog; }
  console.log('星汉战斗规则验证通过');
} finally { await vite.close(); }
