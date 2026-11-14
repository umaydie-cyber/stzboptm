/**
 * 技能配置
 * 
 * Name: 名称
 * Desc: 描述
 * Level: 战法评级
 * Type: 类型 1=指挥 2=主动 3=追击 4=被动
 * Target: 目标数量 示例值 1=1目标 [2,3]=2-3目标
 * TargetType: 目标类型 self=自身 enemy=敌军 friend=友军(除了自己) 当类型为self时 数量强制为1
 * Limit: 距离 追击战法距离填写0,实际距离按武将攻击距离计算
 * Rate: 发动率 %
 * Study: 是否可学习
 */

import { clacAttackDamage, getRandomBool, calcRecover, getRandomInt, clacSkillAdditionRate, clacInteDamage, clacInte2Damage } from "./battleCalcFunc"
import { keepTwoDecimal, makeSkillTag } from "../uilts";
import { BattleHero } from "./battleHero";

function reduceAttributesTemporarily(target, source, skill, values, rounds) {
    const expiresRound = target.Manger.Round + rounds;
    target.Storage.attributeReductionId = (target.Storage.attributeReductionId || 0) + 1;
    for (const [attribute, reduction] of Object.entries(values)) target.Attrs[attribute] -= reduction;
    let restored = false;
    const restore = () => {
        if (restored) return;
        restored = true;
        for (const [attribute, reduction] of Object.entries(values)) target.Attrs[attribute] += reduction;
    };
    const tag = target.addHook('回合开始时', `${skill.name}属性恢复${target.Storage.attributeReductionId}`, () => {
        if (target.Manger.Round < expiresRound) return;
        restore();
        target.clearHook('回合开始时', tag);
    }, skill, source, 'debuff', true, restore);
}

const HENEI_DERIVED = [
    { id: 1055, name: '迷阵', rate: 35, base: 155, grow: 1.5, targets: 1, effect: 'rage', desc: '对敌军单体发动策略攻击（伤害率155.0%，受谋略属性影响），并使其陷入暴走状态，持续1回合' },
    { id: 1056, name: '溃堤', rate: 45, base: 79.8, grow: 0.785, targets: 2, effect: 'attackDown', desc: '对敌军群体发动策略攻击（伤害率79.8%，受谋略属性影响），并使其攻击属性降低10.0（受谋略属性影响），持续2回合' },
    { id: 1057, name: '夹攻', rate: 45, base: 89.6, grow: 0.945, targets: 2, desc: '对敌军群体发动策略攻击（伤害率89.6%，受谋略属性影响）' },
    { id: 1058, name: '伐谋', rate: 40, base: 209, grow: 2.175, targets: 1, effect: 'attackIntelDown', desc: '对敌军单体发动策略攻击（伤害率209.0%，受谋略属性影响），并使其攻击、谋略属性降低45.0（受谋略属性影响），持续2回合' },
    { id: 1059, name: '雀伏', rate: 45, base: 165, grow: 1.75, targets: 1, desc: '对敌军单体发动策略攻击（伤害率165.0%，受谋略属性影响）' },
    { id: 1060, name: '火辎', rate: 50, base: 75, grow: 0.75, targets: 2, effect: 'burn', ready: true, desc: '1回合准备，对敌军群体发动策略攻击（伤害率75.0%，受谋略属性影响），并施加燃烧（伤害率75.0%，受谋略属性影响），持续1回合' },
    { id: 1061, name: '毒泉', rate: 50, base: 85, grow: 0.875, targets: 2, effect: 'panic', ready: true, desc: '1回合准备，使敌军群体陷入恐慌，每回合损失兵力（伤害率85.0%，受谋略属性影响），持续2回合' },
];


export const __SKILLS__ = [
    {
        id: 1090, name: '辕门射戟',
        desc: '对敌军群体发动2～3次无视兵种相克的攻击（伤害率140.0%），每次攻击独立选择目标；第一次受击的敌军造成攻击伤害降低9999%，持续至该武将下一回合行动前',
        level: 'S', type: 2, target: [2, 3], target_type: 'enemy', limit: 5, rate: 35, study: false,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const count = getRandomInt(2, 3);
            for (let i = 0; i < count && !self.Manger.Over && self.Arms > 0; i++) {
                const target = self.getTarget(this.limit, 1)[0];
                if (!target) break;
                target.beHurt(self, { type: 1, rate: 140, ignoreTroopCounter: true }, this);
                if (i !== 0 || target.Arms <= 0) continue;
                const round = self.Manger.Round;
                // 同一目标隔一回合才能再次中此效果，八回合最多被施加四次。
                if (target.Storage.yuanmenShejiDebuff ||
                    (target.Storage.yuanmenShejiLastAppliedRound != null &&
                        target.Storage.yuanmenShejiLastAppliedRound >= round - 1)) continue;
                const state = target.addState('attackDamageSub', 9999, -1, this, self);
                if (!state || state.from !== this || state.hero !== self) continue;
                target.Storage.yuanmenShejiLastAppliedRound = round;
                const expire = () => {
                    if (target.State.attackDamageSub.active === state) target.delState('attackDamageSub', this);
                    if (target.Storage.yuanmenShejiDebuff?.state === state) delete target.Storage.yuanmenShejiDebuff;
                    target.clearHook('行动前', tag);
                };
                const tag = target.addHook('行动前', '辕门射戟降伤到期', () => {
                    if (target.Manger.Round > round) expire();
                }, this, self, 'debuff', true, expire);
                target.Storage.yuanmenShejiDebuff = { state, round };
            }
            return true;
        }
    },
    {
        id: 1089, name: "一夫当关",
        desc: "战斗开始后前2回合，援护友军全体，使自身受到攻击时的伤害降低50.0%（受防御属性影响），仅对自身处于前锋位置时生效",
        level: "A", type: 1, target: 1, target_type: "self", limit: 3, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.Storage.yifudangguan = { skill: this };
        }
    },
    {
        id: 1088, name: "令无空悬",
        desc: "战斗中，自身每次试图发动主动战法时，使主动战法造成的下一次伤害提升30.0%，此效果最多叠加4次；第1、3、5、7回合自身行动时，本回合内造成攻击或策略攻击伤害的主动战法发动率提升10.0%（与战法发动率相加后受士气影响）",
        level: "A", type: 4, target: 1, target_type: "self", limit: 1, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.addHook('行动时', '令无空悬奇数回合发动率', () => {
                self.Storage.lingwukongxuanRateRound = [1, 3, 5, 7].includes(self.Manger.Round) ? self.Manger.Round : 0;
            }, this, self);
            self.addHook('尝试发动战法前', '令无空悬蓄势', (skill) => {
                if (skill?.type !== 2) return;
                self.Storage.lingwukongxuanStacks = Math.min(4, (self.Storage.lingwukongxuanStacks || 0) + 1);
                self.Manger.Record.pushRecord(self, `的【${this.name}】下次主动战法伤害提升${self.Storage.lingwukongxuanStacks * 30}%`, 1);
            }, this, self);
        }
    },
    {
        id: 1087, name: "强势",
        desc: "使敌军群体进行攻击时的伤害降低48.0%（受谋略属性影响），并使其陷入犹豫状态，无法发动主动战法，持续2回合",
        level: "A", type: 2, target: 2, target_type: "enemy", limit: 5, rate: 40, study: false,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const reduction = keepTwoDecimal(48 + (self.Attrs.int - 80) * 18 / 80);
            for (const target of self.getTarget(this.limit, this.target)) {
                target.addState('attackDamageSub', reduction, 2, this, self);
                if (target.State.activeLimit.rounds > 0) {
                    self.Manger.Record.pushRecord(target, '已存在犹豫效果', 1);
                    continue;
                }
                target.State.activeLimit = { rounds: 2, from: { hero: self, skill: this } };
                if (target.State.activeLimit.from?.hero !== self) continue;
                target.StateFlag.activeLimit = false;
                self.Manger.Record.pushActionRecord(self, target, `的【${this.name}】使`, `陷入犹豫${target.State.activeLimit.rounds}回合`, 1);
            }
            return true;
        }
    },
    {
        id: 1086, name: "奇佐鬼谋",
        desc: "使自身和友军单体谋略属性提高22.0%，并使敌军群体随机陷入混乱、暴走、怯战、犹豫状态中的1种，持续2回合",
        level: "S", type: 2, target: 2, target_type: "enemy", limit: 5, rate: 35, study: false,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const allies = [self, ...self.getTarget(5, 1, 3)];
            for (const ally of allies) {
                const previous = ally.Storage.qizuoguimou;
                if (previous) previous.restore();
                const bonus = keepTwoDecimal(ally.Attrs.int * 0.22);
                ally.Attrs.int = keepTwoDecimal(ally.Attrs.int + bonus);
                const expiresRound = self.Manger.Round + 1;
                let restored = false;
                const restore = () => {
                    if (restored) return;
                    restored = true;
                    ally.Attrs.int = keepTwoDecimal(ally.Attrs.int - bonus);
                    if (ally.Storage.qizuoguimou?.restore === restore) delete ally.Storage.qizuoguimou;
                };
                ally.Storage.qizuoguimou = { restore };
                const tag = ally.addHook('回合结束时', '奇佐鬼谋谋略恢复', () => {
                    if (self.Manger.Round < expiresRound) return;
                    restore();
                    ally.clearHook('回合结束时', tag);
                }, this, self, 'buff', true, restore);
                self.Manger.Record.pushRecord(ally, `的谋略属性提高${bonus}(${ally.Attrs.int})`, 1);
            }
            const effects = [
                ['confusion', '混乱'], ['rage', '暴走'],
                ['attackLimit', '怯战'], ['activeLimit', '犹豫']
            ];
            for (const target of self.getTarget(this.limit, this.target)) {
                const [state, label] = effects[getRandomInt(0, effects.length - 1)];
                if (target.State[state].rounds > 0) {
                    self.Manger.Record.pushRecord(target, `已存在${label}效果`, 1);
                    continue;
                }
                target.State[state] = { rounds: 2, from: { hero: self, skill: this } };
                if (target.State[state].from?.hero !== self) continue;
                target.StateFlag[state] = false;
                self.Manger.Record.pushActionRecord(self, target, `的【${this.name}】使`, `陷入${label}${target.State[state].rounds}回合`, 1);
            }
            return true;
        }
    },
    {
        id: 1085, name: "击势",
        desc: "战斗中，每回合自身行动时有65.0%几率使自身攻击时的伤害提升50.0%，持续1回合；有65.0%几率使自身攻击时无视敌方60.0%防御属性，持续1回合。每个效果独立判定，概率受士气影响",
        level: "S", type: 4, target: 1, target_type: "self", limit: 1, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.addHook('行动时', '击势逐回合判定', () => {
                if (self.Manger.Round < 1 || self.Arms <= 0) return;
                const rate = self.getRealSkillRate(65);
                const damage = getRandomBool(rate);
                const ignoreDefense = getRandomBool(rate);
                if (damage) self.Storage.jishiDamageRound = self.Manger.Round;
                if (ignoreDefense) self.Storage.jishiIgnoreDefenseRound = self.Manger.Round;
                self.Manger.Record.pushRecord(self, `的【击势】攻击增伤判定（${rate}%）：${damage ? '成功' : '失败'}`, 1);
                self.Manger.Record.pushRecord(self, `的【击势】无视防御判定（${rate}%）：${ignoreDefense ? '成功' : '失败'}`, 1);
            }, this, self);
        }
    },
    {
        id: 1084, name: "枭雄",
        desc: "战斗前4回合，每回合有90.0%的几率使自身处于洞察状态，免疫混乱、怯战、暴走和挑衅效果，期间无法发动主动战法。曹操发动此战法时，自身攻击、防御、谋略属性提升10.0%（概率受士气影响）",
        level: "B", type: 4, target: 1, target_type: "self", limit: 1, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            if (self.Name === '曹操') {
                for (const attr of ['atk', 'def', 'int']) {
                    self.Attrs[attr] = keepTwoDecimal(self.Attrs[attr] * 1.1);
                    self.OriginAttrs[attr] = keepTwoDecimal(self.OriginAttrs[attr] * 1.1);
                }
                self.Manger.Record.pushRecord(self, `的【${this.name}】使攻击、防御、谋略提升10%`, 1);
            }
            self.addHook('速度排序前', '枭雄逐回合洞察', () => {
                const round = self.Manger.Round;
                if (round < 1 || round > 4 || self.Arms <= 0) return;
                const rate = self.getRealSkillRate(90);
                const success = getRandomBool(rate);
                self.Manger.Record.pushRecord(self, `的【${this.name}】洞察判定（${rate}%）：${success ? '成功' : '失败'}`, 1);
                if (!success) return;
                self.Storage.xiaoxiongInsightRound = round;
                for (const name of ['confusion', 'rage', 'attackLimit']) {
                    if (self.State[name].rounds <= 0) continue;
                    self.State[name] = { rounds: 0, from: { hero: null, skill: 0 } };
                    self.StateFlag[name] = false;
                }
            }, this, self);
        }
    },
    {
        id: 1083, name: "疾战",
        desc: "使自身在本回合可以进行两次普通攻击，并免疫怯战效果",
        level: "B", type: 2, target: 1, target_type: "self", limit: 1, rate: 40, study: true,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            if (self.State.doubleAttack.rounds <= 0) {
                self.State.doubleAttack = { rounds: 1, from: { hero: self, skill: this } };
                self.Manger.Record.pushRecord(self, `的【${this.name}】获得本回合连击`, 1);
            }
            self.Storage.jizhanAttackLimitImmuneRound = self.Manger.Round;
            if (self.State.attackLimit.rounds > 0) {
                self.State.attackLimit.rounds = 0;
                self.Manger.Record.pushRecord(self, `的【${this.name}】清除怯战`, 1);
            }
            return true;
        }
    },
    {
        id: 1082, name: "先声夺人",
        desc: "前3回合，每回合自身行动时有60.0%几率回合内进入连击状态；有60.0%几率进入分兵状态（伤害率70.0%）；有60.0%几率对敌军单体造成一次攻击伤害（伤害率110.0%）。每种效果独立判定，概率受士气影响",
        level: "A", type: 4, target: 1, target_type: "self", limit: 5, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.addHook('行动时', '先声夺人逐回合判定', () => {
                if (self.Manger.Round < 1 || self.Manger.Round > 3 || self.Arms <= 0) return;
                const rate = self.getRealSkillRate(60);
                if (getRandomBool(rate)) {
                    if (self.State.doubleAttack.rounds <= 0) {
                        self.State.doubleAttack = { rounds: 1, from: { hero: self, skill: this } };
                        self.Manger.Record.pushRecord(self, `的【${this.name}】获得本回合连击`, 1);
                    }
                }
                if (getRandomBool(rate)) self.applySplitAttack(70, 1, this, self);
                if (getRandomBool(rate) && !self.Manger.Over && self.Arms > 0) {
                    const target = self.getTarget(this.limit, 1)[0];
                    if (target) {
                        self.Manger.Record.pushActionRecord(self, target, `的【${this.name}】对`, '发动攻击');
                        target.beHurt(self, { type: 1, rate: 110 }, this);
                    }
                }
            }, this, self);
        }
    },
    {
        id: 1081, name: "计险远近",
        desc: "当我军3名武将基础攻击距离均不相同时，大营造成的伤害无视规避，中军攻击、防御、谋略属性增加20.0，前锋每回合受到的首次攻击或策略攻击伤害减少50.0%；且我军全体在发动普通攻击后，使攻击目标本回合受到的所有伤害提高15.0%，可叠加",
        level: "A", type: 1, target: 3, target_type: "team", limit: 5, rate: "--", study: true,
        callskill: function (self) {
            const allies = self.BattleCamp === 'blue' ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            if (allies.length !== 3 || new Set(allies.map(hero => hero.BasicLimit)).size !== 3) {
                self.Manger.Record.pushRecord(self, `的【${this.name}】因基础攻击距离未各不相同而未生效`);
                return;
            }
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const rear = allies.find(hero => hero.Posname === '大营');
            const middle = allies.find(hero => hero.Posname === '中军');
            const front = allies.find(hero => hero.Posname === '前锋');
            if (rear) rear.Storage.jixianIgnoreEvasion = true;
            if (middle) {
                for (const attr of ['atk', 'def', 'int']) middle.Attrs[attr] = keepTwoDecimal(middle.Attrs[attr] + 20);
                self.Manger.Record.pushRecord(middle, `受【${this.name}】影响，攻击、防御、谋略各增加20`, 1);
            }
            if (front) {
                front.addHook('速度排序前', '计险远近前锋每回合减伤', () => {
                    if (front.Manger.Round >= 1) front.Storage.jixianFront = { round: front.Manger.Round, used: false };
                }, this, self);
            }
            for (const ally of allies) {
                ally.addHook('普通攻击后', '计险远近普攻叠层', target => {
                    if (!target || target.Arms <= 0) return;
                    const round = self.Manger.Round;
                    const previous = target.Storage.jixianVulnerability;
                    target.Storage.jixianVulnerability = { round, stacks: (previous?.round === round ? previous.stacks : 0) + 1 };
                    self.Manger.Record.pushRecord(target, `受到【${this.name}】影响，本回合所受所有伤害提高${target.Storage.jixianVulnerability.stacks * 15}%`, 1);
                }, this, self);
            }
        }
    },
    {
        id: 1080, name: "磐阵善守",
        desc: "战斗开始后前4回合，每回合使我军单体兵力最低的武将受到首次攻击和策略攻击的伤害大幅度降低（90%），并使我军随机单体受到下1次伤害时有100.0%几率进入规避状态，免疫该次伤害",
        level: "A", type: 1, target: 1, target_type: "team", limit: 2, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.addHook('速度排序前', '磐阵善守逐回合保护', () => {
                const round = self.Manger.Round;
                if (round < 1 || round > 4) return;
                const allies = self.getTarget(this.limit, 3, 2).filter(hero => hero.Arms > 0);
                if (!allies.length) return;
                const lowest = [...allies].sort((a, b) => a.Arms - b.Arms)[0];
                lowest.Storage.panzhenProtection = { round, attackUsed: false, strategyUsed: false };
                const evader = allies[getRandomInt(0, allies.length - 1)];
                evader.Storage.panzhenEvasion = { round };
                self.Manger.Record.pushRecord(lowest, `获得【${this.name}】本回合首次攻击和策略攻击伤害降低90%`, 1);
                self.Manger.Record.pushRecord(evader, `获得【${this.name}】本回合下一次伤害100%规避判定`, 1);
            }, this, self);
        }
    },
    {
        id: 1079, name: "战必断金",
        desc: "战斗开始后前3回合，使有效距离内敌军群体（2个目标）每回合都有90.0%的几率陷入怯战状态，无法进行普通攻击（概率受士气影响）",
        level: "S", type: 1, target: 2, target_type: "enemy", limit: 4, rate: "--", study: true,
        callskill: function (self) {
            const targets = self.getTarget(this.limit, this.target);
            self.Manger.Record.pushRecord(self, `发动【${this.name}】，目标：${targets.map(target => target.Name).join('、')}`);
            for (const target of targets) {
                target.addHook('回合开始时', '战必断金逐回合怯战', () => {
                    const round = self.Manger.Round;
                    if (round < 1 || round > 3 || target.Arms <= 0) return;
                    const rate = self.getRealSkillRate(90);
                    const success = getRandomBool(rate);
                    self.Manger.Record.pushRecord(target, `的【${this.name}】怯战判定：${rate}%（受${self.Name}士气影响），${success ? '成功' : '失败'}`, 1);
                    if (!success) return;
                    if (target.isAttackLimit() && target.State.attackLimit.from?.skill !== this) return;
                    target.State.attackLimit = { rounds: 1, from: { hero: self, skill: this } };
                    target.StateFlag.attackLimit = false;
                    self.Manger.Record.pushActionRecord(self, target, `的【${this.name}】使`, '陷入怯战1回合', 1);
                }, this, self, 'debuff');
            }
        }
    },
    {
        id: 1078, name: "合纵连横",
        desc: "战斗中，我方3名武将无法获得阵营属性加成，令我军全体武将战法距离+1，对非自身阵营的武将造成攻击与策略伤害提高10%；对非自身阵营的武将普通攻击后有40%概率（受士气影响）使目标陷入围困状态，持续1回合",
        level: "A", type: 1, target: 3, target_type: "team", limit: 3, rate: "--", study: true,
        callskill: function (self) {
            const allies = self.BattleCamp === 'blue' ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            for (const ally of allies) {
                ally.Storage.hezongLianheng = true;
                // 战法实例按武将保存，避免影响敌方和共享配置。
                for (const [id, equipped] of Object.entries(ally.Skills)) {
                    if ([1, 2].includes(equipped?.type) && equipped.limit > 0) {
                        ally.Skills[id] = { ...equipped, limit: equipped.limit + 1 };
                    }
                }
                ally.addHook('普通攻击后', '合纵连横围困', target => {
                    if (!target || target.Arms <= 0 || target.Camp === ally.Camp) return;
                    const rate = ally.getRealSkillRate(40);
                    if (!getRandomBool(rate)) return;
                    target.State.noRecoverUntil = Math.max(target.State.noRecoverUntil || 0, self.Manger.Round + 1);
                    self.Manger.Record.pushActionRecord(ally, target, `的【${this.name}】使`, '陷入围困，1回合内无法恢复兵力', 1);
                }, this, self);
            }
        }
    },
    {
        id: 1077, name: "奉令护蜀",
        desc: "战斗中，任意友军发动普通攻击、主动战法、追击战法后，马岱的下1次普通攻击造成的伤害提升35.0%（受攻击属性影响），下1次受到的所有伤害降低20.0%（受防御属性影响），以上效果可叠加5次",
        level: "A", type: 4, target: 1, target_type: "self", limit: 2, rate: "--", study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const allies = self.BattleCamp === 'blue' ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            const addLayer = () => {
                if (self.Arms <= 0) return;
                self.Storage.madaiAttackStacks = Math.min(5, (self.Storage.madaiAttackStacks || 0) + 1);
                self.Storage.madaiDefenseStacks = Math.min(5, (self.Storage.madaiDefenseStacks || 0) + 1);
                self.Manger.Record.pushRecord(self, `的【${this.name}】下次普攻增伤叠至${self.Storage.madaiAttackStacks}层，下次受伤减伤叠至${self.Storage.madaiDefenseStacks}层`, 1);
            };
            for (const ally of allies) {
                ally.addHook('普通攻击后', '奉令护蜀普攻叠层', addLayer, this, self);
                ally.addHook('战法成功发动后', '奉令护蜀战法叠层', skill => {
                    if (skill?.type === 2 || skill?.type === 3) addLayer();
                }, this, self);
            }
        }
    },
    {
        id: 1076,
        name: "宣威再战",
        desc: "战斗开始后前3回合，普通攻击后对攻击目标发动一次攻击（伤害率150.0%）；第4回合起，普通攻击后对敌军单体随机发动1-3次攻击（伤害率150.0%），每次目标独立判定",
        level: "A", type: 3, target: 1, target_type: "enemy", limit: 0, rate: 120,
        study: false, randomTargets: true,
        callskill: function (self, attackTarget) {
            self.Manger.Record.pushRecord(self, `的攻击发动【${this.name}】`);
            if (self.Manger.Round <= 3) {
                if (attackTarget.Arms > 0) attackTarget.beHurt(self, { type: 1, rate: 150 }, this);
                return;
            }
            const count = getRandomInt(1, 3);
            for (let i = 0; i < count; i++) {
                if (self.Manger.Over || self.Arms <= 0) break;
                const target = self.getTarget(self.Limit, 1)[0];
                if (!target) break;
                target.beHurt(self, { type: 1, rate: 150 }, this);
            }
        }
    },
    {
        id: 1075,
        name: "未雨绸缪",
        desc: "下回合开始后，2回合内自身下一次造成策略伤害的主动战法发动后可再次发动一次（跳过准备），造成原战法50%的伤害和恢复效果；再次发动造成的策略伤害无视目标30%的谋略属性（受自身谋略属性影响）",
        level: "A", type: 2, target: 1, target_type: "self", limit: 1, rate: 45, study: true,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            if (self.Storage.weiyuBuff) {
                self.Manger.Record.pushRecord(self, '已存在未雨绸缪效果', 1);
                return true;
            }
            const buff = { starts: self.Manger.Round + 1, expires: self.Manger.Round + 2 };
            self.Storage.weiyuBuff = buff;
            self.Manger.Record.pushRecord(self, `获得【${this.name}】效果，第${buff.starts}至${buff.expires}回合生效`, 1);
            const expiryTag = self.addHook('回合开始时', '未雨绸缪到期', () => {
                if (self.Manger.Round <= buff.expires) return;
                if (self.Storage.weiyuBuff === buff) self.Storage.weiyuBuff = null;
                self.clearHook('回合开始时', expiryTag);
                self.clearHook('战法成功发动后', triggerTag);
                self.clearHook('造成伤害后', damageTag);
            }, this, self);
            const triggerTag = self.addHook('战法成功发动后', '未雨绸缪再次发动', (skill) => {
                if (self.Storage.weiyuBuff !== buff || self.Manger.Round < buff.starts ||
                    self.Manger.Round > buff.expires || skill.type !== 2 || skill.id === this.id ||
                    self.Storage.weiyuRepeat || self.Storage.cijianRepeat) return;
                // 只在已经造成策略伤害的主动战法后消耗效果。
                if (!buff.strategyDamageSkills?.has(skill)) return;
                self.Storage.weiyuBuff = null;
                self.clearHook('战法成功发动后', triggerTag);
                self.clearHook('回合开始时', expiryTag);
                self.clearHook('造成伤害后', damageTag);
                const ignoreIntelRate = Math.max(0, Math.min(100, 30 + (self.Attrs.int - 80) * 40 / 300));
                self.Storage.weiyuRepeat = { skill, ignoreIntelRate };
                try {
                    self.Manger.Record.pushRecord(self, `的【${skill.name}】受【${this.name}】影响再次发动（跳过准备，伤害和恢复效果为50%，无视目标${Number(ignoreIntelRate.toFixed(2))}%谋略）`, 1);
                    skill.callskill(self, 100);
                } finally {
                    self.Storage.weiyuRepeat = null;
                }
            }, this, self);
            const damageTag = self.addHook('造成伤害后', '未雨绸缪记录策略伤害', (attacker, target, damageInfo, skill, damage) => {
                if (self.Storage.weiyuBuff !== buff) return;
                if (self.Manger.Round < buff.starts || self.Manger.Round > buff.expires) return;
                if (skill?.type !== 2 || damageInfo.type !== 2 || damage <= 0) return;
                (buff.strategyDamageSkills ||= new Set()).add(skill);
            }, this, self);
            return true;
        }
    },
    {
        id: 1074,
        name: "赐剑长驱",
        desc: "自身无法释放主动战法或进行普通攻击；友军全体每回合首次成功释放主动战法后，有40%几率（受刘禅谋略及当前士气影响）再次发动，跳过所有准备回合，造成原战法50%的伤害和恢复效果",
        level: "A", type: 1, target: 3, target_type: "team", limit: 3, rate: "--", study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.Storage.cijianDisabled = true;
            const allies = self.BattleCamp === 'blue' ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            for (const ally of allies) {
                let lastRound = -1;
                ally.addHook('战法成功发动后', '赐剑长驱再次发动', (skill) => {
                    if (skill.type !== 2 || self.Manger.Round < 1 || lastRound === self.Manger.Round ||
                        ally.Storage.cijianRepeat || ally.Arms <= 0) return;
                    lastRound = self.Manger.Round;
                    const baseRate = 40 + (self.Attrs.int - 80) * 43 / 303;
                    const rate = self.getRealSkillRate(Math.max(0, Math.min(100, baseRate)));
                    const success = getRandomBool(rate);
                    self.Manger.Record.pushRecord(ally, `的【${this.name}】判定（${rate}%）：${success ? '成功' : '未触发'}`, 1);
                    if (!success) return;
                    ally.Storage.cijianRepeat = { skill, multiplier: 0.5 };
                    try {
                        self.Manger.Record.pushRecord(ally, `的【${skill.name}】再次发动（跳过准备，伤害和恢复效果为50%）`, 1);
                        skill.callskill(ally, 100);
                    } finally {
                        ally.Storage.cijianRepeat = null;
                    }
                }, this, self);
            }
        }
    },
    {
        id: 1073,
        name: "七擒七纵",
        desc: "正式回合后，我军群体受到的前7次伤害或控制，每次有50%几率规避或抵御；7次结束后有50%几率使累计伤害最高的敌军下回合造成所有伤害大幅降低（概率受施加者士气影响）",
        level: "S", type: 1, target: [2, 3], target_type: "team", limit: 5, rate: "--", study: true,
        callskill: function (self) {
            const allies = self.getTarget(5, getRandomInt(2, 3), 2);
            const effect = { source: self, skill: this, count: 0, completed: false };
            for (const ally of allies) ally.Storage.qiqinQizong = effect;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】，保护${allies.map(ally => ally.Name).join('、')}，共享前7次伤害或控制判定`);
        }
    },
    {
        id: 1072,
        name: "势无虚动",
        desc: "每次试图发动追击战法时，下一次造成伤害无视规避，且下一次发动追击战法造成的伤害提高40%，最多叠加3次",
        level: "A", type: 4, target: 1, target_type: "self", limit: 1, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.addHook('尝试发动战法前', '势无虚动蓄势', (attemptedSkill) => {
                if (attemptedSkill.type !== 3) return;
                self.Storage.shiwuStacks = Math.min(3, (self.Storage.shiwuStacks || 0) + 1);
                self.Storage.shiwuIgnoreNextDamage = true;
                self.Manger.Record.pushRecord(self,
                    `尝试【${attemptedSkill.name}】，获得【${this.name}】无视规避；追击增伤累计${self.Storage.shiwuStacks * 40}%（最多3层）`, 1);
            }, this, self);
        }
    },
    {
        id: 1071,
        name: "烈火焚舟",
        desc: "普通攻击后使目标燃烧2回合；若目标已有本战法施加的燃烧，则立即引发剩余燃烧伤害，使目标及相邻敌军士气降低10，并施加1回合更强的焚烧",
        level: "S", type: 3, target: 1, target_type: "enemy", limit: 0, rate: 120, study: false,
        callskill: function (self, target) {
            if (target.Arms <= 0) return;
            const firstRate = Math.round(150 + Math.max(0, self.Attrs.int - 80) * 150 / 90);
            const secondRate = Math.round(270 + Math.max(0, self.Attrs.int - 80) * 270 / 120);
            const existing = target.State.continuousDamage['烈火焚舟燃烧'];
            if (existing?.source === self && existing.expiresRound > self.Manger.Round) {
                const remaining = existing.expiresRound - self.Manger.Round;
                delete target.State.continuousDamage['烈火焚舟燃烧'];
                self.Manger.Record.pushActionRecord(self, target, '的【烈火焚舟】引发', `剩余${remaining}次燃烧伤害`, 1);
                for (let i = 0; i < remaining && target.Arms > 0 && !self.Manger.Over; i++) {
                    target.beHurtByNum(self, { type: 4, rate: existing.rate, kind: '烈火焚舟燃烧' }, this, existing.damage);
                }
                if (self.Manger.Over || target.Arms <= 0) return;
                const line = [...self.Manger.BlueTeam.hero, ...[...self.Manger.RedTeam.hero].reverse()].filter(hero => hero.Arms > 0);
                const index = line.indexOf(target);
                for (const [position, hero] of line.entries()) {
                    if (hero.BattleCamp !== target.BattleCamp || Math.abs(position - index) > 1) continue;
                    hero.Morale = Math.max(0, hero.Morale - 10);
                    self.Manger.Record.pushActionRecord(self, hero, '的【烈火焚舟】使', `士气降低10（当前${hero.Morale}）`, 1);
                }
                target.applyContinuousDamage('烈火焚舟焚烧', self, this, secondRate, 1);
                self.Manger.Record.pushRecord(self, `的【烈火焚舟】第二段伤害率${secondRate}%`, 1);
            } else {
                target.applyContinuousDamage('烈火焚舟燃烧', self, this, firstRate, 2);
                self.Manger.Record.pushRecord(self, `的【烈火焚舟】第一段伤害率${firstRate}%`, 1);
            }
        }
    },
    {
        id: 1070,
        name: "敛微穷极",
        desc: "战斗开始后，友军全体策略伤害提高40%（受谋略影响），每回合结束降低六分之一；策略伤害率在80%至150%（上限受谋略影响）间浮动，第六回合收敛为固定伤害率，持续至战斗结束",
        level: "S", type: 1, target: 3, target_type: "team", limit: 5, rate: "--", study: false,
        callskill: function (self) {
            const intelligence = self.Attrs.int;
            // 334.6 谋略实测：增伤 85%，初始上限 188%。
            const bonus = Math.round(40 + Math.max(0, intelligence - 80) * 0.175);
            const max = Math.round(150 + Math.max(0, intelligence - 80) * 0.15);
            const finalMax = Math.round(115 + Math.max(0, intelligence - 80) * 0.15);
            const allies = self.BattleCamp === 'blue' ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】，策略增伤${bonus}%，伤害率初始波动80%～${max}%`);
            for (const ally of allies) {
                // 在指挥阶段立即施加；若先于白衣渡江结算，会进入其伤害快照。
                ally.Storage.lianweiQiongji = { bonus, max, finalMax, source: self, skill: this };
            }
        }
    },
    {
        id: 1001,
        name: "连战",
        desc: "使自身可以进行两次普通攻击，持续1回合",
        level: "B",
        type: 2,
        target: 1,
        target_type: "self",
        limit: 1,
        rate: 35,
        study: true,
        callskill: function (self) {

        }
    },

    {
        id: 1002,
        name: "温酒斩将",
        desc: "普通攻击后，对攻击目标再次发动猛攻(伤害率200.0%)",
        level: "A",
        type: 3,
        target: 1,
        target_type: "enemy",
        limit: 0,
        rate: 35,
        study: true,
        callskill: function (self, target) {
            self.Manger.Record.pushRecord(self, '的攻击发动【温酒斩将】');
            target.beHurt(self, {
                type: 2,
                rate: 200,
            }, this);
        }
    },

    {
        id: 1003,
        name: "血溅黄沙",
        desc: "以无法发动主动战法为代价，使自身进行攻击时的伤害提高120.0%",
        level: "S",
        type: 4,
        target: 1,
        target_type: "self",
        limit: 0,
        rate: "--",
        study: false,
        callskill: function (self) {
            let manger = self.Manger;
            if (manger.Round == "-1") {
                self.Manger.Record.pushRecord(self, `的战法【${this.name}】生效`);
                // 使自身无法发动主动战法 持续到战斗结束
                self.State.activeLimit.rounds = -1
                self.State.activeLimit.from = {
                    hero: self,
                    skill: this
                }
                self.Manger.Record.pushRecord(self, '的无法发动主动战法效果已施加', 1);
                // 增加攻击伤害120%
                self.State.attackDamageAdd.passive = {
                    value: 120,
                    rounds: -1,
                    from: this,
                    hero: self
                }
                self.Manger.Record.pushRecord(self, '造成的攻击伤害提高120%', 1);
            }
        }
    },

    {
        id: 1004,
        name: "方阵突击",
        desc: "普通攻击后，对攻击目标再次发动攻击(伤害率200.0%)，并使其陷入混乱状态，持续1回合",
        level: "A",
        type: 3,
        target: 1,
        target_type: "enemy",
        limit: 0,
        rate: 30,
        study: false,
        callskill: function (self, target) {
            self.Manger.Record.pushRecord(self, '的攻击发动【方阵突击】');
            target.beHurt(self, {
                type: 2,
                rate: 200,
            }, this);

            if (!target.isConfusion()) {
                target.State.confusion = {
                    rounds: 1,
                    from: {
                        hero: self,
                        skill: this
                    }
                }
                self.Manger.Record.pushActionRecord(self, target, '的【方阵突击】使', '陷入混乱1回合', 1);
            } else {
                self.Manger.Record.pushRecord(target, '已存在混乱效果', 1);
            }
        }
    },

    {
        id: 1005,
        name: "先驱突击",
        desc: "战斗开始后前3回合，使自身优先行动，每回合可进行两次普通攻击，并使攻击属性提高30.0",
        level: "A",
        type: 1,
        target: 1,
        target_type: "self",
        limit: 1,
        rate: "--",
        study: true,
        callskill: function (self) {
            let manger = self.Manger;
            if (manger.Round == 0) {
                manger.Record.pushRecord(self, '发动【先驱突击】');

                self.State.firstAction = {
                    rounds: 3, // 先手按当前回合数判断，不在行动前递减。
                    from: {
                        hero: self,
                        skill: this
                    }
                }
                manger.Record.pushRecord(self, '的先手(预备)效果已施加', 1);

                self.Attrs.atk += 30
                manger.Record.pushRecord(self, `[${self.Name}] 的攻击属性提高了30(${self.Attrs.atk})`, 1);

                self.State.doubleAttack = {
                    rounds: 4, // 连击在行动前递减，设为4才能覆盖第1至第3回合。
                    from: {
                        hero: self,
                        skill: this
                    }
                }
                manger.Record.pushRecord(self, '的连击(预备)效果已施加', 1);
            }
        }
    },

    {
        id: 1006,
        name: "钝兵挫锐",
        desc: "普通攻击后，对攻击目标再次发动猛攻(伤害率200.0%)，并使其无法进行普通攻击，持续1回合",
        level: "A",
        type: 3,
        target: 1,
        target_type: "enemy",
        limit: 0,
        rate: 30,
        study: true,
        callskill: function (self, target) {
            self.Manger.Record.pushRecord(self, '的攻击发动【钝兵挫锐】');
            target.beHurt(self, {
                type: 2,
                rate: 200,
            });

            if (!target.isAttackLimit()) {
                target.State.attackLimit = {
                    rounds: 1,
                    from: {
                        hero: self,
                        skill: this
                    }
                }
                self.Manger.Record.pushActionRecord(self, target, '的【钝兵挫锐】使', '陷入怯战1回合', 1);
            } else {
                self.Manger.Record.pushRecord(target, '已存在怯战效果', 1);
            }
        }
    },

    {
        id: 1007,
        name: "皇裔流离",
        desc: "本场战斗中，使我军全体受到伤害时，有50.0%的几率能恢复一定兵力(恢复率68.0%，受谋略属性影响)",
        level: "S",
        type: 1,
        target: 3,
        target_type: "team",
        limit: 0,
        rate: "--",
        study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, '发动【皇裔流离】')
            let team;

            if (self.BattleCamp == 'red') {
                team = self.Manger.RedTeam.hero;
            } else {
                team = self.Manger.BlueTeam.hero;
            }

            let recover = calcRecover(self, 68, 0.6, 1, self.Attrs.int);
            team.forEach(e => {
                let subskill = () => {
                    if (getRandomBool(self.getRealSkillRate(50))) {
                        e.revocer(recover, self, '皇裔流离');
                    }
                }
                // e.ON_HURT.push(subskill);
                e.addHook("受伤时", "急救", subskill, this, self)
                self.Manger.Record.pushRecord(e, '的急救效果已施加', 1)
            });
        },
    },

    {
        id: 1008,
        name: "其疾如风",
        desc: "战斗开始后前3回合，使我军全体速度属性提高41（以80谋略为基准，每5点谋略使速度加成增加1），并使其每回合有70%的几率可以进行两次普通攻击",
        level: "S",
        type: 1,
        target: 3,
        target_type: "team",
        limit: 3,
        rate: "--",
        study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, '发动【其疾如风】')
            let team;

            if (self.BattleCamp == 'red') {
                team = self.Manger.RedTeam.hero;
            } else {
                team = self.Manger.BlueTeam.hero;
            }

            // 以80谋略为基准，每5点谋略增加1点速度；在指挥阶段确定数值。
            let spdadd = 41 + Math.floor((self.Attrs.int - 80) / 5);

            team.forEach(e => {
                e.Attrs.spd = keepTwoDecimal(spdadd + e.Attrs.spd);
                self.Manger.Record.pushRecord(e, `的速度属性提高了${spdadd}(${e.Attrs.spd})`, 1);

                const expireTag = e.addHook("速度排序前", "移除其疾如风速度加成", () => {
                    if (self.Manger.Round < 4) return;
                    e.Attrs.spd = keepTwoDecimal(e.Attrs.spd - spdadd);
                    self.Manger.Record.pushRecord(e, `的【其疾如风】速度加成结束(${e.Attrs.spd})`, 1);
                    e.clearHook("速度排序前", expireTag);
                }, this, self);

                e.addHook("普攻前", "连击效果", () => {
                    if (self.Manger.Round >= 1 && self.Manger.Round <= 3) {
                        if (getRandomBool(self.getRealSkillRate(70))) {
                            if (e.State.doubleAttack.rounds <= 0) {
                                e.State.doubleAttack = {
                                    rounds: 1,
                                    from: {
                                        hero: self,
                                        skill: this
                                    }
                                }
                            }
                        } else {
                            self.Manger.Record.pushRecord(e, '的其疾如风未生效', 0)
                        }
                    }
                }, this, self);

                self.Manger.Record.pushRecord(e, '的连击(预备)效果已施加', 1)
            });
        },
    },

    {
        id: 1009,
        name: "奋疾先登",
        desc: "每回合行动时使自身攻击伤害提升8.0%，自身速度每高于一名武将，则攻击伤害额外提升8.0%。该效果提升至40%时，将对距离3以内的敌军群体发动一次攻击（伤害率190.0%），发动后攻击伤害提升效果消失，同时使目标速度属性降低20.0，该效果可叠加并持续直到战斗结束",
        level: "S",
        type: 1,
        target: 1,
        target_type: "self",
        limit: 0,
        rate: "--",
        study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, '发动【奋疾先登】')
            let damageRate = 190;
            let maxAddDamageRate = 40;
            let addDamageRate = 8;
            let stateName = self.getStateName("attackDamageAdd");

            let subskill = () => {
                let attack = () => {
                    //TODO 考虑暴走
                    let targets = self.getTarget(3, 2);
                    targets.forEach(e => {
                        self.Manger.Record.pushActionRecord(self, self, '执行来自', '的【奋疾先登】效果');
                        e.beHurt(self, {
                            type: 1,
                            rate: damageRate
                        }, this);
                        e.Attrs.spd = keepTwoDecimal(e.Attrs.spd - 20);
                        if (e.Attrs.spd < 0) e.Attrs.spd = 0;
                        self.Manger.Record.pushActionRecord(self, e, '【奋疾先登】的效果使', `的速度属性降低了20(${e.Attrs.spd})`, 1);
                    });
                    self.delState("attackDamageAdd", this);
                    // self.Manger.Record.pushActionRecord(self, self, `来自`, `【${this.name}】的${stateName}效果消失了`, 1);
                }

                self.addState("attackDamageAdd", addDamageRate, -1, this, self, true)
                // self.Manger.Record.pushActionRecord(self, self, `【${this.name}】使`, `造成的${stateName}${self.getState("attackDamageAdd", this.type)}%`);
                if (self.State.attackDamageAdd.command.value >= maxAddDamageRate) attack()

                self.Manger.SortSpdHeros.forEach((e, i) => {
                    if (e != self && e.Arms > 0) {
                        if (self.Attrs.spd > e.Attrs.spd) {
                            self.Manger.Record.pushActionRecord(e, self, '执行来自', '的【奋疾先登】效果');
                            self.addState("attackDamageAdd", addDamageRate, -1, this, self, true);
                            // self.Manger.Record.pushActionRecord(self, self, `【${this.name}】使`, `造成的${stateName}${self.getState("attackDamageAdd", this.type)}%`);
                            if (self.getState("attackDamageAdd", this.type) >= maxAddDamageRate) attack()
                        }
                    }
                })
            }

            // self.ON_ACTION.push(subskill)
            self.addHook("行动时", "增伤效果", subskill, this, self)
        },
    },

    {
        id: 1010,
        name: "奇兵拒北",
        desc: "每回合行动时有30.0%几率对敌军大营和中军分别发动一次攻击（伤害率180.0%），同时使速度最高的友军单体对敌军大营及中军分别发动一次攻击（伤害率120.0%-180.0%）。每回合奇兵拒北未生效时可提升其5%的发动率，可叠加，生效后发动率提升效果消失",
        level: "S",
        type: 1,
        target: 1,
        target_type: "self",
        limit: 0,
        rate: "--",
        study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, '发动【奇兵拒北】')
            let rate = 30;
            let addRate = 5;
            let damageRate = 180;
            let teamMinDamageRate = 120;
            let teamMaxDamageRate = 180;

            let subskill = () => {
                let currentRate = self.getRealSkillRate(rate) + (self.RATE_VAL[1010] ? self.RATE_VAL[1010].value : 0);
                self.Manger.Record.pushRecord(self, '的【奇兵拒北】当前生效几率为(' + currentRate + '%)')
                if (getRandomBool(currentRate)) {
                    self.Manger.Record.pushActionRecord(self, self, '执行来自', '的【奇兵拒北】效果');
                    let targets;
                    let team;
                    if (self.BattleCamp == 'red') {
                        targets = self.Manger.BlueTeam.hero;
                        team = self.Manger.RedTeam.hero;
                    } else {
                        targets = self.Manger.RedTeam.hero;
                        team = self.Manger.BlueTeam.hero;
                    }
                    // console.log("【奇兵拒北】效果","debug",targets);
                    // 自身执行效果
                    targets.forEach(e => {
                        if ((e.Posname == '大营' || e.Posname == '中军') && e.Arms > 0) {
                            // console.log("【奇兵拒北】效果","debug",e);
                            e.beHurt(self, {
                                type: 1,
                                rate: damageRate
                            }, this);
                        }
                    })
                    let spdhero = null;
                    team.forEach(e => {
                        if (e != self && e.Arms > 0) {
                            if (spdhero == null) {
                                spdhero = e;
                            } else if (e.Attrs.spd > spdhero.Attrs.spd) {
                                spdhero = e;
                            }
                        }
                    });
                    // 速度最快友军执行效果 暂时没考虑暴走
                    self.Manger.Record.pushActionRecord(spdhero, self, '执行来自', '的【奇兵拒北】效果');
                    targets.forEach(e => {
                        if ((e.Posname == '大营' || e.Posname == '中军') && e.Arms > 0) {
                            e.beHurt(self, {
                                type: 1,
                                rate: getRandomInt(teamMinDamageRate, teamMaxDamageRate)
                            }, this);
                        }
                    })

                    if (self.RATE_VAL[1010]) {
                        delete self.RATE_VAL[1010]
                    }
                } else {
                    self.Manger.Record.pushRecord(self, '的【奇兵拒北】没有生效')
                    if (self.RATE_VAL[1010]) {
                        self.RATE_VAL[1010].value += addRate;
                    } else {
                        self.RATE_VAL[1010] = {
                            value: addRate,
                            rounds: -1
                        }
                    }
                }
            }

            // self.ON_ACTION.push(subskill)
            self.addHook("行动时", "攻击效果", subskill, this, self)
        },
    },

    {
        id: 1011,
        name: "忠克猛烈",
        desc: "本战法造成的伤害无视兵种相克及目标的防御属性；对敌军单体发动1次攻击(伤害率280.0%)，并使其陷入犹豫状态，持续1回合；直到陈到下回合行动前，目标每受到1次攻击伤害，陈到对其发动1次攻击(伤害率80.0%)，期间最多可触发3次",
        level: "S",
        type: 2,
        target: 1,
        target_type: "enemy",
        limit: 4,
        rate: 50,
        study: false,
        callskill: function (self, currentRate) {
            if (getRandomBool(currentRate)) {
                self.Manger.Record.pushRecord(self, '发动【忠克猛烈】')
                // 战法攻击效果
                let target = self.getTarget(this.limit, 1);
                target[0].beHurt(self, {
                    type: 1,
                    rate: 280,
                }, this)
                // 使其陷入犹豫1回合
                if (!target[0].isActiveLimit()) {
                    target[0].State.activeLimit = {
                        rounds: 1,
                        from: {
                            hero: self,
                            skill: this
                        }
                    }
                    self.Manger.Record.pushActionRecord(self, target[0], '的【忠克猛烈】使', `陷入犹豫${target[0].State.activeLimit.rounds}回合`);
                } else {
                    self.Manger.Record.pushRecord(target[0], '已存在犹豫效果', 1);
                }

                // 施加受到伤害时陈到对其发动攻击
                let subskill = (attacker, damageInfo, skill) => {
                    // 需判处此伤害不是自己的【忠克猛烈】触发的,避免死循环
                    if (skill == this && attacker == self) return;
                    // 期间最多触发3次
                    if (self.countGet(makeSkillTag(self, this, "受伤效果计次")) >= 3) return;
                    self.countAdd(makeSkillTag(self, this, "受伤效果计次"));
                    self.Manger.Record.pushActionRecord(self, self, '执行来自', '的【忠克猛烈】效果');
                    target[0].beHurt(self, {
                        type: 1,
                        rate: 80,
                    }, this);

                }

                target[0].addHook("受伤时", "目标受伤时效果", subskill, this, self, 'debuff', false)
                // 陈到行动前 清除所有人的 【忠克猛烈】施加的 "受到伤害时陈到对其发动攻击" 的效果
                let clear = () => {
                    self.Manger.SortSpdHeros.forEach(e => {
                        e.clearHook("受伤时", makeSkillTag(self, this, "目标受伤时效果"));
                    });
                    self.countRest(makeSkillTag(self, this, "受伤效果计次"));
                }
                self.addHook("行动前", makeSkillTag(self, this, "清除"), clear, this, self, 'other');
                return true;
            }
        },
    },

    {
        id: 1012,
        name: "愈战愈勇",
        desc: "使自身进行攻击的伤害提高10.0%，此效果每回合开始时额外叠加一次，持续直到战斗结束",
        level: "A",
        type: 4,
        target: 1,
        target_type: "self",
        limit: 0,
        rate: "--",
        study: true,
        callskill: function (self) {
            let manger = self.Manger;
            if (manger.Round == "-1") {
                self.Manger.Record.pushRecord(self, '的战法【愈战愈勇】生效');
                // 增加攻击伤害10%
                self.State.attackDamageAdd.passive = {
                    value: 10,
                    rounds: -1
                }
                self.Manger.Record.pushRecord(self, '造成的攻击伤害提高10%', 1);
                let subskill = () => {
                    self.State.attackDamageAdd.passive.value += 10;
                    self.Manger.Record.pushActionRecord(self, self, '的【愈战愈勇】使', '造成的攻击伤害提高' + self.State.attackDamageAdd.passive.value + '%');
                }

                self.addHook("回合开始时", "回合开始时添加攻击伤害提高", subskill, this, self);
            }
        }
    },

    {
        id: 1013,
        name: "始计",
        desc: "战斗前4回合，在自身行动前，使我军大营下一次攻击或策略攻击时的伤害提高20.0%（受谋略属性影响），敌方兵力最多单体下一次攻击或策略攻击时的伤害降低30.0%（受谋略属性影响），并在自身受到攻击或策略攻击伤害后，于本回合内进入洞察状态，免疫混乱、犹豫、怯战、暴走和挑衅效果",
        level: "S",
        type: 1,
        target: 1,
        target_type: "self",
        limit: 0,
        rate: "--",
        study: true,
        callskill: function (self) {
            let manger = self.Manger;
            if (manger.Round == 0) {
                self.Manger.Record.pushRecord(self, '发动【始计】');
                let addRate = clacSkillAdditionRate(20, 0.15, self.Attrs.int);
                let subRate = clacSkillAdditionRate(30, 0.25, self.Attrs.int);

                let stateName = self.getStateName("attackDamageAdd");
                let stateName2 = self.getStateName("inteDamageAdd");

                let delAddRate = (attacker) => {
                    let obj = attacker.getState("attackDamageAdd", this.type, true);
                    if (obj.from == this && obj.hero == self) {
                        attacker.delState("attackDamageAdd", this, true);
                        attacker.delState("inteDamageAdd", this, true);
                        // self.Manger.Record.pushActionRecord(attacker, self, `来自`, `【${this.name}】的${stateName}效果消失了`, 1);
                        // self.Manger.Record.pushActionRecord(attacker, self, `来自`, `【${this.name}】的${stateName2}效果消失了`, 1);
                    }
                    attacker.clearHook("攻击后", makeSkillTag(self, this, "攻击后移除增伤"));
                }

                let subskill = () => {
                    if (manger.Round > 4) return;
                    self.Manger.SortSpdHeros.forEach(e => {
                        //TODO 考虑暴走
                        if (e.BattleCamp == self.BattleCamp && e.Posname == '大营') {
                            let ret = e.addState("attackDamageAdd", addRate, 1, this, self, false, 2);
                            let ret2 = e.addState("inteDamageAdd", addRate, 1, this, self, false, 2);
                            // if (ret) self.Manger.Record.pushActionRecord(self, e, `【${this.name}】使`, `造成的${stateName}${ret.value}%`);
                            // if (ret2) self.Manger.Record.pushActionRecord(self, e, `【${this.name}】使`, `造成的${stateName2}${ret2.value}%`);
                            e.addHook("攻击后", "攻击后移除增伤", delAddRate, this, self, "other");
                        }
                    })
                }
                self.addHook("行动前", "行动前添加攻击伤害增加", subskill, this, self);
                //TODO 敌方最高兵力施加造成伤害降低 & 自身受到攻击后洞察
            }
        }
    },

    {
        id: 1014,
        name: "浑水摸鱼",
        ready: true,
        desc: "1回合准备，使敌军群体陷入混乱状态，持续2回合",
        level: "S",
        type: 2,
        target: 2,
        target_type: "enemy",
        limit: 4,
        rate: 35,
        study: true,
        callskill: function (self, currentRate) {
            // 准备型战法先创建子技能方法 然后提交在准备战法效果执行堆里
            if (getRandomBool(currentRate)) {
                let subskill = () => {
                    // 先获取目标
                    let targets = self.getTarget(this.limit, this.target);

                    targets.forEach(target => {
                        if (!target.isConfusion()) {
                            target.State.confusion = {
                                rounds: 2,
                                from: { hero: self, skill: this }
                            }
                            self.Manger.Record.pushRecord(target, `陷入混乱2回合`, 1);
                        } else {
                            self.Manger.Record.pushRecord(target, '已存在混乱效果', 1);
                        }
                    })
                }

                self.addReadySkill(this, 1, subskill);
                return true;
            }
        }
    },

    {
        id: 1015,
        name: "垒实迎击",
        desc: "受到普通攻击伤害时，有50.0%几率使自身恢复一定兵力（恢复率200.0%）；有50.0%几率移除自身由主动及追击战法带来的负面效果；使自身进入规避状态，有50.0%几率免疫下1次受到的伤害。同时当自身位于中军及前锋时，每回合开始时有50.0%几率援护友军全体，持续1回合",
        level: "S",
        type: 4,
        target: 1,
        target_type: "self",
        limit: 1,
        rate: "--",
        study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            let subskill = (attacker, damageInfo, skill) => {
                if (damageInfo.type == 1 && (skill == null || damageInfo.isBasicAttack)) {
                    // 恢复一定兵力
                    if (getRandomBool(self.getRealSkillRate(50))) {
                        self.revocer(calcRecover(self, 200, 0, 2), self, this.name);
                    }

                    // 移除负面效果
                    if (getRandomBool(self.getRealSkillRate(50))) {
                        self.clearDebuff(this, self);
                    }

                    if (getRandomBool(self.getRealSkillRate(50))) {
                        self.Storage.evadeNextDamage = true;
                        self.Manger.Record.pushRecord(self, '进入规避状态，可免疫下一次伤害', 1);
                    }

                }
            }

            let subskill2 = () => {
                // 援护友军
                if (getRandomBool(self.getRealSkillRate(50))) {

                }
            }

            self.addHook("受伤时", "受伤时效果", subskill, this, self);
            self.addHook("回合开始时", "回合开始时效果", subskill2, this, self);
        }
    },

    {
        id: 1016,
        name: "金匮要略",
        desc: "战斗开始后前3回合，使我军全体受到的所有伤害降低20.4%（受谋略属性影响），同时使我军全体受到伤害时，有50.0%的几率能恢复一定兵力（恢复率80.0%，受谋略属性影响）",
        level: "S",
        type: 1,
        target: 3,
        target_type: "team",
        limit: 3,
        rate: "--",
        study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, '发动【金匮要略】')
            let team;
            if (self.BattleCamp == 'red') {
                team = self.Manger.RedTeam.hero;
            } else {
                team = self.Manger.BlueTeam.hero;
            }
            let revocerRate = 80;
            let revocerRateAdd = 0.75;
            let damageSubRate = 20.4;
            let damageSubRateAdd = 0.13;
            let recover = calcRecover(self, revocerRate, revocerRateAdd, 1, self.Attrs.int);
            let damageReduction = clacSkillAdditionRate(damageSubRate, damageSubRateAdd, self.Attrs.int);


            team.forEach(e => {
                let subskill = () => {
                    if (getRandomBool(self.getRealSkillRate(50))) {
                        e.revocer(recover, self, '金匮要略');
                    }
                }
                e.addHook("受伤时", "急救", subskill, this, self);
                e.addHook("行动前", "移除急救", () => {
                    if (e.Manger.Round >= 4) {
                        e.clearHook("受伤时", makeSkillTag(self, this, "急救"))
                    }
                }, this, self);
                e.addState("beAttackDamageSub", damageReduction, 3, this, self)
                e.addState("beInteDamageSub", damageReduction, 3, this, self)
                self.Manger.Record.pushRecord(e, '的急救效果已施加', 1);
            });
        },
    },

    {
        id: 1017,
        name: "神兵天降",
        desc: "战斗开始后前3回合，使敌军群体受到攻击和策略攻击时的伤害提高30.0%（受谋略属性影响）",
        level: "S",
        type: 1,
        target: 2,
        target_type: "team",
        limit: 4,
        rate: "--",
        study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, '发动【神兵天降】')
            let damageAddRate = 30;
            let damageAddRateAdd = 0.15;

            let enemy = self.getTarget(4, 2);

            enemy.forEach(e => {
                let value = clacSkillAdditionRate(damageAddRate, damageAddRateAdd, self.Attrs.int);
                e.addState("beAttackDamageAdd", value, 3, this, self)
                e.addState("beInteDamageAdd", value, 3, this, self)
            });
        },
    },

    {
        id: 1018,
        name: "大赏三军",
        desc: "战斗开始后前3回合，使我军群体进行攻击和策略攻击时的伤害提高30.0%（受谋略属性影响）",
        level: "S",
        type: 1,
        target: 2,
        target_type: "team",
        limit: 3,
        rate: "--",
        study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, '发动【大赏三军】')
            let damageAddRate = 30;
            let damageAddRateAdd = 0.15;

            let team = self.getTarget(3, 2, 2);

            team.forEach(e => {
                let value = clacSkillAdditionRate(damageAddRate, damageAddRateAdd, self.Attrs.int);
                e.addState("attackDamageAdd", value, 3, this, self)
                e.addState("inteDamageAdd", value, 3, this, self)
            });
        },
    },
    {
        id: 1019,
        name: "无心恋战",
        desc: "战斗开始后前3回合，使敌军群体进行攻击和策略攻击时的伤害降低30.0%（受谋略属性影响）",
        level: "S",
        type: 1,
        target: 2,
        target_type: "team",
        limit: 4,
        rate: "--",
        study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, '发动【无心恋战】')
            let damageSubRate = 30;
            let damageSubRateAdd = 0.15;

            let enemy = self.getTarget(4, 2);

            enemy.forEach(e => {
                let value = clacSkillAdditionRate(damageSubRate, damageSubRateAdd, self.Attrs.int);
                e.addState("attackDamageSub", value, 3, this, self)
                e.addState("inteDamageSub", value, 3, this, self)
            });
        },
    },

    {
        id: 1020,
        name: "避其锋芒",
        desc: "战斗开始后前3回合，使我军群体受到攻击和策略攻击时的伤害降低30.0%（受谋略属性影响）",
        level: "S",
        type: 1,
        target: 2,
        target_type: "team",
        limit: 3,
        rate: "--",
        study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, '发动【避其锋芒】')
            let damageSubRate = 30;
            let damageSubRateAdd = 0.15;

            let team = self.getTarget(3, 2, 2);

            team.forEach(e => {
                let value = clacSkillAdditionRate(damageSubRate, damageSubRateAdd, self.Attrs.int);
                e.addState("beAttackDamageSub", value, 3, this, self)
                e.addState("beInteDamageSub", value, 3, this, self)
            });
        },
    },

    {
        id: 1051,
        name: "桃源问津",
        desc: "战斗开始后前3回合，使我军群体每回合各自有100.0%几率受到的前2次策略攻击伤害大幅降低；战斗开始后前3回合，使我军群体受到的攻击伤害降低40.2%（受谋略属性影响）",
        level: "S",
        type: 1,
        target: 2,
        target_type: "team",
        limit: 2,
        rate: "--",
        study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const reduction = clacSkillAdditionRate(40.2, 0.15, self.Attrs.int);
            self.getTarget(this.limit, this.target, 2).forEach(ally => {
                ally.addState("beAttackDamageSub", reduction, 3, this, self);
                ally.Storage.taoyuanStrategyReduction = { round: 0, remaining: 2 };
                self.Manger.Record.pushActionRecord(self, ally, `的【${this.name}】使`,
                    '前3回合每回合受到的前2次策略伤害大幅降低（-9999%）', 1);
            });
        },
    },

    {
        id: 1053,
        name: "了如指掌",
        desc: "移除敌军群体的有益效果，并使其无法恢复兵力，持续1回合",
        level: "C", type: 2, target: 2, target_type: "enemy", limit: 4, rate: 35, study: true,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.getTarget(this.limit, this.target).forEach(enemy => {
                enemy.clearActiveBuffs();
                enemy.State.noRecoverUntil = Math.max(enemy.State.noRecoverUntil || 0, self.Manger.Round + 1);
                self.Manger.Record.pushActionRecord(self, enemy, `的【${this.name}】使`, '无法恢复兵力，持续1回合', 1);
            });
            return true;
        }
    },

    {
        id: 1062,
        name: "众谋不懈",
        desc: "战斗中，每当自身试图发动主动及追击战法前，有40.0%的几率对距离5以内的敌军单体发动一次策略攻击（伤害率194.0%，受谋略属性影响）",
        level: "S", type: 1, target: 1, target_type: "enemy", limit: 5, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.addHook("尝试发动战法前", "众谋不懈策略攻击", (sourceSkill) => {
                const rate = self.getRealSkillRate(40);
                const source = `【${sourceSkill.name}】`;
                if (!getRandomBool(rate)) {
                    self.Manger.Record.pushRecord(self, `因尝试发动${source}，判定【${this.name}】（${rate}%）：未触发`, 1);
                    return;
                }
                const target = self.getTarget(this.limit, this.target)[0];
                if (!target) {
                    self.Manger.Record.pushRecord(self, `因尝试发动${source}，判定【${this.name}】（${rate}%）：触发但无可攻击目标`, 1);
                    return;
                }
                self.Manger.Record.pushRecord(self, `因尝试发动${source}，判定【${this.name}】（${rate}%）：触发，对【${target.Name}】发动策略攻击`, 1);
                target.beHurt(self, {
                    type: 2,
                    rate: clacSkillAdditionRate(194, 1.925, self.Attrs.int)
                }, this);
            }, this, self);
        }
    },

    {
        id: 1063,
        name: "鼎足江东",
        desc: "恢复我军群体兵力（恢复率75.0%，受谋略属性影响），并使其休整1回合，每回合恢复兵力（恢复率75.0%，受谋略属性影响）；同时使其攻击与策略攻击伤害提高17.0%（受谋略属性影响），持续2回合。若我军3名武将兵种相同，休整改为立即恢复",
        level: "S", type: 2, target: 2, target_type: "team", limit: 2, rate: 35, study: true,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const team = self.BattleCamp === 'blue' ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            const sameArmy = team.length === 3 && team.every(ally => ally.BisicArm === team[0].BisicArm);
            const damageBonus = clacSkillAdditionRate(17, 0.17, self.Attrs.int);
            const recovery = calcRecover(self, 75, 0.75, 2);
            self.getTarget(this.limit, this.target, 2).forEach(ally => {
                ally.revocer(recovery, self, this.name);
                ally.addState('attackDamageAdd', damageBonus, 2, this, self);
                ally.addState('inteDamageAdd', damageBonus, 2, this, self);
                if (sameArmy) {
                    ally.revocer(recovery, self, this.name);
                } else {
                    ally.Storage.dingzuoRestId = (ally.Storage.dingzuoRestId || 0) + 1;
                    const nextRound = self.Manger.Round + 1;
                    const tag = ally.addHook('回合开始时', `鼎足江东休整${ally.Storage.dingzuoRestId}`, () => {
                        if (ally.Manger.Round < nextRound) return;
                        ally.revocer(recovery, self, this.name);
                        ally.clearHook('回合开始时', tag);
                    }, this, self);
                }
            });
            return true;
        }
    },

    {
        id: 1069,
        name: "健卒不殆",
        desc: "受到普通攻击后反击（伤害率40%）；每次受到伤害时有50%几率使本次伤害降低50%（概率受自身士气影响）",
        level: "A", type: 4, target: 1, target_type: "self", limit: 1, rate: "--", study: true,
        callskill: function (self) {
            self.Storage.jianzuBudai = this;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】，获得反击与受伤减伤效果`);
        }
    },
    {
        id: 1068,
        name: "不动如山",
        desc: "战斗中，行动时移除自身所有有害效果，同时防御属性提高100，谋略属性提高25",
        level: "A", type: 4, target: 1, target_type: "self", limit: 1, rate: "--", study: false,
        callskill: function (self) {
            self.Attrs.def = keepTwoDecimal(self.Attrs.def + 100);
            self.Attrs.int = keepTwoDecimal(self.Attrs.int + 25);
            self.OriginAttrs.int = keepTwoDecimal(self.OriginAttrs.int + 25);
            self.Manger.Record.pushRecord(self, `发动【${this.name}】，防御提高100，谋略提高25`);
            self.Storage.budongrushan = this;
        }
    },
    {
        id: 1067,
        name: "横轭",
        desc: "战斗中，我军仅由骑兵和步兵组成时，使我军骑兵谋略属性提高50，步兵发动普通攻击造成的伤害提高50%",
        level: "B", type: 1, target: 3, target_type: "team", limit: 2, rate: "--", study: true,
        callskill: function (self) {
            const allies = self.BattleCamp === 'blue' ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            if (!allies.every(ally => ally.BisicArm === 2 || ally.BisicArm === 3)) {
                self.Manger.Record.pushRecord(self, `的【${this.name}】未生效：我军包含弓兵`, 1);
                return;
            }
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            for (const ally of allies) {
                if (ally.BisicArm === 3) {
                    ally.Attrs.int = keepTwoDecimal(ally.Attrs.int + 50);
                    ally.OriginAttrs.int = keepTwoDecimal(ally.OriginAttrs.int + 50);
                    self.Manger.Record.pushRecord(ally, `受【${this.name}】影响，谋略提高50（${ally.Attrs.int}）`, 1);
                } else {
                    ally.Storage.henge = true;
                    self.Manger.Record.pushRecord(ally, `受【${this.name}】影响，普通攻击伤害提高50%`, 1);
                }
            }
        }
    },
    {
        id: 1066,
        name: "除恶务尽",
        desc: "前三回合，我军全体处于怯战状态时受到的所有伤害降低30%；第四回合起，我军全体每回合有70%几率可以进行两次普通攻击，持续至战斗结束（概率受施加者士气影响）",
        level: "S", type: 1, target: 3, target_type: "team", limit: 5, rate: "--", study: true,
        callskill: function (self) {
            const allies = self.BattleCamp === 'blue' ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            for (const ally of allies) {
                ally.Storage.chuewujin = true;
                ally.addHook('行动前', '除恶务尽连击判定', () => {
                    if (self.Manger.Round < 4) return;
                    const rate = self.getRealSkillRate(70);
                    if (getRandomBool(rate)) {
                        if (ally.State.doubleAttack.rounds <= 0) {
                            ally.State.doubleAttack = { rounds: 1, from: { hero: self, skill: this } };
                        }
                        self.Manger.Record.pushRecord(ally, `的【${this.name}】连击判定（${rate}%）：成功`, 1);
                    } else {
                        self.Manger.Record.pushRecord(ally, `的【${this.name}】连击判定（${rate}%）：未触发`, 1);
                    }
                }, this, self);
            }
        }
    },
    {
        id: 1065,
        name: "心战为上",
        desc: "战斗中，我军全体每对敌军造成一次伤害，使目标士气降低5点，全队合计最多触发9次；我军全体造成攻击伤害后，按伤害值的一定比例恢复兵力（受马谡谋略影响）",
        level: "A", type: 1, target: 3, target_type: "team", limit: 5, rate: "--", study: false,
        callskill: function (self) {
            const allies = self.BattleCamp === 'blue' ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            // 截图中的回兵表：200谋略为73%，240为82%，330为100%。
            const recoveryRate = Math.max(0, 73 + Math.floor((self.Attrs.int - 200) / 5) + (self.Attrs.int >= 240 ? 1 : 0));
            let moraleTriggers = 0;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】，攻击伤害后恢复率${recoveryRate}%，降低士气最多触发9次`);
            for (const ally of allies) {
                ally.addHook('造成伤害后', '心战为上伤害效果', (attacker, target, info, sourceSkill, damage) => {
                    if (attacker !== ally || !damage || attacker.BattleCamp === target.BattleCamp) return;
                    if (moraleTriggers < 9) {
                        moraleTriggers++;
                        target.Morale = Math.max(0, target.Morale - 5);
                        self.Manger.Record.pushActionRecord(attacker, target, `受【${this.name}】影响，使`, `士气降低5点（${moraleTriggers}/9，当前${target.Morale}）`, 1);
                    }
                    if (info.type === 1 && attacker.Arms > 0) {
                        attacker.revocer(Math.floor(damage * recoveryRate / 100), self, this.name);
                    }
                }, this, self);
            }
        }
    },
    {
        id: 1064,
        name: "久战熟谋",
        desc: "战斗中，使友军群体每造成一次策略伤害后，其策略伤害提高5.0%（受施加者谋略属性影响），最多叠加5次",
        level: "A", type: 1, target: 2, target_type: "friend", limit: 3, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            // 80谋略为5%/层；402谋略为13%/层。施加时锁定数值。
            const perLayer = clacSkillAdditionRate(5, 8 / 322, self.Attrs.int);
            self.getTarget(this.limit, this.target, 3).forEach(ally => {
                const tag = makeSkillTag(self, this, '策略增伤');
                ally.Storage.jiuzhanBonuses ||= {};
                const bonus = { layers: 0, perLayer };
                ally.Storage.jiuzhanBonuses[tag] = bonus;
                ally.addHook('造成伤害后', '久战熟谋叠层', (attacker, target, damageInfo, sourceSkill, damage) => {
                    if (attacker !== ally || damage <= 0 || ![2, 4].includes(damageInfo.type) || bonus.layers >= 5) return;
                    bonus.layers++;
                    self.Manger.Record.pushRecord(ally, `【${this.name}】已叠加${bonus.layers}/5层，策略伤害提高${bonus.layers * perLayer}%`, 1);
                }, this, self);
            });
        }
    },

    {
        id: 1052,
        name: "正始之变",
        desc: "有效距离：5；发动率：--；战斗开始后，敌军全体累计造成15次伤害后，下回合令敌军群体陷入犹豫状态，持续1回合；我军全体成功发动主动或追击战法后，必定再次发动（跳过准备），持续1回合。司马懿、司马师或司马昭发动时，犹豫生效后自身恢复一定兵力（恢复率300.0%）",
        level: "S", type: 1, target: 2, target_type: "enemy", limit: 5, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const enemies = self.BattleCamp === 'blue' ? self.Manger.RedTeam.hero : self.Manger.BlueTeam.hero;
            const allies = self.BattleCamp === 'blue' ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            let hits = 0;
            let scheduledRound = null;
            let effectRound = null;
            for (const enemy of enemies) {
                enemy.addHook('造成伤害后', '正始之变累计伤害', (attacker, target, info, sourceSkill, damage) => {
                    if (scheduledRound !== null || !damage) return;
                    if (++hits >= 15) {
                        scheduledRound = self.Manger.Round + 1;
                        self.Manger.Record.pushRecord(self, `的【${this.name}】将在第${scheduledRound}回合生效`, 1);
                    }
                }, this, self);
            }
            self.addHook('回合开始时', '正始之变生效', () => {
                if (self.Manger.Round !== scheduledRound) return;
                effectRound = scheduledRound;
                let hesitationApplied = false;
                self.getTarget(this.limit, this.target).forEach(enemy => {
                    if (enemy.isActiveLimit()) return;
                    enemy.State.activeLimit = { rounds: 1, from: { hero: self, skill: this } };
                    hesitationApplied = true;
                    self.Manger.Record.pushActionRecord(self, enemy, `的【${this.name}】使`, `陷入犹豫${enemy.State.activeLimit.rounds}回合`, 1);
                });
                if (hesitationApplied && ['司马懿', '司马师', '司马昭'].includes(self.Name)) {
                    self.revocer(calcRecover(self, 300, 0, 2), self, this.name);
                }
            }, this, self);
            for (const ally of allies) {
                ally.addHook('战法成功发动后', '正始之变再次发动', (skill, target) => {
                    if (self.Manger.Round !== effectRound || ally.Storage.zhengshiRepeat || ally.Arms <= 0) return;
                    ally.Storage.zhengshiRepeat = true;
                    try {
                        self.Manger.Record.pushRecord(ally, `的【${skill.name}】受【${this.name}】影响再次发动`, 1);
                        if (skill.type === 3) skill.callskill(ally, target);
                        else skill.callskill(ally, 100);
                    } finally {
                        ally.Storage.zhengshiRepeat = false;
                    }
                }, this, self);
            }
        },
    },

    {
        id: 1021,
        name: "白衣渡江",
        desc: "战斗开始后前2回合，使敌军群体无法进行普通攻击，在此效果结束后，将对敌军全体发动一次强力策略攻击（伤害率215.0%，受谋略属性影响），造成的伤害无视规避",
        level: "S",
        type: 1,
        target: 3,
        target_type: "enemy",
        limit: 5,
        rate: "--",
        study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, '发动【白衣渡江】')

            let enemy = self.getTarget(5, 3);

            enemy.forEach(e => {
                let value = clacSkillAdditionRate(215, 2.25, self.Attrs.int);
                if (!e.isAttackLimit()) {
                    e.State.attackLimit = {
                        rounds: 2,
                        from: {
                            hero: self,
                            skill: this
                        }
                    }
                    self.Manger.Record.pushActionRecord(self, e, `的【${this.name}】使`, '陷入怯战2回合', 1);
                } else {
                    self.Manger.Record.pushRecord(e, '已存在怯战效果', 1);
                }

                let damageInfo = {
                    type: 2,
                    rate: value,
                    ignoreEvasion: true
                };
                let damage = clacInteDamage(self, e, damageInfo, this);
                e.addHook("行动时", "策略攻击伤害", () => {
                    if (e.Manger.Round == 3) {
                        e.beHurtByNum(self, damageInfo, this, damage, () => {
                            self.Manger.Record.pushActionRecord(self, e, `由于`,`【${this.name}】施加的效果损失了${damage}兵力(${e.Arms})`);
                        });
                        
                    }
                }, this, self, "debuff");
                self.Manger.Record.pushRecord(e, "的受到策略攻击伤害效果已施加", 1);
            });
        },
    },

    {
        id: 1022,
        name: "威震河朔",
        desc: "对敌军群体发动一次攻击（伤害率200.0%），使自身与友军单体主动战法伤害提升20.0%（受攻击属性影响），持续2回合。此战法每发动一次，其发动率降低10.0%",
        level: "A",
        type: 2,
        target: 2,
        target_type: "enemy",
        limit: 5,
        rate: 70,
        study: false,
        callskill: function (self) {
            let tag = makeSkillTag(self, this, "发动次数");
            let currentRate = this.rate + (self.RATE_VAL[this.id] ? self.RATE_VAL[this.id].value : 0);
            if (getRandomBool(currentRate)) {
                self.Manger.Record.pushRecord(self, '发动【威震河朔】')
                self.countAdd(tag, 1);
                self.RATE_VAL[this.id] = {
                    value: -10 * self.countGet(tag),
                    rounds: -1
                }
                let enemy = self.getTarget(5, 2);
                enemy.forEach(e => {
                    e.beHurt(self, {
                        type: 1,
                        rate: 200
                    }, this);
                });
                //QUESTION 该技能在攻略里没找到成长值 成长值大概为这个 可能有些许误差
                let value = clacSkillAdditionRate(20, 0.125, self.Attrs.atk);
                self.addState("activeDamageAdd", value, 2, this, self);
                let targets = self.getTarget(5, 1, 3);
                if (targets.length > 0) {
                    targets[0].addState("activeDamageAdd", value, 2, this, self);
                }
                return true;
            }
        },
    },

    {
        id: 1023,
        name: "反计之策",
        desc: "战斗开始后前3回合，使敌军群体发动主动战法时造成的伤害大幅下降，并在首回合有100.0%的几率使其陷入犹豫状态，无法发动主动战法",
        level: "S",
        type: 1,
        target: 2,
        target_type: "enemy",
        limit: 4,
        rate: "--",
        study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, '发动【反计之策】')
            let enemy = self.getTarget(4, 2);

            enemy.forEach(e => {
                e.addState("activeDamageSub", 9999, 3, this, self)
                if (!e.isActiveLimit()) {
                    e.State.activeLimit = {
                        rounds: 1,
                        from: {
                            hero: self,
                            skill: this
                        }
                    }
                    self.Manger.Record.pushActionRecord(self, e, `的【${this.name}】使`, '陷入犹豫1回合', 1);
                } else {
                    self.Manger.Record.pushRecord(e, '已存在犹豫效果', 1);
                }
            });
        },
    },

    {
        id: 1024,
        name: "百战精兵",
        desc: "使自身攻击属性、防御属性、谋略属性、速度属性全部提高32.0",
        level: "B",
        type: 1,
        target: 1,
        target_type: "self",
        limit: 1,
        rate: "--",
        study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.Attrs.atk += 32;
            self.Attrs.int += 32;
            self.Attrs.def += 32;
            self.Attrs.spd += 32;
            self.Manger.Record.pushActionRecord(self, self, `【${this.name}】的效果使`, `的攻击属性提高了32(${self.Attrs.atk})`, 1);
            self.Manger.Record.pushActionRecord(self, self, `【${this.name}】的效果使`, `的防御属性提高了32(${self.Attrs.def})`, 1);
            self.Manger.Record.pushActionRecord(self, self, `【${this.name}】的效果使`, `的谋略属性提高了32(${self.Attrs.int})`, 1);
            self.Manger.Record.pushActionRecord(self, self, `【${this.name}】的效果使`, `的速度属性提高了32(${self.Attrs.spd})`, 1);
        },
    },

    {
        id: 1025, //ID
        name: "持刀从武", //名称
        desc: "自身每回合行动时，每次有50.0%概率对友军大营上次行动阶段造成伤害的目标发动一次攻击（伤害率120.0%），重复三次，每次目标独立判定。当该攻击目标未处于控制状态时，对同一目标的伤害率每次递减20.0%", //描述
        level: "A", //战法级别
        type: 4, //战法类型 1=指挥 2=主动 3=追击 4=被动
        target: 1, //目标数量
        target_type: "enemy", //作用目标
        limit: 5, //战法距离
        rate: "--", //战法发动率
        study: false, //战法是否可学习
        callskill: function (self) {
            //给友军大营添加造成伤害时记录目标
            let team = self.BattleCamp == "blue" ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            team[0].Storage[this.id] = {
                hero: [],
                clear: false
            };

            team[0].addHook("造成伤害后", "造成伤害后记录目标", (attacker, target) => {
                if (team[0].Storage[this.id].clear == true) {
                    team[0].Storage[this.id].clear = false;
                    team[0].Storage[this.id].hero = [];
                }
                let add = true;
                team[0].Storage[this.id].hero.forEach(e => {
                    if (e == target) {
                        console.log('debug', "已有目标", target, `第${self.Manger.Round}回合`);
                        add = false;
                        return
                    }
                });
                if (add) {
                    console.log('debug', "添加目标", target, `第${self.Manger.Round}回合`);
                    team[0].Storage[this.id].hero.push(target)
                }
            }, this, self);

            team[0].addHook("回合开始时", "设置清除标记", () => {
                team[0].Storage[this.id].clear = true;
            }, this, self);

            //周仓造成伤害
            let subskill = () => {
                let damageRate = 120;
                for (let index = 0; index < 3; index++) {
                    if (getRandomBool(self.getRealSkillRate(50))) {
                        if (team[0].Storage[this.id].hero.length > 0) {
                            let atkTarget = team[0].Storage[this.id].hero[Math.floor(Math.random() * team[0].Storage[this.id].hero.length)];
                            console.log('debug', team[0].Storage[this.id].hero, `第${self.Manger.Round}回合`);
                            self.Manger.Record.pushActionRecord(self, self, '执行来自', `的【${this.name}】效果`);
                            self.Manger.Record.pushRecord(self, `【${this.name}】当前伤害率${damageRate}%`)
                            atkTarget.beHurt(self, {
                                type: 1,
                                rate: damageRate
                            }, this);
                            //TODO 差一个暴走的控制判断
                            //如果目标不处于控制状态 伤害率降低20%
                            if (!atkTarget.isActiveLimit() && !atkTarget.isActiveLimit() && !atkTarget.isConfusion()) {
                                damageRate -= 20;
                            }
                        }
                    } else {
                        self.Manger.Record.pushRecord(self, `【${this.name}】的效果未生效`)
                    }
                }
            }

            self.addHook("行动时", "行动时概率造成伤害", subskill, this, self)
        },
    },

    {
        id: 1026, //ID
        name: "一骑当千", //名称
        ready: true,
        desc: "1回合准备，使敌军群体陷入混乱状态，持续2回合", //描述
        level: "S", //战法级别
        type: 2, //战法类型 1=指挥 2=主动 3=追击 4=被动
        target: 3, //目标数量
        target_type: "enemy", //作用目标
        limit: 5, //战法距离
        rate: 30, //战法发动率
        study: true, //战法是否可学习
        callskill: function (self, currentRate) {
            // 准备型战法先创建子技能方法 然后添加在准备战法效果执行堆里
            if (getRandomBool(currentRate)) {
                let subskill = () => {
                    // 先获取目标
                    let targets = self.getTarget(this.limit, this.target);

                    targets.forEach(target => {
                        target.beHurt(self, {
                            type: 1,
                            rate: 280
                        }, this);
                    })
                }

                self.addReadySkill(this, 1, subskill);
                return true;
            }
        }
    },

    {
        id: 1027, //ID
        name: "三军之众", //名称
        ready: true,
        desc: "1回合准备，使我军单体恢复4次兵力（恢复率151.0%，受谋略属性影响），每次目标独立判定", //描述
        level: "S", //战法级别
        type: 2, //战法类型 1=指挥 2=主动 3=追击 4=被动
        target: 1, //目标数量
        target_type: "team", //作用目标
        limit: 3, //战法距离
        rate: 45, //战法发动率
        study: true, //战法是否可学习
        callskill: function (self, currentRate) {
            let revocerRate = 151;
            let revocerRateAdd = 1.575;

            if (getRandomBool(currentRate)) {
                let subskill = () => {
                    for (let index = 0; index < 4; index++) {
                        let targets = self.getTarget(this.limit, this.target, 2);

                        targets.forEach(target => {
                            let revocer = calcRecover(self, revocerRate, revocerRateAdd, 2)
                            target.revocer(revocer, self, '三军之众');
                        });
                    }
                }

                self.addReadySkill(this, 1, subskill);
                return true;
            }
        }
    },

    {
        id: 1028, //ID
        name: "魏武之世", //名称
        desc: "在本场战斗中，使敌军全体攻击属性、防御属性、谋略属性、速度属性下降15.0%（受谋略属性影响），并使我军全体攻击距离+1", //描述
        level: "S", //战法级别
        type: 1, //战法类型 1=指挥 2=主动 3=追击 4=被动
        target: 3, //目标数量
        target_type: "enemy", //作用目标
        limit: 5, //战法距离
        rate: "--", //战法发动率
        study: false, //战法是否可学习
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            let enemy = self.BattleCamp == "blue" ? self.Manger.RedTeam.hero : self.Manger.BlueTeam.hero;
            let friendly = self.BattleCamp == "blue" ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            let subrate = clacSkillAdditionRate(15, 0.045, self.Attrs.int);

            enemy.forEach(e => {
                for (const key of ['atk', 'def', 'int', 'spd']) {
                    let subattr = keepTwoDecimal(e.Attrs[key] * subrate / 100);
                    e.Attrs[key] = keepTwoDecimal(e.Attrs[key] - subattr);
                    self.Manger.Record.pushRecord(e, `的${key}属性降低了${subrate}%(${subattr})(${e.Attrs[key]})`, 1);
                }
            });

            friendly.forEach(e => {
                e.Limit += 1;
                self.Manger.Record.pushRecord(e, `的攻击距离提高了1(${e.Limit})`, 1);
            });
        }
    },

    {
        id: 1029, //ID
        name: "火势风威", //名称
        ready: true,
        desc: "1回合准备，对敌军全体发动策略攻击（伤害率111.0%，受谋略属性影响），并使其在受到下一次伤害时，会额外引发一次燃烧（伤害率221.0%，受谋略属性影响）", //描述
        level: "S", //战法级别
        type: 2, //战法类型 1=指挥 2=主动 3=追击 4=被动
        target: 3, //目标数量
        target_type: "enemy", //作用目标
        limit: 5, //战法距离
        rate: 40, //战法发动率
        study: false, //战法是否可学习
        callskill: function (self, currentRate) {
            // 准备型战法先创建子技能方法 然后添加在准备战法效果执行堆里
            let mainDamage = 111;
            let mainDamageAdd = 0.95;
            let fireDamage = 221;
            let fireDamageAdd = 2.45;

            if (getRandomBool(currentRate)) {
                let subskill = () => {
                    // 先获取目标
                    let targets = self.getTarget(this.limit, this.target);
                    let value = clacSkillAdditionRate(mainDamage, mainDamageAdd, self.Attrs.int);
                    let value2 = clacSkillAdditionRate(fireDamage, fireDamageAdd, self.Attrs.int);

                    targets.forEach(target => {
                        target.beHurt(self, {
                            type: 2,
                            rate: value
                        }, this);
                    });
                    
                    targets.forEach(target => {
                        let damageInfo = {
                            type: 4,
                            rate: value2,
                            kind: '燃烧'
                        };
                        let damage = clacInte2Damage(self, target, damageInfo, this);
                        let tag = target.addHook("受伤时","受伤时燃烧",() => {
                            //需先清除执行堆或者判断该伤害不是自己触发的否则会死循环
                            target.clearHook("受伤时",tag);
                            target.beHurtByNum(self,damageInfo,this,damage,() => {
                                self.Manger.Record.pushActionRecord(target,self,`由于`,`【${this.name}】施加的燃烧效果损失了${damage}兵力(${target.Arms})`,1);
                            });
                        },this, self, "debuff");
                        self.Manger.Record.pushRecord(target,`的燃烧效果已施加`,1);
                        target.callHook('被施加持续伤害时',this,self,damage,damageInfo,"燃烧");
                    });
                }

                self.addReadySkill(this, 1, subskill);
                return true;
            }
        }
    },

    {
        id: 1030, //ID
        name: "衔命建功", //名称
        desc: "敌军全体每回合首次受到持续性伤害时，周瑜有50.0%几率对其发动一次策略攻击（伤害率140.0%，受谋略属性影响）；第3回合起，敌军武将陷入持续性伤害时，立即额外引发一次该持续性伤害", //描述
        level: "S", //战法级别
        type: 1, //战法类型 1=指挥 2=主动 3=追击 4=被动
        target: 3, //目标数量
        target_type: "enemy", //作用目标
        limit: 5, //战法距离
        rate: "--", //战法发动率
        study: false, //战法是否可学习
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            let enemy = self.BattleCamp == "blue" ? self.Manger.RedTeam.hero : self.Manger.BlueTeam.hero;
            let value = clacSkillAdditionRate(140, 0.8, self.Attrs.int);
            self.Storage[this.id] = {
                hero: {}
            };
            
            enemy.forEach(e => {
                //敌军武将陷入持续性伤害时，立即额外引发一次该持续性伤害
                e.addHook('被施加持续伤害时','立即额外引发一次该持续性伤害',(skill, hero, damage, damageInfo, damageName) => {
                    if(self.Manger.Round >= 3){
                        self.Manger.Record.pushRecord(e,`的${damageName}效果已被触发`,1);
                        e.beHurtByNum(self,damageInfo,this,damage,() => {
                            self.Manger.Record.pushActionRecord(e,hero,`由于`,`【${skill.name}】施加的${damageName}效果损失了${damage}兵力(${e.Arms})`,1);
                        });
                    }
                }, this, self, 'debuff');
                e.addHook('受伤时','受到持续性伤害时概率发动策略攻击',(attacker, damageInfo) => {
                    
                    if((damageInfo.type == 3 || damageInfo.type == 4) && self.Storage[this.id].hero[e.BattleCamp+e.Posname+e.Name] != true){
                        //必须在执行伤害前添加标记 否则会有问题
                        self.Storage[this.id].hero[e.BattleCamp+e.Posname+e.Name] = true;
                        self.Manger.Record.pushRecord(self,`的【${this.name}】当前生效几率为${self.getRealSkillRate(50)}%`,1)
                        if(getRandomBool(self.getRealSkillRate(50))){
                            self.Manger.Record.pushActionRecord(self, self, '执行来自', `的【${this.name}】效果`,1);
                            e.beHurt(self,{
                                type: 2,
                                rate: value
                            });
                            // console.log('debug',damageInfo,self.Storage[this.id].hero,e.BattleCamp+e.Posname+e.Name,222);
                        }else{
                            self.Manger.Record.pushRecord(self,`的【${this.name}】效果没有生效`,1)
                        }
                    }
                },this,self,'debuff');
            });

            self.addHook("回合开始时", "清除标记", () => {
                self.Storage[this.id].hero = {};
            }, this, self);
        }
    },

    {
        id: 1031, //ID
        name: "胜兵求战", //名称
        desc: "战斗中，每当自身发动需要准备的主战法时，有80.0%的几率跳过1回合的准备时间。同时，任意友军发动主动战法后，自身下一次主动战法造成的伤害提高15.0%，此效果最多叠加3次", //描述
        level: "B", //战法级别
        type: 1, //战法类型 1=指挥 2=主动 3=追击 4=被动
        target: 1, //目标数量
        target_type: "self", //作用目标
        limit: 2, //战法距离
        rate: "--", //战法发动率
        study: true, //战法是否可学习
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.addHook("开始准备战法时","跳过准备回合",(skill) => {
                let realrate = self.getRealSkillRate(80);
                self.Manger.Record.pushActionRecord(self,self,`来自`,`的【${this.name}】当前生效几率为${realrate}%`);
                let skip = getRandomBool(realrate);
                if(skip){
                    self.READY_VAL[skill.id] = {
                        skip: -1,
                        from: this
                    };
                    self.Manger.Record.pushActionRecord(self,self,`【${this.name}】使`,"主战法减少准备1回合");
                }else{
                    self.Manger.Record.pushActionRecord(self,self,`来自`,`的【${this.name}】没有生效`);
                }
            },this,self);
        }
    },

    {
        id: 1032,
        name: "深谋远虑",
        desc: "使自身进行策略攻击的伤害提高11.0%，此效果每回合开始时额外叠加一次，持续直到战斗结束",
        level: "A",
        type: 4,
        target: 1,
        target_type: "self",
        limit: 0,
        rate: "--",
        study: true,
        callskill: function (self) {
            let value = 11;
            if (self.Manger.Round == "-1") {
                self.Manger.Record.pushRecord(self, `的战法【${this.name}】生效`);
                self.addState("inteDamageAdd", value, -1, this, self, true)
                let subskill = () => {
                    self.addState("inteDamageAdd", value, -1, this, self, true)
                }

                self.addHook("回合开始时", "回合开始时添加策略伤害提高", subskill, this, self);
            }
        }
    },
    {
        id: 1033,
        name: "五兵之烈",
        desc: "对敌军群体发动一次攻击（伤害率300.0%）。装备弓宝物时，有60%几率使本次战法目标数+1（受士气影响）。",
        level: "A",
        type: 2,
        target: 2,
        target_type: "enemy",
        limit: 4,
        rate: 35,
        study: false,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;

            // 当前仅实现弓宝物分支；两次概率判定均使用战斗中的士气修正。
            const extraTargetRate = self.getRealSkillRate(60);
            const targetCount = this.target + (getRandomBool(extraTargetRate) ? 1 : 0);
            self.Manger.Record.pushRecord(self, `发动【${this.name}】；弓宝物额外目标几率${extraTargetRate}%，本次目标数${targetCount}`);
            self.getTarget(this.limit, targetCount).forEach(target => {
                target.beHurt(self, { type: 1, rate: 300 }, this);
            });
            return true;
        }
    },
    {
        id: 1034,
        name: "妖术",
        ready: true,
        desc: "1回合准备，使敌军群体（随机2目标）陷入暴走，普通攻击及攻击战法无差别选择目标，持续2次实际行动。",
        level: "A",
        type: 2,
        target: 2,
        target_type: "enemy",
        limit: 4,
        rate: 50,
        study: true,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            const applyRage = () => {
                self.getTarget(this.limit, this.target).forEach(target => {
                    if (target.isRage()) {
                        self.Manger.Record.pushRecord(target, '已处于暴走状态，无法再次施加', 1);
                        return;
                    }
                    target.State.rage = { rounds: 2, from: { hero: self, skill: this.id } };
                    target.StateFlag.rage = false;
                    self.Manger.Record.pushRecord(target, '陷入暴走，持续2次行动', 1);
                });
            };
            return self.addReadySkill(this, 1, applyRage);
        }
    },
    {
        id: 1035,
        name: "驱虎吞狼",
        desc: "对敌军全体发动策略攻击（伤害率153.0%，受谋略属性影响），并使其无法恢复兵力，持续2回合",
        level: "S", type: 2, target: 3, target_type: "enemy", limit: 5, rate: 30, study: false,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const enemies = self.BattleCamp == 'blue' ? self.Manger.RedTeam.hero : self.Manger.BlueTeam.hero;
            const alreadyBlocked = enemies.some(e => e.Arms > 0 && e.State.noRecoverUntil > self.Manger.Round);
            enemies.filter(e => e.Arms > 0).forEach(e => {
                e.beHurt(self, { type: 2, rate: 153 }, this);
                e.State.noRecoverUntil = Math.max(e.State.noRecoverUntil || 0, self.Manger.Round + 2);
                self.Manger.Record.pushRecord(e, '无法恢复兵力，持续2回合', 1);
            });
            if (alreadyBlocked) {
                const target = self.getTarget(this.limit, 1)[0];
                if (target && !target.isRage()) {
                    target.State.rage = { rounds: 1, from: { hero: self, skill: this.id } };
                    target.StateFlag.rage = false;
                    self.Manger.Record.pushRecord(target, '陷入暴走，持续1次行动', 1);
                }
            }
            return true;
        }
    },
    {
        id: 1036,
        name: "迟智难酬",
        desc: "对敌军群体发动一次策略攻击（伤害率240.0%，受谋略属性影响），并使友军群体受到的下一次策略攻击伤害大幅度降低",
        level: "S", type: 2, target: 2, target_type: "enemy", limit: 5, rate: 35, study: false,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.getTarget(this.limit, this.target).forEach(e => {
                e.beHurt(self, { type: 2, rate: 240 }, this);
            });
            self.getTarget(this.limit, this.target, 2).forEach(e => {
                e.State.nextInteDamageSub = { value: 9999, from: this, hero: self };
                self.Manger.Record.pushRecord(e, '受到的下一次策略攻击伤害降低9999%', 1);
            });
            return true;
        }
    },
    {
        id: 1037,
        name: "虎豹督军",
        desc: "战斗开始后首回合，使我军群体（2～3人）进行攻击的伤害提高50.0%（以80攻击属性为基准，每高1点攻击提高0.2个百分点），此效果每回合降低首回合增伤的1/8",
        level: "S", type: 1, target: [2, 3], target_type: "team", limit: 3, rate: "--", study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const firstRoundBonus = keepTwoDecimal(50 + (self.Attrs.atk - 80) * 0.2);
            const targetCount = getRandomInt(2, 3);
            self.getTarget(this.limit, targetCount, 2).forEach(target => {
                const state = target.addState('attackDamageAdd', firstRoundBonus, -1, this, self);
                if (!state || state.from !== this || state.hero !== self) return;
                target.addHook('回合开始时', '虎豹督军增伤衰减', () => {
                    const round = self.Manger.Round;
                    if (round < 2 || round > 8 || target.State.attackDamageAdd.command !== state) return;
                    state.value = keepTwoDecimal(firstRoundBonus * (9 - round) / 8);
                    self.Manger.Record.pushRecord(target, `【虎豹督军】使造成攻击伤害提高${state.value}%`, 1);
                }, this, self);
            });
        }
    },
    {
        id: 1038,
        name: "盛气横凌",
        desc: "普通攻击后，对攻击目标再次发动猛攻（伤害率260.0%）。若目标士气高昂，则使其陷入混乱状态，持续1回合",
        level: "S", type: 3, target: 1, target_type: "enemy", limit: 0, rate: 50, study: false,
        callskill: function (self, target) {
            self.Manger.Record.pushRecord(self, `的攻击发动【${this.name}】`);
            target.beHurt(self, { type: 1, rate: 260 }, this);
            if (target.Arms <= 0 || target.Morale < 100) return;
            if (target.isConfusion()) {
                self.Manger.Record.pushRecord(target, '已存在混乱效果', 1);
                return;
            }
            target.State.confusion = { rounds: 1, from: { hero: self, skill: this } };
            if (target.State.confusion.rounds <= 0) return;
            target.StateFlag.confusion = false;
            self.Manger.Record.pushActionRecord(self, target, `的【${this.name}】使`, '陷入混乱1回合', 1);
        }
    },
    {
        id: 1039,
        name: "乘胜追击",
        desc: "普通攻击后，对攻击目标发动一次攻击（伤害率150.0%）；每次发动攻击后有60.0%基础概率再次攻击（伤害率100.0%，受士气影响），此基础概率每次降低20个百分点，战法结束后重置",
        level: "S", type: 3, target: 1, target_type: "enemy", limit: 0, rate: 35, study: true,
        callskill: function (self, target) {
            self.Manger.Record.pushRecord(self, `的攻击发动【${this.name}】`);
            target.beHurt(self, { type: 1, rate: 150 }, this);
            // 每次发动独立计算；追加攻击只对仍存活的原目标生效。
            for (let chance = 60; chance > 0 && target.Arms > 0; chance -= 20) {
                const actualChance = self.getRealSkillRate(chance);
                const moraleBonus = actualChance - chance;
                const success = getRandomBool(actualChance);
                self.Manger.Record.pushRecord(self, `的【${this.name}】追加攻击判定：基础${chance}%，士气修正${moraleBonus >= 0 ? '+' : ''}${moraleBonus}%，实际${actualChance}%：${success ? '成功' : '失败'}`, 1);
                if (!success) break;
                self.Manger.Record.pushRecord(self, `的【${this.name}】追加攻击发动`, 1);
                target.beHurt(self, { type: 1, rate: 100 }, this);
            }
        }
    },
    {
        id: 1040,
        name: "密谋定蜀",
        desc: "有效距离：5；发动率：35%；使敌军群体进行攻击和策略攻击的伤害降低30.0%（受谋略属性影响），并陷入恐慌（伤害率143.0%，受谋略属性影响），每当其试图发动追击战法将额外受到妖术诅咒（伤害率133.0%，受谋略属性影响），持续2回合，每次发动后，自身造成的策略攻击伤害提升5%，可叠加，持续到战斗结束",
        level: "S", type: 2, target: 2, target_type: "enemy", limit: 5, rate: 35, study: false,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const reduction = clacSkillAdditionRate(30, 30 / 120, self.Attrs.int);
            const panicRate = clacSkillAdditionRate(143, 1.125, self.Attrs.int);
            const curseRate = clacSkillAdditionRate(133, 1.225, self.Attrs.int);
            self.getTarget(this.limit, this.target).forEach(target => {
                target.addState('attackDamageSub', reduction, 2, this, self);
                target.addState('inteDamageSub', reduction, 2, this, self);
                target.applyContinuousDamage('恐慌', self, this, panicRate, 2);
                target.applyContinuousDamage('妖术', self, this, curseRate, 2, true);
            });
            const bonus = clacSkillAdditionRate(5, 5 / 150, self.Attrs.int);
            self.addState('inteDamageAdd', bonus, -1, this, self, true);
            return true;
        }
    },
    {
        id: 1041, name: "长兵方阵",
        desc: "战斗开始后前3回合，使我军群体每回合都有75.0%的几率进入分兵状态，普通攻击后同时对附近的敌军造成伤害（伤害率60.0%）",
        level: "A", type: 1, target: 2, target_type: "team", limit: 3, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.getTarget(this.limit, this.target, 2).forEach(target => {
                target.addHook('回合开始时', '长兵方阵分兵', () => {
                    if (self.Manger.Round >= 1 && self.Manger.Round <= 3 && getRandomBool(75)) {
                        target.applySplitAttack(60, 1, this, self);
                    }
                }, this, self);
            });
        }
    },
    {
        id: 1042, name: "三军齐出",
        desc: "每回合行动时90.0%几率使自身进入分兵状态，普通攻击后同时对附近的敌军造成伤害（伤害率70.0%）",
        level: "A", type: 4, target: 1, target_type: "self", limit: 1, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.addHook('行动时', '三军齐出分兵', () => {
                if (getRandomBool(90)) self.applySplitAttack(70, 1, this, self);
            }, this, self);
        }
    },
    {
        id: 1043, name: "疾击其后",
        desc: "普通攻击后，随机对敌军单体再发动2次攻击（伤害率80.0%-140.0%），每次攻击的目标及伤害率独立判定",
        level: "S", type: 3, target: 1, target_type: "enemy", limit: 0, rate: 35, study: true, randomTargets: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `的攻击发动【${this.name}】`);
            for (let i = 0; i < 2; i++) {
                if (self.Manger.Over || self.Arms <= 0) break;
                const target = self.getTarget(self.Limit, 1)[0];
                if (!target) break;
                target.beHurt(self, { type: 1, rate: getRandomInt(80, 140) }, this);
            }
        }
    },
    {
        id: 1044, name: "攻其不备",
        desc: "战斗中，使敌军群体在每受到一次攻击的伤害后，其所受到的所有伤害提高5.2%（受速度属性影响，以80速度为基准），此效果最多叠加5次，持续直到战斗结束",
        level: "S", type: 1, target: 2, target_type: "enemy", limit: 5, rate: "--", study: true,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const perLayer = Math.max(0, Math.round(5.2 + (self.Attrs.spd - 80) * 0.04));
            self.getTarget(this.limit, this.target).forEach(target => {
                let layers = 0;
                target.addHook('受伤时', '攻其不备叠层', (attacker, damageInfo, skill, damage) => {
                    if (damageInfo.type !== 1 || damage <= 0 || target.Arms <= 0 || layers >= 5) return;
                    const physical = target.addState('beAttackDamageAdd', perLayer, -1, this, self, true);
                    const strategy = target.addState('beInteDamageAdd', perLayer, -1, this, self, true);
                    if (physical || strategy) {
                        layers++;
                        self.Manger.Record.pushRecord(target, `【攻其不备】已叠加${layers}/5层，每层${perLayer}%`, 1);
                    }
                }, this, self, 'debuff');
            });
        }
    },
    {
        id: 1045, name: "落雷",
        desc: "对敌军单体发动策略攻击（伤害率148.0%，受谋略属性影响），并使其陷入混乱状态，持续1回合",
        level: "A", type: 2, target: 1, target_type: "enemy", limit: 4, rate: 35, study: true,
        callskill: function (self, currentRate, forced = false, range = this.limit) {
            if (!forced && !getRandomBool(currentRate)) return false;
            const target = self.getTarget(range, 1)[0];
            if (!target) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            target.beHurt(self, { type: 2, rate: clacSkillAdditionRate(148, 1.35, self.Attrs.int) }, this);
            if (target.Arms > 0 && !target.isConfusion()) {
                target.State.confusion = { rounds: 1, from: { hero: self, skill: this } };
                target.StateFlag.confusion = false;
                self.Manger.Record.pushRecord(target, '陷入混乱，持续1回合', 1);
            }
            return true;
        }
    },
    {
        id: 1046, name: "落石",
        desc: "对敌军群体发动策略攻击（伤害率92.2%，受谋略属性影响），并使其防御属性降低5.2（受谋略属性影响），持续1回合",
        level: "B", type: 2, target: 2, target_type: "enemy", limit: 2, rate: 45, study: true,
        callskill: function (self, currentRate, forced = false, range = this.limit) {
            if (!forced && !getRandomBool(currentRate)) return false;
            const targets = self.getTarget(range, 2);
            if (!targets.length) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            targets.forEach(target => {
                const damageRate = 92.2 * (1 + (self.Attrs.int - 80) / 150);
                target.beHurt(self, { type: 2, rate: damageRate }, this);
                if (target.Arms <= 0) return;
                if (target.luoshiDefense && !target.luoshiDefense.restored) {
                    target.Attrs.def += target.luoshiDefense.reduction;
                    target.luoshiDefense.restored = true;
                }
                const reduction = 5.2 * (1 + (self.Attrs.int - 80) / 150);
                target.Attrs.def -= reduction;
                const expires = self.Manger.Round + 1;
                const effect = { reduction, restored: false };
                target.luoshiDefense = effect;
                const restore = () => {
                    if (effect.restored) return;
                    target.Attrs.def += reduction;
                    effect.restored = true;
                };
                const tag = target.addHook('回合开始时', '落石防御恢复', () => {
                    if (!effect.restored && self.Manger.Round >= expires) {
                        restore();
                        target.clearHook('回合开始时', tag);
                    }
                }, this, self, 'debuff', true, restore);
                self.Manger.Record.pushRecord(target, `防御降低${reduction}，持续1回合`, 1);
            });
            return true;
        }
    },
    {
        id: 1047, name: "绝水遏敌",
        ready: true,
        desc: "1回合准备，对敌军群体发动策略攻击（伤害率230.0%，受谋略属性影响），并使其无法恢复兵力，持续1回合",
        level: "A", type: 2, target: 2, target_type: "enemy", limit: 4, rate: 50, study: true,
        callskill: function (self, currentRate, forced = false, range = this.limit) {
            if (!forced && !getRandomBool(currentRate)) return false;
            const effect = () => {
                self.getTarget(range, 2).forEach(target => {
                    target.beHurt(self, { type: 2, rate: clacSkillAdditionRate(230, 2.25, self.Attrs.int) }, this);
                    if (target.Arms > 0) {
                        target.State.noRecoverUntil = Math.max(target.State.noRecoverUntil || 0, self.Manger.Round + 1);
                        self.Manger.Record.pushRecord(target, '无法恢复兵力，持续1回合', 1);
                    }
                });
            };
            if (forced) {
                self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
                effect();
                return true;
            }
            return self.addReadySkill(this, 1, effect);
        }
    },
    {
        id: 1048, name: "光武中兴",
        desc: "为我军兵力最低的单体恢复2次兵力（恢复率225.0%，受谋略属性影响），每次重新选目标；每次实际恢复至少1兵力后独立判定30.0%几率额外随机发动落雷、落石、绝水遏敌之一；两次恢复后固定随机发动其中之一；同回合三种均发动后敌军全体士气降低20.0",
        level: "S", type: 2, target: 1, target_type: "team", limit: 5, rate: 45, study: false,
        causesStrategyDamage: true,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            if (self.guangwuRound !== self.Manger.Round) {
                self.guangwuRound = self.Manger.Round;
                self.guangwuUsed = new Set();
                self.guangwuMoraleApplied = false;
            }
            const cast = () => {
                const ids = [1045, 1046, 1047];
                const id = ids[getRandomInt(0, 2)];
                const skill = self.Skills[id] || __SKILLS__.find(item => item.id === id);
                if (!skill || !skill.callskill(self, 100, true, 5)) return;
                self.guangwuUsed.add(skill.id);
                if (self.guangwuUsed.size === 3 && !self.guangwuMoraleApplied) {
                    self.guangwuMoraleApplied = true;
                    const enemies = self.BattleCamp === 'blue' ? self.Manger.RedTeam.hero : self.Manger.BlueTeam.hero;
                    enemies.filter(target => target.Arms > 0).forEach(target => {
                        target.Morale = Math.max(0, target.Morale - 20);
                        self.Manger.Record.pushRecord(target, '士气降低20', 1);
                    });
                }
            };
            for (let i = 0; i < 2; i++) {
                const target = self.getTarget(5, 3, 2).sort((a, b) => a.Arms - b.Arms)[0];
                if (!target) break;
                // 隐藏成长未测定；1.472 是待实现记录中基于单次回血观测的条件估计。
                const recovered = target.revocer(calcRecover(self, 225, 1.472, 2), self, this.name);
                // 只有实际恢复伤兵才算造成恢复效果。
                if (recovered >= 1 && getRandomBool(self.getRealSkillRate(clacSkillAdditionRate(30, 0.07, self.Attrs.int)))) cast();
            }
            // 固定的三选一在两次恢复及其额外判定之后结算。
            cast();
            return true;
        }
    },
    {
        id: 1049, name: "其徐如林",
        desc: "我军全体在正式回合施加的策略伤害，对目标相邻敌军额外造成策略伤害（伤害率为原伤害率的15.0%，受谋略影响）；此比例每回合结束后提升5.0%，可叠加至战斗结束",
        level: "S", type: 1, target: 3, target_type: "team", limit: 5, rate: "--", study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const team = self.BattleCamp === 'blue' ? self.Manger.BlueTeam.hero : self.Manger.RedTeam.hero;
            const enemies = self.BattleCamp === 'blue' ? self.Manger.RedTeam.hero : self.Manger.BlueTeam.hero;
            // 单次战报只约束第2回合合计比例；按15:5同比例成长拆分各回合。
            const scale = Math.max(0, 1 + (self.Attrs.int - 80) * ((0.4031131555 / 0.20 - 1) / 300));
            team.forEach(ally => ally.addHook('造成伤害后', '其徐如林策略分兵', (attacker, target, damageInfo, sourceSkill, damage) => {
                if (self.Manger.Round < 1 || self.Arms <= 0 || !damage || ![2, 4].includes(damageInfo?.type) || damageInfo.isStrategySplash) return;
                const index = enemies.indexOf(target);
                if (index < 0) return;
                const ratio = (15 + 5 * (self.Manger.Round - 1)) / 100 * scale;
                for (const neighbor of [enemies[index - 1], enemies[index + 1]]) {
                    if (!neighbor || neighbor.Arms <= 0 || self.Manger.Over) continue;
                    const sourceName = sourceSkill?.name || '策略伤害';
                    const sourceText = attacker === self
                        ? `【${sourceName}】`
                        : `【${attacker.Name}】的【${sourceName}】`;
                    self.Manger.Record.pushActionRecord(self, neighbor, `的【其徐如林】因${sourceText}命中【${target.Name}】对`, '造成策略分兵伤害');
                    neighbor.beHurt(attacker, { type: 2, rate: damageInfo.rate * ratio, isStrategySplash: true }, this);
                }
            }, this, self));
        }
    },
    {
        id: 1050, name: "锦车持节",
        desc: "每回合开始前有50.0%几率（受谋略属性影响）使敌军单体本回合造成所有伤害大幅降低，或进入暴走状态且攻击距离与主动战法距离-2；触发后于回合结束时恢复我军兵力最低单体（恢复率150.0%，受谋略属性影响）",
        level: "S", type: 1, target: 1, target_type: "enemy", limit: 5, rate: "--", study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.addHook('回合开始时', '锦车持节判定', () => {
                const effectRate = clacSkillAdditionRate(50, 0.25, self.Attrs.int);
                if (self.Manger.Round < 1 || !getRandomBool(self.getRealSkillRate(effectRate))) return;
                const target = self.getTarget(this.limit, 1)[0];
                if (!target) return;
                const round = self.Manger.Round;
                self.Manger.Record.pushActionRecord(self, target, `的【${this.name}】使`, '本回合陷入负面状态');
                if (getRandomBool(50)) {
                    // 战法施加-9999%；伤害计算会把最终增伤乘子钳制到0.1。
                    const attack = target.addState('attackDamageSub', 9999, -1, this, self);
                    const strategy = target.addState('inteDamageSub', 9999, -1, this, self);
                    target.addHook('回合结束时', '锦车持节清除降伤', () => {
                        if (target.Manger.Round !== round) return;
                        if (attack && target.State.attackDamageSub.command === attack) target.delState('attackDamageSub', this);
                        if (strategy && target.State.inteDamageSub.command === strategy) target.delState('inteDamageSub', this);
                    }, this, self, 'debuff');
                } else rageEffect: {
                    target.State.rage = { rounds: 1, from: { hero: self, skill: this.id } };
                    if (target.State.rage.rounds <= 0) break rageEffect;
                    target.StateFlag.rage = false;
                    const originalLimit = target.Limit;
                    target.Limit = Math.max(0, originalLimit - 2);
                    const skills = [];
                    for (const [id, skill] of Object.entries(target.Skills)) {
                        if (skill.type !== 2) continue;
                        const reduced = { ...skill, limit: Math.max(0, skill.limit - 2) };
                        target.Skills[id] = reduced;
                        skills.push([id, skill, reduced]);
                    }
                    let restored = false;
                    const restore = () => {
                        if (restored) return;
                        restored = true;
                        target.Limit = originalLimit;
                        for (const [id, original, reduced] of skills) {
                            if (target.Skills[id] === reduced) target.Skills[id] = original;
                        }
                        if (target.State.rage.from?.skill === this.id) target.State.rage.rounds = 0;
                    };
                    target.addHook('回合结束时', '锦车持节恢复距离', () => {
                        if (target.Manger.Round !== round) return;
                        restore();
                    }, this, self, 'debuff', true, restore);
                }
                self.addHook('回合结束时', '锦车持节回合末恢复', () => {
                    if (self.Manger.Round !== round || self.Arms <= 0) return;
                    const ally = self.getTarget(5, 3, 2).sort((a, b) => a.Arms - b.Arms)[0];
                    if (ally) ally.revocer(calcRecover(self, 150, 1.472, 2), self, this.name);
                }, this, self);
            }, this, self);
        }
    },
    {
        id: 1054, name: '河内世泽',
        desc: '随机发动落雷、迷阵、溃堤、夹攻中的一种，并再次随机发动伐谋、雀伏、火辎、毒泉中的一种。发动的战法有效距离为4，跳过准备回合，效果与原战法同等级相同',
        level: 'S', type: 2, target: [1, 2], target_type: 'enemy', limit: 4, rate: 35, study: true,
        callskill: function (self, currentRate) {
            if (!getRandomBool(currentRate)) return false;
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            const groups = [[1045, 1055, 1056, 1057], [1058, 1059, 1060, 1061]];
            for (const group of groups) {
                if (self.Manger.Over || self.Arms <= 0) break;
                const id = group[getRandomInt(0, group.length - 1)];
                const derived = __SKILLS__.find(skill => skill.id === id);
                derived.callskill(self, 100, true, 4);
            }
            return true;
        }
    },
    ...HENEI_DERIVED.map(config => ({
        id: config.id, name: config.name,
        desc: config.desc,
        level: 'A', type: 2, target: config.targets, target_type: 'enemy',
        limit: config.name === '伐谋' || config.name === '溃堤' ? 3 : config.name === '毒泉' ? 5 : 4,
        rate: config.rate, study: true, ready: !!config.ready,
        callskill: function (self, currentRate, forced = false, range = this.limit) {
            if (!forced && !getRandomBool(currentRate)) return false;
            const execute = () => {
                const targets = self.getTarget(range, config.targets);
                const damageRate = clacSkillAdditionRate(config.base, config.grow, self.Attrs.int);
                for (const target of targets) {
                    if (config.effect !== 'panic') target.beHurt(self, { type: 2, rate: damageRate }, this);
                    if (target.Arms <= 0) continue;
                    if (config.effect === 'rage' && !target.isRage()) {
                        target.State.rage = { rounds: 1, from: { hero: self, skill: this } };
                        target.StateFlag.rage = false;
                    } else if (config.effect === 'attackDown' || config.effect === 'attackIntelDown') {
                        const base = config.effect === 'attackDown' ? 10 : 45;
                        const reduction = clacSkillAdditionRate(base, base / 150, self.Attrs.int);
                        reduceAttributesTemporarily(target, self, this,
                            config.effect === 'attackDown' ? { atk: reduction } : { atk: reduction, int: reduction }, 2);
                    } else if (config.effect === 'burn') {
                        target.applyContinuousDamage('燃烧', self, this, damageRate, 1);
                    } else if (config.effect === 'panic') {
                        target.applyContinuousDamage('恐慌', self, this, damageRate, 2);
                    }
                }
            };
            if (forced || !config.ready) {
                self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
                execute();
                return true;
            }
            return self.addReadySkill(this, 1, execute);
        }
    }))
]
