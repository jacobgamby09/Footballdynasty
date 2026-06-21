import { currentLeagueTier } from "../data/leagues";
import { trainingSpecialistMap } from "../data/support";
import { seededNoise } from "../engine/matchEngineCore";
import { getPositionModule } from "../positionRoles";
import { clamp } from "../utils";
import { getAttributeGrowthPressure, getAttributeXpRequirement, getBaseAttributeXpRequirement } from "./attributeXp";
import { formatPercentDelta, formatSigned } from "./formatting";
import { getAttributeValue, getClubLeagueTier, getXpPercent } from "./ovr";
import { getCurrentFixture } from "./seasonState";
import { getSelectionReport } from "./selection";
import { applyRecoveryCeiling, applyRecoveryFloor, getBootsActionBoost, getLifestylePressureRelief, getMatchActionRecoveryRelief, getRecoveryBreakthroughRelief, getRecoveryFitnessCeiling, getRecoveryFitnessFloor, getRecoverySessionBonus, getSupportLevel, getSupportTrackBreakthroughCount, getTrainingFatigueRelief, getTrainingXpCeilingBonus, getTrainingXpFloorBonus, getWeeklySupportRecoveryBonus } from "./support";
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
  const beforeBreakthroughs = getSupportTrackBreakthroughCount(state, track.id);
  const afterBreakthroughs = getSupportTrackBreakthroughCount(nextState, track.id);
  const breakthroughDelta = afterBreakthroughs - beforeBreakthroughs;

  if (upgradeId === "coach") {
    const beforeCapacity = getTrainingFocusCapacity(state);
    const afterCapacity = getTrainingFocusCapacity(nextState);
    if (afterCapacity > beforeCapacity) {
      return `Unlock ${afterCapacity} training focus slots`;
    }
    const beforeFloor = getTrainingXpFloorBonus(currentLevel) + beforeBreakthroughs * 8;
    const afterFloor = getTrainingXpFloorBonus(currentLevel + 1) + afterBreakthroughs * 8;
    const beforeCeiling = getTrainingXpCeilingBonus(currentLevel) + beforeBreakthroughs * 12;
    const afterCeiling = getTrainingXpCeilingBonus(currentLevel + 1) + afterBreakthroughs * 12;
    return `+${afterFloor - beforeFloor} XP floor, +${afterCeiling - beforeCeiling} XP ceiling`;
  }

  if (upgradeId === "nutrition") {
    const delta = getTrainingFatigueRelief(currentLevel + 1) - getTrainingFatigueRelief(currentLevel);
    return delta > 0 ? `+${delta} training fatigue relief` : "Progress toward +1 training fatigue relief";
  }

  if (upgradeId === "recovery") {
    const before = getMatchActionRecoveryRelief(currentLevel) + getRecoveryBreakthroughRelief(beforeBreakthroughs);
    const after = getMatchActionRecoveryRelief(currentLevel + 1) + getRecoveryBreakthroughRelief(afterBreakthroughs);
    return after > before ? `+${after - before} match fatigue relief` : "Progress toward +1 match fatigue relief";
  }

  if (upgradeId === "boots") {
    const before = getBootsActionBoost(currentLevel);
    const after = getBootsActionBoost(currentLevel + 1);
    return after > before ? `+${after - before} action attribute boost` : "Progress toward +1 action attribute boost";
  }

  if (upgradeId === "analyst") {
    const selectionDelta = 2 + breakthroughDelta * 2;
    return `+${selectionDelta} selection score support`;
  }

  if (upgradeId === "agent") {
    const wageDelta = 4 + breakthroughDelta * 3.5;
    const signingDelta = 8 + breakthroughDelta * 6;
    return `+${formatPercentDelta(wageDelta)} wage, +${formatPercentDelta(signingDelta)} signing bonus`;
  }

  if (upgradeId === "lifestyle") {
    const before = getLifestylePressureRelief(currentLevel, beforeBreakthroughs);
    const after = getLifestylePressureRelief(currentLevel + 1, afterBreakthroughs);
    return after > before ? `-${after - before} weekly pressure` : "Progress toward -1 weekly pressure";
  }

  return "Small support improvement";
}


export function getSupportTrackCurrentBonusLines(state: GameState, track: SupportTrackDefinition) {
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const breakthroughs = getSupportTrackBreakthroughCount(state, track.id);

  if (track.id === "training") {
    const coachLevel = getSupportLevel(state, "coach") * environment.supportEfficiency;
    const floor = getTrainingXpFloorBonus(coachLevel) + breakthroughs * 8;
    const ceiling = getTrainingXpCeilingBonus(coachLevel) + breakthroughs * 12;
    const specialist = getSpecialistBaseXpBonus(state, environment);
    return [`${getTrainingFocusCapacity(state)} focus slot${getTrainingFocusCapacity(state) > 1 ? "s" : ""}`, `+${floor} XP floor`, `+${ceiling} XP ceiling`, `+${specialist} specialist XP`];
  }

  if (track.id === "recovery") {
    const recoveryLevel = getSupportLevel(state, "recovery") * environment.supportEfficiency;
    const nutritionLevel = getSupportLevel(state, "nutrition") * environment.supportEfficiency;
    const floor = getRecoveryFitnessFloor(recoveryLevel, nutritionLevel, breakthroughs);
    const ceiling = getRecoveryFitnessCeiling(recoveryLevel, nutritionLevel, breakthroughs);
    return [
      `+${getWeeklySupportRecoveryBonus(recoveryLevel, nutritionLevel)} weekly recovery`,
      `+${getTrainingFatigueRelief(nutritionLevel)} training relief`,
      `+${getMatchActionRecoveryRelief(recoveryLevel) + getRecoveryBreakthroughRelief(breakthroughs)} match relief`,
      `${floor}-${ceiling} fitness band`,
    ];
  }

  if (track.id === "performance") {
    const analystSupport = getSupportLevel(state, "analyst") * 2 + breakthroughs * 2;
    return [`+${getBootsActionBoost(getSupportLevel(state, "boots"))} action attributes`, `+${analystSupport} selection score`];
  }

  if (track.id === "career") {
    const agentLevel = getSupportLevel(state, "agent");
    return [`+${formatPercentDelta(agentLevel * 4 + breakthroughs * 3.5)} wage`, `+${formatPercentDelta(agentLevel * 8 + breakthroughs * 6)} signing bonus`];
  }

  if (track.id === "lifestyle") {
    return [`-${getLifestylePressureRelief(getSupportLevel(state, "lifestyle"), breakthroughs)} weekly pressure`, "Sponsor-ready later"];
  }

  return ["No active bonus yet"];
}


export function applyTrainingWeek(state: GameState): GameState {
  const projection = getTrainingProjection(state);
  const rolledXp = rollTrainingXp(state, projection.ranges, createTrainingSeed(state));
  const combinedXp = mergeAttributeXp(rolledXp, projection.specialistXp);
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
    specialist: state.trainingSpecialist,
    quality: projection.quality,
    qualityLabel: projection.qualityLabel,
    specialistXp: projection.specialistXp,
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
  const coachLevel = getSupportLevel(state, "coach");
  const nutritionLevel = getSupportLevel(state, "nutrition");
  const recoveryLevel = getSupportLevel(state, "recovery");
  const trainingBreakthroughs = getSupportTrackBreakthroughCount(state, "training");
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
  const effectiveCoachLevel = coachLevel * environment.supportEfficiency;
  const effectiveNutritionLevel = nutritionLevel * environment.supportEfficiency;
  const effectiveRecoveryLevel = recoveryLevel * environment.supportEfficiency;
  const ranges: Partial<Record<AttributeKey, { min: number; max: number }>> = {};

  if (state.fitness < 12) {
    return {
      ranges,
      quality: "Poor" as TrainingQuality,
      qualityLabel: "Recovery session",
      qualityProfile: getTrainingQualityProfileByQuality("Poor"),
      specialistXp: {} as Partial<Record<AttributeKey, number>>,
      fitnessDelta: 10 + environment.recoveryBonus + getRecoverySessionBonus(effectiveRecoveryLevel, effectiveNutritionLevel),
      moraleDelta: 1,
      trustDelta: -1,
    };
  }

  getCurrentTrainingFocuses(state).forEach((focus, index) => {
    const baseRange = getBaseTrainingRange(state, focus);
    const focusWeight = getTrainingFocusWeight(index);
    ranges[focus] = {
      min: Math.max(
        1,
        Math.round(
          (baseRange.min * intensity.xpFloor + environment.xpFloorBonus + getTrainingXpFloorBonus(effectiveCoachLevel) + trainingBreakthroughs * 8) *
            focusWeight *
            environment.xpMultiplier *
            qualityProfile.xpMultiplier,
        ),
      ),
      max: Math.max(
        1,
        Math.round(
          (baseRange.max * intensity.xpCeiling + environment.xpFloorBonus + getTrainingXpCeilingBonus(effectiveCoachLevel) + trainingBreakthroughs * 12) *
            focusWeight *
            environment.xpMultiplier *
            qualityProfile.xpMultiplier,
        ),
      ),
    };
  });
  getCoachSupportFocuses(state).forEach((focus) => {
    ranges[focus] = {
      min: Math.max(1, Math.round(effectiveCoachLevel * 2.5 * environment.xpMultiplier * qualityProfile.xpMultiplier)),
      max: Math.max(1, Math.round(effectiveCoachLevel * 6 * environment.xpMultiplier * qualityProfile.xpMultiplier)),
    };
  });

  const rawFitnessDelta =
    intensity.fitnessDelta < 0
      ? Math.min(0, intensity.fitnessDelta + getTrainingFatigueRelief(effectiveNutritionLevel))
      : intensity.fitnessDelta + environment.recoveryBonus;

  return {
    ranges,
    quality: qualityProfile.quality,
    qualityLabel: qualityProfile.label,
    qualityProfile,
    specialistXp: getProjectedSpecialistXp(state, environment, qualityProfile),
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
    xpMultiplier: 1 + (level - 1) * 0.12,
    xpFloorBonus: (level - 1) * 3,
    recoveryBonus: level >= 4 ? 1 : 0,
    supportEfficiency: 1 + (level - 1) * 0.06,
  };
}


function getProjectedTrainingFitness(state: GameState, fitnessDelta: number) {
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
  const recoveryLevel = getSupportLevel(state, "recovery") * environment.supportEfficiency;
  const nutritionLevel = getSupportLevel(state, "nutrition") * environment.supportEfficiency;
  const projectedFitness = clamp(state.fitness + fitnessDelta, 0, 100);
  const floor = getRecoveryFitnessFloor(recoveryLevel, nutritionLevel, recoveryBreakthroughs);
  const ceiling = getRecoveryFitnessCeiling(recoveryLevel, nutritionLevel, recoveryBreakthroughs);

  return applyRecoveryCeiling(applyRecoveryFloor(state.fitness, projectedFitness, floor), ceiling);
}


export function getTrainingQualityProfile(state: GameState, seed: string, environment = getDevelopmentEnvironment(currentLeagueTier)): TrainingQualityProfile {
  const nutritionLevel = getSupportLevel(state, "nutrition");
  const recoveryLevel = getSupportLevel(state, "recovery");
  const trainingBreakthroughs = getSupportTrackBreakthroughCount(state, "training");
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
  const readinessScore =
    state.fitness * 0.42 +
    state.morale * 0.18 +
    (100 - state.pressure) * 0.12 +
    environment.facilityLevel * 5 +
    nutritionLevel * 1.05 +
    recoveryLevel * 0.35 +
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


export function getProjectedSpecialistXp(
  state: GameState,
  environment = getDevelopmentEnvironment(currentLeagueTier),
  qualityProfile = getTrainingQualityProfile(state, createTrainingSeed(state), environment),
): Partial<Record<AttributeKey, number>> {
  const specialist = trainingSpecialistMap[state.trainingSpecialist] ?? trainingSpecialistMap.finishing;
  const focuses = getCurrentTrainingFocuses(state);
  const matchingFocuses = focuses.filter((focus) => specialist.attributes.includes(focus));
  if (matchingFocuses.length === 0) {
    return {};
  }

  const coachLevel = getSupportLevel(state, "coach");
  const trainingBreakthroughs = getSupportTrackBreakthroughCount(state, "training");
  const baseBonus = getSpecialistBaseXpBonus(state, environment);
  const bonus = Math.max(2, Math.round(baseBonus * environment.supportEfficiency * qualityProfile.xpMultiplier));
  return Object.fromEntries(matchingFocuses.map((focus) => [focus, bonus])) as Partial<Record<AttributeKey, number>>;
}


export function getSpecialistBaseXpBonus(state: GameState, environment = getDevelopmentEnvironment(currentLeagueTier)) {
  const coachLevel = getSupportLevel(state, "coach");
  const trainingBreakthroughs = getSupportTrackBreakthroughCount(state, "training");
  return Math.round(8 + environment.facilityLevel * 2 + coachLevel * 1.6 + trainingBreakthroughs * 4);
}


export function getCurrentTrainingFocuses(state: GameState): AttributeKey[] {
  const capacity = getTrainingFocusCapacity(state);
  const uniqueFocuses = Array.from(new Set(state.trainingFocuses.length > 0 ? state.trainingFocuses : ["Finishing"]));
  return uniqueFocuses.slice(0, capacity) as AttributeKey[];
}


export function getTrainingFocusCapacity(state: Pick<GameState, "supportUpgrades">) {
  const breakthroughs = getSupportTrackBreakthroughCount(state, "training");
  if (breakthroughs >= 3) {
    return 3;
  }
  if (breakthroughs >= 1) {
    return 2;
  }
  return 1;
}


export function getTrainingFocusWeight(index: number) {
  if (index === 0) {
    return 1;
  }
  if (index === 1) {
    return 0.62;
  }
  return 0.42;
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


export function getCoachSupportFocuses(state: GameState): AttributeKey[] {
  const coachLevel = getSupportLevel(state, "coach");
  if (coachLevel <= 0) {
    return [];
  }

  const activeFocuses = new Set(getCurrentTrainingFocuses(state));
  const positionModule = getPositionModule(state.positionGroup);
  const focusCount = coachLevel >= 8 ? 2 : 1;
  return positionModule.keyAttributes
    .filter((attribute) => !activeFocuses.has(attribute))
    .map((attribute) => ({ attribute, value: getAttributeValue(state.attributes, attribute) }))
    .sort((a, b) => a.value - b.value)
    .slice(0, focusCount)
    .map((item) => item.attribute);
}


export function getBaseTrainingRange(_state: GameState, _focus: AttributeKey) {
  return { min: 12, max: 55 };
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
  const isSelected = getCurrentTrainingFocuses(state).includes(attribute.label);
  const isCoachSupported = getCoachSupportFocuses(state).includes(attribute.label);
  const modifiers = [
    `Facilities x${environment.xpMultiplier.toFixed(2)}`,
    `Facility floor +${environment.xpFloorBonus}`,
    `Coach Lv ${getSupportLevel(state, "coach")}`,
  ];

  if (isCoachSupported) {
    modifiers.push("Coach support XP");
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
    trainingRange: range ? `${range.min}-${range.max} XP` : isCoachSupported ? "Support XP" : "Not focused",
    modifiers,
    improvementTips: [
      "Train this stat",
      "Improve Training setup",
      "Move to better facilities",
      "Build dynasty growth upgrades",
    ],
  };
}

