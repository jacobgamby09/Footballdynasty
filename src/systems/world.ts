import { leagueTiers } from "../data/leagues";
import { emptyClubSeasonRecord } from "../data/world";
import type { ClubSeasonRecord, LeagueId, LeagueTableRow, LeagueTierId, World, WorldClub, WorldLeague } from "../types";

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

// Deterministic, seed-varied pseudo-random in [0,1). No Math.random (it would break
// the sim-lab and save-resume): the same seed always yields the same value, but
// different seeds spread out, so results feel unpredictable yet reproducible.
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// Light sim of one matchweek for a non-player club. Strength is the main driver;
// the wobble varies by club AND season, so tables are not identical year to year.
function simClubWeek(strengthGap: number, shortCode: string, weekIndex: number, seasonNumber: number): ClubWeekResult {
  const wobble = Math.round((hash01(`${shortCode}|w${weekIndex}|s${seasonNumber}`) - 0.5) * 10); // ~ -5..5
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
          : simClubWeek(club.strength - tier.averageOvr, club.shortCode, weekIndex, world.seasonNumber);
      records[clubId] = addResult(base, result);
    }

    leagueSeasons[league.id] = { leagueId: league.id, records };
  }

  return { ...world, leagueSeasons };
}

function freshLeagueSeasons(leagues: Record<string, WorldLeague>): World["leagueSeasons"] {
  const leagueSeasons: World["leagueSeasons"] = {};
  for (const league of Object.values(leagues)) {
    leagueSeasons[league.id] = {
      leagueId: league.id,
      records: Object.fromEntries(league.clubIds.map((id) => [id, emptyClubSeasonRecord(id)])),
    };
  }
  return leagueSeasons;
}

// Reset all standings for a new season, keeping current league memberships.
export function resetWorldSeason(world: World): World {
  return { ...world, seasonNumber: world.seasonNumber + 1, leagueSeasons: freshLeagueSeasons(world.leagues) };
}

function sortedClubIdsByRecord(world: World, leagueId: LeagueId): string[] {
  const league = world.leagues[leagueId];
  const records = world.leagueSeasons[leagueId]?.records ?? {};
  return [...league.clubIds].sort((a, b) => {
    const ra = records[a] ?? emptyClubSeasonRecord(a);
    const rb = records[b] ?? emptyClubSeasonRecord(b);
    const gdA = ra.goalsFor - ra.goalsAgainst;
    const gdB = rb.goalsFor - rb.goalsAgainst;
    return rb.points - ra.points || gdB - gdA || world.clubs[a].name.localeCompare(world.clubs[b].name);
  });
}

// End-of-season rollover: apply promotion/relegation between adjacent leagues from
// the final standings, drift moved clubs toward their new tier, reset standings and
// bump the season clock. The player's club is pinned (its tier is driven by the
// player's career/transfers, not the world sim) — see WORLD_MODEL.md.
export function rolloverWorldSeason(world: World, playerShortCode: string): World {
  const newLeagueOf: Record<string, LeagueId> = {};
  for (const club of Object.values(world.clubs)) newLeagueOf[club.id] = club.leagueId;

  const isPlayer = (clubId: string) => world.clubs[clubId].shortCode === playerShortCode;

  // Decide all moves from the ORIGINAL standings before applying any, so a club
  // promoted this rollover cannot also cascade upward in the same rollover.
  for (let i = 0; i < world.tierOrder.length - 1; i++) {
    const lower = findLeagueByTier(world, world.tierOrder[i]);
    const upper = findLeagueByTier(world, world.tierOrder[i + 1]);
    if (!lower || !upper) continue;

    const promote = sortedClubIdsByRecord(world, lower.id).filter((id) => !isPlayer(id)).slice(0, lower.promotionSlots);
    for (const id of promote) newLeagueOf[id] = upper.id;

    if (upper.relegationSlots > 0) {
      const upperSorted = sortedClubIdsByRecord(world, upper.id).filter((id) => !isPlayer(id));
      const relegate = upperSorted.slice(Math.max(0, upperSorted.length - upper.relegationSlots));
      for (const id of relegate) newLeagueOf[id] = lower.id;
    }
  }

  const clubs: Record<string, WorldClub> = {};
  for (const club of Object.values(world.clubs)) {
    const destLeagueId = newLeagueOf[club.id];
    if (destLeagueId === club.leagueId) {
      clubs[club.id] = { ...club };
      continue;
    }
    const destTierId = world.leagues[destLeagueId].tierId;
    const destTier = leagueTiers[destTierId];
    const isRelegation = destTier.averageOvr < leagueTiers[club.tierId].averageOvr;

    // Base drift toward the new tier, plus a seeded swing so the yo-yo is likely but
    // not guaranteed: ~30% of moves get a thematic shift (a relegated club sells its
    // best players -> extra drop; a promoted club invests -> extra boost), otherwise
    // a small +/-2 wobble. Seeded by club + season, so it is varied yet reproducible.
    const drift = club.strength + (destTier.averageOvr - club.strength) * 0.3;
    const bigSwing = hash01(`${club.id}|move|s${world.seasonNumber}`) < 0.3;
    const magnitude = 4 + Math.round(hash01(`${club.id}|mag|s${world.seasonNumber}`) * 3); // 4..7
    const smallWobble = Math.round((hash01(`${club.id}|sm|s${world.seasonNumber}`) - 0.5) * 4); // -2..2
    const swing = bigSwing ? (isRelegation ? -magnitude : magnitude) : smallWobble;
    const driftedStrength = Math.round(drift) + swing;

    clubs[club.id] = {
      ...club,
      leagueId: destLeagueId,
      tierId: destTierId,
      strength: Math.max(destTier.teamRange[0], Math.min(destTier.teamRange[1], driftedStrength)),
      reputation: club.reputation,
    };
  }

  const leagues: Record<string, WorldLeague> = {};
  for (const league of Object.values(world.leagues)) {
    leagues[league.id] = {
      ...league,
      clubIds: Object.values(clubs).filter((c) => c.leagueId === league.id).map((c) => c.id),
    };
  }

  return { ...world, clubs, leagues, seasonNumber: world.seasonNumber + 1, leagueSeasons: freshLeagueSeasons(leagues) };
}
