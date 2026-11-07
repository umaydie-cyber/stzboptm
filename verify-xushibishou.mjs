import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { clacAttackDamage, getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const messages = [];
  const manager = { Round: 1, Over: false, Stats: { blue: {}, red: {} },
    Record: { Records: messages, pushRecord(_, msg) { messages.push({ msg }); },
      pushActionRecord(_, __, ___, msg) { messages.push({ msg }); } },
    addStat() {}, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const config = (id, treasure = null) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure });
  const weapon = { id: 'xushibishou', lingdong: 3, podi: 4, forge: 'shipo', forgeValue: 2 };
  const attacker = new BattleHero(config(1002, weapon), 'blue', manager, 100);
  const plain = new BattleHero(config(1002), 'blue', manager, 100);
  const target = new BattleHero(config(1001), 'red', manager, 100);
  attacker.Index = 1; target.Index = 2;
  manager.BlueTeam.hero = [attacker]; manager.RedTeam.hero = [target];
  assert.equal(attacker.Attrs.spd, Math.round((plain.Attrs.spd + 4.5) * 100) / 100);
  assert.equal(attacker.Attrs.atk, Math.round(plain.Attrs.atk * 1.05 * 100) / 100);
  assert.equal(attacker.Attrs.int, Math.round(plain.Attrs.int * 1.05 * 100) / 100);

  const originalRandom = Math.random, originalLog = console.log;
  Math.random = () => 0.5; console.log = () => {};
  try {
    const withIgnore = clacAttackDamage(attacker, target, { type: 1, rate: 100 }, null);
    attacker.Treasure = null;
    const withoutIgnore = clacAttackDamage(attacker, target, { type: 1, rate: 100 }, null);
    assert.ok(withIgnore > withoutIgnore, '每点破敌应无视 1.5% 目标防御');
    attacker.Treasure = weapon;

    const main = { id: attacker.Skill, type: 2 };
    target.Storage.evadeNextDamage = true;
    target.beHurt(attacker, { type: 1, rate: 100 }, main);
    assert.equal(target.Storage.evadeNextDamage, true, '识破应让主战法伤害无视规避');
    target.Storage.evadeNextDamage = true;
    target.beHurt(attacker, { type: 1, rate: 100 }, { id: 9999, type: 2 });
    assert.equal(target.Storage.evadeNextDamage, false, '携带战法不得享受识破');
    manager.Round = 3;
    target.Storage.evadeNextDamage = true;
    target.beHurt(attacker, { type: 1, rate: 100 }, main);
    assert.equal(target.Storage.evadeNextDamage, false, '识破不得越过所选回合');

    attacker.Treasure = { ...weapon, forge: 'kangli', forgeValue: 20 };
    const info = { type: 1, rate: 100 };
    getDamageAddition(attacker, target, info, main);
    assert.equal(info.damageModifiers.entries.find(x => x.name === '徐氏匕首·亢厉')?.value, 20);
    const learnedInfo = { type: 1, rate: 100 };
    getDamageAddition(attacker, target, learnedInfo, { id: 9999, type: 2 });
    assert.equal(learnedInfo.damageModifiers.entries.find(x => x.name === '徐氏匕首·亢厉'), undefined);

    attacker.Treasure = { ...weapon, forge: 'chousuan', forgeValue: 10 };
    attacker.SkillsOrder = [attacker.Skill];
    attacker.Skills[attacker.Skill] = { id: attacker.Skill, name: '测试策略主战法', desc: '对敌军发动策略攻击',
      type: 2, rate: 40, callskill: (_, rate) => { assert.equal(rate, 50); return false; } };
    attacker.callActiveSkill();
    assert.ok(messages.some(entry => entry.msg?.includes('徐氏匕首·筹算+10%') && entry.msg.includes('士气修正')));
    attacker.Treasure = { ...weapon, forge: 'yingyong', forgeValue: 12 };
    assert.equal(attacker.getTreasureMainRateBonus({ id: attacker.Skill, type: 2, desc: '造成攻击伤害' }), 12);
    assert.equal(attacker.getTreasureMainRateBonus({ id: 9999, type: 2, desc: '造成攻击伤害' }), 0);
  } finally { Math.random = originalRandom; console.log = originalLog; }
  const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
  console.log = () => {};
  try {
    for (const [forge, forgeValue] of [['tianzi', 10], ['xiaorui', 10], ['chousuan', 10],
      ['shipo', 2], ['kangli', 20], ['yingyong', 10]]) {
      new BattleManger({ blue: { morale: 100, heros: [config(1002, { ...weapon, forge, forgeValue })] },
        red: { morale: 100, heros: [config(1001)] } }, { records: false });
    }
  } finally { console.log = originalLog; }
  console.log('Verified 徐氏匕首 attributes, defense ignore, 识破 scope and rounds, 亢厉, and 筹算 report');
} finally { await vite.close(); }
