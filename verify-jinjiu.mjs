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
  const treasure = { id: 'jinjiu', podi: 5, kangli: 7, forge: 'shulv', forgeValue: 12 };
  const hero = new BattleHero(config(1007, treasure), 'blue', manager, 100);
  const enemy = new BattleHero(config(1001), 'red', manager, 100);
  hero.Index = 1; enemy.Index = 2;
  manager.BlueTeam.hero = [hero]; manager.RedTeam.hero = [enemy];
  const main = { id: hero.Skill, name: '测试主战法', type: 2, rate: 100, ready: true,
    callskill(self) { return self.addReadySkill(this, 1, () => {}); } };
  hero.Skills[hero.Skill] = main;
  assert.equal(hero.getTreasureMainRateBonus(main), 12);
  assert.equal(hero.getTreasureMainRateBonus({ id: 9999, type: 2, ready: true }), 0);
  const entries = (type, skill = null) => { const info = { type, rate: 100 };
    getDamageAddition(hero, enemy, info, skill); return info.damageModifiers.entries; };
  assert.equal(entries(1, main).find(entry => entry.name === '金鸠·亢厉')?.value, 7);
  assert.equal(entries(1).find(entry => entry.name === '金鸠·亢厉'), undefined);

  const originalRandom = Math.random, originalLog = console.log;
  Math.random = () => 0; console.log = () => {};
  try {
    const baseline = clacAttackDamage(hero, enemy, { type: 1, rate: 100 }, null);
    hero.Treasure.podi = 10;
    assert.ok(clacAttackDamage(hero, enemy, { type: 1, rate: 100 }, null) > baseline);
    hero.callActiveSkill();
    assert.equal(hero.Storage.jinjiuYouyouStacks || 0, 0, '开始准备不叠层');
    assert.equal(hero.IN_READY_SKILL.length, 1);
    hero.callActiveSkill();
    assert.equal(hero.Storage.jinjiuYouyouStacks, 1, '实际发动后叠一层');
    assert.equal(entries(1).find(entry => entry.name === '金鸠·鸠佑')?.value, 6);
    assert.equal(entries(2).find(entry => entry.name === '金鸠·鸠佑'), undefined);
    assert.ok(records.some(msg => msg?.includes('金鸠·熟虑+12%')));
    hero.registerJinjiuMainActivation({ id: 9999, type: 2 });
    assert.equal(hero.Storage.jinjiuYouyouStacks, 1, '携带战法不叠层');
    hero.Treasure.forge = 'kangli'; hero.Treasure.forgeValue = 20;
    assert.equal(entries(1, main).find(entry => entry.name === '金鸠·锻造亢厉')?.value, 20);
    hero.Treasure.forge = 'zhice';
    assert.equal(entries(1, main).find(entry => entry.name === '金鸠·至策')?.value, 20);
    hero.Treasure.forge = 'jixu'; hero.Treasure.forgeValue = 5;
    enemy.State.confusion = { rounds: 1, from: { hero, skill: main } };
    assert.equal(entries(1).find(entry => entry.name === '金鸠·击虚')?.value, 5);
  } finally { Math.random = originalRandom; console.log = originalLog; }
  console.log('金鸠战斗规则验证通过');
} finally { await vite.close(); }
