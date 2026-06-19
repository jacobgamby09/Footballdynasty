import { getPositionModule } from "../positionRoles";
import type { Attribute, ClubState, Contract, GameState, LastMatchSummary, SavePayload, TrainingSummary, World } from "../types";
import { initialAttributes } from "../data/attributes";
import { contractMarketClubs, initialClub, leagueTiers } from "../data/leagues";
import { seedWorld } from "../data/world";
import { createSeasonFixtures, getClubShortCode, getClubShortName, getClubStrengthForTier } from "../systems/club";
import { initialState } from "./initialState";

const SAVE_KEY = "football-dynasty-save";
const SAVE_VERSION = 5;

function cloneWorld(world: World): World {
  return {
    seasonNumber: world.seasonNumber,
    tierOrder: [...world.tierOrder],
    countries: Object.fromEntries(Object.entries(world.countries ?? {}).map(([id, c]) => [id, { ...c, tiers: [...c.tiers] }])) as World["countries"],
    clubs: Object.fromEntries(Object.entries(world.clubs).map(([id, club]) => [id, { ...club }])),
    leagues: Object.fromEntries(Object.entries(world.leagues).map(([id, league]) => [id, { ...league, clubIds: [...league.clubIds] }])),
    leagueSeasons: Object.fromEntries(
      Object.entries(world.leagueSeasons ?? {}).map(([id, ls]) => [
        id,
        { leagueId: ls.leagueId, records: Object.fromEntries(Object.entries(ls.records).map(([cid, rec]) => [cid, { ...rec }])) },
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
    dynasty: { ...state.dynasty },
    dynastyHistory: state.dynastyHistory.map((season) => ({ ...season })),
    contract: { ...state.contract },
    contractOffer: state.contractOffer ? { ...state.contractOffer } : undefined,
    supportUpgrades: { ...state.supportUpgrades },
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
    specialistXp: { ...(summary.specialistXp ?? {}) },
    specialist: summary.specialist ?? "finishing",
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
    if (payload.version !== SAVE_VERSION || !payload.game) {
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
  return {
    ...fallback,
    ...saved,
    positionCode: getPositionModule(saved.positionGroup ?? fallback.positionGroup).shortCode,
    archetype: saved.archetype ?? getPositionModule(saved.positionGroup ?? fallback.positionGroup).defaultArchetype,
    attributes: mergeSavedAttributes(saved.attributes ?? fallback.attributes),
    world: saved.world ? cloneWorld(saved.world) : seedWorld(),
    seasonStats: {
      ...fallback.seasonStats,
      ...saved.seasonStats,
      ratings: [...(saved.seasonStats?.ratings ?? [])],
    },
    season: {
      ...fallback.season,
      ...saved.season,
      fixtures: saved.season?.fixtures?.length ? saved.season.fixtures.map((fixture) => ({ ...fixture })) : createSeasonFixtures(savedClub),
      results: saved.season?.results?.map((result) => ({ ...result })) ?? [],
    },
    club: savedClub,
    dynasty: { ...fallback.dynasty, ...(saved.dynasty ?? {}) },
    dynastyHistory: saved.dynastyHistory?.map((season) => ({ ...season })) ?? [],
    contract: { ...fallback.contract, ...(saved.contract ?? {}) },
    contractOffer: saved.contractOffer ? { ...saved.contractOffer } : undefined,
    supportUpgrades: { ...fallback.supportUpgrades, ...(saved.supportUpgrades ?? {}) },
    trainingFocuses: saved.trainingFocuses?.length ? saved.trainingFocuses : [saved.selectedFocus ?? fallback.selectedFocus],
    trainingSpecialist: saved.trainingSpecialist ?? fallback.trainingSpecialist,
    activeMatch: undefined,
    lastMatch: saved.lastMatch ? cloneLastMatchSummary(saved.lastMatch) : undefined,
    lastTraining: saved.lastTraining ? cloneTrainingSummary(saved.lastTraining) : undefined,
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
