import { matchupScore, simulateMatchupBatch } from './environmentScore';

self.onmessage = ({ data: { index, config, battlesPerOpponent, ownCamp } }) => {
    try {
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
