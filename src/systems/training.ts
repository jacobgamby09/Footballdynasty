import { currentLeagueTier } from "../data/leagues";
import { seededNoise } from "../engine/matchEngineCore";
import { clamp } from "../utils";
import { getAttributeGrowthPressure, getAttributeXpRequirement, getBaseAttributeXpRequirement } from "./attributeXp";
import { getDynastyTrainingCeilingBonus, getDynastyTrainingFloorBonus } from "./dynastyUpgrades";
import { formatPercentDelta, formatSigned } from "./formatting";
import { getClubLeagueTier, getXpPercent } from "./ovr";
import { getCurrentFixture } from "./seasonState";
import { getSelectionReport } from "./selection";
import { applyRecoveryCeiling, applyRecoveryFloor, getAgentSigningBonusLeverage, getAgentWageLeverage, getAgingProfile, getConsistencyRatingFloor, getEliteConditioningCeilingBonus, getFocusSlot2Efficiency, getFocusSlot3Efficiency, getMarqueeBonus, getMatchActionRecoveryRelief, getRecoveryFitnessCeiling, getRecoveryFitnessFloor, getRecoverySessionBonus, getSponsorAppealBonus, getSupportLevel, getSupportTrackBreakthroughCount, getSupportTrackProgress, getSupportUpgradeCost, getSupportUpgradeLockReason, getTrainingFatigueRelief, getTrainingXpCeilingBonus, getTrainingXpFloorBonus, getWeeklySupportRecoveryBonus, isFocusSlot2Unlocked, isFocusSlot3Unlocked } from "./support";
import { supportUpgradeMap } from "../data/support";
import type { AttributeKey } from "../positionRoles";
import type { Attribute, AttributeLevelUp, DevelopmentEnvironment, GameState, Intensity, LeagueTier, SupportTrackDefinition, SupportTrackId, SupportUpgradeId, TrainingQuality, TrainingQualityProfile, TrainingSummary } from "../types";

export function getSupportInvestmentImpactLine(state: GameState, track: SupportTrackDefinition, upgradeId: SupportUpgradeId) {
  const currentLevel = getSupportLevel(state, upgradeId);
  const nextState = {
    ...state,
    supportUpgrades: {
      ...state.supportUpgrades,
      [upgradeId]: currentLevel + 1,
    },
  };
  if (upgradeId === "xpFloor") return "+1 XP floor";
  if (upgradeId === "xpCeiling") return "+1 XP ceiling";
  if (upgradeId === "focusSlot2Unlock") return currentLevel + 1 >= 5 ? "Unlock focus slot 2" : "Progress toward focus slot 2";
  if (upgradeId === "focusSlot2Efficiency") return "+1% slot 2 XP";
  if (upgradeId === "focusSlot3Unlock") return currentLevel + 1 >= 8 ? "Unlock focus slot 3" : "Progress toward focus slot 3";
  if (upgradeId === "focusSlot3Efficiency") return "+1% slot 3 XP";
  if (upgradeId === "trainingLoad") {
    const before = getTrainingFatigueRelief(currentLevel);
    const after = getTrainingFatigueRelief(currentLevel + 1);
    return after > before ? `+${after - before} training relief` : "Progress toward +1 training relief";
  }
  if (upgradeId === "matchRecovery") {
    const before = getMatchActionRecoveryRelief(currentLevel);
    const after = getMatchActionRecoveryRelief(currentLevel + 1);
    return after > before ? `+${after - before} match relief` : "Progress toward +1 match relief";
  }
  if (upgradeId === "recoveryBaseline") return "+1 baseline recovery level";
  if (upgradeId === "agentNegotiation") return "+1% wage, +2% signing";
  if (upgradeId === "sponsorshipAppeal") return "+2% sponsor payouts";

  return `${nextState.supportUpgrades[upgradeId] ?? 0} ${track.name} levels`;
}


export function getSupportTrackCurrentBonusLines(state: GameState, track: SupportTrackDefinition) {
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const breakthroughs = getSupportTrackBreakthroughCount(state, track.id);

  if (track.id === "training") {
    const floor = getTrainingXpFloorBonus(getSupportLevel(state, "xpFloor") * environment.supportEfficiency);
    const ceiling = getTrainingXpCeilingBonus(getSupportLevel(state, "xpCeiling") * environment.supportEfficiency);
    return [
      `${getTrainingFocusCapacity(state)} focus slot${getTrainingFocusCapacity(state) > 1 ? "s" : ""}`,
      `+${floor} XP floor`,
      `+${ceiling} XP ceiling`,
      `${Math.round(getFocusSlot2Efficiency(state) * 100)}% slot 2`,
    ];
  }

  if (track.id === "recovery") {
    const baselineLevel = getSupportLevel(state, "recoveryBaseline") * environment.supportEfficiency;
    const floor = getRecoveryFitnessFloor(baselineLevel, breakthroughs);
    const ceiling = getRecoveryFitnessCeiling(baselineLevel, breakthroughs);
    return [
      `+${getWeeklySupportRecoveryBonus(baselineLevel)} weekly recovery`,
      `+${getTrainingFatigueRelief(getSupportLevel(state, "trainingLoad") * environment.supportEfficiency)} training relief`,
      `+${getMatchActionRecoveryRelief(getSupportLevel(state, "matchRecovery") * environment.supportEfficiency)} match relief`,
      `${floor}-${ceiling} fitness band`,
    ];
  }

  if (track.id === "career") {
    const agentLevel = getSupportLevel(state, "agentNegotiation");
    const sponsorLevel = getSupportLevel(state, "sponsorshipAppeal");
    return [`+${formatPercentDelta(getAgentWageLeverage(agentLevel) * 100)} wage`, `+${formatPercentDelta(getAgentSigningBonusLeverage(agentLevel) * 100)} signing`, `+${formatPercentDelta(getSponsorAppealBonus(sponsorLevel) * 100)} sponsor`];
  }

  return ["No active bonus yet"];
}


// ── Beginner-friendly "Invest" views ─────────────────────────────────────────────────────────
// The Invest shop leads with the problem, the player's current number, the number after a purchase, and
// when the upgrade helps — all built from the REAL formulas above, never hardcoded. (Invest UX clarity pass)

export type InvestNowLine = { label: string; value: string };
export type InvestUpgradeView = {
  id: SupportUpgradeId;
  name: string;
  changeLabel: string;
  whenUseful: string;
  pendingNote?: string;
  cost: number;
  level: number;
  maxLevel: number;
  lockReason?: string;
  maxed: boolean;
};
export type InvestMilestoneView = { name: string; current: number; required: number; reward: string } | null;
export type InvestTrackView = {
  problem: string;
  nowLines: InvestNowLine[];
  upgrades: InvestUpgradeView[];
  milestone: InvestMilestoneView;
};

const INVEST_TRACK_PROBLEM: Record<SupportTrackId, string> = {
  training: "Grow your attributes faster every week.",
  recovery: "Stay fit so you can play more matches.",
  career: "Earn more from contracts and sponsors.",
  longevity: "Stay at your peak — and keep playing — for longer.",
  talent: "Raise how high this player can ever grow.",
  elite: "Status perks that polish a finished player.",
};

const INVEST_WHEN_USEFUL: Record<SupportUpgradeId, string> = {
  xpFloor: "Best if you hate weeks with tiny XP gains.",
  xpCeiling: "Best if you want bigger high-roll weeks.",
  focusSlot2Unlock: "Best to train two skills at once.",
  focusSlot2Efficiency: "Best once you lean on a second focus.",
  focusSlot3Unlock: "Best to train three skills at once.",
  focusSlot3Efficiency: "Best once you lean on a third focus.",
  trainingLoad: "Best if you train hard often.",
  matchRecovery: "Best if you play heavy minutes.",
  recoveryBaseline: "Best if you often start weeks tired.",
  agentNegotiation: "Best when negotiating your next contract.",
  sponsorshipAppeal: "Best once you have prestige for sponsor deals.",
  longevity: "Best if you want a long career past your prime.",
  potential: "Best mid-career to unlock more growth.",
  consistency: "Best to stop off-days tanking your rating.",
  eliteConditioning: "Best to stay fresh deep into seasons.",
  marquee: "Best to snowball fame and money.",
};

const INVEST_MILESTONE_REWARD: Record<SupportTrackId, string> = {
  training: "Unlocks an extra weekly training focus.",
  recovery: "Better recovery floor and ceiling.",
  career: "Stronger contract and sponsor leverage.",
  longevity: "Pushes your peak age and retirement later.",
  talent: "A higher growth ceiling on key skills.",
  elite: "Status recognition.",
};

// Smallest number of extra levels until a ROUNDED effect actually moves, so we can say "in N more upgrades"
// honestly instead of showing a no-op before/after.
function upgradesUntilEffectChange(level: number, effect: (lvl: number) => number, cap = 20): number {
  const base = effect(level);
  for (let step = 1; step <= cap; step += 1) {
    if (effect(level + step) !== base) return step;
  }
  return 0;
}

function projectedWeeklyXpRange(state: GameState): { min: number; max: number } | null {
  const ranges = getTrainingProjection(state).ranges;
  const keys = Object.keys(ranges) as AttributeKey[];
  if (keys.length === 0) {
    return null;
  }
  let min = 0;
  let max = 0;
  for (const key of keys) {
    min += ranges[key]?.min ?? 0;
    max += ranges[key]?.max ?? 0;
  }
  return { min, max };
}

function withSupportLevel(state: GameState, upgradeId: SupportUpgradeId, level: number): GameState {
  return { ...state, supportUpgrades: { ...state.supportUpgrades, [upgradeId]: level } };
}

// A representative "busy match" (~90', ~6 involvements) so Match recovery shows a real, moving fitness cost.
// Match recovery eases the ACTION fatigue (getMatchActionRecoveryRelief), never the pure minute load, so the
// number bottoms out at the minute floor — honest about what the upgrade can and can't do.
function representativeMatchFitnessCost(matchRecoveryEffectiveLevel: number): number {
  const relief = getMatchActionRecoveryRelief(matchRecoveryEffectiveLevel);
  const rawActionLoad = 6 * Math.min(0, -3 + relief);
  const scaledActionLoad = Math.round(rawActionLoad * 0.35);
  const minuteLoad = -5; // ~90 minutes: -round(90 / 18)
  return clamp(minuteLoad + scaledActionLoad, -12, 0);
}

export function getInvestTrackNowLines(state: GameState, track: SupportTrackDefinition): InvestNowLine[] {
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const breakthroughs = getSupportTrackBreakthroughCount(state, track.id);

  if (track.id === "training") {
    const range = projectedWeeklyXpRange(state);
    return [
      { label: "Weekly XP", value: range ? `${range.min}–${range.max}` : "Recovering" },
      { label: "Training focuses", value: `${getTrainingFocusCapacity(state)}` },
    ];
  }

  if (track.id === "recovery") {
    const hardCost = Math.min(0, -10 + getTrainingFatigueRelief(getSupportLevel(state, "trainingLoad") * environment.supportEfficiency));
    const matchCost = representativeMatchFitnessCost(getSupportLevel(state, "matchRecovery") * environment.supportEfficiency);
    const ceiling = getRecoveryFitnessCeiling(getSupportLevel(state, "recoveryBaseline") * environment.supportEfficiency, breakthroughs);
    return [
      { label: "Hard week", value: `costs ${-hardCost} fitness` },
      { label: "Busy match", value: `costs ~${-matchCost} fitness` },
      { label: "Weekly recovery", value: `up to ${ceiling}` },
    ];
  }

  if (track.id === "career") {
    return [
      { label: "Contract wage", value: `+${Math.round(getAgentWageLeverage(getSupportLevel(state, "agentNegotiation")) * 100)}%` },
      { label: "Signing bonus", value: `+${Math.round(getAgentSigningBonusLeverage(getSupportLevel(state, "agentNegotiation")) * 100)}%` },
      { label: "Sponsor income", value: `+${Math.round(getSponsorAppealBonus(getSupportLevel(state, "sponsorshipAppeal")) * 100)}%` },
    ];
  }

  if (track.id === "longevity") {
    const aging = getAgingProfile(state);
    return [
      { label: "Peak age", value: `${aging.peakAge}` },
      { label: "Can play until", value: `${aging.hardRetirementAge}` },
    ];
  }

  if (track.id === "talent") {
    const level = getSupportLevel(state, "potential");
    return [{ label: "Growth ceiling", value: level > 0 ? `+${level} on key skills` : "Not raised yet" }];
  }

  if (track.id === "elite") {
    return [
      { label: "Bad-game floor", value: `+${getConsistencyRatingFloor(state).toFixed(2)}` },
      { label: "Fitness ceiling", value: `+${getEliteConditioningCeilingBonus(state)}` },
      { label: "Name value", value: `+${Math.round(getMarqueeBonus(state) * 100)}%` },
    ];
  }

  return [];
}

export function getInvestUpgradeView(state: GameState, upgradeId: SupportUpgradeId): InvestUpgradeView {
  const upgrade = supportUpgradeMap[upgradeId];
  const level = getSupportLevel(state, upgradeId);
  const maxLevel = upgrade.maxLevel;
  const lockReason = getSupportUpgradeLockReason(state, upgrade);
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const base = {
    id: upgradeId,
    name: upgrade.name,
    whenUseful: INVEST_WHEN_USEFUL[upgradeId],
    cost: getSupportUpgradeCost(upgrade, level),
    level,
    maxLevel,
    lockReason,
    maxed: level >= maxLevel,
  };

  // Locked upgrades can't be previewed meaningfully — say what unlocks them and stop.
  if (lockReason) {
    return { ...base, changeLabel: `Unlocks with ${lockReason}` };
  }

  const plural = (n: number) => (n > 1 ? "s" : "");

  if (upgradeId === "xpFloor" || upgradeId === "xpCeiling") {
    const isFloor = upgradeId === "xpFloor";
    const noun = isFloor ? "Lowest weekly XP" : "Highest weekly XP";
    const before = projectedWeeklyXpRange(state);
    const after = projectedWeeklyXpRange(withSupportLevel(state, upgradeId, level + 1));
    if (before && after) {
      const b = isFloor ? before.min : before.max;
      const a = isFloor ? after.min : after.max;
      return a !== b
        ? { ...base, changeLabel: `${noun}: ${b} → ${a}` }
        : { ...base, changeLabel: `${noun}: ${b}`, pendingNote: "Builds up over a few levels." };
    }
    return { ...base, changeLabel: `Raises your ${isFloor ? "lowest" : "highest"} weekly XP` };
  }

  if (upgradeId === "focusSlot2Unlock" || upgradeId === "focusSlot3Unlock") {
    const which = upgradeId === "focusSlot2Unlock" ? "second" : "third";
    return {
      ...base,
      changeLabel: `Unlocks a ${which} weekly training focus`,
      pendingNote: base.maxed ? undefined : level + 1 >= maxLevel ? "Unlocks with this upgrade." : `Unlocks when full — ${level}/${maxLevel}.`,
    };
  }

  if (upgradeId === "focusSlot2Efficiency" || upgradeId === "focusSlot3Efficiency") {
    const slot = upgradeId === "focusSlot2Efficiency" ? "Second" : "Third";
    const eff = (lvl: number) =>
      Math.round(
        (upgradeId === "focusSlot2Efficiency"
          ? getFocusSlot2Efficiency(withSupportLevel(state, upgradeId, lvl))
          : getFocusSlot3Efficiency(withSupportLevel(state, upgradeId, lvl))) * 100,
      );
    const b = eff(level);
    const a = eff(level + 1);
    return a !== b
      ? { ...base, changeLabel: `${slot} focus power: ${b}% → ${a}%` }
      : { ...base, changeLabel: `${slot} focus power: ${b}%`, pendingNote: "Improves each level." };
  }

  if (upgradeId === "trainingLoad") {
    const eff = (lvl: number) => Math.min(0, -10 + getTrainingFatigueRelief(lvl * environment.supportEfficiency));
    const b = eff(level);
    const a = eff(level + 1);
    if (a !== b) {
      return { ...base, changeLabel: `Hard week: ${b} → ${a} fitness` };
    }
    const n = upgradesUntilEffectChange(level, eff);
    return { ...base, changeLabel: `Hard week: ${b} fitness`, pendingNote: n ? `Eases hard weeks in ${n} more upgrade${plural(n)}.` : "Already at the limit." };
  }

  if (upgradeId === "matchRecovery") {
    const eff = (lvl: number) => representativeMatchFitnessCost(lvl * environment.supportEfficiency);
    const b = eff(level);
    const a = eff(level + 1);
    if (a !== b) {
      return { ...base, changeLabel: `Busy match: ${b} → ${a} fitness` };
    }
    const n = upgradesUntilEffectChange(level, eff);
    return { ...base, changeLabel: `Busy match: ${b} fitness`, pendingNote: n ? `Eases match fatigue in ${n} more upgrade${plural(n)}.` : "Minute fatigue can't be removed." };
  }

  if (upgradeId === "recoveryBaseline") {
    const breakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
    const eff = (lvl: number) => getRecoveryFitnessCeiling(lvl * environment.supportEfficiency, breakthroughs);
    const b = eff(level);
    const a = eff(level + 1);
    if (a !== b) {
      return { ...base, changeLabel: `Weekly recovery cap: ${b} → ${a}` };
    }
    const n = upgradesUntilEffectChange(level, eff);
    return { ...base, changeLabel: `Weekly recovery cap: ${b}`, pendingNote: n ? `Raises the cap in ${n} more upgrade${plural(n)}.` : "At the cap." };
  }

  if (upgradeId === "agentNegotiation") {
    const wb = Math.round(getAgentWageLeverage(level) * 100);
    const wa = Math.round(getAgentWageLeverage(level + 1) * 100);
    const sb = Math.round(getAgentSigningBonusLeverage(level) * 100);
    const sa = Math.round(getAgentSigningBonusLeverage(level + 1) * 100);
    return { ...base, changeLabel: `Wage +${wb}→${wa}% · signing +${sb}→${sa}%` };
  }

  if (upgradeId === "sponsorshipAppeal") {
    const b = Math.round(getSponsorAppealBonus(level) * 100);
    const a = Math.round(getSponsorAppealBonus(level + 1) * 100);
    return { ...base, changeLabel: `Sponsor income: +${b}% → +${a}%` };
  }

  if (upgradeId === "longevity") {
    return { ...base, changeLabel: "Pushes peak age & retirement later", pendingNote: "Biggest gains arrive at each milestone." };
  }

  if (upgradeId === "potential") {
    return { ...base, changeLabel: "Key-skill ceiling: +1 potential each level" };
  }

  if (upgradeId === "consistency") {
    return { ...base, changeLabel: `Bad-game floor: +${getConsistencyRatingFloor(state).toFixed(2)} → +${((level + 1) * 0.08).toFixed(2)} rating` };
  }

  if (upgradeId === "eliteConditioning") {
    return { ...base, changeLabel: `Fitness ceiling: +${getEliteConditioningCeilingBonus(state)} → +${level + 1}` };
  }

  if (upgradeId === "marquee") {
    return { ...base, changeLabel: `Prestige & sponsor income: +${Math.round(getMarqueeBonus(state) * 100)}% → +${Math.round((level + 1) * 0.05 * 100)}%` };
  }

  return { ...base, changeLabel: upgrade.effect };
}

export function getInvestMilestone(state: GameState, track: SupportTrackDefinition): InvestMilestoneView {
  const progress = getSupportTrackProgress(state, track);
  if (progress.maxed) {
    return null;
  }
  return { name: progress.nextName, current: progress.current, required: progress.required, reward: INVEST_MILESTONE_REWARD[track.id] };
}

export function getInvestTrackView(state: GameState, track: SupportTrackDefinition): InvestTrackView {
  return {
    problem: INVEST_TRACK_PROBLEM[track.id],
    nowLines: getInvestTrackNowLines(state, track),
    upgrades: track.upgradeIds.map((upgradeId) => getInvestUpgradeView(state, upgradeId)),
    milestone: getInvestMilestone(state, track),
  };
}


export function applyTrainingWeek(state: GameState): GameState {
  const projection = getTrainingProjection(state);
  const rolledXp = rollTrainingXp(state, projection.ranges, createTrainingSeed(state));
  const combinedXp = rolledXp;
  const selectionBefore = getSelectionReport(state, getCurrentFixture(state.season)).score;
  const attributeResult = addAttributeXpDetailed(state.attributes, combinedXp);
  const fitness = getProjectedTrainingFitness(state, projection.fitnessDelta);
  const actualFitnessDelta = fitness - state.fitness;
  const morale = clamp(state.morale + projection.moraleDelta, 0, 100);
  const trust = clamp(state.trust + projection.trustDelta, 0, 100);
  const nextStateForSelection = {
    ...state,
    fitness,
    morale,
    trust,
    attributes: attributeResult.attributes,
  };
  const selectionAfter = getSelectionReport(nextStateForSelection, getCurrentFixture(state.season)).score;
  const summary: TrainingSummary = {
    week: state.week,
    focuses: getCurrentTrainingFocuses(state),
    intensity: state.intensity,
    quality: projection.quality,
    qualityLabel: projection.qualityLabel,
    ranges: projection.ranges,
    xp: combinedXp,
    fitnessDelta: actualFitnessDelta,
    moraleDelta: projection.moraleDelta,
    trustDelta: projection.trustDelta,
    selectionBefore,
    selectionAfter,
    levelUps: attributeResult.levelUps,
  };

  return {
    ...state,
    trainingCompletedWeek: state.week,
    fitness,
    morale,
    trust,
    attributes: attributeResult.attributes,
    selectedFocus: getCurrentTrainingFocuses(state)[0],
    lastTraining: summary,
    lastEvent: getTrainingSummaryText(summary),
  };
}


export function getTrainingSummaryText(summary: TrainingSummary) {
  const topXp = Object.entries(summary.xp).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0];
  if (!topXp) {
    return `Recovery session complete: fitness ${formatSigned(summary.fitnessDelta)}.`;
  }

  const levelText = summary.levelUps.length > 0 ? `${summary.levelUps.length} level-up.` : "No level-up yet.";
  return `Training complete: ${topXp?.[0] ?? "Attributes"} +${topXp?.[1] ?? 0} XP. ${levelText}`;
}


export function mergeAttributeXp(...xpSources: Partial<Record<AttributeKey, number>>[]) {
  return xpSources.reduce<Partial<Record<AttributeKey, number>>>((merged, source) => {
    Object.entries(source).forEach(([key, value]) => {
      const attribute = key as AttributeKey;
      merged[attribute] = (merged[attribute] ?? 0) + (value ?? 0);
    });
    return merged;
  }, {});
}


export function addAttributeXp(
  attributes: Attribute[],
  xpGain: Partial<Record<AttributeKey, number>>,
): Attribute[] {
  return addAttributeXpDetailed(attributes, xpGain).attributes;
}


export function addAttributeXpDetailed(
  attributes: Attribute[],
  xpGain: Partial<Record<AttributeKey, number>>,
): { attributes: Attribute[]; levelUps: AttributeLevelUp[] } {
  const levelUps: AttributeLevelUp[] = [];
  const nextAttributes = attributes.map((attribute) => {
    const gain = xpGain[attribute.label] ?? 0;
    if (gain <= 0 || attribute.value >= 100) {
      return attribute;
    }

    let nextValue = attribute.value;
    let remainingXp = attribute.xp + gain;

    while (nextValue < 100) {
      const xpRequirement = getAttributeXpRequirement({ ...attribute, value: nextValue });
      if (remainingXp < xpRequirement) {
        break;
      }

      remainingXp -= xpRequirement;
      nextValue += 1;
    }

    if (nextValue > attribute.value) {
      levelUps.push({
        attribute: attribute.label,
        before: attribute.value,
        after: nextValue,
      });
    }

    return {
      ...attribute,
      value: nextValue,
      xp: nextValue >= 100 ? 0 : remainingXp,
    };
  });

  return { attributes: nextAttributes, levelUps };
}


export function getTrainingProjection(state: GameState) {
  const intensity = getIntensityProfile(state.intensity);
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const qualityProfile = getTrainingQualityProfile(state, createTrainingSeed(state), environment);
  const xpFloorLevel = getSupportLevel(state, "xpFloor");
  const xpCeilingLevel = getSupportLevel(state, "xpCeiling");
  const trainingLoadLevel = getSupportLevel(state, "trainingLoad");
  const recoveryBaselineLevel = getSupportLevel(state, "recoveryBaseline");
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
  const effectiveXpFloorLevel = xpFloorLevel * environment.supportEfficiency;
  const effectiveXpCeilingLevel = xpCeilingLevel * environment.supportEfficiency;
  const effectiveTrainingLoadLevel = trainingLoadLevel * environment.supportEfficiency;
  const effectiveRecoveryBaselineLevel = recoveryBaselineLevel * environment.supportEfficiency;
  const dynastyXpFloorBonus = getDynastyTrainingFloorBonus(state.dynasty);
  const dynastyXpCeilingBonus = getDynastyTrainingCeilingBonus(state.dynasty);
  const ranges: Partial<Record<AttributeKey, { min: number; max: number }>> = {};

  if (state.fitness < 20) {
    return {
      ranges,
      quality: "Poor" as TrainingQuality,
      qualityLabel: "Recovery session",
      qualityProfile: getTrainingQualityProfileByQuality("Poor"),
      fitnessDelta: 12 + environment.recoveryBonus + getRecoverySessionBonus(effectiveRecoveryBaselineLevel),
      moraleDelta: 1,
      trustDelta: -1,
    };
  }

  getCurrentTrainingFocuses(state).forEach((focus, index) => {
    const baseRange = getBaseTrainingRange(state, focus);
    const focusWeight = getTrainingFocusWeight(state, index);
    const clubContextMultiplier = state.freeAgent ? 0.55 : 1;
    ranges[focus] = {
      min: Math.max(
        1,
        Math.round(
          (baseRange.min * intensity.xpFloor + environment.xpFloorBonus + getTrainingXpFloorBonus(effectiveXpFloorLevel) + dynastyXpFloorBonus) *
            focusWeight *
            environment.xpMultiplier *
            qualityProfile.xpMultiplier *
            clubContextMultiplier,
        ),
      ),
      max: Math.max(
        1,
        Math.round(
          (baseRange.max * intensity.xpCeiling + environment.xpFloorBonus + getTrainingXpCeilingBonus(effectiveXpCeilingLevel) + dynastyXpCeilingBonus) *
            focusWeight *
            environment.xpMultiplier *
            qualityProfile.xpMultiplier *
            clubContextMultiplier,
        ),
      ),
    };
  });

  const rawFitnessDelta =
    intensity.fitnessDelta < 0
      ? Math.min(0, intensity.fitnessDelta + getTrainingFatigueRelief(effectiveTrainingLoadLevel))
      : intensity.fitnessDelta + environment.recoveryBonus;

  return {
    ranges,
    quality: qualityProfile.quality,
    qualityLabel: state.freeAgent ? `Solo ${qualityProfile.label.toLowerCase()}` : qualityProfile.label,
    qualityProfile,
    fitnessDelta: getProjectedTrainingFitness(state, rawFitnessDelta) - state.fitness,
    moraleDelta: intensity.moraleDelta,
    trustDelta: intensity.trustDelta,
  };
}


export function getDevelopmentEnvironment(tier: LeagueTier): DevelopmentEnvironment {
  const level = tier.facilityLevel;
  return {
    label: tier.name,
    facilityLevel: level,
    xpMultiplier: 1 + (level - 1) * 0.2,
    xpFloorBonus: (level - 1) * 6,
    recoveryBonus: level >= 4 ? 2 : level >= 2 ? 1 : 0,
    supportEfficiency: 1 + (level - 1) * 0.1,
  };
}


function getProjectedTrainingFitness(state: GameState, fitnessDelta: number) {
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
  const baselineLevel = getSupportLevel(state, "recoveryBaseline") * environment.supportEfficiency;
  const projectedFitness = clamp(state.fitness + fitnessDelta, 0, 100);
  const floor = getRecoveryFitnessFloor(baselineLevel, recoveryBreakthroughs);
  const ceiling = getRecoveryFitnessCeiling(baselineLevel, recoveryBreakthroughs);

  return applyRecoveryCeiling(state.fitness, applyRecoveryFloor(state.fitness, projectedFitness, floor), ceiling);
}


export function getTrainingQualityProfile(state: GameState, seed: string, environment = getDevelopmentEnvironment(currentLeagueTier)): TrainingQualityProfile {
  const trainingLoadLevel = getSupportLevel(state, "trainingLoad");
  const recoveryBaselineLevel = getSupportLevel(state, "recoveryBaseline");
  const trainingBreakthroughs = getSupportTrackBreakthroughCount(state, "training");
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
  const readinessScore =
    state.fitness * 0.42 +
    state.morale * 0.18 +
    (100 - state.pressure) * 0.12 +
    environment.facilityLevel * 5 +
    trainingLoadLevel * 0.35 +
    recoveryBaselineLevel * 0.3 +
    trainingBreakthroughs * 5 +
    recoveryBreakthroughs * 1.5 +
    (state.intensity === "Hard" ? -6 : state.intensity === "Light" ? 4 : 0);
  const roll = seededNoise(`${seed}-quality`);
  const qualityScore = readinessScore + Math.round(roll * 34) - 17;

  if (qualityScore >= 88) {
    return getTrainingQualityProfileByQuality("Breakthrough");
  }
  if (qualityScore >= 68) {
    return getTrainingQualityProfileByQuality("Sharp");
  }
  if (qualityScore >= 42) {
    return getTrainingQualityProfileByQuality("Solid");
  }
  return getTrainingQualityProfileByQuality("Poor");
}


export function getTrainingQualityProfileByQuality(quality: TrainingQuality): TrainingQualityProfile {
  const profiles: Record<TrainingQuality, TrainingQualityProfile> = {
    Poor: {
      quality: "Poor",
      xpMultiplier: 0.72,
      label: "Poor session",
      description: "Low fitness limited the work.",
    },
    Solid: {
      quality: "Solid",
      xpMultiplier: 1,
      label: "Solid session",
      description: "A normal development week.",
    },
    Sharp: {
      quality: "Sharp",
      xpMultiplier: 1.18,
      label: "Sharp session",
      description: "Good fitness lifted the session.",
    },
    Breakthrough: {
      quality: "Breakthrough",
      xpMultiplier: 1.42,
      label: "Breakthrough session",
      description: "Everything clicked in training.",
    },
  };

  return profiles[quality];
}


export function getCurrentTrainingFocuses(state: GameState): AttributeKey[] {
  const capacity = getTrainingFocusCapacity(state);
  const uniqueFocuses = Array.from(new Set(state.trainingFocuses.length > 0 ? state.trainingFocuses : ["Finishing"]));
  return uniqueFocuses.slice(0, capacity) as AttributeKey[];
}


export function getTrainingFocusCapacity(state: Pick<GameState, "supportUpgrades">) {
  if (isFocusSlot3Unlocked(state)) {
    return 3;
  }
  if (isFocusSlot2Unlocked(state)) {
    return 2;
  }
  return 1;
}


export function getTrainingFocusWeight(state: Pick<GameState, "supportUpgrades">, index: number) {
  if (index === 0) {
    return 1;
  }
  if (index === 1) {
    return getFocusSlot2Efficiency(state);
  }
  return getFocusSlot3Efficiency(state);
}


export function getTrainingFocusUnlockLabel(state: Pick<GameState, "supportUpgrades">) {
  const capacity = getTrainingFocusCapacity(state);
  if (capacity >= 3) {
    return "3 focus slots";
  }
  if (capacity >= 2) {
    return "2 focus slots";
  }
  return "1 focus slot";
}


export function getBaseTrainingRange(_state: GameState, _focus: AttributeKey) {
  return { min: 16, max: 78 };
}


export function getIntensityProfile(intensity: Intensity) {
  const profiles: Record<
    Intensity,
    { xpFloor: number; xpCeiling: number; fitnessDelta: number; moraleDelta: number; trustDelta: number }
  > = {
    Light: { xpFloor: 0.75, xpCeiling: 0.75, fitnessDelta: 4, moraleDelta: 1, trustDelta: 0 },
    Balanced: { xpFloor: 1, xpCeiling: 1, fitnessDelta: -4, moraleDelta: 0, trustDelta: 1 },
    Hard: { xpFloor: 1.25, xpCeiling: 1.25, fitnessDelta: -10, moraleDelta: -1, trustDelta: 2 },
  };

  return profiles[intensity];
}


export function rollTrainingXp(
  state: GameState,
  ranges: Partial<Record<AttributeKey, { min: number; max: number }>>,
  trainingSeed: string,
): Partial<Record<AttributeKey, number>> {
  const xp: Partial<Record<AttributeKey, number>> = {};

  Object.entries(ranges).forEach(([focus, range]) => {
    const roll = seededNoise(`${trainingSeed}-${focus}`);
    xp[focus as AttributeKey] = Math.round(range.min + roll * (range.max - range.min));
  });

  return xp;
}


export function createTrainingSeed(state: GameState) {
  return [
    "training",
    state.club.clubId ?? state.club.shortCode,
    state.world?.seasonNumber ?? state.season.season,
    state.season.season,
    state.week,
    state.trainingCompletedWeek,
    state.trainingFocuses.join(","),
    state.intensity,
    state.fitness,
    state.trust,
  ].join("-");
}


export function getAttributeGrowthDetail(state: GameState, attribute: Attribute) {
  const projection = getTrainingProjection(state);
  const range = projection.ranges[attribute.label];
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const pressure = getAttributeGrowthPressure(attribute);
  const baseRequirement = getBaseAttributeXpRequirement(attribute.value);
  const requirement = getAttributeXpRequirement(attribute);
  const currentFocuses = getCurrentTrainingFocuses(state);
  const focusIndex = currentFocuses.indexOf(attribute.label);
  const isSelected = focusIndex >= 0;
  const modifiers = [
    `Facilities x${environment.xpMultiplier.toFixed(2)}`,
    `Facility floor +${environment.xpFloorBonus}`,
    `XP floor +${getTrainingXpFloorBonus(getSupportLevel(state, "xpFloor") * environment.supportEfficiency)}`,
    `XP ceiling +${getTrainingXpCeilingBonus(getSupportLevel(state, "xpCeiling") * environment.supportEfficiency)}`,
    `Dynasty floor +${getDynastyTrainingFloorBonus(state.dynasty)}`,
    `Dynasty ceiling +${getDynastyTrainingCeilingBonus(state.dynasty)}`,
  ];

  if (focusIndex === 1) {
    modifiers.push(`Slot 2 efficiency ${Math.round(getFocusSlot2Efficiency(state) * 100)}%`);
  }
  if (focusIndex === 2) {
    modifiers.push(`Slot 3 efficiency ${Math.round(getFocusSlot3Efficiency(state) * 100)}%`);
  }

  if (getSupportTrackBreakthroughCount(state, "training") > 0) {
    modifiers.push(`Training breakthroughs +${getSupportTrackBreakthroughCount(state, "training")}`);
  }

  return {
    pressure,
    baseRequirement,
    requirement,
    progress: getXpPercent(attribute.xp, requirement),
    xpToNext: Math.max(0, requirement - attribute.xp),
    isSelected,
    trainingRange: range ? `${range.min}-${range.max} XP` : "Not focused",
    modifiers,
    improvementTips: [
      "Train this stat",
      "Improve Training setup",
      "Move to better facilities",
      "Build dynasty growth upgrades",
    ],
  };
}

