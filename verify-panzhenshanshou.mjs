import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const skill = __SKILLS__.find(item => item.name === '磐阵善守');
  assert.equal(skill.type, 1);
  assert.equal(skill.limit, 2);
  const heroes = [9000, 8000, 7000].map((Arms, index) => ({
    Name: `友军${index}`, Arms, Storage: {}, State: {},
    getDamageStateValue() { return 0; }
  }));
  const manager = { Round: 0, Over: false, Record: { pushRecord() {} } };
  const self = { Name: '施术者', Manger: manager,
    getTarget(range, count, type) {
      assert.deepEqual([range, count, type], [2, 3, 2]);
      return heroes;
    },
    addHook(event, _name, callback) { assert.equal(event, '速度排序前'); this.tick = callback; }
  };
  skill.callskill(self);
  const originalRandom = Math.random;
  try {
    Math.random = () => 0;
    manager.Round = 1;
    self.tick();
    assert.equal(heroes[2].Storage.panzhenProtection.round, 1);
    assert.equal(heroes[0].Storage.panzhenEvasion.round, 1);
    heroes[1].Arms = 6000;
    manager.Round = 2;
    self.tick();
    assert.equal(heroes[1].Storage.panzhenProtection.round, 2);
    manager.Round = 5;
    self.tick();
    assert.equal(heroes[1].Storage.panzhenProtection.round, 2);
  } finally { Math.random = originalRandom; }
  const attacker = { Name: '敌军', Storage: {}, State: {}, Manger: { Round: 2 },
    getDamageStateValue() { return 0; } };
  heroes[1].Manger = attacker.Manger;
  const info = { type: 1, panzhenReduction: 90 };
  assert.equal(getDamageAddition(attacker, heroes[1], info), 0.1);
  console.log('Verified lowest-troop selection, random evasion, four-round limit, and 90% reduction');
} finally {
  await vite.close();
}
