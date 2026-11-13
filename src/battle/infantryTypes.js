export const INFANTRY_TYPES = [
    { id: 'basic', name: '步兵', icon: '步', desc: '基础步兵' },
    { id: 'heavy', name: '重步兵', image: '/stzboptm/assets/infantry/heavy.png', desc: '速度-15；受到主动战法伤害-12%，每次行动前再降低8%' },
    { id: 'pike', name: '长枪兵', image: '/stzboptm/assets/infantry/pike.png', desc: '克制骑兵，被弓兵克制；造成所有伤害+8%' },
    { id: 'guard', name: '禁卫', image: '/stzboptm/assets/infantry/guard.png', desc: '受到所有伤害-6%；受到追击战法伤害-20%' },
    { id: 'tribal', name: '蛮兵', image: '/stzboptm/assets/infantry/tribal.png', desc: '造成所有伤害+18%' }
];

export const INFANTRY_TYPE_IDS = new Set(INFANTRY_TYPES.map(type => type.id));
