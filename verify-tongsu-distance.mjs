import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { getDamageAddition } = await vite.ssrLoadModule('/src/battle/battleCalcFunc.js');
  const make = (index, camp, treasure = null) => ({
    Index: index, BattleCamp: camp, Name: `${camp}-${index}`, Treasure: treasure,
    State: {}, Storage: {}, getDamageStateValue: () => 0
  });
  const blue = [1, 2, 3].map(index => make(index, 'blue'));
  const red = [6, 5, 4].map(index => make(index, 'red'));
  const manager = { Round: 1, BlueTeam: { hero: blue }, RedTeam: { hero: red } };
  for (const hero of [...blue, ...red]) hero.Manger = manager;
  blue[0].Treasure = { id: 'tongsu', xiaorui: 1, kangli: 1 };
  for (const [target, expected] of [[red[2], 9], [red[1], 12], [red[0], 15]]) {
    const info = { type: 1 };
    getDamageAddition(blue[0], target, info, null);
    assert.equal(info.damageModifiers.entries.find(entry => entry.name === '彤素·奇袭')?.value, expected);
  }
  red[0].Treasure = { id: 'tongsu', xiaorui: 1, kangli: 1 };
  const info = { type: 1 };
  getDamageAddition(red[0], blue[0], info, null);
  assert.equal(info.damageModifiers.entries.find(entry => entry.name === '彤素·奇袭')?.value, 15);
  console.log('Verified 彤素·奇袭 distance bonuses: 9%, 12%, 15% and reverse 15%');
} finally {
  await vite.close();
}
