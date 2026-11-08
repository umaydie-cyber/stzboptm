import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const skill = __SKILLS__.find(item => item.id === 1039);
  assert.ok(skill);
  const lowRate = BattleHero.prototype.getRealSkillRate.call({ Morale: 70 }, 60);
  const highRate = BattleHero.prototype.getRealSkillRate.call({ Morale: 130 }, 60);
  assert.ok(lowRate < 60 && highRate > 60);
  const records = [];
  const judged = [];
  const self = {
    Manger: { Record: { pushRecord(_, message) { records.push(message); } } },
    getRealSkillRate(base) { judged.push(base); return 100; }
  };
  const target = { Arms: 10000, beHurt() {} };
  skill.callskill(self, target);
  assert.deepEqual(judged, [60, 40, 20], '每次追加判定均调用士气修正');
  assert.ok(records.some(message => message.includes('基础60%，士气修正+40%，实际100%：成功')));
  assert.ok(records.some(message => message.includes('基础40%，士气修正+60%，实际100%：成功')));
  console.log('乘胜追击士气判定及战报验证通过');
} finally { await vite.close(); }
