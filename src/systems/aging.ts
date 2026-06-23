import { clamp } from "../utils";
import type { Attribute } from "../types";

// Without any longevity investment a player peaks at 28 and then declines. Careers can run on
// to ~38, but the decline makes the late years progressively harder — the reason to either
// retire (bank Legacy Points, start the heir) or pay to extend the prime (Stage 2 longevity).
export const PEAK_AGE = 28;
export const HARD_RETIREMENT_AGE = 40;

export function getPlayerAgeFromSeason(seasonNumber: number) {
  return 16 + Math.max(0, seasonNumber - 1);
}

// Effective-ability multiplier from age. 1.0 through the peak, then an accelerating physical
// decline. Raw attributes / XP are NOT touched — this models the body slowing down, not skill
// being lost, so a longevity upgrade that lifts the peak restores full effect. `declineResist`
// (0+) both pushes nothing here (peak is handled by peakAge) and flattens the slope.
export function getAgeModifier(age: number, peakAge: number = PEAK_AGE, declineResist = 0) {
  if (age <= peakAge) {
    return 1;
  }
  const past = age - peakAge;
  const slope = Math.max(0.008, 0.02 - declineResist * 0.002);
  const accel = Math.max(0.0015, 0.0035 - declineResist * 0.0004);
  return clamp(1 - slope * past - accel * past * past, 0.55, 1);
}

// Attributes scaled by the age modifier, for feeding selection/match ability. Identity before
// the peak (no allocation), so there is zero cost for the common young-player case.
export function getAgeAdjustedAttributes(
  attributes: Attribute[],
  age: number,
  peakAge: number = PEAK_AGE,
  declineResist = 0,
): Attribute[] {
  const modifier = getAgeModifier(age, peakAge, declineResist);
  if (modifier >= 1) {
    return attributes;
  }
  return attributes.map((attribute) => ({ ...attribute, value: clamp(Math.round(attribute.value * modifier), 1, 99) }));
}
