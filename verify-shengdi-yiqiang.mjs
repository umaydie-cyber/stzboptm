import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { calcDefenseRecover } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const skill = __SKILLS__.find(item => item.name === '胜敌益强');
    assert.deepEqual([skill.id, skill.type, skill.study, skill.limit], [1096, 4, true, 1]);
    const records = [];
    const manager = { Round: -1, Over: false, Record: {
        Records: records,
        pushRecord(_hero, message) { records.push({ message }); },
        pushActionRecord(_source, _target, _prefix, message) { records.push({ message }); }
    }, addStat() {} };
    const hero = new BattleHero({ id: 1038, level: 1, up: 0, arms: 10000,
        equipskill: [0, 0], extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } },
    'blue', manager, 100);
    hero.Attrs.def = 250;
    hero.Arms = 3500;
    hero.HurtArms = 5000;
    assert.equal(calcDefenseRecover(hero, 120, 0.865, 2), 400);
    skill.callskill(hero);
    for (const [round, expected] of [[1, 1], [2, 2], [3, 2], [4, 3], [5, 3], [6, 4], [8, 4]]) {
        manager.Round = round;
        hero.Arms = 3500;
        hero.HurtArms = 5000;
        const before = records.length;
        hero.callHook('行动时');
        const heals = records.slice(before).filter(record => record.message?.includes('恢复了'));
        assert.equal(heals.length, expected, `round ${round}`);
        assert.equal(Number(heals[0].message.match(/恢复了(\d+)兵力/)[1]), 400);
    }
    console.log('Verified defense coefficient, 400 recovery and per-round recovery counts');
} finally {
    await vite.close();
}
