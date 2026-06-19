import { clamp } from "../utils";
import { createLeagueTeams, createSeasonFixtures } from "./club";
import { contractFromOffer, getContractOfferSummary, getPromisedRole } from "./contracts";
import { getAverageRating, roundToNearest } from "./formatting";
import { getClubLeagueTier, getContractLeagueTier } from "./ovr";
import { getCurrentFixture, getSeasonGoals, getSeasonRecord } from "./seasonState";
import { getSelectionReport } from "./selection";
import { getSupportLevel, getSupportTrackBreakthroughCount } from "./support";
import { findLeagueByClubShortCode, findLeagueByTier, getWorldLeagueTable, rolloverWorldSeason } from "./world";
import type { Contract, ContractOffer, DynastySeason, GameState, LeagueTableRow } from "../types";

export function getDynastyTotals(seasons: DynastySeason[]) {
  const totals = seasons.reduce(
    (sum, season) => ({
      apps: sum.apps + season.apps,
      goals: sum.goals + season.goals,
      assists: sum.assists + season.assists,
      ratingWeightedSum: sum.ratingWeightedSum + season.averageRating * season.apps,
    }),
    { apps: 0, goals: 0, assists: 0, ratingWeightedSum: 0 },
  );

  return {
    apps: totals.apps,
    goals: totals.goals,
    assists: totals.assists,
    averageRating: totals.apps > 0 ? totals.ratingWeightedSum / totals.apps : 6.4,
  };
}


export function startNextSeasonState(state: GameState): GameState {
  const review = getSeasonReview(state);
  const contractOffer = getSeasonContractOffer(state, review);
  const dynastySeason = createDynastySeasonSnapshot(state, review);
  const nextWeek = state.week + 1;
  const nextSeason = state.season.season + 1;

  return {
    ...state,
    week: nextWeek,
    cash: state.cash + review.cashReward + contractOffer.signingBonus,
    prestige: state.prestige + review.prestigeReward,
    contract: contractFromOffer(contractOffer),
    trainingCompletedWeek: nextWeek - 1,
    seasonStats: {
      apps: 0,
      starts: 0,
      goals: 0,
      assists: 0,
      ratings: [],
    },
    season: {
      season: nextSeason,
      fixtureIndex: 0,
      fixtures: createSeasonFixtures(state.club),
      results: [],
    },
    world: rolloverWorldSeason(state.world, state.club.shortCode),
    dynastyHistory: [...state.dynastyHistory, dynastySeason],
    lastTraining: undefined,
    contractOffer: undefined,
    activeMatch: undefined,
    lastEvent: `Season ${nextSeason} begins. ${contractOffer.title}: $${contractOffer.weeklyWage}/wk.`,
  };
}


export function createDynastySeasonSnapshot(state: GameState, review = getSeasonReview(state)): DynastySeason {
  return {
    season: state.season.season,
    club: state.contract.club,
    leaguePosition: review.tablePosition,
    record: `${review.record.wins}-${review.record.draws}-${review.record.losses}`,
    apps: state.seasonStats.apps,
    starts: state.seasonStats.starts,
    goals: state.seasonStats.goals,
    assists: state.seasonStats.assists,
    averageRating: Number(review.averageRating.toFixed(1)),
  };
}


export function getSeasonContractOffer(game: GameState, review = getSeasonReview(game)): ContractOffer {
  const current = game.contract;
  const agentLevel = getSupportLevel(game, "agent");
  const careerBreakthroughs = getSupportTrackBreakthroughCount(game, "career");
  const rolePromise = getPromisedRole(review.selection.score, current.rolePromise);
  const performanceWage = 90 + review.selection.score * 3 + Math.max(0, review.averageRating - 6.2) * 90 + game.seasonStats.goals * 14 + game.seasonStats.assists * 9;
  const weeklyWage = roundToNearest(Math.max(current.weeklyWage, performanceWage) * (1 + agentLevel * 0.04 + careerBreakthroughs * 0.035), 10);
  const pressureModifier = rolePromise === "Starter" ? 8 : rolePromise === "Rotation Starter" ? 5 : rolePromise === "Impact Sub" ? 2 : 0;
  const title = weeklyWage > current.weeklyWage || rolePromise !== current.rolePromise ? "Improved terms" : "Contract extended";

  return {
    club: current.club,
    label: rolePromise === "Starter" ? "First team deal" : rolePromise === "Rotation Starter" ? "Rotation deal" : "Development deal",
    title,
    weeklyWage,
    weeks: 12,
    rolePromise,
    appearanceBonus: roundToNearest(18 + weeklyWage * 0.16, 5),
    goalBonus: roundToNearest(30 + weeklyWage * 0.28, 5),
    assistBonus: roundToNearest(22 + weeklyWage * 0.22, 5),
    signingBonus: roundToNearest(
      weeklyWage * (review.verdict.grade === "A" ? 2.2 : review.verdict.grade === "B" ? 1.5 : 0.8) * (1 + agentLevel * 0.08 + careerBreakthroughs * 0.06),
      10,
    ),
    pressureModifier,
    summary: getContractOfferSummary(rolePromise, weeklyWage, current.weeklyWage),
    source: "current-club",
    tierId: getContractLeagueTier(current).id,
  };
}


export function getLeagueTable(game: GameState): LeagueTableRow[] {
  const season = game.season;
  const clubRecord = getSeasonRecord(season.results);
  const clubGoals = getSeasonGoals(season.results);
  const played = season.results.length;

  // Read standings from the persistent world when present (Stage 2: accumulated).
  if (game.world) {
    const league = findLeagueByClubShortCode(game.world, game.club.shortCode) ?? findLeagueByTier(game.world, game.club.tierId);
    if (league) {
      return getWorldLeagueTable(game.world, league.id);
    }
  }

  // Fallback: legacy template-derived table (pre-world saves / sim-lab states).
  const tier = getClubLeagueTier(game.club);
  const table = createLeagueTeams(game.club).map((team) => {
    if (team.short === game.club.shortCode) {
      return {
        name: team.name,
        short: team.short,
        position: 0,
        played,
        wins: clubRecord.wins,
        draws: clubRecord.draws,
        losses: clubRecord.losses,
        goalDifference: clubGoals.for - clubGoals.against,
        points: clubRecord.points,
      };
    }

    const teamPlayed = played;
    const strengthGap = team.strength - tier.averageOvr;
    const wins = clamp(Math.floor(teamPlayed * 0.32 + strengthGap / 8), 0, teamPlayed);
    const draws = clamp(Math.round(teamPlayed * 0.22 + ((team.short.charCodeAt(0) + played) % 2)), 0, teamPlayed - wins);
    const losses = Math.max(0, teamPlayed - wins - draws);
    const goalDifference = Math.round(strengthGap / 2 + wins - losses + ((team.short.charCodeAt(1) + played) % 3) - 1);

    return {
      name: team.name,
      short: team.short,
      position: 0,
      played: teamPlayed,
      wins,
      draws,
      losses,
      goalDifference,
      points: wins * 3 + draws,
    };
  });

  return table
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || a.name.localeCompare(b.name))
    .map((row, index) => ({ ...row, position: index + 1 }));
}


export function getSeasonReview(game: GameState) {
  const record = getSeasonRecord(game.season.results);
  const goals = getSeasonGoals(game.season.results);
  const table = getLeagueTable(game);
  const clubRow = table.find((row) => row.short === game.club.shortCode);
  const averageRating = getAverageRating(game.seasonStats.ratings);
  const selection = getSelectionReport(game, getCurrentFixture(game.season));
  const goalDifference = goals.for - goals.against;
  const outputBonus = game.seasonStats.goals * 45 + game.seasonStats.assists * 30;
  const ratingBonus = Math.max(0, Math.round((averageRating - 6.3) * 120));
  const tableBonus = Math.max(0, 9 - (clubRow?.position ?? 8)) * 15;
  const cashReward = 180 + game.seasonStats.apps * 25 + outputBonus + ratingBonus + tableBonus;
  const prestigeReward = Math.max(
    1,
    Math.round(
      game.seasonStats.goals * 0.8 +
        game.seasonStats.assists * 0.6 +
        Math.max(0, averageRating - 6.2) * 4 +
        Math.max(0, goalDifference) * 0.15 +
        Math.max(0, 8 - (clubRow?.position ?? 8)) * 0.7,
    ),
  );
  const verdict = getSeasonVerdict(game, clubRow?.position ?? table.length, averageRating);

  return {
    record,
    goals,
    tablePosition: clubRow?.position ?? table.length,
    averageRating,
    selection,
    cashReward,
    prestigeReward,
    verdict,
    marketInterest: getMarketInterest(selection.score, averageRating, game.prestige + prestigeReward),
    contractOutlook: getContractOutlook(selection.score, averageRating, game.seasonStats.apps),
  };
}


export function getSeasonVerdict(game: GameState, tablePosition: number, averageRating: number) {
  const goalInvolvements = game.seasonStats.goals + game.seasonStats.assists;

  if (averageRating >= 7.1 || goalInvolvements >= 8 || tablePosition <= 2) {
    return {
      grade: "A",
      title: "Breakout campaign",
      copy: "The staff see real momentum. You are starting to look like a player who can force a bigger role next season.",
    };
  }

  if (averageRating >= 6.7 || goalInvolvements >= 4 || game.trust >= 52) {
    return {
      grade: "B",
      title: "Clear progress",
      copy: "A solid year with enough good moments to keep the pathway open. More consistency will decide the next jump.",
    };
  }

  if (averageRating >= 6.2 || game.seasonStats.apps >= 6) {
    return {
      grade: "C",
      title: "Useful minutes",
      copy: "You stayed involved and learned the level. The next season needs sharper output to change your status.",
    };
  }

  return {
    grade: "D",
    title: "Development year",
    copy: "The club still sees potential, but you need stronger training weeks and cleaner match moments to climb.",
  };
}


export function getMarketInterest(selectionScore: number, averageRating: number, prestige: number) {
  if (selectionScore >= 70 || averageRating >= 7.2 || prestige >= 35) {
    return "Regional clubs";
  }
  if (selectionScore >= 55 || averageRating >= 6.8 || prestige >= 20) {
    return "Local attention";
  }
  return "Club pathway";
}


export function getContractOutlook(selectionScore: number, averageRating: number, apps: number) {
  if (selectionScore >= 68 || averageRating >= 7.1) {
    return "Your agent expects a stronger squad promise if this form carries into pre-season.";
  }
  if (selectionScore >= 50 || apps >= 8) {
    return "The club wants another season of steady minutes before making a bigger commitment.";
  }
  return "The staff still view you as a project, so training output matters immediately next season.";
}

