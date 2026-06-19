import { positionModules } from "../positionRoles";
import type { ClubState, Contract, CountryId, GameState } from "../types";
import { initialDynasty } from "../data/attributes";
import { initialClub } from "../data/leagues";
import { initialSupportUpgrades } from "../data/support";
import { seedWorld } from "../data/world";
import { createGenerationAttributes } from "../systems/generation";
import { createSeasonFixtures } from "../systems/club";

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
export function createCareerForCountry(countryId: CountryId): GameState {
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

  return {
    week: 1,
    positionGroup: "Forward",
    positionCode: positionModules.Forward.shortCode,
    archetype: positionModules.Forward.defaultArchetype,
    cash: 420,
    prestige: 12,
    fitness: 86,
    morale: 74,
    pressure: 26,
    trust: 38,
    selectedFocus: "Finishing",
    trainingFocuses: ["Finishing"],
    trainingSpecialist: "finishing",
    trainingCompletedWeek: 0,
    intensity: "Balanced",
    attributes: createGenerationAttributes(1),
    seasonStats: { apps: 0, starts: 0, goals: 0, assists: 0, ratings: [] },
    season: { season: 1, fixtureIndex: 0, fixtures: createSeasonFixtures(club), results: [] },
    club,
    world,
    dynasty: { ...initialDynasty },
    dynastyHistory: [],
    contract: { ...initialContract, club: club.name, tierId: club.tierId },
    supportUpgrades: { ...initialSupportUpgrades },
    lastEvent: `Trial terms at ${club.name}. Your first senior fixture is waiting.`,
  };
}

// Default career, used as the load fallback before a country is chosen — Denmark.
export const initialState: GameState = createCareerForCountry("denmark");
