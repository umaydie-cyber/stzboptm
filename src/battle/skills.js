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
    const tag = target.addHook('回合开始时', `${skill.name}属性恢复${target.Storage.attributeReductionId}`, () => {
        if (target.Manger.Round < expiresRound) return;
        for (const [attribute, reduction] of Object.entries(values)) target.Attrs[attribute] += reduction;
        target.clearHook('回合开始时', tag);
    }, skill, source, 'debuff');
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
        name: "血践黄砂",
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
                self.Manger.Record.pushRecord(self, '的战法【血践黄砂】生效');
                // 使自身无法发动主动战法 持续到战斗结束
                self.State.activeLimit.rounds = -1
                self.State.activeLimit.from = {
                    hero: self,
                    skille: this
                }
                self.Manger.Record.pushRecord(self, '的无法发动主动战法效果已施加', 1);
                // 增加攻击伤害120%
                self.State.attackDamageAdd.passive = {
                    value: 120,
                    rounds: -1
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
                    rounds: 3, //因为效果的持续回合数在行动前递减+是指挥技能 所以给4回合才能实际生效3次 || ... 突然又正常了 不用给4回合了 ？？？ 有点懵逼 貌似是之前把先手效果改成持续到多少回合 而不是每回合开始减少持续回合了 ... 
                    from: {
                        hero: self,
                        skill: this
                    }
                }
                manger.Record.pushRecord(self, '的先手(预备)效果已施加', 1);

                self.Attrs.atk += 30
                manger.Record.pushRecord(self, `[${self.Name}] 的攻击属性提高了30(${self.Attrs.atk})`, 1);

                self.State.doubleAttack = {
                    rounds: 3,
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
        callskill: function (self) {
            if (getRandomBool(this.rate)) {
                self.Manger.Record.pushRecord(self, '发动【忠克猛烈】')
                // 战法攻击效果
                let target = self.getTarget(4, 1);
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
                    self.Manger.Record.pushActionRecord(self, target[0], '的【忠克猛烈】使', '陷入犹豫1回合');
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
        desc: "1回合准备，使敌军群体陷入混乱状态，持续2回合",
        level: "S",
        type: 2,
        target: 2,
        target_type: "enemy",
        limit: 4,
        rate: 35,
        study: true,
        callskill: function (self) {
            // 准备型战法先创建子技能方法 然后提交在准备战法效果执行堆里
            if (getRandomBool(this.rate)) {
                let subskill = () => {
                    // 先获取目标
                    let targets = self.getTarget(this.limit, this.target);

                    targets.forEach(target => {
                        if (!target.isConfusion()) {
                            target.State.confusion = {
                                rounds: 2,
                                from: this
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

                    // 添加一个在受伤前触发的 50%规避效果的子技能 触发后移除该子技能

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
                    self.Manger.Record.pushActionRecord(self, enemy, `的【${this.name}】使`, '陷入犹豫1回合', 1);
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
        target: 2,
        target_type: "enemy",
        limit: 5,
        rate: "--",
        study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, '发动【白衣渡江】')

            let enemy = self.getTarget(5, 2);

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
                    rate: value
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
        desc: "1回合准备，使敌军群体陷入混乱状态，持续2回合", //描述
        level: "S", //战法级别
        type: 2, //战法类型 1=指挥 2=主动 3=追击 4=被动
        target: 3, //目标数量
        target_type: "enemy", //作用目标
        limit: 5, //战法距离
        rate: 30, //战法发动率
        study: true, //战法是否可学习
        callskill: function (self) {
            // 准备型战法先创建子技能方法 然后添加在准备战法效果执行堆里
            if (getRandomBool(this.rate)) {
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
        desc: "1回合准备，使我军单体恢复4次兵力（恢复率151.0%，受谋略属性影响），每次目标独立判定", //描述
        level: "S", //战法级别
        type: 2, //战法类型 1=指挥 2=主动 3=追击 4=被动
        target: 1, //目标数量
        target_type: "team", //作用目标
        limit: 3, //战法距离
        rate: 45, //战法发动率
        study: true, //战法是否可学习
        callskill: function (self) {
            let revocerRate = 151;
            let revocerRateAdd = 1.575;

            if (getRandomBool(this.rate)) {
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
        desc: "1回合准备，对敌军全体发动策略攻击（伤害率111.0%，受谋略属性影响），并使其在受到下一次伤害时，会额外引发一次燃烧（伤害率221.0%，受谋略属性影响）", //描述
        level: "S", //战法级别
        type: 2, //战法类型 1=指挥 2=主动 3=追击 4=被动
        target: 3, //目标数量
        target_type: "enemy", //作用目标
        limit: 5, //战法距离
        rate: 40, //战法发动率
        study: false, //战法是否可学习
        callskill: function (self) {
            // 准备型战法先创建子技能方法 然后添加在准备战法效果执行堆里
            let mainDamage = 111;
            let mainDamageAdd = 0.95;
            let fireDamage = 221;
            let fireDamageAdd = 2.45;

            if (getRandomBool(this.rate)) {
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
                            rate: value2
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
            target.StateFlag.confusion = false;
            self.Manger.Record.pushActionRecord(self, target, `的【${this.name}】使`, '陷入混乱1回合', 1);
        }
    },
    {
        id: 1039,
        name: "乘胜追击",
        desc: "普通攻击后，对攻击目标发动一次攻击（伤害率150.0%）；每次发动攻击后有60.0%概率再次攻击（伤害率100.0%），此概率每次降低20个百分点，战法结束后重置",
        level: "S", type: 3, target: 1, target_type: "enemy", limit: 0, rate: 35, study: true,
        callskill: function (self, target) {
            self.Manger.Record.pushRecord(self, `的攻击发动【${this.name}】`);
            target.beHurt(self, { type: 1, rate: 150 }, this);
            // 每次发动独立计算；追加攻击只对仍存活的原目标生效。
            for (let chance = 60; chance > 0 && target.Arms > 0; chance -= 20) {
                if (!getRandomBool(chance)) break;
                self.Manger.Record.pushRecord(self, `的【${this.name}】追加攻击发动（${chance}%）`, 1);
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
                const tag = target.addHook('回合开始时', '落石防御恢复', () => {
                    if (!effect.restored && self.Manger.Round >= expires) {
                        target.Attrs.def += reduction;
                        effect.restored = true;
                        target.clearHook('回合开始时', tag);
                    }
                }, this, self);
                self.Manger.Record.pushRecord(target, `防御降低${reduction}，持续1回合`, 1);
            });
            return true;
        }
    },
    {
        id: 1047, name: "绝水遏敌",
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
        desc: "为我军兵力最低的单体恢复2次兵力（恢复率225.0%，受谋略属性影响），每次目标独立判定；随后随机发动落雷、落石、绝水遏敌之一，恢复时有30.0%几率额外发动；同回合三种均发动后敌军全体士气降低20.0",
        level: "S", type: 2, target: 1, target_type: "team", limit: 5, rate: 45, study: false,
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
                const before = target.Arms;
                // 隐藏成长未测定；1.472 是待实现记录中基于单次回血观测的条件估计。
                target.revocer(calcRecover(self, 225, 1.472, 2), self, this.name);
                if (target.Arms > before && getRandomBool(self.getRealSkillRate(clacSkillAdditionRate(30, 0.07, self.Attrs.int)))) cast();
            }
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
                    self.Manger.Record.pushActionRecord(attacker, neighbor, `的【其徐如林】因【${sourceSkill?.name || '策略伤害'}】命中【${target.Name}】对`, '造成策略分兵伤害');
                    neighbor.beHurt(attacker, { type: 2, rate: damageInfo.rate * ratio, isStrategySplash: true }, this);
                }
            }, this, self));
        }
    },
    {
        id: 1050, name: "锦车持节",
        desc: "每回合开始前有50.0%几率使敌军单体本回合造成所有伤害大幅降低，或进入暴走状态且攻击距离与主动战法距离-2；触发后于回合结束时恢复我军兵力最低单体（恢复率150.0%，受谋略属性影响）",
        level: "S", type: 1, target: 1, target_type: "enemy", limit: 5, rate: "--", study: false,
        callskill: function (self) {
            self.Manger.Record.pushRecord(self, `发动【${this.name}】`);
            self.addHook('回合开始时', '锦车持节判定', () => {
                if (self.Manger.Round < 1 || !getRandomBool(self.getRealSkillRate(50))) return;
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
                } else {
                    target.State.rage = { rounds: 1, from: { hero: self, skill: this.id } };
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
                    target.addHook('回合结束时', '锦车持节恢复距离', () => {
                        if (target.Manger.Round !== round) return;
                        target.Limit = originalLimit;
                        for (const [id, original, reduced] of skills) {
                            if (target.Skills[id] === reduced) target.Skills[id] = original;
                        }
                        target.State.rage.rounds = 0;
                    }, this, self, 'debuff');
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
        rate: config.rate, study: true,
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
