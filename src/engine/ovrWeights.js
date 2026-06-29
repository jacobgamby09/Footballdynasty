// Single source of truth for the Forward (striker) OVR weights — imported by the app
// (src/positionRoles.ts), BOTH balance labs (season + match) AND the app-OVR probe, so the guardrail
// measures the SAME OVR the player sees. No more "two OVR truths".
//
// Pace + Stamina carry a small athleticism floor (~12% combined, #9 part 1): a striker can't reach a
// perfect rating on finishing alone while dumping athleticism, but they stay a strong specialist, just
// capped. The labs also read this object to decide which attributes are "key" (weight > 0) for generation
// start bonuses and the potential upgrade — matching the app's bumpKeyAttributePotential exactly.
export const forwardOvrWeights = {
  Finishing: 1.35,
  "Off Ball": 1.2,
  Composure: 1.15,
  "First Touch": 1.05,
  Acceleration: 0.9,
  "Work Rate": 0.8,
  Heading: 0.7,
  Strength: 0.65,
  Pace: 0.6,
  Stamina: 0.5,
};
