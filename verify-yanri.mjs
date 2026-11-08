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
  const treasure = { id: 'yanri', wengu: 5, kangli: 5, forge: 'shulv', forgeValue: 12 };
  const owner = new BattleHero(config(1001, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1001), 'blue', manager, 100);
  const target = new BattleHero(config(1002), 'red', manager, 100);
  manager.BlueTeam.hero = [owner]; manager.RedTeam.hero = [target];
  assert.equal(owner.Attrs.def, plain.Attrs.def + 7.5);
  const main = { id: 9001, name: '测试主战法', type: 2, ready: true };
  owner.Skill = main.id;
  assert.equal(owner.getTreasureMainRateBonus(main), 12);
  const damage = { type: 1, rate: 100 };
  getDamageAddition(owner, target, damage, main);
  assert.equal(damage.damageModifiers.entries.find(entry => entry.name === '掩日·亢厉')?.value, 5);
  const carried = { ...main, id: 9002 };
  const carriedDamage = { type: 1, rate: 100 };
  getDamageAddition(owner, target, carriedDamage, carried);
  assert.equal(carriedDamage.damageModifiers.entries.find(entry => entry.name === '掩日·亢厉'), undefined);
  let activations = 0;
  owner.addReadySkill(main, 1, () => activations++);
  assert.equal(owner.IN_READY_SKILL.length, 1, '首次仍需准备');
  owner.subReadySkillRound(main);
  assert.equal(activations, 1);
  owner.IN_READY_SKILL = [];
  owner.addReadySkill(main, 1, () => activations++);
  assert.equal(activations, 2, '第二次跳过一个准备回合');
  assert.equal(owner.IN_READY_SKILL.length, 0);
  owner.addReadySkill(main, 1, () => activations++);
  assert.equal(owner.IN_READY_SKILL.length, 1, '第三次恢复正常准备');
  assert.ok(records.some(record => record.msg?.includes('掩日·谋断')));
  console.log('掩日谋断与词条验证通过');
} finally { await vite.close(); }
