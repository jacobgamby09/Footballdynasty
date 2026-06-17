import {
  createSimEvents,
  createTeamMatchModel,
  chooseAutoSimChoice,
  resolvePlayerChoice,
  selectPlayerHighlights,
  seededNoise,
} from "../src/engine/matchEngineCore.js";
import { createPositionMatchPool } from "../src/engine/forwardMoments.js";

const runs = Number(process.argv.find((arg) => arg.startsWith("--runs="))?.split("=")[1] ?? 500);

const fixtures = [
  { id: "md1-aalborg", opponent: "Aalborg", venue: "Away", opponentStrength: 56, opponentForm: "Good", serviceLevel: "Mixed" },
  { id: "md2-roskilde", opponent: "Roskilde", venue: "Home", opponentStrength: 51, opponentForm: "Mixed", serviceLevel: "Good" },
  { id: "md3-viborg", opponent: "Viborg", venue: "Away", opponentStrength: 60, opponentForm: "Hot", serviceLevel: "Low" },
  { id: "md4-kolding", opponent: "Kolding", venue: "Home", opponentStrength: 48, opponentForm: "Poor", serviceLevel: "Good" },
  { id: "md5-horsens", opponent: "Horsens", venue: "Away", opponentStrength: 53, opponentForm: "Mixed", serviceLevel: "Mixed" },
  { id: "md6-esbjerg", opponent: "Esbjerg", venue: "Home", opponentStrength: 58, opponentForm: "Good", serviceLevel: "Low" },
  { id: "md7-fredericia", opponent: "Fredericia", venue: "Away", opponentStrength: 49, opponentForm: "Poor", serviceLevel: "Good" },
  { id: "md8-naestved", opponent: "Naestved", venue: "Home", opponentStrength: 61, opponentForm: "Hot", serviceLevel: "Mixed" },
  { id: "md9-silkeborg", opponent: "Silkeborg", venue: "Away", opponentStrength: 57, opponentForm: "Good", serviceLevel: "Low" },
  { id: "md10-randers", opponent: "Randers", venue: "Home", opponentStrength: 54, opponentForm: "Mixed", serviceLevel: "Good" },
  { id: "md11-vejle", opponent: "Vejle", venue: "Away", opponentStrength: 62, opponentForm: "Good", serviceLevel: "Mixed" },
  { id: "md12-hobro", opponent: "Hobro", venue: "Home", opponentStrength: 50, opponentForm: "Mixed", serviceLevel: "Good" },
];

const baseAttributes = {
  Finishing: 54,
  "Long Shots": 43,
  Passing: 45,
  Vision: 41,
  Dribbling: 48,
  "Off Ball": 50,
  Composure: 46,
  "First Touch": 49,
  Acceleration: 57,
  Pace: 52,
  Stamina: 55,
  Heading: 42,
  Strength: 44,
  "Work Rate": 61,
  Tackling: 32,
  Marking: 34,
  Positioning: 47,
};

const ovrWeights = {
  Finishing: 1.25,
  "Off Ball": 1.1,
  Composure: 1,
  "First Touch": 0.85,
  Acceleration: 0.85,
  Heading: 0.7,
  Strength: 0.55,
  "Work Rate": 0.55,
};

const forwardPreferredCategories = ["shot", "first_time_finish", "run_behind", "hold_up", "aerial_duel", "late_pressure"];
const forwardPerformanceWeights = { goal: 1.2, assist: 0.95, trust: 0.85, defensive: 0.65, possession: 0.75, transition: 0.9 };

const scenarios = [
  {
    name: "Baseline prospect",
    state: { trust: 38, fitness: 67, ratings: [], attributes: baseAttributes },
  },
  {
    name: "Improved finisher",
    state: { trust: 48, fitness: 72, ratings: [6.9, 7.1, 6.8], attributes: { ...baseAttributes, Finishing: 64, Composure: 56, "Off Ball": 58 } },
  },
  {
    name: "Low fitness",
    state: { trust: 38, fitness: 48, ratings: [6.2, 6.4], attributes: baseAttributes },
  },
  {
    name: "High trust",
    state: { trust: 62, fitness: 74, ratings: [7.1, 7.0, 7.3], attributes: baseAttributes },
  },
];

for (const scenario of scenarios) {
  const report = runScenario(scenario);
  printScenario(report);
}

function runScenario(scenario) {
  const aggregate = createAggregate();

  for (let index = 0; index < runs; index += 1) {
    const fixture = fixtures[index % fixtures.length];
    const matchSeed = `balance-${scenario.name}-${fixture.id}-${index}`;
    const context = buildContext(scenario.state, fixture, matchSeed);
    const result = simulateMatch(scenario.state, context, matchSeed);
    recordAggregate(aggregate, result);
  }

  return {
    scenario: scenario.name,
    runs,
    ...summarizeAggregate(aggregate),
  };
}

function buildContext(state, fixture, matchSeed) {
  const opponentProfile = buildOpponentProfile({
    opponentStrength: fixture.opponentStrength,
    opponentForm: fixture.opponentForm,
    serviceLevel: fixture.serviceLevel,
    seed: fixture.id,
  });
  const teamStrength = 52 + Math.round(getFormScore(state.ratings) / 12);
  const importance = fixture.competition?.includes("Cup")
    ? "High"
    : Math.abs(teamStrength - fixture.opponentStrength) <= 3
      ? "Normal"
      : "Low";
  const selection = getSelectionReport(state, fixture, importance);

  return {
    ...fixture,
    matchSeed,
    teamStrength,
    opponentProfile,
    matchImportance: importance,
    playerRole: selection.role,
    selection,
  };
}

function simulateMatch(state, context, matchSeed) {
  const teamMatchModel = createTeamMatchModel({
    matchSeed,
    teamStrength: context.teamStrength,
    trust: state.trust,
    formScore: getFormScore(state.ratings),
    venue: context.venue,
    serviceLevel: context.serviceLevel,
    opponentProfile: context.opponentProfile,
  });
  const simEvents = createSimEvents({
    matchSeed,
    model: teamMatchModel,
    opponentShort: context.opponent,
    managerInstruction: "Balance lab simulation",
  });
  const involvementScore =
    state.trust * 0.35 + state.fitness * 0.25 + getFormScore(state.ratings) * 0.2 + calculateOvr(state.attributes) * 0.2;
  const playerMomentCount = getPlayerMomentCount(context.playerRole, involvementScore);
  const moments = createPositionMatchPool({
    opponentShort: context.opponent,
    managerInstruction: "Balance lab simulation",
    tacticalFocus: "Balance lab forward focus.",
    fitness: state.fitness,
    momentPools: ["forward", "shared"],
  });
  const selectedMoments = selectPlayerHighlights({
    moments,
    count: playerMomentCount,
    matchSeed,
    playerWindowStart: 60,
    playerWindowEnd: 82,
    simEvents,
    role: context.playerRole,
    serviceLevel: context.serviceLevel,
    opponentProfile: context.opponentProfile,
    attributeValues: state.attributes,
    preferredCategories: forwardPreferredCategories,
  });
  const playerResults = selectedMoments.map((moment, index) => {
    const choice = chooseAutoSimChoice({
      moment,
      attributeValues: state.attributes,
      fitness: state.fitness,
      trust: state.trust,
      matchSeed,
    });
    return createMatchResult(state, context, moment, choice, `${matchSeed}-player-${index}`);
  });
  const simScore = simEvents.reduce(
    (score, event) => ({
      team: score.team + event.teamGoalDelta,
      opponent: score.opponent + event.opponentGoalDelta,
    }),
    { team: 0, opponent: 0 },
  );
  const playerGoals = playerResults.reduce((sum, result) => sum + result.goals, 0);
  const playerAssists = playerResults.reduce((sum, result) => sum + result.assists, 0);
  const playerTeamGoals = playerGoals + playerAssists;
  const playerRating = playerResults.length
    ? playerResults.reduce((sum, result) => sum + result.rating, 0) / playerResults.length
    : 6.4;

  return {
    scoreline: `${simScore.team + playerTeamGoals}-${simScore.opponent}`,
    teamGoals: simScore.team + playerTeamGoals,
    opponentGoals: simScore.opponent,
    simGoals: simScore.team + simScore.opponent,
    playerGoals,
    playerAssists,
    playerMomentCount,
    playerSuccesses: playerResults.filter((result) => result.success).length,
    outcomeTiers: playerResults.map((result) => result.outcomeTier),
    teamXg: teamMatchModel.teamXg,
    opponentXg: teamMatchModel.opponentXg,
    rating: Number((playerRating + simEvents.reduce((sum, event) => sum + event.ratingDelta, 0)).toFixed(2)),
    role: context.playerRole,
    fixture: context.opponent,
  };
}

function createMatchResult(state, context, moment, choice, resultSeed) {
  const result = resolvePlayerChoice({
    moment,
    choice,
    attributeValues: state.attributes,
    fitness: state.fitness,
    trust: state.trust,
    playerRole: context.playerRole,
    opponentProfile: context.opponentProfile,
    resultSeed,
  });

  return {
    ...result,
    rating: getPositionAdjustedRating(result.rating, result.outcomeTier, result.decisiveOutcome, moment, choice, forwardPerformanceWeights),
  };
}

function getPositionAdjustedRating(rating, tier, decisiveOutcome, moment, choice, weights) {
  const weight = getPositionPerformanceWeight(moment, choice, weights);
  const tierScale = {
    Poor: -0.12,
    Okay: 0.08,
    Good: 0.22,
    Great: 0.34,
  };
  const decisiveScale = decisiveOutcome ? 0.16 : 0;

  return Number(clamp(rating + (weight - 1) * (tierScale[tier] + decisiveScale), 5.4, 9.8).toFixed(1));
}

function getPositionPerformanceWeight(moment, choice, weights) {
  if (choice.outcome === "goal") return weights.goal;
  if (choice.outcome === "assist") return weights.assist;
  if (moment.category === "defensive_set_piece") return weights.defensive;
  if (moment.category === "press") return weights.defensive * 0.7 + weights.trust * 0.3;
  if (moment.category === "link_up" || moment.category === "hold_up") return weights.possession;
  if (moment.category === "counter" || moment.category === "run_behind") return weights.transition;
  return weights.trust;
}

function buildOpponentProfile(input) {
  const formModifier = input.opponentForm === "Hot" ? 4 : input.opponentForm === "Good" ? 2 : input.opponentForm === "Poor" ? -3 : 0;
  const strength = input.opponentStrength + formModifier;
  const lineRoll = seededNoise(`${input.seed}-line`);
  const pressingRoll = seededNoise(`${input.seed}-press`);
  const pressing = pressingRoll > 0.66 ? "Aggressive" : pressingRoll < 0.25 ? "Passive" : "Balanced";
  const serviceModifier = input.serviceLevel === "Low" ? 2 : input.serviceLevel === "Good" ? -1 : 0;

  return {
    overall: clampProfile(strength),
    attack: clampProfile(strength + profileSpread(input.seed, "attack", 5)),
    midfield: clampProfile(strength + profileSpread(input.seed, "midfield", 5)),
    defense: clampProfile(strength + serviceModifier + profileSpread(input.seed, "defense", 6)),
    keeper: clampProfile(strength + profileSpread(input.seed, "keeper", 7)),
    centerBackPace: clampProfile(strength + (lineRoll > 0.68 ? -3 : 1) + profileSpread(input.seed, "cb-pace", 8)),
    aerialDefense: clampProfile(strength + serviceModifier + profileSpread(input.seed, "aerial", 7)),
    discipline: clampProfile(strength + (pressing === "Aggressive" ? -3 : 2) + profileSpread(input.seed, "discipline", 6)),
    fatigueResistance: clampProfile(strength + (input.opponentForm === "Hot" ? 3 : 0) + profileSpread(input.seed, "fatigue", 6)),
  };
}

function getSelectionReport(state, fixture, importance = "Normal") {
  const form = getFormScore(state.ratings);
  const lastRating = state.ratings[state.ratings.length - 1] ?? 6.4;
  const trustImpact = Math.round(state.trust * 0.45);
  const fitnessImpact = Math.round((state.fitness - 50) * 0.15);
  const formImpact = Math.round((form - 50) * 0.18);
  const ratingImpact = Math.round((lastRating - 6.4) * 6);
  const importanceImpact = importance === "High" ? -3 : importance === "Low" ? 1 : 0;
  const fixtureImpact = fixture.opponentStrength >= 60 ? -2 : fixture.opponentStrength <= 50 ? 1 : 0;
  const score = clamp(22 + trustImpact + fitnessImpact + formImpact + ratingImpact + importanceImpact + fixtureImpact, 0, 100);

  return {
    score,
    role: getPlayerMatchRole(score),
  };
}

function getPlayerMomentCount(role, involvementScore) {
  const roleBase = { Bench: 0, "Impact Sub": 1, "Rotation Starter": 2, Starter: 2 };
  const bonus = involvementScore > 68 ? 1 : involvementScore > 54 && role !== "Bench" ? 1 : 0;
  return clamp(roleBase[role] + bonus, role === "Bench" ? 0 : 1, role === "Starter" ? 4 : 3);
}

function getPlayerMatchRole(selectionScore) {
  if (selectionScore >= 68) return "Starter";
  if (selectionScore >= 55) return "Rotation Starter";
  if (selectionScore >= 30) return "Impact Sub";
  return "Bench";
}

function calculateOvr(attributes) {
  const entries = Object.entries(ovrWeights);
  const weighted = entries.reduce((sum, [key, weight]) => sum + attributes[key] * weight, 0);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  return Math.round(weighted / totalWeight);
}

function getFormScore(ratings) {
  if (ratings.length === 0) return 50;
  const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return clamp(Math.round(50 + (average - 6.4) * 18), 0, 100);
}

function createAggregate() {
  return {
    scorelines: new Map(),
    roles: new Map(),
    fixtures: new Map(),
    matches: 0,
    totalGoals: 0,
    teamGoals: 0,
    opponentGoals: 0,
    playerGoals: 0,
    playerAssists: 0,
    playerMoments: 0,
    playerSuccesses: 0,
    outcomeTiers: new Map(),
    teamXg: 0,
    opponentXg: 0,
    ratings: [],
  };
}

function recordAggregate(aggregate, result) {
  aggregate.matches += 1;
  aggregate.totalGoals += result.teamGoals + result.opponentGoals;
  aggregate.teamGoals += result.teamGoals;
  aggregate.opponentGoals += result.opponentGoals;
  aggregate.playerGoals += result.playerGoals;
  aggregate.playerAssists += result.playerAssists;
  aggregate.playerMoments += result.playerMomentCount;
  aggregate.playerSuccesses += result.playerSuccesses;
  aggregate.teamXg += result.teamXg;
  aggregate.opponentXg += result.opponentXg;
  result.outcomeTiers.forEach((tier) => increment(aggregate.outcomeTiers, tier));
  aggregate.ratings.push(result.rating);
  increment(aggregate.scorelines, result.scoreline);
  increment(aggregate.roles, result.role);
  increment(aggregate.fixtures, result.fixture);
}

function summarizeAggregate(aggregate) {
  const zeroZero = aggregate.scorelines.get("0-0") ?? 0;
  const ratingAverage = aggregate.ratings.reduce((sum, rating) => sum + rating, 0) / aggregate.ratings.length;
  const poorRate = aggregate.playerMoments ? (aggregate.outcomeTiers.get("Poor") ?? 0) / aggregate.playerMoments : 0;
  const greatRate = aggregate.playerMoments ? (aggregate.outcomeTiers.get("Great") ?? 0) / aggregate.playerMoments : 0;
  return {
    avgGoals: aggregate.totalGoals / aggregate.matches,
    teamGoalsPerMatch: aggregate.teamGoals / aggregate.matches,
    opponentGoalsPerMatch: aggregate.opponentGoals / aggregate.matches,
    teamXgPerMatch: aggregate.teamXg / aggregate.matches,
    opponentXgPerMatch: aggregate.opponentXg / aggregate.matches,
    zeroZeroRate: zeroZero / aggregate.matches,
    playerMomentsPerMatch: aggregate.playerMoments / aggregate.matches,
    playerSuccessRate: aggregate.playerMoments ? aggregate.playerSuccesses / aggregate.playerMoments : 0,
    playerGoalRate: aggregate.playerGoals / aggregate.matches,
    playerAssistRate: aggregate.playerAssists / aggregate.matches,
    poorRate,
    greatRate,
    avgRating: ratingAverage,
    tierSplit: topEntries(aggregate.outcomeTiers, 4),
    topScorelines: topEntries(aggregate.scorelines, 8),
    roleSplit: topEntries(aggregate.roles, 4),
  };
}

function printScenario(report) {
  console.log(`\n=== ${report.scenario} (${report.runs} matches) ===`);
  console.log(`Avg goals: ${format(report.avgGoals)} | Team: ${format(report.teamGoalsPerMatch)} | Opp: ${format(report.opponentGoalsPerMatch)} | 0-0: ${percent(report.zeroZeroRate)}`);
  console.log(`Avg xG: Team ${format(report.teamXgPerMatch)} | Opp ${format(report.opponentXgPerMatch)}`);
  console.log(`Player highlights: ${format(report.playerMomentsPerMatch)}/match | Success: ${percent(report.playerSuccessRate)} | Goals: ${format(report.playerGoalRate)}/match | Assists: ${format(report.playerAssistRate)}/match`);
  console.log(`Outcome tiers: ${formatEntries(report.tierSplit)}`);
  console.log(`Avg rating: ${format(report.avgRating)} | Roles: ${formatEntries(report.roleSplit)}`);
  console.log(`Scorelines: ${formatEntries(report.topScorelines)}`);

  const warnings = [];
  if (report.zeroZeroRate > 0.25) warnings.push("0-0 rate is high");
  if (report.avgGoals < 1.6) warnings.push("avg goals may be too low");
  if (report.avgGoals > 3.2) warnings.push("avg goals may be too high");
  if (report.playerMomentsPerMatch < 0.8) warnings.push("player highlight frequency may be too low");
  if (report.poorRate > 0.35) warnings.push("too many poor outcomes may feel punishing");
  if (report.greatRate > 0.35) warnings.push("too many great outcomes may feel too heroic");
  if (report.greatRate < 0.08) warnings.push("great outcomes may be too rare");
  console.log(warnings.length ? `Warnings: ${warnings.join("; ")}` : "Warnings: none");
}

function topEntries(map, count) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, count);
}

function formatEntries(entries) {
  return entries.map(([key, value]) => `${key} ${value}`).join(", ");
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function format(value) {
  return value.toFixed(2);
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function profileSpread(seed, key, range) {
  return Math.round((seededNoise(`${seed}-${key}`) - 0.5) * range * 2);
}

function clampProfile(value) {
  return Math.max(25, Math.min(90, Math.round(value)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
