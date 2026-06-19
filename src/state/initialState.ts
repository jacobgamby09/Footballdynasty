import { positionModules } from "../positionRoles";
import type { ClubState, Contract, GameState } from "../types";
import { initialDynasty } from "../data/attributes";
import { initialClub } from "../data/leagues";
import { initialSupportUpgrades } from "../data/support";
import { seedWorld } from "../data/world";
import { createGenerationAttributes } from "../systems/generation";
import { createSeasonFixtures } from "../systems/club";

// The player's club is a real world club from the start (Stage C): find the seeded
// entry by short code and mirror it, carrying its clubId so the player can be
// promoted/relegated with the club.
const initialWorld = seedWorld();
const playerWorldClub = Object.values(initialWorld.clubs).find((c) => c.shortCode === initialClub.shortCode);
const initialPlayerClub: ClubState = playerWorldClub
  ? {
      clubId: playerWorldClub.id,
      name: playerWorldClub.name,
      shortName: playerWorldClub.shortName,
      shortCode: playerWorldClub.shortCode,
      tierId: playerWorldClub.tierId,
      strength: playerWorldClub.strength,
    }
  : initialClub;

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


export const initialState: GameState = {
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
  seasonStats: {
    apps: 0,
    starts: 0,
    goals: 0,
    assists: 0,
    ratings: [],
  },
  season: {
    season: 1,
    fixtureIndex: 0,
    fixtures: createSeasonFixtures(initialPlayerClub),
    results: [],
  },
  club: initialPlayerClub,
  world: initialWorld,
  dynasty: initialDynasty,
  dynastyHistory: [],
  contract: initialContract,
  supportUpgrades: initialSupportUpgrades,
  lastEvent: "Pre-season complete. Your first senior fixture is waiting.",
};
