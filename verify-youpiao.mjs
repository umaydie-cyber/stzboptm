import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition, clacInteDamage } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const messages = [];
  const manager = { Round: 1, Over: false, Record: { pushRecord(_, msg) { messages.push(msg); } },
    BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const treasure = { id: 'youpiao', xianzhi: 3, miaosuan: 4, forge: 'quhuo', forgeValue: 20 };
  const config = (id, item = null) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure: item });
  const hero = new BattleHero(config(1022, treasure), 'blue', manager, 120);
  const target = new BattleHero(config(1001, treasure), 'red', manager, 100);
  const entries = (info, skill = null) => {
    getDamageAddition(hero, target, info, skill);
    return info.damageModifiers.entries;
  };
  assert.equal(entries({ type: 1 }).find(x => x.name === '游飘·先知'), undefined);
  assert.equal(entries({ type: 2 }).find(x => x.name === '游飘·先知')?.value, -3);
  assert.equal(entries({ type: 2 }, { type: 2 }).find(x => x.name === '游飘·妙算')?.value, 4);
  assert.equal(entries({ type: 2 }, { type: 3 }).find(x => x.name === '游飘·妙算'), undefined);
  assert.equal(entries({ type: 4, kind: '燃烧' }).find(x => x.name === '游飘·驱火')?.value, 20);
  assert.equal(entries({ type: 4, kind: '恐慌' }).find(x => x.name === '游飘·驱火'), undefined);
  hero.Treasure = { ...treasure, forge: 'xuanhuo' };
  assert.equal(entries({ type: 4, kind: '妖术' }).find(x => x.name === '游飘·炫惑')?.value, 20);
  hero.Treasure = { ...treasure, forge: 'yingwu', forgeValue: 20 };
  const originalLog = console.log;
  console.log = () => {};
  let fixedOnly, withForge;
  try {
    hero.Treasure = { ...treasure, forge: 'quhuo' };
    fixedOnly = clacInteDamage(hero, target, { type: 2, rate: 100 }, null);
    hero.Treasure = { ...treasure, forge: 'yingwu', forgeValue: 20 };
    withForge = clacInteDamage(hero, target, { type: 2, rate: 100 }, null);
  } finally { console.log = originalLog; }
  assert.ok(withForge > fixedOnly, '锻造颖悟应额外无视目标谋略');

  hero.Treasure = { ...treasure, forge: 'chousuan', forgeValue: 10 };
  hero.SkillsOrder = [hero.Skill];
  hero.Skills[hero.Skill] = { id: hero.Skill, name: '测试策略主战法', desc: '对敌军发动策略攻击',
    type: 2, rate: 40, callskill: (_, rate) => { assert.equal(rate, hero.getRealSkillRate(40) + 10); return false; } };
  hero.callActiveSkill();
  assert.ok(messages.some(msg => msg.includes('士气修正') && msg.includes('游飘·筹算+10%')));

  for (const id of ['youpiao', 'xushibishou']) {
    const liu = new BattleHero(config(1021, { id, forge: 'chousuan', forgeValue: 15 }), 'blue', manager, 120);
    const main = liu.Skills[liu.Skill];
    assert.equal(main.name, '光武中兴');
    assert.equal(liu.getTreasureMainRateBonus(main), 15);
    liu.SkillsOrder = [liu.Skill];
    liu.Skills[liu.Skill] = { ...main, callskill: (_, rate) => {
      assert.equal(rate, liu.getRealSkillRate(main.rate) + 15);
      return false;
    } };
    liu.callActiveSkill();
    assert.ok(messages.some(msg => msg.includes('【光武中兴】发动率为') &&
      msg.includes('士气修正') && msg.includes('筹算+15%')));
  }

  const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
  console.log = () => {};
  try {
    for (const [forge, forgeValue] of [['lingdong', 20], ['tianzi', 10], ['yingwu', 15],
      ['quhuo', 20], ['xuanhuo', 20], ['chousuan', 10]]) {
      new BattleManger({ blue: { morale: 100, heros: [config(1022, { ...treasure, forge, forgeValue })] },
        red: { morale: 100, heros: [config(1001)] } }, { records: false });
    }
  } finally { console.log = originalLog; }
  console.log('Verified 游飘 strategy modifiers, intelligence bypass, rate breakdown, and six forge battle runs');
} finally {
  await vite.close();
}
