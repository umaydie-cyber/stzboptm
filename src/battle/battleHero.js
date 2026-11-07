/**
 * 战斗时的武将对象
 */

import { __HEROS__ } from "./heros";
import { __ARMS__ as ARMS } from "./armys";
import { __SKILLS__ } from "./skills"
import { keepTwoDecimal, makeSkillTag, roundEightNine } from "../uilts"
import { clacAttackDamage, getRandomBool, clacInteDamage, clacInte2Damage, getDamageAddition } from "./battleCalcFunc"

const CanAddAttrsKey = ['atk', 'def', 'int', 'spd'];
const LOUYING_CHUANYING = { id: 'louying-chuanying', name: '镂影·穿影', type: 4 };
export class BattleHero {
    /*
        args: 
            config: 武将配置 
            example: {
                id: 1001,//武将Id
                level: 40,//武将等级
                extraAttrsAlloc: {//属性分配
                        atk: 40,
                        def: 0,
                        int: 0,
                        spd: 0,
                }
            }

    */
    constructor(config, battlecamp, Manger, morale) {

        this.HOOKS = {
            ON_HURT: {}, //受击时执行堆
            BEFORE_BASEATK: {}, //普通攻击前执行堆
            ON_ACTION: {}, //行动时
            BEFORE_ACTION: {}, //行动前
            ROUND_START: {}, //回合开始时
            ROUND_END: {}, //回合结束时
            BEFORE_ROUND_SORT: {}, //回合速度排序前
            BEFORE_ATK: {}, //攻击前
            AFTER_ATK: {}, //攻击后
            ON_DAMAGE: {}, //造成伤害时
            AFTER_DAMAGE: {}, //造成伤害后
            START_READY_SKILL: {},//开始准备战法时
            BEFORE_SKILL_ATTEMPT: {}, //尝试发动主动或追击战法前
            AFTER_SKILL_ACTIVATED: {}, //主动或追击战法成功发动后
            ADD_CONTINUOUS_DAMAGE:{} //被施加持续伤害时
        }

        //准备中的战法
        this.IN_READY_SKILL = []

        //计数器
        this.Counter = {};
        //存储
        this.Storage = {};
        //发动率增减效果
        this.RATE_VAL = {};
        //准备战法回合增减
        this.READY_VAL = {};
        //属性增减
        this.ATTR_CALC = {
            system: [] //不会冲突的 来自四大营或者兵种特性等待
        };

        //一些效果已执行的标记
        this.StateFlag = {
            confusion: false,
            attackLimit: false,
            rage: false
        }
        //战斗时状态
        this.State = {
            attackNum: 0,//已攻击次数

            // rage: [],//暴走 无差别攻击
            // attackLimit:[],//怯战 无法普攻
            // skillLimit:[],//犹豫 无法发动主动战法
            // attackHurtRate:[],//受到的攻击伤害加减百分比
            // skillHurtRate:[],//受到的谋略伤害加成
            // attackdamageRate:[],//造成的攻击伤害加成
            // skilldamageRate:[],//造成的谋略伤害加成

            // 先手
            firstAction: {
                rounds: 0,
                from: {
                    hero: null,
                    skill: 0
                }
            },

            // 连击 任意类型不叠加
            doubleAttack: {
                rounds: 0,
                from: {
                    hero: null,
                    skill: 0
                }
            },

            // 混乱 任意类型不叠加
            confusion: {
                rounds: 0,
                from: {
                    hero: null,
                    skill: 0
                }
            },

            rage: {
                rounds: 0,
                from: { hero: null, skill: 0 }
            },

            continuousDamage: {},
            splitAttack: null,

            // 犹豫 任意类型不叠加
            activeLimit: {
                rounds: 0,
                from: {
                    hero: null,
                    skill: 0
                }
            },

            // 怯战 任意类型不叠加
            attackLimit: {
                rounds: 0,
                from: {
                    hero: null,
                    skill: 0
                }
            },

            // 造成的攻击伤害加成
            attackDamageAdd: {
                passive: null,
                command: null,
                active: null,
                passive: null
            },

            // 造成的策略伤害加成
            inteDamageAdd: {
                passive: null,
                command: null,
                active: null,
                passive: null
            },

            // 造成的攻击伤害减少
            attackDamageSub: {
                passive: null,
                command: null,
                active: null,
                passive: null
            },

            // 造成的策略伤害减少
            inteDamageSub: {
                passive: null,
                command: null,
                active: null,
                passive: null
            },

            // 受到的攻击伤害加成
            beAttackDamageAdd: {
                passive: null,
                command: null,
                active: null,
                passive: null
            },

            // 受到的策略伤害加成
            beInteDamageAdd: {
                passive: null,
                command: null,
                active: null,
                passive: null
            },

            // 受到的攻击伤害减少
            beAttackDamageSub: {
                passive: null,
                command: null,
                active: null,
                passive: null
            },

            // 受到的策略伤害减少
            beInteDamageSub: {
                passive: null,
                command: null,
                active: null,
                passive: null
            },

            // 造成的主动战法伤害加成
            activeDamageAdd: {
                passive: null,
                command: null,
                active: null,
                passive: null
            },

            // 造成的主动战法伤害减少
            activeDamageSub: {
                passive: null,
                command: null,
                active: null,
                passive: null
            },

            // 受到的主动战法伤害加成
            beActiveDamageAdd: {
                passive: null,
                command: null,
                active: null,
                passive: null
            },

            // 受到的主动战法伤害减少
            beActiveDamageSub: {
                passive: null,
                command: null,
                active: null,
                passive: null
            },

        },

        this.Manger = Manger;
        this.BattleCamp = battlecamp;
        this.Morale = morale;
        this.Treasure = ['tongsu', 'yuanrong', 'fenran', 'youpiao', 'wuhao', 'xushibishou', 'louying', 'tianwen'].includes(config.treasure?.id) ? config.treasure : null;
        // 统一拦截直接赋值的混乱、暴走、怯战与犹豫状态。
        this.State = new Proxy(this.State, {
            set: (states, name, value) => {
                if (['confusion', 'rage', 'attackLimit', 'activeLimit'].includes(name) && value?.rounds > 0 &&
                    ['fenran', 'louying'].includes(this.Treasure?.id) && this.Treasure.forge === 'qingyi' &&
                    this.Manger.Round >= 5 && this.Manger.Round <= this.Treasure.forgeValue) {
                    this.Manger.Record.pushRecord(this, `的【${this.Treasure.id === 'louying' ? '镂影' : '奋髯'}·清毅】洞察免疫控制`, 1);
                    return true;
                }
                if (['confusion', 'rage'].includes(name) && value?.rounds > 0 &&
                    this.Treasure?.id === 'yuanrong' && this.Treasure.forge === 'jianyi' &&
                    this.Manger.Round >= 1 && this.Manger.Round <= this.Treasure.forgeValue) {
                    this.Manger.Record.pushRecord(this, `的【元戎·坚毅】免疫${name === 'confusion' ? '混乱' : '暴走'}`, 1);
                    return true;
                }
                if (['confusion', 'rage', 'attackLimit', 'activeLimit'].includes(name) &&
                    value?.rounds > 0 && value.from?.hero?.BattleCamp !== undefined &&
                    this.tryQiqinDefense('控制', value.from.hero)) return true;
                if (name === 'activeLimit' && value?.rounds > 0) {
                    const source = value.from?.hero;
                    const sourceSkillId = value.from?.skill?.id ?? value.from?.skill;
                    const firstCast = source?.Storage.tianwenFirstMainCast;
                    const preparedFirst = !!source && source.Storage.tianwenFirstMainPreparedSkillId === sourceSkillId &&
                        (source.Storage.tianwenFirstMainPreparedResolutionRound == null ||
                            source.Storage.tianwenFirstMainPreparedResolutionRound === source.Manger.Round);
                    if (source?.Treasure?.id === 'tianwen' && sourceSkillId === source.Skill &&
                        (firstCast?.id === sourceSkillId || preparedFirst || source.Storage.tianwenFirstMainCommandSkillId === sourceSkillId)) {
                        if (firstCast) firstCast.applied = true;
                        if (preparedFirst) source.Storage.tianwenFirstMainPreparedResolutionRound = source.Manger.Round;
                        const extended = getRandomBool(40);
                        if (extended) value.rounds += 1;
                        source.Manger.Record.pushRecord(source, `的【天问·观星】首次主战法犹豫延长判定（40%）：${extended ? `成功，持续${value.rounds}回合` : '未触发'}`, 1);
                    }
                }
                states[name] = value;
                return true;
            }
        });

        //初始化属性值
        this.initAttrs(config);
        //初始化技能
        this.initSkills(config);
    }

    initAttrs(config) {
        let id = config.id;
        let level = config.level;
        let HEROS = {};
        __HEROS__.forEach(e => {
            HEROS[e.id] = e;
        });

        let hero = HEROS[id];

        // 战斗中的属性
        this.Attrs = {
            atk: 0,
            def: 0,
            int: 0,
            spd: 0,
            des: 0
        }

        // 战斗开始时的属性不会变动
        this.OriginAttrs = {
            atk: 0,
            def: 0,
            int: 0,
            spd: 0,
            arms: 0
        }

        this.Id = id;
        this.Name = hero.name;
        this.Up = config.up;
        this.Animation = config?.animation == true;
        // this.Camp = ['蜀', '魏', '吴', '汉', '群','晋'][hero.camp-1]
        this.Camp = hero.camp;
        this.BisicArm = hero.army;
        this.Skill = hero.skill;
        this.CommandPriority = hero.commandPriority || 0;
        this.Level = level;
        this.Arms = Math.max(1, Math.floor(Number(config.arms) || 10000));
        this.HurtArms = 0;
        this.Limit = hero.limit;

        // 属性成长
        for (let key in hero.attrs_grow) {
            this.Attrs[key] = hero.attrs[key];
            let attr = hero.attrs_grow[key];

            this.Attrs[key] = keepTwoDecimal(this.Attrs[key] + (level - 1) * attr);
        }

        // 额外属性分配
        for (const key in config.extraAttrsAlloc) {
            this.Attrs[key] = keepTwoDecimal(this.Attrs[key] + config.extraAttrsAlloc[key]);
        }
        if (this.Treasure?.forge === 'xiaorui') {
            this.Attrs.atk = keepTwoDecimal(this.Attrs.atk * (1 + this.Treasure.forgeValue / 100));
        }

        // 四大营
        CanAddAttrsKey.forEach((key) => {
            this.Attrs[key] = keepTwoDecimal(this.Attrs[key] + 20);
        })
        if (['tongsu', 'fenran'].includes(this.Treasure?.id)) this.Attrs.atk = keepTwoDecimal(this.Attrs.atk + this.Treasure.xiaorui * 2.5);
        // 同兵种和同阵营属性加成已经计入；天资在指挥阶段之前生效。
        if (['yuanrong', 'youpiao', 'wuhao', 'xushibishou', 'louying', 'tianwen'].includes(this.Treasure?.id) && this.Treasure.forge === 'tianzi') {
            this.Attrs.int = keepTwoDecimal(this.Attrs.int * (1 + this.Treasure.forgeValue / 100));
        }
        if (this.Treasure?.id === 'youpiao' && this.Treasure.forge === 'lingdong') {
            this.Attrs.spd = keepTwoDecimal(this.Attrs.spd + this.Treasure.forgeValue);
        }
        if (this.Treasure?.id === 'wuhao') this.Attrs.spd = keepTwoDecimal(this.Attrs.spd + this.Treasure.lingdong * 1.5);
        if (this.Treasure?.id === 'xushibishou') {
            this.Attrs.spd = keepTwoDecimal(this.Attrs.spd + this.Treasure.lingdong * 1.5);
            this.Attrs.atk = keepTwoDecimal(this.Attrs.atk * 1.05);
            this.Attrs.int = keepTwoDecimal(this.Attrs.int * 1.05);
        }
        if (this.Treasure?.id === 'louying') {
            this.Attrs.atk = keepTwoDecimal(this.Attrs.atk + this.Treasure.yingcai);
            this.Attrs.int = keepTwoDecimal(this.Attrs.int + this.Treasure.yingcai);
        }
        if (this.Treasure?.id === 'tianwen') this.Attrs.int = keepTwoDecimal(this.Attrs.int + this.Treasure.tianzi * 2.5);

        // // 疾风营强化
        // this.Attrs['spd'] = keepTwoDecimal(this.Attrs['spd'] + 10);

        //保存此时的属性
        this.OriginAttrs.atk = this.Attrs.atk;
        this.OriginAttrs.def = this.Attrs.def;
        this.OriginAttrs.int = this.Attrs.int;
        this.OriginAttrs.spd = this.Attrs.spd;
        this.OriginAttrs.arms = this.Arms;
    }

    initSkills(config) {
        /* this.Skills = {};
        this.SkillsOrder = [];
        this.Skills[this.Skill] = SKILLS[this.Skill];
        this.SkillsOrder.push(this.Skill);
        if(config.equipskill != undefined && config.equipskill.length != 0){
            config.equipskill.forEach(e => {
                this.Skills[e] = SKILLS[e]; 
                this.SkillsOrder.push(e);
            })
        } */
        let SKILLS = {};
        __SKILLS__.forEach(e => {
            SKILLS[e.id] = e;
        });
        this.Skills = {};
        this.SkillsOrder = [];
        this.Skills[this.Skill] = SKILLS[this.Skill];
        this.SkillsOrder.push(this.Skill);
        if (config.equipskill != undefined && config.equipskill.length != 0) {
            config.equipskill.forEach(e => {
                this.Skills[e] = SKILLS[e];
                this.SkillsOrder.push(e);
            })
        }
        // console.log(SKILLS, this.Skills);
    }
    //执行被动技能
    callPassiveSkill() {
        this.SkillsOrder.forEach(e => {
            if (!e) return;
            let skill = this.Skills[e];
            try {
                if (skill.type == 4) {
                    skill.callskill(this);
                }
            } catch (error) {
                console.log(this);
            }
        });
    }
    //执行指挥技能
    callCommandSkill() {
        this.SkillsOrder.forEach(e => {
            if (!e) return;
            let skill = this.Skills[e];
            if (skill.type == 1) {
                if (this.Treasure?.id === 'tianwen' && e === this.Skill && !this.Storage.tianwenFirstMainUsed) {
                    this.Storage.tianwenFirstMainUsed = true;
                    this.Storage.tianwenFirstMainCommandSkillId = skill.id;
                }
                skill.callskill(this);
            }
        });
    }
    getTreasureMainRateBonus(skill) {
        if (skill.id !== this.Skill) return 0;
        if (this.Treasure?.id === 'tianwen' && this.Treasure.forge === 'jimin' && [2, 3].includes(skill.type)) return this.Treasure.forgeValue;
        if (this.Treasure?.id === 'tianwen' && this.Treasure.forge === 'shulv' && skill.type === 2 && skill.ready) return this.Treasure.forgeValue;
        if (this.Treasure?.id === 'wuhao' && this.Treasure.forge === 'shulv' &&
            skill.type === 2 && skill.ready) return this.Treasure.forgeValue;
        if (['youpiao', 'xushibishou'].includes(this.Treasure?.id) && this.Treasure.forge === 'chousuan' &&
            /策略攻击|策略伤害|火攻|燃烧|恐慌|妖术/.test(skill.desc || '')) return this.Treasure.forgeValue;
        if (!/造成.*攻击|发动.*攻击|攻击伤害/.test(skill.desc || '')) return 0;
        if (this.Treasure?.forge === 'yingyong') return this.Treasure.forgeValue;
        if (this.Treasure?.forge === 'shanmou' && [4, 6].includes(this.Manger.Round)) return this.Treasure.forgeValue;
        return 0;
    }
    //执行主动技能
    callActiveSkill() {
        if (this.Storage.cijianDisabled) return;
        if (!this.isActiveLimit()) {
            this.SkillsOrder.forEach(e => {
                if (!e) return;
                let skill = this.Skills[e];
                if (skill.type == 2) {
                    console.log(this.RATE_VAL);
                    let currentRate = this.getRealSkillRate(skill.rate) + (this.RATE_VAL[skill.id] ? this.RATE_VAL[skill.id].value : 0);
                    currentRate += this.getTreasureMainRateBonus(skill);
                    console.log(this.canAddReadySkill(skill));
                    if (this.canAddReadySkill(skill)) {
                        this.callHook("尝试发动战法前", skill);
                        if (this.Manger.Over || this.Arms <= 0) return;
                        const treasureBonus = this.getTreasureMainRateBonus(skill);
                        const moraleBonus = this.getRealSkillRate(skill.rate) - skill.rate;
                        const rateTreasureName = this.Treasure?.id === 'youpiao' && this.Treasure.forge === 'chousuan' ? '游飘·筹算'
                            : this.Treasure?.id === 'xushibishou' && this.Treasure.forge === 'chousuan' ? '徐氏匕首·筹算'
                            : this.Treasure?.id === 'wuhao' && this.Treasure.forge === 'shulv' ? '乌号·熟虑'
                            : this.Treasure?.id === 'tianwen' && this.Treasure.forge === 'jimin' ? '天问·机敏'
                            : this.Treasure?.id === 'tianwen' && this.Treasure.forge === 'shulv' ? '天问·熟虑' : '';
                        const rateDetail = rateTreasureName && treasureBonus
                            ? `（基础${skill.rate}%，士气修正${moraleBonus >= 0 ? '+' : ''}${moraleBonus}%，${rateTreasureName}+${treasureBonus}%）` : '';
                        this.Manger.Record.pushRecord(this, `的【${skill.name}】发动率为${currentRate}%${rateDetail}`)
                        this.Storage.weiyuBuff?.strategyDamageSkills?.delete(skill);
                        const firstMainCast = this.Treasure?.id === 'tianwen' && e === this.Skill && !this.Storage.tianwenFirstMainUsed
                            ? { id: skill.id, applied: false } : null;
                        if (firstMainCast) this.Storage.tianwenFirstMainCast = firstMainCast;
                        let ret;
                        try {
                            ret = skill.callskill(this, currentRate);
                        } finally {
                            if (firstMainCast) {
                                if (ret === true || firstMainCast.applied) this.Storage.tianwenFirstMainUsed = true;
                                if (ret === true && skill.ready) this.Storage.tianwenFirstMainPreparedSkillId = skill.id;
                                delete this.Storage.tianwenFirstMainCast;
                            }
                        }
                        if (ret !== true) this.Manger.Record.pushRecord(this, `的【${skill.name}】未发动`);
                        else if (this.canAddReadySkill(skill)) this.callHook("战法成功发动后", skill);
                    } else {
                        this.subReadySkillRound(skill);
                    }
                }
            });
        } else {
            this.skipAttackByActiveLimit();
        }
    }
    //执行追击技能
    callPursuitSkill(target) {
        this.SkillsOrder.forEach(e => {
            if (!e) return;
            let skill = this.Skills[e];
            if (skill.type == 3) {
                this.triggerPursuitCurses();
                if (this.Arms <= 0) return;
                if (target.Arms != 0 || skill.randomTargets) {
                    this.callHook("尝试发动战法前", skill);
                    if (this.Manger.Over || this.Arms <= 0) return;
                }
                const treasureRate = this.Treasure?.id === 'yuanrong' && this.Treasure.forge === 'benxi'
                    ? this.Treasure.forgeValue : 0;
                const mainBonus = this.getTreasureMainRateBonus(skill);
                if ((['youpiao', 'xushibishou'].includes(this.Treasure?.id) && this.Treasure.forge === 'chousuan' ||
                    this.Treasure?.id === 'tianwen' && this.Treasure.forge === 'jimin') && mainBonus) {
                    const moraleBonus = this.getRealSkillRate(skill.rate) - skill.rate;
                    const name = { youpiao: '游飘·筹算', xushibishou: '徐氏匕首·筹算', tianwen: '天问·机敏' }[this.Treasure.id];
                    this.Manger.Record.pushRecord(this, `的【${skill.name}】发动率为${this.getRealSkillRate(skill.rate) + mainBonus}%（基础${skill.rate}%，士气修正${moraleBonus >= 0 ? '+' : ''}${moraleBonus}%，${name}+${mainBonus}%）`, 1);
                }
                if ((target.Arms != 0 || skill.randomTargets) && getRandomBool(this.getRealSkillRate(skill.rate) + mainBonus + treasureRate)) {
                    const stacks = this.Storage.shiwuStacks || 0;
                    if (stacks) {
                        this.Storage.shiwuPursuitBonus = stacks * 40;
                        this.Manger.Record.pushRecord(this, `【势无虚动】本次【${skill.name}】追击伤害提高${stacks * 40}%`, 1);
                    }
                    try {
                        const burst = this.Treasure?.id === 'yuanrong' && e === this.Skill &&
                            !this.Storage.yuanrongBurstUsed;
                        if (burst) this.Storage.yuanrongBurstUsed = true;
                        const firstMainCast = this.Treasure?.id === 'tianwen' && e === this.Skill && !this.Storage.tianwenFirstMainUsed
                            ? { id: skill.id, applied: false } : null;
                        if (firstMainCast) this.Storage.tianwenFirstMainCast = firstMainCast;
                        try {
                            skill.callskill(this, target);
                        } finally {
                            if (firstMainCast) {
                                this.Storage.tianwenFirstMainUsed = true;
                                delete this.Storage.tianwenFirstMainCast;
                            }
                        }
                        if (burst && !this.Manger.Over && this.Arms > 0) {
                            const enemies = this.BattleCamp === 'blue' ? this.Manger.RedTeam.hero : this.Manger.BlueTeam.hero;
                            const eligible = enemies.filter(hero => hero !== target && hero.Arms > 0 &&
                                Math.abs(this.Index - hero.Index) <= this.Limit);
                            if (eligible.length) {
                                const extra = eligible[Math.floor(Math.random() * eligible.length)];
                                this.Manger.Record.pushRecord(this, `的【元戎·迸发】使【${skill.name}】额外选取${extra.Name}`, 1);
                                skill.callskill(this, extra);
                            }
                        }
                    } finally {
                        if (stacks) {
                            this.Storage.shiwuStacks = 0;
                            this.Storage.shiwuPursuitBonus = 0;
                        }
                    }
                    this.callHook("战法成功发动后", skill, target);
                }
            }
        });
    }

    //获取一个攻击目标
    getAttackTarget() {
        let canAtk = [];

        // 先按距离顺序排列武将 这里需要颠倒红队顺序来排列 因为红队大营是RedTeam的第一个武将
        let heros = [...this.Manger.BlueTeam.hero, ...[...this.Manger.RedTeam.hero].reverse()].filter((e) => {
            return e.Arms > 0;
        });

        // console.log(heros);

        // 然后获取自身位置
        let selfindex = null;
        heros.forEach((e, i) => {
            if (e == this) {
                selfindex = (i + 1);
            }
        })

        // 获取可攻击目标
        heros.forEach((e, i) => {
            // 判断距离是否足够 且目标没有阵亡
            if (e != this && Math.abs(selfindex - (i + 1)) <= this.Limit && e.Arms > 0) {
                if (!this.isRage() && e.BattleCamp == this.BattleCamp) {
                    return
                }
                canAtk.push(e);
            }
        })

        if (canAtk.length == 0) { // 如果没有目标
            return false;
        } else if (canAtk.length == 1) {// 如果只有一个目标直接返回
            return canAtk[0];
        } else {// 如果大于一个目标 进行随机选择
            let randtarget = canAtk[Math.floor(Math.random() * canAtk.length)];
            return randtarget;
        }
    }

    //获取目标
    /* 
        type 1 选敌军
        type 2 选我军
        type 3 选友军
    */
    getTarget(range, num, type = 1) {
        let canAtk = [];

        // 先按距离顺序排列武将 这里需要颠倒红队顺序来排列 因为红队大营是RedTeam的第一个武将
        let heros = [...this.Manger.BlueTeam.hero, ...[...this.Manger.RedTeam.hero].reverse()].filter((e) => {
            return e.Arms > 0;
        });

        // 然后获取自身位置
        let selfindex = null;
        heros.forEach((e, i) => {
            if (e == this) {
                selfindex = (i + 1);
            }
        })

        // 获取可攻击目标
        heros.forEach((e, i) => {
            // 判断距离是否足够 且目标没有阵亡
            if (type == 1) {
                //距离够且不是同一阵营
                if (e != this && Math.abs(selfindex - (i + 1)) <= range && e.Arms > 0 && (this.isRage() || e.BattleCamp != this.BattleCamp)) {
                    canAtk.push(e);
                }
            } else if (type == 2) {
                //距离感且是同一个阵营
                if (Math.abs(selfindex - (i + 1)) <= range && e.Arms > 0 && e.BattleCamp == this.BattleCamp) {
                    canAtk.push(e);
                }
            } else {
                //距离够且是同一个阵营但不是自己
                if (e != this && Math.abs(selfindex - (i + 1)) <= range && e.Arms > 0 && e.BattleCamp == this.BattleCamp) {
                    canAtk.push(e);
                }
            }
        })

        if (canAtk.length < num) {
            return canAtk
        } else {
            let canAtkCopy = canAtk.slice();
            let i = canAtk.length;
            let targets = []
            while (targets.length < num) {
                let randindex = Math.floor(Math.random() * canAtkCopy.length);
                targets.push(canAtkCopy[randindex]);
                canAtkCopy.splice(randindex, 1);
            }
            return targets;
        }
    }

    callAttack() {
        if (this.Storage.cijianDisabled) return;
        let target = this.getAttackTarget();
        if (target) {
            this.basicAttack(target);
            this.State.attackNum++;

            //连击判断
            if (this.State.doubleAttack.rounds != 0) {
                if (this.State.attackNum < 2) {
                    this.callAttack();
                }
            }
        }
    }

    //普通攻击
    basicAttack(target) {
        if (this.Treasure?.id === 'fenran') {
            this.Storage.fenranAttackedThisRound = true;
            this.Storage.fenranCangfengCurrentAttack = this.Treasure.forge === 'cangfeng' && !!this.Storage.fenranCangfengReady;
            this.Storage.fenranCangfengReady = false;
        }
        // 在普攻结算前确定相邻位置，避免目标阵亡后队列收缩改变分兵目标。
        const splitTargets = this.getSplitAttackTargets(target);
        this.Manger.Record.pushActionRecord(this, target, '对', '发动普通攻击');
        target.beHurt(this, {
            type: 1,
            rate: 100,
            isBasicAttack: true
        });
        this.registerYuanrongBasicAttack();
        if (this.Manger.Over == true) return;
        this.performSplitAttack(splitTargets);
        this.Storage.fenranCangfengCurrentAttack = false;
        if (this.Manger.Over || this.Arms <= 0) return;
        this.callPursuitSkill(target);
    }

    registerYuanrongBasicAttack() {
        if (this.Treasure?.id !== 'yuanrong') return;
        // 分兵也视为普通攻击：陷阵加成、选锋触发和蓄锐计次均适用。
        if (this.Treasure.forge === 'xuanfeng') this.Storage.yuanrongXuanfengReady = true;
        if (this.Treasure.forge === 'xurui') {
            this.Storage.yuanrongBasicAttacks = (this.Storage.yuanrongBasicAttacks || 0) + 1;
            if (this.Storage.yuanrongBasicAttacks % 2 === 0) {
                this.Storage.yuanrongXuruiStacks = (this.Storage.yuanrongXuruiStacks || 0) + 1;
                this.Manger.Record.pushRecord(this, `的【元戎·蓄锐】累积${this.Storage.yuanrongXuruiStacks}层`, 1);
            }
        }
    }

    applySplitAttack(rate, rounds, skill, source) {
        if (this.State.splitAttack) {
            this.Manger.Record.pushRecord(this, '已存在分兵状态，分兵效果冲突', 1);
            return false;
        }
        this.State.splitAttack = { rate, skill, source, expiresRound: this.Manger.Round + rounds - 1 };
        this.Manger.Record.pushRecord(this, `进入分兵状态（伤害率${rate}%），持续${rounds}回合`, 1);
        return true;
    }

    getSplitAttackTargets(target) {
        if (!this.State.splitAttack) return [];
        const line = [...this.Manger.BlueTeam.hero, ...[...this.Manger.RedTeam.hero].reverse()].filter(h => h.Arms > 0);
        const index = line.indexOf(target);
        return line.filter((h, i) => Math.abs(i - index) === 1 && (this.isRage() || h.BattleCamp !== this.BattleCamp));
    }

    performSplitAttack(targets) {
        const split = this.State.splitAttack;
        if (!split) return;
        for (const target of targets) {
            if (this.Manger.Over || this.Arms <= 0) break;
            if (target.Arms <= 0) continue;
            this.Manger.Record.pushActionRecord(this, target, '的分兵对', '造成伤害');
            target.beHurt(this, { type: 1, rate: split.rate, isBasicAttack: true, isSplitAttack: true }, split.skill);
            this.registerYuanrongBasicAttack();
        }
    }

    finishRound() {
        if (this.Treasure?.id === 'fenran' && this.Treasure.forge === 'cangfeng' && this.Manger.Round >= 1) {
            this.Storage.fenranCangfengReady = !this.Storage.fenranAttackedThisRound;
            this.Storage.fenranAttackedThisRound = false;
        }
        if (this.State.splitAttack && this.State.splitAttack.expiresRound <= this.Manger.Round) {
            this.State.splitAttack = null;
            this.Manger.Record.pushRecord(this, '分兵状态在回合结束时消失', 1);
        }
    }

    applyTreasureRoundStart() {
        if (!['fenran', 'louying'].includes(this.Treasure?.id) || this.Treasure.forge !== 'qingyi' ||
            this.Manger.Round < 5 || this.Manger.Round > this.Treasure.forgeValue) return;
        const cleared = [];
        for (const [key, label] of [['confusion', '混乱'], ['rage', '暴走'],
            ['attackLimit', '怯战'], ['activeLimit', '犹豫']]) {
            if (this.State[key].rounds > 0) {
                this.State[key].rounds = 0;
                cleared.push(label);
            }
        }
        if (cleared.length) this.Manger.Record.pushRecord(this, `的【${this.Treasure.id === 'louying' ? '镂影' : '奋髯'}·清毅】洞察解除${cleared.join('、')}`, 1);
    }

    registerLouyingDamage(target, damageInfo, realDamage) {
        if (this.Treasure?.id !== 'louying' || realDamage <= 0) return;
        if (damageInfo.type === 1 && target.BattleCamp !== this.BattleCamp) {
            const hits = (this.Storage.louyingAttackHits || 0) + 1;
            this.Storage.louyingAttackHits = hits;
            if (hits % 4 === 0) {
                this.Storage.louyingPending = (this.Storage.louyingPending || 0) + 1;
                this.Manger.Record.pushRecord(this, `的【镂影·穿影】累计${hits}次攻击伤害，下次行动前追加攻击`, 1);
            }
        }
        if (this.Treasure.forge === 'shanzhan' && [1, 2, 4].includes(damageInfo.type)) {
            const previous = this.Storage.louyingShanzhanStacks || 0;
            const next = Math.min(this.Treasure.forgeValue, previous + 1);
            this.Storage.louyingShanzhanStacks = next;
            if (next > previous) this.Manger.Record.pushRecord(this, `的【镂影·善战】叠加至${next}层，攻击与策略伤害提高${next * 2}%`, 1);
        }
    }

    applyTreasureBeforeAction() {
        if (this.Treasure?.id !== 'louying') return;
        const pending = this.Storage.louyingPending || 0;
        this.Storage.louyingPending = 0;
        for (let i = 0; i < pending && this.Arms > 0 && !this.Manger.Over; i++) {
            const enemies = this.BattleCamp === 'blue' ? this.Manger.RedTeam.hero : this.Manger.BlueTeam.hero;
            const eligible = enemies.filter(hero => hero.Arms > 0 && Math.abs(this.Index - hero.Index) <= 3);
            if (!eligible.length) {
                this.Manger.Record.pushRecord(this, '的【镂影·穿影】因3距离内没有敌军而未触发', 1);
                break;
            }
            const target = eligible[Math.floor(Math.random() * eligible.length)];
            this.Manger.Record.pushActionRecord(this, target, '的【镂影·穿影】对', '发动攻击（伤害率20%）', 1);
            target.beHurt(this, { type: 1, rate: 20 }, LOUYING_CHUANYING);
        }
    }

    tryQiqinDefense(kind, attacker) {
        const effect = this.Storage.qiqinQizong;
        if (!effect || effect.completed || this.Manger.Round < 1 || !attacker) return false;
        effect.count++;
        const chance = effect.source.getRealSkillRate(50);
        const blocked = getRandomBool(chance);
        this.Manger.Record.pushRecord(this,
            `的【七擒七纵】第${effect.count}/7次${kind}判定（${chance}%）：${blocked ? (kind === '伤害' ? '规避' : '抵御') : '未触发'}`, 1);
        if (effect.count === 7) {
            effect.completed = true;
            effect.pending = true;
            if (blocked || kind !== '伤害') this.resolveQiqinQizong();
        }
        return blocked;
    }

    resolveQiqinQizong() {
        const effect = this.Storage.qiqinQizong;
        if (!effect?.pending) return;
        effect.pending = false;
        const chance = effect.source.getRealSkillRate(50);
        if (!getRandomBool(chance)) {
            this.Manger.Record.pushRecord(effect.source, `的【七擒七纵】最终判定（${chance}%）：未触发`, 1);
            return;
        }
        const enemies = effect.source.BattleCamp === 'blue' ? this.Manger.RedTeam.hero : this.Manger.BlueTeam.hero;
        const living = enemies.filter(hero => hero.Arms > 0);
        const damage = hero => Object.entries(this.Manger.Stats[hero.BattleCamp] || {})
            .filter(([key]) => key.startsWith(`${hero.Index}:`))
            .reduce((sum, [, entry]) => sum + entry.damage, 0);
        const target = living.sort((a, b) => damage(b) - damage(a))[0];
        if (!target) return;
        const round = this.Manger.Round + 1;
        target.Storage.qiqinAllDamageSub = { round, value: 9999, source: effect.source };
        this.Manger.Record.pushActionRecord(effect.source, target, '的【七擒七纵】使',
            `下回合造成所有伤害降低9999%（${chance}%判定成功）`, 1);
    }

    //受到伤害
    /*
        damageInfo {
            rate //伤害率
            type //伤害类型 暂定 1物理 2谋略
        }
    */
    beHurt(attacker, damageInfo, skill = null, num = null, record = false) {
        if(this.Manger.Over == true)return;
        if (attacker.Treasure?.id === 'xushibishou' && attacker.Treasure.forge === 'shipo' &&
            this.Manger.Round >= 1 && this.Manger.Round <= attacker.Treasure.forgeValue &&
            skill?.id === attacker.Skill && [2, 3].includes(skill.type)) {
            damageInfo = { ...damageInfo, ignoreEvasion: true };
        }
        if (attacker.Treasure?.id === 'fenran' && damageInfo.isBasicAttack) {
            getDamageAddition(attacker, this, damageInfo, skill);
            const bonus = damageInfo.damageModifiers.entries
                .filter(entry => entry.hero === attacker.Name && entry.value > 0)
                .reduce((sum, entry) => sum + entry.value, 0);
            if (bonus > 250) {
                damageInfo.ignoreEvasion = true;
                attacker.Manger.Record.pushRecord(attacker, `的【奋髯·奋武】增伤累计${bonus}%，本次普攻无视规避`, 1);
            }
        }
        if (!damageInfo.ignoreEvasion && this.tryQiqinDefense('伤害', attacker)) return;
        if (attacker.Storage.shiwuIgnoreNextDamage) {
            damageInfo = { ...damageInfo, ignoreEvasion: true };
            attacker.Storage.shiwuIgnoreNextDamage = false;
            attacker.Manger.Record.pushRecord(attacker, '的【势无虚动】使本次伤害无视规避', 1);
        }
        if (this.Storage.evadeNextDamage && !damageInfo.ignoreEvasion) {
            this.Storage.evadeNextDamage = false;
            this.Manger.Record.pushRecord(this, '规避了本次伤害', 1);
            return;
        }
        // 健卒不殆每次受伤独立判定；士气使用受伤者当前值。
        const jianzu = this.Storage.jianzuBudai;
        const reductionRate = jianzu ? this.getRealSkillRate(50) : 0;
        const reduceThisHit = jianzu && getRandomBool(reductionRate);
        const resolvedInfo = reduceThisHit ? { ...damageInfo, jianzuReduction: true } : damageInfo;
        const qiqinActive = attacker.Storage.qiqinAllDamageSub?.round === this.Manger.Round;
        const qiqinInSnapshot = damageInfo.damageModifiers?.entries?.some(entry => entry.name === '七擒七纵');
        const applyQiqinToSnapshot = num != null && qiqinActive && !qiqinInSnapshot;
        if (jianzu) this.Manger.Record.pushRecord(this,
            `的【健卒不殆】减伤判定（${reductionRate}%）：${reduceThisHit ? '成功，本次伤害降低50%' : '未触发'}`, 1);
        const taoyuan = this.Storage.taoyuanStrategyReduction;
        if (taoyuan && this.Manger.Round >= 1 && this.Manger.Round <= 3 && taoyuan.round !== this.Manger.Round) {
            taoyuan.round = this.Manger.Round;
            taoyuan.remaining = 2;
        }
        const taoyuanActive = damageInfo.type === 2 && taoyuan &&
            this.Manger.Round >= 1 && this.Manger.Round <= 3 && taoyuan.remaining > 0;
        const taoyuanInSnapshot = damageInfo.damageModifiers?.entries?.some(entry => entry.name === '桃源问津');
        const applyTaoyuanToSnapshot = num != null && taoyuanActive && !taoyuanInSnapshot;
        attacker.callHook("攻击前");
        if (num != null && !resolvedInfo.damageModifiers) getDamageAddition(attacker, this, resolvedInfo, skill);
        let realDamage = 0;
        let damage;
        if (num != null) {
            damage = num;
            if ((reduceThisHit || applyQiqinToSnapshot || applyTaoyuanToSnapshot) && [1, 2, 4].includes(damageInfo.type)) {
                // 指挥和持续伤害可能预先算好数值；只折减非兵力基础部分。
                const base = damageInfo.troopBaseDamage ?? (damageInfo.type === 1
                    ? attacker.Arms * 373 / (7700 + attacker.Arms)
                    : attacker.Arms * 178 / (6459 + attacker.Arms) / (damageInfo.type === 4 ? 3 : 1));
                const beforeInfo = { ...damageInfo, ignoreQiqin: applyQiqinToSnapshot,
                    ignoreTaoyuan: applyTaoyuanToSnapshot, jianzuReduction: false };
                const before = getDamageAddition(attacker, this, beforeInfo, skill);
                const after = getDamageAddition(attacker, this, resolvedInfo, skill);
                damage = Math.min(num, Math.round(base + Math.max(0, num - base) * after / before));
            }
        } else {
            if (damageInfo.type == 1) {
                //物理伤害
                damage = clacAttackDamage(attacker, this, resolvedInfo, skill);
            } else if (damageInfo.type == 2) {
                //策略/火攻伤害
                damage = clacInteDamage(attacker, this, resolvedInfo, skill);
            } else if (damageInfo.type == 3){
                //动摇伤害
            } else if (damageInfo.type == 4){
                //燃烧/恐慌/妖术伤害
                damage = clacInte2Damage(attacker, this, resolvedInfo, skill);
            }
        }

        if (attacker.Storage.cijianRepeat?.skill === skill || attacker.Storage.weiyuRepeat?.skill === skill) damage = Math.floor(damage * 0.5);
        if (damage >= this.Arms) {
            if (damageInfo.type == 2) this.State.nextInteDamageSub = null;
            // 如果伤害大于剩余的兵力 将兵力改为0
            realDamage = this.Arms
            this.Arms = 0;
        } else {
            if (damageInfo.type == 2) this.State.nextInteDamageSub = null;
            realDamage = damage;
            this.Arms -= damage;
        }

        this.Manger.addStat(attacker, skill, realDamage, 0);
        if (realDamage > 0 && resolvedInfo.yuanrongXuanfengApplied) {
            attacker.Storage.yuanrongXuanfengReady = false;
        }
        this.resolveQiqinQizong();

        if (damageInfo.type == 2 && taoyuan && this.Manger.Round >= 1 && this.Manger.Round <= 3 && taoyuan.remaining > 0) {
            taoyuan.remaining--;
        }

        const recordStart = this.Manger.Record.Records.length;
        if(record){
            record(realDamage);
        }else{
            this.Manger.Record.pushRecord(this, `损失 ${realDamage} 兵力(${this.Arms})`, 1)
        }
        if (this.Manger.Record.Records.length > recordStart) {
            const modifiers = resolvedInfo.damageModifiers || (getDamageAddition(attacker, this, resolvedInfo, skill), resolvedInfo.damageModifiers);
            this.Manger.Record.Records.at(-1).damageModifiers = modifiers;
        }
        if (this.Posname == '大营' && this.Arms <= 0) this.Manger.Over = true;
        attacker.callHook("攻击后", attacker, this);
        attacker.registerLouyingDamage(this, damageInfo, realDamage);
        attacker.callHook("造成伤害后", attacker, this, damageInfo, skill, realDamage);

        // 受到伤害后 获得此次伤害95%的伤兵
        this.HurtArms += Math.floor(realDamage * 0.95);
        console.log(this.Name, this.Manger.Round, `受伤获得伤兵${Math.floor(realDamage * 0.95)}`, this.HurtArms);
        // 如果因此次伤害阵亡 伤兵数量减少到60%
        if (this.Arms == 0) {
            console.log(this.Name, this.Manger.Round, ` 因阵亡伤兵减少到60%`, Math.floor(this.HurtArms * 0.6));
            this.HurtArms = Math.floor(this.HurtArms * 0.6);
        }

        // 反击是普通攻击类型伤害，但不再次触发受击事件或反击链。
        if (!damageInfo.isCounterattack) this.callHook('受伤时', attacker, damageInfo, skill, realDamage);
        if (this.Storage.jianzuBudai && damageInfo.isBasicAttack && !damageInfo.isSplitAttack && !damageInfo.isCounterattack &&
            !(attacker.Treasure?.id === 'fenran' && attacker.Treasure.forge === 'qiangji' &&
                this.Manger.Round >= 1 && this.Manger.Round <= attacker.Treasure.forgeValue) &&
            this.Arms > 0 && attacker.Arms > 0 && !this.Manger.Over &&
            this.State.confusion.rounds <= 0 && this.State.attackLimit.rounds <= 0 &&
            attacker.BattleCamp !== this.BattleCamp) {
            const line = [...this.Manger.BlueTeam.hero, ...[...this.Manger.RedTeam.hero].reverse()].filter(hero => hero.Arms > 0);
            if (Math.abs(line.indexOf(this) - line.indexOf(attacker)) <= this.Limit) {
                this.Manger.Record.pushActionRecord(this, attacker, '对', '发动【健卒不殆】反击');
                attacker.beHurt(this, { type: 1, rate: 40, isCounterattack: true }, this.Storage.jianzuBudai);
            } else {
                this.Manger.Record.pushRecord(this, '的【健卒不殆】因攻击距离不足未能反击', 1);
            }
        }
    }

    //受到伤害,不计算伤害,使用传入的值作为伤害值。 给类似【白衣渡江】这种指挥阶段就确定伤害的战法使用
    beHurtByNum(attacker, damageInfo, skill, num, record = false) {
        this.beHurt(attacker, damageInfo, skill, num, record);
    }

    //受到恢复
    revocer(recoverNum, source, name) {
        if (source?.Storage.cijianRepeat?.skill?.name === name || source?.Storage.weiyuRepeat?.skill?.name === name) recoverNum = Math.floor(recoverNum * 0.5);
        if (this.Arms == 0) return;
        if (this.State.noRecoverUntil > this.Manger.Round) {
            this.Manger.Record.pushRecord(this, `受到【${name}】的恢复被禁疗阻止`, 1);
            return;
        }
        const recoveryBonuses = Object.values(this.Storage.recoveryBonuses || {})
            .filter(bonus => Number.isFinite(bonus?.value) && bonus.value > 0)
            .map(bonus => ({ name: bonus.name || '恢复加成', value: bonus.value }));
        if (source?.Treasure?.id === 'tianwen' && source.Treasure.forge === 'renxin') {
            recoveryBonuses.push({ name: '天问·仁心', value: source.Treasure.forgeValue });
        }
        if (this.Treasure?.id === 'louying' && this.Treasure.forge === 'buxie') {
            const lost = Math.max(0, this.OriginAttrs.arms - this.Arms);
            const tiers = Math.floor(lost / (this.OriginAttrs.arms * 0.15) + 1e-9);
            if (tiers > 0) recoveryBonuses.push({ name: `镂影·不懈（${tiers}层）`, value: tiers * this.Treasure.forgeValue });
        }
        if (recoverNum > 0 && this.HurtArms > 0 && recoveryBonuses.length) {
            const before = recoverNum;
            const total = recoveryBonuses.reduce((sum, bonus) => sum + bonus.value, 0);
            recoverNum = Math.floor(recoverNum * (1 + total / 100));
            this.Manger.Record.pushRecord(this, `受到【${name}】的恢复加成：${recoveryBonuses.map(bonus => `${bonus.name}+${bonus.value}%`).join('、')}，合计+${total}%（${before}→${recoverNum}）`, 1);
        }
        if (this.HurtArms == 0) recoverNum = 0;
        if (recoverNum >= this.HurtArms) {
            recoverNum = this.HurtArms;
            this.HurtArms = 0;
        } else {
            this.HurtArms -= recoverNum;
        }
        this.Arms += recoverNum;
        const skill = Object.values(source?.Skills || {}).find(e => e?.name === name);
        this.Manger.addStat(source, skill || { id: name, name }, 0, recoverNum);
        this.Manger.Record.pushActionRecord(source, this, `【${name}】的效果使`, `恢复了${recoverNum}兵力(${this.Arms})`, 1);
    }

    getDamageStateValue(name) {
        let value = 0;
        value += this.getState(name, 1);
        value += this.getState(name, 2);
        value += this.getState(name, 3);
        value += this.getState(name, 4);
        if (name === 'inteDamageAdd') {
            for (const bonus of Object.values(this.Storage.jiuzhanBonuses || {})) {
                value += bonus.layers * bonus.perLayer;
            }
        }
        return value;
    }

    // 同名持续伤害仅保留较强的一份；重新施加强效果时刷新持续时间。
    applyContinuousDamage(kind, source, skill, rate, rounds, onPursuit = false) {
        if (this.tryQiqinDefense('控制', source)) return false;
        const damageInfo = { type: 4, rate, kind };
        const damage = clacInte2Damage(source, this, damageInfo, skill);
        const current = this.State.continuousDamage[kind];
        if (current && current.expiresRound > this.Manger.Round && damage < current.damage) {
            this.Manger.Record.pushRecord(this, `已有更强大的${kind}效果`, 1);
            return false;
        }
        this.State.continuousDamage[kind] = {
            damage, source, skill, rate, kind, onPursuit,
            damageModifiers: damageInfo.damageModifiers,
            troopBaseDamage: damageInfo.troopBaseDamage,
            appliedRound: this.Manger.Round,
            expiresRound: this.Manger.Round + rounds
        };
        this.Manger.Record.pushRecord(this, `${kind}效果已施加，持续${rounds}回合`, 1);
        this.callHook('被施加持续伤害时', skill, source, damage, damageInfo, kind);
        return true;
    }

    triggerContinuousDamage(onPursuit = false) {
        for (const [kind, effect] of Object.entries(this.State.continuousDamage)) {
            if (effect.expiresRound < this.Manger.Round) {
                delete this.State.continuousDamage[kind];
                continue;
            }
            if (effect.onPursuit !== onPursuit || (!onPursuit && effect.appliedRound >= this.Manger.Round) || this.Arms <= 0) continue;
            this.beHurtByNum(
                effect.source,
                { type: 4, rate: effect.rate, kind: effect.kind, damageModifiers: effect.damageModifiers, troopBaseDamage: effect.troopBaseDamage },
                effect.skill,
                effect.damage,
                (realDamage) => this.Manger.Record.pushRecord(
                    this,
                    `受到【${effect.skill?.name || kind}】的${kind}效果，损失 ${realDamage} 兵力(${this.Arms})`,
                    1
                )
            );
        }
    }

    triggerPursuitCurses() {
        this.triggerContinuousDamage(true);
    }

    //回合开始时清除一些效果
    clearStateRounds() {
        // 清除混乱
        this.claerSingleActionedStateRounds('confusion');

        this.claerSingleActionedStateRounds('rage');

        // 清除怯战
        this.claerSingleActionedStateRounds('attackLimit');

        // 清除连击
        this.claerSingleSimpleStateRounds('doubleAttack');

        // 清除犹豫
        this.claerSingleActionedStateRounds('activeLimit');

        // 减少增减伤类型状态回合数
        this.claerDamageStateRounds('attackDamageAdd');
        this.claerDamageStateRounds('inteDamageAdd');
        this.claerDamageStateRounds('activeDamageAdd');
        this.claerDamageStateRounds('attackDamageSub');
        this.claerDamageStateRounds('inteDamageSub');
        this.claerDamageStateRounds('activeDamageSub');
        this.claerDamageStateRounds('beAttackDamageAdd');
        this.claerDamageStateRounds('beInteDamageAdd');
        this.claerDamageStateRounds('beActiveDamageAdd');
        this.claerDamageStateRounds('beAttackDamageSub');
        this.claerDamageStateRounds('beInteDamageSub');
        this.claerDamageStateRounds('beActiveDamageSub');
    }

    //减少已执行的效果回合数 如混乱,怯战等 
    //差点忘记为什么这样写了备注一下：如果设计成行动前减1回合，一个慢速武将放了浑水，但被浑水的武将已经行动过了 这样会使效果少1回合。所以弄了个已执行标记 --- TODO 好像可以设计成行动结束时减少1回合 后续优化
    claerSingleActionedStateRounds(name) {
        if (this.StateFlag[name] == true) {
            this.StateFlag[name] = false;
            if (this.State[name].rounds > 0) {
                this.State[name].rounds--;
                if (this.State[name].rounds == 0) {
                    this.State[name].from = { hero: null, skill: 0 }
                }
            }
        }
    }

    //减少一些不需要确保执行的效果回合数 如连击 妖术等
    claerSingleSimpleStateRounds(name) {
        if (this.State[name].rounds > 0) {
            this.State[name].rounds--;

            if (this.State[name].rounds == 0) {
                this.State[name].from = { hero: null, skill: 0 }
            }
        }
    }

    //减少增减伤类型状态回合数
    claerDamageStateRounds(name) {
        for (const key in this.State[name]) {
            if (this.State[name][key] == undefined || !this.State[name][key]) continue;
            // console.log('debug',this.State[name][key]);
            if (this.State[name][key].rounds != -1 && this.State[name][key].rounds > 0 && this.State[name][key].type == 1) {
                this.State[name][key].rounds--;
            } else if (this.State[name][key].rounds == 0) {
                this.delState(name, this.State[name][key].from)
            }
        }
    }

    //是否处于混乱状态
    isConfusion() {
        if (this.State.confusion.rounds > 0) {
            this.IN_READY_SKILL = [];
            return true
        }
        return false
    }

    //由于处于混乱跳过1个回合()
    isRage() {
        return this.State.rage.rounds > 0;
    }

    skipRoundByConfusion() {
        // this.Manger.pushRecord(`[${this.Name}] 由于受到 [${this.State.confusion.from.hero.Name}] [${SKILLS[this.State.confusion.from.skill].name}]的混乱效果影响 无法行动`);
        this.Manger.Record.pushRecord(this, '陷入混乱无法行动');
        this.StateFlag.confusion = true;
    }

    //是否处于怯战状态
    isAttackLimit() {
        if (this.State.attackLimit.rounds > 0) {
            return true
        }
        return false
    }

    //是否处于犹豫状态
    isActiveLimit() {
        if (this.State.activeLimit.rounds > 0) {
            this.IN_READY_SKILL = [];
            return true
        }
        return false
    }

    //由于处于犹豫跳过发动战法()
    skipAttackByActiveLimit() {
        console.log('debug', this.State.activeLimit);
        this.Manger.Record.pushRecord(this, '陷入犹豫无法发动战法');
        this.StateFlag.activeLimit = true;
    }

    //由于处于怯战跳过普攻()
    skipAttackByAttackLimit() {
        this.Manger.Record.pushRecord(this, '陷入怯战无法进行攻击');
        this.StateFlag.attackLimit = true;
    }

    //(镇静)清除所有控制与恐慌 妖术 燃烧 动摇 围困 
    clearDebuff(skill, hero, types = ["主动", "追击"]) {
        this.Manger.Record.pushActionRecord(this, hero, "受到了", `【${skill.name}】的镇静`);

        let clear = false;
        if (this.State.confusion.rounds > 0) {
            this.State.confusion.rounds = 0;
            this.Manger.Record.pushRecord(this, "的混乱效果被消除了", 1)
            clear = true;
        }

        if (this.State.rage.rounds > 0) {
            this.State.rage.rounds = 0;
            this.StateFlag.rage = false;
            this.Manger.Record.pushRecord(this, "的暴走效果被消除了", 1);
            clear = true;
        }

        if (this.State.activeLimit.rounds > 0) {
            this.State.activeLimit.rounds = 0;
            this.Manger.Record.pushRecord(this, "的犹豫效果被消除了", 1)
            clear = true;
        }

        if (this.State.attackLimit.rounds > 0) {
            this.State.attackLimit.rounds = 0;
            this.Manger.Record.pushRecord(this, "的怯战效果被消除了", 1)
            clear = true;
        }

        if (!clear) this.Manger.Record.pushRecord(this, "没有效果可消除", 1);

        let skillTypeName2Id = {
            "主动": 2,
            "指挥": 1,
            "追击": 3,
            "被动": 4
        }
        let claerType = [];
        types.forEach(e => {
            claerType.push(skillTypeName2Id[e])
        });

        // 清除执行堆里的负面效果
        for (const key in this.HOOKS) {
            const element = this.HOOKS[key];

            for (const key2 in element) {
                const hook = element[key2];
                console.log(hook);
                //如果类型是需要清除的类型且是负面效果
                if (claerType.includes(hook.skill.type) && hook.type == "debuff" && hook.canClear == true) {
                    delete this.HOOKS[key][key2];
                    this.Manger.Record.pushActionRecord(this, hook.hero, "消除了来自", `【${hook.skill.name}】的负面效果`, 1);
                }
            }
        }

        // 战法类型优先级
        // let skillTypeLevel = {
        //     2: 1, // 主动
        //     3: 1, // 追击
        //     1: 2, // 指挥
        //     4: 3 // 被动
        // }


        //TODO 后续添加 暴走 恐慌 妖术 燃烧 动摇 围困 时添加清除
    }

    // 郝昭行动前净化自身有害效果，不按战法类型限制来源。
    clearAllHarmfulEffects(skill) {
        let removed = 0;
        for (const name of ['confusion', 'rage', 'activeLimit', 'attackLimit']) {
            if (this.State[name]?.rounds > 0) {
                this.State[name] = { rounds: 0, from: { hero: null, skill: 0 } };
                this.StateFlag[name] = false;
                removed++;
            }
        }
        for (const name of ['attackDamageSub', 'inteDamageSub', 'activeDamageSub',
            'beAttackDamageAdd', 'beInteDamageAdd', 'beActiveDamageAdd']) {
            for (const key of Object.keys(this.State[name])) {
                if (this.State[name][key]) {
                    this.State[name][key] = null;
                    removed++;
                }
            }
        }
        removed += Object.keys(this.State.continuousDamage).length;
        this.State.continuousDamage = {};
        if (this.State.noRecoverUntil > this.Manger.Round) {
            this.State.noRecoverUntil = 0;
            removed++;
        }
        for (const hooks of Object.values(this.HOOKS)) {
            for (const [tag, hook] of Object.entries(hooks)) {
                if (hook.type !== 'debuff') continue;
                hook.cleanup?.();
                delete hooks[tag];
                removed++;
            }
        }
        this.Manger.Record.pushRecord(this, `的【${skill.name}】移除了${removed}项有害效果`, 1);
        return removed;
    }

    // 驱散主动、追击战法施加的有益效果；指挥与被动效果不受影响。
    clearActiveBuffs() {
        const beneficialStates = [
            'attackDamageAdd', 'inteDamageAdd', 'beAttackDamageSub',
            'beInteDamageSub', 'activeDamageAdd', 'beActiveDamageSub'
        ];
        for (const name of beneficialStates) {
            for (const [key, state] of Object.entries(this.State[name])) {
                if (state?.from && [2, 3].includes(state.from.type)) {
                    this.delState(name, state.from);
                }
            }
        }
        for (const name of ['firstAction', 'doubleAttack']) {
            const state = this.State[name];
            if (state?.rounds > 0 && [2, 3].includes(state.from?.skill?.type)) {
                state.rounds = 0;
                state.from = { hero: null, skill: 0 };
            }
        }
        if ([2, 3].includes(this.State.splitAttack?.skill?.type)) this.State.splitAttack = null;
        if ([2, 3].includes(this.State.nextInteDamageSub?.from?.type)) this.State.nextInteDamageSub = null;
        for (const hooks of Object.values(this.HOOKS)) {
            for (const [tag, hook] of Object.entries(hooks)) {
                if (hook.type === 'buff' && [2, 3].includes(hook.skill?.type)) delete hooks[tag];
            }
        }
    }

    //获取效果对象
    getHookObj(on) {
        let obj;
        switch (on) {
            case "受伤时":
                obj = this.HOOKS.ON_HURT;
                break;
            case "普攻前":
                obj = this.HOOKS.BEFORE_BASEATK;
                break;
            case "行动前":
                obj = this.HOOKS.BEFORE_ACTION;
                break;
            case "行动时":
                obj = this.HOOKS.ON_ACTION;
                break;
            case "回合开始时":
                obj = this.HOOKS.ROUND_START;
                break;
            case "回合结束时":
                obj = this.HOOKS.ROUND_END;
                break;
            case "速度排序前":
                obj = this.HOOKS.BEFORE_ROUND_SORT;
                break;
            case "攻击前":
                obj = this.HOOKS.BEFORE_ATK;
                break;
            case "攻击后":
                obj = this.HOOKS.AFTER_ATK;
            case "造成伤害时":
                obj = this.HOOKS.ON_DAMAGE;
                break;
            case "造成伤害后":
                obj = this.HOOKS.AFTER_DAMAGE;
                break;
            case "开始准备战法时":
                obj = this.HOOKS.START_READY_SKILL;
                break;
            case "尝试发动战法前":
                obj = this.HOOKS.BEFORE_SKILL_ATTEMPT;
                break;
            case "战法成功发动后":
                obj = this.HOOKS.AFTER_SKILL_ACTIVATED;
                break;
            case "被施加持续伤害时":
                obj = this.HOOKS.ADD_CONTINUOUS_DAMAGE;
                break;
        }
        return obj;
    }
    //添加技能效果
    /* 
        type:
            buff 有益效果&普通效果
            debuff 负面效果
            other 其他 (用于在某个时机清除效果用)
    */
    addHook(on, name, func, skill, hero, type = "buff", canClear = true, cleanup = null) {
        let obj = this.getHookObj(on);

        let tag = makeSkillTag(hero, skill, name)
        obj[tag] = {
            call: func,
            type: type,
            skill: skill,
            hero: hero,
            cleanup
        }
        return tag;
    }
    //移除技能效果
    clearHook(on, tag) {
        let obj = this.getHookObj(on);
        delete obj[tag]
    }
    //执行技能效果
    callHook(on, ...args) {
        let obj = this.getHookObj(on);
        // console.log(obj);
        for (let key in obj) {
            // obj[key](...args)
            // console.log(obj[key]);
            if(this.Manger.Over == false)obj[key].call(...args);
        }
    }

    //计数器增加
    countAdd(tag, num = 1) {
        if (this.Counter[tag]) {
            this.Counter[tag]++;
        } else {
            this.Counter[tag] = 1;
        }
    }
    //计数器减少
    countSub(tag, num = 1) {
        if (this.Counter[tag]) {
            this.Counter[tag]--;
        }
    }
    //计数器重置
    countRest(tag) {
        if (this.Counter[tag]) {
            this.Counter[tag] = 0;
        }
    }
    //计数器获取
    countGet(tag) {
        return this.Counter[tag] ? this.Counter[tag] : 0;
    }

    getSkillTypeName(value) {
        let name;
        switch (value) {
            case 1:
                name = "command"
                break;
            case 2:
                name = "active"
                break;
            case 3:
                name = "pursuit"
                break;
            case 4:
                name = "passive"
                break;
        }
        return name;
    }

    getStateName(value) {
        let name;
        switch (value) {
            case "attackDamageAdd":
                name = "造成攻击伤害提高"
                break;
            case "inteDamageAdd":
                name = "造成策略攻击伤害提高"
                break;
            case "attackDamageSub":
                name = "造成攻击伤害降低"
                break;
            case "inteDamageSub":
                name = "造成策略攻击伤害降低"
                break;
            case "beAttackDamageAdd":
                name = "受到攻击伤害提高"
                break;
            case "beInteDamageAdd":
                name = "受到策略攻击伤害提高"
                break;
            case "beAttackDamageSub":
                name = "受到攻击伤害降低"
                break;
            case "beInteDamageSub":
                name = "受到策略攻击伤害降低"
                break;
            case "activeDamageAdd":
                name = "造成主动战法伤害提高"
                break;
            case "activeDamageSub":
                name = "造成主动战法伤害降低"
                break;
            case "beActiveDamageAdd":
                name = "受到主动战法伤害降低"
                break;
            case "beActiveDamageSub":
                name = "受到主动战法伤害降低"
                break;
        }
        return name;
    }

    //获取效果冲突类型
    /* 
        1 = 同类型不叠加
        2 = 数值替换 取最高效果
        3 = 任意类型不叠加
    */
    getStateLimit(value) {
        let ret;
        switch (value) {
            case "attackDamageAdd":
                ret = 1;
                break;
            case "inteDamageAdd":
                ret = 1;
                break;
            case "attackDamageSub":
                ret = 1;
                break;
            case "inteDamageSub":
                ret = 1;
                break;
            case "beAttackDamageAdd":
                ret = 1;
                break;
            case "beInteDamageAdd":
                ret = 1;
                break;
            case "beAttackDamageSub":
                ret = 1;
                break;
            case "beInteDamageSub":
                ret = 1;
                break;
            case "activeDamageAdd":
                ret = 1;
                break;
            case "activeDamageSub":
                ret = 1;
                break;
            case "beActiveDamageAdd":
                ret = 1;
                break;
            case "beActiveDamageSub":
                ret = 1;
                break;
        }
        return ret;
    }

    //添加状态
    /* 
        name 类型名称
        value 数值
        round 回合数
        from 来源技能
        hero 来源武将
        type 类型 为2时 回合改为次数
    */
    addState(name, value, round, from, hero, stack = false, type = 1) {
        let typename = this.getSkillTypeName(from.type);
        if (this.State[name][typename]) {
            let limit = this.getStateLimit(name);
            switch (limit) {
                case 1:
                    if (from == this.State[name][typename].from && this.State[name][typename].type == 1 && hero == this.State[name][typename].hero && stack) {
                        this.State[name][typename].value += value;
                        this.State[name][typename].round = round;
                        if (this.Manger.Round < 1) {
                            this.Manger.Record.pushRecord(this, `${this.getStateName(name)}${this.State[name][typename].value}%`, 1);
                        } else {
                            this.Manger.Record.pushActionRecord(hero, this, `【${from.name}】使`, `${this.getStateName(name)}${this.State[name][typename].value}%`);
                        }
                        return this.State[name][typename];
                    } else {
                        this.Manger.Record.pushRecord(this, `已存在来自【${this.State[name][typename].from.name}】的${this.getStateName(name)}效果`);
                    }
                    break;
            }

        } else {
            this.State[name][typename] = {
                type: type, //类型
                value: value, //数值
                rounds: round, //回合数 type为2时 为次数
                from: from, //效果来源技能
                hero: hero
            }
            if (this.Manger.Round < 1) {
                this.Manger.Record.pushRecord(this, `${this.getStateName(name)}${this.State[name][typename].value}%`, 1);
            } else {
                this.Manger.Record.pushActionRecord(hero, this, `【${from.name}】使`, `${this.getStateName(name)}${this.State[name][typename].value}%`);
            }
            return this.State[name][typename];
        }
    }
    getState(name, type, returnObj = false) {
        let typename = this.getSkillTypeName(type);
        if (this.State[name][typename] && (this.State[name][typename].value >= 0 || this.State[name][typename].value == -1)) {
            if (returnObj) return this.State[name][typename];
            return this.State[name][typename].value;
        }
        return 0;
    }
    //移除状态
    /* 
        name 类型名称
        from 来源技能
    */
    delState(name, from, recordtab = false) {
        let typename = this.getSkillTypeName(from.type);
        if (this.State[name][typename]) {
            let hero = this.State[name][typename].hero;
            delete this.State[name][typename];
            this.Manger.Record.pushActionRecord(this, hero, `的来自`, `【${from.name}】的${this.getStateName(name)}效果消失了`,recordtab);
        }
    }
    // subStates() {
    //     this
    // }
    //准备技能需被 混乱 犹豫所打断
    //TODO 需要考虑 法正 和 胜兵的准备回合跳过如何处理
    //添加准备技能
    addReadySkill(from, round, func) {
        if (this.canAddReadySkill(from)) {
            this.callHook('开始准备战法时',from);
            if(this.READY_VAL[from.id]){
                round += this.READY_VAL[from.id].skip;
            }
            if (this.Storage.zhengshiRepeat || this.Storage.cijianRepeat || this.Storage.weiyuRepeat || round <= 0) {
                this.Manger.Record.pushRecord(this, `发动【${from.name}】`);
                func();
            }else{
                let ready = {
                    from,
                    round,
                    func
                }
                this.IN_READY_SKILL.push(ready);
                this.Manger.Record.pushRecord(this, `的战法【${from.name}】开始准备`);
            }
            return true;
        }
        return false;
    }

    //减少准备技能回合数
    subReadySkillRound(skill) {
        this.IN_READY_SKILL.forEach((e, i) => {
            if (skill == e.from) {
                if (e.round > 0) {
                    e.round -= 1;
                }

                if (e.round <= 0) {
                    this.Manger.Record.pushRecord(this, `发动【${skill.name}】`);
                    this.Storage.weiyuBuff?.strategyDamageSkills?.delete(skill);
                    e.func();
                    delete this.IN_READY_SKILL[i];
                    this.callHook('战法成功发动后', skill);
                }
            }
        });
    }

    //获取是否可添加准备战法 因为当同一战法正在准备中 不可再次进行准备
    canAddReadySkill(skill) {
        if (this.Storage.zhengshiRepeat) return true;
        let ret = true;
        this.IN_READY_SKILL.forEach(e => {
            if (e.from == skill) ret = false;
        });
        return ret;
    }

    // //获取增减后的属性
    // getAttr(key) {
    //     let attr = this.Attrs[key];
    //     return attr;
    // }

    // getAttrName(key) {
    //     let attrs = {
    //         atk: "攻击",
    //         def: "防御",
    //         int: "谋略",
    //         spd: "速度",
    //         des: "攻城"
    //     };
    //     return attrs[key] || false;
    // }

    // addMultipleAttrCalc(key = [], value, round, from, hero, ratio = false, stack = false) {
    //     key.forEach(e => {
    //         this.addAttrCalc(e, value, round, from, hero, stack);
    //     });
    // }

    // /* 
    //     key 属性key
    //     value 数值
    //     round 回合数
    //     from 来源技能
    //     hero 来源武将
    //     stack 是否可叠加
    // */
    // addAttrCalc(key, value, round, from, hero, ratio = false, stack = false) {
    //     let typename = this.getSkillTypeName(from.type);
    //     if (this.ATTR_CALC[key][typename]) {
    //         if (from == this.ATTR_CALC[key][typename].from && hero == this.StATTR_CALCate[key][typename].hero && stack) {
    //             this.ATTR_CALC[key][typename].value += value;
    //             if (this.Manger.Round < 1) {
    //                 // this.Manger.Record.pushRecord(this, `${}${this.ATTR_CALC[key][typename].value}%`, 1);
    //                 this.Manger.Record.pushRecord(this, `的${this.getAttrName(key)}属性${value > 0 ? "提高" : "降低"}了${ratio ? ratio + `%(${value})` : value}(${this.getAttr(key)})`, 1);
    //             } else {
    //                 // this.Manger.Record.pushActionRecord(hero, this, `【${from.name}】使`, `${this.getAttrName(key)}${this.ATTR_CALC[key][typename].value}%`);
    //                 this.Manger.Record.pushActionRecord(hero, this, `【${from.name}】的效果使`, `的${this.getAttrName(key)}属性${value > 0 ? "提高" : "降低"}了${value}(${this.getAttr(key)})`, 1);
    //             }
    //             return this.ATTR_CALC[key][typename];
    //         } else if (value > this.ATTR_CALC[key][typename].value) {

    //         } else {
    //             this.Manger.Record.pushRecord(this, `已存在来自【${this.ATTR_CALC[key][typename].from.name}】的${this.getStateName(key)}更强的效果`);
    //         }

    //     } else {
    //         this.ATTR_CALC[key][typename] = {
    //             type: type, //类型
    //             value: value, //数值
    //             rounds: round, //回合数
    //             from: from, //效果来源技能
    //             hero: hero
    //         }
    //         if (this.Manger.Round < 1) {
    //             this.Manger.Record.pushRecord(this, `${this.getStateName(name)}${this.ATTR_CALC[key][typename].value}%`, 1);
    //         } else {
    //             this.Manger.Record.pushActionRecord(hero, this, `【${from.name}】使`, `${this.getStateName(key)}${this.ATTR_CALC[key][typename].value}%`);
    //         }
    //         return this.ATTR_CALC[namekey][typename];
    //     }
    // }

    //获取真实发动率
    getRealSkillRate(rate){
        let rateAddByMorale = Math.round((this.Morale - 100) / (100 + 0.5 * this.Morale) * 1000) / 1000;
        rate *= 1 + rateAddByMorale;
        // return rate;
        //QUESTION 暂时不确定是8舍9入还是向下取整
        //已测试是向下取整
        return Math.floor(rate);
    }

    /* //提交持续性伤害
    addContinuousDamage(){
        
    } */
}
