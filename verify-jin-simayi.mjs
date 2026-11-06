import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const records = [];
    const manager = {
        Round: 0, Over: false,
        addStat() {},
        Record: {
            pushRecord: (...args) => records.push({ type: 'record', args }),
            pushActionRecord: (...args) => records.push({ type: 'action', args })
        },
        BlueTeam: { hero: [] }, RedTeam: { hero: [] }
    };
    const make = (id, camp) => new BattleHero({ id, level: 50, up: 0, extraAttrsAlloc: {}, equipskill: [] }, camp, manager, 100);
    const simayi = make(1022, 'blue');
    const xunyu = make(1016, 'blue');
    const enemies = [make(1018, 'red'), make(1020, 'red'), make(1015, 'red')];
    manager.BlueTeam.hero.push(simayi, xunyu);
    manager.RedTeam.hero.push(...enemies);
    assert.equal(simayi.Skills[1049].name, '其徐如林');
    simayi.Attrs.int = 380;
    simayi.Skills[1049].callskill(simayi);
    xunyu.Arms = 10400;
    xunyu.Attrs.int = 331;
    enemies.forEach(enemy => enemy.Arms = 10400);
    const sourceSkill = xunyu.Skills[1035];
    manager.Round = 2;
    const events = [];
    for (const enemy of enemies) {
        const original = enemy.beHurt.bind(enemy);
        enemy.beHurt = (attacker, info, skill) => {
            events.push({ enemy, attacker, info, skill });
            return original(attacker, info, skill);
        };
    }
    enemies[1].beHurt(xunyu, { type: 2, rate: 153 }, sourceSkill);
    assert.equal(events.length, 3);
    assert.equal(events[0].enemy, enemies[1]);
    assert.deepEqual(events.slice(1).map(e => e.enemy), [enemies[0], enemies[2]]);
    assert.ok(events.slice(1).every(e => e.attacker === xunyu && e.skill.id === 1049 && e.info.isStrategySplash));
    assert.ok(events.slice(1).every(e => Math.abs(e.info.rate / 153 - 0.4031131555) < 1e-8));
    const splashRecords = records.filter(record => record.type === 'action' && String(record.args[2]).includes('其徐如林'));
    assert.equal(splashRecords.length, 2);
    assert.ok(splashRecords.every(record => record.args[0] === simayi));
    assert.ok(splashRecords.every(record => String(record.args[2]).includes('【荀彧】的')));
    const fireSkill = __SKILLS__.find(skill => skill.name === '火势风威');
    enemies[1].beHurtByNum(xunyu, { type: 4, rate: 221 }, fireSkill, 300);
    assert.equal(events.length, 6);
    assert.ok(events.slice(4).every(e => e.info.isStrategySplash && Math.abs(e.info.rate / 221 - 0.4031131555) < 1e-8));
    const before = events.length;
    enemies[0].beHurt(xunyu, { type: 2, rate: 153 }, sourceSkill);
    enemies[2].beHurt(xunyu, { type: 2, rate: 153 }, sourceSkill);
    assert.equal(events.filter(e => e.enemy === enemies[1]).length, 4);
    assert.equal(events.length, before + 4);
    console.log('Verified direct and burning strategy splash, overlapping neighbors, and no recursive splash');
} finally {
    await vite.close();
}
