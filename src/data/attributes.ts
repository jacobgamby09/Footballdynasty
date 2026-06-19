import type { AttributeKey } from "../positionRoles";
import type { Attribute, DynastyState, GenerationProfile } from "../types";

export const initialAttributes: Attribute[] = [
  { label: "Finishing", value: 18, potential: 48, xp: 22 },
  { label: "Long Shots", value: 12, potential: 38, xp: 8 },
  { label: "Passing", value: 14, potential: 42, xp: 14 },
  { label: "Vision", value: 13, potential: 40, xp: 12 },
  { label: "Dribbling", value: 16, potential: 45, xp: 17 },
  { label: "Off Ball", value: 17, potential: 50, xp: 16 },
  { label: "Composure", value: 14, potential: 46, xp: 24 },
  { label: "First Touch", value: 16, potential: 47, xp: 19 },
  { label: "Acceleration", value: 20, potential: 52, xp: 15 },
  { label: "Pace", value: 18, potential: 49, xp: 13 },
  { label: "Stamina", value: 17, potential: 48, xp: 18 },
  { label: "Heading", value: 13, potential: 39, xp: 9 },
  { label: "Strength", value: 12, potential: 41, xp: 11 },
  { label: "Work Rate", value: 19, potential: 51, xp: 20 },
  { label: "Tackling", value: 8, potential: 31, xp: 6 },
  { label: "Marking", value: 9, potential: 32, xp: 7 },
  { label: "Positioning", value: 13, potential: 42, xp: 15 },
];


export const generationProfiles: GenerationProfile[] = [
  { generation: 1, label: "Local bloodline", startKeyBonus: 0, startGeneralBonus: 0, potentialKeyBonus: 0, potentialGeneralBonus: 0 },
  { generation: 2, label: "Known surname", startKeyBonus: 2, startGeneralBonus: 1, potentialKeyBonus: 8, potentialGeneralBonus: 5 },
  { generation: 3, label: "Family prospect", startKeyBonus: 4, startGeneralBonus: 2, potentialKeyBonus: 16, potentialGeneralBonus: 10 },
  { generation: 4, label: "Academy heir", startKeyBonus: 6, startGeneralBonus: 3, potentialKeyBonus: 25, potentialGeneralBonus: 16 },
  { generation: 5, label: "Elite pathway", startKeyBonus: 8, startGeneralBonus: 4, potentialKeyBonus: 35, potentialGeneralBonus: 23 },
  { generation: 6, label: "Dynasty talent", startKeyBonus: 10, startGeneralBonus: 5, potentialKeyBonus: 45, potentialGeneralBonus: 30 },
];

export const initialDynasty: DynastyState = {
  generation: 1,
  legacyLevel: 0,
  legacyPoints: 0,
  potentialTier: generationProfiles[0].label,
};

export const attributeInfo: Record<
  AttributeKey,
  { group: "Technical" | "Mental" | "Physical" | "Defensive"; strikerKey: boolean; description: string; affects: string }
> = {
  Finishing: {
    group: "Technical",
    strikerKey: true,
    description: "Quality when converting chances inside the box.",
    affects: "Shots, one-on-ones and loose balls near goal.",
  },
  "Long Shots": {
    group: "Technical",
    strikerKey: false,
    description: "Threat from distance when space opens outside the area.",
    affects: "Edge-of-box shots and low-service matches.",
  },
  Passing: {
    group: "Technical",
    strikerKey: false,
    description: "Reliability when linking play or finding a teammate.",
    affects: "Layoffs, cutbacks and safer assist choices.",
  },
  Vision: {
    group: "Mental",
    strikerKey: false,
    description: "Ability to spot runs and choose the best final action.",
    affects: "Through balls, square passes and creative assists.",
  },
  Dribbling: {
    group: "Technical",
    strikerKey: false,
    description: "Control when carrying the ball past pressure.",
    affects: "Taking on defenders and creating your own shot.",
  },
  "Off Ball": {
    group: "Mental",
    strikerKey: true,
    description: "Movement that creates space before the pass arrives.",
    affects: "Runs behind, pull-away headers and chance quality.",
  },
  Composure: {
    group: "Mental",
    strikerKey: true,
    description: "Calm execution when pressure or risk is high.",
    affects: "High-pressure shots, first touches and risky choices.",
  },
  "First Touch": {
    group: "Technical",
    strikerKey: true,
    description: "How cleanly you control awkward or fast passes.",
    affects: "Hold-up play, cutbacks and setting up a shot.",
  },
  Acceleration: {
    group: "Physical",
    strikerKey: true,
    description: "First steps over short distances.",
    affects: "Pressing jumps, loose balls and rounding the keeper.",
  },
  Pace: {
    group: "Physical",
    strikerKey: false,
    description: "Top speed when sprinting into space.",
    affects: "Counterattacks and longer runs behind the line.",
  },
  Stamina: {
    group: "Physical",
    strikerKey: false,
    description: "How well performance holds during repeated efforts.",
    affects: "Late-game actions, pressing and fatigue resistance.",
  },
  Heading: {
    group: "Technical",
    strikerKey: true,
    description: "Timing and direction when attacking aerial balls.",
    affects: "Crosses, knockdowns and defensive set pieces.",
  },
  Strength: {
    group: "Physical",
    strikerKey: true,
    description: "Physical duels, shielding and contact balance.",
    affects: "Hold-up play, aerial duels and drawing fouls.",
  },
  "Work Rate": {
    group: "Mental",
    strikerKey: true,
    description: "Willingness to press, recover and follow instructions.",
    affects: "Manager trust, pressing and off-ball defensive work.",
  },
  Tackling: {
    group: "Defensive",
    strikerKey: false,
    description: "Ability to win the ball cleanly in defensive actions.",
    affects: "Counter-pressing and tracking back.",
  },
  Marking: {
    group: "Defensive",
    strikerKey: false,
    description: "Staying tight to an assignment without losing shape.",
    affects: "Set-piece defending and tracking runners.",
  },
  Positioning: {
    group: "Mental",
    strikerKey: false,
    description: "Reading where to be when the game shifts.",
    affects: "Defensive shape, rebounds and second-ball situations.",
  },
};
