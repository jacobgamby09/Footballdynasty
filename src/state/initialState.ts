import { positionModules } from "../positionRoles";
import type { ClubState, Contract, CountryId, DynastySeason, DynastyState, GameState, NewCareerSetup } from "../types";
import { initialDynasty } from "../data/attributes";
import { initialClub } from "../data/leagues";
import { initialSupportUpgrades } from "../data/support";
import { seedWorld } from "../data/world";
import { createGenerationAttributes } from "../systems/generation";
import { createSeasonFixturesFromWorld } from "../systems/club";
import { getDynastyNetworkBonus } from "../systems/dynastyUpgrades";
import { getEstateHeirCash } from "../systems/estate";

export const initialContract: Contract = {
  club: initialClub.name,
  tierId: initialClub.tierId,
  label: "Trial terms",
  weeklyWage: 45,
  weeksRemaining: 4,
  rolePromise: "Impact Sub",
  appearanceBonus: 8,
  goalBonus: 18,
  assistBonus: 12,
  pressureModifier: 0,
};


// Build a fresh Gen-1 career starting in the weakest (lowest-reputation) club of the
// chosen country's bottom division — "start from the bottom" (Stage E). Each call
// returns an independent state (no shared mutable refs). Gen 2+ will instead be
// offer-driven (the son inherits a name) as part of the dynasty loop.
export function createCareerForCountry(
  countryId: CountryId,
  options: { dynasty?: DynastyState; dynastyHistory?: DynastySeason[]; setup?: NewCareerSetup; firstName?: string } = {},
): GameState {
  const setup = options.setup ?? {
    firstName: options.firstName ?? "Jonas",
    lastName: options.dynasty?.familyName ?? initialDynasty.familyName,
    nationality: options.dynasty?.nationality ?? initialDynasty.nationality,
    positionGroup: "Forward" as const,
  };
  const dynasty = {
    ...(options.dynasty ?? initialDynasty),
    familyName: setup.lastName,
    nationality: setup.nationality,
  };
  const positionModule = positionModules[setup.positionGroup];
  const world = seedWorld();
  const bottomLeague = Object.values(world.leagues)
    .filter((league) => league.countryId === countryId)
    .sort((a, b) => b.level - a.level)[0];
  const clubsInBottom = bottomLeague.clubIds.map((id) => world.clubs[id]);
  const startClub = clubsInBottom.reduce((min, c) => (c.strength < min.strength ? c : min), clubsInBottom[0]);
  const club: ClubState = {
    clubId: startClub.id,
    name: startClub.name,
    shortName: startClub.shortName,
    shortCode: startClub.shortCode,
    tierId: startClub.tierId,
    strength: startClub.strength,
  };
  const networkBonus = getDynastyNetworkBonus(dynasty);
  const startingWage = initialContract.weeklyWage + networkBonus * 8;
  // Heir inherits the family trust fund as starting cash (Stage 3) — a material head start.
  const startingCash = 420 + networkBonus * 60 + getEstateHeirCash(dynasty);
  const startingTrust = 38 + networkBonus * 2;
  // Inherited family standing: later generations start with a prestige floor grown
  // from the bloodline's past success, so sponsor access arrives sooner each gen.
  const startingPrestige = 12 + Math.round(dynasty.reputation ?? 0);

  return {
    week: 1,
    player: {
      firstName: setup.firstName,
      lastName: setup.lastName,
      nationality: setup.nationality,
    },
    positionGroup: setup.positionGroup,
    positionCode: positionModule.shortCode,
    archetype: positionModule.defaultArchetype,
    cash: startingCash,
    prestige: startingPrestige,
    fitness: 86,
    morale: 74,
    pressure: 26,
    trust: startingTrust,
    selectedFocus: "Finishing",
    trainingFocuses: ["Finishing"],
    trainingCompletedWeek: 0,
    intensity: "Balanced",
    attributes: createGenerationAttributes(dynasty.generation, positionModule, dynasty),
    seasonStats: { apps: 0, starts: 0, goals: 0, assists: 0, ratings: [] },
    season: { season: 1, fixtureIndex: 0, fixtures: createSeasonFixturesFromWorld(club, world), results: [] },
    club,
    world,
    dynasty: { ...dynasty, upgrades: { ...dynasty.upgrades } },
    dynastyHistory: options.dynastyHistory ? options.dynastyHistory.map((season) => ({ ...season })) : [],
    contract: { ...initialContract, weeklyWage: startingWage, club: club.name, tierId: club.tierId },
    supportUpgrades: { ...initialSupportUpgrades },
    worldFeed: [],
    lastEvent: `Trial terms at ${club.name}. Your first senior fixture is waiting.`,
  };
}

// Default career, used as the load fallback before a country is chosen — Denmark.
export const initialState: GameState = createCareerForCountry("denmark");
