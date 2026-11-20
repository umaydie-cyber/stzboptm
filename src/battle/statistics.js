export const BATTLE_METRICS = {
    efficiency: '武勋效率',
    loss: '战损比',
    merit: '武勋比'
};

export const DEFAULT_EVALUATION_METRIC = 'efficiency';

export function battleMetrics({ ownWounded, ownDead, enemyWounded, enemyDead }) {
    const ratio = (caused, suffered) => suffered === 0 ? (caused === 0 ? null : Infinity) : caused / suffered;
    const enemyCasualties = enemyWounded + enemyDead;
    return {
        efficiency: ratio(enemyCasualties, ownDead),
        loss: ratio(enemyDead, ownDead),
        merit: ratio(enemyCasualties, ownWounded + ownDead)
    };
}

export function scoreLabel(value) {
    return value === null ? '—' : value === Infinity ? '∞' : value.toFixed(2);
}

export function summarizeBattles(battles) {
    const result = {
        count: battles.length,
        averageRounds: battles.reduce((sum, battle) => sum + Number(battle.Round || 0), 0) / battles.length,
        blue: {},
        red: {}
    };
    for (const camp of ['blue', 'red']) {
        const rows = battles.map(battle => {
            const team = camp === 'blue' ? battle.BlueTeam : battle.RedTeam;
            return { wounded: team.hurtArms, dead: team.total - team.arms - team.hurtArms };
        });
        const average = key => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
        const deviation = (key, mean) => Math.sqrt(rows.reduce((sum, row) => sum + (row[key] - mean) ** 2, 0) / rows.length);
        const wounded = average('wounded');
        const dead = average('dead');
        const skills = {};
        for (const battle of battles) {
            for (const [key, item] of Object.entries(battle.Stats[camp])) {
                const row = skills[key] ||= { ...item, damage: 0, recovery: 0 };
                row.damage += item.damage;
                row.recovery += item.recovery;
            }
        }
        result[camp] = {
            wounded, dead, woundedStd: deviation('wounded', wounded), deadStd: deviation('dead', dead),
            skills: Object.values(skills).map(item => ({ ...item, damage: item.damage / battles.length, recovery: item.recovery / battles.length }))
        };
    }
    result.metrics = battleMetrics({
        ownWounded: result.blue.wounded,
        ownDead: result.blue.dead,
        enemyWounded: result.red.wounded,
        enemyDead: result.red.dead
    });
    return result;
}
