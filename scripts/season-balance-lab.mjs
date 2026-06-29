import {
  aggregateMatchRating,
  createSimEvents,
  createTeamMatchModel,
  chooseAutoSimChoice,
  getSimScoreAtMinute,
  getStaminaFitnessLoadMultiplier,
  resolvePlayerChoice,
  seededNoise,
} from "../src/engine/matchEngineCore.js";
import { createPositionMatchPool } from "../src/engine/forwardMoments.js";
import { createMatchDirectorPlan } from "../src/engine/matchDirector.js";
import { forwardOvrWeights } from "../src/engine/ovrWeights.js";

const seasons = Number(process.argv.find((arg) => arg.startsWith("--seasons="))?.split("=")[1] ?? 120);
// Default to a full career (age 16 -> ~37 = 22 seasons) so the data reflects the whole arc:
// climbing tiers, peaking at 28, then the post-peak decline. Override with --career-seasons.
const careerSeasons = Number(process.argv.find((arg) => arg.startsWith("--career-seasons="))?.split("=")[1] ?? 22);
const generationCount = Number(process.argv.find((arg) => arg.startsWith("--generations="))?.split("=")[1] ?? 1);
const labCountry = process.argv.find((arg) => arg.startsWith("--country="))?.split("=")[1] ?? "denmark";
const leagueAverageOvr = 15;
const teamStrength = 15;
const initialContract = {
  label: "Trial terms",
  weeklyWage: 45,
  weeksRemaining: 4,
  rolePromise: "Impact Sub",
  appearanceBonus: 8,
  goalBonus: 18,
  assistBonus: 12,
  pressureModifier: 0,
};

const countryTierModels = {
  england: ["elite", "top-flight", "national-pro", "regional-pro", "local-semi-pro", "grassroots-dev"],
  spain: ["elite", "top-flight", "national-pro", "regional-pro", "local-semi-pro", "grassroots-dev"],
  italy: ["elite", "top-flight", "national-pro", "regional-pro", "local-semi-pro", "grassroots-dev"],
  germany: ["top-flight", "national-pro", "regional-pro", "local-semi-pro", "grassroots-dev"],
  france: ["top-flight", "national-pro", "regional-pro", "local-semi-pro", "grassroots-dev"],
  holland: ["top-flight", "national-pro", "regional-pro", "local-semi-pro", "grassroots-dev"],
  denmark: ["top-flight", "national-pro", "regional-pro", "local-semi-pro", "grassroots-dev"],
};
const tierOrder = ["grassroots-dev", "local-semi-pro", "regional-pro", "national-pro", "top-flight", "elite"];
const opponentNames = [
  "Aalborg", "Roskilde", "Viborg", "Kolding", "Horsens", "Esbjerg", "Fredericia", "Naestved", "Silkeborg", "Randers",
  "Vejle", "Hobro", "Odense", "Aarhus", "Skive", "Bramming", "Slagelse", "Farum", "Ballerup",
];

const baseAttributes = {
  Finishing: { value: 11, potential: 61, xp: 8 },
  "Long Shots": { value: 8, potential: 49, xp: 5 },
  Passing: { value: 9, potential: 52, xp: 6 },
  Vision: { value: 9, potential: 50, xp: 6 },
  Dribbling: { value: 10, potential: 56, xp: 7 },
  "Off Ball": { value: 10, potential: 62, xp: 7 },
  Composure: { value: 9, potential: 59, xp: 6 },
  "First Touch": { value: 10, potential: 60, xp: 7 },
  Acceleration: { value: 12, potential: 63, xp: 8 },
  Pace: { value: 11, potential: 59, xp: 7 },
  Stamina: { value: 10, potential: 58, xp: 7 },
  Heading: { value: 8, potential: 55, xp: 5 },
  Strength: { value: 8, potential: 56, xp: 5 },
  "Work Rate": { value: 12, potential: 62, xp: 8 },
  Tackling: { value: 6, potential: 43, xp: 4 },
  Marking: { value: 6, potential: 45, xp: 4 },
  Positioning: { value: 8, potential: 52, xp: 5 },
};

const generationProfiles = [
  { generation: 1, label: "Local bloodline", startKeyBonus: 0, startGeneralBonus: 0, potentialKeyBonus: 0, potentialGeneralBonus: 0 },
  { generation: 2, label: "Known surname", startKeyBonus: 2, startGeneralBonus: 1, potentialKeyBonus: 8, potentialGeneralBonus: 5 },
  { generation: 3, label: "Family prospect", startKeyBonus: 4, startGeneralBonus: 2, potentialKeyBonus: 16, potentialGeneralBonus: 10 },
  { generation: 4, label: "Academy heir", startKeyBonus: 6, startGeneralBonus: 3, potentialKeyBonus: 25, potentialGeneralBonus: 16 },
  { generation: 5, label: "Elite pathway", startKeyBonus: 8, startGeneralBonus: 4, potentialKeyBonus: 35, potentialGeneralBonus: 23 },
  { generation: 6, label: "Dynasty talent", startKeyBonus: 10, startGeneralBonus: 5, potentialKeyBonus: 45, potentialGeneralBonus: 30 },
];

// Unified with the app via the shared single source (src/engine/ovrWeights.js) — the lab now weights OVR
// (and decides "key" attributes for start bonuses + the potential upgrade) exactly like the game.
const ovrWeights = forwardOvrWeights;

const focusCycle = ["Finishing", "Off Ball", "Composure", "First Touch", "Acceleration", "Work Rate"];
const forwardPreferredCategories = ["shot", "first_time_finish", "run_behind", "aerial_duel", "late_pressure"];
const forwardPerformanceWeights = { goal: 1.2, assist: 0.95, trust: 0.85, defensive: 0.65, possession: 0.75, transition: 0.9 };
const leagueTiers = [
  { id: "grassroots-dev", label: "Grassroots", averageOvr: 15, teamRange: [10, 22], wageRange: [25, 90], facilityLevel: 1, prestigeMultiplier: 0.45 },
  { id: "local-semi-pro", label: "Semi-Pro", averageOvr: 24, teamRange: [18, 31], wageRange: [90, 240], facilityLevel: 2, prestigeMultiplier: 0.75 },
  { id: "regional-pro", label: "Regional Pro", averageOvr: 38, teamRange: [31, 47], wageRange: [240, 650], facilityLevel: 3, prestigeMultiplier: 1 },
  { id: "national-pro", label: "National Pro", averageOvr: 55, teamRange: [47, 65], wageRange: [650, 1800], facilityLevel: 4, prestigeMultiplier: 1.35 },
  { id: "top-flight", label: "Top Flight", averageOvr: 74, teamRange: [65, 84], wageRange: [1800, 6500], facilityLevel: 5, prestigeMultiplier: 1.8 },
  { id: "elite", label: "Elite", averageOvr: 88, teamRange: [82, 98], wageRange: [6500, 30000], facilityLevel: 6, prestigeMultiplier: 2.5 },
];
const prestigeTiers = [
  { id: "local-prospect", label: "Local Prospect", threshold: 0 },
  { id: "local-favourite", label: "Local Favourite", threshold: 120 },
  { id: "known-talent", label: "Known Talent", threshold: 350 },
  { id: "regional-name", label: "Regional Name", threshold: 1500 },
  { id: "national-profile", label: "National Profile", threshold: 7500 },
  { id: "star-player", label: "Star Player", threshold: 20000 },
  { id: "icon", label: "Icon", threshold: 50000 },
  { id: "legend", label: "Legend", threshold: 100000 },
];
const sponsorDefinitions = [
  { id: "hometown-kit", prestigeRequired: 120, weeklyRetainer: 14, objectiveBonus: 45, objective: { type: "appearance", target: 1 }, pressureModifier: -1, weeksRemaining: 6 },
  { id: "local-boot-room", prestigeRequired: 350, weeklyRetainer: 35, objectiveBonus: 120, objective: { type: "goal", target: 1 }, pressureModifier: 1, weeksRemaining: 8 },
  { id: "recovery-drink", prestigeRequired: 350, weeklyRetainer: 28, objectiveBonus: 90, objective: { type: "rating", target: 7 }, pressureModifier: 0, weeksRemaining: 6 },
  { id: "academy-ambassador", prestigeRequired: 350, weeklyRetainer: 24, objectiveBonus: 75, objective: { type: "appearance", target: 1 }, pressureModifier: -1, weeksRemaining: 6 },
  { id: "regional-sportswear", prestigeRequired: 1500, weeklyRetainer: 95, objectiveBonus: 260, objective: { type: "goal", target: 1 }, pressureModifier: 3, weeksRemaining: 10 },
  { id: "technical-gear", prestigeRequired: 1500, weeklyRetainer: 80, objectiveBonus: 220, objective: { type: "assist", target: 1 }, pressureModifier: 2, weeksRemaining: 10 },
  { id: "national-energy", prestigeRequired: 7500, weeklyRetainer: 200, objectiveBonus: 650, objective: { type: "goal", target: 1 }, pressureModifier: 3, weeksRemaining: 12 },
  { id: "broadcast-feature", prestigeRequired: 7500, weeklyRetainer: 165, objectiveBonus: 520, objective: { type: "rating", target: 7.2 }, pressureModifier: 2, weeksRemaining: 10 },
  { id: "boot-flagship", prestigeRequired: 20000, weeklyRetainer: 620, objectiveBonus: 2000, objective: { type: "goal", target: 1 }, pressureModifier: 4, weeksRemaining: 12 },
  { id: "lifestyle-label", prestigeRequired: 20000, weeklyRetainer: 520, objectiveBonus: 1600, objective: { type: "assist", target: 1 }, pressureModifier: 3, weeksRemaining: 12 },
  { id: "global-kit", prestigeRequired: 50000, weeklyRetainer: 1500, objectiveBonus: 5000, objective: { type: "goal", target: 1 }, pressureModifier: 5, weeksRemaining: 14 },
  { id: "prestige-watch", prestigeRequired: 50000, weeklyRetainer: 1200, objectiveBonus: 4000, objective: { type: "rating", target: 7.5 }, pressureModifier: 4, weeksRemaining: 12 },
  { id: "legacy-campaign", prestigeRequired: 100000, weeklyRetainer: 3200, objectiveBonus: 9500, objective: { type: "goal", target: 1 }, pressureModifier: 5, weeksRemaining: 16 },
  { id: "signature-brand", prestigeRequired: 100000, weeklyRetainer: 2600, objectiveBonus: 8000, objective: { type: "rating", target: 7.5 }, pressureModifier: 5, weeksRemaining: 16 },
];
const supportUpgradeDefinitions = [
  { id: "xpFloor", maxLevel: 160, baseCost: 90 },
  { id: "xpCeiling", maxLevel: 160, baseCost: 100 },
  { id: "focusSlot2Unlock", maxLevel: 5, baseCost: 180 },
  { id: "focusSlot2Efficiency", maxLevel: 60, baseCost: 120, requires: { focusSlot2Unlock: 5 } },
  { id: "focusSlot3Unlock", maxLevel: 8, baseCost: 260, requires: { focusSlot2Unlock: 5 } },
  { id: "focusSlot3Efficiency", maxLevel: 50, baseCost: 150, requires: { focusSlot3Unlock: 8 } },
  { id: "trainingLoad", maxLevel: 60, baseCost: 130 },
  { id: "matchRecovery", maxLevel: 60, baseCost: 145 },
  { id: "recoveryBaseline", maxLevel: 80, baseCost: 125 },
  { id: "agentNegotiation", maxLevel: 80, baseCost: 220 },
  { id: "sponsorshipAppeal", maxLevel: 80, baseCost: 260 },
  { id: "longevity", maxLevel: 60, baseCost: 300 },
  { id: "potential", maxLevel: 4, baseCost: 12000 },
  { id: "consistency", maxLevel: 10, baseCost: 9000, requiresPrestige: 1500 },
  { id: "eliteConditioning", maxLevel: 10, baseCost: 14000, requiresPrestige: 7500 },
  { id: "marquee", maxLevel: 10, baseCost: 22000, requiresPrestige: 20000 },
];
const supportUpgradeMap = Object.fromEntries(supportUpgradeDefinitions.map((upgrade) => [upgrade.id, upgrade]));
const supportTrackDefinitions = [
  { id: "training", upgradeIds: ["xpFloor", "xpCeiling", "focusSlot2Unlock", "focusSlot2Efficiency", "focusSlot3Unlock", "focusSlot3Efficiency"], breakpoints: [5, 15, 28, 48, 75, 110] },
  { id: "recovery", upgradeIds: ["trainingLoad", "matchRecovery", "recoveryBaseline"], breakpoints: [6, 16, 32, 55, 85, 120] },
  { id: "career", upgradeIds: ["agentNegotiation", "sponsorshipAppeal"], breakpoints: [4, 12, 28, 50, 80, 120] },
  { id: "longevity", upgradeIds: ["longevity"], breakpoints: [6, 14, 26, 40, 55, 60] },
  { id: "talent", upgradeIds: ["potential"], breakpoints: [1, 2, 3, 4] },
  { id: "elite", upgradeIds: ["consistency", "eliteConditioning", "marquee"], breakpoints: [4, 10, 18, 26, 30] },
];
const supportScenarios = [
  { id: "none", label: "No upgrades", priorities: [], cashReserve: 999999 },
  { id: "balanced", label: "Balanced spending", priorities: ["xpFloor", "xpCeiling", "trainingLoad", "recoveryBaseline", "matchRecovery", "focusSlot2Unlock", "focusSlot2Efficiency", "agentNegotiation", "sponsorshipAppeal", "potential", "consistency", "eliteConditioning", "marquee", "longevity", "focusSlot3Unlock", "focusSlot3Efficiency"], cashReserve: 80, spread: true },
  { id: "development", label: "Development spending", priorities: ["xpFloor", "xpCeiling", "focusSlot2Unlock", "focusSlot2Efficiency", "focusSlot3Unlock", "focusSlot3Efficiency", "recoveryBaseline", "trainingLoad", "agentNegotiation"], cashReserve: 60 },
  { id: "recovery", label: "Recovery spending", priorities: ["recoveryBaseline", "trainingLoad", "matchRecovery", "xpFloor", "xpCeiling", "agentNegotiation"], cashReserve: 60 },
  { id: "training-track", label: "Training track focus", priorities: ["xpFloor", "xpCeiling", "focusSlot2Unlock", "focusSlot2Efficiency", "focusSlot3Unlock", "focusSlot3Efficiency"], cashReserve: 60, focusTrack: "training", focusCashReserve: 20, focusOnly: true },
  { id: "recovery-track", label: "Recovery track focus", priorities: ["recoveryBaseline", "trainingLoad", "matchRecovery"], cashReserve: 60, focusTrack: "recovery", focusCashReserve: 20, focusOnly: true },
  { id: "career-track", label: "Career track focus", priorities: ["agentNegotiation", "sponsorshipAppeal"], cashReserve: 60, focusTrack: "career", focusCashReserve: 20, focusOnly: true },
  { id: "longevity-track", label: "Longevity track focus", priorities: ["recoveryBaseline", "xpFloor", "xpCeiling", "longevity"], cashReserve: 60, focusTrack: "longevity", focusCashReserve: 20 },
];

const activeSupportScenarios =
  generationCount > 1
    ? supportScenarios.filter((scenario) => scenario.id === "none" || scenario.id === "balanced" || scenario.id.endsWith("-track"))
    : supportScenarios;

// Family standing compounds across generations: each gen inherits a prestige floor
// grown from the previous gen's avg end prestige (same sqrt*3, never-decreasing rule
// as the game's retireCareer). Tracked per scenario so the carry is apples-to-apples.
const inheritedPrestigeByScenario = new Map();

for (let generation = 1; generation <= generationCount; generation += 1) {
  activeSupportScenarios.forEach((scenario) => {
    const inheritedPrestige = inheritedPrestigeByScenario.get(scenario.id) ?? 0;
    const reports = [];
    for (let index = 0; index < seasons; index += 1) {
      reports.push(simulateCareer(index, scenario, generation, inheritedPrestige));
    }
    const summary = summarizeSeasons(reports);
    const nextFloor = Math.max(inheritedPrestige, Math.round(Math.sqrt(Math.max(0, summary.endPrestige.avg)) * 3));
    inheritedPrestigeByScenario.set(scenario.id, nextFloor);
    printSeasonReport(summary, scenario, generation);
  });
}

function simulateCareer(runIndex, scenario, generation = 1, inheritedPrestige = 0) {
  const state = {
    trust: 38,
    fitness: 86,
    morale: 74,
    pressure: 26,
    ratings: [],
    cash: 420,
    prestige: 12 + Math.round(inheritedPrestige),
    tier: leagueTiers[0],
    // The player starts at the WEAKEST club in the bottom division (game: createCareerForCountry
    // picks the lowest-strength tier-6 club). The club's match results — driven by the player's
    // growing quality — determine promotion, so a star drags a weak club up the pyramid.
    clubStrength: leagueTiers[0].teamRange[0],
    supportUpgrades: createInitialSupportUpgrades(),
    attributes: createGenerationAttributes(generation),
    contract: { ...initialContract },
    sponsor: undefined,
    seasonGoals: 0,
    seasonAssists: 0,
    clubName: getInitialLabClubName(labCountry),
    transferredThisSeason: false,
    age: 16,
  };
  const startOvr = calculateOvr(flattenAttributes(state.attributes));
  const stats = {
    scheduledMatches: 0,
    apps: 0,
    starts: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    chancesCreated: 0,
    highlights: 0,
    levelUps: 0,
    trainingXp: 0,
    matchXp: 0,
    trainingLevelUps: 0,
    matchLevelUps: 0,
    qualityCounts: new Map(),
    roleCounts: new Map(),
    ratings: [],
    fitness: [],
    trust: [],
    cashEarned: 0,
    cashSpent: 0,
    prestigeGained: 0,
    sponsorEarned: 0,
    sponsorDeals: 0,
    firstSponsorUnlockWeek: undefined,
    firstSponsorDealWeek: undefined,
    supportPurchases: 0,
    contractOffers: 0,
    transferWindows: 0,
    transferOffers: 0,
    transfers: 0,
    tierMoves: 0,
    promotions: 0,
    relegations: 0,
  };
  const seasonReports = [];
  let absoluteWeekIndex = 0;

  for (let careerSeason = 0; careerSeason < careerSeasons; careerSeason += 1) {
    state.transferredThisSeason = false;
    state.age = 16 + careerSeason;
    const seasonFixtures = createWorldSeasonFixtures(state.tier, careerSeason, runIndex);
    state.seasonLength = seasonFixtures.length;
    const seasonStartOvr = calculateOvr(flattenAttributes(state.attributes));
    const seasonStats = createRunStats();
    stats.scheduledMatches += seasonFixtures.length;
    seasonStats.scheduledMatches += seasonFixtures.length;
    seasonFixtures.forEach((fixture, weekIndex) => {
      const weekSeed = `run-${runIndex}-season-${careerSeason}-week-${weekIndex}-${fixture.id}-${scenario.id}`;
      const preTrainingSpend = buySupportUpgrades(state, scenario);
      stats.cashSpent += preTrainingSpend.spent;
      stats.supportPurchases += preTrainingSpend.purchases;
      seasonStats.cashSpent += preTrainingSpend.spent;
      seasonStats.supportPurchases += preTrainingSpend.purchases;

      const focuses = chooseTrainingFocuses(state, absoluteWeekIndex);
      state.trainingFocuses = focuses;
      const training = applyTraining(state, focuses, weekSeed);
      stats.levelUps += training.levelUps;
      stats.trainingXp += training.xp;
      stats.trainingLevelUps += training.levelUps;
      increment(stats.qualityCounts, training.quality);
      seasonStats.levelUps += training.levelUps;
      seasonStats.trainingXp += training.xp;
      seasonStats.trainingLevelUps += training.levelUps;
      increment(seasonStats.qualityCounts, training.quality);

      const context = buildContext(state, fixture, weekSeed);
      const match = simulateMatch(state, context, weekSeed);
      increment(stats.roleCounts, context.playerRole);
      increment(seasonStats.roleCounts, context.playerRole);

      if (match.minutes > 0) {
        addMatchStats(stats, match, context);
        addMatchStats(seasonStats, match, context);
        state.ratings = [...state.ratings.slice(-4), match.rating];
        state.seasonGoals += match.playerGoals;
        state.seasonAssists += match.playerAssists;
      }

      // The club contests every fixture (player featured or not) — accumulate its result
      // for the season standings that decide promotion/relegation.
      if (match.teamGoals > match.opponentGoals) {
        seasonStats.clubWins += 1;
      } else if (match.teamGoals === match.opponentGoals) {
        seasonStats.clubDraws += 1;
      } else {
        seasonStats.clubLosses += 1;
      }

      const matchLevelUps = addAttributeXp(state.attributes, match.xp);
      stats.levelUps += matchLevelUps;
      stats.matchXp += sumXp(match.xp);
      stats.matchLevelUps += matchLevelUps;
      seasonStats.levelUps += matchLevelUps;
      seasonStats.matchXp += sumXp(match.xp);
      seasonStats.matchLevelUps += matchLevelUps;
      state.trust = clamp(state.trust + match.trustDelta, 0, 100);
      state.pressure = clamp(state.pressure + match.playerGoals * 2 + (state.sponsor?.pressureModifier ?? 0), 0, 100);
      const environment = getDevelopmentEnvironment(state.tier);
      const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
      const effectiveRecoveryBaselineLevel = getSupportLevel(state, "recoveryBaseline") * environment.supportEfficiency;
      const weeklyRecoveryBonus =
        1 +
        environment.recoveryBonus +
        getWeeklySupportRecoveryBonus(effectiveRecoveryBaselineLevel);
      const projectedFitness = clamp(state.fitness + match.fitnessDelta + weeklyRecoveryBonus, 0, 100);
      const recoveryFloor = getRecoveryFitnessFloor(effectiveRecoveryBaselineLevel, recoveryBreakthroughs);
      const recoveryCeiling = getRecoveryFitnessCeiling(effectiveRecoveryBaselineLevel, recoveryBreakthroughs);
      state.fitness = applyRecoveryCeiling(state.fitness, applyRecoveryFloor(state.fitness, projectedFitness, recoveryFloor), recoveryCeiling);
      state.morale = clamp(state.morale + (match.minutes > 0 ? (match.rating >= 7 ? 3 : -2) : 0), 0, 100);
      const prestigeGain = getMatchPrestigeDelta(match, state.tier, context, match.minutes > 0);
      state.prestige += prestigeGain;
      stats.prestigeGained += prestigeGain;
      seasonStats.prestigeGained += prestigeGain;
      if (state.prestige >= prestigeTiers[1].threshold && stats.firstSponsorUnlockWeek === undefined) {
        stats.firstSponsorUnlockWeek = absoluteWeekIndex + 1;
        seasonStats.firstSponsorUnlockWeek = weekIndex + 1;
      }
      if (!state.sponsor) {
        const sponsorOffer = getBestSponsorOffer(state);
        if (sponsorOffer) {
          state.sponsor = { ...sponsorOffer, objective: { ...sponsorOffer.objective } };
          stats.sponsorDeals += 1;
          seasonStats.sponsorDeals += 1;
          if (stats.firstSponsorDealWeek === undefined) {
            stats.firstSponsorDealWeek = absoluteWeekIndex + 1;
          }
          if (seasonStats.firstSponsorDealWeek === undefined) {
            seasonStats.firstSponsorDealWeek = weekIndex + 1;
          }
        }
      }
      const sponsorPayout = applySponsorAppealBonus(getSponsorPayout(state.sponsor, match), getSponsorAppealBonus(getSupportLevel(state, "sponsorshipAppeal")));
      const cashEarned = Math.round(
        state.contract.weeklyWage +
          (match.minutes > 0 ? state.contract.appearanceBonus : 0) +
          match.playerGoals * state.contract.goalBonus +
          match.playerAssists * state.contract.assistBonus +
          sponsorPayout.total,
      );
      state.cash += cashEarned;
      stats.cashEarned += cashEarned;
      seasonStats.cashEarned += cashEarned;
      stats.sponsorEarned += sponsorPayout.total;
      seasonStats.sponsorEarned += sponsorPayout.total;
      state.contract.weeksRemaining = Math.max(0, state.contract.weeksRemaining - 1);
      state.sponsor = advanceSponsorWeek(state.sponsor);

      const transferWindow = createLabTransferWindow(state, match, fixture, weekIndex + 1, seasonFixtures.length, weekSeed);
      if (transferWindow) {
        stats.transferWindows += 1;
        seasonStats.transferWindows += 1;
        stats.transferOffers += transferWindow.offerCount;
        seasonStats.transferOffers += transferWindow.offerCount;
        const acceptedOffer = chooseTransferWindowOffer(state, transferWindow);
        if (acceptedOffer) {
          const accepted = acceptLabContractOffer(state, acceptedOffer);
          state.cash += acceptedOffer.signingBonus;
          stats.cashEarned += acceptedOffer.signingBonus;
          seasonStats.cashEarned += acceptedOffer.signingBonus;
          stats.contractOffers += 1;
          seasonStats.contractOffers += 1;
          if (accepted.transferred) {
            stats.transfers += 1;
            seasonStats.transfers += 1;
            stats.tierMoves += accepted.tierMove;
            seasonStats.tierMoves += accepted.tierMove;
          }
        }
      } else {
        const contractOffer = getClubContractOffer(state, match, fixture);
        if (contractOffer && shouldAcceptContractOffer(state.contract, contractOffer)) {
          state.contract = contractFromOffer(contractOffer);
          state.cash += contractOffer.signingBonus;
          stats.cashEarned += contractOffer.signingBonus;
          seasonStats.cashEarned += contractOffer.signingBonus;
          stats.contractOffers += 1;
          seasonStats.contractOffers += 1;
        }
      }
      const postMatchSpend = buySupportUpgrades(state, scenario);
      stats.cashSpent += postMatchSpend.spent;
      stats.supportPurchases += postMatchSpend.purchases;
      seasonStats.cashSpent += postMatchSpend.spent;
      seasonStats.supportPurchases += postMatchSpend.purchases;
      stats.fitness.push(state.fitness);
      stats.trust.push(state.trust);
      seasonStats.fitness.push(state.fitness);
      seasonStats.trust.push(state.trust);
      absoluteWeekIndex += 1;
    });
    const seasonPrestigeReward = getSeasonPrestigeReward(state, seasonStats);
    state.prestige += seasonPrestigeReward;
    stats.prestigeGained += seasonPrestigeReward;
    seasonStats.prestigeGained += seasonPrestigeReward;
    if (state.prestige >= prestigeTiers[1].threshold && stats.firstSponsorUnlockWeek === undefined) {
      stats.firstSponsorUnlockWeek = absoluteWeekIndex;
      seasonStats.firstSponsorUnlockWeek = seasonFixtures.length;
    }
    seasonReports.push(createSeasonReport(careerSeason + 1, state, seasonStats, seasonStartOvr));
    // Promotion / relegation moves the player WITH their club into next season's tier.
    // Skipped if they already transferred this season — that move already set the tier.
    if (careerSeason < careerSeasons - 1 && !state.transferredThisSeason) {
      const movement = resolveTierMovement(state, seasonStats, seasonFixtures.length, `run-${runIndex}-${scenario.id}-s${careerSeason}`);
      if (movement.direction === "promoted") {
        stats.promotions += 1;
      } else if (movement.direction === "relegated") {
        stats.relegations += 1;
      }
    }
    state.seasonGoals = 0;
    state.seasonAssists = 0;
  }

  const endOvr = calculateOvr(flattenAttributes(state.attributes));
  const potentialOvr = calculateOvr(flattenPotentialAttributes(state.attributes));
  const highestTierId = getHighestTierId([state.tier.id, ...seasonReports.map((season) => season.tierId)]);
  const legacyPoints = calculateLegacyPoints({
    peakOvr: Math.max(endOvr, ...seasonReports.map((season) => season.endOvr)),
    apps: stats.apps,
    goals: stats.goals,
    assists: stats.assists,
    averageRating: average(stats.ratings, 6.4),
    prestige: state.prestige,
    highestTierId,
  });
  const highestTierIndex = tierOrder.indexOf(highestTierId);
  const highestTierLabel = leagueTiers[highestTierIndex]?.label ?? highestTierId;
  return {
    startOvr,
    endOvr,
    potentialOvr,
    ovrGain: endOvr - startOvr,
    scheduledMatches: stats.scheduledMatches,
    apps: stats.apps,
    starts: stats.starts,
    minutes: stats.minutes,
    goals: stats.goals,
    assists: stats.assists,
    chancesCreated: stats.chancesCreated,
    highlights: stats.highlights,
    levelUps: stats.levelUps,
    trainingXp: stats.trainingXp,
    matchXp: stats.matchXp,
    trainingLevelUps: stats.trainingLevelUps,
    matchLevelUps: stats.matchLevelUps,
    trainingXpShare: stats.trainingXp + stats.matchXp > 0 ? stats.trainingXp / (stats.trainingXp + stats.matchXp) : 0,
    matchXpShare: stats.trainingXp + stats.matchXp > 0 ? stats.matchXp / (stats.trainingXp + stats.matchXp) : 0,
    goalsPer90: stats.minutes ? (stats.goals / stats.minutes) * 90 : 0,
    assistsPer90: stats.minutes ? (stats.assists / stats.minutes) * 90 : 0,
    chancesCreatedPer90: stats.minutes ? (stats.chancesCreated / stats.minutes) * 90 : 0,
    assistConversion: stats.chancesCreated ? stats.assists / stats.chancesCreated : 0,
    highlightsPer90: stats.minutes ? (stats.highlights / stats.minutes) * 90 : 0,
    avgRating: average(stats.ratings, 6.4),
    endTrust: state.trust,
    endFitness: state.fitness,
    cashEarned: stats.cashEarned,
    cashSpent: stats.cashSpent,
    prestigeGained: stats.prestigeGained,
    sponsorEarned: stats.sponsorEarned,
    sponsorDeals: stats.sponsorDeals,
    firstSponsorUnlockWeek: stats.firstSponsorUnlockWeek,
    firstSponsorDealWeek: stats.firstSponsorDealWeek,
    endPrestige: state.prestige,
    legacyPoints,
    prestigeTier: getPrestigeStatus(state.prestige).current.label,
    contractOffers: stats.contractOffers,
    transferWindows: stats.transferWindows,
    transferOffers: stats.transferOffers,
    transfers: stats.transfers,
    tierMoves: stats.tierMoves,
    promotions: stats.promotions,
    relegations: stats.relegations,
    highestTierIndex,
    highestTierLabel,
    endCash: state.cash,
    supportPurchases: stats.supportPurchases,
    supportLevels: Object.values(state.supportUpgrades).reduce((sum, level) => sum + level, 0),
    supportTrackLevels: Object.fromEntries(supportTrackDefinitions.map((track) => [track.id, getSupportTrackTotal(state, track)])),
    supportTrackBreakthroughs: Object.fromEntries(supportTrackDefinitions.map((track) => [track.id, getSupportTrackBreakthroughCount(state, track.id)])),
    roleCounts: stats.roleCounts,
    qualityCounts: stats.qualityCounts,
    seasonReports,
  };
}

function createRunStats() {
  return {
    scheduledMatches: 0,
    apps: 0,
    starts: 0,
    minutes: 0,
    goals: 0,
    assists: 0,
    chancesCreated: 0,
    highlights: 0,
    levelUps: 0,
    trainingXp: 0,
    matchXp: 0,
    trainingLevelUps: 0,
    matchLevelUps: 0,
    qualityCounts: new Map(),
    roleCounts: new Map(),
    ratings: [],
    fitness: [],
    trust: [],
    cashEarned: 0,
    cashSpent: 0,
    prestigeGained: 0,
    sponsorEarned: 0,
    sponsorDeals: 0,
    firstSponsorUnlockWeek: undefined,
    firstSponsorDealWeek: undefined,
    supportPurchases: 0,
    contractOffers: 0,
    transferWindows: 0,
    transferOffers: 0,
    transfers: 0,
    tierMoves: 0,
    clubWins: 0,
    clubDraws: 0,
    clubLosses: 0,
  };
}

function addMatchStats(stats, match, context) {
  stats.apps += 1;
  stats.starts += isStartingRole(context.playerRole) ? 1 : 0;
  stats.minutes += match.minutes;
  stats.goals += match.playerGoals;
  stats.assists += match.playerAssists;
  stats.chancesCreated += match.chancesCreated;
  stats.highlights += match.playerMomentCount;
  stats.ratings.push(match.rating);
}

function createSeasonReport(season, state, stats, startOvr) {
  const endOvr = calculateOvr(flattenAttributes(state.attributes));
  const growthProfileOvr = calculateOvr(flattenPotentialAttributes(state.attributes));
  // Effective OVR = raw skill scaled by the age modifier (what actually shows on the pitch).
  // After the peak this falls even as raw skill keeps creeping up — the visible decline.
  const effectiveOvr = calculateOvr(agedFlat(state));
  return {
    season,
    tier: state.tier.label,
    tierId: state.tier.id,
    scheduledMatches: stats.scheduledMatches,
    startOvr,
    endOvr,
    effectiveOvr,
    growthProfileOvr,
    ovrGain: endOvr - startOvr,
    apps: stats.apps,
    starts: stats.starts,
    minutes: stats.minutes,
    goals: stats.goals,
    assists: stats.assists,
    chancesCreated: stats.chancesCreated,
    goalsPer90: stats.minutes ? (stats.goals / stats.minutes) * 90 : 0,
    assistsPer90: stats.minutes ? (stats.assists / stats.minutes) * 90 : 0,
    chancesCreatedPer90: stats.minutes ? (stats.chancesCreated / stats.minutes) * 90 : 0,
    assistConversion: stats.chancesCreated ? stats.assists / stats.chancesCreated : 0,
    avgRating: average(stats.ratings, 6.4),
    levelUps: stats.levelUps,
    trainingXp: stats.trainingXp,
    matchXp: stats.matchXp,
    trainingLevelUps: stats.trainingLevelUps,
    matchLevelUps: stats.matchLevelUps,
    trainingXpShare: stats.trainingXp + stats.matchXp > 0 ? stats.trainingXp / (stats.trainingXp + stats.matchXp) : 0,
    matchXpShare: stats.trainingXp + stats.matchXp > 0 ? stats.matchXp / (stats.trainingXp + stats.matchXp) : 0,
    endFitness: state.fitness,
    endTrust: state.trust,
    cashEarned: stats.cashEarned,
    cashSpent: stats.cashSpent,
    netCash: stats.cashEarned - stats.cashSpent,
    prestigeGained: stats.prestigeGained,
    sponsorEarned: stats.sponsorEarned,
    sponsorDeals: stats.sponsorDeals,
    firstSponsorUnlockWeek: stats.firstSponsorUnlockWeek,
    firstSponsorDealWeek: stats.firstSponsorDealWeek,
    endPrestige: state.prestige,
    prestigeTier: getPrestigeStatus(state.prestige).current.label,
    contractOffers: stats.contractOffers,
    transferWindows: stats.transferWindows,
    transferOffers: stats.transferOffers,
    transfers: stats.transfers,
    tierMoves: stats.tierMoves,
    clubPpg: stats.scheduledMatches ? (stats.clubWins * 3 + stats.clubDraws) / stats.scheduledMatches : 0,
    supportPurchases: stats.supportPurchases,
    supportLevels: Object.values(state.supportUpgrades).reduce((sum, level) => sum + level, 0),
    supportTrackLevels: Object.fromEntries(supportTrackDefinitions.map((track) => [track.id, getSupportTrackTotal(state, track)])),
    roleCounts: stats.roleCounts,
    qualityCounts: stats.qualityCounts,
  };
}

function chooseTrainingFocuses(state, weekIndex) {
  const capacity = getTrainingFocusCapacity(state);
  const flat = flattenAttributes(state.attributes);
  const sortedNeeds = focusCycle
    .map((focus) => ({ focus, value: flat[focus], xp: state.attributes[focus].xp }))
    .sort((a, b) => a.value - b.value || b.xp - a.xp);
  const primaryFocus = weekIndex % 4 === 0 ? sortedNeeds[0].focus : focusCycle[weekIndex % focusCycle.length];
  const extraFocuses = sortedNeeds.map((item) => item.focus).filter((focus) => focus !== primaryFocus);
  return [primaryFocus, ...extraFocuses].slice(0, capacity);
}

function applyTraining(state, focuses, seed) {
  const activeFocuses = focuses.length > 0 ? focuses : ["Finishing"];
  const environment = getDevelopmentEnvironment(state.tier);
  const qualityProfile = getTrainingQualityProfile(state, seed, environment);
  const xpFloorLevel = getSupportLevel(state, "xpFloor");
  const xpCeilingLevel = getSupportLevel(state, "xpCeiling");
  const trainingLoadLevel = getSupportLevel(state, "trainingLoad");
  const recoveryBaselineLevel = getSupportLevel(state, "recoveryBaseline");
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
  const effectiveXpFloorLevel = xpFloorLevel * environment.supportEfficiency;
  const effectiveXpCeilingLevel = xpCeilingLevel * environment.supportEfficiency;
  const effectiveTrainingLoadLevel = trainingLoadLevel * environment.supportEfficiency;
  const effectiveRecoveryBaselineLevel = recoveryBaselineLevel * environment.supportEfficiency;

  if (state.fitness < 20) {
    state.fitness = clamp(state.fitness + 12 + environment.recoveryBonus + getRecoverySessionBonus(effectiveRecoveryBaselineLevel), 0, 100);
    state.trust = clamp(state.trust - 1, 0, 100);
    return { xp: 0, levelUps: 0, quality: "Poor" };
  }

  const xpGain = {};
  activeFocuses.forEach((focus, index) => {
    const roll = seededNoise(`${seed}-training-${focus}`);
    const focusWeight = getTrainingFocusWeight(state, index);
    const min = Math.round(
      (16 + environment.xpFloorBonus + getTrainingXpFloorBonus(effectiveXpFloorLevel)) *
        focusWeight *
        environment.xpMultiplier *
        qualityProfile.xpMultiplier,
    );
    const max = Math.round(
      (78 + environment.xpFloorBonus + getTrainingXpCeilingBonus(effectiveXpCeilingLevel)) *
        focusWeight *
        environment.xpMultiplier *
        qualityProfile.xpMultiplier,
    );
    xpGain[focus] = (xpGain[focus] ?? 0) + Math.round(min + roll * (max - min));
  });
  const levelUps = addAttributeXp(state.attributes, xpGain);
  const fitnessDelta = Math.min(0, -4 + getTrainingFatigueRelief(effectiveTrainingLoadLevel));
  const projectedFitness = clamp(state.fitness + fitnessDelta, 0, 100);
  const recoveryFloor = getRecoveryFitnessFloor(effectiveRecoveryBaselineLevel, recoveryBreakthroughs);
  const recoveryCeiling = getRecoveryFitnessCeiling(effectiveRecoveryBaselineLevel, recoveryBreakthroughs);
  state.fitness = applyRecoveryCeiling(state.fitness, applyRecoveryFloor(state.fitness, projectedFitness, recoveryFloor), recoveryCeiling);
  state.trust = clamp(state.trust + 1, 0, 100);
  return { xp: sumXp(xpGain), levelUps, quality: qualityProfile.quality };
}

function getTrainingFocusCapacity(state) {
  if (getSupportLevel(state, "focusSlot3Unlock") >= supportUpgradeMap.focusSlot3Unlock.maxLevel) return 3;
  if (getSupportLevel(state, "focusSlot2Unlock") >= supportUpgradeMap.focusSlot2Unlock.maxLevel) return 2;
  return 1;
}

function getTrainingFocusWeight(state, index) {
  if (index === 0) return 1;
  if (index === 1) return getFocusSlot2Efficiency(state);
  return getFocusSlot3Efficiency(state);
}

function getTrainingQualityProfile(state, seed, environment = getDevelopmentEnvironment(state.tier)) {
  const trainingLoadLevel = getSupportLevel(state, "trainingLoad");
  const recoveryBaselineLevel = getSupportLevel(state, "recoveryBaseline");
  const trainingBreakthroughs = getSupportTrackBreakthroughCount(state, "training");
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
  const readinessScore =
    state.fitness * 0.42 +
    state.morale * 0.18 +
    (100 - state.pressure) * 0.12 +
    environment.facilityLevel * 5 +
    trainingLoadLevel * 0.35 +
    recoveryBaselineLevel * 0.3 +
    trainingBreakthroughs * 5 +
    recoveryBreakthroughs * 1.5;
  const qualityScore = readinessScore + Math.round(seededNoise(`${seed}-quality`) * 34) - 17;
  if (qualityScore >= 88) return { quality: "Breakthrough", xpMultiplier: 1.42 };
  if (qualityScore >= 68) return { quality: "Sharp", xpMultiplier: 1.18 };
  if (qualityScore >= 42) return { quality: "Solid", xpMultiplier: 1 };
  return { quality: "Poor", xpMultiplier: 0.72 };
}

function buildContext(state, fixture, matchSeed) {
  const opponentProfile = buildOpponentProfile({
    opponentStrength: fixture.opponentStrength,
    opponentForm: fixture.opponentForm,
    serviceLevel: fixture.serviceLevel,
    seed: fixture.id,
  });
  // Team strength = the club's own baseline plus how much the player lifts it. A strong
  // player on a weak club drags results upward (the engine of climbing the pyramid); a weak
  // player can't carry a club above its level. Mirrors the game, where the club takes the
  // player's real match results into the world standings.
  const playerOvr = calculateOvr(agedFlat(state));
  const clubStrength = state.clubStrength ?? state.tier.averageOvr;
  const playerLift = clamp((playerOvr - clubStrength) * 0.45, -5, 18);
  const tierTeamStrength = clubStrength + playerLift;
  const formAdjustedTeamStrength = tierTeamStrength + Math.round((getFormScore(state.ratings) - 50) / 18);
  const opponentStrength = fixture.opponentStrength;
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
  const actionAttributes = getLeagueAdjustedAttributes(agedFlat(state), state.tier);
  const adjustedOpponentProfile = getLeagueAdjustedOpponentProfile(context.opponentProfile, state.tier);
  const involvementScore =
    state.trust * 0.35 +
    state.fitness * 0.25 +
    getFormScore(state.ratings) * 0.2 +
    getContextualAbilityScore(calculateOvr(agedFlat(state)), state.tier) * 0.2 +
    getRoleInvolvementBias(context.playerRole) * 10;
  const playerMomentCount = minutes > 0 ? getPlayerMomentCount(context.playerRole, involvementScore, minutes, matchSeed) : 0;
  const moments = createPositionMatchPool({
    opponentShort: context.opponent,
    managerInstruction: "Season lab simulation",
    tacticalFocus: "Balance lab forward focus.",
    fitness: state.fitness,
    momentPools: ["forward", "shared"],
  });
  const directorPlan = createMatchDirectorPlan({
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
  const selectedMoments = directorPlan.moments;
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
  const chancesCreated = sum(playerResults.map((result) => result.chancesCreated));
  const playerRating = playerResults.length ? average(playerResults.map((result) => result.rating), 6.4) : 6.4;
  const simRatingDelta = sum(simEvents.map((event) => event.ratingDelta));
  const xp = mergeXp(playerResults.map((result) => result.xp));
  // The club's full-time result, driven by team strength (which now includes the player's
  // lift). Used for prestige resultBonus AND for the club's league standing -> promotion.
  const fullTime = getSimScoreAtMinute(simEvents, 90);

  return {
    minutes,
    teamGoals: fullTime.teamGoals,
    opponentGoals: fullTime.opponentGoals,
    playerGoals,
    playerAssists,
    chancesCreated,
    playerMomentCount: playerResults.length,
    rating: Number(aggregateMatchRating(playerResults, simRatingDelta).toFixed(1)),
    trustDelta: sum(playerResults.map((result) => result.trustDelta)),
    fitnessDelta: getMatchFitnessDelta(state, minutes, playerResults),
    xp,
  };
}

function createMatchResult(state, context, moment, choice, resultSeed) {
  const result = resolvePlayerChoice({
    moment,
    choice,
    attributeValues: getLeagueAdjustedAttributes(agedFlat(state), state.tier),
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
  const adjustedTierBase = { Poor: 4, Okay: 6, Good: 8, Great: 11 };
  const chainMultiplier = moment.chainDepth && moment.chainDepth > 0 ? 0.65 : 1;
  const xp = {};
  choice.uses.forEach((key, index) => {
    xp[key] = (xp[key] ?? 0) + Math.max(1, Math.round(adjustedTierBase[tier] * chainMultiplier)) + (index === 0 ? 2 : 0);
  });
  if (forwardPreferredCategories.includes(moment.category)) {
    xp[choice.uses[0]] = (xp[choice.uses[0]] ?? 0) + Math.max(1, Math.round(1 * chainMultiplier));
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
    return Math.round(22 + attributeValue * 1.1);
  }
  if (attributeValue < 50) {
    return Math.round(52 + (attributeValue - 30) * 2.8);
  }
  if (attributeValue < 70) {
    return Math.round(108 + (attributeValue - 50) * 4.7);
  }
  return Math.round(205 + (attributeValue - 70) * 7.5 + Math.pow(attributeValue - 70, 1.2) * 5);
}

function getAttributeGrowthMultiplier(attribute) {
  const distance = attribute.potential - attribute.value;
  if (distance >= 10) {
    return 0.78;
  }
  if (distance >= 0) {
    return 0.95;
  }
  const overProfile = Math.abs(distance);
  return 1 + overProfile * 0.7 + Math.pow(overProfile, 1.6) * 0.22;
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
  if (!context.isInSquad || state.fitness < 10) {
    return { entryMinute: 91 };
  }
  const variation = Math.round(seededNoise(`${matchSeed}-${role}-${state.fitness}-appearance`) * 12) - 6;
  const scoreAround60 = getSimScoreAtMinute(simEvents, 60);
  const teamGoalDiff = scoreAround60.teamGoals - scoreAround60.opponentGoals;
  const earlyEvent = seededNoise(`${matchSeed}-early-sub`) > 0.88 ? -12 : 0;
  const fitnessDelay = state.fitness < 40 ? 10 : state.fitness < 60 ? 4 : 0;

  if (role === "Bench") {
    return { entryMinute: clamp(78 + variation + earlyEvent + (teamGoalDiff < 0 ? -6 : 0) + fitnessDelay, 60, 91) };
  }
  if (role === "Impact Sub") {
    const matchStateAdjustment = teamGoalDiff < 0 ? -7 : teamGoalDiff >= 2 ? -5 : teamGoalDiff > 0 ? 4 : 0;
    return { entryMinute: clamp(66 + variation + earlyEvent + matchStateAdjustment + fitnessDelay, 48, 88) };
  }
  if (role === "Rotation Starter") {
    const fatigueExit = state.fitness < 40 ? -10 : state.fitness < 60 ? -5 : 0;
    return { entryMinute: 0, exitMinute: clamp(72 + variation + fatigueExit, 55, 86) };
  }
  if (state.fitness < 60) {
    return { entryMinute: 0, exitMinute: clamp((state.fitness < 40 ? 70 : 80) + variation, 50, 88) };
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

function getMatchFitnessDelta(state, minutes, results) {
  if (minutes <= 0) {
    return 0;
  }
  const environment = getDevelopmentEnvironment(state.tier);
  const matchRecoveryLevel = getSupportLevel(state, "matchRecovery") * environment.supportEfficiency;
  const minuteLoad = -Math.max(1, Math.round(minutes / 18));
  const actionLoad = sum(results.map((result) => Math.min(0, result.fitnessDelta)));
  const scaledActionLoad = Math.round(actionLoad * Math.min(1, minutes / 60) * 0.35);
  // Same engine source as the app: Stamina amplifies/dampens the load (freshness-damped, compounds over
  // a congested run). The lab striker is Stamina 10, so this is the canary for the dumped-athletics cost.
  const staminaMultiplier = getStaminaFitnessLoadMultiplier(agedFlat(state).Stamina ?? 55, minutes, state.fitness);
  return clamp(Math.round((minuteLoad + scaledActionLoad) * staminaMultiplier) + getMatchActionRecoveryRelief(matchRecoveryLevel), -12, 0);
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
  const playerOvr = calculateOvr(agedFlat(state));
  const abilityImpact = clamp(Math.round((playerOvr - tier.averageOvr) * 0.8), -8, 10);
  const fixtureGap = (fixture.opponentStrength + tierOffset) - (teamStrength + tierOffset);
  const fixtureImpact = fixtureGap >= 6 ? -2 : fixtureGap <= -4 ? 1 : 0;
  const pressureImpact = -Math.round((state.pressure ?? 0) * 0.08);
  const score = clamp(
    22 + trustImpact + fitnessImpact + formImpact + ratingImpact + importanceImpact + fixtureImpact + abilityImpact + pressureImpact,
    0,
    100,
  );
  return { score, role: state.fitness < 20 ? "Bench" : capRoleByFitness(getPlayerMatchRole(score), getFitnessAvailability(state.fitness)) };
}

function getFitnessAvailability(fitness) {
  if (fitness < 20) return "Not match fit";
  if (fitness < 40) return "Risky";
  if (fitness < 60) return "Tired";
  if (fitness < 80) return "Ready";
  return "Sharp";
}

function getFitnessSelectionImpact(fitness) {
  if (fitness < 20) return -38;
  if (fitness < 40) return -16;
  if (fitness < 60) return -6;
  if (fitness < 80) return 0;
  return Math.min(2, Math.round((fitness - 80) * 0.1));
}

function capRoleByFitness(role, availability) {
  if (availability === "Not match fit") return "Bench";
  if (availability === "Risky" && (role === "Starter" || role === "Rotation Starter")) return "Impact Sub";
  if (availability === "Tired" && role === "Starter") return "Rotation Starter";
  return role;
}

function getPrestigeStatus(prestige) {
  const current = [...prestigeTiers].reverse().find((tier) => prestige >= tier.threshold) ?? prestigeTiers[0];
  const currentIndex = prestigeTiers.findIndex((tier) => tier.id === current.id);
  const next = prestigeTiers[currentIndex + 1];
  const span = next ? next.threshold - current.threshold : Math.max(1, current.threshold);
  const pointsInTier = Math.max(0, prestige - current.threshold);
  return {
    current,
    next,
    pointsToNext: next ? Math.max(0, next.threshold - prestige) : 0,
    progressPercent: next ? clamp(Math.round((pointsInTier / span) * 100), 0, 100) : 100,
  };
}

function getPrestigeLeverageScore(prestige) {
  return clamp(Math.round(Math.sqrt(Math.max(0, prestige)) * 1.35), 0, 100);
}

function getBestSponsorOffer(state) {
  const unlocked = sponsorDefinitions.filter((deal) => state.prestige >= deal.prestigeRequired);
  if (unlocked.length === 0) {
    return undefined;
  }
  // Mirror the game: only the highest unlocked prestige band is on offer.
  const topThreshold = Math.max(...unlocked.map((deal) => deal.prestigeRequired));
  const available = unlocked.filter((deal) => deal.prestigeRequired === topThreshold);
  return available.sort((a, b) => getSponsorExpectedValue(b) - getSponsorExpectedValue(a))[0];
}

function getSponsorExpectedValue(sponsor) {
  const pressureCost = Math.max(0, sponsor.pressureModifier) * 12;
  return sponsor.weeklyRetainer * sponsor.weeksRemaining + sponsor.objectiveBonus * 0.35 - pressureCost;
}

function getSponsorPayout(sponsor, match) {
  if (!sponsor) {
    return { total: 0, retainer: 0, objectiveBonus: 0 };
  }

  const completed = isSponsorObjectiveCompleted(sponsor, match);
  const objectiveBonus = completed ? sponsor.objectiveBonus : 0;
  return {
    retainer: sponsor.weeklyRetainer,
    objectiveBonus,
    total: sponsor.weeklyRetainer + objectiveBonus,
  };
}

function applySponsorAppealBonus(payout, bonusRatio) {
  if (bonusRatio <= 0 || payout.total <= 0) {
    return payout;
  }

  const retainer = Math.round(payout.retainer * (1 + bonusRatio));
  const objectiveBonus = Math.round(payout.objectiveBonus * (1 + bonusRatio));
  return { ...payout, retainer, objectiveBonus, total: retainer + objectiveBonus };
}

function isSponsorObjectiveCompleted(sponsor, match) {
  switch (sponsor.objective.type) {
    case "appearance":
      return match.minutes > 0;
    case "goal":
      return match.playerGoals >= sponsor.objective.target;
    case "assist":
      return match.playerAssists >= sponsor.objective.target;
    case "rating":
      return match.minutes > 0 && match.rating >= sponsor.objective.target;
    default:
      return false;
  }
}

function advanceSponsorWeek(sponsor) {
  if (!sponsor) {
    return undefined;
  }

  const weeksRemaining = sponsor.weeksRemaining - 1;
  return weeksRemaining > 0 ? { ...sponsor, objective: { ...sponsor.objective }, weeksRemaining } : undefined;
}

function getMatchPrestigeDelta(match, tier, context, playerAppeared) {
  if (!playerAppeared) {
    return 0;
  }
  const importanceMultiplier = context.matchImportance === "High" ? 1.35 : context.matchImportance === "Low" ? 0.8 : 1;
  const appearanceBonus = 2;
  const resultBonus = match.teamGoals > match.opponentGoals ? 3 : match.teamGoals === match.opponentGoals ? 1 : 0;
  const ratingBonus = Math.max(0, match.rating - 6.2) * 5;
  const standoutBonus = match.rating >= 7.5 ? 5 : match.rating >= 7 ? 3 : 0;
  const outputBonus = match.playerGoals * 18 + match.playerAssists * 12 + match.chancesCreated * 4;
  const base = appearanceBonus + resultBonus + ratingBonus + standoutBonus + outputBonus;
  return Math.max(0, Math.round(base * tier.prestigeMultiplier * importanceMultiplier));
}

function getSeasonPrestigeReward(state, stats) {
  const averageRating = average(stats.ratings, 6.4);
  const appearanceBonus = stats.apps * 1.2 + stats.starts * 1.8;
  const outputBonus = stats.goals * 14 + stats.assists * 9;
  const ratingBonus = Math.max(0, averageRating - 6.3) * 55;
  const consistencyBonus = stats.apps >= 20 ? 18 : stats.apps >= 12 ? 8 : 0;
  return Math.max(1, Math.round((appearanceBonus + outputBonus + ratingBonus + consistencyBonus) * state.tier.prestigeMultiplier));
}

function isAvailableForSquad(fitness, seed) {
  if (fitness < 12) return false;
  if (fitness < 20) return seededNoise(`${seed}-fitness-selection`) > 0.78;
  if (fitness < 40) return seededNoise(`${seed}-fitness-selection`) > 0.25;
  return true;
}

function getPlayerMomentCount(role, involvementScore, minutes, matchSeed) {
  if (role === "Bench" || minutes <= 0) {
    return 0;
  }

  const roleRatesPer90 = { Bench: 0, "Impact Sub": 3.1, "Rotation Starter": 3.65, Starter: 4.0 };
  const involvementModifier = clamp((involvementScore - 50) / 46, -0.45, 0.45);
  const expectedMoments = Math.max(0, (minutes / 90) * roleRatesPer90[role] * (1 + involvementModifier));
  const baseMoments = Math.floor(expectedMoments);
  const extraMoment = seededNoise(`${matchSeed}-${role}-${minutes}-moment-volume`) < expectedMoments - baseMoments ? 1 : 0;
  const lateSubCeiling = minutes < 18 ? 1 : minutes < 32 ? 2 : 3;
  const roleCeiling = role === "Starter" ? 4 : role === "Rotation Starter" ? 3 : lateSubCeiling;

  return clamp(baseMoments + extraMoment, 0, roleCeiling);
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
    scheduledMatches: stat(items.map((item) => item.scheduledMatches)),
    apps: stat(items.map((item) => item.apps)),
    starts: stat(items.map((item) => item.starts)),
    minutes: stat(items.map((item) => item.minutes)),
    goals: stat(items.map((item) => item.goals)),
    assists: stat(items.map((item) => item.assists)),
    chancesCreated: stat(items.map((item) => item.chancesCreated)),
    goalsPer90: stat(items.map((item) => item.goalsPer90)),
    assistsPer90: stat(items.map((item) => item.assistsPer90)),
    chancesCreatedPer90: stat(items.map((item) => item.chancesCreatedPer90)),
    assistConversion: stat(items.map((item) => item.assistConversion)),
    highlightsPer90: stat(items.map((item) => item.highlightsPer90)),
    avgRating: stat(items.map((item) => item.avgRating)),
    ovrGain: stat(items.map((item) => item.ovrGain)),
    endOvr: stat(items.map((item) => item.endOvr)),
    potentialOvr: stat(items.map((item) => item.potentialOvr)),
    levelUps: stat(items.map((item) => item.levelUps)),
    trainingXp: stat(items.map((item) => item.trainingXp)),
    matchXp: stat(items.map((item) => item.matchXp)),
    trainingLevelUps: stat(items.map((item) => item.trainingLevelUps)),
    matchLevelUps: stat(items.map((item) => item.matchLevelUps)),
    trainingXpShare: stat(items.map((item) => item.trainingXpShare)),
    matchXpShare: stat(items.map((item) => item.matchXpShare)),
    endTrust: stat(items.map((item) => item.endTrust)),
    endFitness: stat(items.map((item) => item.endFitness)),
    cashEarned: stat(items.map((item) => item.cashEarned)),
    cashSpent: stat(items.map((item) => item.cashSpent)),
    prestigeGained: stat(items.map((item) => item.prestigeGained)),
    sponsorEarned: stat(items.map((item) => item.sponsorEarned)),
    sponsorDeals: stat(items.map((item) => item.sponsorDeals)),
    firstSponsorUnlockWeek: statOptional(items.map((item) => item.firstSponsorUnlockWeek)),
    firstSponsorDealWeek: statOptional(items.map((item) => item.firstSponsorDealWeek)),
    endPrestige: stat(items.map((item) => item.endPrestige)),
    legacyPoints: stat(items.map((item) => item.legacyPoints)),
    prestigeTier: getMostCommon(items.map((item) => item.prestigeTier)),
    contractOffers: stat(items.map((item) => item.contractOffers)),
    transferWindows: stat(items.map((item) => item.transferWindows)),
    transferOffers: stat(items.map((item) => item.transferOffers)),
    transfers: stat(items.map((item) => item.transfers)),
    tierMoves: stat(items.map((item) => item.tierMoves)),
    promotions: stat(items.map((item) => item.promotions)),
    relegations: stat(items.map((item) => item.relegations)),
    highestTierIndex: stat(items.map((item) => item.highestTierIndex)),
    endCash: stat(items.map((item) => item.endCash)),
    supportPurchases: stat(items.map((item) => item.supportPurchases)),
    supportLevels: stat(items.map((item) => item.supportLevels)),
    supportTrackLevels: Object.fromEntries(
      supportTrackDefinitions.map((track) => [track.id, stat(items.map((item) => item.supportTrackLevels[track.id] ?? 0))]),
    ),
    supportTrackBreakthroughs: Object.fromEntries(
      supportTrackDefinitions.map((track) => [track.id, stat(items.map((item) => item.supportTrackBreakthroughs[track.id] ?? 0))]),
    ),
    seasonCurve: summarizeSeasonCurve(items),
    roleCounts: mergeRoleCounts(items.map((item) => item.roleCounts)),
    qualityCounts: mergeRoleCounts(items.map((item) => item.qualityCounts)),
  };
}

function summarizeSeasonCurve(items) {
  const maxSeasons = Math.max(...items.map((item) => item.seasonReports.length));
  const curve = [];
  for (let index = 0; index < maxSeasons; index += 1) {
    const seasonItems = items.map((item) => item.seasonReports[index]).filter(Boolean);
    curve.push({
      season: index + 1,
      tier: getMostCommon(seasonItems.map((item) => item.tier)),
      scheduledMatches: stat(seasonItems.map((item) => item.scheduledMatches)),
      startOvr: stat(seasonItems.map((item) => item.startOvr)),
      endOvr: stat(seasonItems.map((item) => item.endOvr)),
      effectiveOvr: stat(seasonItems.map((item) => item.effectiveOvr)),
      growthProfileOvr: stat(seasonItems.map((item) => item.growthProfileOvr)),
      ovrGain: stat(seasonItems.map((item) => item.ovrGain)),
      apps: stat(seasonItems.map((item) => item.apps)),
      starts: stat(seasonItems.map((item) => item.starts)),
      minutes: stat(seasonItems.map((item) => item.minutes)),
      goals: stat(seasonItems.map((item) => item.goals)),
      assists: stat(seasonItems.map((item) => item.assists)),
      chancesCreated: stat(seasonItems.map((item) => item.chancesCreated)),
      goalsPer90: stat(seasonItems.map((item) => item.goalsPer90)),
      assistsPer90: stat(seasonItems.map((item) => item.assistsPer90)),
      chancesCreatedPer90: stat(seasonItems.map((item) => item.chancesCreatedPer90)),
      assistConversion: stat(seasonItems.map((item) => item.assistConversion)),
      avgRating: stat(seasonItems.map((item) => item.avgRating)),
      levelUps: stat(seasonItems.map((item) => item.levelUps)),
      trainingXp: stat(seasonItems.map((item) => item.trainingXp)),
      matchXp: stat(seasonItems.map((item) => item.matchXp)),
      trainingLevelUps: stat(seasonItems.map((item) => item.trainingLevelUps)),
      matchLevelUps: stat(seasonItems.map((item) => item.matchLevelUps)),
      trainingXpShare: stat(seasonItems.map((item) => item.trainingXpShare)),
      matchXpShare: stat(seasonItems.map((item) => item.matchXpShare)),
      endFitness: stat(seasonItems.map((item) => item.endFitness)),
      endTrust: stat(seasonItems.map((item) => item.endTrust)),
      cashEarned: stat(seasonItems.map((item) => item.cashEarned)),
      cashSpent: stat(seasonItems.map((item) => item.cashSpent)),
      netCash: stat(seasonItems.map((item) => item.netCash)),
      clubPpg: stat(seasonItems.map((item) => item.clubPpg)),
      prestigeGained: stat(seasonItems.map((item) => item.prestigeGained)),
      sponsorEarned: stat(seasonItems.map((item) => item.sponsorEarned)),
      sponsorDeals: stat(seasonItems.map((item) => item.sponsorDeals)),
      firstSponsorUnlockWeek: statOptional(seasonItems.map((item) => item.firstSponsorUnlockWeek)),
      firstSponsorDealWeek: statOptional(seasonItems.map((item) => item.firstSponsorDealWeek)),
      endPrestige: stat(seasonItems.map((item) => item.endPrestige)),
      prestigeTier: getMostCommon(seasonItems.map((item) => item.prestigeTier)),
      contractOffers: stat(seasonItems.map((item) => item.contractOffers)),
      transferWindows: stat(seasonItems.map((item) => item.transferWindows)),
      transferOffers: stat(seasonItems.map((item) => item.transferOffers)),
      transfers: stat(seasonItems.map((item) => item.transfers)),
      tierMoves: stat(seasonItems.map((item) => item.tierMoves)),
      supportPurchases: stat(seasonItems.map((item) => item.supportPurchases)),
      supportLevels: stat(seasonItems.map((item) => item.supportLevels)),
      supportTrackLevels: Object.fromEntries(
        supportTrackDefinitions.map((track) => [track.id, stat(seasonItems.map((item) => item.supportTrackLevels[track.id] ?? 0))]),
      ),
      qualityCounts: mergeRoleCounts(seasonItems.map((item) => item.qualityCounts)),
    });
  }
  return curve;
}

function printSeasonReport(report, scenario, generation) {
  const horizon = report.careerSeasons === 1 ? "1 season" : `${report.careerSeasons} seasons`;
  const generationProfile = getGenerationProfile(generation);
  console.log(
    `\n=== Season balance lab: Gen ${generation} ${generationProfile.label} - ${scenario.label} (${report.seasons} runs, ${horizon}) ===`,
  );
  printStat("Apps", report.apps);
  printStat("Scheduled matches", report.scheduledMatches);
  printStat("Starts", report.starts);
  printStat("Minutes", report.minutes);
  printStat("Goals", report.goals);
  printStat("Assists", report.assists);
  printStat("Chances created", report.chancesCreated);
  printStat("Goals / 90", report.goalsPer90);
  printStat("Assists / 90", report.assistsPer90);
  printStat("Chances / 90", report.chancesCreatedPer90);
  printStat("Assist conversion", report.assistConversion);
  printStat("Highlights / 90", report.highlightsPer90);
  printStat("Avg rating", report.avgRating);
  printStat("OVR gain", report.ovrGain);
  printStat("End OVR", report.endOvr);
  printStat("Growth profile OVR", report.potentialOvr);
  printStat("Level-ups", report.levelUps);
  printStat("Training XP", report.trainingXp);
  printStat("Match XP", report.matchXp);
  printStat("Training level-ups", report.trainingLevelUps);
  printStat("Match level-ups", report.matchLevelUps);
  printStat("Training XP share", report.trainingXpShare);
  printStat("Match XP share", report.matchXpShare);
  printStat("End trust", report.endTrust);
  printStat("End fitness", report.endFitness);
  printStat("Cash earned", report.cashEarned);
  printStat("Cash spent", report.cashSpent);
  printStat("Prestige gained", report.prestigeGained);
  printStat("Sponsor earned", report.sponsorEarned);
  printStat("Sponsor deals", report.sponsorDeals);
  printOptionalStat("First sponsor unlock week", report.firstSponsorUnlockWeek);
  printOptionalStat("First sponsor deal week", report.firstSponsorDealWeek);
  printStat("End prestige", report.endPrestige);
  printStat("Legacy Points @ retire", report.legacyPoints);
  console.log(`Prestige tier: ${report.prestigeTier}`);
  printStat("Contract offers", report.contractOffers);
  printStat("Transfer windows", report.transferWindows);
  printStat("Transfer offers", report.transferOffers);
  printStat("Accepted transfers", report.transfers);
  printStat("Net tier moves", report.tierMoves);
  printStat("Promotions", report.promotions);
  printStat("Relegations", report.relegations);
  console.log(
    `Highest tier reached: p50 ${leagueTiers[Math.round(report.highestTierIndex.p50)]?.label ?? "?"} | ` +
      `avg idx ${report.highestTierIndex.avg.toFixed(1)} | ` +
      `p90 ${leagueTiers[Math.round(report.highestTierIndex.p90)]?.label ?? "?"}`,
  );
  printStat("End cash", report.endCash);
  printStat("Support purchases", report.supportPurchases);
  printStat("Support levels", report.supportLevels);
  console.log(`Track levels: ${formatTrackStats(report.supportTrackLevels)}`);
  console.log(`Track breakthroughs: ${formatTrackStats(report.supportTrackBreakthroughs)}`);
  console.log(`Training quality: ${formatEntries([...report.qualityCounts.entries()].sort((a, b) => b[1] - a[1]))}`);
  console.log(`Roles: ${formatEntries([...report.roleCounts.entries()].sort((a, b) => b[1] - a[1]))}`);
  if (report.careerSeasons > 1) {
    printCareerCurve(report);
    console.log(`Gen1 dynasty read: ${getDynastyFlowRead(report)}`);
  }
  const warnings = getBalanceWarnings(report);
  console.log(`Warnings: ${warnings.length ? warnings.join("; ") : "none"}`);
}

function getDynastyFlowRead(report) {
  const finalSeason = report.seasonCurve[report.seasonCurve.length - 1];
  if (!finalSeason) {
    return "not enough data";
  }

  const peakSeason = report.seasonCurve.reduce((best, season) => (season.endOvr.avg > best.endOvr.avg ? season : best), report.seasonCurve[0]);
  const finalGap = finalSeason.effectiveOvr.avg - getTargetOvrForCareerSeason(finalSeason.season);
  const legacySeedScore = Math.round(finalSeason.endPrestige.avg / 100 + peakSeason.endOvr.avg * 1.5 + report.levelUps.avg / 12);
  const foundation =
    peakSeason.endOvr.avg >= 76 && finalSeason.endPrestige.avg >= 7500
      ? "strong first-generation legacy"
      : peakSeason.endOvr.avg >= 65 && finalSeason.endPrestige.avg >= 3500
        ? "healthy dynasty foundation"
        : "modest foundation";

  return `${foundation}; peak S${peakSeason.season} ${format(peakSeason.endOvr.avg)} OVR; final gap ${format(finalGap)}; prestige ${format(finalSeason.endPrestige.avg)}; lab legacy seed ${legacySeedScore}; LP ${format(report.legacyPoints.avg)}`;
}

function calculateLegacyPoints({ peakOvr, apps, goals, assists, averageRating, prestige, highestTierId }) {
  const basePoints =
    Math.max(0, Math.pow(Math.max(0, peakOvr - 20), 1.25)) +
    Math.sqrt(apps) * 2 +
    Math.sqrt(goals) * 3 +
    Math.sqrt(assists) * 2.5 +
    Math.max(0, averageRating - 6.4) * 40 +
    Math.sqrt(prestige) * 1.2;

  return Math.max(0, Math.round(basePoints * getLegacyTierMultiplier(highestTierId)));
}

function getHighestTierId(tierIds) {
  return tierIds.reduce((best, tierId) => (tierOrder.indexOf(tierId) > tierOrder.indexOf(best) ? tierId : best), tierIds[0] ?? "grassroots-dev");
}

function getLegacyTierMultiplier(tierId) {
  const multipliers = {
    "grassroots-dev": 1,
    "local-semi-pro": 1.15,
    "regional-pro": 1.35,
    "national-pro": 1.6,
    "top-flight": 2,
    elite: 2.5,
  };
  return multipliers[tierId] ?? 1;
}

function printCareerCurve(report) {
  console.log("Career curve avg:");
  console.log("S | Tier | Matches | OVR | Pot | EffOVR | Target | +/-(eff) | + | XP T/M | LU T/M | Quality | GP/Starts | G/A/CC | G90/A90/CC90 | Fit | ClubPPG | Spent | Prestige | Support");
  report.seasonCurve.forEach((season) => {
    const target = getTargetOvrForCareerSeason(season.season);
    console.log(
      [
        season.season,
        season.tier,
        format(season.scheduledMatches.avg),
        `${format(season.startOvr.avg)}->${format(season.endOvr.avg)}`,
        `pot ${format(season.growthProfileOvr.avg)}`,
        `eff ${format(season.effectiveOvr.avg)}`,
        format(target),
        format(season.effectiveOvr.avg - target),
        format(season.ovrGain.avg),
        `${format(season.trainingXp.avg)}/${format(season.matchXp.avg)}`,
        `${format(season.trainingLevelUps.avg)}/${format(season.matchLevelUps.avg)}`,
        getMostCommon([...season.qualityCounts.entries()].flatMap(([quality, count]) => Array.from({ length: count }, () => quality))),
        `${format(season.apps.avg)}/${format(season.starts.avg)}`,
        `${format(season.goals.avg)}/${format(season.assists.avg)}/${format(season.chancesCreated.avg)}`,
        `${format(season.goalsPer90.avg)}/${format(season.assistsPer90.avg)}/${format(season.chancesCreatedPer90.avg)}`,
        format(season.endFitness.avg),
        season.clubPpg.avg.toFixed(2),
        `spent ${formatMoney(season.cashSpent.avg)}`,
        `${format(season.endPrestige.avg)} ${season.prestigeTier}`,
        format(season.supportLevels.avg),
      ].join(" | "),
    );
  });
  console.log(`Curve targets: ${getCareerCurveTargets(report).join("; ")}`);
}

function getCareerCurveTargets(report) {
  const finalSeason = report.seasonCurve[report.seasonCurve.length - 1];
  const firstSeason = report.seasonCurve[0];
  const notes = [];
  if (!finalSeason || !firstSeason) {
    return ["not enough data"];
  }

  const finalTarget = getTargetOvrForCareerSeason(finalSeason.season);
  const finalGap = finalSeason.endOvr.avg - finalTarget;
  if (finalGap < -5) {
    notes.push(`final OVR ${format(Math.abs(finalGap))} below target`);
  } else if (finalGap > 5) {
    notes.push(`final OVR ${format(finalGap)} above target`);
  } else {
    notes.push("final OVR near target");
  }

  if (firstSeason.goalsPer90.avg > 1.1 || firstSeason.assistsPer90.avg > 1.2) {
    notes.push("early output too high per 90");
  }

  if (finalSeason.endFitness.avg < 30) {
    notes.push("late-career fitness too low");
  }

  if (finalSeason.supportLevels.avg < report.careerSeasons * 1.2) {
    notes.push("support growth slow");
  }

  return notes.length ? notes : ["no curve target flags"];
}

function getTargetOvrForCareerSeason(season) {
  const targetCurve = [
    { season: 1, ovr: 14 },
    { season: 3, ovr: 22 },
    { season: 5, ovr: 32 },
    { season: 8, ovr: 45 },
    { season: 11, ovr: 58 },
    { season: 13, ovr: 64 },
    { season: 14, ovr: 63 },
    { season: 16, ovr: 60 },
    { season: 19, ovr: 53 },
    { season: 22, ovr: 45 },
  ];
  const first = targetCurve[0];
  if (season <= first.season) {
    return first.ovr;
  }

  for (let index = 1; index < targetCurve.length; index += 1) {
    const previous = targetCurve[index - 1];
    const next = targetCurve[index];
    if (season <= next.season) {
      const progress = (season - previous.season) / (next.season - previous.season);
      return previous.ovr + (next.ovr - previous.ovr) * progress;
    }
  }

  return targetCurve[targetCurve.length - 1].ovr;
}

function getBalanceWarnings(report) {
  const warnings = [];
  const ovrGainPerSeason = report.ovrGain.avg / report.careerSeasons;
  const aboveGrowthProfile = report.endOvr.avg > report.potentialOvr.avg + 12;
  if (ovrGainPerSeason < 3) {
    warnings.push(`OVR gain low (${format(ovrGainPerSeason)}/season)`);
  }
  if (ovrGainPerSeason > 7) {
    warnings.push(`OVR gain high (${format(ovrGainPerSeason)}/season)`);
  }
  if (report.endTrust.avg > 95 && report.transfers.avg < 0.5) {
    warnings.push("trust caps without many transfers");
  }
  if (report.endFitness.avg < 30) {
    warnings.push("end fitness too low");
  }
  if (aboveGrowthProfile) {
    warnings.push("growth profile heavily exceeded; soft-cap pressure should be visible");
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
  if (report.assistConversion.avg > 0.45) {
    warnings.push(`assist conversion high (${Math.round(report.assistConversion.avg * 100)}%)`);
  }
  if (report.careerSeasons > 1) {
    const finalSeason = report.seasonCurve[report.seasonCurve.length - 1];
    const targetGap = finalSeason.effectiveOvr.avg - getTargetOvrForCareerSeason(finalSeason.season);
    if (targetGap < -5) {
      warnings.push(`career curve behind target (${format(targetGap)} OVR)`);
    } else if (targetGap > 5) {
      warnings.push(`career curve ahead of target (+${format(targetGap)} OVR)`);
    }
  }
  return warnings;
}

function printStat(label, value) {
  console.log(`${label}: avg ${format(value.avg)} | p10 ${format(value.p10)} | p50 ${format(value.p50)} | p90 ${format(value.p90)}`);
}

function printOptionalStat(label, value) {
  if (!value || value.count === 0) {
    console.log(`${label}: none`);
    return;
  }

  console.log(`${label}: avg ${format(value.avg)} | p10 ${format(value.p10)} | p50 ${format(value.p50)} | p90 ${format(value.p90)} | count ${value.count}`);
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

function statOptional(values) {
  const defined = values.filter((value) => Number.isFinite(value));
  return {
    ...stat(defined),
    count: defined.length,
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
    if (upgradeId === "potential") {
      // Mirror bumpKeyAttributePotential: +1 potential to each key attribute (capped 95).
      for (const key of Object.keys(ovrWeights)) {
        if (state.attributes[key]) {
          state.attributes[key].potential = clamp(state.attributes[key].potential + 1, state.attributes[key].potential, 95);
        }
      }
    }
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
    if (!isSupportUpgradeUnlocked(state, upgrade)) {
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

function isSupportUpgradeUnlocked(state, upgrade) {
  if (upgrade.requiresPrestige && state.prestige < upgrade.requiresPrestige) {
    return false;
  }
  const requirements = upgrade.requires ?? {};
  return Object.entries(requirements).every(([requiredId, requiredLevel]) => getSupportLevel(state, requiredId) >= requiredLevel);
}

function getSupportUpgradeCost(upgrade, currentLevel) {
  const earlyRamp = 1 + currentLevel * 0.34 + Math.pow(currentLevel, 2) * 0.055;
  const lateRamp = currentLevel >= 30 ? Math.pow(currentLevel - 29, 2) * 0.025 : 0;
  const eliteRamp = currentLevel >= 70 ? Math.pow(currentLevel - 69, 2) * 0.06 : 0;
  return Math.round(upgrade.baseCost * (earlyRamp + lateRamp + eliteRamp));
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

function createLabTransferWindow(state, match, fixture, played, total, seed) {
  const kind = getPendingLabTransferWindowKind(played, total);
  if (!kind) return undefined;

  const currentClubOffer =
    getClubContractOffer(state, match, fixture) ??
    (kind === "end-season" ? getClubContractOffer({ ...state, contract: { ...state.contract, weeksRemaining: 1 } }, match, fixture) : undefined);
  const externalOffers = getLabTransferMarketOffers(state, match, fixture, seed, kind);

  return {
    kind,
    currentClubOffer,
    externalOffers,
    offerCount: externalOffers.length + (currentClubOffer ? 1 : 0),
  };
}

function getPendingLabTransferWindowKind(played, total) {
  if (total <= 0) return undefined;
  if (played >= total) return "end-season";
  return played === Math.floor(total / 2) ? "mid-season" : undefined;
}

function getLabTransferMarketOffers(state, match, fixture, seed, kind) {
  const ovr = calculateOvr(agedFlat(state));
  const currentTierIndex = getTierIndex(state.tier);
  const selection = getSelectionReport(state, fixture);
  const averageRating = average(state.ratings, 6.4);
  const formSignal =
    Math.max(0, averageRating - 6.4) * 10 +
    state.seasonGoals * 1.55 +
    state.seasonAssists * 1.05 +
    (match?.rating ?? 6.5) -
    6.5;
  const fitGap = ovr - state.tier.averageOvr;
  const maxReach =
    currentTierIndex +
    (fitGap >= 9 || formSignal >= 20 ? 1 : 0) +
    (fitGap >= 16 && formSignal >= 32 && kind === "end-season" ? 1 : 0);
  const minReach = Math.max(0, currentTierIndex - (fitGap < -8 ? 1 : 0));

  return leagueTiers
    .map((tier) => ({ tier, tierIndex: getTierIndex(tier) }))
    .filter((entry) => entry.tierIndex >= minReach && entry.tierIndex <= Math.min(maxReach, leagueTiers.length - 1))
    .filter((entry) => entry.tier.id !== state.tier.id || kind === "end-season")
    .flatMap((entry) => [0, 1].map((slot) => buildLabTransferCandidate(state, entry.tier, slot, seed, formSignal, selection.score)))
    .filter((offer) => offer.interest >= (kind === "mid-season" ? 58 : 46))
    .sort((a, b) => b.interest - a.interest)
    .slice(0, kind === "end-season" ? 3 : 2);
}

function buildLabTransferCandidate(state, tier, slot, seed, formSignal, selectionScore) {
  const currentTierIndex = getTierIndex(state.tier);
  const tierIndex = getTierIndex(tier);
  const ovr = calculateOvr(agedFlat(state));
  const tierGap = tierIndex - currentTierIndex;
  const roleBias = tierGap < 0 ? 12 : tierGap === 0 ? 4 : -9 - tierGap * 3;
  const noise = seededNoise(`${seed}-${tier.id}-${slot}-transfer`) * 24 - 8;
  const interest = selectionScore * 0.38 + ovr * 0.42 + state.prestige * 0.006 + formSignal + roleBias + noise;
  const rolePromise = getPromisedRole(selectionScore + roleBias, "Bench");
  const wageRatio = { Bench: 0.2, "Impact Sub": 0.34, "Rotation Starter": 0.58, Starter: 0.82 }[rolePromise] ?? 0.3;
  const agentLevel = getSupportLevel(state, "agentNegotiation");
  const careerBreakthroughs = getSupportTrackBreakthroughCount(state, "career");
  const rawWage = tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * wageRatio + Math.max(0, ovr - tier.averageOvr) * 4 + formSignal * 2.2;
  const weeklyWage = roundToNearest(
    clamp(rawWage * getContractLeverage(agentLevel, careerBreakthroughs), tier.wageRange[0], getTierWageCap(tier, rolePromise)),
    5,
  );

  return {
    label: rolePromise === "Starter" ? "First team deal" : rolePromise === "Rotation Starter" ? "Rotation deal" : "Fresh start deal",
    source: "external-club",
    clubName: getLabClubName(tier, slot, seed),
    tier,
    interest,
    weeklyWage,
    weeks: getLabContractLengthWeeks(state, rolePromise),
    rolePromise,
    appearanceBonus: roundToNearest(8 + weeklyWage * 0.08, 5),
    goalBonus: roundToNearest(14 + weeklyWage * 0.14, 5),
    assistBonus: roundToNearest(10 + weeklyWage * 0.11, 5),
    signingBonus: roundToNearest(weeklyWage * 0.3 * (1 + getAgentSigningBonusLeverage(agentLevel) + careerBreakthroughs * 0.03), 10),
    pressureModifier: rolePromise === "Starter" ? 7 : rolePromise === "Rotation Starter" ? 4 : rolePromise === "Impact Sub" ? 1 : -1,
  };
}

function chooseTransferWindowOffer(state, transferWindow) {
  const offers = [transferWindow.currentClubOffer, ...transferWindow.externalOffers].filter(Boolean);
  if (offers.length === 0) return undefined;

  const best = offers
    .map((offer) => ({ offer, score: getOfferDecisionScore(state, offer, transferWindow.kind) }))
    .sort((a, b) => b.score - a.score)[0];
  const mustChoose = state.contract.weeksRemaining <= 0 || transferWindow.kind === "end-season";
  return mustChoose || best.score >= 18 ? best.offer : undefined;
}

function getOfferDecisionScore(state, offer, kind) {
  const currentTierIndex = getTierIndex(state.tier);
  const offerTier = offer.tier ?? state.tier;
  const tierMove = getTierIndex(offerTier) - currentTierIndex;
  const wageDelta = offer.weeklyWage - state.contract.weeklyWage;
  const roleDelta = getRoleThreshold(offer.rolePromise) - getRoleThreshold(state.contract.rolePromise);
  const ovr = calculateOvr(agedFlat(state));
  const underLevelPenalty = Math.max(0, offerTier.averageOvr - ovr - 8) * 2.4;
  const sameClubBias = offer.source === "current-club" ? 5 : 0;
  const windowBias = kind === "end-season" ? 8 : 0;
  return wageDelta * 0.12 + roleDelta * 0.34 + tierMove * 24 - underLevelPenalty + sameClubBias + windowBias;
}

function acceptLabContractOffer(state, offer) {
  const previousTierIndex = getTierIndex(state.tier);
  const nextTier = offer.tier ?? state.tier;
  const nextTierIndex = getTierIndex(nextTier);
  const transferred = offer.source === "external-club";
  state.contract = contractFromOffer(offer);
  if (transferred) {
    state.tier = nextTier;
    state.transferredThisSeason = true;
    // Joining an established club at the new level (not a weakest-club promotion).
    state.clubStrength = nextTier.averageOvr;
    state.clubName = offer.clubName;
    state.trust = clamp(Math.round(state.trust * 0.58 + getRoleThreshold(offer.rolePromise) * 0.2), 18, 76);
    state.morale = clamp(state.morale + 4, 0, 100);
    state.ratings = state.ratings.slice(-2);
  }
  return { transferred, tierMove: nextTierIndex - previousTierIndex };
}

function getClubContractOffer(state, match, fixture) {
  const current = state.contract;
  const selection = getSelectionReport(state, fixture);
  const averageRating = average(state.ratings, 6.4);
  const ovr = calculateOvr(agedFlat(state));
  const agentLevel = getSupportLevel(state, "agentNegotiation");
  const careerBreakthroughs = getSupportTrackBreakthroughCount(state, "career");
  const rolePromise = getPromisedRole(selection.score, current.rolePromise);
  const expiringSoon = current.weeksRemaining <= 1;
  const performanceSpike = Boolean(
    match &&
      match.rating >= 7.4 &&
      (match.playerGoals > 0 || match.playerAssists > 0 || selection.score >= getRoleThreshold(current.rolePromise) + 6),
  );
  const roleBase = { Bench: 45, "Impact Sub": 75, "Rotation Starter": 130, Starter: 220 };
  const formBonus = Math.max(0, averageRating - 6.2) * 26;
  const outputBonus = Math.min(80, state.seasonGoals * 3 + state.seasonAssists * 2);
  const selectionWage = 34 + selection.score * 0.55 + ovr * 0.55 + formBonus + outputBonus;
  const rawWage = Math.max(current.weeklyWage + (expiringSoon ? 20 : 0), roleBase[rolePromise], selectionWage);
  const weeklyWage = roundToNearest(clamp(rawWage * getContractLeverage(agentLevel, careerBreakthroughs), state.tier.wageRange[0], getTierWageCap(state.tier, rolePromise)), 5);
  const meaningfulUpgrade = weeklyWage >= current.weeklyWage + 15 || rolePromise !== current.rolePromise;

  if (!expiringSoon && (!performanceSpike || !meaningfulUpgrade)) {
    return undefined;
  }

  const weeks = getLabContractLengthWeeks(state, rolePromise);
  const pressureModifier = rolePromise === "Starter" ? 8 : rolePromise === "Rotation Starter" ? 5 : rolePromise === "Impact Sub" ? 2 : 0;

  return {
    label: rolePromise === "Starter" ? "First team deal" : rolePromise === "Rotation Starter" ? "Rotation deal" : "Development deal",
    source: "current-club",
    clubName: state.clubName,
    tier: state.tier,
    weeklyWage,
    weeks,
    rolePromise,
    appearanceBonus: roundToNearest(8 + weeklyWage * 0.08, 5),
    goalBonus: roundToNearest(14 + weeklyWage * 0.14, 5),
    assistBonus: roundToNearest(11 + weeklyWage * 0.11, 5),
    signingBonus: roundToNearest(weeklyWage * (expiringSoon ? 0.7 : 0.35) * (1 + getAgentSigningBonusLeverage(agentLevel) + careerBreakthroughs * 0.03), 10),
    pressureModifier,
  };
}

function shouldAcceptContractOffer(current, offer) {
  return current.weeksRemaining <= 0 || offer.weeklyWage >= current.weeklyWage || getRoleThreshold(offer.rolePromise) >= getRoleThreshold(current.rolePromise);
}

function contractFromOffer(offer) {
  return {
    label: offer.label,
    weeklyWage: offer.weeklyWage,
    weeksRemaining: offer.weeks,
    rolePromise: offer.rolePromise,
    appearanceBonus: offer.appearanceBonus,
    goalBonus: offer.goalBonus,
    assistBonus: offer.assistBonus,
    pressureModifier: offer.pressureModifier,
  };
}

function getLabContractLengthWeeks(state, rolePromise) {
  const seasonLength = Math.max(12, state.seasonLength ?? 30);
  if (rolePromise === "Starter") {
    return seasonLength * 2;
  }
  if (rolePromise === "Rotation Starter") {
    return Math.round(seasonLength * 1.5);
  }
  return seasonLength;
}

function getTierIndex(tier) {
  return tierOrder.indexOf(tier.id);
}

// Mirror of systems/aging.ts: effective-ability multiplier from age (peak 28, accelerating
// decline after). Raw attributes/XP untouched — only performance/selection feel the decline.
function getAgeModifier(age, peakAge = 28, declineResist = 0) {
  if (age <= peakAge) {
    return 1;
  }
  const past = age - peakAge;
  const slope = Math.max(0.008, 0.02 - declineResist * 0.002);
  const accel = Math.max(0.0015, 0.0035 - declineResist * 0.0004);
  return clamp(1 - slope * past - accel * past * past, 0.55, 1);
}

// Age-adjusted flattened attributes for the performance/ability path. Identity before the peak.
// Longevity support pushes the peak later and flattens the decline (mirror of getAgingProfile).
function agedFlat(state) {
  const flat = flattenAttributes(state.attributes);
  const peakAge = 28 + getSupportTrackBreakthroughCount(state, "longevity");
  const declineResist = Math.floor(getSupportLevel(state, "longevity") / 12);
  const modifier = getAgeModifier(state.age ?? 16, peakAge, declineResist);
  if (modifier >= 1) {
    return flat;
  }
  const adjusted = {};
  for (const key of Object.keys(flat)) {
    adjusted[key] = clamp(Math.round(flat[key] * modifier), 1, 99);
  }
  return adjusted;
}

// Promotion / relegation at season end, mirroring the game's per-division rules. The club's
// points come from the player's real season results (the club takes the player's match
// outcomes); rival clubs are modelled deterministically across the tier's strength range.
function resolveTierMovement(state, seasonStats, seasonLength, seed) {
  const tierIndex = getTierIndex(state.tier);
  const isTop = tierIndex === leagueTiers.length - 1;
  const isBottom = tierIndex === 0;
  const games = seasonStats.clubWins + seasonStats.clubDraws + seasonStats.clubLosses;
  if (games <= 0) {
    return { direction: "stayed" };
  }
  // Decide on the club's points-per-game form against absolute, realistic football thresholds:
  // genuine promotion form (~1.7+ ppg) goes up, relegation form (~1.0- ppg) goes down, the broad
  // mid-table stays. A small seeded swing stands in for the luck of where rivals land that year.
  const clubPpg = (seasonStats.clubWins * 3 + seasonStats.clubDraws) / games;
  const swing = (seededNoise(`${seed}-table`) - 0.5) * 0.2; // ~ +/- 0.1 ppg
  const formPpg = clubPpg + swing;

  if (!isTop && formPpg >= 1.7) {
    const nextTier = leagueTiers[tierIndex + 1];
    state.tier = nextTier;
    // A promoted small club arrives near the bottom of the new tier; the player keeps lifting it.
    state.clubStrength = nextTier.teamRange[0] + 2;
    return { direction: "promoted" };
  }
  if (!isBottom && formPpg <= 1.0) {
    const nextTier = leagueTiers[tierIndex - 1];
    state.tier = nextTier;
    // A relegated club is strong for the lower tier.
    state.clubStrength = clamp(nextTier.teamRange[1] - 4, nextTier.teamRange[0], nextTier.teamRange[1]);
    return { direction: "relegated" };
  }
  return { direction: "stayed" };
}

function getInitialLabClubName(countryId) {
  const names = {
    denmark: "Northbridge FC",
    england: "Eastford Athletic",
    spain: "Costa Verde",
    italy: "Porta Nuova",
    germany: "Grunwald SC",
    france: "Valmont FC",
    holland: "Noordhaven",
  };
  return names[countryId] ?? names.denmark;
}

function getLabClubName(tier, slot, seed) {
  const prefixes = {
    "grassroots-dev": ["North", "East", "West", "River"],
    "local-semi-pro": ["Union", "Sporting", "County", "Town"],
    "regional-pro": ["Racing", "Athletic", "Marsano", "Harbor"],
    "national-pro": ["Capital", "Royal", "Metro", "Olympic"],
    "top-flight": ["Dynamo", "Inter", "United", "City"],
    elite: ["Real", "AC", "Bayern", "Paris"],
  };
  const suffixes = ["FC", "SC", "United", "Athletic"];
  const pool = prefixes[tier.id] ?? prefixes["grassroots-dev"];
  const prefix = pool[Math.floor(seededNoise(`${seed}-${tier.id}-${slot}-club`) * pool.length) % pool.length];
  const suffix = suffixes[Math.floor(seededNoise(`${seed}-${tier.id}-${slot}-suffix`) * suffixes.length) % suffixes.length];
  return `${prefix} ${suffix}`;
}

function getPromisedRole(selectionScore, currentRole) {
  const earnedRole = getPlayerMatchRole(selectionScore);
  return getRoleThreshold(earnedRole) >= getRoleThreshold(currentRole) ? earnedRole : currentRole;
}

function getRoleThreshold(role) {
  return { Bench: 0, "Impact Sub": 30, "Rotation Starter": 55, Starter: 68 }[role] ?? 0;
}

function roundToNearest(value, step) {
  return Math.round(value / step) * step;
}

function getTierWageCap(tier, role) {
  const roleCapRatio = { Bench: 0.45, "Impact Sub": 0.58, "Rotation Starter": 0.74, Starter: 0.9 };
  return Math.round(tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * roleCapRatio[role]);
}

function getContractLeverage(agentLevel, careerBreakthroughs) {
  return 1 + getAgentWageLeverage(agentLevel) + careerBreakthroughs * 0.018;
}

function createWorldSeasonFixtures(tier, careerSeason, runIndex) {
  const clubCount = tier.id === "elite" ? 20 : 16;
  const opponentCount = clubCount - 1;
  const [low, high] = tier.teamRange;
  const opponents = Array.from({ length: opponentCount }, (_, index) => {
    const strength = Math.round(low + ((high - low) * index) / Math.max(1, opponentCount - 1));
    const seed = `${labCountry}-${tier.id}-${careerSeason}-${runIndex}-${index}`;
    return {
      key: `opp-${index + 1}`,
      name: opponentNames[index % opponentNames.length],
      strength,
      form: getSeededForm(seed),
      service: getSeededService(seed),
    };
  });

  return opponents.flatMap((opponent, index) => {
    const firstVenue = (index + careerSeason + runIndex) % 2 === 0 ? "Home" : "Away";
    const secondVenue = firstVenue === "Home" ? "Away" : "Home";
    return [
      createWorldFixture(opponent, firstVenue, index + 1, careerSeason, "a"),
      createWorldFixture(opponent, secondVenue, index + 1 + opponentCount, careerSeason, "b"),
    ];
  });
}

function createWorldFixture(opponent, venue, matchNumber, careerSeason, leg) {
  return {
    id: `s${careerSeason + 1}-m${matchNumber}-${opponent.key}-${leg}`,
    opponent: opponent.name,
    venue,
    opponentStrength: opponent.strength,
    opponentForm: opponent.form,
    serviceLevel: opponent.service,
    competition: "League",
  };
}

function getSeededForm(seed) {
  const roll = seededNoise(`${seed}-form`);
  if (roll > 0.82) return "Hot";
  if (roll > 0.56) return "Good";
  if (roll < 0.18) return "Poor";
  return "Mixed";
}

function getSeededService(seed) {
  const roll = seededNoise(`${seed}-service`);
  if (roll > 0.68) return "Good";
  if (roll < 0.26) return "Low";
  return "Mixed";
}

function getSeasonStartWeek(careerSeason, countryId) {
  let total = 0;
  for (let season = 0; season < careerSeason; season += 1) {
    const tier = getCareerTier(season, countryId);
    total += tier.id === "elite" ? 38 : 30;
  }
  return total;
}

function getCareerTier(careerSeason) {
  const countryTiers = countryTierModels[labCountry] ?? countryTierModels.denmark;
  const bottomTierId = countryTiers[countryTiers.length - 1];
  const maxClimb = Math.min(Math.floor(careerSeason / 3), countryTiers.length - 1);
  const targetTierId = tierOrder[Math.min(tierOrder.length - 1, tierOrder.indexOf(bottomTierId) + maxClimb)];
  return leagueTiers.find((tier) => tier.id === targetTierId) ?? leagueTiers[0];
}

function getDevelopmentEnvironment(tier) {
  const level = tier.facilityLevel;
  return {
    facilityLevel: level,
    xpMultiplier: 1 + (level - 1) * 0.2,
    xpFloorBonus: (level - 1) * 6,
    recoveryBonus: level >= 4 ? 2 : level >= 2 ? 1 : 0,
    supportEfficiency: 1 + (level - 1) * 0.1,
  };
}

function getTrainingXpFloorBonus(level) {
  return Math.floor(level);
}

function getTrainingXpCeilingBonus(level) {
  return Math.floor(level);
}

function getFocusSlot2Efficiency(state) {
  if (getSupportLevel(state, "focusSlot2Unlock") < supportUpgradeMap.focusSlot2Unlock.maxLevel) {
    return 0;
  }
  return clamp(0.25 + getSupportLevel(state, "focusSlot2Efficiency") / 100, 0.25, 0.9);
}

function getFocusSlot3Efficiency(state) {
  if (getSupportLevel(state, "focusSlot3Unlock") < supportUpgradeMap.focusSlot3Unlock.maxLevel) {
    return 0;
  }
  return clamp(0.15 + getSupportLevel(state, "focusSlot3Efficiency") / 100, 0.15, 0.75);
}

function getTrainingFatigueRelief(level) {
  return Math.min(16, Math.floor(level / 3));
}

function getRecoverySessionBonus(baselineLevel) {
  return Math.min(14, Math.round(baselineLevel * 0.45));
}

function getWeeklySupportRecoveryBonus(baselineLevel) {
  return Math.min(8, Math.floor(baselineLevel / 5));
}

function getMatchActionRecoveryRelief(level) {
  return Math.min(12, Math.floor(level / 4));
}

function getRecoveryFitnessFloor(baselineLevel, breakthroughs = 0) {
  return Math.min(68, 34 + Math.round(baselineLevel * 0.75 + breakthroughs * 4));
}

function getRecoveryFitnessCeiling(baselineLevel, breakthroughs = 0) {
  return Math.min(88, 70 + Math.round(baselineLevel * 0.28 + breakthroughs * 2));
}

function applyRecoveryFloor(currentFitness, projectedFitness, floor) {
  if (projectedFitness >= floor) {
    return projectedFitness;
  }

  const pull = Math.min(7, Math.ceil((floor - projectedFitness) * 0.35));
  return clamp(Math.min(Math.max(currentFitness, projectedFitness), projectedFitness + pull), 0, 100);
}

function applyRecoveryCeiling(currentFitness, projectedFitness, ceiling) {
  if (projectedFitness <= currentFitness) {
    return projectedFitness;
  }

  if (currentFitness >= ceiling) {
    return currentFitness;
  }

  if (projectedFitness <= ceiling) {
    return projectedFitness;
  }

  const overflow = projectedFitness - ceiling;
  return clamp(ceiling + Math.round(overflow * 0.25), 0, 100);
}

function getAgentWageLeverage(level) {
  return level / 100;
}

function getAgentSigningBonusLeverage(level) {
  return (level * 2) / 100;
}

function getSponsorAppealBonus(level) {
  return (level * 2) / 100;
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

function sumXp(xpGain) {
  return Object.values(xpGain).reduce((total, value) => total + (value ?? 0), 0);
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

function getMostCommon(values) {
  const counts = new Map();
  values.forEach((value) => increment(counts, value));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";
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

function formatMoney(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}$${Math.round(value)}`;
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
