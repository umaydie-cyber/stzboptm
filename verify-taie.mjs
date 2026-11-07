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
  const treasure = { id: 'taie', xiaorui: 5, mingjing: 5, forge: 'qiangren', forgeValue: 15 };
  const low = new BattleHero(config(1001, treasure), 'blue', manager, 100);
  const lowPlain = new BattleHero(config(1001), 'blue', manager, 100);
  const high = new BattleHero(config(1002, treasure), 'blue', manager, 100);
  const highPlain = new BattleHero(config(1002), 'blue', manager, 100);
  const enemy = new BattleHero(config(1007), 'red', manager, 100);
  manager.BlueTeam.hero = [low, high]; manager.RedTeam.hero = [enemy];
  low.Index = 1; high.Index = 2; enemy.Index = 3;
  assert.equal(low.Cost, 25);
  assert.equal(high.Cost, 30);
  assert.equal(low.Attrs.atk, lowPlain.Attrs.atk + 10);
  assert.equal(low.Attrs.int, lowPlain.Attrs.int + 10);
  assert.equal(low.Attrs.def, lowPlain.Attrs.def + 7.5);
  assert.equal(high.Attrs.def, highPlain.Attrs.def, '初始统率 3 不获得明镜防御');
  const mods = (owner, info, skill) => { getDamageAddition(enemy, owner, info, skill); return info.damageModifiers.entries; };
  assert.equal(mods(low, { type: 1, rate: 100, isBasicAttack: true }).find(x => x.name === '泰阿·强韧')?.value, -15);
  assert.equal(mods(low, { type: 1, rate: 100, isBasicAttack: true, isSplitAttack: true }).find(x => x.name === '泰阿·强韧')?.value, -15);
  assert.equal(mods(low, { type: 1, rate: 100 }, { type: 3 }).find(x => x.name === '泰阿·强韧'), undefined);
  low.Treasure.forge = 'chenwen';
  assert.equal(mods(low, { type: 2, rate: 100 }, { type: 1 }).find(x => x.name === '泰阿·沉稳')?.value, -15);
  assert.equal(mods(low, { type: 2, rate: 100 }, { type: 2 }).find(x => x.name === '泰阿·沉稳'), undefined);
  low.Treasure.forge = 'jianren';
  assert.equal(mods(low, { type: 2, rate: 100 }, { type: 2 }).find(x => x.name === '泰阿·坚忍')?.value, -15);

  const originalLog = console.log; console.log = () => {};
  try {
    low.Treasure.forge = 'qiangren';
    low.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 0);
    assert.equal(low.Storage.taieFirstDamageRound, undefined, '零伤害不消耗强固');
    low.Storage.evadeNextDamage = true;
    low.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 1000);
    assert.equal(low.Storage.taieFirstDamageRound, undefined, '规避不消耗强固');
    low.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 1000);
    assert.equal(low.Storage.taieFirstDamageRound, 1);
    assert.ok(records.some(r => r.damageModifiers?.entries?.some(x => x.name === '泰阿·强固' && x.value === -20)));
    const afterFirst = low.Arms;
    low.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 1000);
    assert.equal(afterFirst - low.Arms, 1000, '同回合第二次受伤不减伤');
    const afterSecond = low.Arms;
    manager.Round = 2;
    low.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 1000);
    assert.ok(afterSecond - low.Arms < 1000, '下回合首次受伤再次减伤');
    assert.equal(low.Storage.taieFirstDamageRound, 2);
  } finally { console.log = originalLog; }
  const fortified = new BattleHero(config(1001, { ...treasure, forge: 'wengu', forgeValue: 20 }), 'blue', manager, 100);
  assert.equal(fortified.Attrs.def, Math.round((lowPlain.Attrs.def + 7.5) * 1.2 * 100) / 100);
  console.log('泰阿战斗规则验证通过');
} finally { await vite.close(); }
