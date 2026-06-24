import { getMomentGenerationScore, getSimScoreAtMinute, seededNoise } from "./matchEngineCore.js";

const phaseCategoryWeights = {
  cagey_opening: {
    press: 1.25,
    hold_up: 1.2,
    link_up: 1.15,
    defensive_set_piece: 1.05,
    shot: 0.7,
    late_pressure: 0.55,
  },
  team_pressure: {
    shot: 1.3,
    first_time_finish: 1.25,
    run_behind: 1.18,
    aerial_duel: 1.12,
    link_up: 1.08,
  },
  opponent_pressure: {
    press: 1.22,
    counter: 1.2,
    defensive_set_piece: 1.2,
    hold_up: 1.08,
    shot: 0.76,
  },
  end_to_end: {
    counter: 1.35,
    run_behind: 1.25,
    shot: 1.18,
    link_up: 1.1,
    defensive_set_piece: 0.78,
  },
  protecting_lead: {
    hold_up: 1.3,
    press: 1.22,
    counter: 1.16,
    link_up: 1.08,
    shot: 0.82,
  },
  chasing_goal: {
    shot: 1.35,
    first_time_finish: 1.28,
    run_behind: 1.2,
    aerial_duel: 1.18,
    late_pressure: 1.15,
  },
  late_siege: {
    late_pressure: 1.5,
    shot: 1.38,
    first_time_finish: 1.3,
    aerial_duel: 1.25,
    defensive_set_piece: 0.7,
  },
  game_management: {
    hold_up: 1.35,
    link_up: 1.22,
    press: 1.14,
    counter: 1.05,
    shot: 0.72,
  },
};

// Player-controlled mentality shifts the category mix on top of the automatic phase weighting.
// `push` pulls toward attacking moments (and away from holding shape); `hold` does the inverse.
// `balanced` (or undefined) leaves the mix untouched.
const mentalityCategoryWeights = {
  push: {
    shot: 1.22,
    first_time_finish: 1.2,
    run_behind: 1.18,
    counter: 1.15,
    late_pressure: 1.12,
    aerial_duel: 1.08,
    hold_up: 0.82,
    press: 0.86,
    defensive_set_piece: 0.8,
    link_up: 0.95,
  },
  hold: {
    hold_up: 1.25,
    press: 1.18,
    defensive_set_piece: 1.2,
    link_up: 1.12,
    counter: 1.06,
    shot: 0.82,
    first_time_finish: 0.84,
    run_behind: 0.86,
    late_pressure: 0.9,
  },
};

const continuityWeights = {
  press: { counter: 1.18, late_pressure: 1.16, shot: 1.08 },
  counter: { run_behind: 1.2, shot: 1.18, link_up: 1.08 },
  run_behind: { shot: 1.2, first_time_finish: 1.18, link_up: 1.08 },
  hold_up: { link_up: 1.24, run_behind: 1.12, shot: 1.08 },
  link_up: { run_behind: 1.18, shot: 1.14, first_time_finish: 1.1 },
  aerial_duel: { shot: 1.15, late_pressure: 1.12 },
  defensive_set_piece: { counter: 1.22, press: 1.08 },
  shot: { press: 1.08, late_pressure: 1.06 },
  first_time_finish: { press: 1.08, link_up: 1.05 },
  late_pressure: { shot: 1.12, first_time_finish: 1.1 },
};

const categoryCooldowns = {
  shot: 10,
  first_time_finish: 11,
  run_behind: 10,
  hold_up: 8,
  aerial_duel: 11,
  press: 7,
  link_up: 7,
  counter: 10,
  defensive_set_piece: 12,
  late_pressure: 13,
};

export function createMatchDirectorPlan(input) {
  if (input.count <= 0 || input.playerWindowEnd <= input.playerWindowStart || input.moments.length === 0) {
    return {
      moments: [],
      state: createDirectorState(input.count),
    };
  }

  const state = createDirectorState(input.count);
  const available = [...input.moments];
  const targets = createTargetMinutes(input);
  const selected = [];

  targets.forEach((targetMinute, index) => {
    if (available.length === 0) {
      return;
    }

    const scoreAtMinute = getSimScoreAtMinute(input.simEvents, targetMinute);
    const phase = getMatchPhase({
      minute: targetMinute,
      scoreAtMinute,
      simEvents: input.simEvents,
      matchSeed: input.matchSeed,
    });
    const weightedPool = available.map((moment) => ({
      moment,
      weight: getDirectorMomentWeight({
        ...input,
        moment,
        phase,
        targetMinute,
        scoreAtMinute,
        state,
      }),
    }));
    const picked = pickWeightedMoment(weightedPool, seededNoise(`${input.matchSeed}-director-pick-${index}-${phase}`));
    const minute = findOpenMinute(targetMinute, input.simEvents, selected, input.playerWindowStart, input.playerWindowEnd);
    const narrativeTags = buildNarrativeTags(phase, scoreAtMinute, minute, state.recentCategories.at(-1));
    const plannedMoment = {
      ...picked,
      minute,
      directorPhase: phase,
      narrativeTags,
    };

    selected.push(plannedMoment);
    state.phase = phase;
    state.recentCategories.push(picked.category);
    state.usedMomentIds.push(picked.id);
    state.usedMomentFamilies.push(picked.director?.family ?? getMomentFamily(picked.id));
    state.phaseHistory.push(phase);
    state.lastHighlightMinute = minute;
    available.splice(available.findIndex((moment) => moment.id === picked.id), 1);
  });

  return { moments: selected, state };
}

export function getMatchPhase({ minute, scoreAtMinute, simEvents, matchSeed = "match" }) {
  const goalDiff = scoreAtMinute.teamGoals - scoreAtMinute.opponentGoals;
  if (minute >= 76 && goalDiff < 0) {
    return "late_siege";
  }
  if (minute >= 72 && goalDiff >= 2) {
    return "game_management";
  }
  if (goalDiff < 0) {
    return "chasing_goal";
  }
  if (goalDiff > 0) {
    return "protecting_lead";
  }
  if (minute <= 22) {
    return "cagey_opening";
  }

  const recentEvents = simEvents.filter((event) => event.minute >= minute - 13 && event.minute <= minute + 2);
  const teamThreat = recentEvents.filter((event) => event.type === "team_goal" || event.type === "team_chance").length;
  const opponentThreat = recentEvents.filter((event) => event.type === "opponent_goal" || event.type === "opponent_chance").length;
  if (teamThreat > 0 && opponentThreat > 0) {
    return "end_to_end";
  }
  if (teamThreat > opponentThreat) {
    return "team_pressure";
  }
  if (opponentThreat > teamThreat) {
    return "opponent_pressure";
  }
  return seededNoise(`${matchSeed}-${minute}-${scoreAtMinute.teamGoals}-${scoreAtMinute.opponentGoals}-phase`) > 0.5
    ? "team_pressure"
    : "cagey_opening";
}

export function canQueueDirectorFollowUp(input) {
  const playerMoments = input.match.events.filter((event) => event.type === "player_moment");
  const chainMoments = playerMoments.filter((event) => (event.chainDepth ?? 0) > 0);
  if (chainMoments.length >= input.maxChains) {
    return false;
  }
  if (playerMoments.length >= input.highlightBudget + input.maxChains) {
    return false;
  }

  const followUpMinute = input.moment.minute + 1;
  if (followUpMinute > (input.match.exitMinute ?? 90)) {
    return false;
  }

  return !input.match.events.some(
    (event) =>
      event.type !== "player_moment" &&
      (event.teamGoalDelta > 0 || event.opponentGoalDelta > 0) &&
      Math.abs(event.minute - followUpMinute) <= 1,
  );
}

function createDirectorState(highlightBudget) {
  return {
    phase: "cagey_opening",
    recentCategories: [],
    usedMomentIds: [],
    usedMomentFamilies: [],
    phaseHistory: [],
    lastHighlightMinute: undefined,
    highlightBudget,
    maxChains: highlightBudget >= 3 ? 2 : 1,
  };
}

function createTargetMinutes(input) {
  const duration = Math.max(1, input.playerWindowEnd - input.playerWindowStart);
  return Array.from({ length: input.count }, (_, index) => {
    const segmentStart = input.playerWindowStart + (duration * index) / input.count;
    const segmentEnd = input.playerWindowStart + (duration * (index + 1)) / input.count;
    const roll = 0.22 + seededNoise(`${input.matchSeed}-director-minute-${index}`) * 0.56;
    return Math.round(segmentStart + (segmentEnd - segmentStart) * roll);
  });
}

function getDirectorMomentWeight(input) {
  const baseWeight = getMomentGenerationScore({
    moment: input.moment,
    attributeValues: input.attributeValues,
    role: input.role,
    serviceLevel: input.serviceLevel,
    opponentProfile: input.opponentProfile,
    matchSeed: input.matchSeed,
    targetMinute: input.targetMinute,
    scoreAtMinute: input.scoreAtMinute,
    preferredCategories: input.preferredCategories,
  });
  const metadata = input.moment.director;
  const phaseEligibility = metadata?.phases?.length
    ? metadata.phases.includes(input.phase)
      ? 1.15
      : 0.08
    : 1;
  const scoreState = getScoreState(input.scoreAtMinute);
  const scoreEligibility = metadata?.scoreStates?.length
    ? metadata.scoreStates.includes(scoreState)
      ? 1.1
      : 0.12
    : 1;
  const minuteEligibility = metadata?.minuteRange
    ? input.targetMinute >= metadata.minuteRange[0] && input.targetMinute <= metadata.minuteRange[1]
      ? 1.08
      : 0.06
    : 1;
  const rarityWeight =
    metadata?.rarity === "rare"
      ? 0.28
      : metadata?.rarity === "uncommon"
        ? 0.58
        : 1;
  const phaseWeight = phaseCategoryWeights[input.phase]?.[input.moment.category] ?? 0.92;
  const mentalityWeight =
    input.mentality && input.mentality !== "balanced"
      ? mentalityCategoryWeights[input.mentality]?.[input.moment.category] ?? 1
      : 1;
  const previousCategory = input.state.recentCategories.at(-1);
  const continuityWeight = previousCategory
    ? continuityWeights[previousCategory]?.[input.moment.category] ?? 1
    : 1;
  const recentDistance = input.state.lastHighlightMinute === undefined
    ? Number.POSITIVE_INFINITY
    : input.targetMinute - input.state.lastHighlightMinute;
  const cooldown = metadata?.cooldown ?? categoryCooldowns[input.moment.category] ?? 8;
  const repetitionWeight = input.state.recentCategories.includes(input.moment.category)
    ? recentDistance < cooldown
      ? 0.18
      : 0.58
    : 1;
  const momentFamily = metadata?.family ?? getMomentFamily(input.moment.id);
  const duplicateFamilyWeight = input.state.usedMomentFamilies.includes(momentFamily)
    ? 0.52
    : 1;

  return Math.max(
    0.001,
    baseWeight *
      phaseEligibility *
      scoreEligibility *
      minuteEligibility *
      rarityWeight *
      phaseWeight *
      mentalityWeight *
      continuityWeight *
      repetitionWeight *
      duplicateFamilyWeight,
  );
}

function findOpenMinute(target, simEvents, selected, min, max) {
  const blockedMinutes = new Set([
    ...simEvents
      .filter((event) => event.type === "team_goal" || event.type === "opponent_goal")
      .flatMap((event) => [event.minute - 1, event.minute, event.minute + 1]),
    ...selected.flatMap((moment) => [moment.minute - 4, moment.minute - 3, moment.minute - 2, moment.minute - 1, moment.minute, moment.minute + 1, moment.minute + 2, moment.minute + 3, moment.minute + 4]),
  ]);
  const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5];
  const available = offsets
    .map((offset) => clamp(target + offset, min, max))
    .find((minute) => !blockedMinutes.has(minute));
  return available ?? clamp(target, min, max);
}

function buildNarrativeTags(phase, scoreAtMinute, minute, previousCategory) {
  const tags = [phase];
  const goalDiff = scoreAtMinute.teamGoals - scoreAtMinute.opponentGoals;
  tags.push(goalDiff < 0 ? "trailing" : goalDiff > 0 ? "leading" : "level");
  if (minute >= 75) {
    tags.push("late");
  }
  if (previousCategory) {
    tags.push(`after_${previousCategory}`);
  }
  return tags;
}

function getScoreState(scoreAtMinute) {
  const goalDiff = scoreAtMinute.teamGoals - scoreAtMinute.opponentGoals;
  return goalDiff < 0 ? "trailing" : goalDiff > 0 ? "leading" : "level";
}

function getMomentFamily(id) {
  return id.split("-").slice(0, 2).join("-");
}

function pickWeightedMoment(weightedPool, roll) {
  const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
  let cursor = roll * totalWeight;
  for (const item of weightedPool) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.moment;
    }
  }
  return weightedPool[weightedPool.length - 1].moment;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
