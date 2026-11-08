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
  const treasure = { id: 'dajiang', wengu: 5, qiangren: 5, forge: 'qiangren', forgeValue: 15 };
  const camp = new BattleHero(config(1001), 'blue', manager, 100);
  const guard = new BattleHero(config(1002, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1002), 'blue', manager, 100);
  const attacker = new BattleHero(config(1007), 'red', manager, 100);
  camp.Posname = '大营'; guard.Posname = '中军'; attacker.Posname = '大营';
  camp.Index = 1; guard.Index = 2; attacker.Index = 3;
  manager.BlueTeam.hero = [camp, guard]; manager.RedTeam.hero = [attacker];
  assert.equal(guard.Attrs.def, Math.round(plain.Attrs.def * 1.05 * 100) / 100);
  const info = { type: 1, rate: 100, isBasicAttack: true };
  getDamageAddition(attacker, guard, info, null);
  assert.equal(info.damageModifiers.entries.find(x => x.name === '大将·强韧')?.value, -10);
  assert.equal(info.damageModifiers.entries.find(x => x.name === '大将·锻造强韧')?.value, -15);
  assert.equal(attacker.resolveBasicAttackGuard(camp), guard);
  const originalLog = console.log; console.log = () => {};
  try {
    attacker.SkillsOrder = [];
    attacker.basicAttack(camp);
    assert.equal(camp.Arms, 10000, '大营没有承受普攻');
    assert.ok(guard.Arms < 10000, '援护者承受普攻');
    const beforeSplit = guard.Arms;
    attacker.performSplitAttack([camp]);
    assert.equal(guard.Arms, beforeSplit, '无分兵状态不结算');
    attacker.State.splitAttack = { rate: 100, skill: { id: 9001, type: 1 } };
    attacker.performSplitAttack([camp]);
    assert.ok(guard.Arms < beforeSplit, '分兵同样被援护');
  } finally { console.log = originalLog; }
  manager.Round = 3;
  assert.equal(attacker.resolveBasicAttackGuard(camp), camp);
  manager.Round = 1; guard.Arms = 0;
  assert.equal(attacker.resolveBasicAttackGuard(camp), camp);
  assert.ok(records.some(r => r.msg?.includes('大将·护主')));
  console.log('大将援护与减伤验证通过');
} finally { await vite.close(); }
