import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const root = process.cwd();
const srcDir = path.join(root, "src");
const outDir = path.join(root, ".tmp-play-session-smoke");
const outSrc = path.join(outDir, "src");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outSrc, { recursive: true });
fs.writeFileSync(path.join(outDir, "package.json"), JSON.stringify({ type: "commonjs" }));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(srcDir)) {
  if (file.endsWith(".d.ts") || file.endsWith(".css") || !/\.(ts|tsx|js)$/.test(file)) {
    continue;
  }

  const relative = path.relative(srcDir, file);
  const outFile = path.join(outSrc, relative).replace(/\.(ts|tsx|js)$/, ".js");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const source = fs.readFileSync(file, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    fileName: file,
  }).outputText;
  fs.writeFileSync(outFile, transpiled);
}

const require = createRequire(import.meta.url);
const { createCareerForCountry } = require(path.join(outSrc, "state", "initialState.js"));
const {
  createMatch,
  getChoiceOutcomePreview,
  getFollowUpTemplate,
  getLiveCommentary,
  getLiveMatchStats,
  getLivePlayerStats,
  getManagerMatchBrief,
  getMatchdayRecoveryBonus,
  getResultConsequence,
} = require(path.join(outSrc, "systems", "match.js"));
const { getUpcomingMatch } = require(path.join(outSrc, "systems", "selection.js"));
const { createTransferWindowState, declineTransferWindowOffer } = require(path.join(outSrc, "systems", "transferWindow.js"));
const { createPositionMatchPool } = require(path.join(outSrc, "engine", "forwardMoments.js"));
const { getClubProfile } = require(path.join(outSrc, "systems", "clubProfile.js"));

const base = createCareerForCountry("denmark");
const upcoming = getUpcomingMatch(base);
if (!upcoming) {
  throw new Error("Expected an upcoming fixture.");
}
const opponentClub = Object.values(base.world.clubs).find((club) => club.name === upcoming.opponent);
const opponentClubProfile = opponentClub ? getClubProfile(base, opponentClub.id) : undefined;
if (
  !opponentClubProfile ||
  !opponentClubProfile.style ||
  !opponentClubProfile.careerFit?.projectedRole ||
  Object.values(opponentClubProfile.unitOvr).some((value) => !Number.isFinite(value))
) {
  throw new Error("Club profile is not derived correctly from the world model.");
}

const riskyState = { ...base, fitness: 21 };
const riskyStarter = createMatch(riskyState, {
  ...upcoming,
  playerRole: "Starter",
  isInSquad: true,
  fitnessAvailability: "Risky",
});
if (!riskyStarter.exitMinute || riskyStarter.exitMinute > 72) {
  throw new Error(`Risky starter exit was too late: ${riskyStarter.exitMinute ?? "none"}`);
}

const unusedBench = {
  ...riskyStarter,
  playerRole: "Bench",
  isInSquad: true,
  fitnessAvailability: "Risky",
  entryMinute: 91,
  exitMinute: undefined,
};
const omitted = {
  ...unusedBench,
  isInSquad: false,
  fitnessAvailability: "Not match fit",
};
if (getMatchdayRecoveryBonus(unusedBench) !== 10) {
  throw new Error("Unused substitute should recover 10 fitness before normal weekly recovery.");
}
if (getMatchdayRecoveryBonus(omitted) !== 14) {
  throw new Error("Omitted player should recover 14 fitness before normal weekly recovery.");
}

const midpoint = Math.floor(base.season.fixtures.length / 2);
const transferGame = {
  ...base,
  week: base.week + midpoint,
  trust: 82,
  prestige: 1250,
  seasonStats: {
    apps: 15,
    starts: 10,
    goals: 18,
    assists: 7,
    ratings: [7.1, 7.3, 7.0, 7.4],
  },
  season: {
    ...base.season,
    fixtureIndex: midpoint,
    results: base.season.fixtures.slice(0, midpoint).map((fixture, index) => ({
      fixtureId: fixture.id,
      opponent: fixture.opponent,
      venue: fixture.venue,
      competition: fixture.competition,
      teamGoals: index % 2 === 0 ? 2 : 1,
      opponentGoals: index % 3 === 0 ? 0 : 1,
      outcome: index % 3 === 0 ? "W" : "D",
      rating: 7,
    })),
  },
};
const transferWindow = createTransferWindowState(transferGame);
if (!transferWindow || transferWindow.offers.length < 2) {
  throw new Error("Expected at least two transfer offers for independent-decline smoke test.");
}
const declinedWindow = declineTransferWindowOffer(transferWindow, transferWindow.offers[0]);
if (declinedWindow.offers.length !== transferWindow.offers.length - 1) {
  throw new Error("Declining one transfer offer removed the wrong number of offers.");
}
if (!declinedWindow.offers.some((offer) => offer.club === transferWindow.offers[1].club)) {
  throw new Error("Declining one transfer offer removed another club's offer.");
}

const expandedPool = createPositionMatchPool({
  opponentShort: "Test",
  managerInstruction: "Test instruction.",
  tacticalFocus: "Test focus.",
  fitness: 82,
  momentPools: ["forward", "shared"],
});
const metadataMoments = expandedPool.filter((moment) => moment.director);
const chainRoutes = new Set(expandedPool.flatMap((moment) => moment.chainRoutes ?? []));
if (expandedPool.length < 50 || metadataMoments.length < 31) {
  throw new Error(`Moment library too small: ${expandedPool.length} total / ${metadataMoments.length} metadata moments.`);
}
if (chainRoutes.size < 9) {
  throw new Error(`Chain route coverage too small: ${chainRoutes.size}`);
}
for (const route of chainRoutes) {
  const template = getFollowUpTemplate(
    { category: "link_up", chainRoutes: [route] },
    { choiceOutcome: "trust", choiceId: "smoke-choice" },
  );
  if (!template) {
    throw new Error(`Missing follow-up template for route: ${route}`);
  }
}
const directedMoments = riskyStarter.events.filter((event) => event.type === "player_moment");
if (directedMoments.some((moment) => !moment.directorPhase || !moment.narrativeTags?.length)) {
  throw new Error("Player moments are missing Match Director phase metadata.");
}
const previewMoment = directedMoments[0];
const previewChoice = previewMoment?.choices[0];
const choiceOutcomePreview = previewMoment && previewChoice
  ? getChoiceOutcomePreview({ ...riskyState, activeMatch: riskyStarter }, previewMoment, previewChoice)
  : undefined;
if (
  !choiceOutcomePreview ||
  choiceOutcomePreview.outcomes.length !== 3 ||
  choiceOutcomePreview.outcomes.reduce((sum, outcome) => sum + outcome.percentage, 0) !== 100 ||
  choiceOutcomePreview.outcomes.some((outcome) => outcome.percentage % 5 !== 0)
) {
  throw new Error("Choice outcome preview must expose three 5%-rounded outcomes totaling 100%.");
}
const lastSimIndex = riskyStarter.events.reduce(
  (latest, event, index) => event.type === "player_moment" ? latest : index,
  -1,
);
const presentationMatch = { ...riskyStarter, liveMinute: 80 };
const matchStats = getLiveMatchStats(presentationMatch, lastSimIndex);
const commentary = getLiveCommentary(presentationMatch, [], lastSimIndex);
if (!matchStats.homeName || !matchStats.awayName || !["home", "away"].includes(matchStats.playerSide) || matchStats.rows.length !== 4) {
  throw new Error("Live match stats presentation is incomplete.");
}
if (matchStats.rows.some((row) => row.homeShare < 0 || row.homeShare > 100)) {
  throw new Error("Live match stat shares must be within 0-100.");
}
if (!commentary.title || !commentary.detail) {
  throw new Error("Live commentary presentation is incomplete.");
}
const managerBrief = getManagerMatchBrief({
  explanationTags: ["fatigue_limited_action"],
  playerRole: "Starter",
  goals: 1,
  assists: 0,
  chancesCreated: 1,
  rating: 7.6,
  roleBefore: "Rotation Starter",
  roleAfter: "Starter",
  selectionBefore: 60,
  selectionAfter: 70,
  pointsToNextRole: 0,
});
if (!["happy", "mixed", "unhappy"].includes(managerBrief.tone) || managerBrief.praise.length + managerBrief.concerns.length === 0) {
  throw new Error("Manager brief must return a tone and at least one point.");
}
const liveStats = getLivePlayerStats([
  {
    choiceOutcome: "goal",
    goals: 0,
    assists: 0,
    chancesCreated: 0,
    success: true,
    title: "Saved",
  },
  {
    choiceOutcome: "assist",
    goals: 0,
    assists: 0,
    chancesCreated: 1,
    success: true,
    title: "Chance created",
  },
], 6.9);
if (liveStats.actions !== 2 || liveStats.shots !== 1 || liveStats.shotsOnTarget !== 1 || liveStats.keyPasses !== 1) {
  throw new Error("Live player stats are not derived correctly.");
}
const continuedTeamplay = getResultConsequence(
  { choiceOutcome: "trust", success: true, goals: 0, assists: 0, chancesCreated: 0 },
  true,
);
const completedTeamplay = getResultConsequence(
  { choiceOutcome: "assist", success: true, goals: 0, assists: 0, chancesCreated: 1 },
  false,
);
if (continuedTeamplay.title !== "A second decision opens" || completedTeamplay.title !== "Chance created") {
  throw new Error("Teamplay result consequences do not match the underlying attack state.");
}

console.log(JSON.stringify({
  riskyStarterExitMinute: riskyStarter.exitMinute,
  unusedBenchRecovery: getMatchdayRecoveryBonus(unusedBench),
  omittedRecovery: getMatchdayRecoveryBonus(omitted),
  offersBeforeDecline: transferWindow.offers.length,
  offersAfterDecline: declinedWindow.offers.length,
  momentLibrarySize: expandedPool.length,
  metadataMomentCount: metadataMoments.length,
  chainRouteCount: chainRoutes.size,
  choiceOutcomePreview: choiceOutcomePreview.outcomes,
  matchStats: matchStats.rows.map((row) => `${row.label} ${row.homeValue}-${row.awayValue}`),
  managerBrief: { tone: managerBrief.tone, praise: managerBrief.praise.length, concerns: managerBrief.concerns.length },
  commentary: commentary.title,
  liveStats,
  teamplayConsequences: [continuedTeamplay.title, completedTeamplay.title],
  clubProfile: {
    club: opponentClubProfile.club.name,
    units: opponentClubProfile.unitOvr,
    style: opponentClubProfile.style,
    careerFit: opponentClubProfile.careerFit.label,
  },
}, null, 2));

fs.rmSync(outDir, { recursive: true, force: true });
