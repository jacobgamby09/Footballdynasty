import { currentLeagueTier } from "../data/leagues";
import { seededNoise } from "../engine/matchEngineCore";
import { clamp } from "../utils";
import { getAttributeGrowthPressure, getAttributeXpRequirement, getBaseAttributeXpRequirement } from "./attributeXp";
import { getDynastyTrainingCeilingBonus, getDynastyTrainingFloorBonus } from "./dynastyUpgrades";
import { formatPercentDelta, formatSigned } from "./formatting";
import { getClubLeagueTier, getXpPercent } from "./ovr";
import { getCurrentFixture } from "./seasonState";
import { getSelectionReport } from "./selection";
import { applyRecoveryCeiling, applyRecoveryFloor, getAgentSigningBonusLeverage, getAgentWageLeverage, getFocusSlot2Efficiency, getFocusSlot3Efficiency, getMatchActionRecoveryRelief, getRecoveryFitnessCeiling, getRecoveryFitnessFloor, getRecoverySessionBonus, getSponsorAppealBonus, getSupportLevel, getSupportTrackBreakthroughCount, getTrainingFatigueRelief, getTrainingXpCeilingBonus, getTrainingXpFloorBonus, getWeeklySupportRecoveryBonus, isFocusSlot2Unlocked, isFocusSlot3Unlocked } from "./support";
import type { AttributeKey } from "../positionRoles";
import type { Attribute, AttributeLevelUp, DevelopmentEnvironment, GameState, Intensity, LeagueTier, SupportTrackDefinition, SupportUpgradeId, TrainingQuality, TrainingQualityProfile, TrainingSummary } from "../types";

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
    ranges[focus] = {
      min: Math.max(
        1,
        Math.round(
          (baseRange.min * intensity.xpFloor + environment.xpFloorBonus + getTrainingXpFloorBonus(effectiveXpFloorLevel) + dynastyXpFloorBonus) *
            focusWeight *
            environment.xpMultiplier *
            qualityProfile.xpMultiplier,
        ),
      ),
      max: Math.max(
        1,
        Math.round(
          (baseRange.max * intensity.xpCeiling + environment.xpFloorBonus + getTrainingXpCeilingBonus(effectiveXpCeilingLevel) + dynastyXpCeilingBonus) *
            focusWeight *
            environment.xpMultiplier *
            qualityProfile.xpMultiplier,
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
    qualityLabel: qualityProfile.label,
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

  return applyRecoveryCeiling(applyRecoveryFloor(state.fitness, projectedFitness, floor), ceiling);
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
      description: "Low readiness limited the work.",
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
      description: "Good readiness lifted the session.",
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

