import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const root = process.cwd();
const srcDir = path.join(root, "src");
const outDir = path.join(root, ".tmp-feed-lab");
const outSrc = path.join(outDir, "src");
const weeks = Number(process.argv.find((arg) => arg.startsWith("--weeks="))?.split("=")[1] ?? 60);

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
  if (file.endsWith(".d.ts") || file.endsWith(".css") || !/\.(ts|tsx|js)$/.test(file)) continue;
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
const { generateWeeklyFeed } = require(path.join(outSrc, "systems", "feed.js"));
const { advanceWorldMatchweek } = require(path.join(outSrc, "systems", "world.js"));

let state = createCareerForCountry("denmark");
const weeklyCounts = [];
const categoryCounts = new Map();
const headlineCounts = new Map();
const clubCounts = new Map();
let playerStories = 0;

for (let index = 0; index < weeks; index += 1) {
  const goalsFor = [1, 2, 0, 3, 1, 0][index % 6];
  const goalsAgainst = [1, 0, 2, 1, 0, 1][index % 6];
  const outcome = goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D";
  const world = advanceWorldMatchweek(
    state.world,
    state.club.shortCode,
    { outcome, goalsFor, goalsAgainst },
    index,
  );
  const playerGoals = index % 7 === 3 ? 1 : 0;
  const playerAssists = index % 9 === 5 ? 1 : 0;
  const nextState = {
    ...state,
    week: state.week + 1,
    world,
    season: {
      ...state.season,
      season: Math.floor(index / 30) + 1,
    },
    seasonStats: {
      ...state.seasonStats,
      goals: state.seasonStats.goals + playerGoals,
      assists: state.seasonStats.assists + playerAssists,
    },
  };
  const match = {
    matchNumber: index + 1,
    teamGoals: goalsFor,
    opponentGoals: goalsAgainst,
    opponent: state.season.fixtures[index % state.season.fixtures.length]?.opponent ?? "Northbridge FC",
    rating: playerGoals || playerAssists ? 7.5 : index % 8 === 0 ? 5.8 : 6.6,
    goals: playerGoals,
    assists: playerAssists,
    manualHighlights: 1,
    autoSimulated: 0,
  };
  const feed = generateWeeklyFeed(state, nextState, match);
  const newStories = feed.filter((story) => story.week === nextState.week);
  weeklyCounts.push(newStories.length);
  newStories.forEach((story) => {
    categoryCounts.set(story.category, (categoryCounts.get(story.category) ?? 0) + 1);
    const headline = story.headline.map((part) => part.text).join("");
    const seasonHeadline = `${story.season}|${headline}`;
    headlineCounts.set(seasonHeadline, (headlineCounts.get(seasonHeadline) ?? 0) + 1);
    story.clubIds.forEach((clubId) => clubCounts.set(clubId, (clubCounts.get(clubId) ?? 0) + 1));
    if (story.playerRelated) playerStories += 1;
  });
  state = { ...nextState, worldFeed: feed };
}

const totalStories = weeklyCounts.reduce((sum, value) => sum + value, 0);
const repeatedHeadlines = [...headlineCounts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
const maxClubStories = Math.max(0, ...clubCounts.values());
const report = {
  weeks,
  totalStories,
  storiesPerWeek: Number((totalStories / weeks).toFixed(2)),
  weeklyRange: [Math.min(...weeklyCounts), Math.max(...weeklyCounts)],
  categories: Object.fromEntries([...categoryCounts.entries()].sort((a, b) => b[1] - a[1])),
  repeatedHeadlineRate: Number((repeatedHeadlines / Math.max(1, totalStories)).toFixed(3)),
  playerStoryRate: Number((playerStories / Math.max(1, totalStories)).toFixed(3)),
  maxSingleClubShare: Number((maxClubStories / Math.max(1, totalStories)).toFixed(3)),
};

console.log(JSON.stringify(report, null, 2));
if (report.weeklyRange[0] < 1 || report.weeklyRange[1] > 5) throw new Error("Feed must produce 1-5 stories per week.");
if (report.repeatedHeadlineRate > 0.25) throw new Error("Feed headline repetition is too high.");
if (Object.keys(report.categories).length < 4) throw new Error("Feed category variety is too low.");

fs.rmSync(outDir, { recursive: true, force: true });
