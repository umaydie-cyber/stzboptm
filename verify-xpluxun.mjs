import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const skill = __SKILLS__.find(item => item.name === '疲兵沮意');
  const allies = Array.from({ length: 3 }, () => ({ Storage: {} }));
  const source = {
    Id: 1042, BattleCamp: 'blue', Arms: 1000, Attrs: { int: 80 },
    Manger: { Round: 1, Record: { pushRecord() {} } },
    getTarget(_range, _count, type) { return type === 2 ? allies : []; },
    addHook(_event, _name, callback) { this.roundStart = callback; }
  };
  assert.equal(skill.callskill(source), true);
  source.roundStart();
  source.roundStart();
  for (const ally of allies) {
    assert.equal(ally.Storage.xpLuxunBirui.length, 4);
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
  console.log('XP陆逊避锐与燃烧行动时机校验通过');
} finally {
  await vite.close();
}
