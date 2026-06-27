import { leagueTiers } from "../data/leagues";
import { seededNoise } from "../engine/matchEngineCore";
import { clamp } from "../utils";
import type { PositionGroup } from "../positionRoles";
import type { GameState, HonoursState, LeaguePlayerSeasonStats, World, WorldClub, WorldPlayer } from "../types";
import { findLeagueByClubShortCode } from "./world";

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

// --- League rows (shared) ------------------------------------------------------------------------
// One ranked row per competitor in the player's league: the NPC buffer + the player's own tally, with
// an award score used for Player-of-the-Year style awards. Names/ages/positions come from squads.
type LeagueRow = {
  id: string;
  name: string;
  club: string;
  clubId: string;
  goals: number;
  assists: number;
  apps: number;
  avg: number;
  age: number;
  positionGroup?: PositionGroup;
  isPlayer: boolean;
  awardScore: number;
};

function awardScoreOf(goals: number, assists: number, apps: number, avg: number): number {
  return avg * 9 + goals * 4 + assists * 2.2 + apps * 0.25;
}

function buildLeagueRows(game: GameState): { leagueId: string; tierId: string; rows: LeagueRow[] } | undefined {
  const league = findLeagueByClubShortCode(game.world, game.club.shortCode);
  if (!league) {
    return undefined;
  }
  const clubName: Record<string, string> = {};
  const playerById = new Map<string, WorldPlayer>();
  for (const clubId of league.clubIds) {
    const club = game.world.clubs[clubId];
    if (!club) continue;
    clubName[clubId] = club.name;
    for (const player of regenerateSquad(club)) playerById.set(player.id, player);
  }
  const rows: LeagueRow[] = game.honours.leagueSeasonStats
    .filter((stat) => clubName[stat.clubId] !== undefined)
    .map((stat) => {
      const wp = playerById.get(stat.playerId);
      const avg = stat.ratingCount > 0 ? stat.ratingTotal / stat.ratingCount : 0;
      return {
        id: stat.playerId,
        name: wp?.name ?? "Unknown",
        club: clubName[stat.clubId] ?? "",
        clubId: stat.clubId,
        goals: stat.goals,
        assists: stat.assists,
        apps: stat.apps,
        avg,
        age: wp?.age ?? 25,
        positionGroup: wp?.positionGroup,
        isPlayer: false,
        awardScore: awardScoreOf(stat.goals, stat.assists, stat.apps, avg),
      };
    });
  // Scope the player's row to the CURRENT league: if they moved leagues mid-season, subtract the
  // snapshot taken at the move so old-league goals never show in this league's table/awards.
  const baseline = game.seasonStats.leagueBaseline;
  const playerGoals = Math.max(0, game.seasonStats.goals - (baseline?.goals ?? 0));
  const playerAssists = Math.max(0, game.seasonStats.assists - (baseline?.assists ?? 0));
  const playerApps = Math.max(0, game.seasonStats.apps - (baseline?.apps ?? 0));
  const ratings = game.seasonStats.ratings.slice(baseline?.ratingCount ?? 0);
  const playerAvg = ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0;
  rows.push({
    id: "you",
    name: `${game.player.firstName} ${game.player.lastName}`,
    club: game.club.name,
    clubId: game.club.clubId ?? game.club.shortCode ?? game.club.name,
    goals: playerGoals,
    assists: playerAssists,
    apps: playerApps,
    avg: playerAvg,
    age: 15 + game.season.season,
    positionGroup: game.positionGroup,
    isPlayer: true,
    awardScore: awardScoreOf(playerGoals, playerAssists, playerApps, playerAvg),
  });
  // NPC names come from a finite pool, so the same name can recur across a league's ~360 players.
  // Disambiguate deterministically (by row order) so a leaderboard never shows one name twice — the
  // first keeps the plain name, later repeats get a middle initial. Display-only; stats key off id.
  const nameSeen = new Map<string, number>();
  for (const row of rows) {
    const count = (nameSeen.get(row.name) ?? 0) + 1;
    nameSeen.set(row.name, count);
    if (!row.isPlayer && count > 1) {
      const initial = String.fromCharCode(65 + ((count - 2) % 26));
      const [first, ...rest] = row.name.split(" ");
      row.name = rest.length > 0 ? `${first} ${initial}. ${rest.join(" ")}` : `${row.name} ${initial}`;
    }
  }

  return { leagueId: league.id, tierId: league.tierId, rows };
}

// --- League leaderboards -------------------------------------------------------------------------
export type LeaderboardEntry = { id: string; name: string; club: string; value: number; isPlayer: boolean };
export type LeagueLeaderboards = { topScorers: LeaderboardEntry[]; assistLeaders: LeaderboardEntry[]; topRated: LeaderboardEntry[] };

const RATING_MIN_APPS = 5;
const LEADERBOARD_SIZE = 8;

export function getLeagueLeaderboards(game: GameState): LeagueLeaderboards | undefined {
  const built = buildLeagueRows(game);
  if (!built) {
    return undefined;
  }
  const { rows } = built;
  const toEntry = (row: LeagueRow, value: number): LeaderboardEntry => ({ id: row.id, name: row.name, club: row.club, value, isPlayer: row.isPlayer });
  return {
    topScorers: [...rows].sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, LEADERBOARD_SIZE).map((row) => toEntry(row, row.goals)),
    assistLeaders: [...rows].sort((a, b) => b.assists - a.assists || b.goals - a.goals).slice(0, LEADERBOARD_SIZE).map((row) => toEntry(row, row.assists)),
    topRated: [...rows].filter((row) => row.apps >= RATING_MIN_APPS).sort((a, b) => b.avg - a.avg).slice(0, LEADERBOARD_SIZE).map((row) => toEntry(row, Number(row.avg.toFixed(2)))),
  };
}

// --- Season awards -------------------------------------------------------------------------------
// Data-driven end-of-season awards the player won (they compete on the same list as the NPCs). Prestige
// is tier-scaled: the same award is worth far more in a higher division. Other leagues use synthetic
// winners (not modelled here). Returned awards are banked into the cabinet + Club Legacy at rollover.
export type SeasonAward = { id: string; label: string; detail: string };

export function computeSeasonAwards(game: GameState): { playerAwards: SeasonAward[]; prestige: number } {
  const built = buildLeagueRows(game);
  if (!built) {
    return { playerAwards: [], prestige: 0 };
  }
  const { rows, tierId } = built;
  const player = rows.find((row) => row.isPlayer);
  if (!player || player.apps < 3) {
    return { playerAwards: [], prestige: 0 };
  }
  const multiplier = leagueTiers[tierId as keyof typeof leagueTiers]?.prestigeMultiplier ?? 1;
  const awards: SeasonAward[] = [];
  let prestige = 0;
  const win = (id: string, label: string, base: number, detail: string) => {
    awards.push({ id, label, detail });
    prestige += Math.round(base * multiplier);
  };
  const leaderBy = (compare: (a: LeagueRow, b: LeagueRow) => number, pool: LeagueRow[] = rows) => [...pool].sort(compare)[0];

  if (player.goals > 0 && leaderBy((a, b) => b.goals - a.goals || b.assists - a.assists).isPlayer) {
    win("top-scorer", "Golden Boot", 200, `${player.goals} league goals`);
  }
  if (player.assists > 0 && leaderBy((a, b) => b.assists - a.assists || b.goals - a.goals).isPlayer) {
    win("assist-leader", "Assist Leader", 120, `${player.assists} league assists`);
  }
  if (leaderBy((a, b) => b.awardScore - a.awardScore).isPlayer) {
    win("league-poty", "League Player of the Year", 400, "Top award score in the division");
  }
  const young = rows.filter((row) => row.age <= 21);
  if (player.age <= 21 && young.length > 0 && leaderBy((a, b) => b.awardScore - a.awardScore, young).isPlayer) {
    win("young-poty", "Young Player of the Year", 250, "Best under-21 in the division");
  }
  const clubRows = rows.filter((row) => row.clubId === player.clubId);
  if (clubRows.length > 1 && leaderBy((a, b) => b.awardScore - a.awardScore, clubRows).isPlayer) {
    win("club-poty", "Club Player of the Year", 120, player.club);
  }
  const teamOfSeason = [...rows].sort((a, b) => b.awardScore - a.awardScore).slice(0, 11);
  if (teamOfSeason.some((row) => row.isPlayer)) {
    win("team-of-season", "Team of the Season", 150, "Named in the league XI");
  }
  return { playerAwards: awards, prestige };
}
