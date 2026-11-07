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
  const config = (treasure) => ({ id: 1001, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const treasure = { id: 'longlin', lingdong: 4, kangli: 8, forge: 'benxi', forgeValue: 7 };
  const hero = new BattleHero(config(treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(), 'blue', manager, 100);
  const enemy = new BattleHero(config(), 'red', manager, 100);
  hero.Index = 1; enemy.Index = 2;
  manager.BlueTeam.hero = [hero]; manager.RedTeam.hero = [enemy];
  assert.ok(Math.abs(hero.Attrs.spd - plain.Attrs.spd - 6) < 1e-8);

  const main = __SKILLS__.find(skill => skill.id === 1004);
  hero.Skill = main.id;
  hero.Skills[main.id] = main;
  hero.SkillsOrder = [main.id];
  const entries = (info, skill) => {
    getDamageAddition(hero, enemy, info, skill);
    return info.damageModifiers.entries;
  };
  assert.equal(entries({ type: 1, rate: 100 }, main).find(x => x.name === '龙鳞·亢厉')?.value, 16);
  assert.equal(entries({ type: 1, rate: 100 }, { id: 9999, type: 3 }).find(x => x.name === '龙鳞·亢厉'), undefined);
  assert.equal(entries({ type: 1, rate: 100 }, { id: 9999, type: 2 }).find(x => x.name === '龙鳞·亢厉'), undefined);

  const control = (skill, name = 'confusion') => {
    enemy.State[name] = { rounds: 1, from: { hero, skill } };
    return enemy.State[name].rounds;
  };
  for (const name of ['confusion', 'rage', 'attackLimit', 'activeLimit']) assert.equal(control(main, name), 2);
  assert.equal(control({ id: 9999, type: 3 }), 1, '携带的追击战法不延长');
  assert.equal(control({ id: main.id, type: 2 }), 2, '以实际主战法类型为准');
  hero.Treasure.forge = 'jianyi'; hero.Treasure.forgeValue = 3;
  hero.State.confusion = { rounds: 1, from: { hero: enemy, skill: main } };
  assert.equal(hero.State.confusion.rounds, 0);
  hero.Treasure.forge = 'xurui'; hero.Treasure.forgeValue = 10;
  hero.registerYuanrongBasicAttack(); hero.registerYuanrongBasicAttack();
  assert.equal(entries({ type: 1, rate: 100 }, main).find(x => x.name === '龙鳞·蓄锐')?.value, 10);
  hero.Treasure.forge = 'xuanfeng'; hero.Treasure.forgeValue = 20;
  hero.registerYuanrongBasicAttack();
  assert.equal(entries({ type: 2, rate: 100 }, { id: 9999, type: 2 }).find(x => x.name === '龙鳞·选锋')?.value, 20);
  const tianzi = new BattleHero(config({ ...treasure, forge: 'tianzi', forgeValue: 10 }), 'blue', manager, 100);
  assert.ok(tianzi.Attrs.int > hero.Attrs.int);
  console.log('龙鳞战斗规则验证通过');
} finally { await vite.close(); }
