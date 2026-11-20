export const HERO_POOL_STORAGE_KEY = 'stzboptm.heroPool.v1';

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
