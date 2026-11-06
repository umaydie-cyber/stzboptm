import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const records = [];
  const manager = {
    Round: 1, Over: false,
    addStat() {},
    Record: { pushRecord: (...v) => records.push(v), pushActionRecord: (...v) => records.push(v) },
    BlueTeam: { hero: [] }, RedTeam: { hero: [] }
  };
  const config = id => ({ id, level: 50, up: 0, extraAttrsAlloc: {}, equipskill: [] });
  const pang = new BattleHero(config(1020), 'blue', manager, 100);
  const target = new BattleHero(config(1018), 'red', manager, 100);
  manager.BlueTeam.hero.push(pang);
  manager.RedTeam.hero.push(target);
  assert.equal(pang.Name, '庞统');
  assert.equal(pang.Skills[1040].name, '密谋定蜀');
  pang.Attrs.int = 80;
  const skill = __SKILLS__.find(s => s.id === 1040);
  pang.getTarget = () => [target];
  skill.callskill(pang, 100);
  assert.ok(target.getState('attackDamageSub', 2) >= 30);
  assert.ok(target.getState('inteDamageSub', 2) >= 30);
  assert.ok(target.State.continuousDamage['恐慌']);
  assert.ok(target.State.continuousDamage['妖术']);
  assert.equal(target.State.continuousDamage['恐慌'].rate, 143);
  assert.equal(target.State.continuousDamage['妖术'].rate, 133);
  assert.equal(pang.getState('inteDamageAdd', 2), 5);
  skill.callskill(pang, 100);
  assert.equal(pang.getState('inteDamageAdd', 2), 10);
  const original = target.State.continuousDamage['恐慌'];
  target.applyContinuousDamage('恐慌', pang, skill, 1, 2);
  assert.equal(target.State.continuousDamage['恐慌'], original);
  manager.Round = 2;
  const before = target.Arms;
  const recordStart = records.length;
  target.triggerContinuousDamage();
  assert.ok(target.Arms < before);
  const panicRecords = records.slice(recordStart).filter(r => r[0] === target);
  assert.equal(panicRecords.length, 1);
  assert.match(panicRecords[0][1], /^受到【密谋定蜀】的恐慌效果，损失 \d+ 兵力\(\d+\)$/);
  const afterPanic = target.Arms;
  target.triggerPursuitCurses();
  assert.ok(target.Arms < afterPanic);
  assert.ok(records.some(r => r.some(v => String(v).includes('已有更强大的恐慌效果'))));
  console.log('Verified Pang Tong, damage reduction, stronger DOT priority and pursuit curse');
} finally {
  await vite.close();
}

