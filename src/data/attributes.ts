import type { AttributeKey } from "../positionRoles";
import type { Attribute, DynastyState, GenerationProfile } from "../types";
import { initialDynastyUpgrades } from "./dynastyUpgrades";

export const initialAttributes: Attribute[] = [
  { label: "Finishing", value: 11, potential: 61, xp: 8 },
  { label: "Long Shots", value: 8, potential: 49, xp: 5 },
  { label: "Passing", value: 9, potential: 52, xp: 6 },
  { label: "Vision", value: 9, potential: 50, xp: 6 },
  { label: "Dribbling", value: 10, potential: 56, xp: 7 },
  { label: "Off Ball", value: 10, potential: 62, xp: 7 },
  { label: "Composure", value: 9, potential: 59, xp: 6 },
  { label: "First Touch", value: 10, potential: 60, xp: 7 },
  { label: "Acceleration", value: 12, potential: 63, xp: 8 },
  { label: "Pace", value: 11, potential: 59, xp: 7 },
  { label: "Stamina", value: 10, potential: 58, xp: 7 },
  { label: "Heading", value: 8, potential: 55, xp: 5 },
  { label: "Strength", value: 8, potential: 56, xp: 5 },
  { label: "Work Rate", value: 12, potential: 62, xp: 8 },
  { label: "Positioning", value: 8, potential: 52, xp: 5 },
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
  familyName: "Vale",
  nationality: "denmark",
  reputation: 0,
  estate: 0,
  upgrades: { ...initialDynastyUpgrades },
  cabinet: { entries: [] },
  manOfTheMatch: 0,
};

export const attributeInfo: Record<
  AttributeKey,
  { group: "Technical" | "Mental" | "Physical"; description: string; affects: string }
> = {
  Finishing: {
    group: "Technical",
    description: "Quality when converting chances inside the box.",
    affects: "Shots, one-on-ones and loose balls near goal.",
  },
  "Long Shots": {
    group: "Technical",
    description: "Threat from distance when space opens outside the area.",
    affects: "Edge-of-box shots and low-service matches.",
  },
  Passing: {
    group: "Technical",
    description: "Reliability when linking play or finding a teammate.",
    affects: "Layoffs, cutbacks and safer assist choices.",
  },
  Vision: {
    group: "Mental",
    description: "Ability to spot runs and choose the best final action.",
    affects: "Through balls, square passes and creative assists.",
  },
  Dribbling: {
    group: "Technical",
    description: "Control when carrying the ball past pressure.",
    affects: "Taking on defenders and creating your own shot.",
  },
  "Off Ball": {
    group: "Mental",
    description: "Movement that creates space before the pass arrives.",
    affects: "Runs behind, pull-away headers and chance quality.",
  },
  Composure: {
    group: "Mental",
    description: "Calm execution when pressure or risk is high.",
    affects: "High-pressure shots, first touches and risky choices.",
  },
  "First Touch": {
    group: "Technical",
    description: "How cleanly you control awkward or fast passes.",
    affects: "Hold-up play, cutbacks and setting up a shot.",
  },
  Acceleration: {
    group: "Physical",
    description: "First steps over short distances.",
    affects: "Pressing jumps, loose balls and rounding the keeper.",
  },
  Pace: {
    group: "Physical",
    description: "Top speed when sprinting into space.",
    affects: "Counterattacks and longer runs behind the line.",
  },
  Stamina: {
    group: "Physical",
    description: "How well performance holds during repeated efforts.",
    affects: "Late-game actions, pressing and fatigue resistance.",
  },
  Heading: {
    group: "Physical",
    description: "Timing and direction when attacking aerial balls.",
    affects: "Crosses, knockdowns and near-post finishes.",
  },
  Strength: {
    group: "Physical",
    description: "Physical duels, shielding and contact balance.",
    affects: "Hold-up play, aerial duels and drawing fouls.",
  },
  "Work Rate": {
    group: "Mental",
    description: "Willingness to press, recover and follow instructions.",
    affects: "Manager trust, pressing and off-ball defensive work.",
  },
  Positioning: {
    group: "Mental",
    description: "Reading where to be when the game shifts.",
    affects: "Rebounds, late box arrivals and second-ball situations.",
  },
};
