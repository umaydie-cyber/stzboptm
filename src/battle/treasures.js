const tongsuForgeOptions = [
    { id: 'xiaorui', name: '骁锐', min: 5, max: 15, desc: '基础攻击属性提高' },
    { id: 'zhice', name: '至策', min: 10, max: 20, desc: '主动战法伤害提高' },
    { id: 'podi', name: '破敌', min: 10, max: 20, desc: '攻击伤害无视目标防御' },
    { id: 'yingyong', name: '英勇', min: 5, max: 15, desc: '攻击型主战法发动率提高' },
    { id: 'shanmou', name: '善谋', min: 10, max: 30, desc: '第4、6回合攻击型主战法发动率提高' },
    { id: 'jianren', name: '坚忍', min: 10, max: 20, desc: '受到的主动战法伤害降低' }
];
const yuanrongForgeOptions = [
    tongsuForgeOptions[0],
    { id: 'tianzi', name: '天资', min: 5, max: 15, desc: '基础谋略属性提高' },
    { id: 'benxi', name: '奔袭', min: 3, max: 9, desc: '所有追击战法发动率提高' },
    { id: 'jianyi', name: '坚毅', min: 2, max: 6, unit: '回合', desc: '前几回合免疫暴走和混乱' },
    { id: 'xuanfeng', name: '选锋', min: 10, max: 30, desc: '普通攻击后下一次策略伤害提高' },
    { id: 'xurui', name: '蓄锐', min: 5, max: 15, desc: '每两次普攻，追击伤害叠加提高' }
];
const fenranForgeOptions = [
    tongsuForgeOptions[0], tongsuForgeOptions[2],
    { id: 'xianzhen', name: '陷阵', min: 10, max: 30, desc: '普通攻击伤害提高' },
    { id: 'qiangji', name: '强击', min: 1, max: 5, unit: '回合', desc: '前几回合普通攻击不受反击' },
    { id: 'qingyi', name: '清毅', min: 5, max: 8, unit: '回合', desc: '第5回合至所选回合获得洞察' },
    { id: 'cangfeng', name: '藏锋', min: 10, max: 30, desc: '本回合未普攻时，下回合首次普攻无视防御' }
];
const youpiaoForgeOptions = [
    { id: 'lingdong', name: '灵动', min: 10, max: 30, unit: '速度', desc: '速度属性提高' },
    yuanrongForgeOptions[1],
    { id: 'yingwu', name: '颖悟', min: 10, max: 20, desc: '策略伤害额外无视目标谋略' },
    { id: 'quhuo', name: '驱火', min: 10, max: 30, desc: '燃烧及火攻伤害提高' },
    { id: 'xuanhuo', name: '炫惑', min: 10, max: 30, desc: '恐慌及妖术伤害提高' },
    { id: 'chousuan', name: '筹算', min: 5, max: 15, desc: '策略伤害主战法发动率提高' }
];
const wuhaoForgeOptions = [
    { id: 'shulv', name: '熟虑', min: 6, max: 20, desc: '需准备的武将主战法发动率提高' },
    yuanrongForgeOptions[1],
    { id: 'kangli', name: '亢厉', min: 10, max: 30, desc: '主动及追击主战法伤害提高' },
    tongsuForgeOptions[1], tongsuForgeOptions[0],
    { id: 'jixu', name: '击虚', min: 3, max: 9, desc: '每种持续伤害或控制效果使目标受到的伤害提高' }
];
const xushibishouForgeOptions = [
    yuanrongForgeOptions[1], tongsuForgeOptions[0], youpiaoForgeOptions[5],
    { id: 'shipo', name: '识破', min: 1, max: 4, unit: '回合', desc: '前几回合主战法伤害无视规避' },
    wuhaoForgeOptions[2], tongsuForgeOptions[3]
];
const louyingForgeOptions = [
    tongsuForgeOptions[0], tongsuForgeOptions[5], yuanrongForgeOptions[1],
    { id: 'buxie', name: '不懈', min: 3, max: 9, desc: '每损失15%初始兵力，受到的恢复效果提高' },
    fenranForgeOptions[4],
    { id: 'shanzhan', name: '善战', min: 3, max: 7, unit: '层', desc: '每次造成攻击或策略伤害增伤2%，最多叠加' }
];
const tianwenForgeOptions = [
    yuanrongForgeOptions[1],
    { id: 'jiebei', name: '戒备', min: 10, max: 30, desc: '前2回合受到的所有伤害降低' },
    { id: 'jimin', name: '机敏', min: 3, max: 9, desc: '武将主战法发动率提高' },
    wuhaoForgeOptions[0], tongsuForgeOptions[5],
    { id: 'renxin', name: '仁心', min: 5, max: 15, desc: '造成的恢复效果提高' }
];
const shanjunForgeOptions = [
    tongsuForgeOptions[0], yuanrongForgeOptions[2], yuanrongForgeOptions[5], tongsuForgeOptions[2],
    { id: 'wuwei', name: '无畏', min: 10, max: 30, desc: '追击战法伤害提高' },
    yuanrongForgeOptions[3]
];
const jinjiuForgeOptions = [
    wuhaoForgeOptions[0], yuanrongForgeOptions[1], wuhaoForgeOptions[2],
    tongsuForgeOptions[1], tongsuForgeOptions[0], wuhaoForgeOptions[5]
];
const weizhisan_gongForgeOptions = [
    wuhaoForgeOptions[0], yuanrongForgeOptions[1], wuhaoForgeOptions[2],
    tongsuForgeOptions[1], tongsuForgeOptions[0], wuhaoForgeOptions[5]
];
const xinghanForgeOptions = [
    { id: 'jishi', name: '济世', min: 5, max: 15, desc: '主战法每次造成恢复后，目标下一次受到的伤害降低（可叠加）' },
    tongsuForgeOptions[5],
    { id: 'buqu', name: '不屈', min: 3, max: 9, desc: '每次受到伤害后，本回合后续受到的所有伤害降低（可叠加）' },
    louyingForgeOptions[3],
    { id: 'weishi', name: '威势', min: 10, max: 20, desc: '受到统帅值低于自身的武将造成的所有伤害降低' },
    tianwenForgeOptions[1]
];
const shenfengForgeOptions = [
    tongsuForgeOptions[0], yuanrongForgeOptions[1], yuanrongForgeOptions[2],
    yuanrongForgeOptions[3], yuanrongForgeOptions[4], yuanrongForgeOptions[5]
];
const qianjunForgeOptions = [
    { id: 'wengu', name: '稳固', min: 10, max: 20, desc: '防御属性提高' },
    tianwenForgeOptions[2], xinghanForgeOptions[2], xinghanForgeOptions[0],
    xinghanForgeOptions[4], youpiaoForgeOptions[0],
    { id: 'huoyan', name: '惑言', min: 1, max: 4, unit: '个', desc: '正式回合起主战法成功施加的前几个控制效果额外持续1回合' }
];
const daluForgeOptions = [
    ...qianjunForgeOptions.slice(0, 5),
    { id: 'genzhi', name: '艮止', min: 10, max: 30, unit: '谋略', desc: '无法普通攻击（不可消除），谋略属性提高' },
    qianjunForgeOptions[6]
];
const taieForgeOptions = [
    tianwenForgeOptions[2], youpiaoForgeOptions[0], tongsuForgeOptions[5],
    { id: 'chenwen', name: '沉稳', min: 10, max: 20, desc: '受到指挥战法伤害降低' },
    qianjunForgeOptions[0],
    { id: 'qiangren', name: '强韧', min: 10, max: 20, desc: '受到普通攻击伤害降低' },
    fenranForgeOptions[4]
];
const shaofuForgeOptions = [
    tongsuForgeOptions[0], fenranForgeOptions[2], fenranForgeOptions[3],
    yuanrongForgeOptions[2], yuanrongForgeOptions[3], shanjunForgeOptions[4]
];
const renfengForgeOptions = [
    youpiaoForgeOptions[0], tianwenForgeOptions[2], fenranForgeOptions[4],
    tianwenForgeOptions[5], tongsuForgeOptions[5], daluForgeOptions[5], qianjunForgeOptions[6]
];
export const treasureSpecs = {
    tongsu: { name: '彤素', first: 'xiaorui', second: 'kangli', firstName: '骁锐', secondName: '亢厉', fixedName: '奇袭',
        fixedDesc: '造成攻击伤害时，与目标距离每提高 1，伤害提高 3%', forgeOptions: tongsuForgeOptions },
    yuanrong: { name: '元戎', first: 'xianzhen', second: 'wuwei', firstName: '陷阵', secondName: '无畏', fixedName: '迸发',
        fixedDesc: '首次发动追击类主战法时，攻击距离内额外选取 1 个目标', forgeOptions: yuanrongForgeOptions },
    fenran: { name: '奋髯', first: 'xiaorui', second: 'buyi', firstName: '骁锐', secondName: '不移', fixedName: '奋武',
        fixedDesc: '普通攻击增伤累计超过 250% 时，该次攻击无视规避', forgeOptions: fenranForgeOptions },
    youpiao: { name: '游飘', first: 'xianzhi', second: 'miaosuan', firstName: '先知', secondName: '妙算', fixedName: '颖悟',
        fixedDesc: '造成的策略伤害无视目标 10% 谋略属性', forgeOptions: youpiaoForgeOptions },
    wuhao: { name: '乌号', first: 'lingdong', second: 'kangli', firstName: '灵动', secondName: '亢厉', fixedName: '逐胜',
        fixedDesc: '对敌方当前兵力最低的武将造成伤害提高 15%；兵力相同者均生效', forgeOptions: wuhaoForgeOptions },
    xushibishou: { name: '徐氏匕首', first: 'lingdong', second: 'podi', firstName: '灵动', secondName: '破敌', fixedName: '英才',
        fixedDesc: '攻击与谋略属性提高 5%', forgeOptions: xushibishouForgeOptions },
    louying: { name: '镂影', first: 'jianren', second: 'yingcai', firstName: '坚忍', secondName: '英才', fixedName: '穿影',
        fixedDesc: '每对敌军造成 4 次攻击伤害，下次行动前对 3 距离内敌军单体发动 1 次攻击（伤害率 20%）', forgeOptions: louyingForgeOptions },
    tianwen: { name: '天问', first: 'buyi', second: 'tianzi', firstName: '不移', secondName: '天资', fixedName: '观星',
        fixedDesc: '首次发动主战法施加犹豫时，有 40% 概率额外持续 1 回合', forgeOptions: tianwenForgeOptions },
    shanjun: { name: '山君', first: 'podi', second: 'xiaorui', firstName: '破敌', secondName: '骁锐', fixedName: '虎啸',
        fixedDesc: '行动时自身主战法每提供 30% 攻击增伤，本回合追击战法发动率提高 1%（受士气影响）', forgeOptions: shanjunForgeOptions },
    jinjiu: { name: '金鸠', first: 'podi', second: 'kangli', firstName: '破敌', secondName: '亢厉', fixedName: '鸠佑',
        fixedDesc: '自身主动类武将主战法每发动一次，之后造成的攻击伤害提高 6%，可叠加', forgeOptions: jinjiuForgeOptions },
    weizhisan_gong: { name: '位至三公', first: 'wengu', second: 'yanshi', firstName: '稳固', secondName: '炎势', fixedName: '燮理',
        fixedDesc: '正式回合后，自身施加的燃烧效果每回合首次造成伤害后，自身恢复一次兵力（恢复率 120%）', forgeOptions: weizhisan_gongForgeOptions },
    xinghan: { name: '星汉', first: 'wengu', second: 'buyi', firstName: '稳固', secondName: '不移', fixedName: '归心',
        fixedDesc: '我军全体每发动 2 次主动战法，自身恢复一次兵力（恢复率 150%）', forgeOptions: xinghanForgeOptions },
    canghai: { name: '沧海', first: 'wengu', second: 'jianren', firstName: '稳固', secondName: '坚忍', fixedName: '破浪',
        fixedDesc: '每受到 1 次伤害，本回合造成的所有伤害提高 10%，最多叠加 10 次', forgeOptions: xinghanForgeOptions },
    shenfeng: { name: '神锋', first: 'wuwei', second: 'yingcai', firstName: '无畏', secondName: '英才', fixedName: '劲弩',
        fixedDesc: '首回合无法普通攻击；第 2 回合起首次普通攻击时，对攻击距离内敌军全体各发动 1 次普通攻击', forgeOptions: shenfengForgeOptions },
    xiuni: { name: '貅猊', first: 'jianren', second: 'xiaorui', firstName: '坚忍', secondName: '骁锐', fixedName: '迅猛',
        fixedDesc: '处于连击状态时，普通攻击伤害提高 20%', forgeOptions: shenfengForgeOptions },
    longlin: { name: '龙鳞', first: 'lingdong', second: 'kangli', firstName: '灵动', secondName: '亢厉', fixedName: '慎心',
        fixedDesc: '自身追击类武将主战法施加的控制效果额外持续 1 回合', forgeOptions: shenfengForgeOptions },
    tengshe: { name: '螣蛇', first: 'lingdong', second: 'xiaorui', firstName: '灵动', secondName: '骁锐', fixedName: '豪纵',
        fixedDesc: '自身主动类武将主战法的战法距离 +1', forgeOptions: jinjiuForgeOptions },
    jushu: { name: '钜黍', first: 'wuwei', second: 'lingdong', firstName: '无畏', secondName: '灵动', fixedName: '穿杨',
        fixedDesc: '自身攻击距离 +1', forgeOptions: jinjiuForgeOptions },
    qianjun: { name: '千钧', first: 'wengu', second: 'anzhen', firstName: '稳固', secondName: '安贞', fixedName: '破障',
        fixedDesc: '普通攻击后，移除攻击目标由主动或追击战法带来的1种增益效果', forgeOptions: qianjunForgeOptions },
    dalu: { name: '大橹', first: 'qiangren', second: 'jianren', firstName: '强韧', secondName: '坚忍', fixedName: '避险',
        fixedDesc: '战斗中首次实际受到伤害后，获得1次规避，免疫下一次受到的伤害', forgeOptions: daluForgeOptions },
    taie: { name: '泰阿', first: 'xiaorui', second: 'mingjing', firstName: '骁锐', secondName: '明镜', fixedName: '强固',
        fixedDesc: '正式回合开始后，每回合首次受到的伤害降低20%', forgeOptions: taieForgeOptions },
    dajiang: { name: '大将', first: 'wengu', second: 'qiangren', firstName: '稳固', secondName: '强韧', fixedName: '护主',
        fixedDesc: '战斗开始后的前2回合，援护我军大营，替其承受普通攻击', forgeOptions: taieForgeOptions },
    yanri: { name: '掩日', first: 'wengu', second: 'kangli', firstName: '稳固', secondName: '亢厉', fixedName: '谋断',
        fixedDesc: '第2次发动需要准备的主动类武将主战法时，跳过1个准备回合', forgeOptions: jinjiuForgeOptions },
    shaofu: { name: '少府', first: 'xiaorui', second: 'xianzhen', firstName: '骁锐', secondName: '陷阵', fixedName: '再战',
        fixedDesc: '第5回合有50%几率获得连击效果', forgeOptions: shaofuForgeOptions },
    renfeng: { name: '仁风', first: 'xianzhi', second: 'lingdong', firstName: '先知', secondName: '灵动', fixedName: '天资',
        fixedDesc: '谋略属性提高8%', forgeOptions: renfengForgeOptions },
    bolang: { name: '博浪', first: 'anzhen', second: 'jianren', firstName: '安贞', secondName: '坚忍', fixedName: '抖擞',
        fixedDesc: '自身受到的恢复效果提高25%', forgeOptions: renfengForgeOptions },
    chengying: { name: '承影', first: 'xiaorui', second: 'tianzi', firstName: '骁锐', secondName: '天资', fixedName: '机先',
        fixedDesc: '正式回合开始后，前2次造成的策略伤害提高20%', forgeOptions: youpiaoForgeOptions },
    jingyangwanren: { name: '旌阳万仞', first: 'wengu', second: 'kangli', firstName: '稳固', secondName: '亢厉', fixedName: '睥睨',
        fixedDesc: '恐慌、妖术、燃烧、火攻伤害提高10%', forgeOptions: youpiaoForgeOptions },
    xuanyi: { name: '悬翳', first: 'wengu', second: 'xiaorui', firstName: '稳固', secondName: '骁锐', fixedName: '亢厉',
        fixedDesc: '主动战法造成的攻击伤害提高10%', forgeOptions: xushibishouForgeOptions },
    kunwu: { name: '锟铻', first: 'wengu', second: 'kangli', firstName: '稳固', secondName: '亢厉', fixedName: '英才',
        fixedDesc: '攻击、谋略、速度属性提高8', forgeOptions: xushibishouForgeOptions },
    minghong: { name: '铭鸿', first: 'wengu', second: 'yingcai', firstName: '稳固', secondName: '英才', fixedName: '亢厉',
        fixedDesc: '自身主动及追击类武将主战法伤害提高10%', forgeOptions: xushibishouForgeOptions },
    bieming: { name: '别鸣', first: 'wengu', second: 'buyi', firstName: '稳固', secondName: '不移', fixedName: '英才',
        fixedDesc: '谋略、速度属性提高5%', forgeOptions: renfengForgeOptions },
    qi: { name: '戚', first: 'xiaorui', second: 'wengu', firstName: '骁锐', secondName: '稳固', fixedName: '勇猛',
        fixedDesc: '造成的攻击伤害提高8%', forgeOptions: shaofuForgeOptions },
    zhengang: { name: '真刚', first: 'podi', second: 'xiaorui', firstName: '破敌', secondName: '骁锐', fixedName: '盛气',
        fixedDesc: '正式回合开始后，前2回合造成的攻击伤害提高20%', forgeOptions: tongsuForgeOptions },
    jingni: { name: '惊鲵', first: 'buyi', second: 'podi', firstName: '不移', secondName: '破敌', fixedName: '英才',
        fixedDesc: '攻击和防御属性提高6%', forgeOptions: tongsuForgeOptions },
    mingshangouyue: { name: '冥山勾月', first: 'wengu', second: 'kangli', firstName: '稳固', secondName: '亢厉', fixedName: '骁锐',
        fixedDesc: '攻击属性提高8%', forgeOptions: tongsuForgeOptions },
    qulu: { name: '屈卢', first: 'xiaorui', second: 'wuwei', firstName: '骁锐', secondName: '无畏', fixedName: '破敌',
        fixedDesc: '造成的攻击伤害无视目标10%防御', forgeOptions: shaofuForgeOptions },
    zhengjiaoqiang: { name: '狰角枪', first: 'wuwei', second: 'xiaorui', firstName: '无畏', secondName: '骁锐', fixedName: '陷阵',
        fixedDesc: '普通攻击伤害提高12%', forgeOptions: shaofuForgeOptions }
};

export const TREASURE_BASE_POINTS = 1;
export const TREASURE_UPGRADE_POINTS = 10;
export const TREASURE_MAX_POINTS = TREASURE_BASE_POINTS + TREASURE_UPGRADE_POINTS;
export const TREASURE_SECOND_UNLOCK_POINTS = 6;

export const treasureImageUrl = id =>
    `${import.meta.env.BASE_URL}assets/treasure/${id}.png${id === 'fenran' ? '?v=2' : ''}`;

export function treasureEvaluationVariants() {
    const secondMax = TREASURE_BASE_POINTS + TREASURE_MAX_POINTS - TREASURE_SECOND_UNLOCK_POINTS;
    return Object.entries(treasureSpecs).flatMap(([id, spec]) =>
        spec.forgeOptions.flatMap(forge => [
            { id, [spec.first]: TREASURE_MAX_POINTS, [spec.second]: TREASURE_BASE_POINTS, forge: forge.id, forgeValue: forge.max },
            { id, [spec.first]: TREASURE_SECOND_UNLOCK_POINTS, [spec.second]: secondMax, forge: forge.id, forgeValue: forge.max }
        ])
    );
}
