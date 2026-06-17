export type OpponentForm = "Poor" | "Mixed" | "Good" | "Hot";
export type ServiceLevel = "Low" | "Mixed" | "Good";
export type DefensiveLine = "Low" | "Mid" | "High";
export type PressingStyle = "Passive" | "Balanced" | "Aggressive";

export type OpponentProfile = {
  overall: number;
  attack: number;
  midfield: number;
  defense: number;
  keeper: number;
  centerBackPace: number;
  aerialDefense: number;
  defensiveLine: DefensiveLine;
  pressing: PressingStyle;
  discipline: number;
  fatigueResistance: number;
};

export type ForwardHighlightCategory =
  | "shot"
  | "first_time_finish"
  | "run_behind"
  | "hold_up"
  | "aerial_duel"
  | "press"
  | "link_up"
  | "counter"
  | "defensive_set_piece"
  | "late_pressure";

export type HighlightTaxonomyItem = {
  id: ForwardHighlightCategory;
  label: string;
  baseWeight: number;
  primaryAttributes: string[];
  opponentCounters: Array<keyof OpponentProfile>;
  preferredService?: ServiceLevel[];
  preferredLine?: DefensiveLine[];
  scoreStateTags: string[];
};

export const forwardHighlightTaxonomy: HighlightTaxonomyItem[] = [
  {
    id: "shot",
    label: "Shot chance",
    baseWeight: 1.15,
    primaryAttributes: ["Finishing", "Composure", "Off Ball"],
    opponentCounters: ["keeper", "defense"],
    preferredService: ["Mixed", "Good"],
    scoreStateTags: ["level", "trailing", "late"],
  },
  {
    id: "first_time_finish",
    label: "First-time finish",
    baseWeight: 0.95,
    primaryAttributes: ["Finishing", "First Touch", "Composure"],
    opponentCounters: ["keeper", "defense"],
    preferredService: ["Good"],
    scoreStateTags: ["level", "trailing"],
  },
  {
    id: "run_behind",
    label: "Run behind",
    baseWeight: 1,
    primaryAttributes: ["Off Ball", "Acceleration", "Pace"],
    opponentCounters: ["centerBackPace", "defensiveLine"],
    preferredLine: ["Mid", "High"],
    scoreStateTags: ["level", "trailing", "counter"],
  },
  {
    id: "hold_up",
    label: "Hold-up play",
    baseWeight: 0.85,
    primaryAttributes: ["Strength", "First Touch", "Composure"],
    opponentCounters: ["defense", "pressing"],
    preferredService: ["Low", "Mixed"],
    preferredLine: ["Low", "Mid"],
    scoreStateTags: ["leading", "low_service"],
  },
  {
    id: "aerial_duel",
    label: "Aerial duel",
    baseWeight: 0.8,
    primaryAttributes: ["Heading", "Strength", "Off Ball"],
    opponentCounters: ["aerialDefense", "defense"],
    preferredService: ["Low", "Mixed"],
    scoreStateTags: ["trailing", "late", "set_piece"],
  },
  {
    id: "press",
    label: "Pressing trigger",
    baseWeight: 0.8,
    primaryAttributes: ["Work Rate", "Acceleration", "Stamina"],
    opponentCounters: ["midfield", "discipline"],
    preferredLine: ["Low", "Mid"],
    scoreStateTags: ["trailing", "level"],
  },
  {
    id: "link_up",
    label: "Link-up decision",
    baseWeight: 0.8,
    primaryAttributes: ["Passing", "Vision", "Composure"],
    opponentCounters: ["pressing", "midfield"],
    preferredService: ["Mixed", "Good"],
    scoreStateTags: ["level", "leading"],
  },
  {
    id: "counter",
    label: "Counterattack",
    baseWeight: 0.75,
    primaryAttributes: ["Pace", "Dribbling", "Vision"],
    opponentCounters: ["centerBackPace", "defensiveLine"],
    preferredLine: ["High"],
    scoreStateTags: ["leading", "transition"],
  },
  {
    id: "defensive_set_piece",
    label: "Defensive set piece",
    baseWeight: 0.45,
    primaryAttributes: ["Marking", "Positioning", "Heading"],
    opponentCounters: ["aerialDefense", "attack"],
    scoreStateTags: ["pressure", "late"],
  },
  {
    id: "late_pressure",
    label: "Late pressure chance",
    baseWeight: 0.7,
    primaryAttributes: ["Composure", "Finishing", "First Touch"],
    opponentCounters: ["keeper", "fatigueResistance"],
    scoreStateTags: ["late", "trailing", "level"],
  },
];

export function buildOpponentProfile(input: {
  opponentStrength: number;
  opponentForm: OpponentForm;
  serviceLevel: ServiceLevel;
  seed: string;
}): OpponentProfile {
  const formModifier = input.opponentForm === "Hot" ? 4 : input.opponentForm === "Good" ? 2 : input.opponentForm === "Poor" ? -3 : 0;
  const strength = input.opponentStrength + formModifier;
  const lineRoll = seededProfileNoise(`${input.seed}-line`);
  const pressingRoll = seededProfileNoise(`${input.seed}-press`);
  const line: DefensiveLine = lineRoll > 0.68 ? "High" : lineRoll < 0.28 ? "Low" : "Mid";
  const pressing: PressingStyle = pressingRoll > 0.66 ? "Aggressive" : pressingRoll < 0.25 ? "Passive" : "Balanced";
  const serviceModifier = input.serviceLevel === "Low" ? 2 : input.serviceLevel === "Good" ? -1 : 0;

  return {
    overall: clampProfile(strength),
    attack: clampProfile(strength + profileSpread(input.seed, "attack", 5)),
    midfield: clampProfile(strength + profileSpread(input.seed, "midfield", 5)),
    defense: clampProfile(strength + serviceModifier + profileSpread(input.seed, "defense", 6)),
    keeper: clampProfile(strength + profileSpread(input.seed, "keeper", 7)),
    centerBackPace: clampProfile(strength + (line === "High" ? -3 : 1) + profileSpread(input.seed, "cb-pace", 8)),
    aerialDefense: clampProfile(strength + serviceModifier + profileSpread(input.seed, "aerial", 7)),
    defensiveLine: line,
    pressing,
    discipline: clampProfile(strength + (pressing === "Aggressive" ? -3 : 2) + profileSpread(input.seed, "discipline", 6)),
    fatigueResistance: clampProfile(strength + (input.opponentForm === "Hot" ? 3 : 0) + profileSpread(input.seed, "fatigue", 6)),
  };
}

export function getForwardHighlightWeight(
  category: ForwardHighlightCategory,
  context: {
    serviceLevel: ServiceLevel;
    opponentProfile: OpponentProfile;
    playerAttributeAverage: number;
  },
) {
  const item = forwardHighlightTaxonomy.find((entry) => entry.id === category);
  if (!item) {
    return 1;
  }

  const serviceFit = item.preferredService?.includes(context.serviceLevel) ? 0.25 : 0;
  const lineFit = item.preferredLine?.includes(context.opponentProfile.defensiveLine) ? 0.2 : 0;
  const playerFit = (context.playerAttributeAverage - 50) / 70;
  const counterAverage =
    item.opponentCounters.reduce((sum, key) => {
      const value = context.opponentProfile[key];
      return sum + (typeof value === "number" ? value : 55);
    }, 0) / item.opponentCounters.length;
  const counterDrag = (counterAverage - 55) / 90;

  return Math.max(0.15, item.baseWeight + serviceFit + lineFit + playerFit - counterDrag);
}

export function getHighlightTaxonomy(category: ForwardHighlightCategory) {
  return forwardHighlightTaxonomy.find((entry) => entry.id === category);
}

function profileSpread(seed: string, key: string, range: number) {
  return Math.round((seededProfileNoise(`${seed}-${key}`) - 0.5) * range * 2);
}

function seededProfileNoise(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function clampProfile(value: number) {
  return Math.max(1, Math.min(99, Math.round(value)));
}
