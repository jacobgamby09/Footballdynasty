import { seededNoise } from "../engine/matchEngineCore";
import { clamp } from "../utils";
import type { ClubLegacyRecord, ClubLegacyStatus, ClubRecordKey, ClubRecordSet, ClubState, HonoursState, WorldClub } from "../types";

// Credible, deterministic all-time records for a club, scaled by league tier + reputation. They never
// start at 0 — each is held by a long-gone club legend, so the player has a real target. Pure (no
// Math.random / Date.now) and reproducible per club, so untouched clubs can be regenerated on demand
// rather than persisted (see HONOURS_LEGACY_PLAN.md).
export function seedClubRecords(club: WorldClub, tier: { averageOvr: number }): ClubRecordSet {
  const noise = (key: string) => seededNoise(`club-records-${club.id}-${key}`); // 0..1, stable per club
  const tierScale = clamp((tier.averageOvr - 42) / 38, 0, 1); // ~0 grassroots .. ~1 elite
  const repScale = clamp(club.reputation / 100, 0, 1);
  const lift = tierScale * 0.7 + repScale * 0.3;
  const round = (value: number) => Math.round(value);
  return {
    appearances: { value: round(230 + lift * 170 + noise("apps") * 110), holder: "club-legend" },
    goalsAllTime: { value: round(58 + lift * 92 + noise("goals") * 55), holder: "club-legend" },
    assistsAllTime: { value: round(40 + lift * 58 + noise("assists") * 38), holder: "club-legend" },
    goalsInSeason: { value: round(17 + lift * 11 + noise("season-goals") * 8), holder: "club-legend" },
    bestSeasonRating: { value: Number((7.4 + lift * 0.6 + noise("rating") * 0.4).toFixed(1)), holder: "club-legend" },
  };
}

export const CLUB_RECORD_ROWS: { key: ClubRecordKey; label: string; decimals?: number }[] = [
  { key: "appearances", label: "Appearances" },
  { key: "goalsAllTime", label: "All-time goals" },
  { key: "assistsAllTime", label: "All-time assists" },
  { key: "goalsInSeason", label: "Best season goals" },
  { key: "bestSeasonRating", label: "Best season rating", decimals: 1 },
];

// --- Club Legacy accrual + status ----------------------------------------------------------------
// A status, never a currency. The score is driven mostly by milestones (seasons, promotions, honours,
// records) so routine appearances move it slowly. Status is absolute on this tenure/output score, so a
// long-serving player can become a legend at a small club without being globally famous. Accrual only
// touches honours state (never goals/assists/XP), so it is OVR-neutral.
const CLUB_LEGACY_TIERS: { status: ClubLegacyStatus; min: number }[] = [
  { status: "Club Legend", min: 1300 },
  { status: "Club Icon", min: 750 },
  { status: "Club Hero", min: 400 },
  { status: "Fan Favourite", min: 180 },
  { status: "First-Team Regular", min: 60 },
  { status: "New Arrival", min: 0 },
];

function clubKey(club: ClubState): string {
  return club.clubId ?? club.shortCode ?? club.name;
}

export function getClubLegacyScore(record: ClubLegacyRecord): number {
  return Math.round(
    record.appearances * 0.5 +
      record.goals * 4 +
      record.assists * 2 +
      record.seasons * 20 +
      record.promotions * 80 +
      record.honours.length * 70 +
      record.recordsHeld.length * 100,
  );
}

export function getClubLegacyStatus(score: number): ClubLegacyStatus {
  return (CLUB_LEGACY_TIERS.find((tier) => score >= tier.min) ?? CLUB_LEGACY_TIERS[CLUB_LEGACY_TIERS.length - 1]).status;
}

export function emptyClubLegacyRecord(clubId: string, clubName: string): ClubLegacyRecord {
  return {
    clubId,
    clubName,
    seasons: 1,
    appearances: 0,
    starts: 0,
    goals: 0,
    assists: 0,
    ratingTotal: 0,
    ratingCount: 0,
    promotions: 0,
    honours: [],
    recordsHeld: [],
    legacyScore: 0,
    status: "New Arrival",
    frozen: false,
  };
}

function rescore(record: ClubLegacyRecord): ClubLegacyRecord {
  const legacyScore = getClubLegacyScore(record);
  return { ...record, legacyScore, status: getClubLegacyStatus(legacyScore) };
}

export type ClubLegacyMatchContribution = { appeared: boolean; started: boolean; goals: number; assists: number; rating: number };

// Accrue one match into the active club's legacy record. Any other still-active record is frozen here
// (lazy freeze-on-move), and a fresh record is created the first time the player turns out for a club.
export function accrueClubLegacyMatch(honours: HonoursState, club: ClubState, contribution: ClubLegacyMatchContribution): HonoursState {
  const id = clubKey(club);
  const existing = honours.clubLegacy.find((record) => !record.frozen && record.clubId === id);
  const others = honours.clubLegacy
    .filter((record) => record !== existing)
    .map((record) => (!record.frozen && record.clubId !== id ? { ...record, frozen: true } : record));
  const base = existing ?? emptyClubLegacyRecord(id, club.name);
  const merged = rescore({
    ...base,
    appearances: base.appearances + (contribution.appeared ? 1 : 0),
    starts: base.starts + (contribution.started ? 1 : 0),
    goals: base.goals + contribution.goals,
    assists: base.assists + contribution.assists,
    ratingTotal: base.ratingTotal + (contribution.appeared ? contribution.rating : 0),
    ratingCount: base.ratingCount + (contribution.appeared ? 1 : 0),
  });
  return { ...honours, clubLegacy: [...others, merged] };
}

// Record season awards/trophies the player won at the active club (climbs Club Legacy via the honours
// weight in the score). Cabinet entries are written separately.
export function addClubLegacyHonours(honours: HonoursState, club: ClubState, honourIds: string[]): HonoursState {
  if (honourIds.length === 0) {
    return honours;
  }
  const id = clubKey(club);
  let changed = false;
  const clubLegacy = honours.clubLegacy.map((record) => {
    if (record.frozen || record.clubId !== id) {
      return record;
    }
    changed = true;
    return rescore({ ...record, honours: [...record.honours, ...honourIds] });
  });
  return changed ? { ...honours, clubLegacy } : honours;
}

// Season rollover: the active club's record gains a season (and a promotion, if the club went up).
export function accrueClubLegacySeason(honours: HonoursState, club: ClubState, promoted: boolean): HonoursState {
  const id = clubKey(club);
  let changed = false;
  const clubLegacy = honours.clubLegacy.map((record) => {
    if (record.frozen || record.clubId !== id) {
      return record;
    }
    changed = true;
    return rescore({ ...record, seasons: record.seasons + 1, promotions: record.promotions + (promoted ? 1 : 0) });
  });
  return changed ? { ...honours, clubLegacy } : honours;
}

// --- Status rewards (loyalty pays) ---------------------------------------------------------------
// Club Legacy status feeds existing systems, not new mechanics: a trust floor (the club backs a hero
// through a slump), a renewal wage bonus, and a retirement Legacy Points contribution.
export function getActiveClubLegacy(honours: HonoursState, club: ClubState): ClubLegacyRecord | undefined {
  const id = clubKey(club);
  return honours.clubLegacy.find((record) => !record.frozen && record.clubId === id);
}

export function getClubLegacyTrustFloor(status?: ClubLegacyStatus): number {
  switch (status) {
    case "Club Legend": return 62;
    case "Club Icon": return 52;
    case "Club Hero": return 42;
    case "Fan Favourite": return 28;
    default: return 0;
  }
}

export function getClubLegacyWageBonus(status?: ClubLegacyStatus): number {
  switch (status) {
    case "Club Legend": return 0.24;
    case "Club Icon": return 0.16;
    case "Club Hero": return 0.1;
    case "Fan Favourite": return 0.05;
    case "First-Team Regular": return 0.02;
    default: return 0;
  }
}

const STATUS_LEGACY_BONUS: Record<ClubLegacyStatus, number> = {
  "New Arrival": 0,
  "First-Team Regular": 0,
  "Fan Favourite": 10,
  "Club Hero": 35,
  "Club Icon": 70,
  "Club Legend": 120,
};

// Retirement payout contribution: honours won across every club + the bloodline's highest standing.
export function getHonoursLegacyPoints(honours: HonoursState): number {
  const honoursCount = honours.clubLegacy.reduce((sum, record) => sum + record.honours.length, 0);
  const bestStatus = honours.clubLegacy.reduce((max, record) => Math.max(max, STATUS_LEGACY_BONUS[record.status] ?? 0), 0);
  return Math.round(honoursCount * 6 + bestStatus);
}
