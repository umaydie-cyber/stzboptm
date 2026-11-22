import { __HEROS__ } from './heros';
import { __SKILLS__ } from './skills';
import { weightedEnvironmentScore } from './environmentScore';
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

export const MAX_EVALUATION_WORKERS = 16;

export function prepareBuildEvaluation({
    name, build, opponents, excluded, evaluation, battlesPerOpponent,
    heroPool = {}, metric = DEFAULT_EVALUATION_METRIC, ownCamp = 'blue'
}) {
    if (!Number.isSafeInteger(battlesPerOpponent) || battlesPerOpponent < 1) {
        throw new Error('测评场数必须是正整数');
    }
    if (!Object.hasOwn(BATTLE_METRICS, metric)) throw new Error('评测指标无效');
    if (!opponents.length) throw new Error('请先添加至少一支环境队伍');

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
    const opponentCount = opponents.length;
    const jobCount = (1 + variantCount) * opponentCount;
    const total = jobCount * battlesPerOpponent;
    if (!Number.isSafeInteger(total)) throw new Error('模拟总场数过大，请调低评测场数');

    const builds = [build];
    const reportSlots = slots.map(({ candidates, ...slot }) => {
        const { heroIndex, slotIndex } = slot;
        const current = build.heros[heroIndex];
        const variants = candidates.map(candidate => {
            const { id } = candidate;
            const heros = [...build.heros];
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
            const buildIndex = builds.length;
            builds.push({ ...build, heros });
            return {
                buildIndex,
                id,
                ...(isTreasureEvaluation && { treasure: candidate }),
                ...(isArmyEvaluation && { troops: candidate })
            };
        });
        return { ...slot, candidateCount: candidates.length, variants };
    });

    const rowsByBuild = builds.map(() => []);
    const scores = new Array(builds.length);
    function job(index) {
        const candidate = builds[Math.floor(index / opponentCount)];
        const opponent = opponents[index % opponentCount].build;
        const config = ownCamp === 'red' ? { blue: opponent, red: candidate } : { blue: candidate, red: opponent };
        return { index, config, battlesPerOpponent, ownCamp };
    }

    function record(index, row) {
        const buildIndex = Math.floor(index / opponentCount);
        const opponentIndex = index % opponentCount;
        const rows = rowsByBuild[buildIndex];
        rows.push({ opponentIndex, weight: opponents[opponentIndex].weight, ...row });
        if (rows.length === opponentCount) {
            rows.sort((a, b) => a.opponentIndex - b.opponentIndex);
            scores[buildIndex] = weightedEnvironmentScore(rows)[metric];
            rowsByBuild[buildIndex] = null;
        }
    }

    function report() {
        const baseline = scores[0];
        const results = reportSlots.map(({ variants, ...slot }) => {
            const replacements = [];
            for (const { buildIndex, ...candidate } of variants) {
                const score = scores[buildIndex];
                if (baseline !== null && score !== null && score > baseline) {
                    replacements.push({ ...candidate, score });
                }
            }
            replacements.sort((a, b) => a.score === b.score ? (hasSlotSpecificCandidates ? 0 : a.id - b.id) : b.score - a.score);
            return { ...slot, replacements };
        });
        return {
            name, excluded, baseline, results, evaluation, battlesPerOpponent, metric, opponentCount,
            candidateCount: hasSlotSpecificCandidates ? variantCount : slots[0].candidates.length
        };
    }

    return { jobCount, total, job, record, report };
}
