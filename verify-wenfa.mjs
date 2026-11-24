import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalLog = console.log;
try {
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { clacInteDamage } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const skill = __SKILLS__.find(item => item.name === '文伐');
    assert.deepEqual([skill.level, skill.type, skill.rate, skill.study], ['B', 3, 40, true]);

    const record = {
        Records: [],
        pushRecord(_, msg) { this.Records.push({ msg }); },
        pushActionRecord(_, __, ___, msg) { this.Records.push({ msg }); }
    };
    const manager = { Round: 2, Over: false, Record: record, addStat() {},
        BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
    const hero = (id, camp, equipskill) => new BattleHero({
        id, level: 1, up: 0, arms: 10000, equipskill: [equipskill || 0, 0],
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }
    }, camp, manager, 100);
    const source = hero(1002, 'blue', skill.id);
    const ally = hero(1001, 'blue');
    const target = hero(1001, 'red');
    manager.BlueTeam.hero = [source, ally];
    manager.RedTeam.hero = [target];
    const strategy = __SKILLS__.find(item => item.name === '落雷');
    const hit = (attacker, type, skill, info = {}, snapshot = null) => {
        const start = record.Records.length;
        target.beHurt(attacker, { type, rate: 100, ...info }, skill, snapshot);
        return record.Records.slice(start).find(entry => entry.damageModifiers)
            ?.damageModifiers.entries.find(entry => entry.name === '文伐')?.value;
    };

    console.log = () => {};
    for (const [intelligence, expected] of [[80, 228], [90, 249], [100, 270]]) {
        source.Attrs.int = intelligence;
        target.State.wenfaSource = null;
        target.Arms = 10000;
        const start = record.Records.length;
        skill.callskill(source, target);
        const records = record.Records.slice(start);
        assert.ok(records.some(entry => entry.msg.includes(`策略伤害率 ${expected}%`)));
        assert.ok(records.find(entry => entry.damageModifiers).damageModifiers.entries.every(entry => entry.name !== '文伐'));
        assert.equal(target.State.wenfaSource, source);
    }
    assert.equal(hit(ally, 1, strategy), undefined);
    assert.equal(hit(ally, 4, strategy), undefined);
    target.Storage.evadeNextDamage = true;
    assert.equal(hit(ally, 2, strategy), undefined);
    assert.equal(target.State.wenfaSource, source);
    assert.equal(hit(ally, 2, strategy), 20);
    assert.equal(hit(ally, 2, strategy), undefined);

    const snapshot = { type: 2, rate: 100 };
    const damage = clacInteDamage(ally, target, snapshot, strategy);
    target.State.wenfaSource = source;
    target.Arms = 10000;
    assert.equal(hit(ally, 2, strategy, snapshot, damage), 20);
    assert.ok(10000 - target.Arms > damage);
    assert.equal(hit(ally, 2, strategy, snapshot, damage), undefined);
    originalLog('文伐的谋略倍率、追击目标、盟友触发、规避及伤害快照校验通过');
} finally {
    console.log = originalLog;
    await vite.close();
}
