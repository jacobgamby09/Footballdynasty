import { leagueTiers } from "../data/leagues";
import { clamp } from "../utils";
import type { GameState, LeagueTierId, MatchTotals, UpcomingMatch } from "../types";

export type PrestigeTier = {
  id: string;
  label: string;
  threshold: number;
  sponsorUnlock: string;
};

export const prestigeTiers: PrestigeTier[] = [
  { id: "local-prospect", label: "Local Prospect", threshold: 0, sponsorUnlock: "Local attention" },
  { id: "known-talent", label: "Known Talent", threshold: 350, sponsorUnlock: "Local sponsor interest" },
  { id: "regional-name", label: "Regional Name", threshold: 1_500, sponsorUnlock: "Regional sponsor interest" },
  { id: "national-profile", label: "National Profile", threshold: 7_500, sponsorUnlock: "National sponsor pool" },
  { id: "star-player", label: "Star Player", threshold: 20_000, sponsorUnlock: "Major brand access" },
  { id: "icon", label: "Icon", threshold: 50_000, sponsorUnlock: "Elite campaign deals" },
  { id: "legend", label: "Legend", threshold: 100_000, sponsorUnlock: "Legacy-defining sponsors" },
];

export function getPrestigeStatus(prestige: number) {
  const current = [...prestigeTiers].reverse().find((tier) => prestige >= tier.threshold) ?? prestigeTiers[0];
  const currentIndex = prestigeTiers.findIndex((tier) => tier.id === current.id);
  const next = prestigeTiers[currentIndex + 1];
  const span = next ? next.threshold - current.threshold : Math.max(1, current.threshold);
  const gainedInTier = Math.max(0, prestige - current.threshold);
  const progressPercent = next ? clamp(Math.round((gainedInTier / span) * 100), 0, 100) : 100;

  return {
    current,
    next,
    points: prestige,
    pointsInTier: gainedInTier,
    pointsToNext: next ? Math.max(0, next.threshold - prestige) : 0,
    nextThreshold: next?.threshold,
    progressPercent,
    tierIndex: currentIndex,
    sponsorInterest: current.sponsorUnlock,
  };
}

export function formatPrestigeCompact(prestige: number) {
  if (prestige >= 100_000) return `${Math.round(prestige / 1_000)}k`;
  if (prestige >= 10_000) return `${(prestige / 1_000).toFixed(1)}k`;
  if (prestige >= 1_000) return `${(prestige / 1_000).toFixed(1)}k`;
  return `${prestige}`;
}

export function getPrestigeLeverageScore(prestige: number) {
  return clamp(Math.round(Math.sqrt(Math.max(0, prestige)) * 1.35), 0, 100);
}

export function getMatchPrestigeDelta({
  totals,
  tierId,
  matchImportance,
  playerAppeared,
}: {
  totals: MatchTotals;
  tierId: LeagueTierId;
  matchImportance: UpcomingMatch["matchImportance"];
  playerAppeared: boolean;
}) {
  if (!playerAppeared) {
    return 0;
  }

  const tier = leagueTiers[tierId];
  const importanceMultiplier = matchImportance === "High" ? 1.35 : matchImportance === "Low" ? 0.8 : 1;
  const appearanceBonus = 2;
  const resultBonus = totals.teamGoals > totals.opponentGoals ? 3 : totals.teamGoals === totals.opponentGoals ? 1 : 0;
  const ratingBonus = Math.max(0, totals.rating - 6.2) * 5;
  const standoutBonus = totals.rating >= 7.5 ? 5 : totals.rating >= 7 ? 3 : 0;
  const outputBonus = totals.goals * 18 + totals.assists * 12 + totals.chancesCreated * 4;
  const base = appearanceBonus + resultBonus + ratingBonus + standoutBonus + outputBonus;

  return Math.max(0, Math.round(base * tier.prestigeMultiplier * importanceMultiplier));
}

export function getSeasonPrestigeReward({
  game,
  averageRating,
  tablePosition,
  goalDifference,
}: {
  game: GameState;
  averageRating: number;
  tablePosition: number;
  goalDifference: number;
}) {
  const tier = leagueTiers[game.club.tierId];
  const stats = game.seasonStats;
  const appearanceBonus = stats.apps * 1.2 + stats.starts * 1.8;
  const outputBonus = stats.goals * 14 + stats.assists * 9;
  const ratingBonus = Math.max(0, averageRating - 6.3) * 55;
  const tableBonus = Math.max(0, 9 - tablePosition) * 5;
  const campaignBonus = Math.max(0, goalDifference) * 0.7;
  const consistencyBonus = stats.apps >= 20 ? 18 : stats.apps >= 12 ? 8 : 0;

  return Math.max(1, Math.round((appearanceBonus + outputBonus + ratingBonus + tableBonus + campaignBonus + consistencyBonus) * tier.prestigeMultiplier));
}
