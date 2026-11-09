import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
    const manager = Object.create(BattleManger.prototype);
    const hero = army => ({
        BisicArm: army,
        Attrs: { atk: 100, def: 200, int: 300, spd: 400 },
        OriginAttrs: { atk: 100, def: 200, int: 300, spd: 400 }
    });

    const cases = [
        [1, { atk: 100, def: 220, int: 300, spd: 440 }, '3弓兵加成：防御+10%，速度+10%'],
        [2, { atk: 110, def: 220, int: 300, spd: 400 }, '3步兵加成：防御+10%，攻击+10%'],
        [3, { atk: 110, def: 200, int: 300, spd: 440 }, '3骑兵加成：攻击+10%，速度+10%']
    ];
    for (const [army, expectedAttrs, expectedDescription] of cases) {
        const team = { hero: [hero(army), hero(army), hero(army)] };
        manager.applyTroopBonus(team);
        assert.deepEqual(team.hero[0].Attrs, expectedAttrs);
        assert.deepEqual(team.hero[0].OriginAttrs, expectedAttrs);
        assert.equal(manager.getTroopBonusDescription(team), expectedDescription);
    }

    const pairCases = [
        [1, { atk: 100, def: 210, int: 300, spd: 420 }, '2弓兵加成：防御+5%，速度+5%（仅作用于2名弓兵武将）'],
        [2, { atk: 105, def: 210, int: 300, spd: 400 }, '2步兵加成：防御+5%，攻击+5%（仅作用于2名步兵武将）'],
        [3, { atk: 105, def: 200, int: 300, spd: 420 }, '2骑兵加成：攻击+5%，速度+5%（仅作用于2名骑兵武将）']
    ];
    for (const [army, expectedAttrs, expectedDescription] of pairCases) {
        const otherArmy = army === 1 ? 2 : 1;
        const team = { hero: [hero(army), hero(army), hero(otherArmy)] };
        manager.applyTroopBonus(team);
        assert.deepEqual(team.hero[0].Attrs, expectedAttrs);
        assert.deepEqual(team.hero[1].Attrs, expectedAttrs);
        assert.deepEqual(team.hero[2].Attrs, { atk: 100, def: 200, int: 300, spd: 400 });
        assert.equal(manager.getTroopBonusDescription(team), expectedDescription);
    }

    const mixedTeam = { hero: [hero(1), hero(2), hero(3)] };
    manager.applyTroopBonus(mixedTeam);
    assert.deepEqual(mixedTeam.hero[0].Attrs, { atk: 100, def: 200, int: 300, spd: 400 });
    assert.equal(manager.getTroopBonusDescription(mixedTeam), '兵种加成：未触发（需至少2名同兵种武将）');

    const campHero = (camp, name, skills = []) => ({ ...hero(1), Camp: camp, Name: name, SkillsOrder: skills });
    const pairCamp = { hero: [campHero(1, '刘备'), campHero(1, '关羽'), campHero(2, '曹操')] };
    manager.applyCampBonus(pairCamp, 1);
    assert.deepEqual(pairCamp.hero[0].Attrs, { atk: 103.5, def: 207, int: 310.5, spd: 414 });
    assert.deepEqual(pairCamp.hero[1].Attrs, { atk: 103.5, def: 207, int: 310.5, spd: 414 });
    assert.deepEqual(pairCamp.hero[2].Attrs, { atk: 100, def: 200, int: 300, spd: 400 });
    assert.equal(manager.getCampBonusDescription(pairCamp), '阵营加成（点将台1级）：2名蜀阵营武将，攻击、防御、谋略、速度+3.5%（仅作用于刘备、关羽）');

    const fullCamp = { hero: [campHero(2, '甲'), campHero(2, '乙'), campHero(2, '丙')] };
    manager.applyCampBonus(fullCamp, 10);
    assert.deepEqual(fullCamp.hero[0].Attrs, { atk: 110, def: 220, int: 330, spd: 440 });
    assert.equal(manager.getCampBonusDescription(fullCamp), '阵营加成（点将台10级）：3名魏阵营武将，攻击、防御、谋略、速度+10%');

    const levelZeroCamp = { hero: [campHero(3, '甲'), campHero(3, '乙'), campHero(1, '丙')] };
    manager.applyCampBonus(levelZeroCamp, 0);
    assert.deepEqual(levelZeroCamp.hero[0].Attrs, { atk: 103, def: 206, int: 309, spd: 412 });

    const differentCamps = { hero: [campHero(1, '甲'), campHero(2, '乙'), campHero(3, '丙')] };
    manager.applyCampBonus(differentCamps, 10);
    assert.equal(manager.getCampBonusDescription(differentCamps), '阵营加成（点将台10级）：未触发（三名武将阵营均不同）');

    const disabledCamp = { hero: [campHero(1, '甲', [1078]), campHero(1, '乙'), campHero(1, '丙')] };
    manager.applyCampBonus(disabledCamp, 10);
    assert.deepEqual(disabledCamp.hero[0].Attrs, { atk: 100, def: 200, int: 300, spd: 400 });
    assert.equal(manager.getCampBonusDescription(disabledCamp), '阵营加成（点将台10级）：受【合纵连横】影响，未生效');

    const combinedBonuses = { hero: [campHero(1, '甲'), campHero(1, '乙'), campHero(1, '丙')] };
    manager.applyTeamBonuses(combinedBonuses, 10);
    assert.deepEqual(combinedBonuses.hero[0].Attrs, { atk: 110, def: 240, int: 330, spd: 480 });

    const records = [];
    manager.Record = {
        pushSysRecord: msg => records.push(msg),
        pushRecord: (unit, msg) => records.push(`【${unit.Name}】${msg}`)
    };
    const settledTeam = { hero: [{ ...hero(3), Name: '测试武将', Posname: '大营' }] };
    manager.recordSettledAttrs('攻方', settledTeam);
    assert.deepEqual(records, [
        '【攻方结算后武将属性】',
        '【测试武将】（大营）攻击 100，谋略 300，防御 200，速度 400'
    ]);
    console.log('Verified troop bonuses, camp bonuses, platform levels and additive stacking');
} finally {
    await vite.close();
}
