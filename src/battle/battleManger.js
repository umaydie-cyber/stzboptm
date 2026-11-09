/**
 * 战斗管理器
 */

import { BattleHero } from "./battleHero";
import { Record } from './record';
import { keepTwoDecimal } from "../uilts";

const BattleRound = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
const TROOP_BONUSES = {
    1: { name: '弓兵', attrs: [['def', '防御'], ['spd', '速度']] },
    2: { name: '步兵', attrs: [['def', '防御'], ['atk', '攻击']] },
    3: { name: '骑兵', attrs: [['atk', '攻击'], ['spd', '速度']] }
};
const CAMP_NAMES = { 1: '蜀', 2: '魏', 3: '吴', 4: '汉', 5: '群', 6: '晋' };
const TEAM_ATTRS = ['atk', 'def', 'int', 'spd'];
const FOUR_CAMPS = {
    swift: { name: '疾风营', attr: 'spd', label: '速度' },
    iron: { name: '铁壁营', attr: 'def', label: '防御' },
    strategy: { name: '军机营', attr: 'int', label: '谋略' },
    martial: { name: '尚武营', attr: 'atk', label: '攻击' }
};

export class BattleManger {
    constructor(heroBattleTeam, options = {}){
        this.Stats = { blue: {}, red: {} };
        this.CollectRecords = options.records !== false;
        this.BattleHeros = [];
        //战报详情
        this.Record = new Record(this);

        this.Round = null;

        //因为某一方的大营阵亡使战斗结束
        this.Over = false;

        this.BlueTeam = {
            hero:[],
            arms:0,
            hurtArms:0,
            total:0
        };

        this.RedTeam = {
            hero:[],
            arms:0,
            hurtArms:0,
            total:0
        };

        this.SortSpdHeros = [];
        let redindex = heroBattleTeam.blue.heros.length + heroBattleTeam.red.heros.length;
        let blueindex = 1;
        heroBattleTeam.blue.heros.forEach((e,i) => {
            let Posname = '';
            if(heroBattleTeam.blue.heros.length == 2){
                switch (i) {
                    case 0:
                        Posname = '大营';
                    break;
                    case 1:
                        Posname = '中军';
                    break;
                }
            }else if(heroBattleTeam.blue.heros.length == 3){
                switch (i) {
                    case 0:
                        Posname = '大营';
                    break;
                    case 1:
                        Posname = '中军';
                    break;
                    case 2:
                        Posname = '前锋';
                    break;
                }
            }else{
                Posname = '大营'
            }

            let hero = new BattleHero(e,'blue',this,heroBattleTeam.blue.morale);
            hero.Posname = Posname;
            hero.Index = blueindex;
            // hero.Name = hero.Name+hero.Index;
            hero.Name = hero.Name;
            blueindex++;
            this.BattleHeros.push(hero);
            this.BlueTeam.hero.push(hero);
            this.BlueTeam.total += hero.Arms;
        });

        heroBattleTeam.red.heros.forEach((e,i) => {
            let Posname = '';
            if(heroBattleTeam.red.heros.length == 2){
                switch (i) {
                    case 0:
                        Posname = '大营';
                    break;
                    case 1:
                        Posname = '中军';
                    break;
                }
            }else if(heroBattleTeam.red.heros.length == 3){
                switch (i) {
                    case 0:
                        Posname = '大营';
                    break;
                    case 1:
                        Posname = '中军';
                    break;
                    case 2:
                        Posname = '前锋';
                    break;
                }
            }else{
                Posname = '大营'
            }

            let hero = new BattleHero(e,'red',this,heroBattleTeam.red.morale);
            hero.Posname = Posname;
            hero.Index = redindex;
            // hero.Name = hero.Name+hero.Index;
            hero.Name = hero.Name;
            redindex--;
            this.BattleHeros.push(hero);
            this.RedTeam.hero.push(hero);
            this.RedTeam.total += hero.Arms;
        });

        this.applyTeamBonuses(this.BlueTeam, heroBattleTeam.blue);
        this.applyTeamBonuses(this.RedTeam, heroBattleTeam.red);

        this.startBattle();
        this.exitBattle();
    }

    applyTeamBonuses(team, config = {}){
        const legacyLevel = typeof config === 'number' ? config : null;
        const generalPlatformLevel = legacyLevel ?? config.generalPlatformLevel;
        this.applyFourCampBaseAttributes(team, legacyLevel == null ? config.fourCampLevels : {}, legacyLevel == null ? 10 : 0);
        team.hero.forEach(hero => {
            hero.TeamBonusBaseAttrs = Object.fromEntries(TEAM_ATTRS.map(key => [key, hero.Attrs[key]]));
            hero.TeamBonusRates = Object.fromEntries(TEAM_ATTRS.map(key => [key, 0]));
        });
        this.applyTroopBonus(team);
        this.applyCampBonus(team, generalPlatformLevel);
        this.applyFourCampSpecials(team);
    }

    normalizeFourCampLevels(levels = {}, fallback = 10){
        return Object.fromEntries(Object.keys(FOUR_CAMPS).map(key => {
            const parsed = Number(levels?.[key] ?? fallback);
            return [key, Number.isFinite(parsed) ? Math.max(0, Math.min(10, Math.round(parsed))) : fallback];
        }));
    }

    applyFourCampBaseAttributes(team, levels, fallback = 10){
        team.fourCampLevels = this.normalizeFourCampLevels(levels, fallback);
        team.hero.forEach(hero => {
            Object.entries(FOUR_CAMPS).forEach(([key, definition]) => {
                hero.Attrs[definition.attr] = keepTwoDecimal(hero.Attrs[definition.attr] + team.fourCampLevels[key] * 2);
                hero.OriginAttrs[definition.attr] = hero.Attrs[definition.attr];
            });
        });
    }

    applyFourCampSpecials(team){
        team.fourCampSpecials = {};
        const randomHero = () => team.hero[Math.floor(Math.random() * team.hero.length)];
        if (team.fourCampLevels.swift === 10) {
            team.hero.forEach(hero => {
                hero.Storage.swiftCampFirstRoundSpeed = 10;
            });
            team.fourCampSpecials.swift = true;
        }
        if (team.fourCampLevels.iron === 10 && team.hero.length) {
            const target = randomHero();
            target.Storage.ironCampFirstDamageImmunity = true;
            team.fourCampSpecials.iron = target;
        }
        if (team.fourCampLevels.strategy === 10 && team.hero.length) {
            const target = randomHero();
            target.Storage.strategyCampInsight = true;
            team.fourCampSpecials.strategy = target;
        }
        if (team.fourCampLevels.martial === 10 && team.hero.length) {
            const target = randomHero();
            target.Storage.martialCampIgnoreFirstCounter = true;
            team.fourCampSpecials.martial = target;
        }
    }

    addTeamAttributeBonus(hero, keys, rate){
        hero.TeamBonusBaseAttrs ||= Object.fromEntries(TEAM_ATTRS.map(key => [key, hero.Attrs[key]]));
        hero.TeamBonusRates ||= Object.fromEntries(TEAM_ATTRS.map(key => [key, 0]));
        keys.forEach(key => {
            hero.TeamBonusRates[key] += rate;
            hero.Attrs[key] = keepTwoDecimal(hero.TeamBonusBaseAttrs[key] * (1 + hero.TeamBonusRates[key] / 100));
            hero.OriginAttrs[key] = hero.Attrs[key];
        });
    }

    applyTroopBonus(team){
        const groups = new Map();
        team.hero.forEach(hero => {
            if (!groups.has(hero.BisicArm)) groups.set(hero.BisicArm, []);
            groups.get(hero.BisicArm).push(hero);
        });
        const [army, affectedHeroes = []] = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0] || [];
        const count = affectedHeroes.length >= 3 ? 3 : affectedHeroes.length === 2 ? 2 : 0;
        const definition = TROOP_BONUSES[army];
        team.troopBonus = count && definition
            ? { ...definition, count, rate: count === 3 ? 10 : 5 }
            : null;
        if (!team.troopBonus) return;

        affectedHeroes.forEach(hero => {
            this.addTeamAttributeBonus(hero, team.troopBonus.attrs.map(([key]) => key), team.troopBonus.rate);
        });
    }

    applyCampBonus(team, generalPlatformLevel){
        const parsedLevel = Number(generalPlatformLevel);
        team.generalPlatformLevel = Number.isFinite(parsedLevel)
            ? Math.max(0, Math.min(10, Math.round(parsedLevel)))
            : 10;
        if (team.hero.some(hero => hero.SkillsOrder?.includes(1078))) {
            team.campBonus = { disabledBySkill: true };
            return;
        }

        const groups = new Map();
        team.hero.forEach(hero => {
            if (!groups.has(hero.Camp)) groups.set(hero.Camp, []);
            groups.get(hero.Camp).push(hero);
        });
        const [camp, affectedHeroes = []] = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0] || [];
        const count = affectedHeroes.length >= 3 ? 3 : affectedHeroes.length === 2 ? 2 : 0;
        if (!count) {
            team.campBonus = null;
            return;
        }

        const rate = (count === 3 ? 5 : 3) + team.generalPlatformLevel * 0.5;
        team.campBonus = { camp, count, rate, affectedHeroes };
        affectedHeroes.forEach(hero => this.addTeamAttributeBonus(hero, TEAM_ATTRS, rate));
    }

    getTroopBonusDescription(team){
        if (!team.troopBonus) return '兵种加成：未触发（需至少2名同兵种武将）';
        const { count, name, rate, attrs } = team.troopBonus;
        const detail = attrs.map(([, label]) => `${label}+${rate}%`).join('，');
        return `${count}${name}加成：${detail}${count === 2 ? `（仅作用于2名${name}武将）` : ''}`;
    }

    getCampBonusDescription(team){
        const prefix = `阵营加成（点将台${team.generalPlatformLevel}级）`;
        if (team.campBonus?.disabledBySkill) return `${prefix}：受【合纵连横】影响，未生效`;
        if (!team.campBonus) return `${prefix}：未触发（三名武将阵营均不同）`;
        const { camp, count, rate, affectedHeroes } = team.campBonus;
        const scope = count === 2 ? `（仅作用于${affectedHeroes.map(hero => hero.Name).join('、')}）` : '';
        return `${prefix}：${count}名${CAMP_NAMES[camp]}阵营武将，攻击、防御、谋略、速度+${rate}%${scope}`;
    }

    getFourCampDescriptions(team){
        const levels = team.fourCampLevels;
        const base = Object.entries(FOUR_CAMPS).map(([key, definition]) =>
            `${definition.name}${levels[key]}级（${definition.label}+${levels[key] * 2}）`
        ).join('，');
        const specials = [];
        if (team.fourCampSpecials.swift) specials.push('疾风营：首回合全体速度额外+10');
        if (team.fourCampSpecials.iron) specials.push(`铁壁营：${team.fourCampSpecials.iron.Name}免疫首次受到的伤害`);
        if (team.fourCampSpecials.strategy) specials.push(`军机营：${team.fourCampSpecials.strategy.Name}首回合获得洞察，免疫控制`);
        if (team.fourCampSpecials.martial) specials.push(`尚武营：${team.fourCampSpecials.martial.Name}首次攻击无视兵种相克`);
        return [`四大营：${base}`, specials.length ? `10级特殊效果：${specials.join('；')}` : '10级特殊效果：无'];
    }

    recordSettledAttrs(label, team){
        this.Record.pushSysRecord(`【${label}结算后武将属性】`);
        team.hero.forEach(hero => {
            this.Record.pushRecord(hero, `（${hero.Posname}）攻击 ${hero.Attrs.atk}，谋略 ${hero.Attrs.int}，防御 ${hero.Attrs.def}，速度 ${hero.Attrs.spd}`, 1);
        });
    }

    startBattle(){
        let blueTeam = [];
        let redTeam = [];

        this.Record.pushSysRecord('【攻方阵容】');
        [...this.BlueTeam.hero].forEach(e=>{
            this.Record.pushSysRecord(`(${e.Posname}) 【${e.Name}】 ${e.Level}级 兵力：${e.Arms}`,1);
        })
        this.Record.pushSysRecord(this.getTroopBonusDescription(this.BlueTeam),1);
        this.Record.pushSysRecord(this.getCampBonusDescription(this.BlueTeam),1);
        this.getFourCampDescriptions(this.BlueTeam).forEach(message => this.Record.pushSysRecord(message, 1));
        this.Record.pushSysRecord('【守方阵容】');
        [...this.RedTeam.hero].forEach(e=>{
            this.Record.pushSysRecord(`(${e.Posname}) 【${e.Name}】 ${e.Level}级 兵力：${e.Arms}`,1);
        })
        this.Record.pushSysRecord(this.getTroopBonusDescription(this.RedTeam),1);
        this.Record.pushSysRecord(this.getCampBonusDescription(this.RedTeam),1);
        this.getFourCampDescriptions(this.RedTeam).forEach(message => this.Record.pushSysRecord(message, 1));

        for (let index = 0; index < BattleRound.length; index++) {
            if(this.Over)break;
            this.Round = BattleRound[index];
            let roundName = this.Round == 0 ? '准备' : '第'+this.Round;
            if(index != 0) this.Record.pushRoundRecord(`${roundName}回合`);

            if (this.Round >= 1) this.BattleHeros.forEach(hero => hero.applyTreasureRoundStart());

            if (this.Round === 1) {
                this.BattleHeros.forEach(hero => {
                    if (!hero.Storage.swiftCampFirstRoundSpeed || hero.Storage.swiftCampFirstRoundSpeedActive) return;
                    hero.Attrs.spd = keepTwoDecimal(hero.Attrs.spd + hero.Storage.swiftCampFirstRoundSpeed);
                    hero.Storage.swiftCampFirstRoundSpeedActive = true;
                });
            }

            this.BattleHeros.forEach(e => e.callHook("速度排序前"));
            this.sortBattleHerosBySpd();

            // console.log(`${roundName}回合 速度排序`,this.SortSpdHeros);

            // 先执行回合开始时的效果
            this.SortSpdHeros.forEach((e) => {
                if(e.Arms > 0 && this.Round > 0){
                    e.triggerContinuousDamage();
                    e.callHook("回合开始时");
                }
            });

            // 司马懿的指挥优先特性只改变准备回合的指挥结算顺序；
            // 同优先级武将继续沿用速度顺序。
            const actingHeros = this.Round == 0
                ? [...this.SortSpdHeros].sort((a, b) => b.CommandPriority - a.CommandPriority)
                : this.SortSpdHeros;

            if (this.Round === 0) {
                for (const hero of this.BattleHeros) {
                    if (['yuanrong', 'youpiao', 'wuhao', 'xushibishou', 'louying', 'tianwen', 'jinjiu', 'weizhisan_gong', 'shenfeng', 'xiuni', 'longlin', 'tengshe', 'jushu', 'yanri', 'chengying', 'jingyangwanren', 'xuanyi', 'kunwu', 'minghong'].includes(hero.Treasure?.id) && hero.Treasure.forge === 'tianzi') {
                        const name = { yuanrong: '元戎', youpiao: '游飘', wuhao: '乌号', xushibishou: '徐氏匕首', louying: '镂影', tianwen: '天问', jinjiu: '金鸠', weizhisan_gong: '位至三公', shenfeng: '神锋', xiuni: '貅猊', longlin: '龙鳞', tengshe: '螣蛇', jushu: '钜黍', yanri: '掩日', chengying: '承影', jingyangwanren: '旌阳万仞', xuanyi: '悬翳', kunwu: '锟铻', minghong: '铭鸿' }[hero.Treasure.id];
                        this.Record.pushRecord(hero, `的【${name}·天资】使基础谋略提高${hero.Treasure.forgeValue}%（${hero.Attrs.int}）`, 1);
                    }
                }
            }

            actingHeros.forEach((e) => {
                // 清除已攻击次数
                e.State.attackNum = 0;
                if(e.Arms > 0){
                    if(this.Round == '-1'){
                        // 执行被动
                        e.callPassiveSkill();
                    }else if(this.Round == '0'){
                        // 执行指挥
                        if (e.CommandPriority > 0 && e.SkillsOrder.some(id => e.Skills[id]?.type === 1)) {
                            this.Record.pushRecord(e, '的指挥优先特性生效，本指挥阶段所有指挥战法最先执行');
                        }
                        e.callCommandSkill()
                    }else{
                        if(this.Over)return;
                        e.Manger.Record.pushHeroRoundStart(e);
                        e.clearStateRounds();
                        if (e.Storage.budongrushan) e.clearAllHarmfulEffects(e.Storage.budongrushan);
                        e.applyTreasureBeforeAction();
                        e.callHook("行动前");
                        // 本次行动仍受暴走影响；第三次行动前才会递减至零。
                        if (e.isRage()) e.StateFlag.rage = true;
                        this.Record.pushRecord(e,"行动开始");
                        e.callHook("行动时");
                        // 判断混乱
                        if(e.isConfusion()){
                            e.skipRoundByConfusion();
                            return
                        }
                        // 执行主动
                        e.callActiveSkill();
                        if(this.Over)return;

                        // 判断怯战
                        if(e.isAttackLimit()){
                            e.skipAttackByAttackLimit();
                        }else if(e.Treasure?.id === 'shenfeng' && this.Round === 1){
                            this.Record.pushRecord(e, '的【神锋·劲弩】首回合无法发动普通攻击', 1);
                        }else{
                            // 执行普攻
                            e.callHook("普攻前");
                            e.callAttack();
                            if(this.Over)return;
                        }
                    }
                    // e.ActionRecord.forEach(r => {
                    //     this.pushRecord(r.msg,r.sub);
                    // });
                }else{
                    // this.pushRecord(`[${e.Name}] 由于阵亡 跳过回合`);
                }
            });

            if(this.Round == 0){
                this.recordSettledAttrs('攻方', this.BlueTeam);
                this.recordSettledAttrs('守方', this.RedTeam);
            }

            if(this.Round >= 1){
                this.BattleHeros.forEach(e => {
                    if (e.Arms > 0) e.callHook('回合结束时');
                });
                this.BattleHeros.forEach(e => e.finishRound());
                if (this.Round === 1) {
                    this.BattleHeros.forEach(hero => {
                        if (!hero.Storage.swiftCampFirstRoundSpeedActive) return;
                        hero.Attrs.spd = keepTwoDecimal(hero.Attrs.spd - hero.Storage.swiftCampFirstRoundSpeed);
                        hero.Storage.swiftCampFirstRoundSpeedActive = false;
                    });
                }
                // 每个正式回合结束递减伤兵
                this.BattleHeros.forEach(e => {
                    if(e.Arms > 0 && e.HurtArms > 0){
                        console.log(e.Name,this.Round,'递减伤兵',Math.floor(e.HurtArms * 0.87));
                        e.HurtArms = Math.floor(e.HurtArms * 0.87);
                    }
                })
            }
        }
    }

    exitBattle(){
        this.BlueTeam.hero.forEach((e) => {
            this.BlueTeam.arms += e.Arms;
            this.BlueTeam.hurtArms += e.HurtArms;
        });

        this.RedTeam.hero.forEach((e) => {
            this.RedTeam.arms += e.Arms;
            this.RedTeam.hurtArms += e.HurtArms;
        });
    }

    addStat(hero, skill, damage = 0, recovery = 0) {
        if (!hero || (!damage && !recovery)) return;
        const camp = this.Stats[hero.BattleCamp];
        const key = `${hero.Index}:${skill?.id ?? 'basic'}`;
        const item = camp[key] ||= {
            hero: hero.Name, skill: skill?.name || '普通攻击', damage: 0, recovery: 0
        };
        item.damage += damage;
        item.recovery += recovery;
    }

    pushRecord(msg,sub=[]){
        this.Record.push({msg,sub});
    }

    //根据速度对武将进行排序
    sortBattleHerosBySpd(){
        this.SortSpdHeros = [];

        [...[...this.BlueTeam.hero],...[...this.RedTeam.hero]].forEach((e) => {
            this.SortSpdHeros.push(e);
        })

        this.SortSpdHeros.sort((a,b)=>{
            return b.Attrs.spd - a.Attrs.spd;
        })

        //先手排序
        this.SortSpdHeros.sort((a,b)=>{
            let af = a.State.firstAction.rounds > 0;
            let bf = b.State.firstAction.rounds > 0;
            if(af == true && bf == false && this.Round <= a.State.firstAction.rounds){
                return -1;
            }else if(af == false && bf == true && this.Round <= b.State.firstAction.rounds){
                return 1;
            }
            return 0;
        })
    }
}
