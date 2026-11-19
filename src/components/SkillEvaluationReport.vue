<script setup>
import { __HEROS__ } from '../battle/heros';
import { __SKILLS__ } from '../battle/skills';
import { scoreLabel } from '../battle/environmentScore';

defineProps({ report: { type: Object, required: true } });

const heroes = new Map(__HEROS__.map(hero => [hero.id, hero]));
const skills = new Map(__SKILLS__.map(skill => [skill.id, skill]));
const positions = ['大营', '中军', '前锋'];
const types = ['zh', 'zd', 'zj', 'bd'];
const icon = (id, part) => {
    const skill = skills.get(Number(id));
    const file = part === 'type' ? types[skill.type - 1] : skill.level === 'C' ? 'b' : skill.level.toLowerCase();
    return `${import.meta.env.BASE_URL}assets/ui/skill_${file}.png`;
};
const improvement = (value, baseline) => {
    if (value === Infinity) return '+∞';
    if (baseline === 0) return '从 0 提升';
    const percent = (value / baseline - 1) * 100;
    return percent < 0.1 ? '+<0.1%' : `+${percent.toFixed(1)}%`;
};
</script>

<template>
    <h3>原构筑环境武勋评分 {{ scoreLabel(report.baseline) }}</h3>
    <p>每个位置评测 {{ report.candidateCount }} 个可学习战法，逐一对 {{ report.opponentCount }} 支环境队伍各模拟 {{ report.battlesPerOpponent }} 场。</p>
    <p>按环境加权武勋评分的相对提升排序。模拟有随机波动，接近的结果可能互换。</p>
    <p v-if="report.baseline === null">原构筑武勋评分无法计算，本次没有可比较的结果。</p>
    <section v-for="slot in report.results" :key="`${slot.heroIndex}-${slot.slotIndex}`" class="evaluation-slot">
        <h4>{{ positions[slot.heroIndex] }} · {{ heroes.get(Number(slot.heroId)).name }} · 战法 {{ slot.slotIndex + 1 }}</h4>
        <div class="evaluation-comparison">
            <div class="evaluation-skill">
                <span class="evaluation-icon">
                    <img :src="icon(slot.skillId, 'border')" alt="">
                    <img :src="icon(slot.skillId, 'type')" alt="">
                </span>
                <span>{{ skills.get(Number(slot.skillId)).name }}</span>
                <small>当前战法</small>
            </div>
            <p v-if="!slot.replacements.length">本次未测得更高评分的替换战法。</p>
            <ul v-else class="evaluation-options">
                <li v-for="option in slot.replacements" :key="option.id" class="evaluation-skill" :title="`环境武勋评分 ${scoreLabel(option.merit)}`">
                    <span class="evaluation-icon">
                        <img :src="icon(option.id, 'border')" alt="">
                        <img :src="icon(option.id, 'type')" alt="">
                    </span>
                    <span>{{ skills.get(option.id).name }}</span>
                    <strong>{{ improvement(option.merit, report.baseline) }}</strong>
                </li>
            </ul>
        </div>
    </section>
</template>

<style scoped>
.evaluation-slot { border-top: 1px solid #554d3b; margin-top: 14px; padding-top: 8px; }
.evaluation-comparison { display: flex; align-items: flex-start; gap: 12px; }
.evaluation-options { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; margin: 0; list-style: none; }
.evaluation-skill { display: grid; justify-items: center; align-content: start; gap: 3px; width: 92px; flex-shrink: 0; box-sizing: border-box; padding: 6px 2px; background: #252830; border: 1px solid #554d3b; font-size: 14px; text-align: center; }
.evaluation-icon { display: grid; width: 36px; height: 36px; }
.evaluation-icon img { grid-area: 1 / 1; width: 100%; height: 100%; object-fit: contain; }
.evaluation-icon img + img { width: 78%; height: 78%; place-self: center; }
.evaluation-skill strong { color: #a8d59b; }
.evaluation-skill small { color: #d2c297; }
</style>
