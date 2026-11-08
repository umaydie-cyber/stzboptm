import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const hero = __HEROS__.find(h => h.name === '张绣');
  const skill = __SKILLS__.find(s => s.id === hero.skill);
  assert.equal(hero.star, 4);
  assert.equal(hero.limit, 1);
  assert.equal(skill.rate, 120);
  assert.equal(skill.type, 3);

  const hits = [];
  const targets = [0, 1, 2].map(i => ({ Arms: 1000, beHurt(_self, damage, source) {
    hits.push({ i, damage, source });
  } }));
  let selections = 0;
  const self = {
    Arms: 1000, Limit: 1,
    Manger: { Round: 1, Over: false, Record: { pushRecord() {} } },
    getTarget() { return [targets[selections++ % targets.length]]; }
  };
  skill.callskill(self, targets[0]);
  assert.deepEqual(hits.map(hit => hit.i), [0]);
  assert.equal(selections, 0);
  hits.length = 0;
  self.Manger.Round = 4;
  const originalRandom = Math.random;
  try {
    Math.random = () => 0.99; // 1–3 inclusive: choose 3 attacks.
    skill.callskill(self, targets[0]);
  } finally {
    Math.random = originalRandom;
  }
  assert.deepEqual(hits.map(hit => hit.i), [0, 1, 2]);
  assert(hits.every(hit => hit.damage.type === 1 && hit.damage.rate === 150 && hit.source === skill));
  console.log('Verified Zhang Xiu and both Xuanwei Zaizhan round branches');
} finally {
  await vite.close();
}
