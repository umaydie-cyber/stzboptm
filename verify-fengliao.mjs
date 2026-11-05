import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const random = Math.random;
try {
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const logs = [];
    const manager = {
        Round: 0, Over: false,
        Record: { pushRecord: (...x) => logs.push(x), pushActionRecord: (...x) => logs.push(x) },
        BlueTeam: { hero: [] }, RedTeam: { hero: [] }
    };
    const make = (id, camp) => new BattleHero({ id, level: 50, up: 0, extraAttrsAlloc: {}, equipskill: [] }, camp, manager, 100);
    const feng = make(1023, 'blue');
    const ally = make(1021, 'blue');
    const enemy = make(1016, 'red');
    manager.BlueTeam.hero.push(feng, ally);
    manager.RedTeam.hero.push(enemy);
    assert.equal(feng.Skills[1050].name, '锦车持节');
    feng.Skills[1050].callskill(feng);
    ally.Arms -= 500;
    ally.HurtArms = 500;
    manager.Round = 1;
    Math.random = () => 0; // 判定成功，选择降伤
    feng.callHook('回合开始时');
    assert.equal(enemy.getDamageStateValue('attackDamageSub'), 9999);
    assert.equal(enemy.getDamageStateValue('inteDamageSub'), 9999);
    const { clacInteDamage, clacAttackDamage } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    clacInteDamage(enemy, feng, { type: 2, rate: 100 }, enemy.Skills[1035]);
    clacAttackDamage(enemy, feng, { type: 1, rate: 100 }, enemy.Skills[1035]);
    assert.ok(logs.filter(row => row.some(value => String(value).includes('降低90%'))).length >= 2);
    feng.callHook('回合结束时');
    enemy.callHook('回合结束时');
    assert.ok(ally.Arms > 9500);
    assert.equal(enemy.getDamageStateValue('attackDamageSub'), 0);
    const healed = ally.Arms;
    manager.Round = 2;
    let draws = 0;
    Math.random = () => (++draws === 201 ? 0.5 : 0); // 首次判定成功，第二次选择暴走/减距
    feng.callHook('回合开始时');
    assert.equal(enemy.Limit, 0);
    assert.equal(enemy.Skills[1035].limit, 3);
    assert.ok(enemy.isRage());
    feng.callHook('回合结束时');
    enemy.callHook('回合结束时');
    assert.equal(enemy.Limit, 2);
    assert.equal(enemy.Skills[1035].limit, 5);
    assert.equal(enemy.isRage(), false);
    assert.ok(ally.Arms >= healed);
    console.log('Verified Feng Liao round-start effects, expiry and round-end recovery');
} finally {
    Math.random = random;
    await vite.close();
}
