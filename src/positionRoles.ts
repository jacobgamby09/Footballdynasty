import { forwardOvrWeights } from "./engine/ovrWeights";
import type { ForwardHighlightCategory } from "./matchEngine";

export type MatchRole = "Bench" | "Impact Sub" | "Rotation Starter" | "Starter";
// Only offensive roles. Fullback/Centerback were removed with the attribute-model cleanup (see
// ATTRIBUTE_MODEL_PLAN.md). Winger + Midfielder are defined but NOT yet player-selectable (locked until
// each has its own moment bank); the player is a Forward.
export type PositionGroup = "Forward" | "Winger" | "Midfielder";

export type AttributeKey =
  | "Finishing"
  | "Long Shots"
  | "Passing"
  | "Vision"
  | "Dribbling"
  | "Off Ball"
  | "Composure"
  | "First Touch"
  | "Acceleration"
  | "Pace"
  | "Stamina"
  | "Heading"
  | "Strength"
  | "Work Rate"
  | "Positioning";

export type PositionMomentPool = "forward" | "winger" | "midfielder" | "shared";

export type PositionMatchTendencies = {
  involvementBias: Record<MatchRole, number>;
  attacking: number;
  chanceCreation: number;
  possession: number;
  defending: number;
  transition: number;
  preferredForwardCategories: ForwardHighlightCategory[];
};

export type PositionPerformanceWeights = {
  goal: number;
  assist: number;
  trust: number;
  defensive: number;
  possession: number;
  transition: number;
};

export type PositionModule = {
  group: PositionGroup;
  displayName: string;
  shortCode: string;
  defaultArchetype: string;
  keyAttributes: AttributeKey[];
  ovrWeights: Partial<Record<AttributeKey, number>>;
  momentPools: PositionMomentPool[];
  matchTendencies: PositionMatchTendencies;
  performanceWeights: PositionPerformanceWeights;
  highlightCategories: string[];
  ratingFocus: string[];
  tacticalFocuses: {
    default: string;
    lowService: string;
    movement: string;
    workRate: string;
  };
  managerInstructions: Record<MatchRole, { default: string; lowService?: string }>;
};

export const positionGroups: PositionGroup[] = ["Forward", "Winger", "Midfielder"];

export const positionModules: Record<PositionGroup, PositionModule> = {
  Forward: {
    group: "Forward",
    displayName: "Forward",
    shortCode: "ST",
    defaultArchetype: "Poacher",
    keyAttributes: ["Finishing", "Off Ball", "Composure", "First Touch", "Acceleration", "Heading", "Strength", "Work Rate"],
    // Shared single source (src/engine/ovrWeights.js) so the app, both balance labs and the probe weight
    // OVR identically — the guardrail measures the same number the player sees. Pace + Stamina carry the
    // ~12% athleticism floor (#9 part 1); see that module for the rationale.
    ovrWeights: forwardOvrWeights,
    momentPools: ["forward", "shared"],
    matchTendencies: {
      involvementBias: { Bench: -0.35, "Impact Sub": 0.15, "Rotation Starter": 0.35, Starter: 0.55 },
      attacking: 0.9,
      chanceCreation: 0.55,
      possession: 0.35,
      defending: 0.25,
      transition: 0.55,
      preferredForwardCategories: ["shot", "first_time_finish", "run_behind", "aerial_duel", "late_pressure"],
    },
    performanceWeights: { goal: 1.2, assist: 0.95, trust: 0.85, defensive: 0.65, possession: 0.75, transition: 0.9 },
    highlightCategories: ["Shot", "Run Behind", "Hold-up", "Aerial Duel", "Pressing", "Late Chance"],
    ratingFocus: ["Goals", "Assists", "Chance quality", "Pressing", "Hold-up play"],
    tacticalFocuses: {
      default: "Box movement",
      lowService: "Hold-up play",
      movement: "Attack channels",
      workRate: "Lead the press",
    },
    managerInstructions: {
      Bench: { default: "Stay ready; minutes are not guaranteed." },
      "Impact Sub": {
        default: "Attack tired defenders and make one clean decision count.",
        lowService: "Win second balls and make the ball stick late.",
      },
      "Rotation Starter": { default: "Set the press early and keep your movement disciplined." },
      Starter: { default: "Lead the line and deliver a complete striker performance." },
    },
  },
  // NOT yet playable — defined for the model + NPC world, but locked until it has its own moment bank.
  Winger: {
    group: "Winger",
    displayName: "Winger",
    shortCode: "W",
    defaultArchetype: "Wide Threat",
    keyAttributes: ["Pace", "Acceleration", "Dribbling", "Passing", "Vision", "First Touch", "Work Rate", "Stamina"],
    ovrWeights: {
      Pace: 1.2,
      Acceleration: 1.15,
      Dribbling: 1.25,
      Passing: 0.9,
      Vision: 0.85,
      "First Touch": 1,
      "Work Rate": 0.8,
      Stamina: 0.8,
    },
    momentPools: ["winger", "shared"],
    matchTendencies: {
      involvementBias: { Bench: -0.3, "Impact Sub": 0.25, "Rotation Starter": 0.35, Starter: 0.5 },
      attacking: 0.7,
      chanceCreation: 0.8,
      possession: 0.45,
      defending: 0.4,
      transition: 0.8,
      preferredForwardCategories: ["counter", "link_up", "run_behind", "shot", "press"],
    },
    performanceWeights: { goal: 0.85, assist: 1.2, trust: 0.9, defensive: 0.85, possession: 0.85, transition: 1.15 },
    highlightCategories: ["Wide 1v1", "Cross", "Cutback", "Counter Carry", "Far-post Run", "Track Fullback"],
    ratingFocus: ["Assists", "Chances created", "Carries", "Crosses", "Defensive work"],
    tacticalFocuses: {
      default: "Isolate fullback",
      lowService: "Carry in transition",
      movement: "Attack wide space",
      workRate: "Track the flank",
    },
    managerInstructions: {
      Bench: { default: "Stay ready to stretch the match late." },
      "Impact Sub": { default: "Run at tired legs and look for cutbacks." },
      "Rotation Starter": { default: "Keep width, press their fullback and pick your moments." },
      Starter: { default: "Drive the wide channel and create repeatable service." },
    },
  },
  // NOT yet playable — defined for the model + NPC world, but locked until it has its own moment bank.
  // Interim tiers; the full attacking-mid tuning (Dribbling/Off Ball key, Positioning situational) lands
  // with the AM build (ATTRIBUTE_MODEL_PLAN.md §3).
  Midfielder: {
    group: "Midfielder",
    displayName: "Midfielder",
    shortCode: "CM",
    defaultArchetype: "Box-to-Box",
    keyAttributes: ["Passing", "Vision", "First Touch", "Composure", "Positioning", "Work Rate", "Stamina", "Dribbling"],
    ovrWeights: {
      Passing: 1.25,
      Vision: 1.15,
      "First Touch": 1.1,
      Composure: 1.05,
      Positioning: 0.95,
      "Work Rate": 0.9,
      Stamina: 0.9,
      Dribbling: 0.8,
    },
    momentPools: ["midfielder", "shared"],
    matchTendencies: {
      involvementBias: { Bench: -0.25, "Impact Sub": 0.2, "Rotation Starter": 0.4, Starter: 0.65 },
      attacking: 0.45,
      chanceCreation: 0.75,
      possession: 0.9,
      defending: 0.55,
      transition: 0.55,
      preferredForwardCategories: ["link_up", "press", "counter", "shot", "defensive_set_piece"],
    },
    performanceWeights: { goal: 0.75, assist: 1.1, trust: 1, defensive: 0.95, possession: 1.2, transition: 0.95 },
    highlightCategories: ["Receive Under Press", "Through Ball", "Switch Play", "Interception", "Late Box Arrival", "Midfield Duel"],
    ratingFocus: ["Progressive passes", "Tempo control", "Chance creation", "Ball wins", "Press resistance"],
    tacticalFocuses: {
      default: "Control tempo",
      lowService: "Find early passes",
      movement: "Arrive late",
      workRate: "Win second balls",
    },
    managerInstructions: {
      Bench: { default: "Stay ready to stabilize the midfield." },
      "Impact Sub": { default: "Bring energy, protect the middle and move the ball early." },
      "Rotation Starter": { default: "Keep the tempo clean and compete for second balls." },
      Starter: { default: "Set the rhythm and connect both phases." },
    },
  },
};

export function getPositionModule(positionGroup: PositionGroup) {
  return positionModules[positionGroup];
}

// Player-facing role name (e.g. "Striker") shown in the UI, distinct from the broader group
// displayName ("Forward") used internally. Falls back to the group displayName.
const playerRoleLabels: Partial<Record<PositionGroup, string>> = {
  Forward: "Striker",
  Midfielder: "Offensive midfielder",
};

export function getPlayerRoleLabel(positionGroup: PositionGroup): string {
  return playerRoleLabels[positionGroup] ?? positionModules[positionGroup].displayName;
}
