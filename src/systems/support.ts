import { bootsActionAttributes, supportTrackDefinitions, supportUpgradeDefinitions, supportUpgradeMap } from "../data/support";
import { clamp } from "../utils";
import type { AttributeKey } from "../positionRoles";
import type { GameState, SupportTrackDefinition, SupportTrackId, SupportUpgradeDefinition, SupportUpgradeId } from "../types";

export function buySupportUpgradeState(state: GameState, upgradeId: SupportUpgradeId): GameState {
  const upgrade = supportUpgradeDefinitions.find((item) => item.id === upgradeId);
  if (!upgrade) {
    return state;
  }

  const currentLevel = state.supportUpgrades[upgradeId] ?? 0;
  if (currentLevel >= upgrade.maxLevel) {
    return state;
  }

  const cost = getSupportUpgradeCost(upgrade, currentLevel);
  if (state.cash < cost) {
    return state;
  }

  const track = getSupportTrackForUpgrade(upgradeId);
  const beforeBreakthroughs = track ? getSupportTrackBreakthroughCount(state, track.id) : 0;
  const nextLevel = currentLevel + 1;
  const nextSupportUpgrades = {
    ...state.supportUpgrades,
    [upgradeId]: nextLevel,
  };
  const nextState = {
    ...state,
    supportUpgrades: nextSupportUpgrades,
  };
  const afterBreakthroughs = track ? getSupportTrackBreakthroughCount(nextState, track.id) : beforeBreakthroughs;
  const breakthroughName =
    track && afterBreakthroughs > beforeBreakthroughs
      ? track.breakthroughs[Math.min(afterBreakthroughs - 1, track.breakthroughs.length - 1)]
      : undefined;

  return {
    ...state,
    cash: state.cash - cost,
    supportUpgrades: nextSupportUpgrades,
    lastEvent: breakthroughName
      ? `${track?.name} breakthrough unlocked: ${breakthroughName}.`
      : `${track?.name ?? upgrade.name} investment added. ${upgrade.name} is now level ${nextLevel}.`,
  };
}


export function getSupportUpgradeCost(upgrade: SupportUpgradeDefinition, currentLevel: number) {
  const earlyRamp = 1 + currentLevel * 0.78 + Math.pow(currentLevel, 2) * 0.24;
  const lateRamp = currentLevel >= 6 ? Math.pow(currentLevel - 5, 2) * 0.55 : 0;
  const eliteRamp = currentLevel >= 10 ? Math.pow(currentLevel - 9, 2) * 1.1 : 0;
  return Math.round(upgrade.baseCost * (earlyRamp + lateRamp + eliteRamp));
}


export function getSupportTrackProgress(state: GameState, track: SupportTrackDefinition) {
  const levels = track.upgradeIds.map((upgradeId) => state.supportUpgrades[upgradeId] ?? 0);
  const total = levels.reduce((sum, level) => sum + level, 0);
  const maxTotal = track.upgradeIds.reduce((sum, upgradeId) => sum + supportUpgradeMap[upgradeId].maxLevel, 0);
  const nextBreakpoint = track.breakpoints.find((breakpoint) => total < breakpoint);
  const previousBreakpoint = [...track.breakpoints].reverse().find((breakpoint) => total >= breakpoint) ?? 0;
  const nextIndex = nextBreakpoint ? track.breakpoints.indexOf(nextBreakpoint) : track.breakpoints.length - 1;
  const required = nextBreakpoint ? nextBreakpoint - previousBreakpoint : 0;
  const current = nextBreakpoint ? total - previousBreakpoint : required;

  return {
    total,
    maxTotal,
    current,
    required,
    percent: nextBreakpoint ? (current / required) * 100 : 100,
    nextName: nextBreakpoint ? track.breakthroughs[nextIndex] : track.breakthroughs[track.breakthroughs.length - 1],
    maxed: total >= maxTotal,
  };
}


export function getSupportTrackForUpgrade(upgradeId: SupportUpgradeId) {
  return supportTrackDefinitions.find((track) => track.upgradeIds.includes(upgradeId));
}


export function getSupportTrackById(trackId: SupportTrackId) {
  return supportTrackDefinitions.find((track) => track.id === trackId);
}


export function getSupportTrackTotal(state: Pick<GameState, "supportUpgrades">, track: SupportTrackDefinition) {
  return track.upgradeIds.reduce((sum, upgradeId) => sum + (state.supportUpgrades[upgradeId] ?? 0), 0);
}


export function getSupportTrackBreakthroughCount(state: Pick<GameState, "supportUpgrades">, trackId: SupportTrackId) {
  const track = getSupportTrackById(trackId);
  if (!track) {
    return 0;
  }

  const total = getSupportTrackTotal(state, track);
  return track.breakpoints.filter((breakpoint) => total >= breakpoint).length;
}


export function getRecoveryBreakthroughRelief(breakthroughs: number) {
  return Math.min(1, Math.floor(breakthroughs / 3));
}


export function getNextSupportTrackPurchase(state: GameState, track: SupportTrackDefinition) {
  const options = track.upgradeIds
    .map((upgradeId) => {
      const upgrade = supportUpgradeMap[upgradeId];
      const level = state.supportUpgrades[upgradeId] ?? 0;
      return {
        upgrade,
        level,
        cost: getSupportUpgradeCost(upgrade, level),
      };
    })
    .filter((option) => option.level < option.upgrade.maxLevel)
    .sort((a, b) => a.cost - b.cost || a.level - b.level);

  return options[0];
}


export function getSupportUpgradeTotal(state: GameState) {
  return Object.values(state.supportUpgrades).reduce((sum, level) => sum + level, 0);
}


export function getSupportLevel(state: GameState, upgradeId: SupportUpgradeId) {
  return state.supportUpgrades[upgradeId] ?? 0;
}


export function getTrainingXpFloorBonus(level: number) {
  return Math.round(level * 5.5);
}


export function getTrainingXpCeilingBonus(level: number) {
  return Math.round(level * 5);
}


export function getTrainingFatigueRelief(level: number) {
  return Math.min(7, Math.round(level * 0.52));
}


export function getRecoverySessionBonus(recoveryLevel: number, nutritionLevel: number) {
  return Math.min(12, Math.round(recoveryLevel * 0.8 + nutritionLevel * 0.45));
}


export function getWeeklySupportRecoveryBonus(recoveryLevel: number, nutritionLevel: number) {
  return Math.min(3, Math.round(recoveryLevel * 0.18 + nutritionLevel * 0.28));
}


export function getMatchActionRecoveryRelief(level: number) {
  return Math.min(2, Math.round(level * 0.16));
}


export function getRecoveryFitnessFloor(recoveryLevel: number, nutritionLevel: number, breakthroughs = 0) {
  return Math.min(58, 12 + Math.round(recoveryLevel * 0.85 + nutritionLevel * 0.55 + breakthroughs * 3));
}


export function getRecoveryFitnessCeiling(recoveryLevel: number, nutritionLevel: number, breakthroughs = 0) {
  return Math.min(82, 68 + Math.round(recoveryLevel * 0.35 + nutritionLevel * 0.25 + breakthroughs * 2));
}


export function applyRecoveryFloor(currentFitness: number, projectedFitness: number, floor: number) {
  if (projectedFitness >= floor) {
    return projectedFitness;
  }

  const pull = Math.min(5, Math.ceil((floor - projectedFitness) * 0.28));
  return clamp(Math.min(Math.max(currentFitness, projectedFitness), projectedFitness + pull), 0, 100);
}


export function applyRecoveryCeiling(projectedFitness: number, ceiling: number) {
  if (projectedFitness <= ceiling) {
    return projectedFitness;
  }

  const overflow = projectedFitness - ceiling;
  return clamp(ceiling + Math.round(overflow * 0.25), 0, 100);
}


export function getBootsActionBoost(bootsLevel: number) {
  return Math.min(7, Math.floor(bootsLevel / 2));
}


export function getLifestylePressureRelief(lifestyleLevel: number, breakthroughs = 0) {
  return Math.min(6, Math.floor(lifestyleLevel / 3) + breakthroughs);
}


export function applyBootsActionBoost(attributeValues: Record<AttributeKey, number>, bootsLevel: number) {
  const boost = getBootsActionBoost(bootsLevel);
  if (boost <= 0) {
    return attributeValues;
  }

  return {
    ...attributeValues,
    ...Object.fromEntries(
      bootsActionAttributes.map((attribute) => [attribute, clamp((attributeValues[attribute] ?? 50) + boost, 1, 100)]),
    ),
  };
}

