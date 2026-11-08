import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const records = [];
  const manager = { Round: 4, Over: false, Stats: { blue: {}, red: {} }, SortSpdHeros: [],
    Record: { Records: records, pushRecord(_, msg) { records.push({ msg }); },
      pushActionRecord(_, __, ___, msg) { records.push({ msg }); } },
    addStat() {}, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (id, treasure) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const treasure = { id: 'shaofu', xiaorui: 5, xianzhen: 5, forge: 'xianzhen', forgeValue: 20 };
  const owner = new BattleHero(config(1001, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1001), 'blue', manager, 100);
  const target = new BattleHero(config(1002), 'red', manager, 100);
  manager.BlueTeam.hero = [owner]; manager.RedTeam.hero = [target];
  assert.equal(owner.Attrs.atk, plain.Attrs.atk + 10);
  const modifiers = info => { getDamageAddition(owner, target, info, null); return info.damageModifiers.entries; };
  let entries = modifiers({ type: 1, rate: 100, isBasicAttack: true, isSplitAttack: true });
  assert.equal(entries.find(item => item.name === '少府·陷阵')?.value, 10);
  assert.equal(entries.find(item => item.name === '少府·锻造陷阵')?.value, 20);
  manager.Round = 5;
  entries = modifiers({ type: 1, rate: 100, isBasicAttack: true });
  assert.equal(entries.find(item => item.name === '少府·陷阵'), undefined);
  assert.equal(entries.find(item => item.name === '少府·锻造陷阵')?.value, 20);
  owner.getRealSkillRate = () => 100;
  owner.applyTreasureRoundStart();
  assert.equal(owner.State.doubleAttack.rounds, 1);
  assert.ok(records.some(record => record.msg?.includes('少府·再战') && record.msg.includes('成功')));
  manager.Round = 6;
  owner.State.doubleAttack.rounds = 0;
  owner.applyTreasureRoundStart();
  assert.equal(owner.State.doubleAttack.rounds, 0, '第6回合不再判定');
  console.log('少府词条及再战验证通过');
} finally { await vite.close(); }
