// App-OVR probe — striker archetypes under the UNIFIED Forward OVR weights.
//
// The "two OVR truths" are resolved: the app (src/positionRoles.ts), both balance labs and this probe now
// all import the SAME `forwardOvrWeights` (src/engine/ovrWeights.js), so the guardrail measures exactly the
// OVR the player sees. This probe imports that single source directly — if anyone re-introduces a divergent
// weight set, the numbers here move with it, by construction.
import { forwardOvrWeights } from "../src/engine/ovrWeights.js";

function ovr(attrs) {
  let value = 0;
  let weight = 0;
  for (const [label, w] of Object.entries(forwardOvrWeights)) {
    value += (attrs[label] ?? 0) * w;
    weight += w;
  }
  return weight > 0 ? Math.round(value / weight) : 0;
}

const archetypes = {
  "Complete striker (athletic)":     { Finishing: 80, "Off Ball": 78, Composure: 76, "First Touch": 76, Acceleration: 78, "Work Rate": 74, Heading: 72, Strength: 74, Pace: 80, Stamina: 78 },
  "Primary-maxed, DUMPED athletics": { Finishing: 88, "Off Ball": 86, Composure: 84, "First Touch": 80, Acceleration: 70, "Work Rate": 64, Heading: 78, Strength: 76, Pace: 24, Stamina: 22 },
  "Primary-maxed, decent athletics": { Finishing: 88, "Off Ball": 86, Composure: 84, "First Touch": 80, Acceleration: 70, "Work Rate": 64, Heading: 78, Strength: 76, Pace: 62, Stamina: 60 },
  "Lab striker (Stamina 10 build)":  { Finishing: 67, "Off Ball": 66, Composure: 64, "First Touch": 60, Acceleration: 62, "Work Rate": 58, Heading: 56, Strength: 54, Pace: 40, Stamina: 10 },
};

const sum = Object.values(forwardOvrWeights).reduce((a, b) => a + b, 0);
const athletic = (forwardOvrWeights.Pace ?? 0) + (forwardOvrWeights.Stamina ?? 0);

console.log("=== App-OVR probe — unified Forward weights (app == labs == probe) ===\n");
console.log(`  ${"archetype".padEnd(34)} OVR`);
for (const [name, attrs] of Object.entries(archetypes)) {
  console.log(`  ${name.padEnd(34)} ${String(ovr(attrs)).padStart(3)}`);
}
console.log(`\n  weight sum: ${sum.toFixed(2)} | Pace+Stamina athleticism floor: ${(athletic / sum * 100).toFixed(1)}%`);
console.log("  Single source: src/engine/ovrWeights.js — imported by app, season-lab, match-lab and this probe.");
