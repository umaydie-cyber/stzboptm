import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { validateBuild, parseBuildPresets, serializeBuildPresets } = await vite.ssrLoadModule('/src/buildPresets.js');
    const build = {
        morale: 120, generalPlatformLevel: 8,
        fourCampLevels: { swift: 10, iron: 9, strategy: 8, martial: 7 },
        heros: [1001, 1002, 1012].map(id => ({
            id, level: 50, up: 5, arms: 10000, animation: false,
            equipskill: [1041, 1043],
            extraAttrsAlloc: { atk: 90, def: 0, int: 0, spd: 0 },
            treasure: { id: 'tongsu', xiaorui: 5, kangli: 7, forge: 'yingyong', forgeValue: 10 }
        }))
    };
    const exported = serializeBuildPresets([{ id: 'sample', name: '测试构筑', build }]);
    assert.deepEqual(parseBuildPresets(exported)[0].build, build);
    const copy = validateBuild(build);
    copy.heros[0].equipskill[0] = 0;
    assert.equal(build.heros[0].equipskill[0], 1041);
    assert.throws(() => parseBuildPresets('{"version":1,"presets":[{"name":"坏数据","build":{}}]}'));
    console.log('Verified preset JSON round trip, treasure data, independent copies and import validation');
} finally {
    await vite.close();
}
