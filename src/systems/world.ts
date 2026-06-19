import { leagueTiers } from "../data/leagues";
import { emptyClubSeasonRecord } from "../data/world";
import type { ClubSeasonRecord, LeagueId, LeagueTableRow, LeagueTierId, World, WorldLeague } from "../types";

// Stage 1 links the player's embedded club to the world by shortCode; the clubId
// migration is Stage 4 (see WORLD_MODEL.md).
export function findLeagueByClubShortCode(world: World, shortCode: string): WorldLeague | undefined {
  const club = Object.values(world.clubs).find((c) => c.shortCode === shortCode);
  return club ? world.leagues[club.leagueId] : undefined;
}

export function findLeagueByTier(world: World, tierId: LeagueTierId): WorldLeague | undefined {
  return Object.values(world.leagues).find((league) => league.tierId === tierId);
}

// Build the table for a league directly from its stored, accumulated records.
export function getWorldLeagueTable(world: World, leagueId: LeagueId): LeagueTableRow[] {
  const league = world.leagues[leagueId];
  const season = world.leagueSeasons[leagueId];
  if (!league || !season) return [];

  const rows = league.clubIds.map((clubId) => {
    const club = world.clubs[clubId];
    const rec = season.records[clubId] ?? emptyClubSeasonRecord(clubId);
    return {
      name: club.name,
      short: club.shortCode,
      position: 0,
      played: rec.played,
      wins: rec.wins,
      draws: rec.draws,
      losses: rec.losses,
      goalDifference: rec.goalsFor - rec.goalsAgainst,
      points: rec.points,
    };
  });

  return rows
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || a.name.localeCompare(b.name))
    .map((row, index) => ({ ...row, position: index + 1 }));
}

export type ClubWeekResult = { outcome: "W" | "D" | "L"; goalsFor: number; goalsAgainst: number };

// Deterministic light sim of one matchweek for a non-player club. No RNG: the
// wobble is a fixed function of the club's code and the week index.
function simClubWeek(strengthGap: number, shortCode: string, weekIndex: number): ClubWeekResult {
  const c0 = shortCode.charCodeAt(0) || 0;
  const c1 = shortCode.charCodeAt(1) || 0;
  const wobble = ((c0 * 31 + c1 * 17 + weekIndex * 13) % 9) - 4; // -4..4
  const perf = strengthGap + wobble;
  if (perf >= 2) return { outcome: "W", goalsFor: perf >= 5 ? 3 : 2, goalsAgainst: perf >= 5 ? 0 : 1 };
  if (perf <= -2) return { outcome: "L", goalsFor: perf <= -5 ? 0 : 1, goalsAgainst: perf <= -5 ? 3 : 2 };
  return { outcome: "D", goalsFor: 1, goalsAgainst: 1 };
}

function addResult(rec: ClubSeasonRecord, r: ClubWeekResult): ClubSeasonRecord {
  return {
    ...rec,
    played: rec.played + 1,
    wins: rec.wins + (r.outcome === "W" ? 1 : 0),
    draws: rec.draws + (r.outcome === "D" ? 1 : 0),
    losses: rec.losses + (r.outcome === "L" ? 1 : 0),
    goalsFor: rec.goalsFor + r.goalsFor,
    goalsAgainst: rec.goalsAgainst + r.goalsAgainst,
    points: rec.points + (r.outcome === "W" ? 3 : r.outcome === "D" ? 1 : 0),
  };
}

// Advance every league by one matchweek. The player's club takes its real result;
// every other club gets a deterministic light-sim result. Returns a new World.
export function advanceWorldMatchweek(
  world: World,
  playerShortCode: string,
  playerResult: ClubWeekResult,
  weekIndex: number,
): World {
  const leagueSeasons = { ...world.leagueSeasons };

  for (const league of Object.values(world.leagues)) {
    const tier = leagueTiers[league.tierId];
    const prev = world.leagueSeasons[league.id];
    const records: Record<string, ClubSeasonRecord> = { ...(prev?.records ?? {}) };

    for (const clubId of league.clubIds) {
      const club = world.clubs[clubId];
      const base = records[clubId] ?? emptyClubSeasonRecord(clubId);
      const result =
        club.shortCode === playerShortCode
          ? playerResult
          : simClubWeek(club.strength - tier.averageOvr, club.shortCode, weekIndex);
      records[clubId] = addResult(base, result);
    }

    leagueSeasons[league.id] = { leagueId: league.id, records };
  }

  return { ...world, leagueSeasons };
}

// Reset all standings for a new season. (Stage 2b will apply promotion/relegation
// and strength drift before this reset.)
export function resetWorldSeason(world: World): World {
  const leagueSeasons: Record<string, { leagueId: string; records: Record<string, ClubSeasonRecord> }> = {};
  for (const league of Object.values(world.leagues)) {
    leagueSeasons[league.id] = {
      leagueId: league.id,
      records: Object.fromEntries(league.clubIds.map((id) => [id, emptyClubSeasonRecord(id)])),
    };
  }
  return { ...world, seasonNumber: world.seasonNumber + 1, leagueSeasons };
}
