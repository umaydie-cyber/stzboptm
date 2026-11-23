import { matchupScore, simulateMatchupBatch } from './environmentScore';
import { BattleManger } from './battleManger';
import { summarizeBattles } from './statistics';

const teamSnapshot = ({ arms, hurtArms, total }) => ({ arms, hurtArms, total });

function simulateWithStatistics(config, count) {
    const battles = [];
    const originalLog = console.log;
    console.log = () => {};
    try {
        for (let i = 0; i < count; i++) {
            const battle = new BattleManger(config, { records: false });
            const { Round, BlueTeam, RedTeam, Stats } = battle;
            battles.push({ Round, BlueTeam: teamSnapshot(BlueTeam), RedTeam: teamSnapshot(RedTeam), Stats });
        }
    } finally {
        console.log = originalLog;
    }
    return summarizeBattles(battles);
}

self.onmessage = ({ data: { index, config, battlesPerOpponent, ownCamp, collectStatistics } }) => {
    try {
        if (collectStatistics) {
            self.postMessage({ index, advanced: battlesPerOpponent, row: simulateWithStatistics(config, battlesPerOpponent) });
            return;
        }
        const totals = { ownWounded: 0, ownDead: 0, enemyWounded: 0, enemyDead: 0 };
        let reported = 0;
        let lastUpdate = performance.now();
        for (let completed = 0; completed < battlesPerOpponent;) {
            const count = Math.min(25, battlesPerOpponent - completed);
            simulateMatchupBatch(config, totals, count, ownCamp);
            completed += count;
            const now = performance.now();
            if (completed < battlesPerOpponent && now - lastUpdate >= 150) {
                self.postMessage({ advanced: completed - reported });
                reported = completed;
                lastUpdate = now;
            }
        }
        self.postMessage({
            index,
            advanced: battlesPerOpponent - reported,
            row: matchupScore(totals, battlesPerOpponent)
        });
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};
