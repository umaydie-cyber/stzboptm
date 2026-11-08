import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const hero = __HEROS__.find(h => h.name === '马岱');
  const skill = __SKILLS__.find(s => s.id === hero.skill);
  assert.equal(hero.star, 4);
  assert.equal(hero.limit, 3);
  const hooks = {};
  const self = { Arms: 1000, BattleCamp: 'blue', Attrs: { atk: 85, def: 88 }, Storage: {}, State: {},
    Name: '马岱', Manger: { Round: 1, BlueTeam: { hero: [] }, Record: { pushRecord() {} }, Over: false },
    addHook(event, name, callback) { (hooks[event] ||= []).push(callback); },
    getDamageStateValue() { return 0; } };
  self.Manger.BlueTeam.hero = [self];
  skill.callskill(self);
  for (let i = 0; i < 5; i++) hooks['普通攻击后'][0]();
  assert.equal(self.Storage.madaiAttackStacks, 5);
  assert.equal(self.Storage.madaiDefenseStacks, 5);
  const target = { Name: '目标', Storage: {}, State: {}, Manger: self.Manger, getDamageStateValue() { return 0; } };
  const attack = { type: 1, isBasicAttack: true };
  getDamageAddition(self, target, attack);
  assert.equal(attack.damageModifiers.entries.find(e => e.name === '奉令护蜀').value, 180);
  const incoming = { type: 2 };
  getDamageAddition(target, self, incoming);
  assert.equal(incoming.damageModifiers.entries.find(e => e.name === '奉令护蜀').value, -105);
  console.log('Verified Ma Dai configuration, five-layer cap, and attribute scaling');
} finally {
  await vite.close();
}
