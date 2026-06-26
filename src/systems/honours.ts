import { seededNoise } from "../engine/matchEngineCore";
import { clamp } from "../utils";
import type { ClubRecordKey, ClubRecordSet, WorldClub } from "../types";

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
