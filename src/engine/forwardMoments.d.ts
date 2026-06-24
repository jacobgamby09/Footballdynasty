import type { ForwardHighlightCategory } from "../matchEngine";
import type { PositionMomentPool } from "../positionRoles";

export type ForwardMomentRisk = "Low" | "Medium" | "High";
export type ForwardMomentManagerRead = "Likes" | "Neutral" | "Risky";
export type ForwardMomentOutcome = "goal" | "assist" | "trust" | "defense";

export type ForwardMomentChoice = {
  id: string;
  label: string;
  uses: string[];
  risk: ForwardMomentRisk;
  reward: string;
  manager: ForwardMomentManagerRead;
  outcome: ForwardMomentOutcome;
};

export type ForwardMatchMoment = {
  id: string;
  category: ForwardHighlightCategory;
  minute: number;
  opponent: string;
  situation: string;
  context: string;
  choices: ForwardMomentChoice[];
  director?: {
    phases?: string[];
    scoreStates?: Array<"level" | "leading" | "trailing">;
    minuteRange?: [number, number];
    rarity?: "common" | "uncommon" | "rare";
    cooldown?: number;
    family?: string;
    conversionModifier?: number;
  };
  chainRoutes?: string[];
};

export function createForwardMatchPool(input: {
  opponentShort: string;
  managerInstruction: string;
  tacticalFocus: string;
  fitness: number;
}): ForwardMatchMoment[];

export function createSharedMatchPool(input: PositionMatchPoolInput): ForwardMatchMoment[];
export function createWingerMatchPool(input: PositionMatchPoolInput): ForwardMatchMoment[];
export function createMidfielderMatchPool(input: PositionMatchPoolInput): ForwardMatchMoment[];
export function createFullbackMatchPool(input: PositionMatchPoolInput): ForwardMatchMoment[];
export function createCenterbackMatchPool(input: PositionMatchPoolInput): ForwardMatchMoment[];
export function createPositionMatchPool(input: PositionMatchPoolInput & { momentPools?: PositionMomentPool[] }): ForwardMatchMoment[];

export type PositionMatchPoolInput = {
  opponentShort: string;
  managerInstruction: string;
  tacticalFocus: string;
  fitness: number;
};
