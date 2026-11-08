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
    if (attacker.Treasure?.id === 'jinjiu') {
        targetDef *= 1 - Math.min(100, attacker.Treasure.podi) / 100;
    } else if (attacker.Treasure?.id === 'shanjun') {
        const ignore = attacker.Treasure.podi * 1.5 + (attacker.Treasure.forge === 'podi' ? attacker.Treasure.forgeValue : 0);
        targetDef *= 1 - Math.min(100, ignore) / 100;
    } else if (['zhengang', 'jingni', 'qulu'].includes(attacker.Treasure?.id)) {
        const fixed = attacker.Treasure.id === 'qulu' ? 10 : attacker.Treasure.podi * (attacker.Treasure.id === 'jingni' ? 1.5 : 1);
        const forge = attacker.Treasure.forge === 'podi' ? attacker.Treasure.forgeValue : 0;
        targetDef *= 1 - Math.min(100, fixed + forge) / 100;
    } else if (attacker.Treasure?.forge === 'podi') targetDef *= 1 - attacker.Treasure.forgeValue / 100;
    if (attacker.Treasure?.id === 'xushibishou') targetDef *= 1 - attacker.Treasure.podi * 1.5 / 100;
    if (attacker.Treasure?.id === 'fenran' && attacker.Treasure.forge === 'cangfeng' &&
        attacker.Storage.fenranCangfengCurrentAttack && damageInfo.isBasicAttack) {
        targetDef *= 1 - attacker.Treasure.forgeValue / 100;
    }
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
    const treasureIgnore = attacker.Treasure?.id === 'youpiao' ? 10 + (attacker.Treasure.forge === 'yingwu' ? attacker.Treasure.forgeValue : 0)
        : ['chengying', 'jingyangwanren'].includes(attacker.Treasure?.id) && attacker.Treasure.forge === 'yingwu' ? attacker.Treasure.forgeValue : 0;
    const ignoreIntelRate = (attacker.Storage.weiyuRepeat?.skill === skill ? attacker.Storage.weiyuRepeat.ignoreIntelRate : 0) + treasureIgnore;
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
    const treasureIgnore = attacker.Treasure?.id === 'youpiao' ? 10 + (attacker.Treasure.forge === 'yingwu' ? attacker.Treasure.forgeValue : 0)
        : ['chengying', 'jingyangwanren'].includes(attacker.Treasure?.id) && attacker.Treasure.forge === 'yingwu' ? attacker.Treasure.forgeValue : 0;
    let inteEffect = calcInteEffect(target.Attrs.int * (1 - treasureIgnore / 100));

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
    if (damageInfo.isBasicAttack && !damageInfo.isSplitAttack && attacker.Storage.madaiAttackStacks) {
        const layers = attacker.Storage.madaiAttackStacks;
        special('奉令护蜀', layers * 35 + Math.floor(Math.max(0, attacker.Attrs.atk - 80) / 5) * layers, attacker);
    }
    if (target.Storage.madaiDefenseStacks) {
        const layers = target.Storage.madaiDefenseStacks;
        special('奉令护蜀', -(layers * 20 + Math.floor(Math.max(0, target.Attrs.def - 80) / 8) * layers), target);
    }
    if (damageInfo.panzhenReduction) special('磐阵善守', -damageInfo.panzhenReduction, target);
    if (damageInfo.jixianReduction) special('计险远近·前锋减伤', -damageInfo.jixianReduction, target);
    if (target.Storage.jixianVulnerability?.round === target.Manger.Round) {
        special('计险远近·受伤提高', target.Storage.jixianVulnerability.stacks * 15, target);
    }
    if (attacker.Storage.hezongLianheng && attacker.Camp !== target.Camp && [1, 2, 3, 4].includes(type)) {
        special('合纵连横', 10, attacker);
    }

    if (skill && skill.type == 2){
        add(attacker, "activeDamageAdd", 1);
        add(attacker, "activeDamageSub", -1);
        add(target, "beActiveDamageAdd", 1);
        add(target, "beActiveDamageSub", -1);
    }
    if (skill?.type === 3 && attacker.Storage.shiwuPursuitBonus) special('势无虚动', attacker.Storage.shiwuPursuitBonus);
    if (attacker.Treasure?.id === 'tongsu') {
        if (skill && [2, 3].includes(skill.type)) special('彤素·亢厉', attacker.Treasure.kangli);
        if (type === 1) {
            special('彤素·奇袭', Math.abs(attacker.Index - target.Index) * 3);
        }
        if (skill?.type === 2 && attacker.Treasure.forge === 'zhice') special('彤素·至策', attacker.Treasure.forgeValue);
    }
    if (skill?.type === 2 && target.Treasure?.id === 'tongsu' && target.Treasure.forge === 'jianren') special('彤素·坚忍', -target.Treasure.forgeValue, target);
    if (skill?.type === 2 && target.Treasure?.id === 'louying') {
        special('镂影·坚忍', -target.Treasure.jianren, target);
        if (target.Treasure.forge === 'jianren') special('镂影·锻造坚忍', -target.Treasure.forgeValue, target);
    }
    if (skill?.type === 2 && target.Treasure?.id === 'xiuni') special('貅猊·坚忍', -target.Treasure.jianren, target);
    if (target.Treasure?.id === 'dalu') {
        if (type === 1 && damageInfo.isBasicAttack) special('大橹·强韧', -target.Treasure.qiangren, target);
        if (skill?.type === 2) special('大橹·坚忍', -target.Treasure.jianren, target);
    }
    if (target.Treasure?.id === 'taie') {
        if (damageInfo.taieFirstReduction) special('泰阿·强固', -damageInfo.taieFirstReduction, target);
        if (skill?.type === 2 && target.Treasure.forge === 'jianren') special('泰阿·坚忍', -target.Treasure.forgeValue, target);
        if (skill?.type === 1 && target.Treasure.forge === 'chenwen') special('泰阿·沉稳', -target.Treasure.forgeValue, target);
        if (type === 1 && damageInfo.isBasicAttack && target.Treasure.forge === 'qiangren') special('泰阿·强韧', -target.Treasure.forgeValue, target);
    }
    if (target.Treasure?.id === 'dajiang') {
        if (type === 1 && damageInfo.isBasicAttack) special('大将·强韧', -target.Treasure.qiangren * 2, target);
        if (type === 1 && damageInfo.isBasicAttack && target.Treasure.forge === 'qiangren') special('大将·锻造强韧', -target.Treasure.forgeValue, target);
        if (skill?.type === 2 && target.Treasure.forge === 'jianren') special('大将·坚忍', -target.Treasure.forgeValue, target);
        if (skill?.type === 1 && target.Treasure.forge === 'chenwen') special('大将·沉稳', -target.Treasure.forgeValue, target);
    }
    if (target.Treasure?.id === 'renfeng') {
        if ([2, 4].includes(type)) special('仁风·先知', -target.Treasure.xianzhi, target);
        if (skill?.type === 2 && target.Treasure.forge === 'jianren') special('仁风·坚忍', -target.Treasure.forgeValue, target);
    }
    if (target.Treasure?.id === 'bolang') {
        if (['confusion', 'rage', 'activeLimit', 'attackLimit'].some(name => target.State[name]?.rounds > 0))
            special('博浪·安贞', -target.Treasure.anzhen, target);
        if (skill?.type === 2) {
            special('博浪·坚忍', -target.Treasure.jianren * 2, target);
            if (target.Treasure.forge === 'jianren') special('博浪·锻造坚忍', -target.Treasure.forgeValue, target);
        }
    }
    if (target.Treasure?.id === 'bieming') {
        special('别鸣·不移', -target.Treasure.buyi, target);
        if (skill?.type === 2 && target.Treasure.forge === 'jianren')
            special('别鸣·坚忍', -target.Treasure.forgeValue, target);
    }
    if (target.Treasure?.id === 'tianwen') {
        if (type === 1) special('天问·不移', -target.Treasure.buyi, target);
        if (target.Treasure.forge === 'jiebei' && target.Manger.Round >= 1 && target.Manger.Round <= 2) {
            special('天问·戒备', -target.Treasure.forgeValue, target);
        }
        if (skill?.type === 2 && target.Treasure.forge === 'jianren') special('天问·坚忍', -target.Treasure.forgeValue, target);
    }
    if (['xinghan', 'canghai', 'qianjun', 'dalu'].includes(target.Treasure?.id)) {
        const name = { canghai: '沧海', qianjun: '千钧', dalu: '大橹' }[target.Treasure.id] || '星汉';
        if (target.Treasure.id === 'xinghan') special('星汉·不移', -target.Treasure.buyi, target);
        if (skill?.type === 2 && target.Treasure.id === 'canghai') special('沧海·坚忍', -target.Treasure.jianren, target);
        if (skill?.type === 2 && target.Treasure.forge === 'jianren') special(target.Treasure.id === 'canghai' ? '沧海·锻造坚忍' : '星汉·坚忍', -target.Treasure.forgeValue, target);
        if (target.Treasure.forge === 'jiebei' && target.Manger.Round >= 1 && target.Manger.Round <= 2) {
            special(`${name}·戒备`, -target.Treasure.forgeValue, target);
        }
    }
    if (target.Treasure?.id === 'qianjun' && ['confusion', 'rage', 'activeLimit', 'attackLimit']
        .some(name => target.State[name]?.rounds > 0)) special('千钧·安贞', -target.Treasure.anzhen, target);
    for (const reduction of damageInfo.treasureJishiReductions || []) special(reduction.name, -reduction.value, target);
    if (damageInfo.xinghanBuquReduction) special(`${{ canghai: '沧海', qianjun: '千钧', dalu: '大橹' }[target.Treasure?.id] || '星汉'}·不屈`, -damageInfo.xinghanBuquReduction, target);
    if (damageInfo.xinghanWeishiReduction) special(`${{ canghai: '沧海', qianjun: '千钧', dalu: '大橹' }[target.Treasure?.id] || '星汉'}·威势`, -damageInfo.xinghanWeishiReduction, target);
    if (attacker.Treasure?.id === 'yuanrong') {
        // 分兵的 damageInfo.isBasicAttack 为 true，因此也享受陷阵的普通攻击增伤。
        if (type === 1 && damageInfo.isBasicAttack) special('元戎·陷阵', attacker.Treasure.xianzhen);
        if (skill?.type === 3) {
            special('元戎·无畏', attacker.Treasure.wuwei * 2);
            if (attacker.Treasure.forge === 'xurui' && attacker.Storage.yuanrongXuruiStacks) {
                special('元戎·蓄锐', attacker.Storage.yuanrongXuruiStacks * attacker.Treasure.forgeValue);
            }
        }
        if ([2, 4].includes(type) && attacker.Treasure.forge === 'xuanfeng' && attacker.Storage.yuanrongXuanfengReady) {
            special('元戎·选锋', attacker.Treasure.forgeValue);
            damageInfo.yuanrongXuanfengApplied = true;
        }
    }
    if (['shenfeng', 'xiuni', 'longlin'].includes(attacker.Treasure?.id)) {
        const name = { shenfeng: '神锋', xiuni: '貅猊', longlin: '龙鳞' }[attacker.Treasure.id];
        if (attacker.Treasure.id === 'xiuni' && type === 1 && damageInfo.isBasicAttack && attacker.State.doubleAttack.rounds !== 0) {
            special('貅猊·迅猛', 20);
        }
        if (skill?.type === 3) {
            if (attacker.Treasure.id === 'shenfeng') special('神锋·无畏', attacker.Treasure.wuwei);
            if (attacker.Treasure.id === 'longlin' && skill.id === attacker.Skill) special('龙鳞·亢厉', attacker.Treasure.kangli * 2);
            if (attacker.Treasure.forge === 'xurui' && attacker.Storage.yuanrongXuruiStacks) {
                special(`${name}·蓄锐`, attacker.Storage.yuanrongXuruiStacks * attacker.Treasure.forgeValue);
            }
        }
        if ([2, 4].includes(type) && attacker.Treasure.forge === 'xuanfeng' && attacker.Storage.yuanrongXuanfengReady) {
            special(`${name}·选锋`, attacker.Treasure.forgeValue);
            damageInfo.yuanrongXuanfengApplied = true;
        }
    }
    if (attacker.Treasure?.id === 'shanjun' && skill?.type === 3) {
        if (attacker.Treasure.forge === 'wuwei') special('山君·无畏', attacker.Treasure.forgeValue);
        if (attacker.Treasure.forge === 'xurui' && attacker.Storage.yuanrongXuruiStacks) {
            special('山君·蓄锐', attacker.Storage.yuanrongXuruiStacks * attacker.Treasure.forgeValue);
        }
    }
    if (attacker.Treasure?.id === 'shaofu') {
        if (type === 1 && damageInfo.isBasicAttack) {
            if (attacker.Manger.Round >= 1 && attacker.Manger.Round <= 4) special('少府·陷阵', attacker.Treasure.xianzhen * 2);
            if (attacker.Treasure.forge === 'xianzhen') special('少府·锻造陷阵', attacker.Treasure.forgeValue);
        }
        if (skill?.type === 3 && attacker.Treasure.forge === 'wuwei') special('少府·无畏', attacker.Treasure.forgeValue);
    }
    if (attacker.Treasure?.id === 'qi') {
        if (type === 1) special('戚·勇猛', 8);
        if (type === 1 && damageInfo.isBasicAttack && attacker.Treasure.forge === 'xianzhen')
            special('戚·陷阵', attacker.Treasure.forgeValue);
        if (skill?.type === 3 && attacker.Treasure.forge === 'wuwei')
            special('戚·无畏', attacker.Treasure.forgeValue);
    }
    if (['kunwu', 'minghong'].includes(attacker.Treasure?.id)) {
        const name = attacker.Treasure.id === 'kunwu' ? '锟铻' : '铭鸿';
        if (skill?.id === attacker.Skill && skill.type === 2 && attacker.Treasure.id === 'kunwu')
            special('锟铻·亢厉', attacker.Treasure.kangli * 2);
        if (skill?.id === attacker.Skill && [2, 3].includes(skill.type) && attacker.Treasure.id === 'minghong')
            special('铭鸿·亢厉', 10);
        if (skill?.id === attacker.Skill && [2, 3].includes(skill.type) && attacker.Treasure.forge === 'kangli')
            special(`${name}·锻造亢厉`, attacker.Treasure.forgeValue);
    }
    if (attacker.Treasure?.id === 'jinjiu') {
        if (skill?.type === 2) special('金鸠·亢厉', attacker.Treasure.kangli);
        if ([1, 3].includes(type) && attacker.Storage.jinjiuYouyouStacks) {
            special('金鸠·鸠佑', attacker.Storage.jinjiuYouyouStacks * 6);
        }
        if (skill?.id === attacker.Skill && [2, 3].includes(skill.type) && attacker.Treasure.forge === 'kangli') {
            special('金鸠·锻造亢厉', attacker.Treasure.forgeValue);
        }
        if (skill?.type === 2 && attacker.Treasure.forge === 'zhice') special('金鸠·至策', attacker.Treasure.forgeValue);
        if (attacker.Treasure.forge === 'jixu' && attacker.Manger.Round >= 1) {
            const continuous = Object.values(target.State.continuousDamage || {}).filter(effect => effect.expiresRound >= attacker.Manger.Round).length;
            const controls = ['confusion', 'rage', 'attackLimit', 'activeLimit']
                .filter(name => target.State[name]?.rounds > 0).length;
            if (continuous + controls) special('金鸠·击虚', (continuous + controls) * attacker.Treasure.forgeValue);
        }
    }
    if (attacker.Treasure?.id === 'yanri') {
        if (skill?.id === attacker.Skill && skill.type === 2) special('掩日·亢厉', attacker.Treasure.kangli);
        if (skill?.id === attacker.Skill && [2, 3].includes(skill.type) && attacker.Treasure.forge === 'kangli') special('掩日·锻造亢厉', attacker.Treasure.forgeValue);
        if (skill?.type === 2 && attacker.Treasure.forge === 'zhice') special('掩日·至策', attacker.Treasure.forgeValue);
        if (attacker.Treasure.forge === 'jixu' && attacker.Manger.Round >= 1) {
            const continuous = Object.values(target.State.continuousDamage || {}).filter(effect => effect.expiresRound >= attacker.Manger.Round).length;
            const controls = ['confusion', 'rage', 'attackLimit', 'activeLimit'].filter(name => target.State[name]?.rounds > 0).length;
            if (continuous + controls) special('掩日·击虚', (continuous + controls) * attacker.Treasure.forgeValue);
        }
    }
    if (['tengshe', 'jushu'].includes(attacker.Treasure?.id)) {
        const name = attacker.Treasure.id === 'jushu' ? '钜黍' : '螣蛇';
        if (attacker.Treasure.id === 'jushu' && skill?.type === 3) special('钜黍·无畏', attacker.Treasure.wuwei);
        if (skill?.id === attacker.Skill && [2, 3].includes(skill.type) && attacker.Treasure.forge === 'kangli') {
            special(`${name}·锻造亢厉`, attacker.Treasure.forgeValue);
        }
        if (skill?.type === 2 && attacker.Treasure.forge === 'zhice') special(`${name}·至策`, attacker.Treasure.forgeValue);
        if (attacker.Treasure.forge === 'jixu' && attacker.Manger.Round >= 1) {
            const continuous = Object.values(target.State.continuousDamage || {}).filter(effect => effect.expiresRound >= attacker.Manger.Round).length;
            const controls = ['confusion', 'rage', 'attackLimit', 'activeLimit']
                .filter(name => target.State[name]?.rounds > 0).length;
            if (continuous + controls) special(`${name}·击虚`, (continuous + controls) * attacker.Treasure.forgeValue);
        }
    }
    if (attacker.Treasure?.id === 'canghai' && attacker.Storage.canghaiPolangRound === attacker.Manger.Round &&
        attacker.Storage.canghaiPolangStacks) {
        special('沧海·破浪', attacker.Storage.canghaiPolangStacks * 10);
    }
    if (target.Treasure?.id === 'fenran') special('奋髯·不移', -target.Treasure.buyi, target);
    if (target.Treasure?.id === 'jingni' && type === 1) special('惊鲵·不移', -target.Treasure.buyi, target);
    if (['zhengang', 'jingni', 'mingshangouyue'].includes(target.Treasure?.id) && skill?.type === 2 && target.Treasure.forge === 'jianren')
        special(`${{ zhengang: '真刚', jingni: '惊鲵', mingshangouyue: '冥山勾月' }[target.Treasure.id]}·坚忍`, -target.Treasure.forgeValue, target);
    if (['zhengang', 'jingni', 'mingshangouyue'].includes(attacker.Treasure?.id)) {
        const name = { zhengang: '真刚', jingni: '惊鲵', mingshangouyue: '冥山勾月' }[attacker.Treasure.id];
        if (attacker.Treasure.id === 'zhengang' && type === 1 && attacker.Manger.Round >= 1 && attacker.Manger.Round <= 2) special('真刚·盛气', 20);
        if (attacker.Treasure.id === 'mingshangouyue' && skill?.id === attacker.Skill && [2, 3].includes(skill.type)) special('冥山勾月·亢厉', attacker.Treasure.kangli);
        if (attacker.Treasure.forge === 'zhice' && skill?.type === 2) special(`${name}·至策`, attacker.Treasure.forgeValue);
    }
    if (['qulu', 'zhengjiaoqiang'].includes(attacker.Treasure?.id)) {
        const name = attacker.Treasure.id === 'qulu' ? '屈卢' : '狰角枪';
        if (skill?.type === 3) {
            special(`${name}·无畏`, attacker.Treasure.wuwei);
            if (attacker.Treasure.forge === 'wuwei') special(`${name}·锻造无畏`, attacker.Treasure.forgeValue);
        }
        if (type === 1 && damageInfo.isBasicAttack) {
            if (attacker.Treasure.id === 'zhengjiaoqiang') special('狰角枪·陷阵', 12);
            if (attacker.Treasure.forge === 'xianzhen') special(`${name}·锻造陷阵`, attacker.Treasure.forgeValue);
        }
    }
    if (attacker.Treasure?.id === 'fenran' && type === 1 && damageInfo.isBasicAttack &&
        attacker.Treasure.forge === 'xianzhen') special('奋髯·陷阵', attacker.Treasure.forgeValue);
    if (target.Treasure?.id === 'youpiao' && [2, 4].includes(type)) special('游飘·先知', -target.Treasure.xianzhi, target);
    if (attacker.Treasure?.id === 'chengying' && [2, 4].includes(type) && attacker.Manger.Round >= 1 &&
        (attacker.Storage.chengyingStrategyHits || 0) < 2) special('承影·机先', 20);
    if (attacker.Treasure?.id === 'jingyangwanren') {
        if (skill?.type === 2) special('旌阳万仞·亢厉', attacker.Treasure.kangli);
        const fire = /燃烧|焚烧/.test(damageInfo.kind || '') || /火攻|火辎|火势风威/.test(skill?.name || '');
        const curse = /恐慌|妖术/.test(damageInfo.kind || '');
        if ([2, 4].includes(type) && (fire || curse)) special('旌阳万仞·睥睨', 10);
    }
    if (attacker.Treasure?.id === 'xuanyi') {
        if (type === 1 && skill?.type === 2) special('悬翳·亢厉', 10);
        if (skill?.id === attacker.Skill && [2, 3].includes(skill.type) && attacker.Treasure.forge === 'kangli')
            special('悬翳·锻造亢厉', attacker.Treasure.forgeValue);
    }
    if (attacker.Treasure?.id === 'youpiao' && [2, 4].includes(type)) {
        if (skill?.type === 2) special('游飘·妙算', attacker.Treasure.miaosuan);
        const fire = /燃烧|焚烧/.test(damageInfo.kind || '') || /火攻|火辎|火势风威/.test(skill?.name || '');
        const curse = /恐慌|妖术/.test(damageInfo.kind || '');
        if (fire && attacker.Treasure.forge === 'quhuo') special('游飘·驱火', attacker.Treasure.forgeValue);
        if (curse && attacker.Treasure.forge === 'xuanhuo') special('游飘·炫惑', attacker.Treasure.forgeValue);
    }
    if (['chengying', 'jingyangwanren'].includes(attacker.Treasure?.id) && [2, 4].includes(type)) {
        const name = attacker.Treasure.id === 'chengying' ? '承影' : '旌阳万仞';
        const fire = /燃烧|焚烧/.test(damageInfo.kind || '') || /火攻|火辎|火势风威/.test(skill?.name || '');
        const curse = /恐慌|妖术/.test(damageInfo.kind || '');
        if (fire && attacker.Treasure.forge === 'quhuo') special(`${name}·驱火`, attacker.Treasure.forgeValue);
        if (curse && attacker.Treasure.forge === 'xuanhuo') special(`${name}·炫惑`, attacker.Treasure.forgeValue);
    }
    if (attacker.Treasure?.id === 'wuhao') {
        const ownMainSkill = skill?.id === attacker.Skill && [2, 3].includes(skill.type);
        if (ownMainSkill) {
            special('乌号·亢厉', attacker.Treasure.kangli * 2);
            if (attacker.Treasure.forge === 'kangli') special('乌号·锻造亢厉', attacker.Treasure.forgeValue);
        }
        const enemies = attacker.BattleCamp === 'blue' ? attacker.Manger.RedTeam.hero : attacker.Manger.BlueTeam.hero;
        const livingArms = enemies.filter(hero => hero.Arms > 0).map(hero => hero.Arms);
        if (livingArms.length && target.Arms === Math.min(...livingArms)) special('乌号·逐胜', 15);
        if (skill?.type === 2 && attacker.Treasure.forge === 'zhice') special('乌号·至策', attacker.Treasure.forgeValue);
        if (attacker.Treasure.forge === 'jixu' && attacker.Manger.Round >= 1) {
            const continuous = Object.values(target.State.continuousDamage || {}).filter(effect => effect.expiresRound >= attacker.Manger.Round).length;
            const controls = ['confusion', 'rage', 'attackLimit', 'activeLimit']
                .filter(name => target.State[name]?.rounds > 0).length;
            if (continuous + controls) special('乌号·击虚', (continuous + controls) * attacker.Treasure.forgeValue);
        }
    }
    if (attacker.Treasure?.id === 'xushibishou' && attacker.Treasure.forge === 'kangli' &&
        skill?.id === attacker.Skill && [2, 3].includes(skill.type)) {
        special('徐氏匕首·亢厉', attacker.Treasure.forgeValue);
    }
    if (attacker.Treasure?.id === 'weizhisan_gong') {
        const fire = /燃烧|焚烧/.test(damageInfo.kind || '') || /火攻|火辎|火势风威/.test(skill?.name || '');
        if ([2, 4].includes(type) && fire) special('位至三公·炎势', attacker.Treasure.yanshi);
        if (skill?.id === attacker.Skill && [2, 3].includes(skill.type) && attacker.Treasure.forge === 'kangli') {
            special('位至三公·锻造亢厉', attacker.Treasure.forgeValue);
        }
        if (skill?.type === 2 && attacker.Treasure.forge === 'zhice') special('位至三公·至策', attacker.Treasure.forgeValue);
        if (attacker.Treasure.forge === 'jixu' && attacker.Manger.Round >= 1) {
            const continuous = Object.values(target.State.continuousDamage || {}).filter(effect => effect.expiresRound >= attacker.Manger.Round).length;
            const controls = ['confusion', 'rage', 'attackLimit', 'activeLimit']
                .filter(name => target.State[name]?.rounds > 0).length;
            if (continuous + controls) special('位至三公·击虚', (continuous + controls) * attacker.Treasure.forgeValue);
        }
    }
    if (attacker.Treasure?.id === 'louying' && attacker.Treasure.forge === 'shanzhan' &&
        [1, 2, 4].includes(type) && attacker.Storage.louyingShanzhanStacks > 0) {
        special('镂影·善战', attacker.Storage.louyingShanzhanStacks * 2);
    }

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

