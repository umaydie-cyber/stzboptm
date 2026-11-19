import { __HEROS__ } from './heros';
import { __SKILLS__ } from './skills';
import { matchupScore, simulateMatchupBatch, weightedEnvironmentScore } from './environmentScore';

function replaceHero(current, hero) {
    return {
        ...current,
        id: hero.id,
        equipskill: current.equipskill.map(id => Number(id) === hero.skill ? 0 : id),
        ...(hero.army !== 1 && { bowType: 'basic', bowTraits: [] }),
        ...(hero.army !== 2 && { infantryType: 'basic', infantryTraits: [] }),
        ...(hero.army !== 3 && { cavalryType: 'basic', cavalryTraits: [] })
    };
}

self.onmessage = ({ data: { name, build, opponents, excluded, evaluation, battlesPerOpponent } }) => {
    try {
        if (!Number.isSafeInteger(battlesPerOpponent) || battlesPerOpponent < 1) {
            throw new Error('测评场数必须是正整数');
        }
        const isHeroEvaluation = evaluation === 'hero';
        const roster = new Set(build.heros.map(hero => Number(hero.id)));
        const usedSkills = new Set([
            ...__HEROS__.filter(hero => roster.has(hero.id)).map(hero => hero.skill),
            ...build.heros.flatMap(hero => hero.equipskill.map(Number))
        ]);
        const candidates = isHeroEvaluation
            ? __HEROS__.filter(hero => !roster.has(hero.id))
            : __SKILLS__.filter(skill => skill.study === true && !usedSkills.has(skill.id));
        const slots = build.heros.flatMap((hero, heroIndex) =>
            isHeroEvaluation ? [{ heroId: hero.id, heroIndex }] : hero.equipskill.flatMap((skillId, slotIndex) =>
                Number(skillId) ? [{ heroId: hero.id, heroIndex, slotIndex, skillId }] : []
            )
        );
        if (!slots.length) throw new Error('请先为构筑配置至少一个可更换战法');

        const total = (1 + slots.length * candidates.length) * opponents.length * battlesPerOpponent;
        if (!Number.isSafeInteger(total)) throw new Error('模拟总场数过大，请调低评测场数');
        let completed = 0;
        let lastUpdate = performance.now();
        self.postMessage({ completed, total });
        const score = blue => weightedEnvironmentScore(opponents.map(({ build: red, weight }) => {
            const totals = { ownWounded: 0, ownDead: 0, enemyWounded: 0, enemyDead: 0 };
            simulateMatchupBatch({ blue, red }, totals, battlesPerOpponent);
            completed += battlesPerOpponent;
            const now = performance.now();
            if (now - lastUpdate >= 150) {
                self.postMessage({ completed, total });
                lastUpdate = now;
            }
            return { weight, ...matchupScore(totals, battlesPerOpponent) };
        })).merit;

        const baseline = score(build);
        const results = slots.map(slot => {
            const { heroIndex, slotIndex } = slot;
            const replacements = [];
            for (const candidate of candidates) {
                const { id } = candidate;
                const heros = [...build.heros];
                const current = heros[heroIndex];
                if (isHeroEvaluation) {
                    heros[heroIndex] = replaceHero(current, candidate);
                } else {
                    const equipskill = [...current.equipskill];
                    equipskill[slotIndex] = id;
                    heros[heroIndex] = { ...current, equipskill };
                }
                const merit = score({ ...build, heros });
                if (baseline !== null && merit !== null && merit > baseline) {
                    replacements.push({ id, merit });
                }
            }
            replacements.sort((a, b) => a.merit === b.merit ? a.id - b.id : b.merit - a.merit);
            return { ...slot, replacements };
        });
        self.postMessage({ completed, total, report: {
            name, excluded, baseline, results, evaluation, battlesPerOpponent,
            opponentCount: opponents.length, candidateCount: candidates.length
        } });
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};
