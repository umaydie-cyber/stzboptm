export function summarizeBattles(battles) {
    const result = { count: battles.length, blue: {}, red: {} };
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
    return result;
}

export function ratio(value, other) {
    if (!other) return value ? '∞' : '—';
    return (value / other).toFixed(2);
}
