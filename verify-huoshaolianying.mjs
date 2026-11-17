import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const skill = __SKILLS__.find(item => item.name === '火烧连营');
  const targets = Array.from({ length: 3 }, () => ({
    Arms: 1000, Storage: {}, hits: [], State: {},
    applyNoRecoverUntil(until) { this.noRecoverUntil = until; return true; },
    beHurt(_source, info) { this.hits.push(info); },
    applyContinuousDamage(kind, _source, _skill, rate, rounds) { this.curse = { kind, rate, rounds }; }
  }));
  let next = 0;
  const source = {
    Id: 1013, Attrs: { int: 80 }, Manger: { Round: 2, Over: false, Record: { pushRecord() {} } },
    getTarget(_range, count) { return count === 3 ? targets : [targets[next++ % 3]]; },
    addReadySkill(_skill, _round, callback) { callback(); return true; }
  };
  assert.equal(skill.callskill(source, 100), true);
  for (const target of targets) {
    assert.equal(target.noRecoverUntil, 4);
    assert.equal(target.hits.length, 1);
    assert.equal(target.hits[0].rate, 50);
    assert.equal(target.Storage.huoshaoLianyingBonus, 5);
    assert.deepEqual(target.curse, { kind: '恐慌', rate: 120, rounds: 1 });
  }
  source.Id = 9999;
  source.Attrs.int = 180;
  next = 0;
  skill.callskill(source, 100);
  for (const target of targets) {
    assert.equal(target.hits.at(-1).rate, 100);
    assert.equal(target.Storage.huoshaoLianyingBonus, 15);
    assert.deepEqual(target.curse, { kind: '燃烧', rate: 240, rounds: 1 });
  }
  console.log('火烧连营目标、倍率与陆逊恐慌校验通过');
} finally {
  await vite.close();
}
