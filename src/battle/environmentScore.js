import { BattleHero } from './battleHero';
import { BattleManger } from './battleManger';
import { battleMetrics, BATTLE_METRICS } from './statistics';

// 使用战斗引擎的武将属性及队伍加成，读取开战时的速度，不运行随机对战。
export function teamSpeedProfile(build) {
    const manager = Object.create(BattleManger.prototype);
    manager.Record = { pushRecord() {} };
    const positions = ['大营', '中军', '前锋'];
    const team = { hero: build.heros.map((config, index) => {
        const hero = new BattleHero(config, 'blue', manager, build.morale);
        hero.Posname = positions[index];
        hero.applyBowTraitPositionBonuses();
        return hero;
    }) };
    manager.applyFourCampBaseAttributes(team, build.fourCampLevels, 10);
    team.hero.forEach(hero => {
        hero.TeamBonusBaseAttrs = Object.fromEntries(['atk', 'def', 'int', 'spd'].map(key => [key, hero.Attrs[key]]));
        hero.TeamBonusRates = { atk: 0, def: 0, int: 0, spd: 0 };
    });
    manager.applyTroopBonus(team);
    manager.applyCampBonus(team, build.generalPlatformLevel);
    return team.hero.map(hero => ({
        id: hero.Id,
        speed: hero.Attrs.spd,
        firstRoundSpeed: hero.Attrs.spd + (team.fourCampLevels.swift === 10 ? 10 : 0) - (hero.InfantryType === 'heavy' ? 15 : 0)
    })).sort((a, b) => a.id - b.id || a.speed - b.speed || a.firstRoundSpeed - b.firstRoundSpeed);
}

export function sameRosterAndSpeed(build, opponent) {
    if (build.heros.length !== 3 || opponent.heros.length !== 3) return false;
    const own = teamSpeedProfile(build);
    const enemy = teamSpeedProfile(opponent);
    return own.every((hero, index) => hero.id === enemy[index].id &&
        hero.speed === enemy[index].speed && hero.firstRoundSpeed === enemy[index].firstRoundSpeed);
}
export function matchupScore(totals, count) {
    if (!Number.isInteger(count) || count < 1) throw new Error('模拟场次无效');
    return {
        ...battleMetrics(totals),
        ownWounded: totals.ownWounded / count,
        ownDead: totals.ownDead / count,
        enemyWounded: totals.enemyWounded / count,
        enemyDead: totals.enemyDead / count
    };
}

export function weightedEnvironmentScore(rows) {
    const average = key => {
        const valid = rows.filter(row => row[key] !== null);
        const weight = valid.reduce((sum, row) => sum + row.weight, 0);
        if (!weight) return null;
        if (valid.some(row => row[key] === Infinity)) return Infinity;
        return valid.reduce((sum, row) => sum + row[key] * row.weight, 0) / weight;
    };
    return Object.fromEntries(Object.keys(BATTLE_METRICS).map(key => [key, average(key)]));
}

export function simulateMatchupBatch(config, totals, count, ownCamp = 'blue') {
    const originalLog = console.log;
    console.log = () => {};
    try {
        for (let i = 0; i < count; i++) {
            const battle = new BattleManger(config, { records: false });
            const [own, enemy] = ownCamp === 'red'
                ? [battle.RedTeam, battle.BlueTeam]
                : [battle.BlueTeam, battle.RedTeam];
            totals.ownWounded += own.hurtArms;
            totals.ownDead += own.total - own.arms - own.hurtArms;
            totals.enemyWounded += enemy.hurtArms;
            totals.enemyDead += enemy.total - enemy.arms - enemy.hurtArms;
        }
    } finally {
        console.log = originalLog;
    }
}
