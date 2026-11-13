export const BOW_TYPES = [
    { id: 'basic', name: '弓兵', image: '/stzboptm/assets/bow/basic.png', desc: '基础弓兵' },
    { id: 'longbow', name: '长弓兵', image: '/stzboptm/assets/bow/longbow.png', desc: '攻击距离+1；前2回合优先行动' },
    { id: 'deadly', name: '死士', image: '/stzboptm/assets/bow/deadly.png', desc: '攻击距离-1；攻击、防御、谋略属性各+18' },
    { id: 'crossbow', name: '弩兵', image: '/stzboptm/assets/bow/crossbow.png', desc: '造成的所有伤害提高8%' }
];

export const BOW_TYPE_IDS = new Set(BOW_TYPES.map(type => type.id));
