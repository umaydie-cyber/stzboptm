import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const { getDamageAddition, clacAttackDamage } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const skill = __SKILLS__.find(item => item.name === '击势');
  assert.equal(skill.level, 'S');
  const hero = {
    Name: '测试武将', Arms: 1000, Attrs: { atk: 200 }, Storage: {}, BisicArm: 1,
    getRealSkillRate(rate) { return rate; },
    getDamageStateValue() { return 0; },
    addHook(_event, _name, callback) { this.action = callback; },
    Manger: { Round: -1, Record: { pushRecord() {} } }
  };
  const target = { Name: '目标', Attrs: { def: 200 }, BisicArm: 1, Storage: {}, getDamageStateValue() { return 0; } };
  target.Manger = hero.Manger;
  skill.callskill(hero);
  let damageOnly = false;
  let defenseOnly = false;
  for (let round = 1; round <= 100 && !(damageOnly && defenseOnly); round++) {
    hero.Manger.Round = round;
    hero.action();
    const damage = hero.Storage.jishiDamageRound === round;
    const defense = hero.Storage.jishiIgnoreDefenseRound === round;
    damageOnly ||= damage && !defense;
    defenseOnly ||= defense && !damage;
  }
  assert.ok(damageOnly && defenseOnly, '两项效果应分别判定');
  hero.Manger.Round = 101;
  hero.Storage.jishiDamageRound = 101;
  const boosted = { type: 1 };
  getDamageAddition(hero, target, boosted);
  assert.equal(boosted.damageModifiers.entries.find(e => e.name === '击势').value, 50);
  hero.Manger.Round = 102;
  const expired = { type: 1 };
  getDamageAddition(hero, target, expired);
  assert.equal(expired.damageModifiers.entries.some(e => e.name === '击势'), false);
  hero.Storage.jishiIgnoreDefenseRound = 102;
  const withIgnore = clacAttackDamage(hero, target, { type: 1, rate: 100 }, null);
  hero.Storage.jishiIgnoreDefenseRound = undefined;
  const withoutIgnore = clacAttackDamage(hero, target, { type: 1, rate: 100 }, null);
  assert.ok(withIgnore > withoutIgnore);
  console.log('Verified 击势独立判定、单回合增伤和无视防御');
} finally {
  await vite.close();
}
