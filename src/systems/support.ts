import { supportTrackDefinitions, supportUpgradeDefinitions, supportUpgradeMap } from "../data/support";
import { getPositionModule } from "../positionRoles";
import { clamp } from "../utils";
import { HARD_RETIREMENT_AGE, PEAK_AGE } from "./aging";
import type { Attribute, GameState, SupportTrackDefinition, SupportTrackId, SupportUpgradeDefinition, SupportUpgradeId } from "../types";

// "Specialist coaching" (the potential upgrade) raises the ceiling of the player's KEY
// attributes by 1 per level (capped at 95). Applied at purchase so every consumer of
// potential — the growth soft-cap, the UI labels, growthProfileOvr — reflects it for free.
export function bumpKeyAttributePotential(state: Pick<GameState, "attributes" | "positionGroup">): Attribute[] {
  const weights = getPositionModule(state.positionGroup).ovrWeights;
  return state.attributes.map((attribute) => {
    const isKey = (weights[attribute.label] ?? 0) > 0;
    return isKey ? { ...attribute, potential: clamp(attribute.potential + 1, attribute.potential, 95) } : attribute;
  });
}

export function buySupportUpgradeState(state: GameState, upgradeId: SupportUpgradeId): GameState {
  const upgrade = supportUpgradeDefinitions.find((item) => item.id === upgradeId);
  if (!upgrade || !isSupportUpgradeUnlocked(state, upgrade)) {
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
    attributes: upgradeId === "potential" ? bumpKeyAttributePotential(state) : state.attributes,
    lastEvent: breakthroughName
      ? `${track?.name} breakthrough unlocked: ${breakthroughName}.`
      : `${upgrade.name} is now level ${nextLevel}.`,
  };
}

export function isSupportUpgradeUnlocked(state: Pick<GameState, "supportUpgrades" | "prestige">, upgrade: SupportUpgradeDefinition) {
  if (upgrade.requiresPrestige && state.prestige < upgrade.requiresPrestige) {
    return false;
  }
  const requirements = upgrade.requires ?? {};
  return Object.entries(requirements).every(([requiredId, requiredLevel]) => getSupportLevel(state, requiredId as SupportUpgradeId) >= (requiredLevel ?? 0));
}

export function getSupportUpgradeLockReason(state: Pick<GameState, "supportUpgrades" | "prestige">, upgrade: SupportUpgradeDefinition) {
  if (upgrade.requiresPrestige && state.prestige < upgrade.requiresPrestige) {
    return `${upgrade.requiresPrestige.toLocaleString()} prestige`;
  }
  const requirements = upgrade.requires ?? {};
  const missing = Object.entries(requirements).find(([requiredId, requiredLevel]) => getSupportLevel(state, requiredId as SupportUpgradeId) < (requiredLevel ?? 0));
  if (!missing) {
    return undefined;
  }

  const [requiredId, requiredLevel] = missing;
  const requiredUpgrade = supportUpgradeMap[requiredId as SupportUpgradeId];
  return `${requiredUpgrade.name} Lv ${requiredLevel}`;
}

export function getSupportUpgradeCost(upgrade: SupportUpgradeDefinition, currentLevel: number) {
  const earlyRamp = 1 + currentLevel * 0.34 + Math.pow(currentLevel, 2) * 0.055;
  const lateRamp = currentLevel >= 30 ? Math.pow(currentLevel - 29, 2) * 0.025 : 0;
  const eliteRamp = currentLevel >= 70 ? Math.pow(currentLevel - 69, 2) * 0.06 : 0;
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

export function getNextSupportTrackPurchase(state: GameState, track: SupportTrackDefinition) {
  const options = track.upgradeIds
    .map((upgradeId) => {
      const upgrade = supportUpgradeMap[upgradeId];
      const level = state.supportUpgrades[upgradeId] ?? 0;
      return {
        upgrade,
        level,
        cost: getSupportUpgradeCost(upgrade, level),
        lockReason: getSupportUpgradeLockReason(state, upgrade),
      };
    })
    .filter((option) => option.level < option.upgrade.maxLevel)
    .filter((option) => !option.lockReason)
    .sort((a, b) => a.cost - b.cost || a.level - b.level);

  return options[0];
}

export function getSupportUpgradeTotal(state: GameState) {
  return Object.values(state.supportUpgrades).reduce((sum, level) => sum + level, 0);
}

export function getSupportLevel(state: Pick<GameState, "supportUpgrades">, upgradeId: SupportUpgradeId) {
  return state.supportUpgrades[upgradeId] ?? 0;
}

export function getTrainingXpFloorBonus(level: number) {
  return Math.floor(level);
}

export function getTrainingXpCeilingBonus(level: number) {
  return Math.floor(level);
}

export function isFocusSlot2Unlocked(state: Pick<GameState, "supportUpgrades">) {
  return getSupportLevel(state, "focusSlot2Unlock") >= supportUpgradeMap.focusSlot2Unlock.maxLevel;
}

export function isFocusSlot3Unlocked(state: Pick<GameState, "supportUpgrades">) {
  return getSupportLevel(state, "focusSlot3Unlock") >= supportUpgradeMap.focusSlot3Unlock.maxLevel;
}

export function getFocusSlot2Efficiency(state: Pick<GameState, "supportUpgrades">) {
  if (!isFocusSlot2Unlocked(state)) {
    return 0;
  }
  return clamp(0.25 + getSupportLevel(state, "focusSlot2Efficiency") / 100, 0.25, 0.9);
}

export function getFocusSlot3Efficiency(state: Pick<GameState, "supportUpgrades">) {
  if (!isFocusSlot3Unlocked(state)) {
    return 0;
  }
  return clamp(0.15 + getSupportLevel(state, "focusSlot3Efficiency") / 100, 0.15, 0.75);
}

export function getTrainingFatigueRelief(level: number) {
  return Math.min(16, Math.floor(level / 3));
}

export function getRecoverySessionBonus(baselineLevel: number) {
  return Math.min(14, Math.round(baselineLevel * 0.45));
}

export function getWeeklySupportRecoveryBonus(baselineLevel: number) {
  return Math.min(8, Math.floor(baselineLevel / 5));
}

export function getMatchActionRecoveryRelief(level: number) {
  return Math.min(12, Math.floor(level / 4));
}

// --- Longevity (Stage 2 long-term cash upgrade) ---------------------------------------------
// Each longevity breakthrough pushes the peak age and the retirement cap one year later; raw
// levels flatten the post-peak decline. So a heavily-invested veteran peaks later, fades more
// slowly, and can keep playing toward ~46 — the expensive late-career cash payoff.
export function getLongevityPeakBonus(state: Pick<GameState, "supportUpgrades">) {
  return getSupportTrackBreakthroughCount(state, "longevity");
}

export function getLongevityDeclineResist(state: Pick<GameState, "supportUpgrades">) {
  return Math.floor(getSupportLevel(state, "longevity") / 12);
}

export function getAgingProfile(state: Pick<GameState, "supportUpgrades">) {
  const peakBonus = getLongevityPeakBonus(state);
  return {
    peakAge: PEAK_AGE + peakBonus,
    declineResist: getLongevityDeclineResist(state),
    hardRetirementAge: HARD_RETIREMENT_AGE + peakBonus,
  };
}

// --- Elite perks (Stage: tier-gated, NON-OVR upgrades) -------------------------------------
// All three polish a developed player without touching attribute values/potential, so they can
// never push OVR past the generational guidance — they only affect rating floor, fitness
// ceiling and economy.
export function getConsistencyRatingFloor(state: Pick<GameState, "supportUpgrades">) {
  // Raises the match-rating floor (bad games hurt less): up to +0.8 at level 10.
  return getSupportLevel(state, "consistency") * 0.08;
}

export function getEliteConditioningCeilingBonus(state: Pick<GameState, "supportUpgrades">) {
  // Lifts the fitness ceiling: up to +10 at level 10 (stay fresher for longer).
  return getSupportLevel(state, "eliteConditioning");
}

export function getMarqueeBonus(state: Pick<GameState, "supportUpgrades">) {
  // Multiplier on prestige gain and sponsor income: up to +50% at level 10.
  return getSupportLevel(state, "marquee") * 0.05;
}

export function getRecoveryFitnessFloor(baselineLevel: number, breakthroughs = 0) {
  // Base floor 34: a player who never invests in recovery sits "tired but playable", not
  // permanently exhausted. Recovery investment still matters a lot (floor climbs to 68, plus
  // a higher ceiling), but ignoring it is below-par rather than broken.
  return Math.min(68, 34 + Math.round(baselineLevel * 0.75 + breakthroughs * 4));
}

export function getRecoveryFitnessCeiling(baselineLevel: number, breakthroughs = 0) {
  return Math.min(88, 70 + Math.round(baselineLevel * 0.28 + breakthroughs * 2));
}

export function applyRecoveryFloor(currentFitness: number, projectedFitness: number, floor: number) {
  if (projectedFitness >= floor) {
    return projectedFitness;
  }

  const pull = Math.min(7, Math.ceil((floor - projectedFitness) * 0.35));
  return clamp(Math.min(Math.max(currentFitness, projectedFitness), projectedFitness + pull), 0, 100);
}

export function applyRecoveryCeiling(currentFitness: number, projectedFitness: number, ceiling: number) {
  if (projectedFitness <= currentFitness) {
    return projectedFitness;
  }

  if (currentFitness >= ceiling) {
    return currentFitness;
  }

  if (projectedFitness <= ceiling) {
    return projectedFitness;
  }

  const overflow = projectedFitness - ceiling;
  return clamp(ceiling + Math.round(overflow * 0.25), 0, 100);
}

export function getAgentWageLeverage(level: number) {
  return level / 100;
}

export function getAgentSigningBonusLeverage(level: number) {
  return level * 2 / 100;
}

export function getSponsorAppealBonus(level: number) {
  return level * 2 / 100;
}
