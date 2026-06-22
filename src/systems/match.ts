import { createPositionMatchPool } from "../engine/forwardMoments";
import { chooseAutoSimChoice, createSimEvents, createTeamMatchModel, getSimScoreAtMinute, resolvePlayerChoice, seededNoise, selectPlayerHighlights } from "../engine/matchEngineCore";
import { getPositionModule } from "../positionRoles";
import { clamp } from "../utils";
import { advanceContractWeek, getClubContractOffer, getMatchContractEarnings, getTransferMarketOffers } from "./contracts";
import { getFormScore } from "./formatting";
import { calculateOvr, getAttributeValue, getClubLeagueTier, getContextualAbilityScore, getLeagueAdjustedAttributeValueMap, getLeagueAdjustedOpponentProfile } from "./ovr";
import { advanceSeasonFixture, createFixtureResult, getCurrentFixture, getNextFixtureAfterMatch, isSeasonComplete } from "./seasonState";
import { getPlayerMomentCount, getSelectionReport } from "./selection";
import { getMatchPrestigeDelta } from "./prestige";
import { advanceSponsorWeek, getSponsorPayout } from "./sponsors";
import { applyRecoveryCeiling, applyRecoveryFloor, getMatchActionRecoveryRelief, getRecoveryFitnessCeiling, getRecoveryFitnessFloor, getSponsorAppealBonus, getSupportLevel, getSupportTrackBreakthroughCount, getWeeklySupportRecoveryBonus } from "./support";
import { addAttributeXp, getDevelopmentEnvironment } from "./training";
import { advanceWorldMatchweek } from "./world";
import type { AttributeKey, PositionModule } from "../positionRoles";
import type { Attribute, ChanceQuality, GameState, LastMatchSummary, MatchChoice, MatchEvent, MatchMoment, MatchResult, MatchState, MatchTotals, OutcomeTier, PlayerMatchEvent, SimMatchEvent, UpcomingMatch } from "../types";

export function getPreMatchEntryPlan(match: MatchState) {
  if (match.isInSquad === false || match.fitnessAvailability === "Out") {
    return "Likely rested";
  }

  if (match.fitnessAvailability === "Critical") {
    return "Emergency only";
  }

  if (match.playerRole === "Starter") {
    return match.fitnessAvailability === "Heavy" || match.fitnessAvailability === "Tired"
      ? "Start, managed load"
      : "Start XI";
  }

  if (match.playerRole === "Rotation Starter") {
    return match.fitnessAvailability === "Heavy" ? "Limited start" : "Start or early rotation";
  }

  if (match.playerRole === "Impact Sub") {
    return match.fitnessAvailability === "Heavy" ? "If chasing late" : "Second-half option";
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
  const baseFitnessDelta = match ? getMatchFitnessDelta(match, results) + weeklyRecoveryBonus : rawTotals.fitnessDelta + weeklyRecoveryBonus;
  const projectedFitness = clamp(state.fitness + baseFitnessDelta, 0, 100);
  const recoveryFloor = getRecoveryFitnessFloor(effectiveRecoveryBaselineLevel, recoveryBreakthroughs);
  const recoveryCeiling = getRecoveryFitnessCeiling(effectiveRecoveryBaselineLevel, recoveryBreakthroughs);
  const adjustedFitness = applyRecoveryCeiling(applyRecoveryFloor(state.fitness, projectedFitness, recoveryFloor), recoveryCeiling);
  const totals = { ...rawTotals, fitnessDelta: adjustedFitness - state.fitness };
  const trustAfter = clamp(state.trust + totals.trustDelta, 0, 100);
  const playerAppeared = didPlayerAppear(match);
  const moraleDelta = playerAppeared ? (totals.rating >= 7 ? 3 : -2) : 0;
  const contractEarnings = getMatchContractEarnings(state.contract, totals, playerAppeared);
  const sponsorPayout = applySponsorAppealBonus(
    getSponsorPayout(state.sponsor, totals, playerAppeared),
    getSponsorAppealBonus(getSupportLevel(state, "sponsorshipAppeal")),
  );
  const cashDelta = contractEarnings.total + sponsorPayout.total;
  const prestigeDelta =
    match
      ? getMatchPrestigeDelta({
          totals,
          tierId: state.club.tierId,
          matchImportance: match.matchImportance,
          playerAppeared,
        })
      : 0;
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
  const updatedWorld = fixtureResult
    ? advanceWorldMatchweek(
        state.world,
        state.club.shortCode,
        { outcome: fixtureResult.outcome, goalsFor: fixtureResult.teamGoals, goalsAgainst: fixtureResult.opponentGoals },
        state.season.results.length,
      )
    : state.world;
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
  };
  let contractOffer = state.contractOffer;
  let contractOffers = state.contractOffers;
  if (!isSeasonComplete(updatedSeason) && !contractOffer && !contractOffers?.length) {
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

  return {
    ...stateForOffer,
    contractOffer,
    contractOffers,
    lastEvent: getMatchSummaryText(results, totals),
    lastMatch,
    activeMatch: undefined,
  };
}


export function didPlayerAppear(match?: MatchState) {
  if (!match || match.isInSquad === false || match.fitnessAvailability === "Out") {
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
    careerImpact: getCareerImpactLines(totals, roleBefore, roleAfter, selectionBefore, selectionAfter, pointsToNextRole),
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
      rating: Number(clamp(emptySummary.rating, 5.4, 7.4).toFixed(1)),
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
    rating: Number(clamp(totals.rating / results.length, 5.4, 9.6).toFixed(1)),
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


export function getExplanationCopy(tag: string) {
  const copies: Record<string, string> = {
    execution_helped: "Your execution matched the moment.",
    execution_lacked: "The action lacked the final sharpness.",
    quality_clear_chance: "Clear chance created.",
    quality_good_chance: "Good chance quality.",
    quality_half_chance: "Only a half chance.",
    quality_difficult_chance: "Difficult chance under pressure.",
    opponent_countered_action: "Opponent profile countered this action.",
    fatigue_limited_action: "Fatigue reduced your execution.",
    high_risk_choice: "High-risk choice raised the swing.",
    highlight_shot: "Finishing moment.",
    highlight_first_time_finish: "First-touch finish moment.",
    highlight_run_behind: "Movement behind the line mattered.",
    highlight_hold_up: "Hold-up play shaped the action.",
    highlight_aerial_duel: "Aerial duel context.",
    highlight_press: "Pressing and work rate mattered.",
    highlight_link_up: "Link-up decision.",
    highlight_counter: "Counterattack context.",
    highlight_defensive_set_piece: "Set-piece responsibility.",
    highlight_late_pressure: "Late pressure moment.",
  };

  return copies[tag] ?? tag.replace(/_/g, " ");
}


export function getReadableExplanations(tags: string[], limit = 3) {
  const priority = [
    "quality_clear_chance",
    "quality_good_chance",
    "quality_half_chance",
    "quality_difficult_chance",
    "opponent_countered_action",
    "fatigue_limited_action",
    "high_risk_choice",
    "execution_helped",
    "execution_lacked",
  ];
  const uniqueTags = Array.from(new Set(tags));
  const sortedTags = uniqueTags.sort((a, b) => {
    const aIndex = priority.includes(a) ? priority.indexOf(a) : priority.length;
    const bIndex = priority.includes(b) ? priority.indexOf(b) : priority.length;
    return aIndex - bIndex;
  });

  return sortedTags.slice(0, limit).map((tag) => getExplanationCopy(tag));
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
      const goalText =
        event.teamGoalDelta > 0
          ? ` Goal for ${match.teamShortName}.`
          : event.opponentGoalDelta > 0
            ? ` Goal for ${match.opponent}.`
            : "";
      return [
        {
          id: event.id,
          minute: event.minute,
          text: `${event.title}.${goalText}`,
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
        text: output,
      },
    ];
  });

  const playerStatusEvents = [
    match.entryMinute > 0 && match.liveMinute >= match.entryMinute
      ? {
          id: "player-sub-on",
          minute: match.entryMinute,
          text: "You are sent on from the bench.",
        }
      : undefined,
    match.exitMinute && match.liveMinute >= match.exitMinute
      ? {
          id: "player-sub-off",
          minute: match.exitMinute,
          text: "You are subbed off.",
        }
      : undefined,
  ].filter((item): item is { id: string; minute: number; text: string } => !!item);

  return [...processed, ...playerStatusEvents].sort((a, b) => a.minute - b.minute).slice(-4);
}


export function getAppearanceText(match: MatchState) {
  if (match.isInSquad === false || match.fitnessAvailability === "Out" || match.entryMinute > 90) {
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
  if (!context.isInSquad || context.fitnessAvailability === "Out") {
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
    if (context.fitnessAvailability === "Critical") {
      return { entryMinute: clamp(window.start + variation + earlyEvent + (teamGoalDiff < 0 ? -4 : 0), 80, 89) };
    }

    return { entryMinute: clamp(window.start + variation + earlyEvent + (teamGoalDiff < 0 ? -6 : 0), 60, 89) };
  }

  if (role === "Impact Sub") {
    const fitnessDelay =
      context.fitnessAvailability === "Critical" ? 12 : context.fitnessAvailability === "Heavy" ? 6 : 0;
    return { entryMinute: clamp(66 + variation + earlyEvent + matchStateAdjustment + fitnessDelay, 48, 86) };
  }

  if (role === "Rotation Starter") {
    const fatigueExit =
      context.fitnessAvailability === "Heavy" ? -14 : context.fitnessAvailability === "Tired" ? -8 : 0;
    const exitAdjustment = fatigueExit + (teamGoalDiff >= 2 ? -5 : teamGoalDiff < 0 ? 6 : 0);
    return { entryMinute: 0, exitMinute: clamp(window.end + variation + exitAdjustment, 55, 86) };
  }

  if (role === "Starter" && ["Critical", "Heavy", "Tired"].includes(context.fitnessAvailability)) {
    const exitBase = context.fitnessAvailability === "Critical" ? 58 : context.fitnessAvailability === "Heavy" ? 66 : 76;
    return { entryMinute: 0, exitMinute: clamp(exitBase + variation, 50, 88) };
  }

  return { entryMinute: 0 };
}


export function createMatch(state: GameState, context: UpcomingMatch): MatchState {
  const matchSeed = createMatchSeed(state, context);
  const positionModule = getPositionModule(state.positionGroup);
  const leagueTier = getClubLeagueTier(state.club);
  const matchAttributeValues = getLeagueAdjustedAttributeValueMap(state.attributes, leagueTier);
  const matchOpponentProfile = getLeagueAdjustedOpponentProfile(context.opponentProfile, leagueTier);
  const contextualOvr = getContextualAbilityScore(calculateOvr(state.attributes, positionModule.ovrWeights), leagueTier);
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
    context.isInSquad && context.fitnessAvailability !== "Out" && appearanceWindow.entryMinute <= 90
      ? Math.max(0, clamp(appearanceWindow.exitMinute ?? 90, appearanceWindow.entryMinute, 90) - clamp(appearanceWindow.entryMinute, 0, 90))
      : 0;
  const involvementScore =
    state.trust * 0.35 +
    state.fitness * 0.25 +
    getFormScore(state.seasonStats.ratings) * 0.2 +
    contextualOvr * 0.2 +
    positionModule.matchTendencies.involvementBias[context.playerRole] * 10;
  const playerMomentCount = context.isInSquad ? getPlayerMomentCount(context.playerRole, involvementScore, appearanceMinutes, matchSeed) : 0;
  const selectedMoments = selectPlayerHighlights({
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
  const playerEvents: PlayerMatchEvent[] = playerMomentCount <= 0 || selectedMoments.length === 0 ? [] : Array.from({ length: playerMomentCount }, (_, index) => {
    const moment = selectedMoments[index % selectedMoments.length];
    const spread = playerMomentCount === 1 ? 0.5 : index / (playerMomentCount - 1);
    const roleMinute = Math.round(playerWindowStart + (playerWindowEnd - playerWindowStart) * spread);
    const minuteNoise = Math.round(seededNoise(`${matchSeed}-player-minute-${index}`) * 8) - 4;
    return {
      ...moment,
      type: "player_moment" as const,
      minute: clamp(Math.round((moment.minute + roleMinute) / 2) + index * 2 + minuteNoise, playerWindowStart, playerWindowEnd),
    };
  });
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
    entryMinute: appearanceWindow.entryMinute,
    exitMinute: appearanceWindow.exitMinute,
    managerInstruction: context.managerInstruction,
    tacticalFocus: context.tacticalFocus,
    score: "0-0",
    events,
    currentEventIndex: 0,
    liveMinute: 0,
    results: [],
    isComplete: false,
  };
}


export function createMatchResult(state: GameState, moment: MatchMoment, choice: MatchChoice): MatchResult {
  const resultSeed = `${state.activeMatch?.matchSeed ?? "match"}-${moment.id}-${choice.id}-${state.activeMatch?.results.length ?? 0}`;
  const positionModule = getPositionModule(state.activeMatch?.positionGroup ?? state.positionGroup);
  const leagueTier = getClubLeagueTier(state.club);
  const matchAttributeValues = getLeagueAdjustedAttributeValueMap(state.attributes, leagueTier);
  const matchOpponentProfile = state.activeMatch
    ? getLeagueAdjustedOpponentProfile(state.activeMatch.opponentProfile, leagueTier)
    : undefined;
  const coreResult = resolvePlayerChoice({
    moment,
    choice,
    attributeValues: matchAttributeValues,
    fitness: state.fitness,
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
  const choiceMeta = {
    choiceId: choice.id,
    choiceLabel: choice.label,
    choiceOutcome: choice.outcome,
  };

  if (choice.outcome === "goal") {
    return {
      title: supportAdjustedResult.decisiveOutcome ? "Clinical action" : supportAdjustedResult.success ? `Useful ${positionLabel} action` : "Chance slips away",
      detail: supportAdjustedResult.decisiveOutcome
        ? `${moment.minute}': ${choice.label} works. You turn the moment into a goal and your match rating jumps.`
        : supportAdjustedResult.success
          ? `${moment.minute}': ${choice.label} is the right idea and keeps the attack alive, but it does not become a clear finish.`
          : `${moment.minute}': ${choice.label} is the right idea, but the execution is not clean enough this time.`,
      ...supportAdjustedResult,
      ...choiceMeta,
      performanceReasons,
      xp,
    };
  }

  if (choice.outcome === "assist") {
    return {
      title: supportAdjustedResult.assists > 0 ? "Assist" : supportAdjustedResult.chancesCreated > 0 ? "Chance created" : supportAdjustedResult.success ? "Attack connected" : "Move breaks down",
      detail: supportAdjustedResult.assists > 0
        ? `${moment.minute}': ${choice.label} opens the defense and gives a teammate the clean finish.`
        : supportAdjustedResult.chancesCreated > 0
          ? `${moment.minute}': ${choice.label} opens the defense, but the finish does not come.`
        : supportAdjustedResult.success
          ? `${moment.minute}': ${choice.label} helps the move, but the final chance never fully opens.`
          : `${moment.minute}': ${choice.label} nearly unlocks them, but the final connection is missing.`,
      ...supportAdjustedResult,
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
    ...supportAdjustedResult,
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

  const followUpMinute = clamp(moment.minute + 1, moment.minute, Math.min(match.exitMinute ?? 90, 90));
  return {
    ...template,
    id: `${moment.id}-${result.choiceId}-follow-up`,
    type: "player_moment",
    minute: followUpMinute,
    opponent: moment.opponent,
    chainDepth: (moment.chainDepth ?? 0) + 1,
  };
}


export function getFollowUpTemplate(moment: MatchMoment, result: MatchResult): Omit<PlayerMatchEvent, "id" | "type" | "minute" | "opponent"> | undefined {
  if (result.choiceOutcome === "defense") {
    return undefined;
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


export function applyMatchSupportEffects<T extends { rating: number; fitnessDelta: number }>(state: GameState, result: T): T {
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const matchRecoveryLevel = getSupportLevel(state, "matchRecovery") * environment.supportEfficiency;

  return {
    ...result,
    fitnessDelta: Math.min(0, result.fitnessDelta + getMatchActionRecoveryRelief(matchRecoveryLevel)),
  };
}


export function simulateRemainingPlayerMoments(state: GameState, match: MatchState): MatchResult[] {
  const matchAttributeValues = getLeagueAdjustedAttributeValueMap(state.attributes, getClubLeagueTier(state.club));
  return match.events
    .slice(match.currentEventIndex)
    .filter((event): event is PlayerMatchEvent => event.type === "player_moment")
    .flatMap((moment) => {
      const choice = chooseAutoSimChoice({
        moment,
        attributeValues: matchAttributeValues,
        fitness: state.fitness,
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
        fitness: state.fitness,
        trust: state.trust,
        matchSeed: `${match.matchSeed}-follow-up`,
      });

      return [result, { ...createMatchResult(state, followUp, followUpChoice), source: "auto" as const }];
    });
}


export function buildChoiceXp(choice: MatchChoice, tier: OutcomeTier, positionModule: PositionModule, moment: MatchMoment): Partial<Record<AttributeKey, number>> {
  const xp: Partial<Record<AttributeKey, number>> = {};
  const tierBase: Record<OutcomeTier, number> = {
    Poor: 5,
    Okay: 8,
    Good: 11,
    Great: 15,
  };
  const chainMultiplier = moment.chainDepth && moment.chainDepth > 0 ? 0.65 : 1;
  const base = Math.max(1, Math.round(tierBase[tier] * chainMultiplier));
  choice.uses.forEach((key, index) => {
    const keyAttributeBonus = positionModule.keyAttributes.includes(key) ? 1 : 0;
    xp[key] = (xp[key] ?? 0) + base + (index === 0 ? 3 : 0) + keyAttributeBonus;
  });

  if (choice.manager === "Likes") {
    const managerBonusAttribute = getManagerBonusAttribute(choice, positionModule);
    xp[managerBonusAttribute] = (xp[managerBonusAttribute] ?? 0) + Math.max(1, Math.round(3 * chainMultiplier));
  }

  if (positionModule.matchTendencies.preferredForwardCategories.includes(moment.category)) {
    const focusAttribute = choice.uses.find((key) => positionModule.keyAttributes.includes(key)) ?? choice.uses[0];
    xp[focusAttribute] = (xp[focusAttribute] ?? 0) + Math.max(1, Math.round(2 * chainMultiplier));
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
    context.id,
    state.club.clubId ?? state.club.shortCode,
    state.world?.seasonNumber ?? state.season.season,
    state.season.season,
    state.season.fixtureIndex,
    state.week,
    state.seasonStats.apps,
  ].join("-");
}

