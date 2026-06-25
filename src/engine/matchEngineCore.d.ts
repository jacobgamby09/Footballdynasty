import type { OpponentProfile, ServiceLevel } from "../matchEngine";

export type EngineVenue = "Home" | "Away";
export type EngineMatchRole = "Bench" | "Impact Sub" | "Rotation Starter" | "Starter";
export type EngineRisk = "Low" | "Medium" | "High";
export type EngineManagerPreference = "Likes" | "Neutral" | "Risky";
export type EngineChoiceOutcome = "goal" | "assist" | "trust" | "defense";
export type EngineChanceQuality = "Clear chance" | "Good chance" | "Half chance" | "Difficult chance";
export type EngineOutcomeTier = "Poor" | "Okay" | "Good" | "Great";

export type EngineChoice = {
  id: string;
  uses: string[];
  risk: EngineRisk;
  manager: EngineManagerPreference;
  outcome: EngineChoiceOutcome;
};

export type EngineMoment<TChoice extends EngineChoice = EngineChoice> = {
  id: string;
  category: string;
  choices: TChoice[];
  director?: {
    phases?: string[];
    scoreStates?: string[];
    minuteRange?: [number, number];
    rarity?: "common" | "uncommon" | "rare";
    cooldown?: number;
    family?: string;
    conversionModifier?: number;
  };
  chainRoutes?: string[];
};

export type TeamMatchModel = {
  teamXg: number;
  opponentXg: number;
  teamGoals: number;
  opponentGoals: number;
  teamAttackEvents: number;
  opponentAttackEvents: number;
};

export type EngineSimEventType = "team_goal" | "opponent_goal" | "team_chance" | "opponent_chance" | "tempo" | "substitution";

export type EngineSimEvent = {
  id: string;
  type: EngineSimEventType;
  minute: number;
  title: string;
  detail: string;
  teamGoalDelta: number;
  opponentGoalDelta: number;
  ratingDelta: number;
  trustDelta: number;
  fitnessDelta: number;
};

export function createTeamMatchModel(input: {
  matchSeed: string;
  teamStrength: number;
  trust: number;
  formScore: number;
  venue: EngineVenue;
  serviceLevel: ServiceLevel;
  opponentProfile: OpponentProfile;
}): TeamMatchModel;

export function createSimEvents(input: {
  matchSeed: string;
  model: TeamMatchModel;
  opponentShort: string;
  teamShort?: string;
  managerInstruction: string;
}): EngineSimEvent[];

export function getSimScoreAtMinute(events: EngineSimEvent[], minute: number): {
  teamGoals: number;
  opponentGoals: number;
};

export function selectPlayerHighlights<TMoment extends EngineMoment>(input: {
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
}): TMoment[];

export function getMomentGenerationScore(input: {
  moment: EngineMoment;
  attributeValues: Record<string, number>;
  role: EngineMatchRole;
  serviceLevel: ServiceLevel;
  opponentProfile: OpponentProfile;
  matchSeed: string;
  targetMinute: number;
  scoreAtMinute: { teamGoals: number; opponentGoals: number };
  preferredCategories?: string[];
}): number;

export function chooseAutoSimChoice<TChoice extends EngineChoice>(input: {
  moment: EngineMoment<TChoice>;
  attributeValues: Record<string, number>;
  fitness: number;
  trust: number;
  matchSeed: string;
}): TChoice;

export function resolvePlayerChoice(input: {
  moment: EngineMoment;
  choice: EngineChoice;
  attributeValues: Record<string, number>;
  fitness: number;
  trust: number;
  playerRole?: EngineMatchRole;
  opponentProfile?: OpponentProfile;
  resultSeed: string;
}): {
  success: boolean;
  outcomeTier: EngineOutcomeTier;
  chanceQuality: EngineChanceQuality;
  explanationTags: string[];
  rating: number;
  trustDelta: number;
  fitnessDelta: number;
  goals: number;
  assists: number;
  chancesCreated: number;
  decisiveOutcome: boolean;
};

export function estimateChoiceOutcomes(input: {
  moment: EngineMoment;
  choice: EngineChoice;
  attributeValues: Record<string, number>;
  fitness: number;
  trust: number;
  playerRole?: EngineMatchRole;
  opponentProfile?: OpponentProfile;
}): {
  outcomes: Array<{
    label: string;
    percentage: number;
    tone: "negative" | "neutral" | "decisive";
  }>;
};

export function seededNoise(seed: string): number;

export function createSeededRandom(seed: string): () => number;
