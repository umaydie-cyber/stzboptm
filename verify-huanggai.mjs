import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalLog = console.log;
const originalRandom = Math.random;
try {
  const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
  const hero = id => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [] });
  console.log = () => {};
  Math.random = () => 0;
  const battle = new BattleManger({
    blue: { morale: 100, heros: [hero(1027)] },
    red: { morale: 100, heros: [hero(1002), hero(1004)] }
  });
  const source = battle.BlueTeam.hero[0];
  const [neighbor, target] = battle.RedTeam.hero;
  const skill = source.Skills[1071];
  assert.equal(source.Name, '黄盖');
  assert.equal(skill.type, 3);
  assert.equal(skill.rate, 120);
  battle.Over = false;
  battle.Round = 1;
  for (const unit of [source, target, neighbor]) {
    unit.Arms = 10000;
    unit.Morale = 100;
    unit.State.continuousDamage = {};
  }
  source.Attrs.int = 80;
  skill.callskill(source, target);
  const first = target.State.continuousDamage['烈火焚舟燃烧'];
  assert.equal(first.rate, 150);
  assert.equal(first.expiresRound, 3);
  skill.callskill(source, target);
  assert.equal(target.State.continuousDamage['烈火焚舟燃烧'], undefined);
  assert.equal(target.State.continuousDamage['烈火焚舟焚烧'].rate, 270);
  assert.equal(target.Arms, 10000 - 2 * first.damage, '立即引发两次剩余燃烧');
  assert.equal(target.Morale, 90);
  assert.equal(neighbor.Morale, 90, '相邻敌军士气降低');
  assert.equal(source.Morale, 100, '友军士气不受影响');
  source.Attrs.int = 170;
  target.State.continuousDamage = {};
  skill.callskill(source, target);
  assert.equal(target.State.continuousDamage['烈火焚舟燃烧'].rate, 300);
  skill.callskill(source, target);
  assert.equal(target.State.continuousDamage['烈火焚舟焚烧'].rate, 473);
  console.log = originalLog;
  console.log('黄盖两段成长、剩余燃烧立即结算与相邻士气效果通过');
} finally {
  console.log = originalLog;
  Math.random = originalRandom;
  await vite.close();
}
