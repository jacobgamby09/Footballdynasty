import { createPositionMatchPool } from "../engine/forwardMoments";
import { canQueueDirectorFollowUp, createMatchDirectorPlan } from "../engine/matchDirector";
import { aggregateMatchRating, chooseAutoSimChoice, createSimEvents, createTeamMatchModel, estimateChoiceOutcomes, getSimScoreAtMinute, resolvePlayerChoice, seededNoise } from "../engine/matchEngineCore";
import { getPositionModule } from "../positionRoles";
import { clamp } from "../utils";
import { advanceContractWeek, getClubContractOffer, getMatchContractEarnings, getTransferMarketOffers } from "./contracts";
import { accrueClubLegacyMatch, getActiveClubLegacy, getClubLegacyTrustFloor } from "./honours";
import { getFormScore } from "./formatting";
import { getAgeAdjustedAttributes, getPlayerAgeFromSeason } from "./aging";
import { calculateOvr, getAttributeValue, getClubLeagueTier, getContextualAbilityScore, getLeagueAdjustedAttributeValueMap, getLeagueAdjustedOpponentProfile } from "./ovr";
import { advanceSeasonFixture, createFixtureResult, getCurrentFixture, getNextFixtureAfterMatch, isSeasonComplete } from "./seasonState";
import { getPlayerMomentCount, getSelectionReport } from "./selection";
import { getMatchPrestigeDelta } from "./prestige";
import { getObjectiveResultLine, getSponsorMatchObjective } from "./matchObjective";
import { advanceSponsorWeek, getSponsorPayout } from "./sponsors";
import { applyRecoveryCeiling, applyRecoveryFloor, getAgingProfile, getConsistencyRatingFloor, getEliteConditioningCeilingBonus, getMarqueeBonus, getMatchActionRecoveryRelief, getRecoveryFitnessCeiling, getRecoveryFitnessFloor, getSponsorAppealBonus, getSupportLevel, getSupportTrackBreakthroughCount, getWeeklySupportRecoveryBonus } from "./support";
import { addAttributeXp, getDevelopmentEnvironment } from "./training";
import { advanceWorldMatchweek, findLeagueByClubShortCode } from "./world";
import { accrueLeagueSeasonStats } from "./worldPlayers";
import { createTransferWindowState } from "./transferWindow";
import { generateWeeklyFeed } from "./feed";
import type { AttributeKey, PositionModule } from "../positionRoles";
import type { Attribute, ChanceQuality, ChoiceOutcomePreview, GameState, HeatTier, LastMatchSummary, MatchChoice, MatchEvent, MatchMoment, MatchObjectiveResult, MatchResult, MatchState, MatchTotals, OutcomeTier, PlayerMatchEvent, SimMatchEvent, UpcomingMatch } from "../types";

export function getPreMatchEntryPlan(match: MatchState) {
  if (match.isInSquad === false || match.fitnessAvailability === "Not match fit") {
    return "Likely rested";
  }

  if (match.fitnessAvailability === "Risky") {
    return "Emergency only";
  }

  if (match.playerRole === "Starter") {
    return match.fitnessAvailability === "Tired"
      ? "Start, managed load"
      : "Start XI";
  }

  if (match.playerRole === "Rotation Starter") {
    return match.fitnessAvailability === "Tired" ? "Limited start" : "Start or early rotation";
  }

  if (match.playerRole === "Impact Sub") {
    return match.fitnessAvailability === "Tired" ? "If chasing late" : "Second-half option";
  }

  return "Late bench cover";
}


export function finishMatchState(state: GameState, results: MatchResult[]): GameState {
  const match = state.activeMatch;
  const simTotals = match ? summarizeSimEvents(match.events, match.events.length - 1) : undefined;
  const rawTotals = summarizeMatchResults(results, simTotals);
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
  const effectiveRecoveryBaselineLevel = getSupportLevel(state, "recoveryBaseline") * environment.supportEfficiency;
  const weeklyRecoveryBonus =
    1 +
    environment.recoveryBonus +
    getWeeklySupportRecoveryBonus(effectiveRecoveryBaselineLevel);
  const matchdayRecoveryBonus = match ? getMatchdayRecoveryBonus(match) : 0;
  const baseFitnessDelta = match
    ? getMatchFitnessDelta(match, results) + weeklyRecoveryBonus + matchdayRecoveryBonus
    : rawTotals.fitnessDelta + weeklyRecoveryBonus;
  const projectedFitness = clamp(state.fitness + baseFitnessDelta, 0, 100);
  const recoveryFloor = getRecoveryFitnessFloor(effectiveRecoveryBaselineLevel, recoveryBreakthroughs);
  // Elite conditioning lifts the fitness ceiling (stay fresher for longer) — non-OVR.
  const recoveryCeiling = Math.min(99, getRecoveryFitnessCeiling(effectiveRecoveryBaselineLevel, recoveryBreakthroughs) + getEliteConditioningCeilingBonus(state));
  // Sitting out the match is a full rest week: recover up to your conditioning ceiling (70 with no
  // recovery investment, climbing toward 88), not just the small matchday bump. Counts as rest if you
  // weren't picked to play (Bench role) OR logged no minutes — a token garbage-time cameo still rests.
  const satOut = match ? (match.playerRole === "Bench" || getPlayerMinutesPlayed(match) <= 0) : false;
  const restedProjection = satOut ? Math.max(projectedFitness, recoveryCeiling) : projectedFitness;
  const adjustedFitness = applyRecoveryCeiling(state.fitness, applyRecoveryFloor(state.fitness, restedProjection, recoveryFloor), recoveryCeiling);
  const totals = { ...rawTotals, fitnessDelta: adjustedFitness - state.fitness };
  // Club Legacy status sets a trust floor — a club hero is backed through a bad spell.
  const trustFloor = getClubLegacyTrustFloor(getActiveClubLegacy(state.honours, state.club)?.status);
  const trustAfter = clamp(state.trust + totals.trustDelta, trustFloor, 100);
  const playerAppeared = didPlayerAppear(match);
  // Consistency coaching raises the rating floor — bad games hurt less (non-OVR).
  if (playerAppeared) {
    totals.rating = Math.max(totals.rating, 5.4 + getConsistencyRatingFloor(state));
  }
  const moraleDelta = playerAppeared ? (totals.rating >= 7 ? 3 : -2) : 0;
  const contractEarnings = getMatchContractEarnings(state.contract, totals, playerAppeared);
  // Marquee status boosts both sponsor income (added to the appeal bonus) and prestige gain.
  const marqueeBonus = getMarqueeBonus(state);
  const sponsorPayout = applySponsorAppealBonus(
    getSponsorPayout(state.sponsor, totals, playerAppeared),
    getSponsorAppealBonus(getSupportLevel(state, "sponsorshipAppeal")) + marqueeBonus,
  );
  const cashDelta = contractEarnings.total + sponsorPayout.total;
  // The personal objective mirrors the sponsor's matchday target; the sponsor system pays the bonus
  // above, so here we only surface the completion (no second payout) for the summary + feed.
  const objectiveResult = match?.objective
    ? { objective: match.objective, completed: sponsorPayout.objectiveCompleted, progress: sponsorPayout.objectiveCompleted ? match.objective.target : 0 }
    : undefined;
  const prestigeDelta =
    (match
      ? Math.round(
          getMatchPrestigeDelta({
            totals,
            tierId: state.club.tierId,
            matchImportance: match.matchImportance,
            playerAppeared,
          }) * (1 + marqueeBonus),
        )
      : 0);
  const pressureDelta =
    totals.goals * 2 +
    (state.sponsor?.pressureModifier ?? 0);
  const selectionBefore = getSelectionReport(state, getCurrentFixture(state.season));
  const postMatchState = {
    ...state,
    trust: trustAfter,
    fitness: clamp(state.fitness + totals.fitnessDelta, 0, 100),
    morale: clamp(state.morale + moraleDelta, 0, 100),
    seasonStats: {
      ...state.seasonStats,
      ratings: playerAppeared ? [...state.seasonStats.ratings.slice(-4), totals.rating] : state.seasonStats.ratings,
    },
  };
  const selectionAfter = getSelectionReport(postMatchState, getNextFixtureAfterMatch(state.season));
  const roleBefore = match?.playerRole ?? selectionBefore.role;
  const roleAfter = selectionAfter.role;
  const lastMatch = match
    ? buildLastMatchSummary({
        match,
        results,
        totals,
        cashDelta,
        weeklyWage: contractEarnings.weeklyWage,
        appearanceBonus: contractEarnings.appearanceBonus,
        goalBonus: contractEarnings.goalBonus,
        assistBonus: contractEarnings.assistBonus,
        sponsorRetainer: sponsorPayout.retainer,
        sponsorObjectiveBonus: sponsorPayout.objectiveBonus,
        sponsorCashDelta: sponsorPayout.total,
        sponsorObjectiveCompleted: sponsorPayout.objectiveCompleted,
        sponsorName: sponsorPayout.sponsorName,
        prestigeDelta,
        moraleDelta,
        roleBefore,
        roleAfter,
        selectionBefore: selectionBefore.score,
        selectionAfter: selectionAfter.score,
        pointsToNextRole: selectionAfter.pointsToNextRole,
        objectiveResult,
      })
    : state.lastMatch;
  const fixtureResult = match
    ? createFixtureResult(match, totals)
    : undefined;
  const updatedSeasonStats = {
    apps: state.seasonStats.apps + (playerAppeared ? 1 : 0),
    starts: state.seasonStats.starts + (playerAppeared && match && isStartingRole(match.playerRole) ? 1 : 0),
    goals: state.seasonStats.goals + totals.goals,
    assists: state.seasonStats.assists + totals.assists,
    ratings: postMatchState.seasonStats.ratings,
  };
  const nextContract = advanceContractWeek(state.contract);
  const nextSponsor = advanceSponsorWeek(state.sponsor);
  const updatedSeason = fixtureResult
    ? advanceSeasonFixture(state.season, fixtureResult)
    : state.season;
  // Advance the persistent world by one matchweek: the player's club takes its real
  // result, every other club gets a deterministic light-sim result (see WORLD_MODEL.md).
  const matchweek = fixtureResult
    ? advanceWorldMatchweek(
        state.world,
        state.club.shortCode,
        { outcome: fixtureResult.outcome, goalsFor: fixtureResult.teamGoals, goalsAgainst: fixtureResult.opponentGoals },
        state.season.results.length,
      )
    : undefined;
  const updatedWorld = matchweek?.world ?? state.world;
  const honoursAfterMatch = accrueClubLegacyMatch(state.honours, state.club, {
    appeared: playerAppeared,
    started: Boolean(playerAppeared && match && isStartingRole(match.playerRole)),
    goals: totals.goals,
    assists: totals.assists,
    rating: totals.rating,
  });
  // Distribute this matchweek's results across the player's league NPC squads (ephemeral buffer).
  const playerLeague = matchweek ? findLeagueByClubShortCode(state.world, state.club.shortCode) : undefined;
  const updatedHonours = matchweek && playerLeague
    ? accrueLeagueSeasonStats(honoursAfterMatch, state.world, playerLeague.id, matchweek.weekResults, state.season.results.length)
    : honoursAfterMatch;
  const stateForOffer: GameState = {
    ...state,
    week: state.week + 1,
    fitness: clamp(state.fitness + totals.fitnessDelta, 0, 100),
    trust: trustAfter,
    morale: clamp(state.morale + moraleDelta, 0, 100),
    pressure: clamp(state.pressure + pressureDelta, 0, 100),
    cash: state.cash + cashDelta,
    prestige: state.prestige + prestigeDelta,
    contract: nextContract,
    sponsor: nextSponsor,
    attributes: addAttributeXp(state.attributes, totals.xp),
    seasonStats: updatedSeasonStats,
    season: updatedSeason,
    world: updatedWorld,
    honours: updatedHonours,
  };
  const transferWindow = state.transferWindow ?? createTransferWindowState(stateForOffer, lastMatch);
  let contractOffer = transferWindow ? undefined : state.contractOffer;
  let contractOffers = transferWindow ? undefined : state.contractOffers;
  if (!transferWindow && !isSeasonComplete(updatedSeason) && !contractOffer && !contractOffers?.length) {
    if (stateForOffer.contract.weeksRemaining <= 0) {
      // Expired -> transfer market: a single offer, or a choice when in demand.
      const offers = getTransferMarketOffers(stateForOffer, lastMatch);
      if (offers.length > 1) contractOffers = offers;
      else if (offers.length === 1) contractOffer = offers[0];
    } else {
      // Still under contract -> current-club renewal only.
      contractOffer = getClubContractOffer(stateForOffer, lastMatch);
    }
  }

  const completedState: GameState = {
    ...stateForOffer,
    contractOffer,
    contractOffers,
    transferWindow,
    lastEvent: getMatchSummaryText(results, totals),
    lastMatch,
    activeMatch: undefined,
  };
  return {
    ...completedState,
    worldFeed: generateWeeklyFeed(state, completedState, lastMatch),
  };
}


export function didPlayerAppear(match?: MatchState) {
  if (!match || match.isInSquad === false || match.fitnessAvailability === "Not match fit") {
    return false;
  }

  return match.entryMinute <= 90 && (!match.exitMinute || match.exitMinute > match.entryMinute);
}

function applySponsorAppealBonus<T extends { retainer: number; objectiveBonus: number; total: number }>(payout: T, bonusRatio: number): T {
  if (bonusRatio <= 0 || payout.total <= 0) {
    return payout;
  }

  const retainer = Math.round(payout.retainer * (1 + bonusRatio));
  const objectiveBonus = Math.round(payout.objectiveBonus * (1 + bonusRatio));
  return {
    ...payout,
    retainer,
    objectiveBonus,
    total: retainer + objectiveBonus,
  };
}


export function getPlayerMinutesPlayed(match?: MatchState) {
  if (!didPlayerAppear(match) || !match) {
    return 0;
  }

  const startMinute = clamp(match.entryMinute, 0, 90);
  const endMinute = clamp(match.exitMinute ?? 90, startMinute, 90);
  return Math.max(0, endMinute - startMinute);
}


export function getMatchFitnessDelta(match: MatchState, results: MatchResult[]) {
  const minutes = getPlayerMinutesPlayed(match);
  if (minutes <= 0) {
    return 0;
  }

  const minuteLoad = -Math.max(1, Math.round(minutes / 18));
  const actionLoad = results.reduce((sum, result) => sum + Math.min(0, result.fitnessDelta), 0);
  const scaledActionLoad = Math.round(actionLoad * Math.min(1, minutes / 60) * 0.35);

  return clamp(minuteLoad + scaledActionLoad, -12, 0);
}

export function getMatchdayRecoveryBonus(match: MatchState) {
  if (getPlayerMinutesPlayed(match) > 0) {
    return 0;
  }

  if (match.isInSquad === false || match.fitnessAvailability === "Not match fit") {
    return 14;
  }

  return 10;
}


export function getLiveMatchReadiness(match: MatchState, results: MatchResult[] = match.results, liveMinute = match.liveMinute) {
  if (!didPlayerAppear(match) || liveMinute < match.entryMinute) {
    return match.startFitness;
  }

  const startMinute = clamp(match.entryMinute, 0, 90);
  const endMinute = clamp(Math.min(liveMinute, match.exitMinute ?? 90), startMinute, 90);
  const minutesPlayedSoFar = Math.max(0, endMinute - startMinute);
  const minuteLoad = minutesPlayedSoFar <= 0 ? 0 : -Math.max(0, Math.round(minutesPlayedSoFar / 22));
  const actionLoad = results.reduce((sum, result) => sum + Math.min(0, result.fitnessDelta), 0);

  return clamp(match.startFitness + minuteLoad + actionLoad, 0, 100);
}


export function buildLastMatchSummary({
  match,
  results,
  totals,
  cashDelta,
  weeklyWage,
  appearanceBonus,
  goalBonus,
  assistBonus,
  sponsorRetainer,
  sponsorObjectiveBonus,
  sponsorCashDelta,
  sponsorObjectiveCompleted,
  sponsorName,
  prestigeDelta,
  moraleDelta,
  roleBefore,
  roleAfter,
  selectionBefore,
  selectionAfter,
  pointsToNextRole,
  objectiveResult,
}: {
  match: MatchState;
  results: MatchResult[];
  totals: MatchTotals;
  cashDelta: number;
  weeklyWage: number;
  appearanceBonus: number;
  goalBonus: number;
  assistBonus: number;
  sponsorRetainer: number;
  sponsorObjectiveBonus: number;
  sponsorCashDelta: number;
  sponsorObjectiveCompleted: boolean;
  sponsorName?: string;
  prestigeDelta: number;
  moraleDelta: number;
  roleBefore: UpcomingMatch["playerRole"];
  roleAfter: UpcomingMatch["playerRole"];
  selectionBefore: number;
  selectionAfter: number;
  pointsToNextRole: number;
  objectiveResult?: MatchObjectiveResult;
}): LastMatchSummary {
  return {
    ...totals,
    fixtureId: match.fixtureId,
    matchNumber: match.matchNumber,
    seasonLength: match.seasonLength,
    clubName: match.teamName,
    clubShortName: match.teamShortName,
    opponent: match.opponent,
    venue: match.venue,
    competition: match.competition,
    playerRole: match.playerRole,
    expectedMinutes: match.expectedMinutes,
    autoSimulated: results.filter((result) => result.source === "auto").length,
    manualHighlights: results.filter((result) => result.source !== "auto").length,
    cashDelta,
    weeklyWage,
    appearanceBonus,
    goalBonus,
    assistBonus,
    sponsorRetainer,
    sponsorObjectiveBonus,
    sponsorCashDelta,
    sponsorObjectiveCompleted,
    sponsorName,
    prestigeDelta,
    moraleDelta,
    roleBefore,
    roleAfter,
    selectionBefore,
    selectionAfter,
    pointsToNextRole,
    objective: objectiveResult,
    careerImpact: [
      ...getCareerImpactLines(totals, roleBefore, roleAfter, selectionBefore, selectionAfter, pointsToNextRole),
      ...(objectiveResult ? [getObjectiveResultLine(objectiveResult)] : []),
    ],
  };
}


export function summarizeMatchResults(results: MatchResult[], simTotals = createEmptySimTotals()): MatchTotals {
  const emptySummary = {
    rating: 6 + simTotals.ratingDelta,
    trustDelta: simTotals.trustDelta,
    fitnessDelta: simTotals.fitnessDelta,
    goals: 0,
    assists: 0,
    chancesCreated: 0,
    teamGoals: simTotals.teamGoals,
    opponentGoals: simTotals.opponentGoals,
    chanceQualities: [] as ChanceQuality[],
    explanationTags: [] as string[],
    performanceReasons: [] as string[],
    xp: {} as Partial<Record<AttributeKey, number>>,
  };

  if (results.length === 0) {
    return {
      ...emptySummary,
      rating: Number(aggregateMatchRating(results, simTotals.ratingDelta).toFixed(1)),
    };
  }

  const totals = results.reduce(
    (summary, result) => {
      Object.entries(result.xp).forEach(([key, value]) => {
        const attribute = key as AttributeKey;
        summary.xp[attribute] = (summary.xp[attribute] ?? 0) + (value ?? 0);
      });

      return {
        rating: summary.rating + result.rating,
        trustDelta: summary.trustDelta + result.trustDelta,
        fitnessDelta: summary.fitnessDelta + result.fitnessDelta,
        goals: summary.goals + result.goals,
        assists: summary.assists + result.assists,
        chancesCreated: summary.chancesCreated + result.chancesCreated,
        teamGoals: summary.teamGoals,
        opponentGoals: summary.opponentGoals,
        chanceQualities: [...summary.chanceQualities, result.chanceQuality],
        explanationTags: [...summary.explanationTags, ...result.explanationTags],
        performanceReasons: [...summary.performanceReasons, ...result.performanceReasons],
        xp: summary.xp,
      };
    },
    {
      ...emptySummary,
      rating: simTotals.ratingDelta,
    },
  );

  return {
    ...totals,
    teamGoals: totals.teamGoals + getPlayerTeamGoalContributions(totals),
    rating: Number(aggregateMatchRating(results, simTotals.ratingDelta).toFixed(1)),
  };
}


export function getPlayerTeamGoalContributions(totals: Pick<MatchTotals, "goals" | "assists">) {
  return totals.goals + totals.assists;
}


export function getMatchSummaryText(results: MatchResult[], totals: ReturnType<typeof summarizeMatchResults>) {
  const output = [
    totals.goals > 0 ? `${totals.goals} goal${totals.goals === 1 ? "" : "s"}` : "",
    totals.assists > 0 ? `${totals.assists} assist${totals.assists === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(" and ");

  if (output) {
    return `Match complete: ${output}, ${totals.rating.toFixed(1)} rating.`;
  }

  return `Match complete: ${totals.rating.toFixed(1)} rating. ${results[results.length - 1]?.detail ?? ""}`;
}


export function getResultPopupTone(result: MatchResult) {
  if (result.goals > 0 || result.assists > 0) {
    return "is-goal-involvement";
  }
  if (result.chancesCreated > 0) {
    return "is-success";
  }
  if (result.outcomeTier === "Poor") {
    return "is-failure";
  }
  if (result.outcomeTier === "Okay") {
    return "is-okay";
  }
  return "is-success";
}


export function getResultPopupLabel(result: MatchResult) {
  if (result.goals > 0) {
    return "Goal";
  }
  if (result.assists > 0) {
    return "Goal involvement";
  }
  if (result.chancesCreated > 0) {
    return "Chance created";
  }
  return "Result";
}


export function getResultVerdictText(result: MatchResult) {
  if (result.goals > 0) {
    return "GOAL";
  }
  if (result.assists > 0) {
    return "ASSIST";
  }
  if (result.chancesCreated > 0) {
    return "CHANCE CREATED";
  }
  return result.outcomeTier;
}


export function getOutcomeTierSummary(tier: OutcomeTier) {
  const summaries: Record<OutcomeTier, string> = {
    Poor: "Edge lost",
    Okay: "Job done",
    Good: "Edge gained",
    Great: "Big moment",
  };

  return summaries[tier];
}

export function getResultConsequence(result: MatchResult, followUpQueued: boolean) {
  if (result.goals > 0) {
    return {
      label: "Attack outcome",
      title: "Goal scored",
      detail: "Your decision directly finished the move.",
      tone: "decisive",
    };
  }
  if (result.assists > 0) {
    return {
      label: "Attack outcome",
      title: "Goal created",
      detail: "Your final action created the goal for a teammate.",
      tone: "decisive",
    };
  }
  if (result.chancesCreated > 0) {
    return {
      label: "Attack outcome",
      title: "Chance created",
      detail: "The move reached a shot, but the team did not convert it.",
      tone: "positive",
    };
  }
  if (followUpQueued) {
    return {
      label: "Attack continues",
      title: "A second decision opens",
      detail: "Your action kept the move alive and created another playable moment.",
      tone: "positive",
    };
  }
  if (result.choiceOutcome === "assist") {
    return {
      label: "Attack outcome",
      title: result.success ? "Team move connected" : "Final lane closed",
      detail: result.success
        ? "You linked the attack, but it ended before a teammate could shoot."
        : "The attempted teamplay did not create a clean final action.",
      tone: result.success ? "neutral" : "negative",
    };
  }
  if (result.choiceOutcome === "trust") {
    return {
      label: "Attack outcome",
      title: result.success ? "Possession retained" : "Move lost momentum",
      detail: result.success
        ? "The team kept control, but this phase did not become a chance."
        : "The action did not keep enough pressure on the defense.",
      tone: result.success ? "neutral" : "negative",
    };
  }
  return {
    label: "Attack outcome",
    title: result.success ? "Action completed" : "Move breaks down",
    detail: result.success
      ? "The decision helped the phase without producing a direct chance."
      : "The defense recovered before the move could develop.",
    tone: result.success ? "neutral" : "negative",
  };
}

export function getResultExecutionText(result: MatchResult) {
  if (result.outcomeTier === "Great") {
    return "Excellent execution";
  }
  if (result.outcomeTier === "Good") {
    return "Clean execution";
  }
  if (result.outcomeTier === "Okay") {
    return result.success ? "Decent execution" : "Mixed execution";
  }
  return "Execution fell short";
}


export function getPrimaryChanceQuality(qualities: ChanceQuality[]) {
  if (qualities.length === 0) {
    return "No player chance";
  }

  const counts = qualities.reduce(
    (summary, quality) => ({
      ...summary,
      [quality]: (summary[quality] ?? 0) + 1,
    }),
    {} as Partial<Record<ChanceQuality, number>>,
  );

  return Object.entries(counts).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0]?.[0] ?? qualities[0];
}


export function isStartingRole(role: UpcomingMatch["playerRole"]) {
  return role === "Starter" || role === "Rotation Starter";
}


export function getCareerImpactLines(
  totals: MatchTotals,
  roleBefore: UpcomingMatch["playerRole"],
  roleAfter: UpcomingMatch["playerRole"],
  selectionBefore: number,
  selectionAfter: number,
  pointsToNextRole: number,
) {
  const lines: string[] = [];
  const scoreDelta = selectionAfter - selectionBefore;

  if (roleBefore !== roleAfter) {
    lines.push(`Role updated: ${roleBefore} to ${roleAfter}.`);
  } else if (pointsToNextRole > 0) {
    lines.push(`${pointsToNextRole} selection score needed for the next role.`);
  } else if (roleAfter === "Starter") {
    lines.push("Starter status held after the performance.");
  } else if (totals.trustDelta > 0) {
    lines.push(`Manager trust moved ${totals.trustDelta} closer to the next role.`);
  } else if (totals.trustDelta < 0) {
    lines.push(`Manager trust slipped ${Math.abs(totals.trustDelta)} after the performance.`);
  } else {
    lines.push("Role status held steady.");
  }

  if (scoreDelta !== 0) {
    lines.push(`Selection score ${scoreDelta > 0 ? "+" : ""}${scoreDelta} after this match.`);
  }

  if (totals.rating >= 7.4) {
    lines.push("Strong rating improves selection momentum.");
  } else if (totals.rating < 6.2) {
    lines.push("Low rating adds pressure before the next selection.");
  }

  if (totals.goals + totals.assists > 0) {
    lines.push("Direct output improves contract and scout attention.");
  }

  return lines;
}


export function createEmptySimTotals() {
  return {
    teamGoals: 0,
    opponentGoals: 0,
    ratingDelta: 0,
    trustDelta: 0,
    fitnessDelta: 0,
  };
}


export function summarizeSimEvents(events: MatchEvent[], upToIndex: number) {
  return events.slice(0, upToIndex + 1).reduce((summary, event) => {
    if (event.type === "player_moment") {
      return summary;
    }

    return {
      teamGoals: summary.teamGoals + event.teamGoalDelta,
      opponentGoals: summary.opponentGoals + event.opponentGoalDelta,
      ratingDelta: summary.ratingDelta + event.ratingDelta,
      trustDelta: summary.trustDelta + event.trustDelta,
      fitnessDelta: summary.fitnessDelta + event.fitnessDelta,
    };
  }, createEmptySimTotals());
}


export function getTimelineScore(match: MatchState, results: MatchResult[], upToIndex: number) {
  const simTotals = summarizeSimEvents(match.events, upToIndex);
  const playerGoalsBeforeOrAtEvent = match.events.slice(0, upToIndex + 1).filter((event) => event.type === "player_moment").length;
  const appliedPlayerGoals = results
    .slice(0, playerGoalsBeforeOrAtEvent)
    .reduce((sum, result) => sum + result.goals + result.assists, 0);

  return {
    teamGoals: simTotals.teamGoals + appliedPlayerGoals,
    opponentGoals: simTotals.opponentGoals,
  };
}


export function getRecentTimelineItems(match: MatchState, results: MatchResult[]) {
  let playerResultIndex = 0;
  const processed = match.events.slice(0, match.currentEventIndex).flatMap((event) => {
    if (event.type !== "player_moment") {
      return [
        {
          id: event.id,
          minute: event.minute,
          text: `${event.title}. ${event.detail}`,
          kind:
            event.teamGoalDelta > 0 || event.opponentGoalDelta > 0
              ? "goal"
              : event.type === "team_chance" || event.type === "opponent_chance"
                ? "chance"
                : event.type === "substitution"
                  ? "substitution"
                  : "tempo",
          tone:
            event.teamGoalDelta > 0 || event.type === "team_chance"
              ? "team"
              : event.opponentGoalDelta > 0 || event.type === "opponent_chance"
                ? "opponent"
                : "neutral",
        },
      ];
    }

    const result = results[playerResultIndex];
    playerResultIndex += 1;

    if (!result) {
      return [];
    }

    const output =
      result.goals > 0 ? "You scored." : result.assists > 0 ? "You assisted." : `${result.rating.toFixed(1)} action.`;

    return [
      {
        id: `${event.id}-result`,
        minute: event.minute,
        text: result.title ? `${result.title}. ${output}` : output,
        kind: result.goals > 0 || result.assists > 0 ? "goal_involvement" : "player",
        tone: result.goals > 0 || result.assists > 0 ? "gold" : result.success ? "team" : "neutral",
      },
    ];
  });

  const playerStatusEvents = [
    match.entryMinute > 0 && match.liveMinute >= match.entryMinute
      ? {
          id: "player-sub-on",
          minute: match.entryMinute,
          text: "You are sent on from the bench.",
          kind: "substitution",
          tone: "team",
        }
      : undefined,
    match.exitMinute && match.liveMinute >= match.exitMinute
      ? {
          id: "player-sub-off",
          minute: match.exitMinute,
          text: "You are subbed off.",
          kind: "substitution",
          tone: "neutral",
        }
      : undefined,
  ].filter((item): item is { id: string; minute: number; text: string; kind: string; tone: string } => !!item);

  const combined = [...processed, ...playerStatusEvents].sort((a, b) => a.minute - b.minute);
  const meaningful = combined.filter((item) => item.kind !== "tempo");
  return (meaningful.length >= 3 ? meaningful : combined).slice(-5);
}

// Live team match stats (Football Manager-style tug of war), derived from the sim events processed
// so far so they tick up through the match. Shots/goals come straight from the events; shots on
// target and per-shot xG are seeded deterministically per event id (stable, never random).
const isShotOnTarget = (id: string) => seededNoise(`${id}-on-target`) > 0.42;
const getChanceXg = (id: string) => 0.05 + seededNoise(`${id}-xg`) * 0.22;
const getGoalXg = (id: string) => 0.25 + seededNoise(`${id}-xg`) * 0.4;

export type LiveMatchStatRow = { label: string; homeValue: string; awayValue: string; homeShare: number };

export function getLiveMatchStats(match: MatchState, processedEventIndex: number): {
  homeName: string;
  awayName: string;
  playerSide: "home" | "away";
  rows: LiveMatchStatRow[];
} {
  let teamShots = 0;
  let oppShots = 0;
  let teamOnTarget = 0;
  let oppOnTarget = 0;
  let teamChances = 0;
  let oppChances = 0;
  let teamXg = 0;
  let oppXg = 0;

  match.events.slice(0, processedEventIndex + 1).forEach((event) => {
    if (event.type === "player_moment") return;
    const sim = event as SimMatchEvent;
    if (sim.type === "team_goal") {
      teamShots += 1;
      teamOnTarget += 1;
      teamXg += getGoalXg(sim.id);
    } else if (sim.type === "opponent_goal") {
      oppShots += 1;
      oppOnTarget += 1;
      oppXg += getGoalXg(sim.id);
    } else if (sim.type === "team_chance") {
      teamShots += 1;
      teamChances += 1;
      teamXg += getChanceXg(sim.id);
      if (isShotOnTarget(sim.id)) teamOnTarget += 1;
    } else if (sim.type === "opponent_chance") {
      oppShots += 1;
      oppChances += 1;
      oppXg += getChanceXg(sim.id);
      if (isShotOnTarget(sim.id)) oppOnTarget += 1;
    }
  });

  // The player's own moments are resolved separately from sim events, so fold them into the team's
  // shots/on-target — otherwise a goal scored from a moment shows on the scoreboard but not in the
  // tally, leaving On target below Goals. A scored shot is always on target.
  match.results.forEach((result) => {
    if (result.choiceOutcome === "goal") {
      teamShots += 1;
      if (result.goals > 0 || result.success || ["Saved", "Off the frame"].includes(result.title)) teamOnTarget += 1;
      teamXg += result.goals > 0 ? 0.45 : 0.12;
    } else if (result.choiceOutcome === "assist") {
      teamShots += 1;
      teamChances += 1;
      if (result.assists > 0) teamOnTarget += 1;
      teamXg += result.assists > 0 ? 0.3 : 0.14;
    }
  });

  // Possession leans toward the stronger side and drifts as each team creates chances.
  const possession = clamp(
    Math.round(50 + (match.teamStrength - match.opponentStrength) * 0.8 + (teamChances - oppChances) * 2),
    22,
    78,
  );
  const share = (team: number, opp: number) => (team + opp <= 0 ? 50 : Math.round((team / (team + opp)) * 100));

  // Orient to home/away so the stats card matches the score header (home left, away right), while
  // the player's own team keeps the highlight via playerSide.
  const homeIsPlayer = match.venue === "Home";
  const row = (label: string, teamValue: string, opponentValue: string, teamShare: number): LiveMatchStatRow =>
    homeIsPlayer
      ? { label, homeValue: teamValue, awayValue: opponentValue, homeShare: teamShare }
      : { label, homeValue: opponentValue, awayValue: teamValue, homeShare: 100 - teamShare };

  return {
    homeName: homeIsPlayer ? match.teamShortName : match.opponent,
    awayName: homeIsPlayer ? match.opponent : match.teamShortName,
    playerSide: homeIsPlayer ? "home" : "away",
    rows: [
      row("Possession", `${possession}%`, `${100 - possession}%`, possession),
      row("Shots", `${teamShots}`, `${oppShots}`, share(teamShots, oppShots)),
      row("On target", `${teamOnTarget}`, `${oppOnTarget}`, share(teamOnTarget, oppOnTarget)),
      row("xG", teamXg.toFixed(1), oppXg.toFixed(1), share(teamXg, oppXg)),
    ],
  };
}

// A short, performance-specific manager verdict for the post-match summary: concrete things the
// gaffer was pleased / unhappy with, each actionable (finishing, fitness, discipline, selection).
// Derived from the real match outcome so it varies game to game, unlike the old generic read.
const BRIEF_ROLE_RANK: Record<string, number> = { Bench: 0, "Impact Sub": 1, "Rotation Starter": 2, Starter: 3 };
const BRIEF_NEXT_ROLE: Record<string, string | undefined> = {
  Bench: "Impact Sub",
  "Impact Sub": "Rotation Starter",
  "Rotation Starter": "Starter",
  Starter: undefined,
};

export function getManagerMatchBrief(summary: LastMatchSummary): {
  tone: "happy" | "mixed" | "unhappy";
  praise: string[];
  concerns: string[];
} {
  const tags = new Set(summary.explanationTags);
  const praise: string[] = [];
  const concerns: string[] = [];
  const played = summary.playerRole !== "Bench";

  if (!played) {
    concerns.push("You didn't feature — stay sharp in training and take your chance when it comes.");
  } else {
    if (summary.goals > 0) praise.push(`Took your chance — ${summary.goals} goal${summary.goals === 1 ? "" : "s"} that won us ground.`);
    if (summary.assists > 0) praise.push(`Made things happen — ${summary.assists} assist${summary.assists === 1 ? "" : "s"} set up.`);
    else if (summary.goals === 0 && summary.chancesCreated > 0) praise.push(`Created ${summary.chancesCreated} chance${summary.chancesCreated === 1 ? "" : "s"} for the team.`);
    if (tags.has("Backed your instinct")) praise.push("Backed your instinct on the big call — that's the bravery I want.");
    if (tags.has("Followed the plan")) praise.push("Stuck to the game plan when it counted.");
    if (summary.rating >= 7.4) praise.push(`A real performance out there — ${summary.rating.toFixed(1)}.`);

    const startingRole = summary.playerRole === "Starter" || summary.playerRole === "Rotation Starter";
    // Use the dominant chance quality to separate a finishing problem (good looks wasted) from a
    // service problem (only half/difficult chances) before falling back to a generic scoring nudge.
    const primaryChance = summary.chanceQualities.length > 0 ? getPrimaryChanceQuality(summary.chanceQualities) : undefined;
    const goodLooks = primaryChance === "Clear chance" || primaryChance === "Good chance";
    const scraps = primaryChance === "Half chance" || primaryChance === "Difficult chance";
    if (summary.rating <= 6.0) {
      concerns.push(`Too quiet — a ${summary.rating.toFixed(1)} won't keep you in the side.`);
    } else if (summary.goals === 0 && goodLooks) {
      concerns.push("You got into good positions and didn't take them — sharpen your finishing.");
    } else if (summary.goals === 0 && scraps) {
      concerns.push("You fed off scraps out there — we need to get you better service.");
    } else if (summary.goals === 0 && summary.rating < 7.4 && startingRole) {
      concerns.push("I need you on the scoresheet more often.");
    }
    if (tags.has("Coach unhappy")) concerns.push("You went against the brief and it backfired — pick your moments.");
    if (tags.has("fatigue_limited_action")) concerns.push("You faded on tired legs — get your fitness right before kickoff.");
  }

  const beforeRank = BRIEF_ROLE_RANK[summary.roleBefore] ?? 0;
  const afterRank = BRIEF_ROLE_RANK[summary.roleAfter] ?? 0;
  if (afterRank > beforeRank) {
    praise.push(`You've played your way up to ${summary.roleAfter}.`);
  } else if (afterRank < beforeRank) {
    // Don't imply a form/effort failure when the drop is really about match fitness / availability —
    // a decent rating but a lower role almost always means the legs, not the performance (#10).
    const fitnessDriven = tags.has("fatigue_limited_action") || (played && summary.rating >= 6.8);
    concerns.push(
      fitnessDriven
        ? `You dropped to ${summary.roleAfter} — that's match fitness, not your form. Get sharp and the shirt's yours again.`
        : `You've slipped to ${summary.roleAfter} — win the shirt back.`,
    );
  } else if (played && summary.selectionAfter > summary.selectionBefore && summary.pointsToNextRole > 0 && summary.pointsToNextRole <= 8) {
    const next = BRIEF_NEXT_ROLE[summary.roleAfter];
    if (next) praise.push(`${summary.pointsToNextRole} more selection points and a ${next} role is yours.`);
  }

  const trimmedPraise = praise.slice(0, 3);
  const trimmedConcerns = concerns.slice(0, 3);
  if (trimmedPraise.length === 0 && trimmedConcerns.length === 0) {
    trimmedPraise.push("A steady, unspectacular shift — solid, but I want more next time.");
  }
  const tone = trimmedConcerns.length === 0 ? "happy" : trimmedPraise.length === 0 ? "unhappy" : "mixed";
  return { tone, praise: trimmedPraise, concerns: trimmedConcerns };
}

export function getLiveCommentary(match: MatchState, results: MatchResult[], processedEventIndex: number) {
  const latestSimEvent = [...match.events.slice(0, processedEventIndex + 1)]
    .reverse()
    .find((event): event is SimMatchEvent => event.type !== "player_moment");
  const score = getTimelineScore(match, results, processedEventIndex);
  const goalDiff = score.teamGoals - score.opponentGoals;
  const late = match.liveMinute >= 75;

  if (latestSimEvent && match.liveMinute - latestSimEvent.minute <= 7) {
    return { title: latestSimEvent.title, detail: latestSimEvent.detail };
  }
  if (late && goalDiff < 0) {
    return { title: `${match.teamShortName} chase the game`, detail: "The shape is more aggressive and every forward action carries urgency." };
  }
  if (late && goalDiff > 0) {
    return { title: `${match.teamShortName} manage the lead`, detail: "Possession and field position matter more than forcing the next attack." };
  }
  if (goalDiff < 0) {
    return { title: "Looking for a response", detail: `${match.teamShortName} need cleaner service into the final third.` };
  }
  if (goalDiff > 0) {
    return { title: "Protecting the advantage", detail: `${match.teamShortName} balance counterattacks with keeping their shape.` };
  }
  return { title: "Match in the balance", detail: "Both sides are searching for the next spell of pressure." };
}

export function getLivePlayerStats(results: MatchResult[], rating: number) {
  const shots = results.filter((result) => result.choiceOutcome === "goal").length;
  const shotsOnTarget = results.filter(
    (result) =>
      result.choiceOutcome === "goal" &&
      (result.goals > 0 || result.success || ["Saved", "Off the frame"].includes(result.title)),
  ).length;
  return {
    rating,
    actions: results.length,
    successfulActions: results.filter((result) => result.success).length,
    shots,
    shotsOnTarget,
    keyPasses: results.reduce((sum, result) => sum + result.chancesCreated, 0),
  };
}


export function getAppearanceText(match: MatchState) {
  if (match.isInSquad === false || match.fitnessAvailability === "Not match fit" || match.entryMinute > 90) {
    return "Not selected";
  }
  if (match.entryMinute === 0 && !match.exitMinute) {
    return "Full match";
  }
  if (match.entryMinute === 0 && match.exitMinute) {
    return "Managed start";
  }
  if (match.exitMinute) {
    return match.isComplete ? `${match.entryMinute}'-${match.exitMinute}'` : "Bench shift";
  }
  return match.isComplete ? `On ${match.entryMinute}'` : match.expectedMinutes;
}


export function getPitchStatus(match: MatchState) {
  if (match.isComplete) {
    return {
      label: "Full time",
      detail: match.exitMinute ? `Played until ${match.exitMinute}'.` : "Match finished.",
      tone: "neutral",
    };
  }

  if (match.liveMinute < match.entryMinute) {
    return {
      label: match.isInSquad === false ? "Not selected" : "On the bench",
      detail:
        match.isInSquad === false
          ? "Recovery comes first today."
          : `Plan: ${match.expectedMinutes.toLowerCase()}. Match state can change it.`,
      tone: "bench",
    };
  }

  if (match.exitMinute && match.liveMinute >= match.exitMinute) {
    return {
      label: "Subbed off",
      detail: `Your shift ended at ${match.exitMinute}'.`,
      tone: "off",
    };
  }

  return {
    label: match.entryMinute === 0 ? "On the pitch" : "Subbed on",
    detail: match.entryMinute === 0 ? "You started this match." : `You entered at ${match.entryMinute}'.`,
    tone: "on",
  };
}


export function getRoleMinuteWindow(role: UpcomingMatch["playerRole"]) {
  const windows: Record<UpcomingMatch["playerRole"], { start: number; end: number }> = {
    Bench: { start: 78, end: 89 },
    "Impact Sub": { start: 62, end: 89 },
    "Rotation Starter": { start: 18, end: 72 },
    Starter: { start: 8, end: 88 },
  };

  return windows[role];
}


export function getAppearanceWindow(
  role: UpcomingMatch["playerRole"],
  state: GameState,
  context: UpcomingMatch,
  simEvents: SimMatchEvent[],
  matchSeed: string,
) {
  if (!context.isInSquad || context.fitnessAvailability === "Not match fit") {
    return { entryMinute: 91 };
  }

  const window = getRoleMinuteWindow(role);
  const seed = `${matchSeed}-${state.week}-${context.id}-${role}-${state.trust}-${state.fitness}`;
  const variation = Math.round(seededNoise(seed) * 12) - 6;
  const earlyEvent = seededNoise(`${seed}-early`) > 0.88 ? -12 : 0;
  const scoreAround60 = getSimScoreAtMinute(simEvents, 60);
  const teamGoalDiff = scoreAround60.teamGoals - scoreAround60.opponentGoals;
  const matchStateAdjustment =
    teamGoalDiff < 0
      ? -7
      : teamGoalDiff >= 2
        ? -5
        : teamGoalDiff > 0
          ? 4
          : 0;

  if (role === "Bench") {
    if (context.fitnessAvailability === "Risky") {
      return { entryMinute: clamp(window.start + variation + earlyEvent + (teamGoalDiff < 0 ? -4 : 0), 80, 89) };
    }

    return { entryMinute: clamp(window.start + variation + earlyEvent + (teamGoalDiff < 0 ? -6 : 0), 60, 89) };
  }

  if (role === "Impact Sub") {
    const fitnessDelay =
      context.fitnessAvailability === "Risky" ? 10 : context.fitnessAvailability === "Tired" ? 4 : 0;
    return { entryMinute: clamp(66 + variation + earlyEvent + matchStateAdjustment + fitnessDelay, 48, 86) };
  }

  if (role === "Rotation Starter") {
    const lowFitnessExit =
      context.fitnessAvailability === "Risky"
        ? Math.round((state.fitness - 40) * 0.35)
        : 0;
    const fatigueExit =
      context.fitnessAvailability === "Risky" ? -16 : context.fitnessAvailability === "Tired" ? -8 : 0;
    const exitAdjustment = fatigueExit + (teamGoalDiff >= 2 ? -5 : teamGoalDiff < 0 ? 6 : 0);
    return { entryMinute: 0, exitMinute: clamp(window.end + variation + exitAdjustment + lowFitnessExit, 46, 86) };
  }

  if (role === "Starter" && ["Risky", "Tired"].includes(context.fitnessAvailability)) {
    const lowFitnessExit =
      context.fitnessAvailability === "Risky"
        ? Math.round((state.fitness - 40) * 0.35)
        : 0;
    const exitBase = context.fitnessAvailability === "Risky" ? 60 : 72;
    const matchStateExit = teamGoalDiff >= 2 ? -6 : teamGoalDiff < 0 ? 4 : 0;
    return {
      entryMinute: 0,
      exitMinute: clamp(exitBase + variation + lowFitnessExit + matchStateExit, 46, 84),
    };
  }

  return { entryMinute: 0 };
}


export function createMatch(state: GameState, context: UpcomingMatch): MatchState {
  const matchSeed = createMatchSeed(state, context);
  const positionModule = getPositionModule(state.positionGroup);
  const leagueTier = getClubLeagueTier(state.club);
  const matchAging = getAgingProfile(state);
  const agedAttributes = getAgeAdjustedAttributes(state.attributes, getPlayerAgeFromSeason(state.season.season), matchAging.peakAge, matchAging.declineResist);
  const matchAttributeValues = getLeagueAdjustedAttributeValueMap(agedAttributes, leagueTier);
  const matchOpponentProfile = getLeagueAdjustedOpponentProfile(context.opponentProfile, leagueTier);
  const contextualOvr = getContextualAbilityScore(calculateOvr(agedAttributes, positionModule.ovrWeights), leagueTier);
  const matchPool = createPositionMatchPool({
    opponentShort: context.opponentShort,
    managerInstruction: context.managerInstruction,
    tacticalFocus: context.tacticalFocus,
    fitness: state.fitness,
    momentPools: positionModule.momentPools,
  }) as MatchMoment[];
  const minuteWindow = getRoleMinuteWindow(context.playerRole);
  const teamMatchModel = createTeamMatchModel({
    matchSeed,
    teamStrength: context.teamStrength,
    trust: state.trust,
    formScore: getFormScore(state.seasonStats.ratings),
    venue: context.venue,
    serviceLevel: context.serviceLevel,
    opponentProfile: context.opponentProfile,
  });
  const simEvents = createSimEvents({
    matchSeed,
    model: teamMatchModel,
    opponentShort: context.opponentShort,
    teamShort: state.club.shortName,
    managerInstruction: context.managerInstruction,
  });
  const appearanceWindow = getAppearanceWindow(context.playerRole, state, context, simEvents, matchSeed);
  const playerWindowStart = Math.max(minuteWindow.start, appearanceWindow.entryMinute);
  const playerWindowEnd = Math.max(playerWindowStart, appearanceWindow.exitMinute ?? minuteWindow.end);
  const appearanceMinutes =
    context.isInSquad && context.fitnessAvailability !== "Not match fit" && appearanceWindow.entryMinute <= 90
      ? Math.max(0, clamp(appearanceWindow.exitMinute ?? 90, appearanceWindow.entryMinute, 90) - clamp(appearanceWindow.entryMinute, 0, 90))
      : 0;
  const involvementScore =
    state.trust * 0.35 +
    state.fitness * 0.25 +
    getFormScore(state.seasonStats.ratings) * 0.2 +
    contextualOvr * 0.2 +
    positionModule.matchTendencies.involvementBias[context.playerRole] * 10;
  const playerMomentCount = context.isInSquad ? getPlayerMomentCount(context.playerRole, involvementScore, appearanceMinutes, matchSeed) : 0;
  const directorPlan = createMatchDirectorPlan({
    moments: matchPool,
    matchSeed,
    count: playerMomentCount,
    simEvents,
    playerWindowStart,
    playerWindowEnd,
    role: context.playerRole,
    serviceLevel: context.serviceLevel,
    opponentProfile: matchOpponentProfile,
    attributeValues: matchAttributeValues,
    preferredCategories: positionModule.matchTendencies.preferredForwardCategories,
  });
  const playerEvents: PlayerMatchEvent[] = directorPlan.moments.map((moment) => ({
    ...moment,
    type: "player_moment" as const,
  }));
  const events = [...simEvents, ...playerEvents].sort((a, b) => a.minute - b.minute);

  return {
    matchSeed,
    fixtureId: context.id,
    matchNumber: state.season.fixtureIndex + 1,
    seasonLength: state.season.fixtures.length,
    teamName: state.club.name,
    teamShortName: state.club.shortName,
    opponent: context.opponentShort,
    venue: context.venue,
    competition: context.competition,
    matchImportance: context.matchImportance,
    opponentForm: context.opponentForm,
    opponentProfile: context.opponentProfile,
    serviceLevel: context.serviceLevel,
    teamStrength: context.teamStrength,
    opponentStrength: context.opponentStrength,
    positionGroup: context.positionGroup,
    playerRole: context.playerRole,
    selectionScore: context.selection.score,
    selectionSummary: context.selection.summary,
    expectedMinutes: context.expectedMinutes,
    fitnessAvailability: context.fitnessAvailability,
    isInSquad: context.isInSquad,
    startFitness: state.fitness,
    entryMinute: appearanceWindow.entryMinute,
    exitMinute: appearanceWindow.exitMinute,
    managerInstruction: context.managerInstruction,
    tacticalFocus: context.tacticalFocus,
    score: "0-0",
    events,
    currentEventIndex: 0,
    liveMinute: 0,
    results: [],
    heat: 0,
    director: directorPlan.state,
    objective: getSponsorMatchObjective(state.sponsor),
    isComplete: false,
  };
}


// Pre-choice outcome preview for the UI. Builds the SAME inputs as createMatchResult's resolution
// call so the displayed percentages are honest. Keep in sync with createMatchResult.
export function getChoiceOutcomePreview(state: GameState, moment: MatchMoment, choice: MatchChoice): ChoiceOutcomePreview {
  const leagueTier = getClubLeagueTier(state.club);
  const aging = getAgingProfile(state);
  const attributeValues = getLeagueAdjustedAttributeValueMap(
    getAgeAdjustedAttributes(state.attributes, getPlayerAgeFromSeason(state.season.season), aging.peakAge, aging.declineResist),
    leagueTier,
  );
  const opponentProfile = state.activeMatch
    ? getLeagueAdjustedOpponentProfile(state.activeMatch.opponentProfile, leagueTier)
    : undefined;

  return estimateChoiceOutcomes({
    moment,
    choice,
    attributeValues,
    fitness: state.activeMatch ? getLiveMatchReadiness(state.activeMatch) : state.fitness,
    trust: state.trust,
    playerRole: state.activeMatch?.playerRole,
    opponentProfile,
  });
}

// --- Dopamine layer ------------------------------------------------------------------------------
// The screamer is a rare, seeded *upgrade* on an already-decisive outcome — favouring audacious
// choices (high risk, harder chances). It only touches rating/trust/copy (presentation), never
// goals/assists/XP, so the OVR development baseline is unchanged.
function isScreamer(result: { goals: number; assists: number; chanceQuality: string }, choice: MatchChoice, resultSeed: string): boolean {
  if (choice.outcome === "goal" && result.goals > 0) {
    const riskBoost = choice.risk === "High" ? 1.9 : choice.risk === "Medium" ? 1.2 : 0.7;
    const qualityBoost = result.chanceQuality === "Difficult chance" ? 2 : result.chanceQuality === "Half chance" ? 1.4 : 1;
    const rate = clamp(0.05 * riskBoost * qualityBoost, 0, 0.34);
    return seededNoise(`${resultSeed}-screamer`) < rate;
  }
  if (choice.outcome === "assist" && result.assists > 0 && choice.risk !== "Low") {
    return seededNoise(`${resultSeed}-screamer`) < (choice.risk === "High" ? 0.1 : 0.06);
  }
  return false;
}

function applyScreamerFlair<T extends { rating: number; trustDelta: number }>(result: T, choice: MatchChoice, resultSeed: string): T & { screamer: boolean } {
  const base = choice.outcome === "goal" ? 8.6 : 8.2;
  const bump = seededNoise(`${resultSeed}-screamer-rating`) * 0.5;
  const rating = Math.min(9.6, Number((Math.max(result.rating, base) + bump).toFixed(1)));
  return { ...result, rating, trustDelta: result.trustDelta + 2, screamer: true };
}

function getScreamerCopy(moment: MatchMoment, choice: MatchChoice, resultSeed: string): { title: string; detail: string } {
  const lines = choice.outcome === "goal"
    ? [
        { title: "SCREAMER!", detail: `${moment.minute}': ${choice.label} — unstoppable. It flies in off the underside and the place erupts.` },
        { title: "What a hit!", detail: `${moment.minute}': ${choice.label} from nowhere — top corner, no chance for the keeper.` },
        { title: "Worldie!", detail: `${moment.minute}': ${choice.label} struck perfectly — the kind of goal they replay all season.` },
      ]
    : [
        { title: "Outrageous!", detail: `${moment.minute}': ${choice.label} — an audacious ball that completely unlocks the defence for the tap-in.` },
        { title: "Genius assist!", detail: `${moment.minute}': ${choice.label} that no one else on the pitch sees. Sublime.` },
      ];
  const index = Math.floor(seededNoise(`${resultSeed}-screamer-copy`) * lines.length) % lines.length;
  return lines[index];
}

// Named quality stamp for the moment reveal — makes the existing tier gradient visible and fun.
export function getPayoffStamp(result: MatchResult): { label: string; tone: "screamer" | "great" | "good" | "neutral" | "bad" } {
  if (result.screamer) return { label: result.assists > 0 ? "OUTRAGEOUS" : "SCREAMER", tone: "screamer" };
  if (result.goals > 0) return { label: "Clinical", tone: "great" };
  if (result.assists > 0) return { label: "Assist", tone: "great" };
  if (result.chancesCreated > 0) return { label: "Chance created", tone: "good" };
  if (result.outcomeTier === "Great") return { label: "Sharp", tone: "great" };
  if (result.success) return { label: "Tidy", tone: "neutral" };
  return { label: result.choiceOutcome === "goal" ? "Off target" : result.choiceOutcome === "assist" ? "Broke down" : "Lost it", tone: "bad" };
}

// --- Heat / streak -------------------------------------------------------------------------------
// In-match momentum. Good outcomes build heat, poor ones cool it; high heat amplifies the *felt*
// reward (rating/trust) only — never goals/assists/XP — so it's pure dopamine and OVR-neutral.
// Resets each match (createMatch starts at 0).
export function getHeatTier(heat: number): HeatTier {
  if (heat >= 85) return "On Fire";
  if (heat >= 55) return "Hot";
  if (heat >= 25) return "Warm";
  return "Cold";
}

function getHeatGain(result: { goals: number; assists: number; outcomeTier: OutcomeTier; success: boolean }): number {
  if (result.goals > 0 || result.assists > 0) return 30;
  if (result.outcomeTier === "Great") return 16;
  if (result.success) return 9;
  return -24;
}

function applyHeatReward<T extends { rating: number; trustDelta: number }>(result: T, heat: number): T {
  const tier = getHeatTier(heat);
  const ratingBonus = tier === "On Fire" ? 0.4 : tier === "Hot" ? 0.25 : tier === "Warm" ? 0.1 : 0;
  const trustBonus = tier === "On Fire" || tier === "Hot" ? 1 : 0;
  if (ratingBonus === 0 && trustBonus === 0) return result;
  return {
    ...result,
    rating: Number(Math.min(9.9, result.rating + ratingBonus).toFixed(1)),
    trustDelta: result.trustDelta + (result.trustDelta >= 0 ? trustBonus : 0),
  };
}

// --- Defining moments ----------------------------------------------------------------------------
// Flag the rare high-stakes "be the hero" moment: late + tight scoreline, or a tight cup tie. Like
// heat it amplifies the felt reward + drama (rating/trust swing + extra heat), never goals/XP.
export function isDefiningMoment(match: MatchState, moment: MatchMoment): boolean {
  const decisiveCategory = ["shot", "first_time_finish", "run_behind", "late_pressure", "counter", "link_up", "aerial_duel"].includes(moment.category);
  if (!decisiveCategory) return false;
  const simScore = getSimScoreAtMinute(match.events.filter((event) => event.type !== "player_moment"), moment.minute);
  const playerGoals = match.results.reduce((total, result) => total + (result.goals ?? 0), 0);
  const diff = Math.abs(simScore.teamGoals + playerGoals - simScore.opponentGoals);
  const late = moment.minute >= 78;
  const cup = match.matchImportance === "High";
  return (late && diff <= 1) || (cup && diff <= 1 && moment.minute >= 65);
}

function applyDefiningFlair<T extends { rating: number; trustDelta: number }>(core: T, success: boolean): T {
  return success
    ? { ...core, rating: Number(Math.min(9.9, core.rating + 0.3).toFixed(1)), trustDelta: core.trustDelta + 1 }
    : { ...core, rating: Number(Math.max(5, core.rating - 0.2).toFixed(1)), trustDelta: core.trustDelta - 1 };
}

export function createMatchResult(state: GameState, moment: MatchMoment, choice: MatchChoice): MatchResult {
  const resultSeed = `${state.activeMatch?.matchSeed ?? "match"}-${moment.id}-${choice.id}-${state.activeMatch?.results.length ?? 0}`;
  const positionModule = getPositionModule(state.activeMatch?.positionGroup ?? state.positionGroup);
  const leagueTier = getClubLeagueTier(state.club);
  const resultAging = getAgingProfile(state);
  const matchAttributeValues = getLeagueAdjustedAttributeValueMap(
    getAgeAdjustedAttributes(state.attributes, getPlayerAgeFromSeason(state.season.season), resultAging.peakAge, resultAging.declineResist),
    leagueTier,
  );
  const matchOpponentProfile = state.activeMatch
    ? getLeagueAdjustedOpponentProfile(state.activeMatch.opponentProfile, leagueTier)
    : undefined;
  const coreResult = resolvePlayerChoice({
    moment,
    choice,
    attributeValues: matchAttributeValues,
    fitness: state.activeMatch ? getLiveMatchReadiness(state.activeMatch) : state.fitness,
    trust: state.trust,
    playerRole: state.activeMatch?.playerRole,
    opponentProfile: matchOpponentProfile,
    resultSeed,
  });
  const positionAdjustedResult = {
    ...coreResult,
    rating: getPositionAdjustedRating(coreResult.rating, coreResult.outcomeTier, coreResult.decisiveOutcome, moment, choice, positionModule),
  };
  const supportAdjustedResult = applyMatchSupportEffects(state, positionAdjustedResult);
  const xp = buildChoiceXp(choice, supportAdjustedResult.outcomeTier, positionModule, moment);
  const positionLabel = positionModule.displayName.toLowerCase();
  const performanceReasons = buildPerformanceReasons(moment, choice, supportAdjustedResult, positionModule, xp);
  const outcomeCopy = getMatchOutcomeCopy(moment, choice, supportAdjustedResult, resultSeed, positionLabel);
  const currentHeat = state.activeMatch?.heat ?? 0;
  const defining = state.activeMatch ? isDefiningMoment(state.activeMatch, moment) : false;
  const heatedCore = applyHeatReward(supportAdjustedResult, currentHeat);
  const definedCore = defining ? applyDefiningFlair(heatedCore, supportAdjustedResult.success) : heatedCore;
  const screamer = isScreamer(definedCore, choice, resultSeed);
  const screamerCore = screamer ? applyScreamerFlair(definedCore, choice, resultSeed) : definedCore;
  const heatGain = Math.round(getHeatGain(supportAdjustedResult) * (defining ? 1.4 : 1));
  const finalCore = { ...screamerCore, heatDelta: heatGain, heatTier: getHeatTier(clamp(currentHeat + heatGain, 0, 100)), definingMoment: defining };
  const screamerCopy = screamer ? getScreamerCopy(moment, choice, resultSeed) : undefined;
  const choiceMeta = {
    choiceId: choice.id,
    choiceLabel: choice.label,
    choiceOutcome: choice.outcome,
  };

  if (choice.outcome === "goal") {
    return {
      title: screamerCopy?.title ?? outcomeCopy.title,
      detail: screamerCopy?.detail ?? outcomeCopy.detail,
      ...finalCore,
      ...choiceMeta,
      performanceReasons,
      xp,
    };
  }

  if (choice.outcome === "assist") {
    return {
      title: screamerCopy?.title ?? outcomeCopy.title,
      detail: screamerCopy?.detail ?? outcomeCopy.detail,
      ...finalCore,
      ...choiceMeta,
      performanceReasons,
      xp,
    };
  }

  return {
    title: supportAdjustedResult.outcomeTier === "Great" ? "Manager will remember that" : supportAdjustedResult.success ? "Useful shift" : "Useful but imperfect",
    detail: supportAdjustedResult.outcomeTier === "Great"
      ? `${moment.minute}': ${choice.label} is not flashy, but it is exactly the kind of ${positionLabel} work that earns minutes.`
      : supportAdjustedResult.success
        ? `${moment.minute}': ${choice.label} helps the team shape and keeps you in the manager's thoughts.`
        : `${moment.minute}': ${choice.label} helps the team shape, though the action lacks sharpness.`,
    ...finalCore,
    ...choiceMeta,
    performanceReasons,
    xp,
  };
}


export function createFollowUpMoment(match: MatchState, moment: PlayerMatchEvent, result: MatchResult): PlayerMatchEvent | undefined {
  if (moment.chainDepth && moment.chainDepth >= 1) {
    return undefined;
  }
  if (!result.success || result.goals > 0 || result.assists > 0) {
    return undefined;
  }

  const tierChance: Record<OutcomeTier, number> = {
    Poor: 0,
    Okay: 0.12,
    Good: 0.42,
    Great: 0.78,
  };
  const roll = seededNoise(`${match.matchSeed}-${moment.id}-${result.choiceId}-${result.outcomeTier}-follow-up`);
  if (roll > tierChance[result.outcomeTier]) {
    return undefined;
  }

  const template = getFollowUpTemplate(moment, result);
  if (!template) {
    return undefined;
  }
  const director = match.director;
  if (
    director &&
    !canQueueDirectorFollowUp({
      match,
      moment,
      highlightBudget: director.highlightBudget,
      maxChains: director.maxChains,
    })
  ) {
    return undefined;
  }

  const followUpMinute = clamp(moment.minute + 1, moment.minute, Math.min(match.exitMinute ?? 90, 90));
  return {
    ...template,
    id: `${moment.id}-${result.choiceId}-follow-up`,
    type: "player_moment",
    minute: followUpMinute,
    opponent: moment.opponent,
    chainDepth: (moment.chainDepth ?? 0) + 1,
    directorPhase: moment.directorPhase,
    narrativeTags: [...(moment.narrativeTags ?? []), "follow_up"],
  };
}


export function getFollowUpTemplate(moment: MatchMoment, result: MatchResult): Omit<PlayerMatchEvent, "id" | "type" | "minute" | "opponent"> | undefined {
  if (result.choiceOutcome === "defense") {
    return undefined;
  }

  const routedTemplate = getRoutedFollowUpTemplate(moment.chainRoutes?.[0]);
  if (routedTemplate) {
    return routedTemplate;
  }

  if (moment.category === "counter" || result.choiceId.includes("drive") || result.choiceId.includes("carry")) {
    return {
      category: "shot",
      situation: "The defender is beaten and the box opens",
      context: "Your first action created separation. Now the final decision matters before the cover arrives.",
      choices: [
        { id: "chain-low-shot", label: "Low shot", uses: ["Finishing", "Composure"], risk: "Medium", reward: "Goal chance", manager: "Neutral", outcome: "goal" },
        { id: "chain-cutback", label: "Cutback", uses: ["Vision", "Passing"], risk: "Low", reward: "Assist chance", manager: "Likes", outcome: "assist" },
        { id: "chain-draw-contact", label: "Draw contact", uses: ["Strength", "Composure"], risk: "Low", reward: "Keep pressure", manager: "Likes", outcome: "trust" },
      ],
    };
  }

  if (moment.category === "run_behind" || result.choiceId.includes("round") || result.choiceId.includes("behind")) {
    return {
      category: "first_time_finish",
      situation: "You arrive at the angle before the defender recovers",
      context: "The run worked, but the angle is tightening. You can force the finish or use the runner arriving centrally.",
      choices: [
        { id: "chain-tight-finish", label: "Tight-angle finish", uses: ["Finishing", "Composure"], risk: "High", reward: "Big goal", manager: "Risky", outcome: "goal" },
        { id: "chain-square-ball", label: "Square ball", uses: ["Composure", "Vision"], risk: "Medium", reward: "Tap-in assist", manager: "Likes", outcome: "assist" },
        { id: "chain-protect-ball", label: "Protect ball", uses: ["Strength", "First Touch"], risk: "Low", reward: "Retain attack", manager: "Neutral", outcome: "trust" },
      ],
    };
  }

  if (moment.category === "press" || result.choiceId.includes("press") || result.choiceId.includes("tackle")) {
    return {
      category: "late_pressure",
      situation: "The press forces a loose ball near the area",
      context: "You have turned effort into a dangerous second ball. The opponent is scrambling.",
      choices: [
        { id: "chain-snap-shot", label: "Snap shot", uses: ["Finishing", "Acceleration"], risk: "High", reward: "Sudden goal", manager: "Neutral", outcome: "goal" },
        { id: "chain-slip-teammate", label: "Slip teammate", uses: ["Vision", "Passing"], risk: "Medium", reward: "Assist chance", manager: "Likes", outcome: "assist" },
        { id: "chain-lock-in", label: "Lock them in", uses: ["Work Rate", "Positioning"], risk: "Low", reward: "Manager trust", manager: "Likes", outcome: "trust" },
      ],
    };
  }

  if (moment.category === "hold_up" || moment.category === "link_up" || result.choiceId.includes("layoff") || result.choiceId.includes("shield")) {
    return {
      category: "link_up",
      situation: "The layoff comes back as the defense steps out",
      context: "Your first action kept the attack alive. A quick second decision can turn possession into danger.",
      choices: [
        { id: "chain-spin-shot", label: "Spin and shoot", uses: ["First Touch", "Finishing"], risk: "High", reward: "Surprise finish", manager: "Risky", outcome: "goal" },
        { id: "chain-release-runner", label: "Release runner", uses: ["Vision", "Passing"], risk: "Medium", reward: "Chance created", manager: "Likes", outcome: "assist" },
        { id: "chain-set-tempo", label: "Set tempo", uses: ["Composure", "Passing"], risk: "Low", reward: "Sustain move", manager: "Likes", outcome: "trust" },
      ],
    };
  }

  if (result.choiceOutcome === "goal" || result.choiceOutcome === "assist") {
    return {
      category: result.choiceOutcome === "goal" ? "shot" : "link_up",
      situation: result.choiceOutcome === "goal" ? "The ball sits up for one more action" : "A teammate returns the ball into your path",
      context: "The first idea worked well enough to keep the move alive. You have one more decision before the defense resets.",
      choices: [
        { id: "chain-compose-finish", label: "Compose finish", uses: ["Finishing", "Composure"], risk: "Medium", reward: "Goal chance", manager: "Neutral", outcome: "goal" },
        { id: "chain-final-pass", label: "Final pass", uses: ["Vision", "Passing"], risk: "Medium", reward: "Assist chance", manager: "Likes", outcome: "assist" },
        { id: "chain-safe-touch", label: "Safe touch", uses: ["First Touch", "Composure"], risk: "Low", reward: "Good action", manager: "Likes", outcome: "trust" },
      ],
    };
  }

  return undefined;
}

function getRoutedFollowUpTemplate(route?: string): Omit<PlayerMatchEvent, "id" | "type" | "minute" | "opponent"> | undefined {
  if (route === "dribble_break") {
    return {
      category: "shot",
      situation: "The first defender is beaten and the cover steps across",
      context: "Your dribble opened the box. You can finish, release the runner or protect the advantage.",
      choices: [
        { id: "chain-dribble-finish", label: "Finish across goal", uses: ["Finishing", "Composure"], risk: "Medium", reward: "Goal chance", manager: "Neutral", outcome: "goal" },
        { id: "chain-dribble-square", label: "Square to runner", uses: ["Vision", "Passing"], risk: "Low", reward: "Assist chance", manager: "Likes", outcome: "assist" },
        { id: "chain-dribble-protect", label: "Protect the ball", uses: ["Strength", "First Touch"], risk: "Low", reward: "Keep pressure", manager: "Likes", outcome: "trust" },
      ],
    };
  }
  if (route === "rebound_finish") {
    return {
      category: "late_pressure",
      situation: "The first contact ricochets back into danger",
      context: "Nobody has control of the second ball. One quick decision can finish the scramble.",
      choices: [
        { id: "chain-rebound-hit", label: "Hit rebound", uses: ["Finishing", "Acceleration"], risk: "High", reward: "Scramble goal", manager: "Neutral", outcome: "goal" },
        { id: "chain-rebound-set", label: "Set teammate", uses: ["First Touch", "Vision"], risk: "Medium", reward: "Assist chance", manager: "Likes", outcome: "assist" },
        { id: "chain-rebound-pin", label: "Pin defender", uses: ["Strength", "Work Rate"], risk: "Low", reward: "Sustain attack", manager: "Likes", outcome: "trust" },
      ],
    };
  }
  if (route === "cross_decision" || route === "finish_or_square") {
    return {
      category: "first_time_finish",
      situation: "The move reaches the final ball inside the box",
      context: "The defense is retreating toward goal. The finish and the square pass are both briefly available.",
      choices: [
        { id: "chain-cross-finish", label: "Take the finish", uses: ["Finishing", "Composure"], risk: "Medium", reward: "Goal chance", manager: "Neutral", outcome: "goal" },
        { id: "chain-cross-square", label: "Square across goal", uses: ["Vision", "Passing"], risk: "Low", reward: "Assist chance", manager: "Likes", outcome: "assist" },
        { id: "chain-cross-delay", label: "Delay for support", uses: ["First Touch", "Strength"], risk: "Low", reward: "Retain attack", manager: "Likes", outcome: "trust" },
      ],
    };
  }
  if (route === "press_turnover") {
    return {
      category: "late_pressure",
      situation: "The press wins possession with the defense unbalanced",
      context: "The turnover has created a short window before the centerbacks recover their positions.",
      choices: [
        { id: "chain-press-shoot", label: "Shoot early", uses: ["Finishing", "Composure"], risk: "High", reward: "Sudden goal", manager: "Neutral", outcome: "goal" },
        { id: "chain-press-slip", label: "Slip teammate", uses: ["Vision", "Passing"], risk: "Medium", reward: "Assist chance", manager: "Likes", outcome: "assist" },
        { id: "chain-press-lock", label: "Lock in pressure", uses: ["Work Rate", "Positioning"], risk: "Low", reward: "Manager trust", manager: "Likes", outcome: "trust" },
      ],
    };
  }
  if (route === "hold_up_return") {
    return {
      category: "link_up",
      situation: "The return pass arrives as you spin away from the marker",
      context: "Your first action brought a teammate into play. Now the defense must react to your second movement.",
      choices: [
        { id: "chain-return-shoot", label: "Spin and shoot", uses: ["First Touch", "Finishing"], risk: "High", reward: "Goal chance", manager: "Risky", outcome: "goal" },
        { id: "chain-return-runner", label: "Release third man", uses: ["Vision", "Passing"], risk: "Medium", reward: "Assist chance", manager: "Likes", outcome: "assist" },
        { id: "chain-return-set", label: "Settle the move", uses: ["Composure", "Passing"], risk: "Low", reward: "Keep control", manager: "Likes", outcome: "trust" },
      ],
    };
  }
  if (route === "aerial_second_ball") {
    return {
      category: "late_pressure",
      situation: "The aerial duel drops a second ball near the goal",
      context: "The first contact did not finish the move. The loose ball now favors whoever reacts first.",
      choices: [
        { id: "chain-aerial-volley", label: "Volley second ball", uses: ["Finishing", "Composure"], risk: "High", reward: "Goal chance", manager: "Neutral", outcome: "goal" },
        { id: "chain-aerial-nudge", label: "Nudge to teammate", uses: ["First Touch", "Vision"], risk: "Medium", reward: "Assist chance", manager: "Likes", outcome: "assist" },
        { id: "chain-aerial-compete", label: "Keep it alive", uses: ["Strength", "Work Rate"], risk: "Low", reward: "Sustain pressure", manager: "Likes", outcome: "trust" },
      ],
    };
  }
  if (route === "run_to_finish" || route === "clearance_counter") {
    return {
      category: "shot",
      situation: "The run carries you into the final decision",
      context: "You have gained separation, but the angle and the recovering defender still matter.",
      choices: [
        { id: "chain-run-place", label: "Place finish", uses: ["Finishing", "Composure"], risk: "Medium", reward: "Goal chance", manager: "Neutral", outcome: "goal" },
        { id: "chain-run-round", label: "Take another touch", uses: ["First Touch", "Acceleration"], risk: "High", reward: "Beat keeper", manager: "Risky", outcome: "goal" },
        { id: "chain-run-square", label: "Square pass", uses: ["Vision", "Passing"], risk: "Low", reward: "Assist chance", manager: "Likes", outcome: "assist" },
      ],
    };
  }
  return undefined;
}

function getMatchOutcomeCopy(
  moment: MatchMoment,
  choice: MatchChoice,
  result: ReturnType<typeof resolvePlayerChoice>,
  resultSeed: string,
  positionLabel: string,
) {
  if (choice.outcome === "goal") {
    if (result.decisiveOutcome) {
      return {
        title: "Goal",
        detail: `${moment.minute}': ${choice.label} works perfectly. The move ends in the net.`,
      };
    }
    const goodMisses = [
      ["Saved", `${moment.minute}': ${choice.label} finds the target, but the keeper gets behind it.`],
      ["Blocked", `${moment.minute}': ${choice.label} beats the first pressure, but a defender blocks the finish.`],
      ["Off the frame", `${moment.minute}': ${choice.label} has the keeper beaten, but the ball clips the frame of the goal.`],
    ];
    const poorMisses = [
      ["Chance missed", `${moment.minute}': ${choice.label} sends the chance wide under pressure.`],
      ["Heavy contact", `${moment.minute}': ${choice.label} is rushed and the finish flies over.`],
      ["Angle closed", `${moment.minute}': ${choice.label} cannot beat the recovering defender and the chance disappears.`],
    ];
    return pickOutcomeCopy(result.success ? goodMisses : poorMisses, `${resultSeed}-goal-copy`);
  }
  if (choice.outcome === "assist") {
    if (result.assists > 0) {
      return {
        title: "Assist",
        detail: `${moment.minute}': ${choice.label} opens the defense and the teammate finishes the chance.`,
      };
    }
    if (result.chancesCreated > 0) {
      const chanceEnds = [
        ["Chance created", `${moment.minute}': ${choice.label} creates the opening, but the teammate fires wide.`],
        ["Keeper denies it", `${moment.minute}': ${choice.label} releases the runner, but the keeper saves the finish.`],
        ["Last-ditch block", `${moment.minute}': ${choice.label} creates the chance before a defender makes the final block.`],
      ];
      return pickOutcomeCopy(chanceEnds, `${resultSeed}-assist-copy`);
    }
    return {
      title: result.success ? "Attack connected" : "Move breaks down",
      detail: result.success
        ? `${moment.minute}': ${choice.label} helps the move, but the final lane closes before a shot arrives.`
        : `${moment.minute}': ${choice.label} nearly unlocks them, but the connection is not clean enough.`,
    };
  }
  return {
    title: result.outcomeTier === "Great" ? "Manager will remember that" : result.success ? "Useful shift" : "Useful but imperfect",
    detail: result.outcomeTier === "Great"
      ? `${moment.minute}': ${choice.label} is exactly the kind of ${positionLabel} work that earns minutes.`
      : result.success
        ? `${moment.minute}': ${choice.label} helps the team shape and keeps you in the manager's thoughts.`
        : `${moment.minute}': ${choice.label} helps the shape, though the action lacks sharpness.`,
  };
}

function pickOutcomeCopy(options: string[][], seed: string) {
  const index = Math.min(options.length - 1, Math.floor(seededNoise(seed) * options.length));
  return { title: options[index][0], detail: options[index][1] };
}


export function applyMatchSupportEffects<T extends { rating: number; fitnessDelta: number }>(state: GameState, result: T): T {
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const matchRecoveryLevel = getSupportLevel(state, "matchRecovery") * environment.supportEfficiency;

  return {
    ...result,
    fitnessDelta: Math.min(0, result.fitnessDelta + getMatchActionRecoveryRelief(matchRecoveryLevel)),
  };
}


export function simulateRemainingPlayerMoments(state: GameState, match: MatchState): MatchResult[] {
  const remainingAging = getAgingProfile(state);
  const matchAttributeValues = getLeagueAdjustedAttributeValueMap(
    getAgeAdjustedAttributes(state.attributes, getPlayerAgeFromSeason(state.season.season), remainingAging.peakAge, remainingAging.declineResist),
    getClubLeagueTier(state.club),
  );
  return match.events
    .slice(match.currentEventIndex)
    .filter((event): event is PlayerMatchEvent => event.type === "player_moment")
    .flatMap((moment) => {
      const choice = chooseAutoSimChoice({
        moment,
        attributeValues: matchAttributeValues,
        fitness: getLiveMatchReadiness(match, match.results, moment.minute),
        trust: state.trust,
        matchSeed: match.matchSeed,
      });
      const result = { ...createMatchResult(state, moment, choice), source: "auto" as const };
      const followUp = createFollowUpMoment(match, moment, result);
      if (!followUp) {
        return [result];
      }

      const followUpChoice = chooseAutoSimChoice({
        moment: followUp,
        attributeValues: matchAttributeValues,
        fitness: getLiveMatchReadiness(match, [...match.results, result], followUp.minute),
        trust: state.trust,
        matchSeed: `${match.matchSeed}-follow-up`,
      });

      return [result, { ...createMatchResult(state, followUp, followUpChoice), source: "auto" as const }];
    });
}


// Auto-pick the contextually-best choice for a moment — the SAME deterministic picker the sim/skip
// path uses (reads league/age-adjusted attributes, live fitness, trust and the match seed).
export function chooseAutoChoiceForMoment(state: GameState, match: MatchState, moment: MatchMoment): MatchChoice {
  const aging = getAgingProfile(state);
  const attributeValues = getLeagueAdjustedAttributeValueMap(
    getAgeAdjustedAttributes(state.attributes, getPlayerAgeFromSeason(state.season.season), aging.peakAge, aging.declineResist),
    getClubLeagueTier(state.club),
  );
  return chooseAutoSimChoice({
    moment,
    attributeValues,
    fitness: getLiveMatchReadiness(match, match.results, moment.minute),
    trust: state.trust,
    matchSeed: match.matchSeed,
  });
}

// (B) Auto-resolve the current player moment via the simulation: the moment plays itself, then the UI
// reveals it as a chain highlight. Mirrors resolveMatchChoice's state shape but with an auto-picked
// choice — deterministic + reload-safe. The manual choice path (App.resolveMatchChoice + the choice
// cards) remains intact as a fallback and for future "defining moment" decisions.
export function autoResolveMomentState(state: GameState): GameState {
  const match = state.activeMatch;
  if (!match || match.currentResult) {
    return state;
  }
  const event = match.events[match.currentEventIndex];
  if (!event || event.type !== "player_moment") {
    return state;
  }
  const choice = chooseAutoChoiceForMoment(state, match, event);
  const result = { ...createMatchResult(state, event, choice), source: "auto" as const };
  const heat = clamp((match.heat ?? 0) + (result.heatDelta ?? 0), 0, 100);
  return {
    ...state,
    activeMatch: {
      ...match,
      currentResult: result,
      heat,
    },
  };
}


export function buildChoiceXp(choice: MatchChoice, tier: OutcomeTier, positionModule: PositionModule, moment: MatchMoment): Partial<Record<AttributeKey, number>> {
  const xp: Partial<Record<AttributeKey, number>> = {};
  const tierBase: Record<OutcomeTier, number> = {
    Poor: 4,
    Okay: 6,
    Good: 8,
    Great: 11,
  };
  const chainMultiplier = moment.chainDepth && moment.chainDepth > 0 ? 0.65 : 1;
  const base = Math.max(1, Math.round(tierBase[tier] * chainMultiplier));
  choice.uses.forEach((key, index) => {
    const keyAttributeBonus = positionModule.keyAttributes.includes(key) ? 1 : 0;
    xp[key] = (xp[key] ?? 0) + base + (index === 0 ? 2 : 0) + keyAttributeBonus;
  });

  if (choice.manager === "Likes") {
    const managerBonusAttribute = getManagerBonusAttribute(choice, positionModule);
    xp[managerBonusAttribute] = (xp[managerBonusAttribute] ?? 0) + Math.max(1, Math.round(2 * chainMultiplier));
  }

  if (positionModule.matchTendencies.preferredForwardCategories.includes(moment.category)) {
    const focusAttribute = choice.uses.find((key) => positionModule.keyAttributes.includes(key)) ?? choice.uses[0];
    xp[focusAttribute] = (xp[focusAttribute] ?? 0) + Math.max(1, Math.round(1 * chainMultiplier));
  }

  return xp;
}


export function getManagerBonusAttribute(choice: MatchChoice, positionModule: PositionModule): AttributeKey {
  return (
    choice.uses.find((key) => key === "Work Rate" || key === "Positioning") ??
    choice.uses.find((key) => positionModule.keyAttributes.includes(key)) ??
    positionModule.keyAttributes[0]
  );
}


export function getPositionAdjustedRating(
  rating: number,
  tier: OutcomeTier,
  decisiveOutcome: boolean,
  moment: MatchMoment,
  choice: MatchChoice,
  positionModule: PositionModule,
) {
  const weight = getPositionPerformanceWeight(moment, choice, positionModule);
  const tierScale: Record<OutcomeTier, number> = {
    Poor: -0.12,
    Okay: 0.08,
    Good: 0.22,
    Great: 0.34,
  };
  const decisiveScale = decisiveOutcome ? 0.16 : 0;
  const adjustment = (weight - 1) * (tierScale[tier] + decisiveScale);

  return Number(clamp(rating + adjustment, 5.4, 9.8).toFixed(1));
}


export function getPositionPerformanceWeight(moment: MatchMoment, choice: MatchChoice, positionModule: PositionModule) {
  const weights = positionModule.performanceWeights;

  if (choice.outcome === "goal") {
    return weights.goal;
  }
  if (choice.outcome === "assist") {
    return weights.assist;
  }
  if (moment.category === "defensive_set_piece") {
    return weights.defensive;
  }
  if (moment.category === "press") {
    return weights.defensive * 0.7 + weights.trust * 0.3;
  }
  if (moment.category === "link_up" || moment.category === "hold_up") {
    return weights.possession;
  }
  if (moment.category === "counter" || moment.category === "run_behind") {
    return weights.transition;
  }

  return weights.trust;
}


export function buildPerformanceReasons(
  moment: MatchMoment,
  choice: MatchChoice,
  result: Pick<MatchResult, "outcomeTier" | "rating" | "goals" | "assists" | "success"> & { decisiveOutcome: boolean },
  positionModule: PositionModule,
  xp: Partial<Record<AttributeKey, number>>,
) {
  const reasons = [
    `${positionModule.displayName} focus: ${getPositionFocusReason(moment, choice, positionModule)}.`,
    `${result.outcomeTier} action: ${getOutcomeReason(result, choice)}.`,
  ];
  const xpReason = getXpReason(xp, positionModule);
  if (xpReason) {
    reasons.push(xpReason);
  }
  if (choice.manager === "Likes") {
    reasons.push("Manager read: this choice matched the role instruction.");
  } else if (choice.manager === "Risky") {
    reasons.push("Manager read: risky choice with a bigger rating swing.");
  }

  return Array.from(new Set(reasons)).slice(0, 4);
}


export function getPositionFocusReason(moment: MatchMoment, choice: MatchChoice, positionModule: PositionModule) {
  const weight = getPositionPerformanceWeight(moment, choice, positionModule);
  if (weight >= 1.15) {
    return "the action strongly matched your role";
  }
  if (weight >= 0.95) {
    return "the action fit your expected job";
  }
  if (choice.outcome === "goal" && positionModule.group !== "Forward") {
    return "useful output, but not your main role expectation";
  }
  return "solid team work, but outside your highest-value focus";
}


export function getOutcomeReason(
  result: Pick<MatchResult, "outcomeTier" | "goals" | "assists" | "success"> & { decisiveOutcome: boolean },
  choice: MatchChoice,
) {
  if (result.goals > 0) {
    return "goal output gave the rating a clear lift";
  }
  if (result.assists > 0) {
    return "chance creation turned into direct output";
  }
  if (result.outcomeTier === "Great") {
    return "execution stood out even without direct output";
  }
  if (result.success) {
    return choice.outcome === "trust" ? "clean role action improved trust" : "good idea without the final decisive touch";
  }
  return "execution limited the rating gain";
}


export function getXpReason(xp: Partial<Record<AttributeKey, number>>, positionModule: PositionModule) {
  const topEntry = Object.entries(xp)
    .filter(([, value]) => (value ?? 0) > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0] as [AttributeKey, number] | undefined;

  if (!topEntry) {
    return undefined;
  }

  const [attribute, value] = topEntry;
  const keyNote = positionModule.keyAttributes.includes(attribute) ? " key attribute" : "";
  return `XP driver: ${attribute}${keyNote} gained +${value}.`;
}


export function getChoiceAttributeAverage(attributes: Attribute[], choice: MatchChoice) {
  const total = choice.uses.reduce((sum, key) => sum + getAttributeValue(attributes, key), 0);
  return Math.round(total / choice.uses.length);
}


export function createMatchSeed(state: GameState, context: UpcomingMatch) {
  return [
    "match",
    state.careerSeed ?? "",
    context.id,
    state.club.clubId ?? state.club.shortCode,
    state.world?.seasonNumber ?? state.season.season,
    state.season.season,
    state.season.fixtureIndex,
    state.week,
    state.seasonStats.apps,
  ].join("-");
}

