// 与战斗统计相同：武勋按伤兵＋死亡，战损按死亡计算。
export function matchupScore(totals, count) {
    if (!Number.isInteger(count) || count < 1) throw new Error('模拟场次无效');
    const ratio = (caused, suffered) => suffered === 0 ? (caused === 0 ? null : Infinity) : caused / suffered;
    return {
        merit: ratio(totals.enemyWounded + totals.enemyDead, totals.ownWounded + totals.ownDead),
        loss: ratio(totals.enemyDead, totals.ownDead),
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
    return { merit: average('merit'), loss: average('loss') };
}

export function scoreLabel(value) {
    return value === null ? '—' : value === Infinity ? '∞' : value.toFixed(2);
}
