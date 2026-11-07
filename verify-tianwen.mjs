import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const records = [];
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} }, SortSpdHeros: [],
    Record: { Records: records, pushRecord(_, msg) { records.push({ msg }); },
      pushActionRecord(_, __, ___, msg) { records.push({ msg }); } },
    addStat() {}, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (id, treasure = null) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const treasure = { id: 'tianwen', buyi: 3, tianzi: 2, forge: 'jiebei', forgeValue: 20 };
  const hero = new BattleHero(config(1007, treasure), 'blue', manager, 100);
  const plain = new BattleHero(config(1007), 'blue', manager, 100);
  const enemy = new BattleHero(config(1001), 'red', manager, 100);
  hero.Index = 1; enemy.Index = 2;
  manager.BlueTeam.hero = [hero]; manager.RedTeam.hero = [enemy]; manager.SortSpdHeros = [hero, enemy];
  assert.equal(hero.Attrs.int - plain.Attrs.int, 5);
  const entries = (type, skill = null) => {
    const info = { type, rate: 100 };
    getDamageAddition(enemy, hero, info, skill);
    return info.damageModifiers.entries;
  };
  assert.equal(entries(1).find(entry => entry.name === '天问·不移')?.value, -3);
  assert.equal(entries(2).find(entry => entry.name === '天问·不移'), undefined);
  assert.equal(entries(2).find(entry => entry.name === '天问·戒备')?.value, -20);
  manager.Round = 3;
  assert.equal(entries(1).find(entry => entry.name === '天问·戒备'), undefined);
  hero.Treasure = { ...treasure, forge: 'jianren', forgeValue: 15 };
  assert.equal(entries(1, { id: 9, type: 2 }).find(entry => entry.name === '天问·坚忍')?.value, -15);
  assert.equal(entries(1, { id: 9, type: 3 }).find(entry => entry.name === '天问·坚忍'), undefined);
  hero.Treasure = { ...treasure, forge: 'jimin', forgeValue: 7 };
  assert.equal(hero.getTreasureMainRateBonus(hero.Skills[hero.Skill]), 7);
  assert.equal(hero.getTreasureMainRateBonus({ id: 9999, type: 2 }), 0);

  const originalRandom = Math.random, originalLog = console.log;
  Math.random = () => 0; console.log = () => {};
  try {
    // 陈到的真实主战法施加犹豫，首次发动延长；再次发动不延长。
    manager.Round = 1;
    hero.callActiveSkill();
    assert.equal(enemy.State.activeLimit.rounds, 2);
    assert.ok(records.some(entry => entry.msg?.includes('天问·观星') && entry.msg.includes('持续2回合')));
    assert.ok(records.some(entry => entry.msg?.includes('陷入犹豫2回合')));
    assert.ok(records.some(entry => entry.msg?.includes('天问·机敏+7%')));
    enemy.State.activeLimit = { rounds: 0, from: { hero: null, skill: 0 } };
    enemy.Arms = 10000;
    hero.callActiveSkill();
    assert.equal(enemy.State.activeLimit.rounds, 1);

    // 首次准备型主战法在下一回合才施加犹豫时，观星仍生效。
    const prepared = new BattleHero(config(1007, { ...treasure, forge: 'shulv', forgeValue: 10 }), 'blue', manager, 100);
    prepared.Index = 1;
    manager.BlueTeam.hero = [prepared];
    prepared.SkillsOrder = [prepared.Skill];
    prepared.Skills[prepared.Skill] = { id: prepared.Skill, name: '测试准备主战法', desc: '1回合准备',
      type: 2, ready: true, rate: 40, callskill: (_, rate) => { assert.equal(rate, 50); return true; } };
    manager.Round = 1;
    prepared.callActiveSkill();
    assert.ok(records.some(entry => entry.msg?.includes('天问·熟虑+10%')));
    manager.Round = 2;
    enemy.State.activeLimit = { rounds: 1, from: { hero: prepared, skill: prepared.Skills[prepared.Skill] } };
    assert.equal(enemy.State.activeLimit.rounds, 2);
    enemy.State.activeLimit = { rounds: 0 };
    manager.Round = 3;
    enemy.State.activeLimit = { rounds: 1, from: { hero: prepared, skill: prepared.Skills[prepared.Skill] } };
    assert.equal(enemy.State.activeLimit.rounds, 1);

    // 指挥主战法的延迟犹豫也属于首次发动；携带战法不享受观星。
    const command = new BattleHero(config(1022, treasure), 'blue', manager, 100);
    command.Index = 1;
    manager.BlueTeam.hero = [command];
    manager.Round = 0;
    command.callCommandSkill();
    manager.Round = 1;
    enemy.State.activeLimit = { rounds: 1, from: { hero: command, skill: command.Skills[command.Skill] } };
    assert.equal(enemy.State.activeLimit.rounds, 2);
    enemy.State.activeLimit = { rounds: 1, from: { hero: command, skill: { id: 1023, type: 1 } } };
    assert.equal(enemy.State.activeLimit.rounds, 1);

    const failed = new BattleHero(config(1007, treasure), 'blue', manager, 100);
    failed.Storage.tianwenFirstMainCast = { id: failed.Skill, applied: false };
    Math.random = () => 0.99;
    enemy.State.activeLimit = { rounds: 1, from: { hero: failed, skill: failed.Skills[failed.Skill] } };
    assert.equal(enemy.State.activeLimit.rounds, 1, '观星40%判定失败时不延长');
    Math.random = () => 0;

    // 仁心与受疗方已有加成按百分点相加，逐项写入战报。
    hero.Treasure = { ...treasure, forge: 'renxin', forgeValue: 10 };
    enemy.Arms = 8000; enemy.HurtArms = 5000;
    enemy.Storage.recoveryBonuses = { other: { name: '其他恢复效果', value: 5 } };
    enemy.revocer(1000, hero, '测试恢复');
    assert.equal(enemy.Arms, 9150);
    assert.ok(records.some(entry => entry.msg?.includes('天问·仁心+10%') && entry.msg.includes('其他恢复效果+5%')));
  } finally { Math.random = originalRandom; console.log = originalLog; }

  const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
  console.log = () => {};
  try {
    for (const [forge, forgeValue] of [['tianzi', 10], ['jiebei', 20], ['jimin', 6],
      ['shulv', 10], ['jianren', 15], ['renxin', 10]]) {
      new BattleManger({ blue: { morale: 100, heros: [config(1007, { ...treasure, forge, forgeValue })] },
        red: { morale: 100, heros: [config(1001)] } }, { records: false });
    }
  } finally { console.log = originalLog; }
  console.log('Verified 天问 attributes, reductions, first-main 观星, preparation, rate bonuses, 仁心, and six forge runs');
} finally { await vite.close(); }
