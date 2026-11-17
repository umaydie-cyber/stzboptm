import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const skill = __SKILLS__.find(item => item.name === '疲兵沮意');
  const allies = Array.from({ length: 3 }, () => ({ Storage: {} }));
  let selections = 0;
  const source = {
    Id: 1042, BattleCamp: 'blue', Arms: 1000, Attrs: { int: 80 },
    Manger: { Round: 1, Record: { pushRecord() {} } },
    getTarget(_range, count, type) {
      assert.equal(count, 2);
      return type === 2 ? (selections++ === 0 ? allies.slice(0, 2) : allies.slice(1)) : [];
    },
    addHook(_event, _name, callback) { this.roundStart = callback; }
  };
  assert.equal(skill.callskill(source), true);
  source.roundStart();
  source.roundStart();
  assert.deepEqual(allies.map(ally => ally.Storage.xpLuxunBirui.length), [2, 4, 2]);
  for (const ally of allies) {
    assert.equal(ally.Storage.xpLuxunBirui[0].reduction, 10);
  }

  const target = {
    Arms: 1000, Storage: {}, Manger: { Round: 2, Record: { pushRecord() {} } },
    State: { continuousDamage: {
      '疲兵沮意燃烧': { source, skill, rate: 150, kind: '疲兵沮意燃烧',
        onPursuit: false, appliedRound: 1, expiresRound: 2 }
    } },
    beHurtByNum(_source, info) { this.attemptedRate = info.rate; /* 规避，不扣兵力 */ }
  };
  BattleHero.prototype.triggerContinuousDamage.call(target);
  assert.equal(target.attemptedRate, undefined);
  BattleHero.prototype.triggerContinuousDamage.call(target, false, true);
  assert.equal(target.attemptedRate, 150);
  assert.equal(target.Arms, 1000);
  assert.equal(target.Storage.xpLuxunBurnBonus[source.Id], 80);
  assert.equal(target.State.continuousDamage['疲兵沮意燃烧'], undefined);

  // Exercise the real damage path: a successful 避锐 must calculate and apply 燃烧.
  const records = [];
  const manager = { Round: 1, Over: false, Record: {
    Records: records, pushRecord() { records.push({}); }, pushActionRecord() { records.push({}); }
  }, addStat() {} };
  const config = id => ({ id, level: 1, up: 0, arms: 10000,
    equipskill: [0, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } });
  const owner = new BattleHero(config(1042), 'blue', manager, 100);
  const defender = new BattleHero(config(1009), 'blue', manager, 100);
  const foe = new BattleHero(config(1013), 'red', manager, 100);
  manager.BlueTeam = { hero: [owner, defender] };
  manager.RedTeam = { hero: [foe] };
  owner.Index = 1; defender.Index = 2; foe.Index = 3;
  defender.Storage.xpLuxunBirui = [{ source: owner, skill, reduction: 10 }];
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    defender.beHurt(foe, { type: 2, rate: 100 }, null, 100);
  } finally { Math.random = originalRandom; }
  assert.equal(defender.Storage.xpLuxunBirui.length, 0);
  assert.ok(foe.State.continuousDamage['疲兵沮意燃烧']);
  console.log('XP陆逊避锐与燃烧行动时机校验通过');
} finally {
  await vite.close();
}
