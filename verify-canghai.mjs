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
  const treasure = { id: 'canghai', wengu: 4, jianren: 3, forge: 'jianren', forgeValue: 15 };
  const hero = new BattleHero(config(1003, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1003), 'blue', manager, 100);
  const enemy = new BattleHero(config(1002), 'red', manager, 100);
  hero.Index = 1; enemy.Index = 2;
  manager.BlueTeam.hero = [hero]; manager.RedTeam.hero = [enemy];
  assert.equal(hero.Attrs.def - plain.Attrs.def, 10);
  const entries = (attacker, target, skill = null) => { const info = { type: 1, rate: 100 };
    getDamageAddition(attacker, target, info, skill); return info.damageModifiers.entries; };
  assert.equal(entries(enemy, hero, { id: 9999, type: 2 }).find(entry => entry.name === '沧海·坚忍')?.value, -3);
  assert.equal(entries(enemy, hero, { id: 9999, type: 2 }).find(entry => entry.name === '沧海·锻造坚忍')?.value, -15);
  assert.equal(entries(enemy, hero).find(entry => entry.name === '沧海·坚忍'), undefined);

  const originalLog = console.log; console.log = () => {};
  try {
    hero.Storage.evadeNextDamage = true;
    hero.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 100);
    assert.equal(hero.Storage.canghaiPolangStacks, undefined, '规避不叠层');
    for (let hit = 1; hit <= 12; hit++) {
      hero.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 100);
      assert.equal(hero.Storage.canghaiPolangStacks, Math.min(hit, 10));
      assert.equal(entries(hero, enemy).find(entry => entry.name === '沧海·破浪')?.value, Math.min(hit, 10) * 10);
    }
    manager.Round = 2;
    assert.equal(entries(hero, enemy).find(entry => entry.name === '沧海·破浪'), undefined, '新回合重置破浪');
    hero.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 100);
    assert.equal(hero.Storage.canghaiPolangStacks, 1);

    hero.Treasure.forge = 'buqu'; hero.Treasure.forgeValue = 5;
    hero.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 1000);
    hero.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 1000);
    assert.ok(records.some(entry => entry.damageModifiers?.entries?.some(mod => mod.name === '沧海·不屈' && mod.value === -5)));
    hero.Treasure.forge = 'weishi'; hero.Treasure.forgeValue = 15;
    hero.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 1000);
    assert.ok(records.some(entry => entry.damageModifiers?.entries?.some(mod => mod.name === '沧海·威势' && mod.value === -15)));
    hero.Treasure.forge = 'jiebei'; hero.Treasure.forgeValue = 20;
    assert.equal(entries(enemy, hero).find(entry => entry.name === '沧海·戒备')?.value, -20);
    manager.Round = 3;
    assert.equal(entries(enemy, hero).find(entry => entry.name === '沧海·戒备'), undefined);

    hero.Treasure.forge = 'jishi'; hero.Treasure.forgeValue = 10;
    const ally = new BattleHero(config(1001), 'blue', manager, 100);
    ally.Arms = 7000; ally.HurtArms = 3000;
    ally.revocer(200, hero, hero.Skills[hero.Skill].name);
    assert.equal(ally.Storage.xinghanJishiCharges.length, 1);
    ally.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 1000);
    assert.ok(records.some(entry => entry.damageModifiers?.entries?.some(mod => mod.name === '沧海·济世' && mod.value === -10)));
    assert.equal(ally.Storage.xinghanJishiCharges.length, 0);

    hero.Treasure.forge = 'buxie'; hero.Treasure.forgeValue = 5;
    hero.Arms = 7000; hero.HurtArms = 3000;
    hero.revocer(100, hero, '测试恢复');
    assert.equal(hero.Arms, 7110);
    assert.ok(records.some(entry => entry.msg?.includes('沧海·不懈')));
  } finally { console.log = originalLog; }
  console.log('沧海战斗规则验证通过');
} finally { await vite.close(); }
