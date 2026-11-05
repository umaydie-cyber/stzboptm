import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { clacAttackDamage } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const skill = __SKILLS__.find(item => item.name === '横轭');
    assert.equal(skill.level, 'B');
    const records = [];
    const manager = { Round: 1, Record: { pushRecord: (...args) => records.push(args) }, BlueTeam: { hero: [] } };
    const unit = (army, name) => ({ BisicArm: army, Name: name, BattleCamp: 'blue', Manger: manager,
        Arms: 10000, Attrs: { int: 100, atk: 200 }, OriginAttrs: { int: 100 }, Storage: {},
        getDamageStateValue: () => 0 });
    const cavalry = unit(3, '骑兵');
    const infantry = unit(2, '步兵');
    manager.BlueTeam.hero = [cavalry, infantry];
    skill.callskill(cavalry);
    assert.equal(cavalry.Attrs.int, 150);
    assert.equal(cavalry.OriginAttrs.int, 150);
    assert.equal(infantry.Storage.henge, true);
    assert.equal(cavalry.Storage.henge, undefined);

    const target = { Name: '目标', Attrs: { def: 100 }, Manger: manager, Storage: {}, State: {},
        getDamageStateValue: () => 0, isAttackLimit: () => false };
    const originalRandom = Math.random;
    let normal, boosted, split;
    try {
        Math.random = () => 0;
        infantry.Storage.henge = false;
        normal = clacAttackDamage(infantry, target, { type: 1, rate: 100, isBasicAttack: true });
        infantry.Storage.henge = true;
        boosted = clacAttackDamage(infantry, target, { type: 1, rate: 100, isBasicAttack: true });
        split = clacAttackDamage(infantry, target, { type: 1, rate: 100, isBasicAttack: true, isSplitAttack: true });
    } finally { Math.random = originalRandom; }
    assert(boosted > normal);
    assert.equal(split, normal, '分兵不计为普通攻击');

    const archer = unit(1, '弓兵');
    manager.BlueTeam.hero = [cavalry, archer];
    cavalry.Attrs.int = 100;
    skill.callskill(cavalry);
    assert.equal(cavalry.Attrs.int, 100, '包含弓兵时横轭不生效');
    console.log('横轭兵种条件、谋略加成和步兵普通攻击加伤通过');
} finally {
    await vite.close();
}
