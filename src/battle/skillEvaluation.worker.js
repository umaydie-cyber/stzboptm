import { __HEROS__ } from './heros';
import { __SKILLS__ } from './skills';
import { matchupScore, simulateMatchupBatch, weightedEnvironmentScore } from './environmentScore';

const battlesPerOpponent = 100;
const innateSkills = new Map(__HEROS__.map(hero => [hero.id, hero.skill]));

self.onmessage = ({ data: { name, build, opponents, excluded } }) => {
    try {
        const used = new Set(build.heros.flatMap(hero => [
            innateSkills.get(Number(hero.id)), ...hero.equipskill.map(Number)
        ]));
        const candidates = __SKILLS__.filter(skill => skill.study === true && !used.has(skill.id));
        const slots = build.heros.flatMap((hero, heroIndex) => hero.equipskill.flatMap((skillId, slotIndex) =>
            Number(skillId) ? [{ heroId: hero.id, heroIndex, slotIndex, skillId }] : []
        ));
        if (!slots.length) throw new Error('请先为构筑配置至少一个可更换战法');

        const total = (1 + slots.length * candidates.length) * opponents.length * battlesPerOpponent;
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
            for (const { id } of candidates) {
                const heros = [...build.heros];
                const equipskill = [...heros[heroIndex].equipskill];
                equipskill[slotIndex] = id;
                heros[heroIndex] = { ...heros[heroIndex], equipskill };
                const merit = score({ ...build, heros });
                if (baseline !== null && merit !== null && merit > baseline) {
                    replacements.push({ id, merit });
                }
            }
            replacements.sort((a, b) => a.merit === b.merit ? a.id - b.id : b.merit - a.merit);
            return { ...slot, replacements };
        });
        self.postMessage({ completed, total, report: {
            name, excluded, baseline, results, battlesPerOpponent,
            opponentCount: opponents.length, candidateCount: candidates.length
        } });
    } catch (error) {
        self.postMessage({ error: error.message });
    }
};
