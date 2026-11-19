import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalLog = console.log;
try {
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const record = {
        Records: [],
        pushRecord(_, msg) { this.Records.push({ msg }); },
        pushActionRecord(_, __, ___, msg) { this.Records.push({ msg }); }
    };
    const manager = { Round: 1, Over: false, Record: record, addStat() {},
        BlueTeam: { hero: [] }, RedTeam: { hero: [] } };
    const hero = (id, camp) => new BattleHero({
        id, level: 40, up: 5, arms: 10000, equipskill: [1031, 1102],
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }
    }, camp, manager, 100);

    const xpLuxun = hero(1042, 'blue');
    const ally = hero(1001, 'blue');
    const target = hero(1002, 'red');
    manager.BlueTeam.hero = [xpLuxun, ally];
    manager.RedTeam.hero = [target];
    const shengbing = __SKILLS__.find(skill => skill.id === 1031);
    const carried = xpLuxun.Skills[1102];

    shengbing.callskill(xpLuxun);
    xpLuxun.getRealSkillRate = () => assert.fail('携带战法不得判定胜兵');
    let xpCasts = 0;
    xpLuxun.addReadySkill(carried, 1, () => xpCasts++);
    assert.equal(xpCasts, 0);
    xpLuxun.subReadySkillRound(carried);
    assert.equal(xpCasts, 1);
    ally.callHook('战法成功发动后', carried);
    assert.equal(xpLuxun.Storage.shengbingStacks, undefined);

    const owner = hero(1001, 'blue');
    const main = { ...carried, id: 9001, name: '测试主战法' };
    owner.Skill = main.id;
    owner.Skills[main.id] = main;
    manager.BlueTeam.hero = [owner, ally];
    shengbing.callskill(owner);

    let rate = 100;
    owner.getRealSkillRate = base => {
        assert.equal(base, 80);
        return rate;
    };
    let casts = 0;
    owner.addReadySkill(main, 1, () => casts++);
    assert.equal(casts, 1);
    assert.equal(owner.READY_VAL[main.id], undefined);
    rate = 0;
    owner.addReadySkill(main, 1, () => casts++);
    assert.equal(casts, 1);
    owner.subReadySkillRound(main);
    assert.equal(casts, 2);

    owner.callHook('战法成功发动后', carried);
    ally.callHook('战法成功发动后', { type: 3 });
    assert.equal(owner.Storage.shengbingStacks, undefined);
    for (let i = 0; i < 4; i++) ally.callHook('战法成功发动后', carried);
    assert.equal(owner.Storage.shengbingStacks, 3);

    console.log = () => {};
    const hit = (skill, info = { type: 2, rate: 100 }, num = null) => {
        target.Arms = 10000;
        const start = record.Records.length;
        target.beHurt(owner, info, skill, num);
        return record.Records.slice(start).find(entry => entry.damageModifiers)?.damageModifiers.entries
            .find(entry => entry.name === '胜兵求战')?.value;
    };
    assert.equal(hit(carried), undefined);
    assert.equal(owner.Storage.shengbingStacks, 3);
    assert.equal(hit(main), 45);
    assert.equal(owner.Storage.shengbingStacks, 0);
    assert.equal(hit(main), undefined);

    target.applyContinuousDamage('燃烧', owner, main, 100, 2);
    const { damage, damageModifiers, troopBaseDamage } = target.State.continuousDamage['燃烧'];
    ally.callHook('战法成功发动后', carried);
    const snapshot = { type: 4, rate: 100, damageModifiers, troopBaseDamage };
    assert.equal(hit(main, snapshot, damage), 15);
    assert.equal(owner.Storage.shengbingStacks, 0);
    assert.equal(hit(main, snapshot, damage), undefined);

    originalLog('胜兵求战主战法限制、独立准备判定、增伤叠层及消耗校验通过');
} finally {
    console.log = originalLog;
    await vite.close();
}
