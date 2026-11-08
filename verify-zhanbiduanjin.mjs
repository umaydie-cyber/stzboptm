import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const skill = __SKILLS__.find(item => item.name === '战必断金');
  assert.equal(skill.type, 1);
  assert.equal(skill.limit, 4);
  assert.equal(skill.target, 2);
  const makeTarget = name => ({ Name: name, Arms: 1000,
    State: { attackLimit: { rounds: 0, from: {} } }, StateFlag: {},
    addHook(_event, _name, callback) { this.tick = callback; },
    isAttackLimit() { return this.State.attackLimit.rounds > 0; }
  });
  const targets = [makeTarget('甲'), makeTarget('乙')];
  const seenRates = [];
  const self = { Name: '施术者', Manger: { Round: 0,
    Record: { pushRecord() {}, pushActionRecord() {} } },
    getTarget(range, count) { assert.equal(range, 4); assert.equal(count, 2); return targets; },
    getRealSkillRate(rate) { seenRates.push(rate); return 100; }
  };
  skill.callskill(self);
  self.Manger.Round = 1;
  targets.forEach(target => target.tick());
  assert.deepEqual(seenRates, [90, 90]);
  assert(targets.every(target => target.State.attackLimit.rounds === 1));
  self.Manger.Round = 4;
  targets.forEach(target => target.tick());
  assert.deepEqual(seenRates, [90, 90]);
  console.log('Verified two targets, morale-adjusted rolls, and first-three-round limit');
} finally {
  await vite.close();
}
