/**
 * 战斗相关计算方法
 */

import { keepTwoDecimal, roundEightNine } from "../uilts";

// 计算物理伤害
export const clacAttackDamage = (attacker, target, damageInfo, skill) => {
    let damageAddition = getDamageAddition(attacker, target, damageInfo, skill);

    if (damageAddition != 1) {
        attacker.Manger.Record.pushRecord(attacker, `该次造成伤害共计${damageAddition > 1 ? "提升" : "降低"}${Math.abs(roundEightNine(damageAddition * 100 - 100))}%`, 1)
    }

    let DamageRate = damageInfo.rate;
    // 兵力基础伤害
    let armsDamage = (attacker.Arms * 373) / (7700 + attacker.Arms);
    damageInfo.troopBaseDamage = armsDamage;
    //攻击基础伤害
    let basicDamage = attacker.Attrs.atk * getRandNum() * (DamageRate / 100) * damageAddition;
    //主要伤害
    let targetDef = target.Attrs.def;
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

    if (damageAddition != 1) {
        attacker.Manger.Record.pushRecord(attacker, `该次造成伤害共计${damageAddition > 1 ? "提升" : "降低"}${Math.abs(roundEightNine(damageAddition * 100 - 100))}%`, 1)
    }
    let DamageRate = damageInfo.rate * getLianweiWave(attacker);
    let inteEffect = calcInteEffect(target.Attrs.int);;

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

    if (damageAddition != 1) {
        attacker.Manger.Record.pushRecord(attacker, `该次造成伤害共计${damageAddition > 1 ? "提升" : "降低"}${Math.abs(roundEightNine(damageAddition * 100 - 100))}%`, 1)
    }
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
    const elapsed = Math.min(6, Math.max(0, (attacker.Manger.Round || 1) - 1));
    const minimum = 80 + (57.5 - 80) * elapsed / 6;
    const maximum = effect.max + (effect.finalMax - effect.max) * elapsed / 6;
    const multiplier = (minimum + Math.random() * (maximum - minimum)) / 100;
    attacker.Manger.Record.pushRecord(attacker, `的【敛微穷极】策略伤害率波动至${Number((multiplier * 100).toFixed(2))}%（范围${Number(minimum.toFixed(2))}%～${Number(maximum.toFixed(2))}%）`, 1);
    return multiplier;
}

// 计算伤害增减
export const getDamageAddition = (attacker, target, damageInfo, skill) => {
    const type = damageInfo.type;
    let value = 100;
    if (type == 1 || type == 3) {
        value += attacker.getDamageStateValue("attackDamageAdd"); //攻击者造成伤害提高
        value -= attacker.getDamageStateValue("attackDamageSub"); //攻击者造成伤害降低
        value += target.getDamageStateValue("beAttackDamageAdd"); //目标受到伤害提高
        value -= target.getDamageStateValue("beAttackDamageSub"); //目标受到伤害降低
    } else if (type == 2 || type == 4) {
        value += attacker.getDamageStateValue("inteDamageAdd");
        const lianwei = attacker.Storage.lianweiQiongji;
        if (lianwei) {
            const elapsed = Math.min(6, Math.max(0, (attacker.Manger.Round || 1) - 1));
            value += lianwei.bonus * (1 - elapsed / 6);
        }
        value -= attacker.getDamageStateValue("inteDamageSub");
        value += target.getDamageStateValue("beInteDamageAdd");
        value -= target.getDamageStateValue("beInteDamageSub");
        if (type == 2) {
            value -= target.State.nextInteDamageSub?.value || 0;
            const taoyuan = target.Storage.taoyuanStrategyReduction;
            if (taoyuan && target.Manger.Round >= 1 && target.Manger.Round <= 3 && taoyuan.remaining > 0) value -= 9999;
        }
    }

    if (skill && skill.type == 2){
        value += attacker.getDamageStateValue("activeDamageAdd");
        value -= attacker.getDamageStateValue("activeDamageSub");
        value += target.getDamageStateValue("beActiveDamageAdd");
        value -= target.getDamageStateValue("beActiveDamageSub");
    }

    if (target.Storage.chuewujin && target.Manger.Round >= 1 && target.Manger.Round <= 3 && target.isAttackLimit()) value -= 30;
    if (damageInfo.jianzuReduction) value -= 50;
    if (type === 1 && damageInfo.isBasicAttack && !damageInfo.isSplitAttack && attacker.Storage.henge) value += 50;

    if (value < 10) value = 10;
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

