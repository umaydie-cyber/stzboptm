export const CAVALRY_TRAITS = [
    { id: 'surprise', name: '出奇', desc: '第1回合受到所有伤害降低60%' },
    { id: 'swift', name: '疾行', desc: '前3回合优先行动' },
    { id: 'guarded', name: '难测', desc: '受到普通攻击及追击战法伤害降低25%' },
    { id: 'break', name: '挫锐', desc: '对敌军当前兵力最高的武将造成所有伤害提高18%' },
    { id: 'rear', name: '扰后', desc: '对敌军中军及大营造成所有伤害提高10%' }
];
export const CAVALRY_TRAIT_IDS = new Set(CAVALRY_TRAITS.map(trait => trait.id));
