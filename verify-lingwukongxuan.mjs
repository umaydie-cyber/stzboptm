import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const skill = __SKILLS__.find(s => s.name === '令无空悬');
    assert.deepEqual([skill.type, skill.level, skill.rate, skill.limit], [4, 'A', '--', 1]);
    const hooks = {};
    const self = {
        Storage: {}, Manger: { Round: 1, Record: { pushRecord() {} } },
        addHook(_on, name, fn) { hooks[name] = fn; }
    };
    skill.callskill(self);
    hooks['令无空悬奇数回合发动率']();
    assert.equal(self.Storage.lingwukongxuanRateRound, 1);
    for (let i = 0; i < 5; i++) hooks['令无空悬蓄势']({ type: 2 });
    assert.equal(self.Storage.lingwukongxuanStacks, 4);
    hooks['令无空悬蓄势']({ type: 3 });
    assert.equal(self.Storage.lingwukongxuanStacks, 4);
    self.Manger.Round = 2;
    hooks['令无空悬奇数回合发动率']();
    assert.equal(self.Storage.lingwukongxuanRateRound, 0);
    self.Manger.Round = 7;
    hooks['令无空悬奇数回合发动率']();
    assert.equal(self.Storage.lingwukongxuanRateRound, 7);
    console.log('Verified Ling Wu Kong Xuan odd rounds and four stack cap');
} finally {
    await vite.close();
}
