import assert from 'node:assert/strict';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { __HEROS__ } = await vite.ssrLoadModule('/src/battle/heros.js');
    const { __SKILLS__ } = await vite.ssrLoadModule('/src/battle/skills.js');
    const { BattleHero } = await vite.ssrLoadModule('/src/battle/battleHero.js');
    const yuan = __HEROS__.find(hero => hero.name === '袁术');
    const skill = __SKILLS__.find(item => item.id === yuan.skill);
    assert.deepEqual([yuan.camp, yuan.star, yuan.cost, yuan.army, yuan.limit], [5, 5, 35, 2, 2]);
    assert.equal(skill.name, '僭号天子');
    const records = [];
    const manager = {
        Round: 0, Over: false,
        Record: { Records: records, pushRecord(_hero, message) { records.push({ message }); },
            pushActionRecord(_source, _target, _prefix, message) { records.push({ message }); } },
        addStat() {}
    };
    const config = id => ({ id, level: 1, up: 0, arms: 10000, equipskill: [0, 0],
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 } });
    const source = new BattleHero(config(yuan.id), 'blue', manager, 100);
    const ally = new BattleHero(config(1003), 'blue', manager, 100);
    const lvMeng = new BattleHero(config(1009), 'red', manager, 100);
    manager.BlueTeam = { hero: [source, ally] };
    manager.RedTeam = { hero: [lvMeng] };
    source.Attrs.def = 200;
    skill.callskill(source);
    assert.equal(ally.Storage.yuxi.rate, 52);

    manager.Round = 1;
    ally.beHurtByNum(lvMeng, { type: 2, rate: 215, ignoreEvasion: true }, lvMeng.Skills[1021], 1000);
    assert.equal(ally.Arms, 9520); // 白衣渡江等预计算指挥伤害也被玉玺承接。
    assert.equal(source.Storage.yuxiAbsorbed, 520);

    manager.Round = 2;
    source.Storage.maliangReduction = { round: 2, value: 9999, source: ally };
    const previous = source.Storage.yuxiAbsorbed;
    source.Storage.yuxiAbsorbed = 0;
    source.beHurt(source, { type: 5, yuxiSettlement: true, ignoreEvasion: true }, skill,
        Math.round(previous * 0.5));
    assert.equal(source.Arms, 9875); // 260伤害再次承接135，袁术仅受125。
    assert.equal(source.Storage.yuxiAbsorbed, 135);
    source.Attrs.def = 580;
    skill.callskill(source);
    assert.equal(ally.Storage.yuxi.rate, 90);
    assert.ok(records.some(record => record.message?.includes('玉玺')));
    console.log('Verified Yuan Shu, command damage absorption and repeated seal settlement');
} finally {
    await vite.close();
}
