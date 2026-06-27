// App-OVR probe (#9 + the "two OVR truths" red flag).
//
// WHY THIS EXISTS: the season/match labs reimplement OVR with their OWN weights (they're .mjs and can't
// import the .ts position modules), so the guardrail number is the LAB's OVR, not the player's displayed
// app-OVR. This probe measures the APP-OVR for striker archetypes and quantifies the lab↔app gap, so we
// don't "balance by one number and show the player another."
//
// LIMITATION: the APP weights below are MIRRORED from src/positionRoles.ts (Forward.ovrWeights). Keep them
// in sync by hand until the single-source extraction lands (tracked in NEXT_STEPS — move the Forward weights
// into a plain .js the app, labs, AND this probe all import; same pattern as getStaminaFitnessLoadMultiplier).

// MIRROR of src/positionRoles.ts Forward.ovrWeights (the real app OVR, incl. the #9 Pace/Stamina floor):
const APP = { Finishing: 1.35, "Off Ball": 1.2, Composure: 1.15, "First Touch": 1.05, Acceleration: 0.9, "Work Rate": 0.8, Heading: 0.7, Strength: 0.65, Pace: 0.6, Stamina: 0.5 };
// MIRROR of scripts/season-balance-lab.mjs ovrWeights (what the guardrail actually measures):
const LAB = { Finishing: 1.25, "Off Ball": 1.1, Composure: 1, "First Touch": 0.85, Acceleration: 0.85, Heading: 0.7, Strength: 0.55, "Work Rate": 0.55 };

function ovr(attrs, weights) {
  let value = 0, weight = 0;
  for (const [label, v] of Object.entries(attrs)) {
    const w = weights[label] ?? 0;
    value += v * w; weight += w;
  }
  return weight > 0 ? Math.round(value / weight) : 0;
}

const archetypes = {
  "Complete striker (athletic)":     { Finishing: 80, "Off Ball": 78, Composure: 76, "First Touch": 76, Acceleration: 78, "Work Rate": 74, Heading: 72, Strength: 74, Pace: 80, Stamina: 78 },
  "Primary-maxed, DUMPED athletics": { Finishing: 88, "Off Ball": 86, Composure: 84, "First Touch": 80, Acceleration: 70, "Work Rate": 64, Heading: 78, Strength: 76, Pace: 24, Stamina: 22 },
  "Primary-maxed, decent athletics": { Finishing: 88, "Off Ball": 86, Composure: 84, "First Touch": 80, Acceleration: 70, "Work Rate": 64, Heading: 78, Strength: 76, Pace: 62, Stamina: 60 },
  "Lab striker (Stamina 10 build)":  { Finishing: 67, "Off Ball": 66, Composure: 64, "First Touch": 60, Acceleration: 62, "Work Rate": 58, Heading: 56, Strength: 54, Pace: 40, Stamina: 10 },
};

console.log("=== App-OVR probe — striker archetypes (app vs lab weights) ===\n");
console.log(`  ${"archetype".padEnd(34)} app-OVR   lab-OVR   gap(app-lab)`);
for (const [name, attrs] of Object.entries(archetypes)) {
  const a = ovr(attrs, APP), l = ovr(attrs, LAB);
  console.log(`  ${name.padEnd(34)} ${String(a).padStart(6)}   ${String(l).padStart(6)}   ${a - l >= 0 ? "+" : ""}${a - l}`);
}
console.log("\n  app weight sum:", Object.values(APP).reduce((x, y) => x + y, 0).toFixed(2), "| Pace+Stamina share:", (1.1 / 8.9 * 100).toFixed(1) + "%");
console.log("  NOTE: lab weights omit Pace/Stamina and run lighter across the board, so lab-OVR reads a touch");
console.log("  higher than the player's displayed app-OVR. Acceptable for now (guardrail tracks progression");
console.log("  shape, not the headline number); unify via the single-source extraction — see NEXT_STEPS.");
