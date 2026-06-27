// Stamina availability/sharpness probe (#9 part 2).
//
// Imports the SINGLE engine source `getStaminaFitnessLoadMultiplier` (matchEngineCore.js) — the same
// function the app and the season-lab call — so this measures the REAL mechanic, not a replica. It mirrors
// only the tiny surrounding arithmetic from src/systems/match.ts (getMatchFitnessDelta / getLiveMatchReadiness),
// which is intentionally trivial.
//
// Targets (from the design call): Stamina is an availability stat, never an output stat.
//   • one fresh match  -> SMALL difference (low vs high stamina)
//   • a long match late -> NOTICEABLE fade (the legs go after ~60-70')
//   • several loads     -> LARGE difference (congestion compounds)
//   • >=60 fitness       -> not punishing; the bite shows once fitness is already low
//   • low stamina must stay VIABLE, never useless.
import { getStaminaFitnessLoadMultiplier } from "../src/engine/matchEngineCore.js";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const LOW = 15;
const MID = 55;
const HIGH = 85;

// --- mirrors of the (trivial) app arithmetic; the stamina factor itself is the imported engine source ---
function matchFitnessDelta(minutes, rawActionLoad, stamina, startFitness) {
  if (minutes <= 0) return 0;
  const minuteLoad = -Math.max(1, Math.round(minutes / 18));
  const scaledActionLoad = Math.round(rawActionLoad * Math.min(1, minutes / 60) * 0.35);
  const mult = getStaminaFitnessLoadMultiplier(stamina, minutes, startFitness);
  return clamp(Math.round((minuteLoad + scaledActionLoad) * mult), -12, 0);
}
function liveReadiness(startFitness, minutesSoFar, rawActionLoadSoFar, stamina) {
  const base = minutesSoFar <= 0 ? 0 : -Math.max(0, Math.round(minutesSoFar / 22));
  const minuteLoad = Math.round(base * getStaminaFitnessLoadMultiplier(stamina, minutesSoFar));
  return clamp(startFitness + minuteLoad + rawActionLoadSoFar, 0, 100);
}
function selectionRisk(fitness) {
  if (fitness < 20) return "BENCHED (not match fit)";
  if (fitness < 40) return "rotation doubt";
  if (fitness < 60) return "available, role capped";
  return "fully available";
}
const involvements = (minutes, heavy = false) => -(heavy ? 0.15 : 0.08) * minutes; // raw action load

function row(label, lowV, midV, highV, gap) {
  const g = gap ?? Math.abs(lowV - highV);
  console.log(`  ${label.padEnd(30)} low(${LOW}) ${String(lowV).padStart(5)}   mid(${MID}) ${String(midV).padStart(5)}   high(${HIGH}) ${String(highV).padStart(5)}   | low-high gap ${g}`);
}

console.log("=== #9 part 2 — Stamina as availability/sharpness ===\n");

console.log("[1] ONE match from 100 fitness — fitness after (target: SMALL gap)");
for (const min of [20, 60, 90]) {
  const a = involvements(min);
  const low = 100 + matchFitnessDelta(min, a, LOW, 100);
  const mid = 100 + matchFitnessDelta(min, a, MID, 100);
  const high = 100 + matchFitnessDelta(min, a, HIGH, 100);
  row(`${min}'  ->  fitness after`, low, mid, high);
}

console.log("\n[2] LONG match — live readiness during a 90' shift from 100 (target: NOTICEABLE late fade)");
for (const t of [30, 60, 75, 90]) {
  const aSoFar = involvements(t);
  const low = liveReadiness(100, t, Math.round(aSoFar), LOW);
  const mid = liveReadiness(100, t, Math.round(aSoFar), MID);
  const high = liveReadiness(100, t, Math.round(aSoFar), HIGH);
  row(`minute ${t}  ->  readiness`, low, mid, high);
}

console.log("\n[3] MANY involvements, 90' from 100 — fitness after (heavy pressing/running shift)");
{
  const a = involvements(90, true);
  const low = 100 + matchFitnessDelta(90, a, LOW, 100);
  const mid = 100 + matchFitnessDelta(90, a, MID, 100);
  const high = 100 + matchFitnessDelta(90, a, HIGH, 100);
  row("90' heavy -> fitness after", low, mid, high);
}

console.log("\n[4] CONGESTED run: 6 matches (90' each, only +2 recovery between) — target: LARGE compounding gap + selection risk");
for (const sta of [LOW, MID, HIGH]) {
  let f = 100;
  const trail = [];
  for (let m = 0; m < 6; m += 1) {
    f = clamp(f + matchFitnessDelta(90, involvements(90), sta, f), 0, 100);
    trail.push(f);
    if (m < 5) f = clamp(f + 2, 0, 100); // genuine fixture pile-up: minimal midweek recovery
  }
  const tag = sta === LOW ? "low " : sta === MID ? "mid " : "high";
  console.log(`  stamina ${tag}(${sta}): ${trail.join(" -> ")}   after run: ${selectionRisk(f)}`);
}

console.log("\n[5] HARD training (-4) THEN a 90' match, same week — fitness after + next-week selection");
for (const sta of [LOW, MID, HIGH]) {
  const afterTraining = clamp(100 - 4, 0, 100);
  const f = clamp(afterTraining + matchFitnessDelta(90, involvements(90), sta, afterTraining), 0, 100);
  const tag = sta === LOW ? "low " : sta === MID ? "mid " : "high";
  console.log(`  stamina ${tag}(${sta}): train->${afterTraining}, match-> ${f}   next-wk: ${selectionRisk(f)}`);
}

console.log("\n[6] multiplier shape (load x): fresh(start100) vs drained(start45), full 90'");
for (const sta of [LOW, MID, HIGH]) {
  const fresh = getStaminaFitnessLoadMultiplier(sta, 90, 100).toFixed(3);
  const drained = getStaminaFitnessLoadMultiplier(sta, 90, 45).toFixed(3);
  const live85 = getStaminaFitnessLoadMultiplier(sta, 85).toFixed(3);
  console.log(`  stamina ${String(sta).padStart(2)}: decay fresh x${fresh}  decay drained x${drained}  live@85' x${live85}`);
}
