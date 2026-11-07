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
  const treasure = { id: 'xiuni', jianren: 3, xiaorui: 9, forge: 'benxi', forgeValue: 7 };
  const hero = new BattleHero(config(1001, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1001), 'blue', manager, 100);
  const enemy = new BattleHero(config(1002), 'red', manager, 100);
  hero.Index = 1; enemy.Index = 2;
  manager.BlueTeam.hero = [hero]; manager.RedTeam.hero = [enemy];
  assert.equal(hero.Attrs.atk - plain.Attrs.atk, 18);
  const entries = (attacker, target, info, skill = null) => {
    getDamageAddition(attacker, target, info, skill); return info.damageModifiers.entries;
  };
  assert.equal(entries(enemy, hero, { type: 1, rate: 100 }, { id: 9998, type: 2 })
    .find(entry => entry.name === '貅猊·坚忍')?.value, -3);
  assert.equal(entries(enemy, hero, { type: 1, rate: 100 }).find(entry => entry.name === '貅猊·坚忍'), undefined);
  assert.equal(entries(hero, enemy, { type: 1, rate: 100, isBasicAttack: true })
    .find(entry => entry.name === '貅猊·迅猛'), undefined);
  hero.State.doubleAttack = { rounds: 2, from: { hero, skill: null } };
  assert.equal(entries(hero, enemy, { type: 1, rate: 100, isBasicAttack: true })
    .find(entry => entry.name === '貅猊·迅猛')?.value, 20);
  assert.equal(entries(hero, enemy, { type: 1, rate: 100, isBasicAttack: true, isSplitAttack: true })
    .find(entry => entry.name === '貅猊·迅猛')?.value, 20);
  assert.equal(entries(hero, enemy, { type: 1, rate: 100 }).find(entry => entry.name === '貅猊·迅猛'), undefined);
  assert.equal(entries(hero, enemy, { type: 2, rate: 100 }, { id: 9999, type: 2 })
    .find(entry => entry.name === '貅猊·迅猛'), undefined);

  hero.SkillsOrder = [];
  const originalRandom = Math.random, originalLog = console.log;
  Math.random = () => 0; console.log = () => {};
  try {
    hero.callAttack();
    assert.equal(records.filter(entry => entry.msg === '发动普通攻击').length, 2, '连击状态下发动两次普攻');
  } finally { Math.random = originalRandom; console.log = originalLog; }

  hero.Treasure.forge = 'xurui'; hero.Treasure.forgeValue = 10;
  hero.registerYuanrongBasicAttack(); hero.registerYuanrongBasicAttack();
  assert.equal(entries(hero, enemy, { type: 1, rate: 100 }, { id: 9001, type: 3 })
    .find(entry => entry.name === '貅猊·蓄锐')?.value, 10);
  hero.Treasure.forge = 'xuanfeng'; hero.Treasure.forgeValue = 20;
  hero.registerYuanrongBasicAttack();
  assert.equal(entries(hero, enemy, { type: 2, rate: 100 }, { id: 9002, type: 2 })
    .find(entry => entry.name === '貅猊·选锋')?.value, 20);
  hero.Treasure.forge = 'jianyi'; hero.Treasure.forgeValue = 3;
  hero.State.confusion = { rounds: 2, from: { hero: enemy, skill: 1 } };
  assert.equal(hero.State.confusion.rounds, 0);
  const tianzi = new BattleHero(config(1001, { ...treasure, forge: 'tianzi', forgeValue: 10 }), 'blue', manager, 100);
  assert.ok(tianzi.Attrs.int > hero.Attrs.int);
  console.log('貅猊战斗规则验证通过');
} finally { await vite.close(); }
