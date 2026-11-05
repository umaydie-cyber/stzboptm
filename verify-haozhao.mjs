import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const hero = __HEROS__.find(item => item.name === '郝昭');
    const skill = __SKILLS__.find(item => item.name === '不动如山');
    const white = __SKILLS__.find(item => item.name === '白衣渡江');
    const gongqi = __SKILLS__.find(item => item.name === '攻其不备');
    assert.equal(hero.skill, skill.id);
    const records = [];
    const manager = { Round: 1, Over: false, Record: {
        pushRecord: (...args) => records.push(args), pushActionRecord: (...args) => records.push(args)
    }, BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
    const config = { id: hero.id, level: 40, up: 5, arms: 10000,
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }, equipskill: [] };
    const haozhao = new BattleHero(config, 'blue', manager, 120);
    const originalDefense = haozhao.Attrs.def;
    const originalIntelligence = haozhao.Attrs.int;
    skill.callskill(haozhao);
    assert.equal(haozhao.Attrs.def, originalDefense + 100);
    assert.equal(haozhao.Attrs.int, originalIntelligence + 25);

    haozhao.State.attackLimit = { rounds: 2, from: { hero: {}, skill: white } };
    haozhao.State.activeLimit = { rounds: 2, from: { hero: {}, skill: gongqi } };
    haozhao.State.continuousDamage['恐慌'] = { damage: 100 };
    haozhao.State.noRecoverUntil = 3;
    haozhao.addState('beAttackDamageAdd', 10, -1, gongqi, haozhao);
    haozhao.addState('beInteDamageAdd', 10, -1, gongqi, haozhao);
    haozhao.addState('attackDamageSub', 20, -1, { name: '被动减伤', type: 4 }, haozhao);
    haozhao.addState('inteDamageSub', 20, -1, { name: '主动减伤', type: 2 }, haozhao);
    haozhao.addState('beAttackDamageSub', 10, -1, skill, haozhao);
    let delayedHit = 0;
    haozhao.addHook('行动时', '白衣渡江延迟伤害', () => delayedHit++, white, haozhao, 'debuff');
    haozhao.addHook('受伤时', '攻其不备叠层', () => {}, gongqi, haozhao, 'debuff');
    let restored = 0;
    haozhao.addHook('回合结束时', '临时属性恢复', () => {}, gongqi, haozhao, 'debuff', true, () => restored++);
    haozhao.addHook('行动时', '有益效果', () => {}, skill, haozhao, 'buff');

    // 回合开始后仍有害；在行动前移除，行动时的延迟伤害不再触发。
    assert.equal(haozhao.State.attackLimit.rounds, 2);
    haozhao.clearStateRounds();
    if (haozhao.Storage.budongrushan) haozhao.clearAllHarmfulEffects(haozhao.Storage.budongrushan);
    haozhao.callHook('行动前');
    assert.equal(haozhao.State.attackLimit.rounds, 0);
    assert.equal(haozhao.State.activeLimit.rounds, 0);
    assert.equal(Object.keys(haozhao.State.continuousDamage).length, 0);
    assert.equal(haozhao.State.noRecoverUntil, 0);
    assert.equal(haozhao.State.beAttackDamageAdd.command, null);
    assert.equal(haozhao.State.beInteDamageAdd.command, null);
    assert.equal(haozhao.State.attackDamageSub.passive, null);
    assert.equal(haozhao.State.inteDamageSub.active, null);
    assert(haozhao.State.beAttackDamageSub.passive, '有益的受伤减免保留');
    assert.equal(restored, 1);
    haozhao.callHook('行动时');
    assert.equal(delayedHit, 0);
    assert(Object.values(haozhao.HOOKS.ON_ACTION).some(hook => hook.type === 'buff'));
    console.log('郝昭属性、行动前净化、白衣渡江与攻其不备清除通过');
} finally {
    await vite.close();
}
