import { leagueTiers } from "../data/leagues";
import { clamp } from "../utils";
import type { LeagueId, LeagueTableRow, LeagueTierId, World, WorldLeague } from "../types";

// Stage 1 links the player's embedded club to the world by shortCode; the clubId
// migration is Stage 4 (see WORLD_MODEL.md).
export function findLeagueByClubShortCode(world: World, shortCode: string): WorldLeague | undefined {
  const club = Object.values(world.clubs).find((c) => c.shortCode === shortCode);
  return club ? world.leagues[club.leagueId] : undefined;
}

export function findLeagueByTier(world: World, tierId: LeagueTierId): WorldLeague | undefined {
  return Object.values(world.leagues).find((league) => league.tierId === tierId);
}

export type PlayerLeagueEntry = {
  shortCode: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalDifference: number;
};

// Build a league table from the persistent world clubs in `leagueId`. The player's
// club row uses real results; other clubs are still derived deterministically (the
// same formula as the legacy table) — Stage 2 replaces this with stored, accumulated
// records.
export function getWorldLeagueTable(world: World, leagueId: LeagueId, player: PlayerLeagueEntry): LeagueTableRow[] {
  const league = world.leagues[leagueId];
  if (!league) return [];
  const tier = leagueTiers[league.tierId];
  const played = player.played;

  const rows = league.clubIds.map((clubId) => {
    const club = world.clubs[clubId];
    if (club.shortCode === player.shortCode) {
      return {
        name: club.name,
        short: club.shortCode,
        position: 0,
        played,
        wins: player.wins,
        draws: player.draws,
        losses: player.losses,
        goalDifference: player.goalDifference,
        points: player.points,
      };
    }

    const strengthGap = club.strength - tier.averageOvr;
    const wins = clamp(Math.floor(played * 0.32 + strengthGap / 8), 0, played);
    const draws = clamp(Math.round(played * 0.22 + ((club.shortCode.charCodeAt(0) + played) % 2)), 0, played - wins);
    const losses = Math.max(0, played - wins - draws);
    const goalDifference = Math.round(strengthGap / 2 + wins - losses + ((club.shortCode.charCodeAt(1) + played) % 3) - 1);

    return {
      name: club.name,
      short: club.shortCode,
      position: 0,
      played,
      wins,
      draws,
      losses,
      goalDifference,
      points: wins * 3 + draws,
    };
  });

  return rows
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || a.name.localeCompare(b.name))
    .map((row, index) => ({ ...row, position: index + 1 }));
}
