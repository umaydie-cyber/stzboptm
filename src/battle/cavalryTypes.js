export const CAVALRY_TYPES = [
    { id: 'basic', name: '骑兵', image: '/stzboptm/assets/cavalry/basic.png', desc: '基础骑兵' },
    { id: 'light', name: '轻骑兵', image: '/stzboptm/assets/cavalry/light.png', desc: '速度属性全局+15；前4次造成伤害时，伤害提高18%' },
    { id: 'heavy', name: '重骑兵', image: '/stzboptm/assets/cavalry/heavy.png', desc: '前2回合受到普通攻击后反击（伤害率75%）' },
    { id: 'archer', name: '弓骑兵', image: '/stzboptm/assets/cavalry/archer.png', desc: '自身所有战法距离+1' },
    { id: 'iron', name: '铁骑兵', image: '/stzboptm/assets/cavalry/iron.png', desc: '每有一种混乱、暴走、怯战、犹豫状态，受到所有伤害降低25%' }
];

export const CAVALRY_TYPE_IDS = new Set(CAVALRY_TYPES.map(type => type.id));
