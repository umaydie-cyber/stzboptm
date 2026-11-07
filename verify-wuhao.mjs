import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const records = [];
  const manager = { Round: 0, Over: false, Record: { pushRecord(_, msg) { records.push(msg); } },
    BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
  const treasure = { id: 'wuhao', lingdong: 3, kangli: 4, forge: 'kangli', forgeValue: 20 };
  const config = (id, item = null) => ({ id, level: 40, up: 5, arms: 10000,
    extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [], treasure: item });
  const hero = new BattleHero(config(1022, treasure), 'blue', manager, 100);
  const targets = [0, 1, 2].map(() => new BattleHero(config(1001), 'red', manager, 100));
  manager.BlueTeam.hero = [hero];
  manager.RedTeam.hero = targets;
  const entries = (target, skill, type = 2) => {
    const info = { type, rate: 100 };
    getDamageAddition(hero, target, info, skill);
    return info.damageModifiers.entries;
  };
  assert.equal(hero.Attrs.spd - hero.OriginAttrs.spd, 0);
  assert.ok(hero.Attrs.spd > new BattleHero(config(1022), 'blue', manager, 100).Attrs.spd);
  for (const target of targets) assert.equal(entries(target, { id: 1021, type: 1 }).find(x => x.name === '乌号·逐胜')?.value, 15);
  targets[0].Arms = 9000;
  assert.equal(entries(targets[0], null).find(x => x.name === '乌号·逐胜')?.value, 15);
  assert.equal(entries(targets[1], null).find(x => x.name === '乌号·逐胜'), undefined);
  const own = { id: hero.Skill, type: 2 };
  assert.equal(entries(targets[0], own).find(x => x.name === '乌号·亢厉')?.value, 8);
  assert.equal(entries(targets[0], own).find(x => x.name === '乌号·锻造亢厉')?.value, 20);
  assert.equal(entries(targets[0], { id: 9999, type: 2 }).find(x => x.name === '乌号·亢厉'), undefined);
  hero.Treasure = { ...treasure, forge: 'jixu', forgeValue: 6 };
  manager.Round = 1;
  targets[0].State.continuousDamage['燃烧'] = { expiresRound: 2 };
  targets[0].State.confusion = { rounds: 2 };
  assert.equal(entries(targets[0], null).find(x => x.name === '乌号·击虚')?.value, 12);
  hero.Treasure = { ...treasure, forge: 'shulv', forgeValue: 10 };
  hero.SkillsOrder = [hero.Skill];
  hero.Skills[hero.Skill] = { id: hero.Skill, name: '测试准备主战法', desc: '1回合准备', ready: true,
    type: 2, rate: 40, callskill: (_, rate) => { assert.equal(rate, 50); return false; } };
  hero.callActiveSkill();
  assert.ok(records.some(msg => msg.includes('乌号·熟虑+10%') && msg.includes('士气修正')));
  hero.Skills[hero.Skill].ready = false;
  assert.equal(hero.getTreasureMainRateBonus(hero.Skills[hero.Skill]), 0);
  console.log('Verified 乌号 speed, 逐胜 ties/snapshot, main skill damage, 击虚, and 熟虑 report');
} finally {
  await vite.close();
}
