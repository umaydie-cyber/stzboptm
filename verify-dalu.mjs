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
  const treasure = { id: 'dalu', qiangren: 4, jianren: 6, forge: 'genzhi', forgeValue: 20 };
  const owner = new BattleHero(config(1007, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1007), 'blue', manager, 100);
  const enemy = new BattleHero(config(1002), 'red', manager, 100);
  manager.BlueTeam.hero = [owner]; manager.RedTeam.hero = [enemy];
  owner.Index = 1; enemy.Index = 2;
  assert.equal(owner.Attrs.int, plain.Attrs.int + 20, '艮止增加平面谋略');
  const mods = (info, skill) => { getDamageAddition(enemy, owner, info, skill); return info.damageModifiers.entries; };
  assert.equal(mods({ type: 1, rate: 100, isBasicAttack: true }).find(x => x.name === '大橹·强韧')?.value, -4);
  assert.equal(mods({ type: 1, rate: 100, isBasicAttack: true, isSplitAttack: true }).find(x => x.name === '大橹·强韧')?.value, -4);
  assert.equal(mods({ type: 1, rate: 100 }, { type: 3 }).find(x => x.name === '大橹·强韧'), undefined);
  assert.equal(mods({ type: 2, rate: 100 }, { type: 2 }).find(x => x.name === '大橹·坚忍')?.value, -6);
  assert.equal(mods({ type: 1, rate: 100 }, { type: 3 }).find(x => x.name === '大橹·坚忍'), undefined);

  const originalLog = console.log; console.log = () => {};
  try {
    const beforeAttack = enemy.Arms;
    owner.callAttack();
    assert.equal(enemy.Arms, beforeAttack, '艮止禁止普攻');
    owner.clearAllHarmfulEffects({ name: '测试净化' });
    owner.callAttack();
    assert.equal(enemy.Arms, beforeAttack, '清除状态后仍禁止普攻');
    owner.Storage.evadeNextDamage = true;
    owner.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 200);
    assert.equal(owner.Storage.daluFirstDamageTaken, undefined, '先被规避的伤害不触发避险');
    owner.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 200);
    assert.equal(owner.Storage.daluFirstDamageTaken, true);
    assert.equal(owner.Storage.daluEvadeNextDamage, true);
    const afterFirst = owner.Arms;
    owner.beHurtByNum(enemy, { type: 1, rate: 100, ignoreEvasion: true }, null, 200);
    assert.equal(owner.Storage.daluEvadeNextDamage, true, '不可规避伤害不消耗次数');
    const afterBypass = owner.Arms;
    assert.ok(afterBypass < afterFirst);
    owner.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 200);
    assert.equal(owner.Arms, afterBypass, '避险免疫下一次伤害');
    assert.equal(owner.Storage.daluEvadeNextDamage, false);
    owner.beHurtByNum(enemy, { type: 1, rate: 100 }, null, 200);
    assert.ok(owner.Arms < afterBypass, '避险只生效一次');
  } finally { console.log = originalLog; }
  assert.ok(records.some(r => r.msg?.includes('大橹·避险')));
  const forged = new BattleHero(config(1007, { ...treasure, forge: 'wengu', forgeValue: 15 }), 'blue', manager, 100);
  assert.equal(forged.Attrs.def, Math.round(plain.Attrs.def * 1.15 * 100) / 100);
  console.log('大橹战斗规则验证通过');
} finally { await vite.close(); }
