<script setup>
import { computed } from 'vue';
import { __ARMS__ } from '../battle/armys';
import { __HEROS__ } from '../battle/heros';
import { __SKILLS__ } from '../battle/skills';
import { BATTLE_METRICS, scoreLabel } from '../battle/statistics';
import { treasureImageUrl, treasureSpecs } from '../battle/treasures';
import { ARMY_OPTIONS } from '../battle/armyEvaluation';

const props = defineProps({ report: { type: Object, required: true } });
const isHeroEvaluation = computed(() => props.report.evaluation === 'hero');
const isTreasureEvaluation = computed(() => props.report.evaluation === 'treasure');
const isArmyEvaluation = computed(() => props.report.evaluation === 'army');
const hasSlotSpecificCandidates = computed(() => isTreasureEvaluation.value || isArmyEvaluation.value);
const replacementLabel = computed(() => ({ treasure: '替换宝物', hero: '替换武将', army: '兵种组合', skill: '替换战法' })[props.report.evaluation]);
const metricLabel = computed(() => BATTLE_METRICS[props.report.metric]);

const heroes = new Map(__HEROS__.map(hero => [hero.id, hero]));
const skills = new Map(__SKILLS__.map(skill => [skill.id, skill]));
const positions = ['大营', '中军', '前锋'];
const types = ['zh', 'zd', 'zj', 'bd'];
const armies = new Map(__ARMS__.map(army => [army.id, army.name]));
const candidateName = id => (isHeroEvaluation.value ? heroes : skills).get(Number(id)).name;
const treasurePoints = treasure => {
    const spec = treasureSpecs[treasure.id];
    return `${spec.firstName} ${treasure[spec.first]} · ${spec.secondName} ${treasure[spec.second]}`;
};
const treasureForge = treasure => {
    const option = treasureSpecs[treasure.id].forgeOptions.find(item => item.id === treasure.forge);
    return option ? `锻造 ${option.name} ${treasure.forgeValue}${option.unit || '%'}` : '未锻造';
};
const replacementKey = option => {
    if (option.treasure) return `${option.id}-${option.treasure.forge}-${option.treasure[treasureSpecs[option.id].first]}`;
    if (option.troops) return `${option.id}-${option.troops.traits.join('-')}`;
    return option.id;
};
const troopType = (army, id) => ARMY_OPTIONS[army].types.find(type => type.id === id);
const troopTraits = (army, ids) => ids.map(id => ARMY_OPTIONS[army].traits.find(trait => trait.id === id).name).join(' · ');
const armyName = id => armies.get(heroes.get(Number(id)).army);
const campIcon = id => `${import.meta.env.BASE_URL}assets/ui/camp${heroes.get(Number(id)).camp}.png`;
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
    <h3>原构筑环境{{ metricLabel }} {{ scoreLabel(report.baseline) }}</h3>
    <p v-if="isTreasureEvaluation">共测评 {{ report.candidateCount }} 个替换方案，每个方案对 {{ report.opponentCount }} 支环境队伍各模拟 {{ report.battlesPerOpponent }} 场。每次只替换一件宝物，分别全加第一条和第二条属性，并搭配每条满值锻造词条。</p>
    <p v-else-if="isArmyEvaluation">共测评 {{ report.candidateCount }} 个替换方案，每个方案对 {{ report.opponentCount }} 支环境队伍各模拟 {{ report.battlesPerOpponent }} 场。每次只更换一名武将的进阶兵种和两条特性。</p>
    <p v-else>每个位置测评 {{ report.candidateCount }} 个{{ isHeroEvaluation ? '候选武将' : '可学习战法' }}，逐一对 {{ report.opponentCount }} 支环境队伍各模拟 {{ report.battlesPerOpponent }} 场。</p>
    <p v-if="isHeroEvaluation">候选武将使用武将池中的等级、进阶、兵力、加点、兵种和特性，沿用原位置的宝物及可兼容的携带战法。</p>
    <p v-if="isHeroEvaluation && !report.candidateCount">没有可替换的候选武将，可在武将池中启用未上阵的武将。</p>
    <p>按环境加权{{ metricLabel }}的相对提升排序。模拟有随机波动，接近的结果可能互换。</p>
    <p v-if="report.baseline === null">原构筑{{ metricLabel }}无法计算，本次没有可比较的结果。</p>
    <section v-for="slot in report.candidateCount ? report.results : []" :key="`${slot.heroIndex}-${slot.slotIndex ?? ''}`" class="evaluation-slot">
        <h4>
            {{ positions[slot.heroIndex] }} · {{ heroes.get(Number(slot.heroId)).name }}
            <template v-if="hasSlotSpecificCandidates"> · {{ slot.candidateCount }} 个替换方案</template>
            <template v-else-if="!isHeroEvaluation"> · 战法 {{ slot.slotIndex + 1 }}</template>
        </h4>
        <div class="evaluation-comparison">
            <div class="evaluation-card" :class="{ 'wide-card': hasSlotSpecificCandidates }">
                <template v-if="isHeroEvaluation">
                    <img class="evaluation-camp" :src="campIcon(slot.heroId)" alt="">
                    <span>{{ candidateName(slot.heroId) }}</span>
                    <small>{{ armyName(slot.heroId) }} · 当前武将</small>
                </template>
                <template v-else-if="isTreasureEvaluation">
                    <img class="evaluation-treasure" :src="treasureImageUrl(slot.treasure.id)" alt="">
                    <span>{{ treasureSpecs[slot.treasure.id].name }} · 当前宝物</span>
                    <small>{{ treasurePoints(slot.treasure) }}</small>
                    <small>{{ treasureForge(slot.treasure) }}</small>
                </template>
                <template v-else-if="isArmyEvaluation">
                    <img v-if="troopType(slot.army, slot.troops.id).image" class="evaluation-army"
                        :src="troopType(slot.army, slot.troops.id).image" alt="">
                    <span>{{ troopType(slot.army, slot.troops.id).name }} · 当前兵种</span>
                    <small>{{ troopTraits(slot.army, slot.troops.traits) || '无特性' }}</small>
                </template>
                <template v-else>
                    <span class="evaluation-icon">
                        <img :src="icon(slot.skillId, 'border')" alt="">
                        <img :src="icon(slot.skillId, 'type')" alt="">
                    </span>
                    <span>{{ candidateName(slot.skillId) }}</span>
                    <small>当前战法</small>
                </template>
            </div>
            <p v-if="!slot.replacements.length">本次未测得评分更高的{{ replacementLabel }}。</p>
            <ul v-else class="evaluation-options">
                <li v-for="option in slot.replacements" :key="replacementKey(option)" class="evaluation-card"
                    :class="{ 'wide-card': hasSlotSpecificCandidates }" :title="`环境${metricLabel} ${scoreLabel(option.score)}`">
                    <img v-if="isHeroEvaluation" class="evaluation-camp" :src="campIcon(option.id)" alt="">
                    <img v-else-if="isTreasureEvaluation" class="evaluation-treasure" :src="treasureImageUrl(option.id)" alt="">
                    <img v-else-if="isArmyEvaluation" class="evaluation-army" :src="troopType(slot.army, option.id).image" alt="">
                    <span v-else class="evaluation-icon">
                        <img :src="icon(option.id, 'border')" alt="">
                        <img :src="icon(option.id, 'type')" alt="">
                    </span>
                    <span v-if="isArmyEvaluation">{{ troopType(slot.army, option.id).name }}</span>
                    <span v-else>{{ isTreasureEvaluation ? treasureSpecs[option.id].name : candidateName(option.id) }}</span>
                    <small v-if="isHeroEvaluation">{{ armyName(option.id) }}</small>
                    <template v-if="isTreasureEvaluation">
                        <small>{{ treasurePoints(option.treasure) }}</small>
                        <small>{{ treasureForge(option.treasure) }}</small>
                    </template>
                    <small v-if="isArmyEvaluation">{{ troopTraits(slot.army, option.troops.traits) }}</small>
                    <small v-if="hasSlotSpecificCandidates">{{ metricLabel }} {{ scoreLabel(option.score) }}</small>
                    <strong>{{ improvement(option.score, report.baseline) }}</strong>
                </li>
            </ul>
        </div>
    </section>
</template>

<style scoped>
.evaluation-slot { border-top: 1px solid #554d3b; margin-top: 14px; padding-top: 8px; }
.evaluation-comparison { display: flex; align-items: flex-start; gap: 12px; }
.evaluation-options { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; margin: 0; list-style: none; }
.evaluation-card { display: grid; justify-items: center; align-content: start; gap: 3px; width: 92px; flex-shrink: 0; box-sizing: border-box; padding: 6px 2px; background: #252830; border: 1px solid #554d3b; font-size: 14px; text-align: center; }
.evaluation-icon { display: grid; width: 36px; height: 36px; }
.evaluation-icon img { grid-area: 1 / 1; width: 100%; height: 100%; object-fit: contain; }
.evaluation-camp { width: 36px; height: 36px; object-fit: contain; }
.evaluation-card.wide-card { width: 132px; }
.evaluation-army { width: 85px; height: 36px; object-fit: contain; }
.evaluation-treasure { width: 48px; height: 48px; object-fit: contain; }
.evaluation-icon img + img { width: 78%; height: 78%; place-self: center; }
.evaluation-card strong { color: #a8d59b; }
.evaluation-card small { color: #d2c297; }
</style>
