import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition, clacAttackDamage } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const records = [];
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} }, SortSpdHeros: [],
    Record: { pushRecord(_, msg) { records.push(msg); }, pushActionRecord(_, __, ___, msg) { records.push(msg); } },
    addStat() {}, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (id, treasure) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const treasure = { id: 'shanjun', podi: 3, xiaorui: 9, forge: 'wuwei', forgeValue: 20 };
  const hero = new BattleHero(config(1003, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1003), 'blue', manager, 100);
  const enemy = new BattleHero(config(1001), 'red', manager, 100);
  hero.Index = 1; enemy.Index = 2;
  manager.BlueTeam.hero = [hero]; manager.RedTeam.hero = [enemy];
  assert.equal(hero.Attrs.atk, Math.round(plain.Attrs.atk * 1.09 * 100) / 100);

  hero.State.attackDamageAdd.passive = { value: 120, from: hero.Skills[hero.Skill], hero };
  hero.applyTreasureBeforeAction();
  assert.equal(hero.Storage.shanjunHuxiaoRate, 4);
  hero.State.attackDamageAdd.command = { value: 90, from: { id: 9999 }, hero };
  hero.applyTreasureBeforeAction();
  assert.equal(hero.Storage.shanjunHuxiaoRate, 4, '其他战法的增伤不计入虎啸');
  hero.State.attackDamageAdd.passive.hero = enemy;
  hero.applyTreasureBeforeAction();
  assert.equal(hero.Storage.shanjunHuxiaoRate, 0, '主战法给予其他武将的增伤不计入虎啸');
  hero.State.attackDamageAdd.passive.hero = hero;
  hero.applyTreasureBeforeAction();

  const pursuit = { id: 9998, name: '测试追击', type: 3, rate: 30, callskill() {} };
  hero.Skills[9998] = pursuit;
  hero.SkillsOrder = [9998];
  const originalRandom = Math.random;
  Math.random = () => 0.99;
  try {
    hero.callPursuitSkill(enemy);
    assert.ok(records.some(msg => msg?.includes('山君·虎啸+4%')));
    hero.Morale = 150;
    hero.callPursuitSkill(enemy);
    assert.ok(records.some(msg => msg?.includes('士气修正后增加5%')));
  } finally { Math.random = originalRandom; }

  const modifiers = (skill) => { const info = { type: 1, rate: 100 }; getDamageAddition(hero, enemy, info, skill); return info.damageModifiers.entries; };
  assert.equal(modifiers(pursuit).find(entry => entry.name === '山君·无畏')?.value, 20);
  assert.equal(modifiers({ id: 1, type: 2 }).find(entry => entry.name === '山君·无畏'), undefined);
  const originalLog = console.log; console.log = () => {};
  try {
    Math.random = () => 0;
    const baseline = clacAttackDamage(hero, enemy, { type: 1, rate: 100 }, null);
    hero.Treasure.forge = 'podi'; hero.Treasure.forgeValue = 20;
    const ignored = clacAttackDamage(hero, enemy, { type: 1, rate: 100 }, null);
    assert.ok(ignored > baseline, '锻造破敌与第一词条叠加');
  } finally { Math.random = originalRandom; console.log = originalLog; }
  hero.Treasure.forge = 'xurui'; hero.Treasure.forgeValue = 10;
  hero.registerYuanrongBasicAttack(); hero.registerYuanrongBasicAttack();
  assert.equal(modifiers(pursuit).find(entry => entry.name === '山君·蓄锐')?.value, 10);
  hero.Treasure.forge = 'jianyi'; hero.Treasure.forgeValue = 3;
  hero.State.confusion = { rounds: 2, from: { hero: enemy, skill: 1 } };
  assert.equal(hero.State.confusion.rounds, 0);
  console.log('山君战斗规则验证通过');
} finally { await vite.close(); }
