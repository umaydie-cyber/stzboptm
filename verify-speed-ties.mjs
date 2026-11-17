import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalRandom = Math.random;
try {
    const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
    const hero = (name, speed, firstAction = false) => ({
        name, Attrs: { spd: speed }, State: { firstAction: { rounds: firstAction ? 2 : 0 } }
    });
    const blue = hero('blue', 100);
    const red = hero('red', 100);
    const manager = { Round: 1, BlueTeam: { hero: [blue] }, RedTeam: { hero: [red] } };
    Math.random = () => 0;
    BattleManger.prototype.sortBattleHerosBySpd.call(manager);
    assert.equal(manager.SortSpdHeros[0], red, '同速时守方应有先行动的可能');
    Math.random = () => 0.999;
    BattleManger.prototype.sortBattleHerosBySpd.call(manager);
    assert.equal(manager.SortSpdHeros[0], blue, '同速时攻方应有先行动的可能');

    red.Attrs.spd = 101;
    Math.random = () => 0.999;
    BattleManger.prototype.sortBattleHerosBySpd.call(manager);
    assert.equal(manager.SortSpdHeros[0], red, '速度不同仍应按速度排序');

    blue.State.firstAction.rounds = 2;
    BattleManger.prototype.sortBattleHerosBySpd.call(manager);
    assert.equal(manager.SortSpdHeros[0], blue, '先手状态仍应优先于速度');
    console.log('同速先后手随机校验通过');
} finally {
    Math.random = originalRandom;
    await vite.close();
}
