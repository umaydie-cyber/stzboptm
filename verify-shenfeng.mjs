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
  const treasure = { id: 'shenfeng', wuwei: 5, yingcai: 7, forge: 'benxi', forgeValue: 7 };
  const hero = new BattleHero(config(1001, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1001), 'blue', manager, 100);
  const enemies = [1002, 1003, 1004].map(id => new BattleHero(config(id), 'red', manager, 100));
  hero.Index = 1; enemies.forEach((enemy, index) => { enemy.Index = 6 - index; });
  manager.BlueTeam.hero = [hero]; manager.RedTeam.hero = enemies;
  assert.equal(hero.Attrs.atk - plain.Attrs.atk, 10.5);
  assert.equal(hero.Attrs.int - plain.Attrs.int, 10.5);
  const pursuit = { id: 9001, name: '测试追击', type: 3, rate: 30 };
  const entries = (info, skill = null) => { getDamageAddition(hero, enemies[0], info, skill); return info.damageModifiers.entries; };
  assert.equal(entries({ type: 1, rate: 100 }, pursuit).find(entry => entry.name === '神锋·无畏')?.value, 5);
  assert.equal(entries({ type: 1, rate: 100 }).find(entry => entry.name === '神锋·无畏'), undefined);

  hero.SkillsOrder = []; // 验证普通攻击目标，不让随机追击干扰。
  const originalRandom = Math.random, originalLog = console.log;
  Math.random = () => 0; console.log = () => {};
  try {
    const originalArms = enemies.map(enemy => enemy.Arms);
    hero.callAttack();
    assert.deepEqual(enemies.map(enemy => enemy.Arms), originalArms, '第一回合不能普攻');
    assert.equal(hero.Storage.shenfengVolleyUsed, undefined);
    manager.Round = 2;
    hero.callAttack();
    assert.ok(enemies.every((enemy, index) => enemy.Arms < originalArms[index]), '第二回合首次普攻命中射程内全体敌军');
    assert.equal(hero.Storage.shenfengVolleyUsed, true);
    assert.equal(records.filter(entry => entry.msg?.includes('发动普通攻击')).length, 3);
    hero.callAttack();
    assert.equal(records.filter(entry => entry.msg?.includes('发动普通攻击')).length, 4, '群攻只触发一次');
  } finally { Math.random = originalRandom; console.log = originalLog; }

  hero.Treasure.forge = 'xurui'; hero.Treasure.forgeValue = 10;
  hero.registerYuanrongBasicAttack(); hero.registerYuanrongBasicAttack();
  assert.equal(entries({ type: 1, rate: 100 }, pursuit).find(entry => entry.name === '神锋·蓄锐')?.value, 10);
  hero.Treasure.forge = 'xuanfeng'; hero.Treasure.forgeValue = 20;
  hero.registerYuanrongBasicAttack();
  assert.equal(entries({ type: 2, rate: 100 }, { id: 9002, type: 2 }).find(entry => entry.name === '神锋·选锋')?.value, 20);
  hero.Treasure.forge = 'jianyi'; hero.Treasure.forgeValue = 3;
  hero.State.confusion = { rounds: 2, from: { hero: enemies[0], skill: 1 } };
  assert.equal(hero.State.confusion.rounds, 0);
  const tianzi = new BattleHero(config(1001, { ...treasure, forge: 'tianzi', forgeValue: 10 }), 'blue', manager, 100);
  assert.ok(tianzi.Attrs.int > hero.Attrs.int);
  console.log('神锋战斗规则验证通过');
} finally { await vite.close(); }
