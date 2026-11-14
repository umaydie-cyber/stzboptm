import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const hero = __HEROS__.find(item => item.name === '吕布');
    const skill = __SKILLS__.find(item => item.id === hero.skill);
    assert.deepEqual([hero.camp, hero.star, hero.cost, hero.army, hero.limit], [5, 5, 35, 1, 4]);
    assert.deepEqual([skill.name, skill.type, skill.limit, skill.rate], ['辕门射戟', 2, 5, 35]);

    const manager = { Round: 1, Over: false, Record: { pushRecord() {}, pushActionRecord() {} } };
    const hits = [];
    const target = {
        Arms: 10000, Storage: {}, State: { attackDamageSub: { active: null } }, Manger: manager,
        beHurt(_self, info, source) { hits.push({ info, source }); },
        addState(name, value, rounds, source, self) {
            assert.equal(name, 'attackDamageSub');
            const state = { value, rounds, from: source, hero: self };
            this.State.attackDamageSub.active = state;
            this.applied = (this.applied || 0) + 1;
            return state;
        },
        addHook(_on, _name, callback) { this.beforeAction = callback; return 'expire'; },
        clearHook() { this.beforeAction = null; },
        delState() { this.State.attackDamageSub.active = null; }
    };
    const self = { Arms: 10000, Manger: manager, getTarget() { return [target]; } };
    for (let round = 1; round <= 8; round++) {
        manager.Round = round;
        if (round > 1) target.beforeAction?.();
        const before = hits.length;
        assert.equal(skill.callskill(self, 100), true);
        assert([2, 3].includes(hits.length - before));
        for (const hit of hits.slice(before)) {
            assert.equal(hit.info.ignoreTroopCounter, true);
            assert.equal(hit.info.rate, 140);
            assert.equal(hit.source, skill);
        }
        assert.equal(target.applied, Math.ceil(round / 2));
        if (round % 2 === 1) {
            assert.equal(target.State.attackDamageSub.active.value, 9999);
            assert.equal(target.State.attackDamageSub.active.rounds, -1);
            target.beforeAction?.(); // 同一回合行动时仍生效
            assert.equal(target.State.attackDamageSub.active.value, 9999);
        } else assert.equal(target.State.attackDamageSub.active, null);
    }
    assert.equal(target.applied, 4);
    const config = { id: hero.id, level: 40, up: 5, arms: 10000,
        equipskill: [0, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } };
    const attacker = new BattleHero(config, 'blue', manager, 100);
    const defender = new BattleHero(config, 'red', manager, 100);
    manager.Round = 1;
    defender.addState('attackDamageSub', 9999, -1, skill, attacker);
    const damageInfo = { type: 1, rate: 100 };
    getDamageAddition(defender, attacker, damageInfo, null);
    assert(damageInfo.damageModifiers.entries.some(entry => entry.name === skill.name && entry.value === -9999));
    console.log('Verified Lu Bu data, independent attacks, counter immunity, and four one-round reductions');
} finally {
    await vite.close();
}
