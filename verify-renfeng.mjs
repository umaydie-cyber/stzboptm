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
  const treasure = { id: 'renfeng', xianzhi: 5, lingdong: 5, forge: 'genzhi', forgeValue: 20 };
  const owner = new BattleHero(config(1001, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1001), 'blue', manager, 100);
  const enemy = new BattleHero(config(1002), 'red', manager, 100);
  manager.BlueTeam.hero = [owner]; manager.RedTeam.hero = [enemy];
  assert.equal(owner.Attrs.int, Math.round(plain.Attrs.int * 1.08 * 100) / 100 + 20);
  assert.equal(owner.Attrs.spd, plain.Attrs.spd + 10);
  const strategy = { type: 2, rate: 100 };
  getDamageAddition(enemy, owner, strategy, { type: 2 });
  assert.equal(strategy.damageModifiers.entries.find(entry => entry.name === '仁风·先知')?.value, -5);
  const attack = { type: 1, rate: 100 };
  getDamageAddition(enemy, owner, attack, null);
  assert.equal(attack.damageModifiers.entries.find(entry => entry.name === '仁风·先知'), undefined);
  const originalLog = console.log; console.log = () => {};
  try {
    const before = enemy.Arms;
    owner.callAttack();
    owner.clearAllHarmfulEffects({ name: '测试净化' });
    owner.callAttack();
    assert.equal(enemy.Arms, before, '艮止不可净化');
  } finally { console.log = originalLog; }
  const faster = new BattleHero(config(1001, { ...treasure, forge: 'lingdong', forgeValue: 30 }), 'blue', manager, 100);
  assert.equal(faster.Attrs.spd, plain.Attrs.spd + 40);
  const tough = new BattleHero(config(1001, { ...treasure, forge: 'jianren', forgeValue: 15 }), 'blue', manager, 100);
  const active = { type: 2, rate: 100 };
  getDamageAddition(enemy, tough, active, { type: 2 });
  assert.equal(active.damageModifiers.entries.find(entry => entry.name === '仁风·坚忍')?.value, -15);
  console.log('仁风属性及锻造验证通过');
} finally { await vite.close(); }
