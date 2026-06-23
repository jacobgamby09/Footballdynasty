import { dynastyTrackDefinitions, dynastyUpgradeDefinitions, dynastyUpgradeMap } from "../data/dynastyUpgrades";
import type { DynastyState, DynastyTrackDefinition, DynastyTrackId, DynastyUpgradeDefinition, DynastyUpgradeId, GameState } from "../types";

export function buyDynastyUpgradeState(state: GameState, upgradeId: DynastyUpgradeId): GameState {
  const upgrade = dynastyUpgradeMap[upgradeId];
  if (!upgrade || !isDynastyUpgradeUnlocked(state.dynasty, upgrade)) {
    return state;
  }

  const currentLevel = getDynastyUpgradeLevel(state.dynasty, upgradeId);
  if (currentLevel >= upgrade.maxLevel) {
    return state;
  }

  const cost = getDynastyUpgradeCost(upgrade, currentLevel);
  if (state.dynasty.legacyPoints < cost) {
    return state;
  }

  const track = getDynastyTrackForUpgrade(upgradeId);
  const beforeBreakthroughs = track ? getDynastyTrackBreakthroughCount(state.dynasty, track.id) : 0;
  const nextDynasty = {
    ...state.dynasty,
    legacyPoints: state.dynasty.legacyPoints - cost,
    upgrades: {
      ...state.dynasty.upgrades,
      [upgradeId]: currentLevel + 1,
    },
  };
  const afterBreakthroughs = track ? getDynastyTrackBreakthroughCount(nextDynasty, track.id) : beforeBreakthroughs;
  const breakthroughName =
    track && afterBreakthroughs > beforeBreakthroughs
      ? track.breakthroughs[Math.min(afterBreakthroughs - 1, track.breakthroughs.length - 1)]
      : undefined;

  return {
    ...state,
    dynasty: nextDynasty,
    lastEvent: breakthroughName
      ? `${track?.name} breakthrough unlocked: ${breakthroughName}.`
      : `${upgrade.name} is now level ${currentLevel + 1}.`,
  };
}

export function getDynastyUpgradeCost(upgrade: DynastyUpgradeDefinition, currentLevel: number) {
  const earlyRamp = 1 + currentLevel * 0.28 + Math.pow(currentLevel, 2) * 0.045;
  const lateRamp = currentLevel >= 12 ? Math.pow(currentLevel - 11, 2) * 0.05 : 0;
  return Math.round(upgrade.baseCost * (earlyRamp + lateRamp));
}

export function isDynastyUpgradeUnlocked(dynasty: DynastyState, upgrade: DynastyUpgradeDefinition) {
  const requirements = upgrade.requires ?? {};
  return Object.entries(requirements).every(([requiredId, requiredLevel]) => getDynastyUpgradeLevel(dynasty, requiredId as DynastyUpgradeId) >= (requiredLevel ?? 0));
}

export function getDynastyUpgradeLockReason(dynasty: DynastyState, upgrade: DynastyUpgradeDefinition) {
  const missing = Object.entries(upgrade.requires ?? {}).find(
    ([requiredId, requiredLevel]) => getDynastyUpgradeLevel(dynasty, requiredId as DynastyUpgradeId) < (requiredLevel ?? 0),
  );
  if (!missing) return undefined;

  const [requiredId, requiredLevel] = missing;
  return `${dynastyUpgradeMap[requiredId as DynastyUpgradeId].name} Lv ${requiredLevel}`;
}

export function getDynastyTrackProgress(dynasty: DynastyState, track: DynastyTrackDefinition) {
  const total = getDynastyTrackTotal(dynasty, track);
  const maxTotal = track.upgradeIds.reduce((sum, upgradeId) => sum + dynastyUpgradeMap[upgradeId].maxLevel, 0);
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

export function getNextDynastyTrackPurchase(dynasty: DynastyState, track: DynastyTrackDefinition) {
  const options = track.upgradeIds
    .map((upgradeId) => {
      const upgrade = dynastyUpgradeMap[upgradeId];
      const level = getDynastyUpgradeLevel(dynasty, upgradeId);
      return {
        upgrade,
        level,
        cost: getDynastyUpgradeCost(upgrade, level),
        lockReason: getDynastyUpgradeLockReason(dynasty, upgrade),
      };
    })
    .filter((option) => option.level < option.upgrade.maxLevel)
    .filter((option) => !option.lockReason)
    .sort((a, b) => a.cost - b.cost || a.level - b.level);

  return options[0];
}

export function getDynastyTrackForUpgrade(upgradeId: DynastyUpgradeId) {
  return dynastyTrackDefinitions.find((track) => track.upgradeIds.includes(upgradeId));
}

export function getDynastyTrackById(trackId: DynastyTrackId) {
  return dynastyTrackDefinitions.find((track) => track.id === trackId);
}

export function getDynastyTrackTotal(dynasty: DynastyState, track: DynastyTrackDefinition) {
  return track.upgradeIds.reduce((sum, upgradeId) => sum + getDynastyUpgradeLevel(dynasty, upgradeId), 0);
}

export function getDynastyTrackBreakthroughCount(dynasty: DynastyState, trackId: DynastyTrackId) {
  const track = getDynastyTrackById(trackId);
  if (!track) return 0;

  const total = getDynastyTrackTotal(dynasty, track);
  return track.breakpoints.filter((breakpoint) => total >= breakpoint).length;
}

export function getDynastyUpgradeLevel(dynasty: DynastyState, upgradeId: DynastyUpgradeId) {
  return dynasty.upgrades?.[upgradeId] ?? 0;
}

export function getDynastyKeyStartBonus(dynasty: DynastyState) {
  return getDynastyTrackBreakthroughCount(dynasty, "homeAcademy") + Math.floor(getDynastyUpgradeLevel(dynasty, "academyKeyStart") / 10);
}

export function getDynastyGeneralStartBonus(dynasty: DynastyState) {
  return Math.floor(getDynastyTrackBreakthroughCount(dynasty, "homeAcademy") / 2) + Math.floor(getDynastyUpgradeLevel(dynasty, "academyGeneralStart") / 9);
}

export function getDynastyTrainingFloorBonus(dynasty: DynastyState) {
  return getDynastyTrackBreakthroughCount(dynasty, "bloodlineTraining") + Math.floor(getDynastyUpgradeLevel(dynasty, "bloodlineXpFloor") / 8);
}

export function getDynastyTrainingCeilingBonus(dynasty: DynastyState) {
  return getDynastyTrackBreakthroughCount(dynasty, "bloodlineTraining") + Math.floor(getDynastyUpgradeLevel(dynasty, "bloodlineXpCeiling") / 8);
}

export function getDynastyNetworkBonus(dynasty: DynastyState) {
  return getDynastyTrackBreakthroughCount(dynasty, "familyNetwork") + Math.floor(getDynastyUpgradeLevel(dynasty, "networkReach") / 10);
}

export function getDynastyTrackCurrentBonusLines(dynasty: DynastyState, track: DynastyTrackDefinition) {
  if (track.id === "homeAcademy") {
    return [`+${getDynastyKeyStartBonus(dynasty)} key start`, `+${getDynastyGeneralStartBonus(dynasty)} general start`];
  }
  if (track.id === "bloodlineTraining") {
    return [`+${getDynastyTrainingFloorBonus(dynasty)} XP floor`, `+${getDynastyTrainingCeilingBonus(dynasty)} XP ceiling`];
  }
  return [`+${getDynastyNetworkBonus(dynasty)} network`, `better next-gen terms`];
}

export function getDynastyInvestmentImpactLine(dynasty: DynastyState, track: DynastyTrackDefinition, upgradeId: DynastyUpgradeId) {
  const nextState = {
    ...dynasty,
    upgrades: {
      ...dynasty.upgrades,
      [upgradeId]: getDynastyUpgradeLevel(dynasty, upgradeId) + 1,
    },
  };
  const before = getDynastyTrackBreakthroughCount(dynasty, track.id);
  const after = getDynastyTrackBreakthroughCount(nextState, track.id);
  if (after > before) {
    return `Breakthrough: ${track.breakthroughs[Math.min(after - 1, track.breakthroughs.length - 1)]}`;
  }
  return dynastyUpgradeDefinitions.find((upgrade) => upgrade.id === upgradeId)?.effect ?? "Progress toward next breakthrough";
}
