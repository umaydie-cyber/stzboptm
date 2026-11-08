import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} }, SortSpdHeros: [],
    Record: { Records: [], pushRecord() {}, pushActionRecord() {} }, addStat() {},
    BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const hero = (treasure, camp = 'blue') => new BattleHero({ id: camp === 'blue' ? 1001 : 1002,
    level: 40, up: 5, arms: 10000, extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 },
    equipskill: [], treasure }, camp, manager, 100);
  const plain = hero(null), enemy = hero(null, 'red');
  const modifiers = (attacker, target, type, skill, basic = false) => {
    const info = { type, rate: 100, isBasicAttack: basic };
    getDamageAddition(attacker, target, info, skill);
    return Object.fromEntries(info.damageModifiers.entries.map(entry => [entry.name, entry.value]));
  };
  const zhengang = hero({ id: 'zhengang', podi: 4, xiaorui: 7, forge: 'zhice', forgeValue: 15 });
  assert.equal(zhengang.Attrs.atk, plain.Attrs.atk + 21);
  let m = modifiers(zhengang, enemy, 1, { type: 2 });
  assert.equal(m['真刚·盛气'], 20);
  assert.equal(m['真刚·至策'], 15);
  manager.Round = 3;
  assert.equal(modifiers(zhengang, enemy, 1, null)['真刚·盛气'], undefined);
  const jingni = hero({ id: 'jingni', buyi: 5, podi: 6, forge: 'jianren', forgeValue: 14 });
  assert.equal(jingni.Attrs.atk, Math.round(plain.Attrs.atk * 1.06 * 100) / 100);
  assert.equal(jingni.Attrs.def, Math.round(plain.Attrs.def * 1.06 * 100) / 100);
  m = modifiers(enemy, jingni, 1, { type: 2 });
  assert.equal(m['惊鲵·不移'], -5);
  assert.equal(m['惊鲵·坚忍'], -14);
  const mingshan = hero({ id: 'mingshangouyue', wengu: 4, kangli: 7 });
  assert.equal(mingshan.Attrs.def, plain.Attrs.def + 12);
  assert.equal(mingshan.Attrs.atk, Math.round(plain.Attrs.atk * 1.08 * 100) / 100);
  assert.equal(modifiers(mingshan, enemy, 2, { id: mingshan.Skill, type: 3 })['冥山勾月·亢厉'], 7);
  assert.equal(modifiers(mingshan, enemy, 2, { id: -1, type: 3 })['冥山勾月·亢厉'], undefined);
  const qulu = hero({ id: 'qulu', xiaorui: 5, wuwei: 6, forge: 'wuwei', forgeValue: 20 });
  assert.equal(qulu.Attrs.atk, plain.Attrs.atk + 10);
  m = modifiers(qulu, enemy, 1, { type: 3 });
  assert.equal(m['屈卢·无畏'], 6);
  assert.equal(m['屈卢·锻造无畏'], 20);
  const spear = hero({ id: 'zhengjiaoqiang', wuwei: 4, xiaorui: 7, forge: 'xianzhen', forgeValue: 20 });
  assert.equal(spear.Attrs.atk, plain.Attrs.atk + 21);
  m = modifiers(spear, enemy, 1, null, true);
  assert.equal(m['狰角枪·陷阵'], 12);
  assert.equal(m['狰角枪·锻造陷阵'], 20);
  assert.equal(modifiers(spear, enemy, 1, null, false)['狰角枪·陷阵'], undefined);
  console.log('五把宝物属性与伤害效果验证通过');
} finally { await vite.close(); }
