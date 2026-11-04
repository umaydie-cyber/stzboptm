import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalRandom = Math.random;
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const skill = __SKILLS__.find(s => s.id === 1044);
  const manager = { Round: 0, Over: false, Record: {pushRecord() {}, pushActionRecord() {}}, BlueTeam: {hero: []}, RedTeam: {hero: []} };
  const make = camp => new BattleHero({id:1001, level:50, up:0, extraAttrsAlloc:{}, equipskill:[]}, camp, manager, 100);
  const source = make('blue');
  const targets = Array.from({length:3}, () => make('red'));
  source.Attrs.spd = 240;
  source.getTarget = (range, count) => { assert.equal(range, 5); assert.equal(count, 2); return targets.slice(0, 2); };
  skill.callskill(source);
  source.Attrs.spd = 80; // 指挥阶段确定单层数值。
  const [target, second, untouched] = targets;
  assert.equal(target.getDamageStateValue('beAttackDamageAdd'), 0);
  manager.Round = 1;
  Math.random = () => 0;
  const before = target.Arms;
  target.beHurt(source, {type:1,rate:100});
  const first = before - target.Arms;
  assert.equal(target.getDamageStateValue('beAttackDamageAdd'), 12);
  const nextBefore = target.Arms;
  source.Arms = 10000;
  target.beHurt(source, {type:1,rate:100});
  assert.ok(nextBefore - target.Arms > first, '增伤从下一次伤害开始生效');
  target.beHurt(source, {type:2,rate:1}, null, 1);
  assert.equal(target.getDamageStateValue('beAttackDamageAdd'), 24);
  target.beHurt(source, {type:1,rate:1,isSplitAttack:true,isBasicAttack:true}, skill, 1);
  target.beHurt(source, {type:1,rate:1}, {type:2,id:999}, 1);
  target.beHurt(source, {type:1,rate:1}, {type:3,id:998}, 1);
  target.beHurt(source, {type:1,rate:1}, null, 1);
  assert.equal(target.getDamageStateValue('beAttackDamageAdd'), 60);
  assert.equal(target.getDamageStateValue('beInteDamageAdd'), 60);
  assert.equal(second.getDamageStateValue('beAttackDamageAdd'), 0);
  assert.equal(Object.keys(untouched.HOOKS.ON_HURT).length, 0);
  manager.Round = 8;
  target.clearStateRounds();
  assert.equal(target.getDamageStateValue('beAttackDamageAdd'), 60);
  const lowSpeedTarget = make('red');
  source.getTarget = () => [lowSpeedTarget];
  skill.callskill(source);
  lowSpeedTarget.beHurt(source, {type:1,rate:1}, null, 1);
  assert.equal(lowSpeedTarget.getDamageStateValue('beAttackDamageAdd'), 5);
  console.log('Verified speed snapshot, damage-after-hit stacking, physical/split/pursuit triggers, 5-layer cap and permanent duration');
} finally { Math.random = originalRandom; await vite.close(); }

