import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const records = [];
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} }, SortSpdHeros: [],
    Record: { Records: records, pushRecord(_, msg) { records.push(msg); }, pushActionRecord(_, __, ___, msg) { records.push(msg); } },
    addStat() {}, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (id, treasure) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const treasure = { id: 'jushu', wuwei: 8, lingdong: 4, forge: 'shulv', forgeValue: 12 };
  const hero = new BattleHero(config(1007, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1007), 'blue', manager, 100);
  const ally1 = new BattleHero(config(1001), 'blue', manager, 100);
  const ally2 = new BattleHero(config(1001), 'blue', manager, 100);
  const enemy = new BattleHero(config(1002), 'red', manager, 100);
  manager.BlueTeam.hero = [hero, ally1, ally2]; manager.RedTeam.hero = [enemy];
  assert.equal(hero.Limit, plain.Limit + 1);
  assert.equal(hero.Skills[hero.Skill].limit, plain.Skills[plain.Skill].limit, '主战法距离不变');
  assert.ok(Math.abs(hero.Attrs.spd - plain.Attrs.spd - 4) < 1e-8);
  assert.equal(hero.getAttackTarget(), enemy, '原攻击距离不足，穿杨后可普攻目标');
  assert.equal(plain.getTarget(plain.Limit, 1).length, 0);

  const entries = (skill = null) => { const info = { type: 1, rate: 100 };
    getDamageAddition(hero, enemy, info, skill); return info.damageModifiers.entries; };
  assert.equal(entries({ id: 9999, type: 3 }).find(x => x.name === '钜黍·无畏')?.value, 8);
  assert.equal(entries({ id: 9999, type: 2 }).find(x => x.name === '钜黍·无畏'), undefined);
  hero.Treasure.forge = 'kangli'; hero.Treasure.forgeValue = 20;
  assert.equal(entries(hero.Skills[hero.Skill]).find(x => x.name === '钜黍·锻造亢厉')?.value, 20);
  assert.equal(entries({ id: 9999, type: 2 }).find(x => x.name === '钜黍·锻造亢厉'), undefined);
  hero.Treasure.forge = 'zhice';
  assert.equal(entries({ id: 9999, type: 2 }).find(x => x.name === '钜黍·至策')?.value, 20);
  hero.Treasure.forge = 'jixu'; hero.Treasure.forgeValue = 7;
  enemy.State.confusion = { rounds: 1, from: { hero, skill: hero.Skills[hero.Skill] } };
  assert.equal(entries().find(x => x.name === '钜黍·击虚')?.value, 7);
  hero.Treasure.forge = 'shulv'; hero.Treasure.forgeValue = 12;
  const readyMain = { ...hero.Skills[hero.Skill], ready: true };
  assert.equal(hero.getTreasureMainRateBonus(readyMain), 12);
  hero.SkillsOrder = [hero.Skill];
  hero.Skills[hero.Skill] = { ...readyMain, callskill: (_, rate) => {
    assert.equal(rate, hero.getRealSkillRate(readyMain.rate) + 12); return false;
  } };
  const originalLog = console.log; console.log = () => {};
  try { hero.callActiveSkill(); } finally { console.log = originalLog; }
  assert.ok(records.some(msg => msg.includes('钜黍·熟虑+12%')));
  const tianzi = new BattleHero(config(1007, { ...treasure, forge: 'tianzi', forgeValue: 10 }), 'blue', manager, 100);
  assert.ok(tianzi.Attrs.int > hero.Attrs.int);
  const xiaorui = new BattleHero(config(1007, { ...treasure, forge: 'xiaorui', forgeValue: 10 }), 'blue', manager, 100);
  assert.ok(xiaorui.Attrs.atk > hero.Attrs.atk);
  console.log('钜黍战斗规则验证通过');
} finally { await vite.close(); }
