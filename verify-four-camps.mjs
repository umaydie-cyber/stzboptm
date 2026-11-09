import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
    const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
    const manager = Object.create(BattleManger.prototype);
    const hero = (name = '测试武将', army = 1) => ({
        Name: name,
        BisicArm: army,
        Attrs: { atk: 100, def: 200, int: 300, spd: 400 },
        OriginAttrs: { atk: 100, def: 200, int: 300, spd: 400 },
        Storage: {},
        State: {},
        Treasure: null,
        Manger: { Round: 1 }
    });

    const levelTeam = { hero: [hero()] };
    manager.applyFourCampBaseAttributes(levelTeam, { swift: 1, iron: 2, strategy: 3, martial: 4 });
    assert.deepEqual(levelTeam.hero[0].Attrs, { atk: 108, def: 204, int: 306, spd: 402 });

    const maxTeam = { hero: [hero('甲'), hero('乙'), hero('丙')] };
    manager.applyFourCampBaseAttributes(maxTeam, { swift: 10, iron: 10, strategy: 10, martial: 10 });
    const originalRandom = Math.random;
    Math.random = () => 0;
    try {
        manager.applyFourCampSpecials(maxTeam);
    } finally {
        Math.random = originalRandom;
    }
    assert.deepEqual(maxTeam.hero[0].Attrs, { atk: 120, def: 220, int: 320, spd: 420 });
    assert.equal(maxTeam.hero[0].Storage.ironCampFirstDamageImmunity, true);
    assert.equal(maxTeam.hero[0].Storage.martialCampIgnoreFirstCounter, true);
    assert.equal(maxTeam.hero[0].Storage.strategyCampInsight, true);
    assert.equal(maxTeam.hero.slice(1).some(unit => unit.Storage.strategyCampInsight), false);
    assert.equal(maxTeam.fourCampSpecials.strategy, maxTeam.hero[0]);
    assert.ok(maxTeam.hero.every(unit => unit.Storage.swiftCampFirstRoundSpeed === 10));

    const nineTeam = { hero: [hero()] };
    manager.applyFourCampBaseAttributes(nineTeam, { swift: 9, iron: 9, strategy: 9, martial: 9 });
    manager.applyFourCampSpecials(nineTeam);
    assert.deepEqual(nineTeam.fourCampSpecials, {});
    assert.deepEqual(nineTeam.hero[0].Storage, {});

    const damageHero = (name, army, bonus = 0) => ({
        ...hero(name, army),
        getDamageStateValue: state => state === 'attackDamageAdd' ? bonus : 0
    });
    const attacker = damageHero('弓兵', 1, 20);
    const target = damageHero('步兵', 2);
    const countered = { type: 1 };
    assert.equal(getDamageAddition(attacker, target, countered, null), 0.9);
    assert.equal(countered.damageModifiers.total, -10);
    assert.deepEqual(countered.damageModifiers.entries.find(entry => entry.name === '兵种相克')?.value, -30);
    const ignored = { type: 1, ignoreTroopCounter: true };
    assert.equal(getDamageAddition(attacker, target, ignored, null), 1.2);
    assert.equal(ignored.damageModifiers.entries.some(entry => entry.name === '兵种相克'), false);

    console.log('Verified Four Camps levels, level-10-only specials and additive troop counter damage modifier');
} finally {
    await vite.close();
}
