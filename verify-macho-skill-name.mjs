import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const skill = __SKILLS__.find(item => item.id === 1003);
  assert.equal(skill.name, '血溅黄沙');
  const make = name => ({ Name: name, State: { attackDamageAdd: {}, activeLimit: {} }, Storage: {},
    getDamageStateValue(key) { return this.State[key]?.passive?.value || 0; } });
  const attacker = make('马超');
  const target = make('目标');
  attacker.Manger = { Round: -1, Record: { pushRecord() {} } };
  skill.callskill(attacker);
  const info = { type: 1 };
  getDamageAddition(attacker, target, info, null);
  assert.deepEqual(info.damageModifiers.entries.find(entry => entry.value === 120),
    { name: '血溅黄沙', hero: '马超', value: 120 });
  console.log('Verified 马超 120% attack bonus is labeled 血溅黄沙');
} finally {
  await vite.close();
}
