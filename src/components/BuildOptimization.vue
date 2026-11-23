<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { prepareBuildEvaluation, prepareEnvironmentComparison, ENVIRONMENT_BATTLES, EVALUATION_LABELS } from '../battle/buildEvaluation';
import { runEvaluation } from '../battle/runEvaluation';
import { ARMY_OPTIONS } from '../battle/armyEvaluation';
import { __HEROS__ } from '../battle/heros';
import { __SKILLS__ } from '../battle/skills';
import { BATTLE_METRICS, scoreLabel } from '../battle/statistics';
import { treasureSpecs } from '../battle/treasures';
import { HERO_ATTRIBUTES } from '../heroPool';

const props = defineProps({ context: Object, saveBuild: Function });
const emit = defineEmits(['close']);
const { context } = props;
const dialog = ref(null);
const stage = ref('choose');
const evaluation = ref('skill');
const current = shallowRef(context.build);
const initialScore = shallowRef(null);
const currentScore = shallowRef(null);
const suggestions = shallowRef([]);
const proposal = shallowRef(null);
const kept = ref(0);
const error = ref('');
const notice = ref('');
const progress = ref(null);
const saveName = ref(`${context.name.slice(0, 56)}（优化）`);
let controller;

onMounted(() => dialog.value.showModal());
onBeforeUnmount(() => {
    controller?.abort();
    dialog.value?.close();
});

const positions = ['大营', '中军', '前锋'];
const heroName = id => __HEROS__.find(hero => hero.id === Number(id))?.name || '未知武将';
const skillName = id => __SKILLS__.find(skill => skill.id === Number(id))?.name || '未携带';
const roster = computed(() => current.value.heros.map(hero => heroName(hero.id)).join(' · '));
const scores = computed(() => {
    const comparison = proposal.value?.score;
    return Object.entries(BATTLE_METRICS).map(([key, label]) => {
        const original = initialScore.value?.[key];
        const accepted = currentScore.value?.[key];
        const trial = comparison?.[key];
        const latest = comparison ? trial : accepted;
        const delta = original == null || latest == null ? null : latest === original ? 0 : latest - original;
        return { key, label, original, accepted, trial, delta };
    });
});
const round = computed(() => kept.value + 1);
const progressMessage = computed(() => {
    if (!progress.value) return '';
    const { label, completed, total } = progress.value;
    return `${label} · ${completed} / ${total} 场`;
});

function heroPoints(points) {
    return Object.entries(HERO_ATTRIBUTES)
        .filter(([key]) => Number(points[key]) > 0)
        .map(([key, label]) => `${label} ${points[key]}`).join(' · ') || '未加点';
}

function treasureLabel(treasure) {
    const spec = treasureSpecs[treasure.id];
    const forge = spec.forgeOptions.find(item => item.id === treasure.forge);
    const forging = forge ? `${forge.name} ${treasure.forgeValue}${forge.unit || '%'}` : '未锻造';
    return `${spec.name} · ${spec.firstName} ${treasure[spec.first]} / ${spec.secondName} ${treasure[spec.second]} · ${forging}`;
}

function troopLabel(army, { id, traits }) {
    const options = ARMY_OPTIONS[army];
    const type = options.types.find(item => item.id === id);
    return [type.name, ...traits.map(key => options.traits.find(item => item.id === key).name)].join(' · ');
}

function describeChange(slot, option, build) {
    const position = `${positions[slot.heroIndex]} · ${heroName(slot.heroId)}`;
    switch (evaluation.value) {
        case 'hero':
            return {
                position,
                before: `${heroName(slot.heroId)} · ${heroPoints(slot.currentAllocation)}`,
                after: `${heroName(option.id)} · ${heroPoints(build.heros[slot.heroIndex].extraAttrsAlloc)}`
            };
        case 'treasure':
            return { position, before: treasureLabel(slot.treasure), after: treasureLabel(option.treasure) };
        case 'army':
            return { position, before: troopLabel(slot.army, slot.troops), after: troopLabel(slot.army, option.troops) };
        default:
            return { position: `${position} · 战法 ${slot.slotIndex + 1}`, before: skillName(slot.skillId), after: skillName(option.id) };
    }
}

async function run(label, prepare, receive) {
    if (controller) return;
    const request = new AbortController();
    controller = request;
    error.value = '';
    notice.value = '';
    try {
        const plan = prepare();
        const result = await runEvaluation(plan, {
            workerCount: context.workerCount,
            signal: request.signal,
            onProgress(completed, total) { progress.value = { label, completed, total }; }
        });
        if (!request.signal.aborted) receive(result, plan);
    } catch (failure) {
        if (!request.signal.aborted) error.value = failure.message;
    } finally {
        controller = undefined;
        progress.value = null;
    }
}

function evaluate() {
    run(EVALUATION_LABELS[evaluation.value], () => prepareBuildEvaluation({
        ...context, build: current.value, evaluation: evaluation.value, excluded: 0
    }), (report, plan) => {
        const best = report.results.flatMap(slot => slot.replacements.map(option => ({ slot, option })))
            .sort((a, b) => b.option.score - a.option.score).slice(0, 3);
        if (!best.length) {
            notice.value = report.baseline === null
                ? '当前构筑的所选指标无法计算，请换一种测评指标后重新开始。'
                : '本轮未找到评分更高的方案，可以换一种测评。';
            return;
        }
        suggestions.value = best.map(({ slot, option }) => {
            const build = plan.getBuild(option.buildIndex);
            return { key: option.buildIndex, build, score: option.score, ...describeChange(slot, option, build) };
        });
        stage.value = 'suggest';
    });
}

function compare(suggestion) {
    const needsInitial = !initialScore.value;
    const builds = needsInitial ? [context.build, suggestion.build] : [suggestion.build];
    run('环境强度对比', () => prepareEnvironmentComparison(builds, context.opponents, context.ownCamp), results => {
        if (needsInitial) initialScore.value = results[0];
        proposal.value = { suggestion, score: results.at(-1) };
        stage.value = 'compare';
    });
}

function keep() {
    current.value = proposal.value.suggestion.build;
    currentScore.value = proposal.value.score;
    kept.value++;
    choose();
}

function choose() {
    proposal.value = null;
    suggestions.value = [];
    error.value = '';
    notice.value = '';
    stage.value = 'choose';
}

function reconsider() {
    proposal.value = null;
    stage.value = 'suggest';
}

function finish() {
    if (progress.value) return;
    if (!kept.value) {
        emit('close');
        return;
    }
    proposal.value = null;
    error.value = '';
    notice.value = '';
    stage.value = 'finish';
}

function closeFromKeyboard() {
    if (progress.value) controller?.abort();
    else if (stage.value !== 'finish') finish();
}

function save() {
    try {
        props.saveBuild(saveName.value, current.value);
        emit('close');
    } catch (failure) {
        error.value = failure.message;
    }
}

function formatDelta(value) {
    if (value === null) return '—';
    if (value === 0) return '0.00';
    return `${value > 0 ? '+' : '−'}${scoreLabel(Math.abs(value))}`;
}
</script>

<template>
    <dialog ref="dialog" class="optimization" aria-labelledby="optimization-title" @cancel.prevent="closeFromKeyboard">
        <header class="optimization-header">
            <div>
                <h2 id="optimization-title">辅助优化</h2>
                <p>{{ context.name }} · {{ context.ownCamp === 'red' ? '守方' : '攻方' }} · {{ context.opponents.length }} 支环境队伍</p>
            </div>
            <button v-if="stage !== 'finish'" type="button" :disabled="!!progress" @click="finish">结束优化</button>
        </header>

        <div class="optimization-body" :aria-busy="!!progress">
            <p class="roster">{{ roster }}</p>
            <p v-if="error" class="error" role="alert">{{ error }}</p>
            <p v-if="notice" role="status">{{ notice }}</p>

            <div v-if="progress" class="progress-panel" role="status">
                <label for="optimization-progress">{{ progressMessage }}</label>
                <progress id="optimization-progress" :value="progress.completed" :max="progress.total"></progress>
                <button type="button" @click="controller.abort()">取消本次模拟</button>
            </div>

            <template v-else-if="stage === 'choose'">
                <h3>第 {{ round }} 轮 · 选择测评</h3>
                <fieldset class="evaluation-choices">
                    <legend class="sr-only">测评类型</legend>
                    <label v-for="(label, key) in EVALUATION_LABELS" :key="key" :class="{ selected: evaluation === key }">
                        <input v-model="evaluation" type="radio" name="optimization-evaluation" :value="key">
                        {{ label }}
                    </label>
                </fieldset>
                <p class="muted">按{{ BATTLE_METRICS[context.metric] }}推荐最多 3 个方案。每个方案对每支环境队伍模拟 {{ context.battlesPerOpponent }} 场。</p>
                <button class="primary" type="button" @click="evaluate">开始测评</button>
            </template>

            <template v-else-if="stage === 'suggest'">
                <h3>第 {{ round }} 轮 · {{ EVALUATION_LABELS[evaluation] }}建议</h3>
                <ul class="suggestions">
                    <li v-for="suggestion in suggestions" :key="suggestion.key">
                        <div>
                            <strong>{{ suggestion.position }}</strong>
                            <p class="muted">原配置 · {{ suggestion.before }}</p>
                            <p>建议 · {{ suggestion.after }}</p>
                        </div>
                        <div class="suggestion-action">
                            <span>{{ BATTLE_METRICS[context.metric] }} {{ scoreLabel(suggestion.score) }}</span>
                            <button class="primary" type="button" @click="compare(suggestion)">对比此方案</button>
                        </div>
                    </li>
                </ul>
                <button type="button" @click="choose">返回选择测评</button>
            </template>

            <template v-else-if="stage === 'compare'">
                <h3>第 {{ round }} 轮 · 环境强度对比</h3>
                <p>{{ proposal.suggestion.position }}：{{ proposal.suggestion.before }} → {{ proposal.suggestion.after }}</p>
            </template>

            <template v-else-if="stage === 'finish'">
                <h3>优化结果 · 已保留 {{ kept }} 项改动</h3>
            </template>

            <div v-if="!progress && initialScore && (stage === 'compare' || currentScore && stage !== 'suggest')" class="comparison">
                <table>
                    <caption>环境加权评分 · 每套阵容对每支环境队伍模拟 {{ ENVIRONMENT_BATTLES }} 场</caption>
                    <thead>
                        <tr>
                            <th scope="col">指标</th>
                            <th scope="col">初始阵容</th>
                            <th v-if="currentScore" scope="col">{{ stage === 'finish' ? '优化结果' : '已保留阵容' }}</th>
                            <th v-if="proposal" scope="col">本轮方案</th>
                            <th scope="col">较初始变化</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="row in scores" :key="row.key" :class="{ highlighted: row.key === context.metric }">
                            <th scope="row">{{ row.label }}</th>
                            <td>{{ scoreLabel(row.original) }}</td>
                            <td v-if="currentScore">{{ scoreLabel(row.accepted) }}</td>
                            <td v-if="proposal">{{ scoreLabel(row.trial) }}</td>
                            <td :class="{ gain: row.delta > 0, loss: row.delta < 0 }">{{ formatDelta(row.delta) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <footer v-if="!progress && stage === 'compare'" class="actions">
                <button type="button" @click="reconsider">放弃本轮方案</button>
                <button class="primary" type="button" @click="keep">保留并继续</button>
            </footer>

            <form v-if="stage === 'finish'" class="finish-form" @submit.prevent="save">
                <label>新构筑名称 <input v-model="saveName" required maxlength="60"></label>
                <div class="actions">
                    <button type="button" @click="choose">继续优化</button>
                    <button type="button" @click="emit('close')">不保存并关闭</button>
                    <button class="primary" type="submit">另存优化构筑</button>
                </div>
            </form>
        </div>
    </dialog>
</template>

<style scoped>
.optimization {
    width: min(760px, calc(100% - 24px));
    max-width: none;
    max-height: calc(100dvh - 24px);
    padding: 0;
    border: 1px solid #746851;
    border-radius: 12px;
    background: #1d2025;
    color: #f0eadc;
    box-sizing: border-box;
    font: 15px/1.5 system-ui, sans-serif;
}
.optimization::backdrop { background: #08090bcc; }
.optimization-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 24px 16px;
    border-bottom: 1px solid #45413a;
}
h2, h3, p { margin: 0; }
h2 { font-size: 23px; }
h3 { margin-bottom: 10px; font-size: 17px; }
.optimization-header p, .muted, caption { color: #c1bdaf; }
.optimization-body { padding: 18px 24px 24px; }
.roster { margin-bottom: 16px; color: #f4d893; font-weight: 650; }
.error, .loss { color: #ffb3aa; }
.gain { color: #b0e2a2; }
.error, [role="status"] { margin-bottom: 12px; }
button, input { font: inherit; }
button {
    padding: 7px 12px;
    color: inherit;
    background: #30333a;
    border: 1px solid #635e51;
    border-radius: 6px;
    cursor: pointer;
}
button.primary { color: #20190c; background: #e7ca89; border-color: #e7ca89; font-weight: 650; }
button:disabled { opacity: .48; cursor: default; }
button:focus-visible, input:focus-visible, .selected:focus-within { outline: 2px solid #f3d592; outline-offset: 2px; }
.evaluation-choices { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 0 0 10px; border: 0; padding: 0; }
.evaluation-choices label { display: flex; align-items: center; gap: 5px; padding: 9px; border: 1px solid #635e51; border-radius: 6px; cursor: pointer; }
.evaluation-choices .selected { border-color: #d7b977; background: #3b3425; }
.evaluation-choices + p { margin-bottom: 12px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.suggestions { list-style: none; display: grid; gap: 8px; margin: 0 0 12px; padding: 0; }
.suggestions li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid #4c4b45;
    border-radius: 7px;
    background: #262930;
}
.suggestion-action { display: grid; justify-items: end; gap: 6px; flex-shrink: 0; }
.comparison { margin-top: 18px; overflow-x: auto; }
table { width: 100%; min-width: 420px; border-collapse: collapse; text-align: right; font-variant-numeric: tabular-nums; }
caption { text-align: left; margin-bottom: 6px; }
th, td { padding: 8px; border-bottom: 1px solid #45413a; white-space: nowrap; }
th:first-child { text-align: left; }
tr.highlighted { background: #373326; }
.actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.progress-panel { display: grid; gap: 10px; justify-items: start; font-variant-numeric: tabular-nums; }
progress { width: 100%; accent-color: #e7ca89; }
.finish-form { margin-top: 18px; }
.finish-form input { padding: 6px 8px; width: min(280px, 100%); color: inherit; background: #252830; border: 1px solid #746851; border-radius: 5px; box-sizing: border-box; }
@media (max-width: 580px) {
    .optimization-header, .optimization-body { padding: 14px; }
    .evaluation-choices { grid-template-columns: repeat(2, 1fr); }
    .suggestions li { display: grid; }
    .suggestion-action { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; }
    table { min-width: 0; font-size: 13px; }
    th, td { padding: 7px 4px; }
    th { white-space: normal; }
}
</style>
