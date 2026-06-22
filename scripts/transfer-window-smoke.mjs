import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const root = process.cwd();
const srcDir = path.join(root, "src");
const outDir = path.join(root, ".tmp-transfer-window-smoke");
const outSrc = path.join(outDir, "src");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outSrc, { recursive: true });
fs.writeFileSync(path.join(outDir, "package.json"), JSON.stringify({ type: "commonjs" }));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

for (const file of walk(srcDir)) {
  if (file.endsWith(".d.ts") || file.endsWith(".css")) continue;
  if (!/\.(ts|tsx|js)$/.test(file)) continue;

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
const { acceptContractOfferState } = require(path.join(outSrc, "systems", "contracts.js"));
const { createTransferWindowState, getPendingTransferWindowKind } = require(path.join(outSrc, "systems", "transferWindow.js"));

function fixtureResult(fixture, index) {
  return {
    fixtureId: fixture.id,
    opponent: fixture.opponent,
    venue: fixture.venue,
    competition: fixture.competition,
    teamGoals: index % 3 === 0 ? 2 : 1,
    opponentGoals: index % 4 === 0 ? 0 : 1,
    outcome: index % 4 === 0 ? "W" : "D",
    rating: 6.9,
  };
}

function withPlayedMatches(game, count) {
  return {
    ...game,
    week: game.week + count,
    season: {
      ...game.season,
      fixtureIndex: count,
      results: game.season.fixtures.slice(0, count).map(fixtureResult),
    },
  };
}

function makeBreakout(game) {
  return {
    ...game,
    trust: 82,
    prestige: 1250,
    fitness: 88,
    contract: { ...game.contract, weeksRemaining: 2 },
    seasonStats: {
      apps: 15,
      starts: 10,
      goals: 18,
      assists: 7,
      ratings: [7.1, 7.3, 7.0, 7.4],
    },
    attributes: game.attributes.map((attribute) => ({
      ...attribute,
      value: ["Finishing", "Off Ball", "Composure", "First Touch", "Acceleration", "Work Rate"].includes(attribute.label)
        ? 48
        : Math.max(attribute.value, 34),
    })),
  };
}

const base = createCareerForCountry("denmark");
const midCount = Math.floor(base.season.fixtures.length / 2);
const midBase = withPlayedMatches(base, midCount);
const midKind = getPendingTransferWindowKind(midBase);
const quietMid = createTransferWindowState(midBase);

const breakoutMid = makeBreakout(midBase);
const breakoutWindow = createTransferWindowState(breakoutMid);
const decisionRequired = Boolean(breakoutWindow?.currentClubOffer || breakoutWindow?.offers.length);
const chosenOffer = breakoutWindow?.offers[0] ?? breakoutWindow?.currentClubOffer;
const accepted = chosenOffer
  ? { ...acceptContractOfferState(breakoutMid, chosenOffer), transferWindow: undefined }
  : undefined;

const endBase = withPlayedMatches(base, base.season.fixtures.length);
const endKind = getPendingTransferWindowKind(endBase);
const endWindow = createTransferWindowState(makeBreakout(endBase));

console.log(JSON.stringify({
  fixtureCount: base.season.fixtures.length,
  midCount,
  midKind,
  quietMid: quietMid && {
    kind: quietMid.kind,
    clubFit: quietMid.clubFit,
    interestLevel: quietMid.interestLevel,
    offers: quietMid.offers.length,
    hasCurrentClubOffer: Boolean(quietMid.currentClubOffer),
  },
  breakoutWindow: breakoutWindow && {
    kind: breakoutWindow.kind,
    clubFit: breakoutWindow.clubFit,
    interestLevel: breakoutWindow.interestLevel,
    offers: breakoutWindow.offers.length,
    hasCurrentClubOffer: Boolean(breakoutWindow.currentClubOffer),
    decisionRequired,
    firstOfferClub: chosenOffer?.club,
    firstOfferSource: chosenOffer?.source,
  },
  accepted: accepted && {
    club: accepted.club.name,
    contractClub: accepted.contract.club,
    wage: accepted.contract.weeklyWage,
    role: accepted.contract.rolePromise,
    transferWindowCleared: accepted.transferWindow === undefined,
  },
  endKind,
  endWindow: endWindow && {
    kind: endWindow.kind,
    offers: endWindow.offers.length,
    hasCurrentClubOffer: Boolean(endWindow.currentClubOffer),
    interestLevel: endWindow.interestLevel,
  },
}, null, 2));

fs.rmSync(outDir, { recursive: true, force: true });
