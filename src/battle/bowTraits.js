export const BOW_TRAITS = [
    { id: 'terrain', name: '地利', desc: '前锋防御+24；中军防御、谋略+10；大营攻击、谋略、防御+6' },
    { id: 'detour', name: '迂回', desc: '受到的所有伤害降低8%' },
    { id: 'volley', name: '齐射', desc: '正式回合前3回合造成的所有伤害提高15%' },
    { id: 'direct', name: '直射', desc: '正式回合后造成的所有伤害提高10%，与目标距离每增加1则降低2%' },
    { id: 'scatter', name: '散射', desc: '首次普通攻击时对目标相邻敌军造成伤害（伤害率40%）' }
];
export const BOW_TRAIT_IDS = new Set(BOW_TRAITS.map(trait => trait.id));
