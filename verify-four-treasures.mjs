import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const records = [];
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} }, SortSpdHeros: [],
    Record: { Records: records, pushRecord(_, msg) { records.push({ msg }); }, pushActionRecord(_, __, ___, msg) { records.push({ msg }); } },
    addStat() {}, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (id, treasure) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const hero = (treasure, camp = 'blue') => new BattleHero(config(camp === 'blue' ? 1001 : 1002, treasure), camp, manager, 100);
  const plain = hero(null); const enemy = hero(null, 'red');
  const entries = (attacker, target, type, skill, kind) => {
    const info = { type, rate: 100, kind };
    getDamageAddition(attacker, target, info, skill);
    return Object.fromEntries(info.damageModifiers.entries.map(e => [e.name, e.value]));
  };
  const bolang = hero({ id: 'bolang', anzhen: 5, jianren: 7, forge: 'jianren', forgeValue: 12 });
  bolang.State.confusion.rounds = 1;
  let e = entries(enemy, bolang, 1, { type: 2 });
  assert.equal(e['博浪·安贞'], -5); assert.equal(e['博浪·坚忍'], -14); assert.equal(e['博浪·锻造坚忍'], -12);
  bolang.HurtArms = 1000; bolang.Arms = 9000;
  bolang.revocer(100, enemy, '测试恢复');
  assert.equal(bolang.Arms, 9125);
  assert(records.some(r => r.msg.includes('博浪·抖擞+25%')));
  const chengying = hero({ id: 'chengying', xiaorui: 3, tianzi: 4, forge: 'chousuan', forgeValue: 15 });
  assert.equal(chengying.Attrs.atk, plain.Attrs.atk + 7.5);
  assert.equal(chengying.Attrs.int, plain.Attrs.int + 10);
  e = entries(chengying, enemy, 2, { type: 2 }); assert.equal(e['承影·机先'], 20);
  chengying.Storage.chengyingStrategyHits = 0;
  const originalLog = console.log; console.log = () => {};
  try {
    for (let i = 0; i < 3; i++) {
      const info = { type: 2, rate: 100 };
      enemy.beHurt(chengying, info, { type: 2, name: '测试策略伤害' }, null, () => {});
    }
  } finally { console.log = originalLog; }
  assert.equal(chengying.Storage.chengyingStrategyHits, 2);
  chengying.Storage.chengyingStrategyHits = 2;
  e = entries(chengying, enemy, 2, { type: 2 }); assert.equal(e['承影·机先'], undefined);
  const jingyang = hero({ id: 'jingyangwanren', wengu: 4, kangli: 3, forge: 'quhuo', forgeValue: 20 });
  assert.equal(jingyang.Attrs.def, plain.Attrs.def + 12);
  e = entries(jingyang, enemy, 4, { type: 2, name: '火攻' }, '燃烧');
  assert.equal(e['旌阳万仞·亢厉'], 3); assert.equal(e['旌阳万仞·睥睨'], 10); assert.equal(e['旌阳万仞·驱火'], 20);
  const xuanyi = hero({ id: 'xuanyi', wengu: 2, xiaorui: 3, forge: 'kangli', forgeValue: 15 });
  assert.equal(xuanyi.Attrs.def, Math.round(plain.Attrs.def * 1.03 * 100) / 100);
  assert.equal(xuanyi.Attrs.atk, Math.round(plain.Attrs.atk * 1.03 * 100) / 100);
  e = entries(xuanyi, enemy, 1, { type: 2, id: xuanyi.Skill });
  assert.equal(e['悬翳·亢厉'], 10); assert.equal(e['悬翳·锻造亢厉'], 15);
  console.log('四件宝物属性、伤害及恢复验证通过');
} finally { await vite.close(); }
