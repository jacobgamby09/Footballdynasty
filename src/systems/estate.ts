import { clamp } from "../utils";
import type { DynastyState, GameState } from "../types";

// Family trust fund (Stage 3) — the late-career cash sink that serves the dynasty. Cash you
// invest here is gone (a real sink, distinct from Legacy Points which buy talent); in return
// each future heir inherits a stronger MATERIAL starting base. Because cash buys speed and
// longevity but NOT the OVR ceiling (the soft cap binds), a rich heir develops faster and
// affords longevity/potential sooner, yet still peaks near their generation's potential —
// so the trust fund never breaks the 60/70 generational curve.

const ESTATE_BASE_COST = 40000;
const ESTATE_HEIR_CASH_PER_SQRT = 9000;
const ESTATE_HEIR_CASH_CAP = 60000;

// Escalating cash cost for the next trust-fund level — small fortunes at high levels, so it
// absorbs late-career surplus across multiple careers.
export function getEstateCost(level: number) {
  return Math.round(ESTATE_BASE_COST * (1 + level * 0.45 + level * level * 0.08));
}

// The heir's inherited starting-cash bonus. sqrt-scaled (diminishing → no cross-generation
// snowball) and hard-capped so it never trivialises the early game.
export function getEstateHeirCash(dynasty: Pick<DynastyState, "estate">) {
  return clamp(Math.round(ESTATE_HEIR_CASH_PER_SQRT * Math.sqrt(Math.max(0, dynasty.estate ?? 0))), 0, ESTATE_HEIR_CASH_CAP);
}

export function investEstateState(state: GameState): GameState {
  const level = state.dynasty.estate ?? 0;
  const cost = getEstateCost(level);
  if (state.cash < cost) {
    return state;
  }
  return {
    ...state,
    cash: state.cash - cost,
    dynasty: { ...state.dynasty, estate: level + 1 },
    lastEvent: `Invested $${cost.toLocaleString()} in the family trust fund. Your heir's starting base grows.`,
  };
}
