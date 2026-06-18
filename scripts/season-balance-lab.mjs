import {
  createSimEvents,
  createTeamMatchModel,
  chooseAutoSimChoice,
  getSimScoreAtMinute,
  resolvePlayerChoice,
  selectPlayerHighlights,
  seededNoise,
} from "../src/engine/matchEngineCore.js";
import { createPositionMatchPool } from "../src/engine/forwardMoments.js";

const seasons = Number(process.argv.find((arg) => arg.startsWith("--seasons="))?.split("=")[1] ?? 300);
const careerSeasons = Number(process.argv.find((arg) => arg.startsWith("--career-seasons="))?.split("=")[1] ?? 1);
const generationCount = Number(process.argv.find((arg) => arg.startsWith("--generations="))?.split("=")[1] ?? 1);
const leagueAverageOvr = 15;
const teamStrength = 15;
const weeklyWage = 45;
const appearanceBonus = 8;
const goalBonus = 18;
const assistBonus = 12;

const fixtures = [
  { id: "md1-aalborg", opponent: "Aalborg", venue: "Away", opponentStrength: 17, opponentForm: "Good", serviceLevel: "Mixed" },
  { id: "md2-roskilde", opponent: "Roskilde", venue: "Home", opponentStrength: 14, opponentForm: "Mixed", serviceLevel: "Good" },
  { id: "md3-viborg", opponent: "Viborg", venue: "Away", opponentStrength: 21, opponentForm: "Hot", serviceLevel: "Low" },
  { id: "md4-kolding", opponent: "Kolding", venue: "Home", opponentStrength: 12, opponentForm: "Poor", serviceLevel: "Good" },
  { id: "md5-horsens", opponent: "Horsens", venue: "Away", opponentStrength: 15, opponentForm: "Mixed", serviceLevel: "Mixed" },
  { id: "md6-esbjerg", opponent: "Esbjerg", venue: "Home", opponentStrength: 19, opponentForm: "Good", serviceLevel: "Low" },
  { id: "md7-fredericia", opponent: "Fredericia", venue: "Away", opponentStrength: 11, opponentForm: "Poor", serviceLevel: "Good" },
  { id: "md8-naestved", opponent: "Naestved", venue: "Home", opponentStrength: 22, opponentForm: "Hot", serviceLevel: "Mixed" },
  { id: "md9-silkeborg", opponent: "Silkeborg", venue: "Away", opponentStrength: 18, opponentForm: "Good", serviceLevel: "Low" },
  { id: "md10-randers", opponent: "Randers", venue: "Home", opponentStrength: 16, opponentForm: "Mixed", serviceLevel: "Good" },
  { id: "md11-vejle", opponent: "Vejle", venue: "Away", opponentStrength: 22, opponentForm: "Good", serviceLevel: "Mixed" },
  { id: "md12-hobro", opponent: "Hobro", venue: "Home", opponentStrength: 20, opponentForm: "Mixed", serviceLevel: "Good" },
];

const baseAttributes = {
  Finishing: { value: 18, potential: 48, xp: 22 },
  "Long Shots": { value: 12, potential: 38, xp: 8 },
  Passing: { value: 14, potential: 42, xp: 14 },
  Vision: { value: 13, potential: 40, xp: 12 },
  Dribbling: { value: 16, potential: 45, xp: 17 },
  "Off Ball": { value: 17, potential: 50, xp: 16 },
  Composure: { value: 14, potential: 46, xp: 24 },
  "First Touch": { value: 16, potential: 47, xp: 19 },
  Acceleration: { value: 20, potential: 52, xp: 15 },
  Pace: { value: 18, potential: 49, xp: 13 },
  Stamina: { value: 17, potential: 48, xp: 18 },
  Heading: { value: 13, potential: 39, xp: 9 },
  Strength: { value: 12, potential: 41, xp: 11 },
  "Work Rate": { value: 19, potential: 51, xp: 20 },
  Tackling: { value: 8, potential: 31, xp: 6 },
  Marking: { value: 9, potential: 32, xp: 7 },
  Positioning: { value: 13, potential: 42, xp: 15 },
};

const generationProfiles = [
  { generation: 1, label: "Local bloodline", startKeyBonus: 0, startGeneralBonus: 0, potentialKeyBonus: 0, potentialGeneralBonus: 0 },
  { generation: 2, label: "Known surname", startKeyBonus: 2, startGeneralBonus: 1, potentialKeyBonus: 8, potentialGeneralBonus: 5 },
  { generation: 3, label: "Family prospect", startKeyBonus: 4, startGeneralBonus: 2, potentialKeyBonus: 16, potentialGeneralBonus: 10 },
  { generation: 4, label: "Academy heir", startKeyBonus: 6, startGeneralBonus: 3, potentialKeyBonus: 25, potentialGeneralBonus: 16 },
  { generation: 5, label: "Elite pathway", startKeyBonus: 8, startGeneralBonus: 4, potentialKeyBonus: 35, potentialGeneralBonus: 23 },
  { generation: 6, label: "Dynasty talent", startKeyBonus: 10, startGeneralBonus: 5, potentialKeyBonus: 45, potentialGeneralBonus: 30 },
];

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

const focusCycle = ["Finishing", "Off Ball", "Composure", "First Touch", "Acceleration", "Work Rate"];
const forwardPreferredCategories = ["shot", "first_time_finish", "run_behind", "hold_up", "aerial_duel", "late_pressure"];
const forwardPerformanceWeights = { goal: 1.2, assist: 0.95, trust: 0.85, defensive: 0.65, possession: 0.75, transition: 0.9 };
const bootsActionAttributes = ["Finishing", "First Touch", "Dribbling", "Acceleration", "Pace"];
const leagueTiers = [
  { id: "grassroots-dev", label: "Grassroots", averageOvr: 15, facilityLevel: 1 },
  { id: "local-semi-pro", label: "Semi-Pro", averageOvr: 28, facilityLevel: 2 },
  { id: "regional-pro", label: "Regional Pro", averageOvr: 42, facilityLevel: 3 },
  { id: "national-pro", label: "National Pro", averageOvr: 58, facilityLevel: 4 },
  { id: "top-flight", label: "Top Flight", averageOvr: 74, facilityLevel: 5 },
  { id: "elite", label: "Elite", averageOvr: 88, facilityLevel: 6 },
];
const supportUpgradeDefinitions = [
  { id: "boots", maxLevel: 12, baseCost: 180 },
  { id: "recovery", maxLevel: 15, baseCost: 160 },
  { id: "coach", maxLevel: 15, baseCost: 220 },
  { id: "nutrition", maxLevel: 15, baseCost: 140 },
  { id: "analyst", maxLevel: 10, baseCost: 260 },
  { id: "agent", maxLevel: 10, baseCost: 300 },
  { id: "lifestyle", maxLevel: 12, baseCost: 150 },
];
const supportUpgradeMap = Object.fromEntries(supportUpgradeDefinitions.map((upgrade) => [upgrade.id, upgrade]));
const supportTrackDefinitions = [
  { id: "training", upgradeIds: ["coach"], breakpoints: [3, 7, 12, 15] },
  { id: "recovery", upgradeIds: ["nutrition", "recovery"], breakpoints: [4, 9, 15, 24, 30] },
  { id: "performance", upgradeIds: ["boots", "analyst"], breakpoints: [4, 9, 15, 22] },
  { id: "career", upgradeIds: ["agent"], breakpoints: [2, 5, 8, 10] },
  { id: "lifestyle", upgradeIds: ["lifestyle"], breakpoints: [3, 6, 9, 12] },
];
const supportScenarios = [
  { id: "none", label: "No upgrades", priorities: [], cashReserve: 999999 },
  { id: "balanced", label: "Balanced spending", priorities: ["nutrition", "coach", "recovery", "boots", "analyst", "agent", "lifestyle"], cashReserve: 80, spread: true },
  { id: "development", label: "Development spending", priorities: ["coach", "nutrition", "analyst", "boots", "recovery", "agent", "lifestyle"], cashReserve: 60 },
  { id: "recovery", label: "Recovery spending", priorities: ["nutrition", "recovery", "coach", "lifestyle", "boots", "analyst", "agent"], cashReserve: 60 },
  { id: "training-track", label: "Training track focus", priorities: ["coach"], cashReserve: 60, focusTrack: "training", focusCashReserve: 20, focusOnly: true },
  { id: "recovery-track", label: "Recovery track focus", priorities: ["nutrition", "recovery"], cashReserve: 60, focusTrack: "recovery", focusCashReserve: 20, focusOnly: true },
  { id: "performance-track", label: "Performance track focus", priorities: ["boots", "analyst"], cashReserve: 60, focusTrack: "performance", focusCashReserve: 20, focusOnly: true },
  { id: "career-track", label: "Career track focus", priorities: ["agent"], cashReserve: 60, focusTrack: "career", focusCashReserve: 20, focusOnly: true },
  { id: "lifestyle-track", label: "Lifestyle track focus", priorities: ["lifestyle"], cashReserve: 60, focusTrack: "lifestyle", focusCashReserve: 20, focusOnly: true },
];

const activeSupportScenarios =
  generationCount > 1
    ? supportScenarios.filter((scenario) => scenario.id === "none" || scenario.id === "balanced" || scenario.id.endsWith("-track"))
    : supportScenarios;

for (let generation = 1; generation <= generationCount; generation += 1) {
  activeSupportScenarios.forEach((scenario) => {
    const reports = [];
    for (let index = 0; index < seasons; index += 1) {
      reports.push(simulateCareer(index, scenario, generation));
    }
    printSeasonReport(summarizeSeasons(reports), scenario, generation);
  });
}

function simulateCareer(runIndex, scenario, generation = 1) {
  const state = {
    trust: 38,
    fitness: 86,
    morale: 74,
    pressure: 26,
    ratings: [],
    cash: 420,
    tier: leagueTiers[0],
    supportUpgrades: createInitialSupportUpgrades(),
    attributes: createGenerationAttributes(generation),
  };
  const startOvr = calculateOvr(flattenAttributes(state.attributes));
  const stats = {
    apps: 0,
    starts: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    highlights: 0,
    levelUps: 0,
    roleCounts: new Map(),
    ratings: [],
    fitness: [],
    trust: [],
    cashEarned: 0,
    cashSpent: 0,
    supportPurchases: 0,
  };

  for (let careerSeason = 0; careerSeason < careerSeasons; careerSeason += 1) {
    state.tier = getCareerTier(careerSeason);
    fixtures.forEach((fixture, weekIndex) => {
      const absoluteWeekIndex = careerSeason * fixtures.length + weekIndex;
      const weekSeed = `run-${runIndex}-season-${careerSeason}-week-${weekIndex}-${fixture.id}-${scenario.id}`;
      const preTrainingSpend = buySupportUpgrades(state, scenario);
      stats.cashSpent += preTrainingSpend.spent;
      stats.supportPurchases += preTrainingSpend.purchases;

      const focus = chooseTrainingFocus(state, absoluteWeekIndex);
      const training = applyTraining(state, focus, weekSeed);
      stats.levelUps += training.levelUps;

      const context = buildContext(state, fixture, weekSeed);
      const match = simulateMatch(state, context, weekSeed);
      increment(stats.roleCounts, context.playerRole);

      if (match.minutes > 0) {
        stats.apps += 1;
        stats.starts += isStartingRole(context.playerRole) ? 1 : 0;
        stats.minutes += match.minutes;
        stats.goals += match.playerGoals;
        stats.assists += match.playerAssists;
        stats.highlights += match.playerMomentCount;
        stats.ratings.push(match.rating);
        state.ratings = [...state.ratings.slice(-4), match.rating];
      }

      addAttributeXp(state.attributes, match.xp);
      state.trust = clamp(state.trust + match.trustDelta, 0, 100);
      state.pressure = clamp(state.pressure + match.playerGoals * 2 - getLifestylePressureRelief(state), 0, 100);
      const environment = getDevelopmentEnvironment(state.tier);
      const weeklyRecoveryBonus =
        environment.recoveryBonus +
        getRecoveryBreakthroughRelief(getSupportTrackBreakthroughCount(state, "recovery")) +
        getWeeklySupportRecoveryBonus(
          getSupportLevel(state, "recovery") * environment.supportEfficiency,
          getSupportLevel(state, "nutrition") * environment.supportEfficiency,
        );
      state.fitness = clamp(state.fitness + match.fitnessDelta + weeklyRecoveryBonus, 0, 100);
      state.morale = clamp(state.morale + (match.minutes > 0 ? (match.rating >= 7 ? 3 : -2) : 0), 0, 100);
      const contractMultiplier = getContractEarningsMultiplier(state);
      const cashEarned = Math.round(
        weeklyWage * contractMultiplier +
          (match.minutes > 0 ? appearanceBonus * contractMultiplier : 0) +
          match.playerGoals * goalBonus * contractMultiplier +
          match.playerAssists * assistBonus * contractMultiplier,
      );
      state.cash += cashEarned;
      stats.cashEarned += cashEarned;
      const postMatchSpend = buySupportUpgrades(state, scenario);
      stats.cashSpent += postMatchSpend.spent;
      stats.supportPurchases += postMatchSpend.purchases;
      stats.fitness.push(state.fitness);
      stats.trust.push(state.trust);
    });
  }

  const endOvr = calculateOvr(flattenAttributes(state.attributes));
  const potentialOvr = calculateOvr(flattenPotentialAttributes(state.attributes));
  return {
    startOvr,
    endOvr,
    potentialOvr,
    ovrGain: endOvr - startOvr,
    apps: stats.apps,
    starts: stats.starts,
    minutes: stats.minutes,
    goals: stats.goals,
    assists: stats.assists,
    highlights: stats.highlights,
    levelUps: stats.levelUps,
    goalsPer90: stats.minutes ? (stats.goals / stats.minutes) * 90 : 0,
    assistsPer90: stats.minutes ? (stats.assists / stats.minutes) * 90 : 0,
    highlightsPer90: stats.minutes ? (stats.highlights / stats.minutes) * 90 : 0,
    avgRating: average(stats.ratings, 6.4),
    endTrust: state.trust,
    endFitness: state.fitness,
    cashEarned: stats.cashEarned,
    cashSpent: stats.cashSpent,
    endCash: state.cash,
    supportPurchases: stats.supportPurchases,
    supportLevels: Object.values(state.supportUpgrades).reduce((sum, level) => sum + level, 0),
    supportTrackLevels: Object.fromEntries(supportTrackDefinitions.map((track) => [track.id, getSupportTrackTotal(state, track)])),
    supportTrackBreakthroughs: Object.fromEntries(supportTrackDefinitions.map((track) => [track.id, getSupportTrackBreakthroughCount(state, track.id)])),
    roleCounts: stats.roleCounts,
  };
}

function chooseTrainingFocus(state, weekIndex) {
  const flat = flattenAttributes(state.attributes);
  const sortedNeeds = focusCycle
    .map((focus) => ({ focus, value: flat[focus], xp: state.attributes[focus].xp }))
    .sort((a, b) => a.value - b.value || b.xp - a.xp);
  if (weekIndex % 4 === 0) {
    return sortedNeeds[0].focus;
  }
  return focusCycle[weekIndex % focusCycle.length];
}

function applyTraining(state, focus, seed) {
  const environment = getDevelopmentEnvironment(state.tier);
  const coachLevel = getSupportLevel(state, "coach");
  const nutritionLevel = getSupportLevel(state, "nutrition");
  const recoveryLevel = getSupportLevel(state, "recovery");
  const trainingBreakthroughs = getSupportTrackBreakthroughCount(state, "training");
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
  const effectiveCoachLevel = coachLevel * environment.supportEfficiency;
  const effectiveNutritionLevel = nutritionLevel * environment.supportEfficiency;
  const effectiveRecoveryLevel = recoveryLevel * environment.supportEfficiency;

  if (state.fitness < 12) {
    state.fitness = clamp(state.fitness + 14 + environment.recoveryBonus + getRecoverySessionBonus(effectiveRecoveryLevel, effectiveNutritionLevel), 0, 100);
    state.trust = clamp(state.trust - 1, 0, 100);
    return { xp: 0, levelUps: 0 };
  }

  const roll = seededNoise(`${seed}-training-${focus}`);
  const min = Math.round((12 + environment.xpFloorBonus + getTrainingXpFloorBonus(effectiveCoachLevel) + trainingBreakthroughs * 5) * environment.xpMultiplier);
  const max = Math.round((55 + environment.xpFloorBonus + getTrainingXpCeilingBonus(effectiveCoachLevel) + trainingBreakthroughs * 9) * environment.xpMultiplier);
  const xp = Math.round(min + roll * (max - min));
  const xpGain = { [focus]: xp };
  getCoachSupportFocuses(state, focus).forEach((supportFocus) => {
    const supportRoll = seededNoise(`${seed}-coach-support-${supportFocus}`);
    const supportMin = Math.max(1, Math.round(effectiveCoachLevel * 2.5 * environment.xpMultiplier));
    const supportMax = Math.max(1, Math.round(effectiveCoachLevel * 6 * environment.xpMultiplier));
    xpGain[supportFocus] = (xpGain[supportFocus] ?? 0) + Math.round(supportMin + supportRoll * (supportMax - supportMin));
  });
  const levelUps = addAttributeXp(state.attributes, xpGain);
  state.fitness = clamp(state.fitness + Math.min(0, -4 + environment.recoveryBonus + getTrainingFatigueRelief(effectiveNutritionLevel) + getRecoveryBreakthroughRelief(recoveryBreakthroughs)), 0, 100);
  state.trust = clamp(state.trust + 1, 0, 100);
  return { xp, levelUps };
}

function getCoachSupportFocuses(state, activeFocus) {
  const coachLevel = getSupportLevel(state, "coach");
  if (coachLevel <= 0) {
    return [];
  }
  const focusCount = coachLevel >= 8 ? 2 : 1;
  return Object.entries(ovrWeights)
    .map(([attribute]) => ({ attribute, value: state.attributes[attribute].value }))
    .filter((item) => item.attribute !== activeFocus)
    .sort((a, b) => a.value - b.value)
    .slice(0, focusCount)
    .map((item) => item.attribute);
}

function buildContext(state, fixture, matchSeed) {
  const tierOffset = state.tier.averageOvr - leagueAverageOvr;
  const opponentProfile = buildOpponentProfile({
    opponentStrength: fixture.opponentStrength + tierOffset,
    opponentForm: fixture.opponentForm,
    serviceLevel: fixture.serviceLevel,
    seed: fixture.id,
  });
  const tierTeamStrength = teamStrength + tierOffset;
  const formAdjustedTeamStrength = tierTeamStrength + Math.round((getFormScore(state.ratings) - 50) / 18);
  const opponentStrength = fixture.opponentStrength + tierOffset;
  const importance = Math.abs(formAdjustedTeamStrength - opponentStrength) <= 3 ? "Normal" : "Low";
  const selection = getSelectionReport(state, fixture, importance);
  const isInSquad = isAvailableForSquad(state.fitness, `squad-${matchSeed}-${state.fitness}`);
  const playerRole = isInSquad ? selection.role : "Bench";

  return {
    ...fixture,
    matchSeed,
    teamStrength: formAdjustedTeamStrength,
    opponentStrength,
    opponentProfile,
    matchImportance: importance,
    playerRole,
    selection,
    isInSquad,
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
    managerInstruction: "Season lab simulation",
  });
  const appearance = getAppearanceWindow(context.playerRole, state, context, simEvents, matchSeed);
  const minutes = getPlayerMinutesPlayed(context, appearance);
  const adjustedAttributes = getLeagueAdjustedAttributes(flattenAttributes(state.attributes), state.tier);
  const actionAttributes = applyBootsActionBoost(adjustedAttributes, getSupportLevel(state, "boots"));
  const adjustedOpponentProfile = getLeagueAdjustedOpponentProfile(context.opponentProfile, state.tier);
  const involvementScore =
    state.trust * 0.35 +
    state.fitness * 0.25 +
    getFormScore(state.ratings) * 0.2 +
    getContextualAbilityScore(calculateOvr(flattenAttributes(state.attributes)), state.tier) * 0.2 +
    getRoleInvolvementBias(context.playerRole) * 10;
  const playerMomentCount = minutes > 0 ? getPlayerMomentCount(context.playerRole, involvementScore) : 0;
  const moments = createPositionMatchPool({
    opponentShort: context.opponent,
    managerInstruction: "Season lab simulation",
    tacticalFocus: "Balance lab forward focus.",
    fitness: state.fitness,
    momentPools: ["forward", "shared"],
  });
  const selectedMoments = selectPlayerHighlights({
    moments,
    count: playerMomentCount,
    matchSeed,
    playerWindowStart: Math.max(appearance.entryMinute, 0),
    playerWindowEnd: Math.max(appearance.entryMinute, appearance.exitMinute ?? 90),
    simEvents,
    role: context.playerRole,
    serviceLevel: context.serviceLevel,
    opponentProfile: adjustedOpponentProfile,
    attributeValues: actionAttributes,
    preferredCategories: forwardPreferredCategories,
  });
  const playerResults = selectedMoments.flatMap((moment, index) => {
    const choice = chooseAutoSimChoice({
      moment,
      attributeValues: actionAttributes,
      fitness: state.fitness,
      trust: state.trust,
      matchSeed,
    });
    const result = createMatchResult(state, context, moment, choice, `${matchSeed}-player-${index}`);
    const followUp = createFollowUpMoment(context, moment, result, matchSeed);
    if (!followUp) {
      return [result];
    }

    const followUpChoice = chooseAutoSimChoice({
      moment: followUp,
      attributeValues: actionAttributes,
      fitness: state.fitness,
      trust: state.trust,
      matchSeed: `${matchSeed}-follow-up`,
    });
    return [result, createMatchResult(state, context, followUp, followUpChoice, `${matchSeed}-player-${index}-follow-up`)];
  });
  const playerGoals = sum(playerResults.map((result) => result.goals));
  const playerAssists = sum(playerResults.map((result) => result.assists));
  const playerRating = playerResults.length ? average(playerResults.map((result) => result.rating), 6.4) : 6.4;
  const simRatingDelta = sum(simEvents.map((event) => event.ratingDelta));
  const xp = mergeXp(playerResults.map((result) => result.xp));

  return {
    minutes,
    playerGoals,
    playerAssists,
    playerMomentCount: playerResults.length,
    rating: Number(clamp(playerRating + simRatingDelta, 5.4, 9.6).toFixed(1)),
    trustDelta: sum(playerResults.map((result) => result.trustDelta)),
    fitnessDelta: Math.min(0, getMatchFitnessDelta(minutes, playerResults, getSupportLevel(state, "recovery")) + getRecoveryBreakthroughRelief(getSupportTrackBreakthroughCount(state, "recovery"))),
    xp,
  };
}

function createMatchResult(state, context, moment, choice, resultSeed) {
  const result = resolvePlayerChoice({
    moment,
    choice,
    attributeValues: applyBootsActionBoost(getLeagueAdjustedAttributes(flattenAttributes(state.attributes), state.tier), getSupportLevel(state, "boots")),
    fitness: state.fitness,
    trust: state.trust,
    playerRole: context.playerRole,
    opponentProfile: getLeagueAdjustedOpponentProfile(context.opponentProfile, state.tier),
    resultSeed,
  });

  return {
    ...result,
    choiceId: choice.id,
    choiceOutcome: choice.outcome,
    rating: getPositionAdjustedRating(result.rating, result.outcomeTier, result.decisiveOutcome, moment, choice, forwardPerformanceWeights),
    xp: buildChoiceXp(choice, result.outcomeTier, moment),
  };
}

function createFollowUpMoment(context, moment, result, matchSeed) {
  if (moment.chainDepth >= 1 || !result.success || result.goals > 0 || result.assists > 0) {
    return undefined;
  }
  const chance = { Poor: 0, Okay: 0.12, Good: 0.42, Great: 0.78 }[result.outcomeTier] ?? 0;
  if (seededNoise(`${matchSeed}-${moment.id}-${result.choiceId}-follow-up`) > chance) {
    return undefined;
  }

  const base = getFollowUpTemplate(moment, result);
  if (!base) {
    return undefined;
  }
  return {
    ...base,
    id: `${moment.id}-${result.choiceId}-follow-up`,
    minute: Math.min(90, moment.minute + 1),
    opponent: context.opponent,
    chainDepth: 1,
  };
}

function getFollowUpTemplate(moment, result) {
  if (moment.category === "counter" || result.choiceId.includes("drive") || result.choiceId.includes("carry")) {
    return {
      category: "shot",
      situation: "The defender is beaten and the box opens",
      context: "The first action created separation. The final decision comes before the cover arrives.",
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
      context: "The angle is tightening. You can force the finish or use the runner arriving centrally.",
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
      context: "The opponent is scrambling after your pressure.",
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
      context: "A quick second decision can turn possession into danger.",
      choices: [
        { id: "chain-spin-shot", label: "Spin and shoot", uses: ["First Touch", "Finishing"], risk: "High", reward: "Surprise finish", manager: "Risky", outcome: "goal" },
        { id: "chain-release-runner", label: "Release runner", uses: ["Vision", "Passing"], risk: "Medium", reward: "Chance created", manager: "Likes", outcome: "assist" },
        { id: "chain-set-tempo", label: "Set tempo", uses: ["Composure", "Passing"], risk: "Low", reward: "Sustain move", manager: "Likes", outcome: "trust" },
      ],
    };
  }
  return undefined;
}

function buildChoiceXp(choice, tier, moment) {
  const tierBase = { Poor: 7, Okay: 10, Good: 14, Great: 18 };
  const xp = {};
  choice.uses.forEach((key, index) => {
    xp[key] = (xp[key] ?? 0) + tierBase[tier] + (index === 0 ? 4 : 0);
  });
  if (forwardPreferredCategories.includes(moment.category)) {
    xp[choice.uses[0]] = (xp[choice.uses[0]] ?? 0) + 2;
  }
  return xp;
}

function addAttributeXp(attributes, xpGain) {
  let levelUps = 0;
  Object.entries(xpGain).forEach(([key, gain]) => {
    const attribute = attributes[key];
    if (!attribute || gain <= 0 || attribute.value >= 100) {
      return;
    }
    attribute.xp += gain;
    while (attribute.value < 100) {
      const requirement = getAttributeXpRequirement(attribute);
      if (attribute.xp < requirement) {
        break;
      }
      attribute.xp -= requirement;
      attribute.value += 1;
      levelUps += 1;
    }
    if (attribute.value >= 100) {
      attribute.xp = 0;
    }
  });
  return levelUps;
}

function getAttributeXpRequirement(attributeOrValue) {
  const attributeValue = typeof attributeOrValue === "number" ? attributeOrValue : attributeOrValue.value;
  const multiplier = typeof attributeOrValue === "number" ? 1 : getAttributeGrowthMultiplier(attributeOrValue);
  return Math.round(getBaseAttributeXpRequirement(attributeValue) * multiplier);
}

function getBaseAttributeXpRequirement(attributeValue) {
  if (attributeValue < 30) {
    return Math.round(24 + attributeValue * 1.25);
  }
  if (attributeValue < 50) {
    return Math.round(60 + (attributeValue - 30) * 3.5);
  }
  if (attributeValue < 70) {
    return Math.round(130 + (attributeValue - 50) * 6);
  }
  return Math.round(250 + (attributeValue - 70) * 10 + Math.pow(attributeValue - 70, 1.25) * 8);
}

function getAttributeGrowthMultiplier(attribute) {
  const distance = attribute.potential - attribute.value;
  if (distance >= 10) {
    return 0.85;
  }
  if (distance >= 0) {
    return 1;
  }
  const overProfile = Math.abs(distance);
  return 1 + overProfile * 0.18 + Math.pow(overProfile, 1.22) * 0.035;
}

function getGenerationProfile(generation) {
  return generationProfiles.find((profile) => profile.generation === generation) ?? generationProfiles[generationProfiles.length - 1];
}

function createGenerationAttributes(generation) {
  const profile = getGenerationProfile(generation);
  return Object.fromEntries(
    Object.entries(baseAttributes).map(([key, attribute]) => {
      const isKey = Object.prototype.hasOwnProperty.call(ovrWeights, key);
      const value = clamp(attribute.value + (isKey ? profile.startKeyBonus : profile.startGeneralBonus), 1, 99);
      const potential = clamp(
        Math.max(value + 8, attribute.potential + (isKey ? profile.potentialKeyBonus : profile.potentialGeneralBonus)),
        1,
        99,
      );
      return [
        key,
        {
          ...attribute,
          value,
          potential,
          xp: Math.min(attribute.xp, getAttributeXpRequirement({ ...attribute, value, potential }) - 1),
        },
      ];
    }),
  );
}

function getAppearanceWindow(role, state, context, simEvents, matchSeed) {
  if (!context.isInSquad || state.fitness < 12) {
    return { entryMinute: 91 };
  }
  const variation = Math.round(seededNoise(`${matchSeed}-${role}-${state.fitness}-appearance`) * 12) - 6;
  const scoreAround60 = getSimScoreAtMinute(simEvents, 60);
  const teamGoalDiff = scoreAround60.teamGoals - scoreAround60.opponentGoals;
  const earlyEvent = seededNoise(`${matchSeed}-early-sub`) > 0.88 ? -12 : 0;
  const fitnessDelay = state.fitness < 25 ? 12 : state.fitness < 45 ? 6 : 0;

  if (role === "Bench") {
    return { entryMinute: clamp(78 + variation + earlyEvent + (teamGoalDiff < 0 ? -6 : 0) + fitnessDelay, 60, 91) };
  }
  if (role === "Impact Sub") {
    const matchStateAdjustment = teamGoalDiff < 0 ? -7 : teamGoalDiff >= 2 ? -5 : teamGoalDiff > 0 ? 4 : 0;
    return { entryMinute: clamp(66 + variation + earlyEvent + matchStateAdjustment + fitnessDelay, 48, 88) };
  }
  if (role === "Rotation Starter") {
    const fatigueExit = state.fitness < 45 ? -14 : state.fitness < 62 ? -8 : 0;
    return { entryMinute: 0, exitMinute: clamp(72 + variation + fatigueExit, 55, 86) };
  }
  if (state.fitness < 62) {
    return { entryMinute: 0, exitMinute: clamp((state.fitness < 45 ? 66 : 76) + variation, 50, 88) };
  }
  return { entryMinute: 0 };
}

function getPlayerMinutesPlayed(context, appearance) {
  if (!context.isInSquad || appearance.entryMinute > 90) {
    return 0;
  }
  const start = clamp(appearance.entryMinute, 0, 90);
  const end = clamp(appearance.exitMinute ?? 90, start, 90);
  return Math.max(0, end - start);
}

function getMatchFitnessDelta(minutes, results, recoveryLevel = 0) {
  if (minutes <= 0) {
    return 0;
  }
  const minuteLoad = -Math.max(1, Math.round(minutes / 18));
  const actionLoad = sum(results.map((result) => Math.min(0, result.fitnessDelta)));
  const scaledActionLoad = Math.round(actionLoad * Math.min(1, minutes / 60) * 0.35);
  return clamp(minuteLoad + scaledActionLoad + getMatchActionRecoveryRelief(recoveryLevel), -12, 0);
}

function getSelectionReport(state, fixture, importance = "Normal") {
  const tier = state.tier ?? leagueTiers[0];
  const tierOffset = tier.averageOvr - leagueAverageOvr;
  const form = getFormScore(state.ratings);
  const lastRating = state.ratings[state.ratings.length - 1] ?? 6.4;
  const trustImpact = Math.round(state.trust * 0.45);
  const fitnessImpact = getFitnessSelectionImpact(state.fitness);
  const formImpact = Math.round((form - 50) * 0.18);
  const ratingImpact = Math.round((lastRating - 6.4) * 6);
  const importanceImpact = importance === "High" ? -3 : importance === "Low" ? 1 : 0;
  const playerOvr = calculateOvr(flattenAttributes(state.attributes));
  const abilityImpact = clamp(Math.round((playerOvr - tier.averageOvr) * 0.8), -8, 10);
  const fixtureGap = (fixture.opponentStrength + tierOffset) - (teamStrength + tierOffset);
  const fixtureImpact = fixtureGap >= 6 ? -2 : fixtureGap <= -4 ? 1 : 0;
  const analystImpact = getSupportLevel(state, "analyst") * 2 + getSupportTrackBreakthroughCount(state, "performance") * 2;
  const pressureImpact = -Math.round((state.pressure ?? 0) * 0.08);
  const score = clamp(
    22 + trustImpact + fitnessImpact + formImpact + ratingImpact + importanceImpact + fixtureImpact + abilityImpact + analystImpact + pressureImpact,
    0,
    100,
  );
  return { score, role: state.fitness < 12 ? "Bench" : getPlayerMatchRole(score) };
}

function getFitnessSelectionImpact(fitness) {
  if (fitness < 12) return -45;
  if (fitness < 25) return -30;
  if (fitness < 45) return -18;
  if (fitness < 62) return -9;
  if (fitness < 78) return -2;
  return Math.round((fitness - 78) * 0.12);
}

function isAvailableForSquad(fitness, seed) {
  if (fitness < 8) return false;
  if (fitness < 18) return seededNoise(`${seed}-fitness-selection`) > 0.7;
  if (fitness < 28) return seededNoise(`${seed}-fitness-selection`) > 0.28;
  return true;
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

function getRoleInvolvementBias(role) {
  return { Bench: -0.35, "Impact Sub": 0.15, "Rotation Starter": 0.35, Starter: 0.55 }[role] ?? 0;
}

function isStartingRole(role) {
  return role === "Starter" || role === "Rotation Starter";
}

function getPositionAdjustedRating(rating, tier, decisiveOutcome, moment, choice, weights) {
  const weight = getPositionPerformanceWeight(moment, choice, weights);
  const tierScale = { Poor: -0.12, Okay: 0.08, Good: 0.22, Great: 0.34 };
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
    defensiveLine: lineRoll > 0.68 ? "High" : lineRoll < 0.28 ? "Low" : "Mid",
    pressing,
    discipline: clampProfile(strength + (pressing === "Aggressive" ? -3 : 2) + profileSpread(input.seed, "discipline", 6)),
    fatigueResistance: clampProfile(strength + (input.opponentForm === "Hot" ? 3 : 0) + profileSpread(input.seed, "fatigue", 6)),
  };
}

function calculateOvr(attributes) {
  const entries = Object.entries(ovrWeights);
  const weighted = entries.reduce((total, [key, weight]) => total + attributes[key] * weight, 0);
  const totalWeight = entries.reduce((total, [, weight]) => total + weight, 0);
  return Math.round(weighted / totalWeight);
}

function getLeagueAdjustedAttributes(attributes, tier = leagueTiers[0]) {
  return Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, getContextualAbilityScore(value, tier)]));
}

function getLeagueAdjustedOpponentProfile(profile, tier = leagueTiers[0]) {
  return {
    ...profile,
    overall: getContextualAbilityScore(profile.overall, tier),
    attack: getContextualAbilityScore(profile.attack, tier),
    midfield: getContextualAbilityScore(profile.midfield, tier),
    defense: getContextualAbilityScore(profile.defense, tier),
    keeper: getContextualAbilityScore(profile.keeper, tier),
    centerBackPace: getContextualAbilityScore(profile.centerBackPace, tier),
    aerialDefense: getContextualAbilityScore(profile.aerialDefense, tier),
    discipline: getContextualAbilityScore(profile.discipline, tier),
    fatigueResistance: getContextualAbilityScore(profile.fatigueResistance, tier),
  };
}

function getContextualAbilityScore(value, tier = leagueTiers[0]) {
  return clamp(Math.round(50 + (value - tier.averageOvr) * 1.15), 1, 99);
}

function getFormScore(ratings) {
  if (ratings.length === 0) return 50;
  return clamp(Math.round(50 + (average(ratings, 6.4) - 6.4) * 18), 0, 100);
}

function summarizeSeasons(items) {
  return {
    seasons: items.length,
    careerSeasons,
    apps: stat(items.map((item) => item.apps)),
    starts: stat(items.map((item) => item.starts)),
    minutes: stat(items.map((item) => item.minutes)),
    goals: stat(items.map((item) => item.goals)),
    assists: stat(items.map((item) => item.assists)),
    goalsPer90: stat(items.map((item) => item.goalsPer90)),
    assistsPer90: stat(items.map((item) => item.assistsPer90)),
    highlightsPer90: stat(items.map((item) => item.highlightsPer90)),
    avgRating: stat(items.map((item) => item.avgRating)),
    ovrGain: stat(items.map((item) => item.ovrGain)),
    endOvr: stat(items.map((item) => item.endOvr)),
    potentialOvr: stat(items.map((item) => item.potentialOvr)),
    levelUps: stat(items.map((item) => item.levelUps)),
    endTrust: stat(items.map((item) => item.endTrust)),
    endFitness: stat(items.map((item) => item.endFitness)),
    cashEarned: stat(items.map((item) => item.cashEarned)),
    cashSpent: stat(items.map((item) => item.cashSpent)),
    endCash: stat(items.map((item) => item.endCash)),
    supportPurchases: stat(items.map((item) => item.supportPurchases)),
    supportLevels: stat(items.map((item) => item.supportLevels)),
    supportTrackLevels: Object.fromEntries(
      supportTrackDefinitions.map((track) => [track.id, stat(items.map((item) => item.supportTrackLevels[track.id] ?? 0))]),
    ),
    supportTrackBreakthroughs: Object.fromEntries(
      supportTrackDefinitions.map((track) => [track.id, stat(items.map((item) => item.supportTrackBreakthroughs[track.id] ?? 0))]),
    ),
    roleCounts: mergeRoleCounts(items.map((item) => item.roleCounts)),
  };
}

function printSeasonReport(report, scenario, generation) {
  const horizon = report.careerSeasons === 1 ? "1 season" : `${report.careerSeasons} seasons`;
  const generationProfile = getGenerationProfile(generation);
  console.log(
    `\n=== Season balance lab: Gen ${generation} ${generationProfile.label} - ${scenario.label} (${report.seasons} runs, ${horizon}) ===`,
  );
  printStat("Apps", report.apps);
  printStat("Starts", report.starts);
  printStat("Minutes", report.minutes);
  printStat("Goals", report.goals);
  printStat("Assists", report.assists);
  printStat("Goals / 90", report.goalsPer90);
  printStat("Assists / 90", report.assistsPer90);
  printStat("Highlights / 90", report.highlightsPer90);
  printStat("Avg rating", report.avgRating);
  printStat("OVR gain", report.ovrGain);
  printStat("End OVR", report.endOvr);
  printStat("Growth profile OVR", report.potentialOvr);
  printStat("Level-ups", report.levelUps);
  printStat("End trust", report.endTrust);
  printStat("End fitness", report.endFitness);
  printStat("Cash earned", report.cashEarned);
  printStat("Cash spent", report.cashSpent);
  printStat("End cash", report.endCash);
  printStat("Support purchases", report.supportPurchases);
  printStat("Support levels", report.supportLevels);
  console.log(`Track levels: ${formatTrackStats(report.supportTrackLevels)}`);
  console.log(`Track breakthroughs: ${formatTrackStats(report.supportTrackBreakthroughs)}`);
  console.log(`Roles: ${formatEntries([...report.roleCounts.entries()].sort((a, b) => b[1] - a[1]))}`);
  const warnings = getBalanceWarnings(report);
  console.log(`Warnings: ${warnings.length ? warnings.join("; ") : "none"}`);
}

function getBalanceWarnings(report) {
  const warnings = [];
  const ovrGainPerSeason = report.ovrGain.avg / report.careerSeasons;
  const aboveGrowthProfile = report.endOvr.avg > report.potentialOvr.avg + 4;
  if (ovrGainPerSeason < 3) {
    warnings.push(`OVR gain low (${format(ovrGainPerSeason)}/season)`);
  }
  if (ovrGainPerSeason > 7) {
    warnings.push(`OVR gain high (${format(ovrGainPerSeason)}/season)`);
  }
  if (report.endTrust.avg > 92) {
    warnings.push("trust caps in same-club sim (transfer reset not modeled)");
  }
  if (report.endFitness.avg < 30) {
    warnings.push("end fitness too low");
  }
  if (aboveGrowthProfile) {
    warnings.push("growth profile exceeded; soft-cap pressure should be visible");
  }
  if (report.careerSeasons > 1 && report.supportLevels.avg < report.careerSeasons * 1.2) {
    warnings.push("support spending may be too slow for long careers");
  }
  if (report.goalsPer90.avg > 1.1) {
    warnings.push("goals/90 high over the sample");
  }
  if (report.assistsPer90.avg > 1.2) {
    warnings.push("assists/90 high over the sample");
  }
  return warnings;
}

function printStat(label, value) {
  console.log(`${label}: avg ${format(value.avg)} | p10 ${format(value.p10)} | p50 ${format(value.p50)} | p90 ${format(value.p90)}`);
}

function stat(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    avg: average(sorted, 0),
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
  };
}

function percentile(sorted, ratio) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)))];
}

function mergeRoleCounts(roleCounts) {
  const output = new Map();
  roleCounts.forEach((counts) => counts.forEach((value, key) => increment(output, key, value)));
  return output;
}

function createInitialSupportUpgrades() {
  return Object.fromEntries(supportUpgradeDefinitions.map((upgrade) => [upgrade.id, 0]));
}

function buySupportUpgrades(state, scenario) {
  let spent = 0;
  let purchases = 0;
  if (scenario.priorities.length === 0) {
    return { spent, purchases };
  }

  let bought = true;
  while (bought) {
    bought = false;
    const upgradeId = chooseSupportPurchase(state, scenario);
    if (!upgradeId) {
      break;
    }
    const upgrade = supportUpgradeMap[upgradeId];
    const currentLevel = getSupportLevel(state, upgradeId);
    const cost = getSupportUpgradeCost(upgrade, currentLevel);

    state.cash -= cost;
    state.supportUpgrades[upgradeId] = currentLevel + 1;
    spent += cost;
    purchases += 1;
    bought = true;
  }

  return { spent, purchases };
}

function chooseSupportPurchase(state, scenario) {
  if (scenario.focusTrack) {
    const focusTrack = getSupportTrackById(scenario.focusTrack);
    const focusAffordable = getAffordableSupportUpgrades(state, focusTrack?.upgradeIds ?? [], scenario.focusCashReserve ?? scenario.cashReserve);
    if (focusAffordable.length > 0) {
      return focusAffordable.sort((a, b) => {
        const aUpgrade = supportUpgradeMap[a];
        const bUpgrade = supportUpgradeMap[b];
        return getSupportUpgradeCost(aUpgrade, getSupportLevel(state, a)) - getSupportUpgradeCost(bUpgrade, getSupportLevel(state, b));
      })[0];
    }
    if (scenario.focusOnly) {
      return undefined;
    }
  }

  const affordable = getAffordableSupportUpgrades(state, scenario.priorities, scenario.cashReserve);

  if (scenario.spread) {
    return affordable.sort((a, b) => {
      const aUpgrade = supportUpgradeMap[a];
      const bUpgrade = supportUpgradeMap[b];
      const aProgress = getSupportLevel(state, a) / aUpgrade.maxLevel;
      const bProgress = getSupportLevel(state, b) / bUpgrade.maxLevel;
      return aProgress - bProgress || scenario.priorities.indexOf(a) - scenario.priorities.indexOf(b);
    })[0];
  }

  return affordable[0];
}

function getAffordableSupportUpgrades(state, upgradeIds, cashReserve) {
  const affordable = upgradeIds.filter((upgradeId) => {
    const upgrade = supportUpgradeMap[upgradeId];
    if (!upgrade) {
      return false;
    }
    const currentLevel = getSupportLevel(state, upgradeId);
    if (currentLevel >= upgrade.maxLevel) {
      return false;
    }
    const cost = getSupportUpgradeCost(upgrade, currentLevel);
    return state.cash - cost >= cashReserve;
  });
  return affordable;
}

function getSupportUpgradeCost(upgrade, currentLevel) {
  return Math.round(upgrade.baseCost * (1 + currentLevel * 0.62 + Math.pow(currentLevel, 2) * 0.16));
}

function getSupportLevel(state, upgradeId) {
  return state.supportUpgrades[upgradeId] ?? 0;
}

function getSupportTrackById(trackId) {
  return supportTrackDefinitions.find((track) => track.id === trackId);
}

function getSupportTrackTotal(state, track) {
  return track.upgradeIds.reduce((sum, upgradeId) => sum + getSupportLevel(state, upgradeId), 0);
}

function getSupportTrackBreakthroughCount(state, trackId) {
  const track = getSupportTrackById(trackId);
  if (!track) {
    return 0;
  }

  const total = getSupportTrackTotal(state, track);
  return track.breakpoints.filter((breakpoint) => total >= breakpoint).length;
}

function getRecoveryBreakthroughRelief(breakthroughs) {
  return Math.floor(breakthroughs / 2);
}

function getLifestylePressureRelief(state) {
  return Math.min(6, Math.floor(getSupportLevel(state, "lifestyle") / 3) + getSupportTrackBreakthroughCount(state, "lifestyle"));
}

function getContractEarningsMultiplier(state) {
  return 1 + getSupportLevel(state, "agent") * 0.04 + getSupportTrackBreakthroughCount(state, "career") * 0.035;
}

function getCareerTier(careerSeason) {
  if (careerSeason >= 12) return leagueTiers[4];
  if (careerSeason >= 9) return leagueTiers[3];
  if (careerSeason >= 6) return leagueTiers[2];
  if (careerSeason >= 3) return leagueTiers[1];
  return leagueTiers[0];
}

function getDevelopmentEnvironment(tier) {
  const level = tier.facilityLevel;
  return {
    xpMultiplier: 1 + (level - 1) * 0.18,
    xpFloorBonus: (level - 1) * 4,
    recoveryBonus: Math.floor((level - 1) / 3),
    supportEfficiency: 1 + (level - 1) * 0.1,
  };
}

function getTrainingXpFloorBonus(level) {
  return Math.round(level * 8);
}

function getTrainingXpCeilingBonus(level) {
  return Math.round(level * 7);
}

function getTrainingFatigueRelief(level) {
  return Math.min(9, Math.round(level * 0.7));
}

function getRecoverySessionBonus(recoveryLevel, nutritionLevel) {
  return Math.min(24, Math.round(recoveryLevel * 2 + nutritionLevel * 0.75));
}

function getWeeklySupportRecoveryBonus(recoveryLevel, nutritionLevel) {
  return Math.min(7, Math.round(recoveryLevel * 0.45 + nutritionLevel * 0.65));
}

function getMatchActionRecoveryRelief(level) {
  return Math.min(6, Math.round(level * 0.45));
}

function getBootsActionBoost(bootsLevel) {
  return Math.min(6, Math.floor(bootsLevel / 2));
}

function applyBootsActionBoost(attributeValues, bootsLevel) {
  const boost = getBootsActionBoost(bootsLevel);
  if (boost <= 0) {
    return attributeValues;
  }

  return {
    ...attributeValues,
    ...Object.fromEntries(bootsActionAttributes.map((attribute) => [attribute, clamp((attributeValues[attribute] ?? 50) + boost, 1, 100)])),
  };
}

function cloneAttributes(attributes) {
  return Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, { ...value }]));
}

function flattenAttributes(attributes) {
  return Object.fromEntries(Object.entries(attributes).map(([key, attribute]) => [key, attribute.value]));
}

function flattenPotentialAttributes(attributes) {
  return Object.fromEntries(Object.entries(attributes).map(([key, attribute]) => [key, attribute.potential]));
}

function mergeXp(xpList) {
  const output = {};
  xpList.forEach((xp) => {
    Object.entries(xp).forEach(([key, value]) => {
      output[key] = (output[key] ?? 0) + value;
    });
  });
  return output;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function average(values, fallback = 0) {
  return values.length ? sum(values) / values.length : fallback;
}

function formatEntries(entries) {
  return entries.map(([key, value]) => `${key} ${value}`).join(", ");
}

function formatTrackStats(trackStats) {
  return supportTrackDefinitions
    .map((track) => `${track.id} ${format(trackStats[track.id]?.avg ?? 0)}`)
    .join(", ");
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function format(value) {
  return value.toFixed(2);
}

function profileSpread(seed, key, range) {
  return Math.round((seededNoise(`${seed}-${key}`) - 0.5) * range * 2);
}

function clampProfile(value) {
  return Math.max(1, Math.min(99, Math.round(value)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
