import type { EngineMatchRole, EngineMentality, EngineMoment, EngineSimEvent } from "./matchEngineCore";
import type { OpponentProfile, ServiceLevel } from "../matchEngine";

export type MatchPhase =
  | "cagey_opening"
  | "team_pressure"
  | "opponent_pressure"
  | "end_to_end"
  | "protecting_lead"
  | "chasing_goal"
  | "late_siege"
  | "game_management";

export type MatchDirectorState = {
  phase: MatchPhase;
  recentCategories: string[];
  usedMomentIds: string[];
  usedMomentFamilies: string[];
  phaseHistory: MatchPhase[];
  lastHighlightMinute?: number;
  highlightBudget: number;
  maxChains: number;
};

export type DirectedMoment<TMoment extends EngineMoment> = TMoment & {
  minute: number;
  directorPhase: MatchPhase;
  narrativeTags: string[];
};

export function createMatchDirectorPlan<TMoment extends EngineMoment>(input: {
  moments: TMoment[];
  count: number;
  matchSeed: string;
  playerWindowStart: number;
  playerWindowEnd: number;
  simEvents: EngineSimEvent[];
  role: EngineMatchRole;
  serviceLevel: ServiceLevel;
  opponentProfile: OpponentProfile;
  attributeValues: Record<string, number>;
  preferredCategories?: string[];
  mentality?: EngineMentality;
}): {
  moments: Array<DirectedMoment<TMoment>>;
  state: MatchDirectorState;
};

export function getMatchPhase(input: {
  minute: number;
  scoreAtMinute: { teamGoals: number; opponentGoals: number };
  simEvents: EngineSimEvent[];
  matchSeed?: string;
}): MatchPhase;

export function canQueueDirectorFollowUp(input: {
  match: {
    events: Array<EngineSimEvent | (EngineMoment & { type: "player_moment"; minute: number; chainDepth?: number })>;
    exitMinute?: number;
  };
  moment: EngineMoment & { minute: number };
  highlightBudget: number;
  maxChains: number;
}): boolean;
