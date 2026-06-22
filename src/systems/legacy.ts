import { leagueTiers } from "../data/leagues";
import { getPositionModule } from "../positionRoles";
import { calculateOvr } from "./ovr";
import { getAverageRating } from "./formatting";
import { createDynastySeasonSnapshot } from "./season";
import type { DynastySeason, GameState, LeagueTierId } from "../types";

export type LegacyComponent = {
  label: string;
  value: string;
  points: number;
};

export type LegacyEstimate = {
  age: number;
  eligible: boolean;
  seasons: DynastySeason[];
  totalPoints: number;
  basePoints: number;
  multiplier: number;
  multiplierLabel: string;
  components: LegacyComponent[];
  momentum: "Rising" | "Stable" | "Declining";
  hint: string;
};

const RETIREMENT_AGE = 30;

export function getPlayerAge(game: Pick<GameState, "season">) {
  return 16 + Math.max(0, game.season.season - 1);
}

export function getLegacyEstimate(game: GameState): LegacyEstimate {
  const age = getPlayerAge(game);
  const seasons = getLegacySeasons(game);
  const totals = getLegacyCareerTotals(game, seasons);
  const tier = getHighestTier(game, seasons);
  const multiplier = getLegacyTierMultiplier(tier);
  const ratingPoints = Math.max(0, totals.averageRating - 6.4) * 40;
  const components: LegacyComponent[] = [
    {
      label: "Peak OVR",
      value: `${totals.peakOvr}`,
      points: Math.max(0, Math.pow(Math.max(0, totals.peakOvr - 20), 1.25)),
    },
    {
      label: "Appearances",
      value: `${totals.apps}`,
      points: Math.sqrt(totals.apps) * 2,
    },
    {
      label: "Goals",
      value: `${totals.goals}`,
      points: Math.sqrt(totals.goals) * 3,
    },
    {
      label: "Assists",
      value: `${totals.assists}`,
      points: Math.sqrt(totals.assists) * 2.5,
    },
    {
      label: "Avg rating",
      value: totals.averageRating.toFixed(1),
      points: ratingPoints,
    },
    {
      label: "Prestige",
      value: `${game.prestige}`,
      points: Math.sqrt(game.prestige) * 1.2,
    },
  ].map((component) => ({ ...component, points: Math.round(component.points) }));

  const basePoints = components.reduce((sum, component) => sum + component.points, 0);
  const totalPoints = Math.max(0, Math.round(basePoints * multiplier));
  const momentum = getLegacyMomentum(age, totals.averageRating, game.seasonStats.apps);

  return {
    age,
    eligible: age >= RETIREMENT_AGE,
    seasons,
    totalPoints,
    basePoints,
    multiplier,
    multiplierLabel: leagueTiers[tier].name,
    components,
    momentum,
    hint: getLegacyHint(age, momentum),
  };
}

export function getLegacyCareerTotals(game: GameState, seasons = getLegacySeasons(game)) {
  const positionModule = getPositionModule(game.positionGroup);
  const currentOvr = calculateOvr(game.attributes, positionModule.ovrWeights);
  const peakOvr = Math.max(currentOvr, ...seasons.map((season) => season.endOvr ?? 0));
  const apps = seasons.reduce((sum, season) => sum + season.apps, 0);
  const goals = seasons.reduce((sum, season) => sum + season.goals, 0);
  const assists = seasons.reduce((sum, season) => sum + season.assists, 0);
  const ratingWeightedSum = seasons.reduce((sum, season) => sum + season.averageRating * Math.max(1, season.apps), 0);
  const ratingWeight = seasons.reduce((sum, season) => sum + Math.max(1, season.apps), 0);

  return {
    apps,
    goals,
    assists,
    peakOvr,
    currentOvr,
    averageRating: ratingWeight > 0 ? ratingWeightedSum / ratingWeight : getAverageRating(game.seasonStats.ratings),
  };
}

export function getLegacySeasons(game: GameState) {
  const current = createDynastySeasonSnapshot(game);
  const shouldIncludeCurrent =
    game.season.results.length > 0 ||
    game.seasonStats.apps > 0 ||
    game.seasonStats.goals > 0 ||
    game.seasonStats.assists > 0;

  return shouldIncludeCurrent ? [...game.dynastyHistory, current] : [...game.dynastyHistory];
}

function getHighestTier(game: GameState, seasons: DynastySeason[]) {
  const tiers = [game.club.tierId, ...seasons.map((season) => season.tierId).filter(Boolean)] as LeagueTierId[];
  return tiers.reduce((best, tier) => (getTierIndex(tier) > getTierIndex(best) ? tier : best), game.club.tierId);
}

function getTierIndex(tierId: LeagueTierId) {
  return Object.keys(leagueTiers).indexOf(tierId);
}

function getLegacyTierMultiplier(tierId: LeagueTierId) {
  const multipliers: Record<LeagueTierId, number> = {
    "grassroots-dev": 1,
    "local-semi-pro": 1.15,
    "regional-pro": 1.35,
    "national-pro": 1.6,
    "top-flight": 2,
    elite: 2.5,
  };
  return multipliers[tierId];
}

function getLegacyMomentum(age: number, averageRating: number, currentSeasonApps: number): LegacyEstimate["momentum"] {
  if (age <= 31 && (averageRating >= 6.8 || currentSeasonApps >= 16)) return "Rising";
  if (age >= 34 && averageRating < 6.7) return "Declining";
  return "Stable";
}

function getLegacyHint(age: number, momentum: LegacyEstimate["momentum"]) {
  if (age < RETIREMENT_AGE) {
    return `${RETIREMENT_AGE - age} season${RETIREMENT_AGE - age === 1 ? "" : "s"} before retirement is available.`;
  }
  if (momentum === "Rising") {
    return "Your run still has upside. Another strong season may be worth more than retiring now.";
  }
  if (momentum === "Declining") {
    return "Legacy growth is slowing. Retirement may be efficient if the next generation is ready.";
  }
  return "A balanced point to decide whether one more season is worth the risk and fatigue.";
}
