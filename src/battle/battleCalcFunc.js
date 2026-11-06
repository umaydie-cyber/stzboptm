/**
 * 战斗相关计算方法
 */

import { keepTwoDecimal, roundEightNine } from "../uilts";

// 计算物理伤害
export const clacAttackDamage = (attacker, target, damageInfo, skill) => {
    let damageAddition = getDamageAddition(attacker, target, damageInfo, skill);


    let DamageRate = damageInfo.rate;
    // 兵力基础伤害
    let armsDamage = (attacker.Arms * 373) / (7700 + attacker.Arms);
    damageInfo.troopBaseDamage = armsDamage;
    //攻击基础伤害
    let basicDamage = attacker.Attrs.atk * getRandNum() * (DamageRate / 100) * damageAddition;
    //主要伤害
    let targetDef = target.Attrs.def;
    if (attacker.Treasure?.forge === 'podi') targetDef *= 1 - attacker.Treasure.forgeValue / 100;
    if (skill && skill.id == 1011) {
        targetDef = 0;
    }
    let atkdefdiff = calcAtkDefDiff(attacker.Attrs.atk, targetDef);
    let mainDamage = (((300 * attacker.Arms) / (3500 + attacker.Arms)) * (DamageRate / 100) * damageAddition) * atkdefdiff;
    console.log(attacker.Name, "兵力基础伤害:", armsDamage, "兵力:", attacker.Arms, "基础伤害:", basicDamage, "主要伤害:", mainDamage, "总伤害:", Math.round(armsDamage + basicDamage + mainDamage));
    // if (skill && skill.id == 1011) {
    //     console.log(atkdefdiff, "陈到攻防", attacker.Attrs.atk, mainDamage);
    // }
    return Math.round(armsDamage + basicDamage + mainDamage);
}

// 计算策略伤害
export const clacInteDamage = (attacker, target, damageInfo, skill) => {
    let damageAddition = getDamageAddition(attacker, target, damageInfo, skill);

    let DamageRate = damageInfo.rate * getLianweiWave(attacker);
    const ignoreIntelRate = attacker.Storage.weiyuRepeat?.skill === skill ? attacker.Storage.weiyuRepeat.ignoreIntelRate : 0;
    let inteEffect = calcInteEffect(target.Attrs.int * (1 - ignoreIntelRate / 100));

    //兵力基础伤害
    let armsDamage = (attacker.Arms * 178) / (6459 + attacker.Arms);
    damageInfo.troopBaseDamage = armsDamage;
    //策略基础伤害
    let basicDamage = attacker.Attrs.int * 0.5 * damageAddition * inteEffect;
    //主要伤害
    let mainDamage = (((300 * attacker.Arms) / (3500 + attacker.Arms)) * (DamageRate / 100) * damageAddition) * inteEffect;

    console.log(attacker.Name, "兵力基础伤害:", armsDamage, "兵力:", attacker.Arms, "策略基础伤害:", basicDamage, "主要伤害:", mainDamage, "总伤害:", Math.round(armsDamage + basicDamage + mainDamage));

    return Math.round(armsDamage + basicDamage + mainDamage);
}

// 计算燃烧/恐慌/妖术伤害
export const clacInte2Damage = (attacker, target, damageInfo, skill) => {
    let damageAddition = getDamageAddition(attacker, target, damageInfo, skill);

    let DamageRate = damageInfo.rate * getLianweiWave(attacker);
    let inteEffect = calcInteEffect(target.Attrs.int);;

    //兵力基础伤害
    let armsDamage = (attacker.Arms * 178) / (6459 + attacker.Arms);
    armsDamage = armsDamage * (1 / 3);
    damageInfo.troopBaseDamage = armsDamage;
    //策略基础伤害
    let basicDamage = attacker.Attrs.int * 0.25 * damageAddition * inteEffect;
    //主要伤害
    let mainDamage = (((300 * attacker.Arms) / (3500 + attacker.Arms)) * (DamageRate / 100) * damageAddition) * inteEffect;

    console.log(attacker.Name, "兵力基础伤害:", armsDamage, "兵力:", attacker.Arms, "策略基础伤害:", basicDamage, "主要伤害:", mainDamage, "总伤害:", Math.round(armsDamage + basicDamage + mainDamage));

    return Math.round(armsDamage + basicDamage + mainDamage);
}

// 计算受属性影响的战法的倍率
/*
    base 基础值
    grow 每1点属性值对应增加的倍率
    value 属性值
*/
export const clacSkillAdditionRate = (base, grow, value) => {
    if (value < 80) {
        return Math.round(base * 0.4 + ((base * 0.6) * (value / 80)));
    } else {
        return Math.round(base + (grow * (value - 80)));
    }
}

// 获得伤害随机数
const getRandNum = () => {
    const rand = [0.3, 0.31, 0.32, 0.33, 0.34, 0.35, 0.36, 0.37, 0.38, 0.39];
    return rand[Math.floor(Math.random() * rand.length)];
}

// 指挥阶段计算白衣渡江快照时也在此抽取伤害率波动。
const getLianweiWave = (attacker) => {
    const effect = attacker.Storage.lianweiQiongji;
    if (!effect) return 1;
    const elapsed = Math.min(6, Math.max(0, attacker.Manger.Round));
    const minimum = 80 + (effect.finalMax - 80) * elapsed / 6;
    const maximum = effect.max + (effect.finalMax - effect.max) * elapsed / 6;
    const multiplier = (elapsed === 6 ? effect.finalMax : minimum + Math.random() * (maximum - minimum)) / 100;
    const detail = elapsed === 6
        ? `固定为${effect.finalMax}%（不再波动）`
        : `波动至${Number((multiplier * 100).toFixed(2))}%（范围${Number(minimum.toFixed(2))}%～${Number(maximum.toFixed(2))}%）`;
    attacker.Manger.Record.pushRecord(attacker, `的【敛微穷极】策略伤害率${detail}`, 1);
    return multiplier;
}

// 计算伤害增减
export const getDamageAddition = (attacker, target, damageInfo, skill) => {
    const type = damageInfo.type;
    let value = 100;
    const entries = [];
    const addStateEntries = (hero, name, sign) => {
        for (const state of Object.values(hero.State?.[name] || {})) {
            if (!state || !Number.isFinite(state.value)) continue;
            entries.push({ name: state.from?.name || name, hero: state.hero?.Name || hero.Name, value: sign * state.value });
        }
    };
    const add = (hero, name, sign) => {
        value += sign * hero.getDamageStateValue(name);
        addStateEntries(hero, name, sign);
    };
    const special = (name, amount, hero = attacker) => {
        value += amount;
        entries.push({ name, hero: hero.Name, value: amount });
    };
    if (type == 1 || type == 3) {
        add(attacker, "attackDamageAdd", 1);
        add(attacker, "attackDamageSub", -1);
        add(target, "beAttackDamageAdd", 1);
        add(target, "beAttackDamageSub", -1);
    } else if (type == 2 || type == 4) {
        add(attacker, "inteDamageAdd", 1);
        for (const bonus of Object.values(attacker.Storage.jiuzhanBonuses || {})) {
            entries.push({ name: '久战熟谋', hero: attacker.Name, value: bonus.layers * bonus.perLayer });
        }
        const lianwei = attacker.Storage.lianweiQiongji;
        if (lianwei) {
            const elapsed = Math.min(6, Math.max(0, (attacker.Manger.Round || 1) - 1));
            special('敛微穷极', lianwei.bonus * (1 - elapsed / 6), lianwei.source);
        }
        add(attacker, "inteDamageSub", -1);
        add(target, "beInteDamageAdd", 1);
        add(target, "beInteDamageSub", -1);
        if (type == 2) {
            if (target.State.nextInteDamageSub?.value) special(target.State.nextInteDamageSub.from?.name || '下一次策略减伤', -target.State.nextInteDamageSub.value, target);
            const taoyuan = target.Storage.taoyuanStrategyReduction;
            if (!damageInfo.ignoreTaoyuan && taoyuan && target.Manger.Round >= 1 && target.Manger.Round <= 3 && taoyuan.remaining > 0) special('桃源问津', -9999, target);
        }
    }

    if (skill && skill.type == 2){
        add(attacker, "activeDamageAdd", 1);
        add(attacker, "activeDamageSub", -1);
        add(target, "beActiveDamageAdd", 1);
        add(target, "beActiveDamageSub", -1);
    }
    if (skill?.type === 3 && attacker.Storage.shiwuPursuitBonus) special('势无虚动', attacker.Storage.shiwuPursuitBonus);
    if (attacker.Treasure) {
        if (skill && [2, 3].includes(skill.type)) special('彤素·亢厉', attacker.Treasure.kangli);
        if (type === 1) {
            special('彤素·奇袭', Math.abs(attacker.Index - target.Index) * 3);
        }
        if (skill?.type === 2 && attacker.Treasure.forge === 'zhice') special('彤素·至策', attacker.Treasure.forgeValue);
    }
    if (skill?.type === 2 && target.Treasure?.forge === 'jianren') special('彤素·坚忍', -target.Treasure.forgeValue, target);

    if (target.Storage.chuewujin && target.Manger.Round >= 1 && target.Manger.Round <= 3 && target.isAttackLimit()) special('除恶务尽', -30, target);
    const qiqin = attacker.Storage.qiqinAllDamageSub;
    if (!damageInfo.ignoreQiqin && qiqin?.round === attacker.Manger.Round) special('七擒七纵', -qiqin.value, qiqin.source);
    if (damageInfo.jianzuReduction) special('健卒不殆', -50, target);
    if (type === 1 && damageInfo.isBasicAttack && !damageInfo.isSplitAttack && attacker.Storage.henge) special('横轭', 50);

    if (value < 10) entries.push({ name: '增减伤下限', hero: '', value: 10 - value });
    if (value < 10) value = 10;
    damageInfo.damageModifiers = { total: Number((value - 100).toFixed(2)), entries };
    return value / 100;
}

// 计算攻防差
const calcAtkDefDiff = (atk, def) => {
    let diff = atk - def;
    if (diff >= 0) {
        return keepTwoDecimal(3 - (500 / (250 + diff)))
    } else {
        return keepTwoDecimal(100 / (100 - diff))
    }
}

//计算谋略影响
const calcInteEffect = (inte) => {
    inte = Math.floor(inte)
    if (inte <= 50) {
        return 1;
    } else {
        return Math.ceil(100 - (75 - (9375 / (75 + inte)))) / 100;
    }
}

// 计算恢复
export const calcRecover = (self, rate, growRate, type = 1, snapshotInt = self.OriginAttrs.int) => {
    if(type == 1){
        return Math.floor(Math.round((self.OriginAttrs.arms * 300) / (3500 + self.OriginAttrs.arms)) * calcRecoverRate(snapshotInt, rate, growRate) * 1); // 1为造成的恢复效果提升值 暂无实现计算提升值
    }else{
        return Math.floor(Math.round((self.Arms * 300) / (3500 + self.Arms)) * calcRecoverRate(self.Attrs.int, rate, growRate) * 1); // 1为造成的恢复效果提升值 暂无实现计算提升值
    }
}

const calcRecoverRate = (int, rate, growRate) => {
    // let int = self.OriginAttrs.int;
    // 给定的恢复率为80谋略时的值 所以减去80
    int -= 80;

    let additionRate = Math.floor(int * growRate);

    return keepTwoDecimal((rate + additionRate) / 100);
}

// let xorshift = (function() {
//     let x = 123456789;
//     let y = 362436069;
//     let z = 521288629;
//     let w = 88675123;

//     return function() {
//         let t = (x ^ (x << 11));
//         x = y;
//         y = z;
//         z = w;
//         w = (w ^ (w >>> 19)) ^ (t ^ (t >>> 8));
//         return w;
//     };
// })();

// function getRandomBool(probability){
//     return (xorshift() / 0xFFFFFFFF) < probability;
// }

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function getRandomBool(probability) {
    let results = [];
    for (let i = 0; i < 100; i++) {
        results.push(i < probability);
    }
    results = shuffleArray(results);
    return results[Math.floor(Math.random() * 100)];
}

export function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

