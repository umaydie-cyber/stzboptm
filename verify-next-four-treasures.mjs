import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} }, SortSpdHeros: [],
    Record: { Records: [], pushRecord() {}, pushActionRecord() {} }, addStat() {},
    BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (treasure, id = 1001) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const hero = (treasure, camp = 'blue') => new BattleHero(config(treasure, camp === 'blue' ? 1001 : 1002), camp, manager, 100);
  const plain = hero(null); const enemy = hero(null, 'red');
  const modifiers = (attacker, target, type, skill, basic = false) => {
    const info = { type, rate: 100, isBasicAttack: basic };
    getDamageAddition(attacker, target, info, skill);
    return Object.fromEntries(info.damageModifiers.entries.map(entry => [entry.name, entry.value]));
  };
  const kunwu = hero({ id: 'kunwu', wengu: 4, kangli: 5, forge: 'kangli', forgeValue: 16 });
  assert.equal(kunwu.Attrs.def, plain.Attrs.def + 8);
  for (const key of ['atk', 'int', 'spd']) assert.equal(kunwu.Attrs[key], plain.Attrs[key] + 8);
  let m = modifiers(kunwu, enemy, 1, { id: kunwu.Skill, type: 2 });
  assert.equal(m['锟铻·亢厉'], 10); assert.equal(m['锟铻·锻造亢厉'], 16);
  m = modifiers(kunwu, enemy, 1, { id: kunwu.Skill, type: 3 });
  assert.equal(m['锟铻·亢厉'], undefined); assert.equal(m['锟铻·锻造亢厉'], 16);
  const minghong = hero({ id: 'minghong', wengu: 4, yingcai: 5, forge: 'kangli', forgeValue: 14 });
  assert.equal(minghong.Attrs.def, plain.Attrs.def + 12);
  assert.equal(minghong.Attrs.atk, plain.Attrs.atk + 7.5);
  assert.equal(minghong.Attrs.int, plain.Attrs.int + 7.5);
  m = modifiers(minghong, enemy, 2, { id: minghong.Skill, type: 3 });
  assert.equal(m['铭鸿·亢厉'], 10); assert.equal(m['铭鸿·锻造亢厉'], 14);
  m = modifiers(minghong, enemy, 2, { id: -1, type: 2 });
  assert.equal(m['铭鸿·亢厉'], undefined);
  const kunwuChousuan = hero({ id: 'kunwu', wengu: 1, kangli: 1, forge: 'chousuan', forgeValue: 15 });
  assert.equal(kunwuChousuan.getTreasureMainRateBonus({ id: kunwuChousuan.Skill, type: 2, causesStrategyDamage: true }), 15);
  assert.equal(kunwuChousuan.getTreasureMainRateBonus({ id: -1, type: 2, causesStrategyDamage: true }), 0);
  const bieming = hero({ id: 'bieming', wengu: 4, buyi: 5, forge: 'jianren', forgeValue: 15 });
  assert.equal(bieming.Attrs.def, plain.Attrs.def + 12);
  for (const key of ['int', 'spd']) assert.equal(bieming.Attrs[key], Math.round(plain.Attrs[key] * 1.05 * 100) / 100);
  m = modifiers(enemy, bieming, 1, { type: 2 });
  assert.equal(m['别鸣·不移'], -5); assert.equal(m['别鸣·坚忍'], -15);
  const biemingJimin = hero({ id: 'bieming', wengu: 1, buyi: 1, forge: 'jimin', forgeValue: 9 });
  assert.equal(biemingJimin.getTreasureMainRateBonus({ id: biemingJimin.Skill, type: 2 }), 9);
  const qi = hero({ id: 'qi', xiaorui: 4, wengu: 5, forge: 'xianzhen', forgeValue: 20 });
  assert.equal(qi.Attrs.atk, plain.Attrs.atk + 8);
  assert.equal(qi.Attrs.def, plain.Attrs.def + 15);
  m = modifiers(qi, enemy, 1, null, true);
  assert.equal(m['戚·勇猛'], 8); assert.equal(m['戚·陷阵'], 20);
  m = modifiers(qi, enemy, 2, { type: 2 });
  assert.equal(m['戚·勇猛'], undefined); assert.equal(m['戚·陷阵'], undefined);
  console.log('锟铻、铭鸿、别鸣、戚属性与战斗效果验证通过');
} finally { await vite.close(); }
