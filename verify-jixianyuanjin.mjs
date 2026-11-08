import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const skill = __SKILLS__.find(item => item.name === '计险远近');
  assert.equal(skill.type, 1);
  const manager = { Round: 0, Record: { pushRecord() {} } };
  const makeHero = (name, position, limit) => ({
    Name: name, Posname: position, BasicLimit: limit, BattleCamp: 'blue', Arms: 1000,
    Attrs: { atk: 80, def: 80, int: 80 }, Storage: {}, State: {}, Manger: manager,
    hooks: {}, addHook(event, _name, callback) { this.hooks[event] = callback; },
    getDamageStateValue() { return 0; }
  });
  const allies = [makeHero('后', '大营', 1), makeHero('中', '中军', 2), makeHero('前', '前锋', 3)];
  manager.BlueTeam = { hero: allies };
  skill.callskill(allies[0]);
  assert.equal(allies[0].Storage.jixianIgnoreEvasion, true);
  assert.deepEqual(allies[1].Attrs, { atk: 100, def: 100, int: 100 });
  manager.Round = 1;
  allies[2].hooks['速度排序前']();
  assert.deepEqual(allies[2].Storage.jixianFront, { round: 1, used: false });
  const enemy = makeHero('敌', '大营', 1);
  enemy.BattleCamp = 'red';
  allies[0].hooks['普通攻击后'](enemy);
  allies[1].hooks['普通攻击后'](enemy);
  assert.equal(enemy.Storage.jixianVulnerability.stacks, 2);
  const info = { type: 1, jixianReduction: 50 };
  getDamageAddition(enemy, allies[2], info);
  assert.equal(info.damageModifiers.entries.find(entry => entry.name === '计险远近·前锋减伤').value, -50);
  const boosted = { type: 2 };
  getDamageAddition(allies[0], enemy, boosted);
  assert.equal(boosted.damageModifiers.entries.find(entry => entry.name === '计险远近·受伤提高').value, 30);
  const invalid = [makeHero('后', '大营', 1), makeHero('中', '中军', 1), makeHero('前', '前锋', 3)];
  manager.BlueTeam.hero = invalid;
  skill.callskill(invalid[0]);
  assert.equal(invalid[0].Storage.jixianIgnoreEvasion, undefined);
  console.log('Verified distance condition, position effects, and same-round stacking');
} finally {
  await vite.close();
}
