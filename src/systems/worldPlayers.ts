import { seededNoise } from "../engine/matchEngineCore";
import { clamp } from "../utils";
import type { PositionGroup } from "../positionRoles";
import type { HonoursState, LeaguePlayerSeasonStats, World, WorldClub, WorldPlayer } from "../types";

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

// --- Matchweek distribution ----------------------------------------------------------------------
// Spread each club's weekly goalsFor across its regenerated squad (position + overall weighted), and
// give the starting XI an appearance + a seeded rating, accumulating into the ephemeral per-season
// buffer. Deterministic (seeded per club per week); runs for the player's league only.
const GOAL_WEIGHT: Record<PositionGroup, number> = { Forward: 1, Winger: 0.6, Midfielder: 0.35, Fullback: 0.08, Centerback: 0.04 };
const ASSIST_WEIGHT: Record<PositionGroup, number> = { Winger: 1, Midfielder: 0.8, Forward: 0.5, Fullback: 0.4, Centerback: 0.1 };

function emptyStats(player: WorldPlayer): LeaguePlayerSeasonStats {
  return { playerId: player.id, clubId: player.clubId, apps: 0, starts: 0, minutes: 0, goals: 0, assists: 0, ratingTotal: 0, ratingCount: 0 };
}

function pickWeighted(pool: { player: WorldPlayer; weight: number }[], roll: number): WorldPlayer {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return pool[0].player;
  let target = roll * total;
  for (const entry of pool) {
    target -= entry.weight;
    if (target <= 0) return entry.player;
  }
  return pool[pool.length - 1].player;
}

export function accrueLeagueSeasonStats(
  honours: HonoursState,
  world: World,
  leagueId: string,
  weekResults: Record<string, { goalsFor: number; outcome: "W" | "D" | "L" }>,
  weekIndex: number,
): HonoursState {
  const league = world.leagues[leagueId];
  if (!league) {
    return honours;
  }
  const byId = new Map(honours.leagueSeasonStats.map((stat) => [stat.playerId, { ...stat }]));
  const getEntry = (player: WorldPlayer) => {
    let entry = byId.get(player.id);
    if (!entry) {
      entry = emptyStats(player);
      byId.set(player.id, entry);
    }
    return entry;
  };

  for (const clubId of league.clubIds) {
    const club = world.clubs[clubId];
    const result = weekResults[clubId];
    if (!club || !result) {
      continue;
    }
    const squad = regenerateSquad(club);
    const noise = (key: string) => seededNoise(`lss-s${world.seasonNumber}-w${weekIndex}-${clubId}-${key}`);

    const starters = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 11);
    starters.forEach((player, index) => {
      const entry = getEntry(player);
      entry.apps += 1;
      entry.starts += 1;
      entry.minutes += 90;
      const base = result.outcome === "W" ? 6.95 : result.outcome === "L" ? 6.25 : 6.6;
      const rating = clamp(base + (player.overall - club.strength) * 0.03 + (noise(`rate-${index}`) - 0.5) * 0.6, 5.5, 9.3);
      entry.ratingTotal += rating;
      entry.ratingCount += 1;
    });

    const goalPool = squad.map((player) => ({ player, weight: GOAL_WEIGHT[player.positionGroup] * (player.overall / 100) }));
    for (let goal = 0; goal < result.goalsFor; goal += 1) {
      const scorer = pickWeighted(goalPool, noise(`goal-${goal}`));
      getEntry(scorer).goals += 1;
      if (noise(`assist-${goal}`) < 0.65) {
        const creatorPool = squad
          .filter((player) => player.id !== scorer.id)
          .map((player) => ({ player, weight: ASSIST_WEIGHT[player.positionGroup] * (player.overall / 100) }));
        const creator = pickWeighted(creatorPool, noise(`assist-pick-${goal}`));
        getEntry(creator).assists += 1;
      }
    }
  }

  return { ...honours, leagueSeasonStats: [...byId.values()] };
}
