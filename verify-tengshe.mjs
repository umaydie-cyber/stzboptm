import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const records = [];
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} }, SortSpdHeros: [],
    Record: { Records: records, pushRecord(_, msg) { records.push(msg); }, pushActionRecord(_, __, ___, msg) { records.push(msg); } },
    addStat() {}, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (id, treasure, equipskill = []) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill, treasure });
  const treasure = { id: 'tengshe', lingdong: 4, xiaorui: 8, forge: 'shulv', forgeValue: 12 };
  const hero = new BattleHero(config(1007, treasure, [1014]), 'blue', manager, 100);
  const plain = new BattleHero(config(1007), 'blue', manager, 100);
  const enemy = new BattleHero(config(1002), 'red', manager, 100);
  const globalMain = __SKILLS__.find(skill => skill.id === hero.Skill);
  assert.equal(globalMain.type, 2);
  assert.equal(hero.Skills[hero.Skill].limit, globalMain.limit + 1);
  assert.equal(plain.Skills[plain.Skill].limit, globalMain.limit);
  assert.equal(globalMain.limit, 4, '共享定义未被修改');
  assert.equal(hero.Skills[1014].limit, __SKILLS__.find(skill => skill.id === 1014).limit, '携带战法不加距');
  assert.ok(Math.abs(hero.Attrs.spd - plain.Attrs.spd - 4) < 1e-8);
  assert.ok(Math.abs(hero.Attrs.atk - plain.Attrs.atk - 16) < 1e-8);

  const allies = [new BattleHero(config(1001), 'blue', manager, 100), new BattleHero(config(1001), 'blue', manager, 100)];
  const red = [enemy, new BattleHero(config(1002), 'red', manager, 100), new BattleHero(config(1002), 'red', manager, 100)];
  manager.BlueTeam.hero = [hero, ...allies]; manager.RedTeam.hero = red;
  assert.equal(hero.getTarget(globalMain.limit, 3).includes(enemy), false);
  assert.equal(hero.getTarget(hero.Skills[hero.Skill].limit, 3).includes(enemy), true);
  const entries = (skill = null) => { const info = { type: 1, rate: 100 };
    getDamageAddition(hero, enemy, info, skill); return info.damageModifiers.entries; };
  hero.Treasure.forge = 'kangli'; hero.Treasure.forgeValue = 20;
  assert.equal(entries(hero.Skills[hero.Skill]).find(x => x.name === '螣蛇·锻造亢厉')?.value, 20);
  assert.equal(entries(hero.Skills[1014]).find(x => x.name === '螣蛇·锻造亢厉'), undefined);
  hero.Treasure.forge = 'zhice';
  assert.equal(entries(hero.Skills[hero.Skill]).find(x => x.name === '螣蛇·至策')?.value, 20);
  hero.Treasure.forge = 'jixu'; hero.Treasure.forgeValue = 7;
  enemy.State.confusion = { rounds: 1, from: { hero, skill: hero.Skills[hero.Skill] } };
  assert.equal(entries().find(x => x.name === '螣蛇·击虚')?.value, 7);
  hero.Treasure.forge = 'shulv'; hero.Treasure.forgeValue = 12;
  const readyMain = { ...hero.Skills[hero.Skill], ready: true };
  assert.equal(hero.getTreasureMainRateBonus(readyMain), 12);
  assert.equal(hero.getTreasureMainRateBonus({ ...readyMain, id: 9999 }), 0);
  assert.equal(hero.getTreasureMainRateBonus({ ...readyMain, ready: false }), 0);
  hero.SkillsOrder = [hero.Skill];
  hero.Skills[hero.Skill] = { ...readyMain, callskill: (_, rate) => {
    assert.equal(rate, hero.getRealSkillRate(readyMain.rate) + 12); return false;
  } };
  const originalLog = console.log; console.log = () => {};
  try { hero.callActiveSkill(); } finally { console.log = originalLog; }
  assert.ok(records.some(msg => msg.includes('螣蛇·熟虑+12%')));
  const tianzi = new BattleHero(config(1007, { ...treasure, forge: 'tianzi', forgeValue: 10 }), 'blue', manager, 100);
  assert.ok(tianzi.Attrs.int > hero.Attrs.int);
  const xiaorui = new BattleHero(config(1007, { ...treasure, forge: 'xiaorui', forgeValue: 10 }), 'blue', manager, 100);
  assert.ok(xiaorui.Attrs.atk > hero.Attrs.atk);
  console.log('螣蛇战斗规则验证通过');
} finally { await vite.close(); }
