import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition, calcRecover } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const records = [];
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} }, SortSpdHeros: [],
    Record: { Records: records, pushRecord(_, msg) { records.push({ msg }); },
      pushActionRecord(_, __, ___, msg) { records.push({ msg }); } },
    addStat() {}, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (id, treasure) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const treasure = { id: 'weizhisan_gong', wengu: 3, yanshi: 9, forge: 'shulv', forgeValue: 12 };
  const hero = new BattleHero(config(1007, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1007), 'blue', manager, 100);
  const enemy = new BattleHero(config(1001), 'red', manager, 100);
  hero.Index = 1; enemy.Index = 2;
  manager.BlueTeam.hero = [hero]; manager.RedTeam.hero = [enemy];
  assert.equal(hero.Attrs.def - plain.Attrs.def, 9);
  const entries = (info, skill = null) => { getDamageAddition(hero, enemy, info, skill); return info.damageModifiers.entries; };
  const fireSkill = { id: 9999, name: '火辎', type: 2, ready: true };
  assert.equal(entries({ type: 2, rate: 100 }, fireSkill).find(entry => entry.name === '位至三公·炎势')?.value, 9);
  assert.equal(entries({ type: 4, rate: 100, kind: '燃烧' }, fireSkill).find(entry => entry.name === '位至三公·炎势')?.value, 9);
  assert.equal(entries({ type: 4, rate: 100, kind: '恐慌' }).find(entry => entry.name === '位至三公·炎势'), undefined);
  const main = { id: hero.Skill, type: 2, ready: true };
  assert.equal(hero.getTreasureMainRateBonus(main), 12);
  assert.equal(hero.getTreasureMainRateBonus(fireSkill), 0);

  hero.Arms = 7000; hero.HurtArms = 3000;
  const expected = calcRecover(hero, 120, 0, 2);
  const originalLog = console.log; console.log = () => {};
  try {
    enemy.beHurtByNum(hero, { type: 4, rate: 100, kind: '燃烧' }, fireSkill, 100);
    assert.equal(hero.Arms, 7000 + expected, '本回合首次燃烧伤害触发120%恢复');
    assert.equal(hero.Storage.weizhisan_gongHealRound, 1);
    enemy.beHurtByNum(hero, { type: 4, rate: 100, kind: '燃烧' }, fireSkill, 100);
    assert.equal(hero.Arms, 7000 + expected, '同回合燃烧伤害不重复恢复');
    manager.Round = 2;
    enemy.beHurtByNum(hero, { type: 4, rate: 100, kind: '恐慌' }, fireSkill, 100);
    assert.equal(hero.Arms, 7000 + expected, '恐慌不触发');
    enemy.beHurtByNum(hero, { type: 4, rate: 100, kind: '烈火焚舟焚烧' }, fireSkill, 100);
    assert.ok(hero.Arms > 7000 + expected, '下一回合焚烧伤害可以再次恢复');
    assert.ok(records.some(entry => entry.msg?.includes('位至三公·燮理')));
  } finally { console.log = originalLog; }
  hero.Treasure.forge = 'kangli'; hero.Treasure.forgeValue = 20;
  assert.equal(entries({ type: 2, rate: 100 }, main).find(entry => entry.name === '位至三公·锻造亢厉')?.value, 20);
  hero.Treasure.forge = 'zhice';
  assert.equal(entries({ type: 2, rate: 100 }, fireSkill).find(entry => entry.name === '位至三公·至策')?.value, 20);
  hero.Treasure.forge = 'jixu'; hero.Treasure.forgeValue = 5;
  enemy.State.confusion = { rounds: 1, from: { hero, skill: main } };
  assert.equal(entries({ type: 2, rate: 100 }).find(entry => entry.name === '位至三公·击虚')?.value, 5);
  console.log('位至三公战斗规则验证通过');
} finally { await vite.close(); }
