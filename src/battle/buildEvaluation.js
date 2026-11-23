import { __HEROS__ } from './heros';
import { __SKILLS__ } from './skills';
import { weightedEnvironmentScore } from './environmentScore';
import { createHeroConfig, HERO_ATTRIBUTES, heroAttributePoints } from '../heroPool';
import { BATTLE_METRICS, DEFAULT_EVALUATION_METRIC } from './statistics';
import { treasureSpecs, treasureEvaluationVariants } from './treasures';
import { ARMY_OPTIONS, armyEvaluationVariants } from './armyEvaluation';

function replaceHero(current, { skill, config, extraAttrsAlloc }) {
    return {
        ...current,
        ...config,
        extraAttrsAlloc,
        equipskill: current.equipskill.map(id => Number(id) === skill ? 0 : id)
    };
}

const attributeKeys = Object.keys(HERO_ATTRIBUTES);

function heroAllocationVariants(config) {
    const points = heroAttributePoints(config.level);
    return attributeKeys.map(attribute => ({
        allocation: { attribute, points },
        extraAttrsAlloc: Object.fromEntries(attributeKeys.map(key => [key, key === attribute ? points : 0]))
    }));
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
        const replacements = __HEROS__.filter(hero => !roster.has(hero.id) && heroPool[hero.id]?.enabled !== false)
            .flatMap(({ id, skill }) => {
                const config = heroPool[id]?.config ?? createHeroConfig(id);
                return heroAllocationVariants(config).map(variant => ({ id, skill, config, ...variant }));
            });
        return build.heros.map((hero, heroIndex) => {
            const heroId = Number(hero.id);
            const currentAllocation = hero.extraAttrsAlloc;
            const ownVariants = heroAllocationVariants(hero)
                .filter(({ extraAttrsAlloc }) => attributeKeys.some(key => extraAttrsAlloc[key] !== Number(currentAllocation[key])))
                .map(variant => ({ id: heroId, ...variant }));
            return { heroId, heroIndex, currentAllocation, candidates: [...replacements, ...ownVariants] };
        });
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
export const ENVIRONMENT_BATTLES = 500;
export const EVALUATION_LABELS = { skill: '战法测评', hero: '武将测评', treasure: '宝物测评', army: '兵种测评' };

function prepareMatchups(builds, opponents, battlesPerOpponent, ownCamp, completeBuild) {
    const opponentCount = opponents.length;
    const jobCount = builds.length * opponentCount;
    const total = jobCount * battlesPerOpponent;
    if (!opponentCount) throw new Error('请先添加至少一支环境队伍');
    if (!Number.isSafeInteger(total)) throw new Error('模拟总场数过大，请调低评测场数');

    const rowsByBuild = builds.map(() => []);
    return {
        jobCount,
        total,
        job(index) {
            const candidate = builds[Math.floor(index / opponentCount)];
            const opponent = opponents[index % opponentCount].build;
            const config = ownCamp === 'red' ? { blue: opponent, red: candidate } : { blue: candidate, red: opponent };
            return { index, config, battlesPerOpponent, ownCamp };
        },
        record(index, row) {
            const buildIndex = Math.floor(index / opponentCount);
            const opponentIndex = index % opponentCount;
            const rows = rowsByBuild[buildIndex];
            rows.push({ opponentIndex, weight: opponents[opponentIndex].weight, ...row });
            if (rows.length === opponentCount) {
                rows.sort((a, b) => a.opponentIndex - b.opponentIndex);
                completeBuild(buildIndex, rows);
                rowsByBuild[buildIndex] = null;
            }
        }
    };
}

export function prepareEnvironmentComparison(builds, opponents, ownCamp) {
    const scores = new Array(builds.length);
    const plan = prepareMatchups(builds, opponents, ENVIRONMENT_BATTLES, ownCamp, (index, rows) => {
        scores[index] = weightedEnvironmentScore(rows);
    });
    return { ...plan, report: () => scores };
}

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
    const isHeroEvaluation = evaluation === 'hero';
    const isTreasureEvaluation = evaluation === 'treasure';
    const isArmyEvaluation = evaluation === 'army';
    const hasSlotSpecificCandidates = isHeroEvaluation || isTreasureEvaluation || isArmyEvaluation;
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
            } else if (isHeroEvaluation) {
                heros[heroIndex] = id === slot.heroId
                    ? { ...current, extraAttrsAlloc: candidate.extraAttrsAlloc }
                    : replaceHero(current, candidate);
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
                ...(isHeroEvaluation && { allocation: candidate.allocation }),
                ...(isTreasureEvaluation && { treasure: candidate }),
                ...(isArmyEvaluation && { troops: candidate })
            };
        });
        return { ...slot, candidateCount: candidates.length, variants };
    });

    const scores = new Array(builds.length);
    const plan = prepareMatchups(builds, opponents, battlesPerOpponent, ownCamp, (index, rows) => {
        scores[index] = weightedEnvironmentScore(rows)[metric];
    });

    function report() {
        const baseline = scores[0];
        const results = reportSlots.map(({ variants, ...slot }) => {
            const replacements = [];
            for (const candidate of variants) {
                const score = scores[candidate.buildIndex];
                if (baseline !== null && score !== null && score > baseline) {
                    replacements.push({ ...candidate, score });
                }
            }
            replacements.sort((a, b) => a.score === b.score
                ? (isTreasureEvaluation || isArmyEvaluation ? 0 : a.id - b.id)
                : b.score - a.score);
            return { ...slot, replacements };
        });
        return {
            name, excluded, baseline, results, evaluation, battlesPerOpponent, metric, opponentCount,
            candidateCount: hasSlotSpecificCandidates ? variantCount : slots[0].candidates.length
        };
    }

    return { ...plan, report, getBuild: index => builds[index] };
}
