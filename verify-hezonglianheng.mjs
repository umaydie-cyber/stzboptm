import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const skill = __SKILLS__.find(item => item.name === '合纵连横');
  assert.equal(skill.type, 1);
  assert.equal(skill.study, true);
  const makeHero = (name, camp) => ({
    Name: name, Camp: camp, BattleCamp: 'blue', Arms: 1000,
    Skills: { 1: { id: 1, type: 2, limit: 3 } }, Storage: {}, State: {},
    hooks: {}, addHook(event, _name, callback) { this.hooks[event] = callback; },
    getRealSkillRate(rate) { return rate; }, getDamageStateValue() { return 0; }
  });
  const owner = makeHero('施术者', 1);
  const ally = makeHero('友军', 2);
  const sameCampTarget = makeHero('同阵营敌军', 2);
  const otherCampTarget = makeHero('异阵营敌军', 3);
  const manager = { Round: 2, Over: false, BlueTeam: { hero: [owner, ally] },
    Record: { pushRecord() {}, pushActionRecord() {} } };
  for (const hero of [owner, ally, sameCampTarget, otherCampTarget]) hero.Manger = manager;
  skill.callskill(owner);
  assert.equal(ally.Skills[1].limit, 4);
  assert.equal(owner.Skills[1].limit, 4);
  const damage = { type: 1 };
  getDamageAddition(ally, otherCampTarget, damage);
  assert.equal(damage.damageModifiers.entries.find(entry => entry.name === skill.name).value, 10);
  const sameDamage = { type: 2 };
  getDamageAddition(ally, sameCampTarget, sameDamage);
  assert.equal(sameDamage.damageModifiers.entries.some(entry => entry.name === skill.name), false);
  const random = Math.random;
  try {
    Math.random = () => 0;
    ally.hooks['普通攻击后'](otherCampTarget);
  } finally { Math.random = random; }
  assert.equal(otherCampTarget.State.noRecoverUntil, 3);
  ally.hooks['普通攻击后'](sameCampTarget);
  assert.equal(sameCampTarget.State.noRecoverUntil, undefined);
  console.log('Verified range, faction damage, morale roll, and one-round siege');
} finally {
  await vite.close();
}
