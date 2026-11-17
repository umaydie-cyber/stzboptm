import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
  const skill = __SKILLS__.find(item => item.name === '同仇敌忾');
  const team = [1043, 1009, 1042].map((Id, i) => ({
    Id, Index: i + 1, BattleCamp: 'blue', Arms: 1000, Storage: {},
    Attrs: { int: Id === 1043 ? 213 : 100, spd: 50 }, OriginAttrs: {},
    addHook(_event, _name, callback) { this.onHurt = callback; }
  }));
  const source = team[0];
  source.Manger = { BlueTeam: { hero: team }, Record: { pushRecord() {} } };
  skill.callskill(source);
  for (let i = 0; i < 10; i++) team[0].onHurt(null, null, null, 100);
  assert.equal(team[1].Storage.rusuTongchou[0].stacks, 8);
  assert.equal(team[1].Storage.rusuTongchou[0].perStack, 4);
  assert.equal(team[2].Storage.rusuTongchou, undefined);
  source.Arms = 0;
  team[1].onHurt(null, null, null, 100);
  assert.equal(team[2].Storage.rusuTongchou[0].stacks, 1);

  const manager = Object.create(BattleManger.prototype);
  const titleTeam = { hero: team };
  manager.applyDongwuDaduDu(titleTeam);
  assert.equal(titleTeam.dongwuDaduDu, true);
  assert.equal(team[1].Attrs.int, 120);
  assert.equal(team[1].Attrs.spd, 69);
  const ordinary = { hero: team.map(hero => ({ ...hero, Attrs: { int: 100, spd: 50 }, OriginAttrs: {} })) };
  ordinary.hero[2].Id = 1013;
  manager.applyDongwuDaduDu(ordinary);
  assert.equal(ordinary.dongwuDaduDu, true);
  ordinary.hero[2].Id = 1009;
  manager.applyDongwuDaduDu(ordinary);
  assert.equal(ordinary.dongwuDaduDu, false);
  console.log('鲁肃叠层、阵亡后效果及东吴大都督校验通过');
} finally {
  await vite.close();
}
