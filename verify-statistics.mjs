import assert from 'node:assert/strict';
import { summarizeBattles } from './src/battle/statistics.js';

const battle = (Round, wounded, arms = 8000) => ({
    Round,
    BlueTeam: { hurtArms: wounded, arms, total: 10000 },
    RedTeam: { hurtArms: wounded, arms, total: 10000 },
    Stats: { blue: {}, red: {} }
});

const summary = summarizeBattles([
    battle(3, 1000),
    battle(5, 2000),
    battle(8, 3000)
]);

assert.equal(summary.count, 3);
assert.equal(summary.averageRounds, 16 / 3);
assert.equal(summary.blue.wounded, 2000);
assert.equal(summary.red.wounded, 2000);
console.log('Verified average battle rounds and existing battle summary values');
