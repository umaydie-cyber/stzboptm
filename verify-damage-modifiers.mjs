import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalLog = console.log;
try {
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
  const state = (name, value, hero) => ({ value, from: { name }, hero });
  const actor = name => ({ Name: name, State: {}, Storage: {}, Manger: { Round: 1 },
    getDamageStateValue(key) { return Object.values(this.State[key] || {}).reduce((sum, item) => sum + (item?.value || 0), 0); } });
  const attacker = actor('攻方');
  const target = actor('守方');
  attacker.State.attackDamageAdd = { command: state('大赏三军', 80, attacker), passive: state('另一增伤', 110, attacker) };
  let info = { type: 1, rate: 100 };
  assert.equal(getDamageAddition(attacker, target, info), 2.9);
  assert.equal(info.damageModifiers.total, 190);
  assert.deepEqual(info.damageModifiers.entries.map(x => x.name), ['大赏三军', '另一增伤']);
  target.State.beAttackDamageSub = { command: state('避其锋芒', 300, target) };
  info = { type: 1, rate: 100 };
  assert.equal(getDamageAddition(attacker, target, info), 0.1);
  assert.equal(info.damageModifiers.total, -90);
  assert.equal(info.damageModifiers.entries.at(-1).name, '增减伤下限');
  const hero = id => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [] });
  console.log = () => {};
  const battle = new BattleManger({ blue: { morale: 100, heros: [hero(1002)] },
    red: { morale: 100, heros: [hero(1004)] } });
  battle.Over = false;
  battle.Round = 1;
  const [source, victim] = [battle.BlueTeam.hero[0], battle.RedTeam.hero[0]];
  source.Arms = victim.Arms = 10000;
  const start = battle.Record.Records.length;
  victim.beHurtByNum(source, { type: 1, rate: 100 }, null, 100);
  const damageRecord = battle.Record.Records.slice(start).find(item => item.msg?.includes('损失'));
  assert(damageRecord?.damageModifiers);
  assert(Number.isFinite(damageRecord.damageModifiers.total));
  console.log = originalLog;
  console.log('战报增减伤来源、正负总值及-90%下限通过');
} finally {
  console.log = originalLog;
  await vite.close();
}
