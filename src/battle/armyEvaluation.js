import { BOW_TYPES } from './bowTypes';
import { BOW_TRAITS } from './bowTraits';
import { INFANTRY_TYPES } from './infantryTypes';
import { INFANTRY_TRAITS } from './infantryTraits';
import { CAVALRY_TYPES } from './cavalryTypes';
import { CAVALRY_TRAITS } from './cavalryTraits';

export const ARMY_OPTIONS = {
    1: { typeKey: 'bowType', traitsKey: 'bowTraits', types: BOW_TYPES, traits: BOW_TRAITS },
    2: { typeKey: 'infantryType', traitsKey: 'infantryTraits', types: INFANTRY_TYPES, traits: INFANTRY_TRAITS },
    3: { typeKey: 'cavalryType', traitsKey: 'cavalryTraits', types: CAVALRY_TYPES, traits: CAVALRY_TRAITS }
};

export function armyEvaluationVariants(army, currentType) {
    const { types, traits } = ARMY_OPTIONS[army];
    const pairs = traits.flatMap(({ id: first }, index) =>
        traits.slice(index + 1).map(({ id: second }) => [first, second])
    );
    return types.filter(({ id }) => id !== 'basic' && id !== currentType)
        .flatMap(({ id }) => pairs.map(traits => ({ id, traits })));
}
