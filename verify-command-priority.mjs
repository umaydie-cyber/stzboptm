import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const originalLog = console.log;
try {
    console.log = () => {};
    const { BattleManger } = await vite.ssrLoadModule('/src/battle/battleManger.js');
    const hero = (id, equipskill = []) => ({
        id, level: 40, up: 5, arms: 10000, equipskill,
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 }
    });
    const battle = new BattleManger({
        blue: { morale: 100, heros: [hero(1022, [1016])] },
        red: { morale: 100, heros: [hero(1012)] }
    });
    const records = battle.Record.Records;
    const indexOf = text => records.findIndex(record => String(record.msg).includes(text));
    const priority = indexOf('指挥优先特性生效');
    const qixu = indexOf('发动【其徐如林】');
    const jinkui = indexOf('发动【金匮要略】');
    const weiwu = indexOf('发动【魏武之世】');

    assert.ok(priority >= 0, '战报注明司马懿的指挥优先特性');
    assert.ok(priority < qixu, '特性说明在司马懿指挥战法前显示');
    assert.ok(qixu < weiwu, '司马懿自带指挥先于曹操生效');
    assert.ok(jinkui < weiwu, '司马懿携带的指挥战法也先于曹操生效');
    console.log = originalLog;
    console.log('Verified Sima Yi command priority and battle report annotation');
} finally {
    console.log = originalLog;
    await vite.close();
}
