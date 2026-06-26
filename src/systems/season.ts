import { clamp } from "../utils";
import { getPositionModule } from "../positionRoles";
import { createLeagueTeams, createSeasonFixturesFromWorld } from "./club";
import { contractFromOffer, getContractOfferSummary, getPromisedRole } from "./contracts";
import { getAverageRating, roundToNearest } from "./formatting";
import { accrueClubLegacySeason, addClubLegacyHonours } from "./honours";
import { computeSeasonAwards } from "./worldPlayers";
import { calculateOvr, getClubLeagueTier, getContractLeagueTier } from "./ovr";
import { getPrestigeLeverageScore, getSeasonPrestigeReward } from "./prestige";
import { getCurrentFixture, getSeasonGoals, getSeasonRecord } from "./seasonState";
import { getSelectionReport } from "./selection";
import { getAgentSigningBonusLeverage, getAgentWageLeverage, getMarqueeBonus, getSupportLevel, getSupportTrackBreakthroughCount } from "./support";
import { findLeagueByClubShortCode, findLeagueByTier, getWorldLeagueTable, rolloverWorldSeason } from "./world";
import type { ClubState, Contract, ContractOffer, DynastySeason, GameState, LeagueTableRow } from "../types";

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
  // Review/offer use the OLD state (this season's results) — compute before rollover.
  const review = getSeasonReview(state);
  const needsAutoContract = state.contract.weeksRemaining <= 0;
  const contractOffer = needsAutoContract ? getSeasonContractOffer(state, review) : undefined;
  const dynastySeason = createDynastySeasonSnapshot(state, review);
  const nextWeek = state.week + 1;
  const nextSeason = state.season.season + 1;

  // Roll the world (per-country promotion/relegation), then mirror the player's club
  // to its world entity — if it moved division, the player follows it (Stage C).
  const newWorld = rolloverWorldSeason(state.world);
  const worldClub =
    (state.club.clubId && newWorld.clubs[state.club.clubId]) ||
    Object.values(newWorld.clubs).find((c) => c.shortCode === state.club.shortCode);
  const syncedClub: ClubState = worldClub
    ? { clubId: worldClub.id, name: worldClub.name, shortName: worldClub.shortName, shortCode: worldClub.shortCode, tierId: worldClub.tierId, strength: worldClub.strength }
    : state.club;

  const oldTier = getClubLeagueTier(state.club);
  const newTier = getClubLeagueTier(syncedClub);
  const promoted = newTier.averageOvr > oldTier.averageOvr;
  // Bank the season's honours (computed before the buffer clear): individual awards + team trophies
  // (league title, promotion) derived from the season just ended.
  const awards = computeSeasonAwards(state);
  const teamTrophies = [
    ...(review.tablePosition === 1 ? [{ id: "league-title", label: "League Title", detail: `${syncedClub.name} champions` }] : []),
    ...(promoted ? [{ id: "promotion", label: "Promotion", detail: `Up to ${newTier.name}` }] : []),
  ];
  const makeEntry = (id: string, label: string, detail: string, kind: "team" | "individual") => ({
    id: `g${state.dynasty.generation}-s${state.season.season}-${id}`,
    kind,
    label,
    season: state.season.season,
    generation: state.dynasty.generation,
    clubId: state.club.clubId,
    detail,
  });
  const honourEntries = [
    ...awards.playerAwards.map((award) => makeEntry(award.id, award.label, award.detail, "individual")),
    ...teamTrophies.map((trophy) => makeEntry(trophy.id, trophy.label, trophy.detail, "team")),
  ];
  const rolledHonours = addClubLegacyHonours(
    accrueClubLegacySeason(state.honours, state.club, promoted),
    state.club,
    [...awards.playerAwards.map((award) => award.id), ...teamTrophies.map((trophy) => trophy.id)],
  );
  const moveNote =
    newTier.averageOvr > oldTier.averageOvr
      ? `${syncedClub.name} promoted to ${newTier.name}! `
      : newTier.averageOvr < oldTier.averageOvr
        ? `${syncedClub.name} relegated to ${newTier.name}. `
        : "";

  return {
    ...state,
    week: nextWeek,
    cash: state.cash + review.cashReward + (contractOffer?.signingBonus ?? 0),
    prestige: state.prestige + review.prestigeReward + awards.prestige,
    contract: contractOffer ? { ...contractFromOffer(contractOffer), tierId: syncedClub.tierId } : { ...state.contract, tierId: syncedClub.tierId },
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
      fixtures: createSeasonFixturesFromWorld(syncedClub, newWorld),
      results: [],
    },
    club: syncedClub,
    world: newWorld,
    // Club Legacy (seasons/promotions + banked award honours), then wipe the ephemeral per-season
    // NPC stats buffer now that this season's awards have been computed.
    honours: { ...rolledHonours, leagueSeasonStats: [] },
    dynasty: { ...state.dynasty, cabinet: { entries: [...state.dynasty.cabinet.entries, ...honourEntries] } },
    dynastyHistory: [...state.dynastyHistory, dynastySeason],
    lastTraining: undefined,
    contractOffer: undefined,
    contractOffers: undefined,
    transferWindow: undefined,
    activeMatch: undefined,
    lastEvent: contractOffer
      ? `${moveNote}Season ${nextSeason} begins. ${contractOffer.title}: $${contractOffer.weeklyWage}/wk.`
      : `${moveNote}Season ${nextSeason} begins. ${state.contract.club}: $${state.contract.weeklyWage}/wk.`,
  };
}


export function createDynastySeasonSnapshot(state: GameState, review = getSeasonReview(state)): DynastySeason {
  return {
    season: state.season.season,
    generation: state.dynasty.generation,
    club: state.contract.club,
    tierId: state.club.tierId,
    leaguePosition: review.tablePosition,
    record: `${review.record.wins}-${review.record.draws}-${review.record.losses}`,
    apps: state.seasonStats.apps,
    starts: state.seasonStats.starts,
    goals: state.seasonStats.goals,
    assists: state.seasonStats.assists,
    averageRating: Number(review.averageRating.toFixed(1)),
    endOvr: calculateOvr(state.attributes, getPositionModule(state.positionGroup).ovrWeights),
    prestige: state.prestige,
  };
}


export function getSeasonContractOffer(game: GameState, review = getSeasonReview(game)): ContractOffer {
  const current = game.contract;
  const tier = getContractLeagueTier(current);
  const agentLevel = getSupportLevel(game, "agentNegotiation");
  const careerBreakthroughs = getSupportTrackBreakthroughCount(game, "career");
  const rolePromise = getPromisedRole(review.selection.score, current.rolePromise);
  const performanceWage =
    tier.wageRange[0] +
    review.selection.score * 0.9 +
    Math.max(0, review.averageRating - 6.2) * 32 +
    Math.min(90, game.seasonStats.goals * 3 + game.seasonStats.assists * 2);
  const roleCapRatio: Record<typeof rolePromise, number> = {
    Bench: 0.45,
    "Impact Sub": 0.58,
    "Rotation Starter": 0.74,
    Starter: 0.9,
  };
  const wageCap = tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * roleCapRatio[rolePromise];
  const leverage = 1 + getAgentWageLeverage(agentLevel) + careerBreakthroughs * 0.018;
  const weeklyWage = roundToNearest(clamp(Math.max(current.weeklyWage, performanceWage) * leverage, tier.wageRange[0], wageCap), 10);
  const pressureModifier = rolePromise === "Starter" ? 8 : rolePromise === "Rotation Starter" ? 5 : rolePromise === "Impact Sub" ? 2 : 0;
  const title = weeklyWage > current.weeklyWage || rolePromise !== current.rolePromise ? "Improved terms" : "Contract extended";
  const seasonLength = Math.max(12, game.season.fixtures.length || 30);
  const weeks = rolePromise === "Starter" ? seasonLength * 2 : rolePromise === "Rotation Starter" ? Math.round(seasonLength * 1.5) : seasonLength;

  return {
    club: current.club,
    label: rolePromise === "Starter" ? "First team deal" : rolePromise === "Rotation Starter" ? "Rotation deal" : "Development deal",
    title,
    weeklyWage,
    weeks,
    rolePromise,
    appearanceBonus: roundToNearest(12 + weeklyWage * 0.08, 5),
    goalBonus: roundToNearest(20 + weeklyWage * 0.14, 5),
    assistBonus: roundToNearest(16 + weeklyWage * 0.11, 5),
    signingBonus: roundToNearest(
      weeklyWage *
        (review.verdict.grade === "A" ? 0.9 : review.verdict.grade === "B" ? 0.6 : 0.35) *
        (1 + getAgentSigningBonusLeverage(agentLevel) + careerBreakthroughs * 0.03),
      10,
    ),
    pressureModifier,
    summary: getContractOfferSummary(rolePromise, weeklyWage, current.weeklyWage),
    source: "current-club",
    tierId: tier.id,
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
  const tablePosition = clubRow?.position ?? table.length;
  const prestigeReward = Math.round(
    getSeasonPrestigeReward({
      game,
      averageRating,
      tablePosition,
      goalDifference,
    }) * (1 + getMarqueeBonus(game)),
  );
  const verdict = getSeasonVerdict(game, clubRow?.position ?? table.length, averageRating);

  return {
    record,
    goals,
    tablePosition,
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
  const prestigeLeverage = getPrestigeLeverageScore(prestige);
  if (selectionScore >= 70 || averageRating >= 7.2 || prestigeLeverage >= 30) {
    return "Regional clubs";
  }
  if (selectionScore >= 55 || averageRating >= 6.8 || prestigeLeverage >= 18) {
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

