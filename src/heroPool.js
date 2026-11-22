export const HERO_POOL_STORAGE_KEY = 'stzboptm.heroPool.v1';
export const HERO_ATTRIBUTES = { atk: '攻击', def: '防御', int: '谋略', spd: '速度' };

export function heroAttributePoints(level) {
    return Math.floor(level / 10) * 10 + 50;
}

export function createHeroConfig(id) {
    return {
        id,
        level: 40,
        up: 5,
        arms: 10000,
        extraAttrsAlloc: { atk: 0, def: 0, int: 0, spd: 0 },
        infantryType: 'basic',
        infantryTraits: [],
        cavalryType: 'basic',
        cavalryTraits: [],
        bowType: 'basic',
        bowTraits: []
    };
}
