export const INFANTRY_TRAITS = [
    { id: 'defense', name: '守备', desc: '受到所有伤害降低6%；作为防守方时额外降低10%' },
    { id: 'sharp', name: '利刃', desc: '自身每有一个非主动类战法，攻击属性提高22' },
    { id: 'formation', name: '列阵', desc: '造成的主动战法伤害提高10%' },
    { id: 'strategy', name: '文韬', desc: '第3回合起，每回合首次造成的策略伤害提高15%' },
    { id: 'brave', name: '勇毅', desc: '受到弓兵和步兵的策略伤害降低15%' }
];
export const INFANTRY_TRAIT_IDS = new Set(INFANTRY_TRAITS.map(trait => trait.id));
