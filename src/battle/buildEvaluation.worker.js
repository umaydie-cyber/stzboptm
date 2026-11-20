import { __HEROS__ } from './heros';
import { __SKILLS__ } from './skills';
import { matchupScore, simulateMatchupBatch, weightedEnvironmentScore } from './environmentScore';
import { createHeroConfig } from '../heroPool';
import { BATTLE_METRICS, DEFAULT_EVALUATION_METRIC } from './statistics';
import { treasureSpecs, treasureEvaluationVariants } from './treasures';
import { ARMY_OPTIONS, armyEvaluationVariants } from './armyEvaluation';

function replaceHero(current, hero, config) {
    return {
        ...current,
        ...config,
        equipskill: current.equipskill.map(id => Number(id) === hero.skill ? 0 : id)
    };
}

function evaluationSlots(build, evaluation, heroPool) {
    if (evaluation === 'treasure') {
        const variants = treasureEvaluationVariants();
        return build.heros.flatMap(({ id: heroId, treasure }, heroIndex) => {
            if (!Object.hasOwn(treasureSpecs, treasure?.id)) return [];
            const { first, second } = treasureSpecs[treasure.id];
            const candidates = variants.filter(candidate => candidate.id !== treasure.id ||
                candidate[first] !== Number(treasure[first]) ||
                candidate[second] !== Number(treasure[second]) ||
                candidate.forge !== treasure.forge ||
                candidate.forgeValue !== Number(treasure.forgeValue));
            return [{ heroId, heroIndex, treasure, candidates }];
        });
    }
    if (evaluation === 'army') {
        return build.heros.flatMap((hero, heroIndex) => {
            const heroId = Number(hero.id);
            const army = __HEROS__.find(item => item.id === heroId)?.army;
            const options = ARMY_OPTIONS[army];
            if (!options) return [];
            const id = hero[options.typeKey] || 'basic';
            const traits = id === 'basic' ? [] : hero[options.traitsKey] || [];
            const troops = { id, traits };
            return [{ heroId, heroIndex, army, troops, candidates: armyEvaluationVariants(army, troops) }];
        });
    }

    const roster = new Set(build.heros.map(hero => Number(hero.id)));
    if (evaluation === 'hero') {
        const candidates = __HEROS__.filter(hero => !roster.has(hero.id) && heroPool[hero.id]?.enabled !== false);
        return build.heros.map((hero, heroIndex) => ({ heroId: hero.id, heroIndex, candidates }));
    }

    const usedSkills = new Set([
        ...__HEROS__.filter(hero => roster.has(hero.id)).map(hero => hero.skill),
        ...build.heros.flatMap(hero => hero.equipskill.map(Number))
    ]);
    const candidates = __SKILLS__.filter(skill => skill.study === true && !usedSkills.has(skill.id));
    return build.heros.flatMap((hero, heroIndex) => hero.equipskill.flatMap((skillId, slotIndex) =>
        Number(skillId) ? [{ heroId: hero.id, heroIndex, slotIndex, skillId, candidates }] : []
    ));
}

self.onmessage = ({ data: {
    name, build, opponents, excluded, evaluation, battlesPerOpponent,
    heroPool = {}, metric = DEFAULT_EVALUATION_METRIC, ownCamp = 'blue'
} }) => {
    try {
        if (!Number.isSafeInteger(battlesPerOpponent) || battlesPerOpponent < 1) {
            throw new Error('测评场数必须是正整数');
        }
        if (!Object.hasOwn(BATTLE_METRICS, metric)) throw new Error('评测指标无效');
        const slots = evaluationSlots(build, evaluation, heroPool);
        const isTreasureEvaluation = evaluation === 'treasure';
        const isArmyEvaluation = evaluation === 'army';
        const hasSlotSpecificCandidates = isTreasureEvaluation || isArmyEvaluation;
        if (!slots.length) {
            const message = {
                treasure: '这套构筑没有装备宝物',
                army: '这套构筑没有可测评兵种的武将',
                skill: '请先为构筑配置至少一个可更换战法'
            };
            throw new Error(message[evaluation] || '当前阵容没有可测评的位置');
        }

        const variantCount = slots.reduce((count, slot) => count + slot.candidates.length, 0);
        const total = (1 + variantCount) * opponents.length * battlesPerOpponent;
        if (!Number.isSafeInteger(total)) throw new Error('模拟总场数过大，请调低评测场数');
        let completed = 0;
        let lastUpdate = performance.now();
        self.postMessage({ completed, total });
        const score = build => weightedEnvironmentScore(opponents.map(({ build: opponent, weight }) => {
            const totals = { ownWounded: 0, ownDead: 0, enemyWounded: 0, enemyDead: 0 };
            const config = ownCamp === 'red' ? { blue: opponent, red: build } : { blue: build, red: opponent };
            simulateMatchupBatch(config, totals, battlesPerOpponent, ownCamp);
            completed += battlesPerOpponent;
            const now = performance.now();
            if (now - lastUpdate >= 150) {
                self.postMessage({ completed, total });
                lastUpdate = now;
            }
            return { weight, ...matchupScore(totals, battlesPerOpponent) };
        }))[metric];

        const baseline = score(build);
        const results = slots.map(({ candidates, ...slot }) => {
            const { heroIndex, slotIndex } = slot;
            const replacements = [];
            for (const candidate of candidates) {
                const { id } = candidate;
                const heros = [...build.heros];
                const current = heros[heroIndex];
                if (isTreasureEvaluation) {
                    heros[heroIndex] = { ...current, treasure: candidate };
                } else if (isArmyEvaluation) {
                    const { typeKey, traitsKey } = ARMY_OPTIONS[slot.army];
                    heros[heroIndex] = { ...current, [typeKey]: id, [traitsKey]: candidate.traits };
                } else if (evaluation === 'hero') {
                    const config = heroPool[id]?.config ?? createHeroConfig(id);
                    heros[heroIndex] = replaceHero(current, candidate, config);
                } else {
                    const equipskill = [...current.equipskill];
                    equipskill[slotIndex] = id;
                    heros[heroIndex] = { ...current, equipskill };
                }
                const value = score({ ...build, heros });
                if (baseline !== null && value !== null && value > baseline) {
                    replacements.push({
                        id, score: value,
                        ...(isTreasureEvaluation && { treasure: candidate }),
                        ...(isArmyEvaluation && { troops: candidate })
                    });
                }
            }
            replacements.sort((a, b) => a.score === b.score ? (hasSlotSpecificCandidates ? 0 : a.id - b.id) : b.score - a.score);
            return { ...slot, candidateCount: candidates.length, replacements };
        });
        self.postMessage({ completed, total, report: {
            name, excluded, baseline, results, evaluation, battlesPerOpponent, metric,
            opponentCount: opponents.length,
            candidateCount: hasSlotSpecificCandidates ? variantCount : slots[0].candidates.length
        } });
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};
