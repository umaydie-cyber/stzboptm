import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const skill = __SKILLS__.find(s => s.name === '一夫当关');
    assert.deepEqual([skill.type, skill.level, skill.rate, skill.limit], [1, 'A', '--', 3]);
    const manager = { Round: 1, Record: { pushRecord() {} } };
    const guard = { Name: '前锋', Arms: 1000, BattleCamp: 'blue', Posname: '前锋',
        Attrs: { def: 100 }, Storage: {}, State: {}, Manger: manager, getDamageStateValue: () => 0 };
    skill.callskill(guard);
    const ally = { Name: '友军', Arms: 1000, BattleCamp: 'blue', Posname: '大营' };
    const attacker = { Name: '敌军', BattleCamp: 'red', BisicArm: 1, Storage: {}, State: {},
        Manger: manager, getDamageStateValue: () => 0,
        resolveBasicAttackGuard: BattleHero.prototype.resolveBasicAttackGuard };
    const enemy = { BisicArm: 1 };
    manager.BlueTeam = { hero: [ally, guard] };
    manager.RedTeam = { hero: [enemy] };
    assert.equal(attacker.resolveBasicAttackGuard(ally), guard);
    for (const [def, expected] of [[100, 57], [150, 76], [200, 95], [250, 114], [400, 171]]) {
        guard.Attrs.def = def;
        const info = { type: 1 };
        getDamageAddition(attacker, guard, info, null);
        assert(info.damageModifiers.entries.some(entry => entry.name === '一夫当关' && entry.value === -expected));
    }
    manager.Round = 3;
    assert.equal(attacker.resolveBasicAttackGuard(ally), ally);
    const info = { type: 1 };
    getDamageAddition(attacker, guard, info, null);
    assert(!info.damageModifiers.entries.some(entry => entry.name === '一夫当关'));
    console.log('Verified Yi Fu Dang Guan guard, defense scaling, and two round expiry');
} finally {
    await vite.close();
}
