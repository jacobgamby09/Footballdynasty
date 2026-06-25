import { getPositionModule } from "../positionRoles";
import type { Attribute, ClubState, Contract, DynastyState, DynastyUpgradeId, GameState, LastMatchSummary, SavePayload, SupportUpgradeId, TrainingSummary, World } from "../types";
import { initialAttributes } from "../data/attributes";
import { initialDynastyUpgrades, dynastyUpgradeMap } from "../data/dynastyUpgrades";
import { contractMarketClubs, initialClub, leagueTiers } from "../data/leagues";
import { initialSupportUpgrades, supportUpgradeMap } from "../data/support";
import { COUNTRIES, seedWorld } from "../data/world";
import { createSeasonFixturesFromWorld, getClubShortCode, getClubShortName, getClubStrengthForTier } from "../systems/club";
import { cloneSponsorDeal } from "../systems/sponsors";
import { initialState } from "./initialState";

const SAVE_KEY = "football-dynasty-save";
const SAVE_VERSION = 25;

function cloneWorld(world: World): World {
  const countryDefaults = Object.fromEntries(COUNTRIES.map((country) => [country.id, country]));

  return {
    seasonNumber: world.seasonNumber,
    tierOrder: [...world.tierOrder],
    countries: Object.fromEntries(
      Object.entries(world.countries ?? {}).map(([id, c]) => [id, { ...countryDefaults[id], ...c, tiers: [...c.tiers] }]),
    ) as World["countries"],
    clubs: Object.fromEntries(Object.entries(world.clubs).map(([id, club]) => [id, { ...club }])),
    leagues: Object.fromEntries(Object.entries(world.leagues).map(([id, league]) => [id, { ...league, clubIds: [...league.clubIds] }])),
    leagueSeasons: Object.fromEntries(
      Object.entries(world.leagueSeasons ?? {}).map(([id, ls]) => [
        id,
        { leagueId: ls.leagueId, records: Object.fromEntries(Object.entries(ls.records).map(([cid, rec]) => [cid, { ...rec, recentForm: [...(rec.recentForm ?? [])] }])) },
      ]),
    ),
  };
}

export function createInitialState(): GameState {
  return cloneGameState(initialState);
}

export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    player: { ...state.player },
    attributes: state.attributes.map((attribute) => ({ ...attribute })),
    seasonStats: {
      ...state.seasonStats,
      ratings: [...state.seasonStats.ratings],
    },
    season: {
      ...state.season,
      fixtures: state.season.fixtures.map((fixture) => ({ ...fixture })),
      results: state.season.results.map((result) => ({ ...result })),
    },
    club: { ...state.club },
    world: cloneWorld(state.world),
    dynasty: { ...state.dynasty, upgrades: { ...(state.dynasty.upgrades ?? initialDynastyUpgrades) } },
    dynastyHistory: state.dynastyHistory.map((season) => ({ ...season })),
    contract: { ...state.contract },
    sponsor: state.sponsor ? cloneSponsorDeal(state.sponsor) : undefined,
    contractOffer: state.contractOffer ? { ...state.contractOffer } : undefined,
    contractOffers: state.contractOffers?.map((offer) => ({ ...offer })),
    freeAgent: state.freeAgent ? { ...state.freeAgent, declinedOfferKeys: [...state.freeAgent.declinedOfferKeys] } : undefined,
    transferWindow: state.transferWindow
      ? {
          ...state.transferWindow,
          currentClubOffer: state.transferWindow.currentClubOffer ? { ...state.transferWindow.currentClubOffer } : undefined,
          offers: state.transferWindow.offers.map((offer) => ({ ...offer })),
        }
      : undefined,
    supportUpgrades: { ...state.supportUpgrades },
    worldFeed: state.worldFeed.map((story) => ({
      ...story,
      headline: story.headline.map((part) => ({ ...part })),
      body: story.body.map((part) => ({ ...part })),
      clubIds: [...story.clubIds],
    })),
    activeMatch: undefined,
    lastMatch: state.lastMatch ? cloneLastMatchSummary(state.lastMatch) : undefined,
    lastTraining: state.lastTraining ? cloneTrainingSummary(state.lastTraining) : undefined,
  };
}

export function cloneTrainingSummary(summary: TrainingSummary): TrainingSummary {
  return {
    ...summary,
    focuses: [...summary.focuses],
    ranges: { ...summary.ranges },
    xp: { ...summary.xp },
    quality: summary.quality ?? "Solid",
    qualityLabel: summary.qualityLabel ?? "Solid session",
    levelUps: summary.levelUps.map((levelUp) => ({ ...levelUp })),
  };
}

export function cloneLastMatchSummary(summary: LastMatchSummary): LastMatchSummary {
  return {
    ...summary,
    chanceQualities: [...summary.chanceQualities],
    explanationTags: [...summary.explanationTags],
    performanceReasons: [...summary.performanceReasons],
    xp: { ...summary.xp },
    careerImpact: [...summary.careerImpact],
  };
}

export function hasSavedGame(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return false;
    }
    const payload = JSON.parse(raw) as Partial<SavePayload>;
    return isSupportedSaveVersion(payload.version) && Boolean(payload.game);
  } catch {
    return false;
  }
}

export function loadSavedGame(): GameState {
  if (typeof window === "undefined") {
    return createInitialState();
  }

  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return createInitialState();
    }

    const payload = JSON.parse(raw) as Partial<SavePayload>;
    if (!isSupportedSaveVersion(payload.version) || !payload.game) {
      return createInitialState();
    }

    return normalizeSavedGame(payload.game);
  } catch {
    return createInitialState();
  }
}

export function normalizeSavedGame(saved: GameState): GameState {
  const fallback = createInitialState();
  const savedClub = normalizeSavedClub(saved.club, saved.contract);
  const normalizedWorld = saved.world ? cloneWorld(saved.world) : seedWorld();
  return {
    ...fallback,
    ...saved,
    player: normalizePlayer(saved.player, saved.dynasty, fallback.player),
    positionCode: getPositionModule(saved.positionGroup ?? fallback.positionGroup).shortCode,
    archetype: saved.archetype ?? getPositionModule(saved.positionGroup ?? fallback.positionGroup).defaultArchetype,
    attributes: mergeSavedAttributes(saved.attributes ?? fallback.attributes),
    world: normalizedWorld,
    seasonStats: {
      ...fallback.seasonStats,
      ...saved.seasonStats,
      ratings: [...(saved.seasonStats?.ratings ?? [])],
    },
    season: {
      ...fallback.season,
      ...saved.season,
      fixtures: saved.season?.fixtures?.length ? saved.season.fixtures.map((fixture) => ({ ...fixture })) : createSeasonFixturesFromWorld(savedClub, normalizedWorld),
      results: saved.season?.results?.map((result) => ({ ...result })) ?? [],
    },
    club: savedClub,
    dynasty: normalizeDynasty(saved.dynasty, fallback.dynasty),
    dynastyHistory: saved.dynastyHistory?.map((season) => ({ ...season })) ?? [],
    contract: { ...fallback.contract, ...(saved.contract ?? {}) },
    sponsor: saved.sponsor ? cloneSponsorDeal(saved.sponsor) : undefined,
    contractOffer: saved.contractOffer ? { ...saved.contractOffer } : undefined,
    contractOffers: saved.contractOffers?.map((offer) => ({ ...offer })),
    freeAgent: saved.freeAgent ? { ...saved.freeAgent, declinedOfferKeys: [...(saved.freeAgent.declinedOfferKeys ?? [])] } : undefined,
    transferWindow: saved.transferWindow
      ? {
          ...saved.transferWindow,
          currentClubOffer: saved.transferWindow.currentClubOffer ? { ...saved.transferWindow.currentClubOffer } : undefined,
          offers: saved.transferWindow.offers?.map((offer) => ({ ...offer })) ?? [],
        }
      : undefined,
    supportUpgrades: normalizeSupportUpgrades(saved.supportUpgrades as Partial<Record<string, number>> | undefined),
    worldFeed: saved.worldFeed?.map((story) => ({
      ...story,
      headline: story.headline.map((part) => ({ ...part })),
      body: story.body.map((part) => ({ ...part })),
      clubIds: [...story.clubIds],
    })) ?? [],
    trainingFocuses: saved.trainingFocuses?.length ? saved.trainingFocuses : [saved.selectedFocus ?? fallback.selectedFocus],
    activeMatch: undefined,
    lastMatch: saved.lastMatch ? cloneLastMatchSummary(saved.lastMatch) : undefined,
    lastTraining: saved.lastTraining ? cloneTrainingSummary(saved.lastTraining) : undefined,
  };
}

function normalizePlayer(savedPlayer: GameState["player"] | undefined, savedDynasty: GameState["dynasty"] | undefined, fallbackPlayer: GameState["player"]) {
  return {
    firstName: savedPlayer?.firstName ?? fallbackPlayer.firstName,
    lastName: savedPlayer?.lastName ?? savedDynasty?.familyName ?? fallbackPlayer.lastName,
    nationality: savedPlayer?.nationality ?? savedDynasty?.nationality ?? fallbackPlayer.nationality,
  };
}

export function normalizeSavedClub(savedClub?: ClubState, savedContract?: Contract): ClubState {
  if (savedClub?.name && savedClub?.tierId) {
    return {
      ...initialClub,
      ...savedClub,
      shortName: savedClub.shortName ?? getClubShortName(savedClub.name),
      shortCode: savedClub.shortCode ?? getClubShortCode(savedClub.name),
      strength: savedClub.strength ?? leagueTiers[savedClub.tierId].averageOvr,
    };
  }

  if (savedContract?.club) {
    const marketClub = contractMarketClubs.find((club) => club.club === savedContract.club);
    const tierId = savedContract.tierId ?? marketClub?.tierId ?? initialClub.tierId;
    return {
      name: savedContract.club,
      shortName: getClubShortName(savedContract.club),
      shortCode: marketClub?.short ?? getClubShortCode(savedContract.club),
      tierId,
      strength: getClubStrengthForTier(tierId, marketClub?.roleBias ?? 0),
    };
  }

  return { ...initialClub };
}

export function mergeSavedAttributes(savedAttributes: Attribute[]) {
  return initialAttributes.map((initialAttribute) => {
    const saved = savedAttributes.find((attribute) => attribute.label === initialAttribute.label);
    return saved ? { ...initialAttribute, ...saved } : { ...initialAttribute };
  });
}

function isSupportedSaveVersion(version: unknown) {
  return version === SAVE_VERSION;
}

function normalizeSupportUpgrades(savedSupport?: Partial<Record<string, number>>) {
  const normalized = { ...initialSupportUpgrades };
  if (!savedSupport) {
    return normalized;
  }

  Object.keys(initialSupportUpgrades).forEach((upgradeId) => {
    const savedLevel = savedSupport[upgradeId];
    if (typeof savedLevel === "number") {
      normalized[upgradeId as SupportUpgradeId] = clampSupportLevel(upgradeId as SupportUpgradeId, savedLevel);
    }
  });

  const legacy = savedSupport;
  const hasLegacySupport = ["coach", "nutrition", "recovery", "agent", "lifestyle", "analyst", "boots"].some((upgradeId) => typeof legacy[upgradeId] === "number");
  if (!hasLegacySupport) {
    return normalized;
  }

  const coach = legacy.coach ?? 0;
  const nutrition = legacy.nutrition ?? 0;
  const recovery = legacy.recovery ?? 0;
  const agent = legacy.agent ?? 0;
  const lifestyle = legacy.lifestyle ?? 0;
  const analyst = legacy.analyst ?? 0;
  const boots = legacy.boots ?? 0;

  normalized.xpFloor = clampSupportLevel("xpFloor", normalized.xpFloor + coach * 3);
  normalized.xpCeiling = clampSupportLevel("xpCeiling", normalized.xpCeiling + coach * 3);
  normalized.focusSlot2Unlock = clampSupportLevel("focusSlot2Unlock", normalized.focusSlot2Unlock + Math.min(5, coach));
  normalized.focusSlot2Efficiency = clampSupportLevel("focusSlot2Efficiency", normalized.focusSlot2Efficiency + Math.max(0, coach - 3) * 4);
  normalized.focusSlot3Unlock = clampSupportLevel("focusSlot3Unlock", normalized.focusSlot3Unlock + Math.min(8, Math.max(0, coach - 7)));
  normalized.focusSlot3Efficiency = clampSupportLevel("focusSlot3Efficiency", normalized.focusSlot3Efficiency + Math.max(0, coach - 10) * 3);

  normalized.trainingLoad = clampSupportLevel("trainingLoad", normalized.trainingLoad + nutrition * 3);
  normalized.matchRecovery = clampSupportLevel("matchRecovery", normalized.matchRecovery + recovery * 3 + Math.floor(boots / 2));
  normalized.recoveryBaseline = clampSupportLevel("recoveryBaseline", normalized.recoveryBaseline + Math.floor((nutrition + recovery) * 2));

  normalized.agentNegotiation = clampSupportLevel("agentNegotiation", normalized.agentNegotiation + agent * 4);
  normalized.sponsorshipAppeal = clampSupportLevel("sponsorshipAppeal", normalized.sponsorshipAppeal + lifestyle * 3 + analyst * 2);

  return normalized;
}

function normalizeDynasty(savedDynasty: DynastyState | undefined, fallbackDynasty: DynastyState): DynastyState {
  return {
    ...fallbackDynasty,
    ...(savedDynasty ?? {}),
    familyName: savedDynasty?.familyName ?? fallbackDynasty.familyName,
    nationality: savedDynasty?.nationality ?? fallbackDynasty.nationality,
    upgrades: normalizeDynastyUpgrades(savedDynasty?.upgrades as Partial<Record<string, number>> | undefined),
  };
}

function normalizeDynastyUpgrades(savedUpgrades?: Partial<Record<string, number>>) {
  const normalized = { ...initialDynastyUpgrades };
  if (!savedUpgrades) {
    return normalized;
  }

  Object.keys(initialDynastyUpgrades).forEach((upgradeId) => {
    const savedLevel = savedUpgrades[upgradeId];
    if (typeof savedLevel === "number") {
      normalized[upgradeId as DynastyUpgradeId] = clampDynastyLevel(upgradeId as DynastyUpgradeId, savedLevel);
    }
  });

  return normalized;
}

function clampDynastyLevel(upgradeId: DynastyUpgradeId, level: number) {
  return Math.max(0, Math.min(dynastyUpgradeMap[upgradeId].maxLevel, Math.round(level)));
}

function clampSupportLevel(upgradeId: SupportUpgradeId, level: number) {
  return Math.max(0, Math.min(supportUpgradeMap[upgradeId].maxLevel, Math.round(level)));
}

export function saveGameState(game: GameState) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: SavePayload = {
    version: SAVE_VERSION,
    game: cloneGameState(game),
  };
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}

export function clearSavedGame() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SAVE_KEY);
}
