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
  return Math.round(upgrade.baseCost * (1 + currentLevel * 0.62 + Math.pow(currentLevel, 2) * 0.16));
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
  return Math.floor(breakthroughs / 2);
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
  return Math.round(level * 10);
}


export function getTrainingXpCeilingBonus(level: number) {
  return Math.round(level * 9);
}


export function getTrainingFatigueRelief(level: number) {
  return Math.min(10, Math.round(level * 0.78));
}


export function getRecoverySessionBonus(recoveryLevel: number, nutritionLevel: number) {
  return Math.min(26, Math.round(recoveryLevel * 2.2 + nutritionLevel * 0.9));
}


export function getWeeklySupportRecoveryBonus(recoveryLevel: number, nutritionLevel: number) {
  return Math.min(9, Math.round(recoveryLevel * 0.55 + nutritionLevel * 0.75));
}


export function getMatchActionRecoveryRelief(level: number) {
  return Math.min(7, Math.round(level * 0.5));
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

