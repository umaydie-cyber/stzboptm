import { __HEROS__ } from './battle/heros';
import { __SKILLS__ } from './battle/skills';
import { INFANTRY_TYPE_IDS } from './battle/infantryTypes';

export const PRESET_STORAGE_KEY = 'stzboptm.myBuilds.v1';
export const ENVIRONMENT_STORAGE_KEY = 'stzboptm.environmentTeams.v1';
const heroIds = new Set(__HEROS__.map(hero => hero.id));
const skillIds = new Set(__SKILLS__.map(skill => skill.id));
const camps = ['swift', 'iron', 'strategy', 'martial'];
const level = value => Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 10;
const plain = value => value && typeof value === 'object' && !Array.isArray(value);

export function validateBuild(build) {
    if (!plain(build) || !Array.isArray(build.heros) || build.heros.length !== 3 ||
        !Number.isFinite(Number(build.morale)) || Number(build.morale) < 0 || Number(build.morale) > 200 ||
        !level(build.generalPlatformLevel) || !plain(build.fourCampLevels) ||
        camps.some(key => !level(build.fourCampLevels[key]))) throw new Error('构筑的士气、点将台或四大营数据无效');
    for (const hero of build.heros) {
        if (!plain(hero) || !heroIds.has(Number(hero.id)) ||
            !Number.isInteger(Number(hero.level)) || Number(hero.level) < 1 || Number(hero.level) > 50 ||
            !Number.isInteger(Number(hero.up)) || Number(hero.up) < 0 || Number(hero.up) > 5 ||
            !Number.isInteger(Number(hero.arms)) || Number(hero.arms) < 1 ||
            !Array.isArray(hero.equipskill) || hero.equipskill.length !== 2 ||
            hero.equipskill.some(id => id != null && id !== 0 && !skillIds.has(Number(id))) ||
            !plain(hero.extraAttrsAlloc) ||
            ['atk', 'def', 'int', 'spd'].some(key => !Number.isFinite(Number(hero.extraAttrsAlloc[key])) || Number(hero.extraAttrsAlloc[key]) < 0)) {
            throw new Error('构筑中的武将或战法数据无效');
        }
        if (hero.treasure != null && (!plain(hero.treasure) || typeof hero.treasure.id !== 'string')) {
            throw new Error('构筑中的宝物数据无效');
        }
        if (hero.infantryType != null && (!INFANTRY_TYPE_IDS.has(hero.infantryType) ||
            (__HEROS__.find(item => item.id === Number(hero.id))?.army !== 2 && hero.infantryType !== 'basic'))) {
            throw new Error('构筑中的步兵兵种数据无效');
        }
    }
    return JSON.parse(JSON.stringify(build));
}

export function parseBuildPresets(text) {
    const data = JSON.parse(text);
    if (!plain(data) || data.version !== 1 || !Array.isArray(data.presets)) throw new Error('不是有效的构筑 JSON 文件');
    return data.presets.map(item => {
        if (!plain(item) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 60) {
            throw new Error('构筑名称无效');
        }
        return { id: typeof item.id === 'string' ? item.id : '', name: item.name.trim(), build: validateBuild(item.build) };
    });
}

export const serializeBuildPresets = presets => JSON.stringify({ version: 1, presets }, null, 2);

export function validateEnvironmentWeight(value) {
    const weight = Number(value);
    if (!Number.isInteger(weight) || weight < 1 || weight > 100) throw new Error('环境队伍权重必须是 1–100 的整数');
    return weight;
}

export function parseEnvironmentTeams(text) {
    const data = JSON.parse(text);
    if (!plain(data) || data.version !== 1 || !Array.isArray(data.teams)) throw new Error('环境队伍数据无效');
    return data.teams.map(item => {
        if (!plain(item) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 60) {
            throw new Error('环境队伍名称无效');
        }
        return { id: typeof item.id === 'string' ? item.id : '', name: item.name.trim(), weight: validateEnvironmentWeight(item.weight), build: validateBuild(item.build) };
    });
}

export const serializeEnvironmentTeams = teams => JSON.stringify({ version: 1, teams });
