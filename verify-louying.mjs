import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const messages = [];
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} },
    Record: { Records: messages, pushRecord(_, msg) { messages.push({ msg }); },
      pushActionRecord(_, __, ___, msg) { messages.push({ msg }); } },
    addStat() {}, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (id, treasure = null) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const weapon = { id: 'louying', jianren: 3, yingcai: 4, forge: 'jianren', forgeValue: 15 };
  const hero = new BattleHero(config(1002, weapon), 'blue', manager, 100);
  const plain = new BattleHero(config(1002), 'blue', manager, 100);
  const enemy = new BattleHero(config(1001), 'red', manager, 100);
  hero.Index = 1; enemy.Index = 4;
  manager.BlueTeam.hero = [hero]; manager.RedTeam.hero = [enemy];
  assert.equal(hero.Attrs.atk - plain.Attrs.atk, 4);
  assert.equal(hero.Attrs.int - plain.Attrs.int, 4);
  const damageEntries = (attacker, target, type, skill) => {
    const info = { type, rate: 100 };
    getDamageAddition(attacker, target, info, skill);
    return info.damageModifiers.entries;
  };
  const active = damageEntries(enemy, hero, 1, { id: 1, type: 2 });
  assert.equal(active.find(entry => entry.name === '镂影·坚忍')?.value, -3);
  assert.equal(active.find(entry => entry.name === '镂影·锻造坚忍')?.value, -15);
  assert.equal(damageEntries(enemy, hero, 1, { id: 2, type: 3 }).find(entry => entry.name === '镂影·坚忍'), undefined);

  const originalLog = console.log;
  console.log = () => {};
  try {
    for (let i = 0; i < 4; i++) enemy.beHurt(hero, { type: 1, rate: 100 }, null, 100);
    assert.equal(hero.Storage.louyingAttackHits, 4);
    assert.equal(hero.Storage.louyingPending, 1);
    const before = enemy.Arms;
    hero.applyTreasureBeforeAction();
    assert.equal(hero.Storage.louyingPending, 0);
    assert.ok(enemy.Arms < before, '穿影应在下次行动前造成攻击伤害');
    assert.equal(hero.Storage.louyingAttackHits, 5, '穿影伤害本身也计入攻击次数');
    hero.registerLouyingDamage(hero, { type: 1 }, 100);
    assert.equal(hero.Storage.louyingAttackHits, 5, '对友军造成的伤害不计入穿影');

    hero.Treasure = { ...weapon, forge: 'shanzhan', forgeValue: 3 };
    for (let i = 0; i < 5; i++) hero.registerLouyingDamage(enemy, { type: 2 }, 100);
    assert.equal(hero.Storage.louyingShanzhanStacks, 3);
    assert.equal(damageEntries(hero, enemy, 2, { id: 3, type: 2 }).find(entry => entry.name === '镂影·善战')?.value, 6);
    hero.Treasure = { ...weapon, forge: 'buxie', forgeValue: 7 };
    hero.Arms = 7000; hero.HurtArms = 5000;
    hero.Storage.recoveryBonuses = { other: { name: '其他恢复效果', value: 5 } };
    hero.revocer(1000, enemy, '测试恢复');
    assert.equal(hero.Arms, 8190, '损失3000兵力时不懈2层，与其他恢复效果相加19%');
    assert.ok(messages.some(entry => entry.msg?.includes('镂影·不懈（2层）+14%') && entry.msg.includes('其他恢复效果+5%')));

    hero.Treasure = { ...weapon, forge: 'qingyi', forgeValue: 7 };
    manager.Round = 5;
    hero.State.confusion = { rounds: 1 };
    assert.equal(hero.State.confusion.rounds, 0);
    manager.Round = 8;
    hero.State.confusion = { rounds: 1 };
    assert.equal(hero.State.confusion.rounds, 1);
  } finally { console.log = originalLog; }
  const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
  console.log = () => {};
  try {
    for (const [forge, forgeValue] of [['xiaorui', 10], ['jianren', 15], ['tianzi', 10],
      ['buxie', 7], ['qingyi', 6], ['shanzhan', 5]]) {
      new BattleManger({ blue: { morale: 100, heros: [config(1002, { ...weapon, forge, forgeValue })] },
        red: { morale: 100, heros: [config(1001)] } }, { records: false });
    }
  } finally { console.log = originalLog; }
  console.log('Verified 镂影 attributes, reduction, 穿影 timing, stacked recovery, 善战, 清毅, and six forge runs');
} finally { await vite.close(); }
