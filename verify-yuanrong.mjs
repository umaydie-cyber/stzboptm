import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const treasure = { id: 'yuanrong', xianzhen: 3, wuwei: 4, forge: 'xurui', forgeValue: 10 };
  const manager = { Round: 1, Over: false, Record: { pushRecord() {}, pushActionRecord() {} },
    BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const make = (id, camp, item = null) => new BattleHero({ id, level: 40, up: 5,
    arms: 10000, extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure: item }, camp, manager, 100);
  const hero = make(1019, 'blue', treasure);
  const target = make(1002, 'red');
  const plain = make(1019, 'blue');
  const tianzi = make(1019, 'blue', { ...treasure, forge: 'tianzi', forgeValue: 10 });
  assert.equal(tianzi.Attrs.int, Number((plain.Attrs.int * 1.1).toFixed(2)));
  hero.Index = 3; target.Index = 4;
  manager.BlueTeam.hero = [hero]; manager.RedTeam.hero = [target];
  const value = (info, skill = null) => {
    getDamageAddition(hero, target, info, skill);
    return info.damageModifiers.entries;
  };
  assert.equal(value({ type: 1, isBasicAttack: true, isSplitAttack: true })
    .find(entry => entry.name === '元戎·陷阵')?.value, 3);
  assert.equal(value({ type: 1 })
    .find(entry => entry.name === '元戎·陷阵'), undefined);
  hero.Storage.yuanrongXuruiStacks = 2;
  const pursuit = value({ type: 1 }, { type: 3 });
  assert.equal(pursuit.find(entry => entry.name === '元戎·无畏')?.value, 8);
  assert.equal(pursuit.find(entry => entry.name === '元戎·蓄锐')?.value, 20);
  hero.Storage.yuanrongBasicAttacks = 0;
  hero.Storage.yuanrongXuruiStacks = 0;
  hero.registerYuanrongBasicAttack();
  target.beHurt = () => {};
  hero.State.splitAttack = { rate: 60, skill: null };
  hero.performSplitAttack([target]);
  assert.equal(hero.Storage.yuanrongXuruiStacks, 1, '分兵应计入蓄锐的两次普通攻击');
  hero.State.splitAttack = null;
  hero.Treasure = { ...treasure, forge: 'xuanfeng', forgeValue: 20 };
  hero.registerYuanrongBasicAttack();
  hero.registerYuanrongBasicAttack();
  assert.equal(hero.Storage.yuanrongXuanfengReady, true, '选锋不可叠加');
  assert.equal(value({ type: 2 }).find(entry => entry.name === '元戎·选锋')?.value, 20);

  hero.Treasure = { ...treasure, forge: 'jianyi', forgeValue: 2 };
  hero.State.confusion = { rounds: 1 };
  assert.equal(hero.State.confusion.rounds, 0);
  hero.State.rage = { rounds: 1 };
  assert.equal(hero.State.rage.rounds, 0);
  manager.Round = 3;
  hero.State.confusion = { rounds: 1 };
  assert.equal(hero.State.confusion.rounds, 1);

  manager.Round = 1;
  hero.Treasure = treasure;
  hero.Storage.yuanrongBurstUsed = false;
  hero.triggerPursuitCurses = () => {};
  hero.callHook = () => {};
  const extra = { Arms: 10000, Index: 5, Name: '额外目标' };
  target.Arms = 10000;
  manager.RedTeam.hero.push(extra);
  const calls = [];
  hero.SkillsOrder = [hero.Skill];
  hero.Skills[hero.Skill] = { id: hero.Skill, type: 3, rate: 100, name: '主战法',
    callskill: (_, victim) => calls.push(victim) };
  hero.callPursuitSkill(target);
  assert.deepEqual(calls, [target, extra]);
  hero.callPursuitSkill(target);
  assert.deepEqual(calls, [target, extra, target]);
  const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
  const originalLog = console.log;
  console.log = () => {};
  try {
    for (const [forge, forgeValue] of [['xiaorui', 10], ['tianzi', 10], ['benxi', 6],
      ['jianyi', 4], ['xuanfeng', 20], ['xurui', 10]]) {
      const config = (id, item = null) => ({ id, level: 40, up: 5, arms: 10000,
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure: item });
      new BattleManger({ blue: { morale: 100, heros: [config(1019, { ...treasure, forge, forgeValue })] },
        red: { morale: 100, heros: [config(1002)] } }, { records: false });
    }
  } finally {
    console.log = originalLog;
  }
  console.log('Verified 元戎 split bonus, pursuit bonus, immunity, first main pursuit extra target, and six forge battle runs');
} finally {
  await vite.close();
}
