import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
  const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
  const skill = __SKILLS__.find(item => item.name === '先驱突击');
  const hero = Object.create(BattleHero.prototype);
  hero.Name = '测试武将';
  hero.Attrs = { atk: 100 };
  hero.State = {};
  hero.Manger = { Round: 0, Record: { pushRecord() {} } };

  skill.callskill(hero);
  assert.equal(hero.State.firstAction.rounds, 3);
  assert.equal(hero.Attrs.atk, 130);
  for (const round of [1, 2, 3]) {
    hero.Manger.Round = round;
    hero.claerSingleSimpleStateRounds('doubleAttack');
    assert.ok(hero.State.doubleAttack.rounds > 0, `第${round}回合应有连击`);
  }
  hero.Manger.Round = 4;
  hero.claerSingleSimpleStateRounds('doubleAttack');
  assert.equal(hero.State.doubleAttack.rounds, 0);
  console.log('Verified 先驱突击连击生效于第1至第3回合，第4回合结束');
} finally {
  await vite.close();
}
