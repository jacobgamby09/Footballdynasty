import { seededNoise } from "../engine/matchEngineCore";
import { clamp } from "../utils";
import type { PositionGroup } from "../positionRoles";
import type { WorldClub, WorldPlayer } from "../types";

// Lightweight, deterministic NPC competitors for the award race. A club's squad is regenerated from
// its id on demand (never persisted); only the players' accumulated season stats are stored. Pure:
// seededNoise only, no Math.random / Date.now, so the same club yields the same squad every reload.

const FIRST_NAMES = [
  "Lukas", "Mathias", "Oliver", "Noah", "Elias", "Victor", "Felix", "Anton", "Jonas", "Emil",
  "Sebastian", "Adrian", "Marco", "Diego", "Pablo", "Mateo", "Hugo", "Leon", "Finn", "Tobias",
  "Rasmus", "Magnus", "Kasper", "Daniel", "Andre", "Marcus", "Dominic", "Julian", "Samuel", "Nikolas",
  "Ruben", "Thiago", "Lorenzo", "Mark", "Stefan", "Bruno", "Ivan", "Milan", "Kai", "Theo",
];

const LAST_NAMES = [
  "Berg", "Holm", "Nielsen", "Andersen", "Larsen", "Moller", "Sorensen", "Lindqvist", "Bauer", "Keller",
  "Romano", "Costa", "Silva", "Mendez", "Torres", "Navarro", "Fischer", "Wagner", "Brandt", "Sommer",
  "Kovac", "Novak", "Horvat", "Petrov", "Walsh", "Doyle", "Hayes", "Reid", "Clarke", "Whelan",
  "Janssen", "Visser", "Bakker", "Lindgren", "Ferreira", "Bianchi", "Marin", "Vidal", "Falk", "Stein",
];

// ~18-player outfield squad. Goalkeepers aren't a PositionGroup in this sim, so the award race (top
// scorer / assists / rating) runs on outfielders — which is where those awards are decided anyway.
const SQUAD_COMPOSITION: PositionGroup[] = [
  "Centerback", "Centerback", "Centerback", "Centerback",
  "Fullback", "Fullback", "Fullback",
  "Midfielder", "Midfielder", "Midfielder", "Midfielder",
  "Winger", "Winger", "Winger", "Winger",
  "Forward", "Forward", "Forward",
];

export function regenerateSquad(club: WorldClub): WorldPlayer[] {
  const noise = (key: string) => seededNoise(`squad-${club.id}-${key}`); // 0..1, stable per club
  return SQUAD_COMPOSITION.map((positionGroup, index) => {
    // Spread overall around the club's strength: a few stars above, squad players below.
    const overall = clamp(Math.round(club.strength - 7 + noise(`ovr-${index}`) * 16), 28, 99);
    const age = 18 + Math.floor(noise(`age-${index}`) * 18); // 18..35
    const first = FIRST_NAMES[Math.floor(noise(`first-${index}`) * FIRST_NAMES.length) % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(noise(`last-${index}`) * LAST_NAMES.length) % LAST_NAMES.length];
    return {
      id: `${club.id}-p${index}`,
      name: `${first} ${last}`,
      age,
      clubId: club.id,
      positionGroup,
      overall,
    };
  });
}
