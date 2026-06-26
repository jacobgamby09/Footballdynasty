// Player-moment "chain highlight" — a cinematic, beat-by-beat reveal woven around an ALREADY-resolved
// MatchResult. This is PRESENTATION ONLY: the same result the static popup showed, delivered as a short
// sequence of beats that build tension before the payoff.
//
// Guarantees (by construction):
//  - Pure + deterministic: seeds off matchSeed/moment/choice, so the same moment always tells the same
//    story and a reload mid-popup is identical.
//  - Touches NOTHING in the engine: it only reads a resolved MatchResult. It never alters
//    goals/assists/XP/trust, so the season-lab End OVR baseline is unaffected.
//  - Adds NO persisted state: the chain is recomputed on render from data already on the result/moment.
import { seededNoise } from "../engine/matchEngineCore";
import type { MatchChoice, MatchMoment, MatchResult } from "../types";

export type HighlightBeatKind = "setup" | "action" | "pressure" | "chance" | "outcome" | "impact";
export type HighlightBeatTone =
  | "neutral"
  | "build"
  | "danger"
  | "positive"
  | "goal"
  | "near"
  | "negative";
export type HighlightBeatEmphasis = "normal" | "strong" | "major";

export type HighlightBeat = {
  kind: HighlightBeatKind;
  text: string;
  /** Optional secondary line (used by the outcome beat for the detailed commentary). */
  sub?: string;
  tone: HighlightBeatTone;
  emphasis: HighlightBeatEmphasis;
};

function pick(items: string[], seed: string): string {
  if (items.length === 0) return "";
  const index = Math.floor(seededNoise(seed) * items.length) % items.length;
  return items[index] ?? items[0];
}

// --- Beat banks ----------------------------------------------------------------------------------
// Modular by intent so a small bank yields lots of perceived variation. Selection is seeded.

const ACTION_BY_OUTCOME: Record<string, string[]> = {
  goal: ["You back yourself", "No second thoughts", "You go for the throat", "You shape to finish"],
  assist: ["Head up, you pick the pass", "You spot it early", "You play for the team", "You look for the runner"],
  trust: ["You do the ugly work", "You take responsibility", "You keep it simple", "You hold your nerve"],
  defense: ["You read the danger", "You get across", "You step in", "You snuff it out"],
};

const PRESSURE_TIGHT = [
  "A centre-back is glued to your shoulder.",
  "The angle's tight and closing fast.",
  "Two defenders collapse around you.",
  "You're stretching, half off balance.",
];
const PRESSURE_LOOSE = [
  "A defender closes, but you've got the half-yard.",
  "There's just enough space to work in.",
  "You feel the marker, but the picture's clear.",
  "One touch to set yourself — the gap holds.",
];

const CHANCE_BY_CATEGORY: Record<string, string[]> = {
  shot: ["The ball sits up perfectly for the shot.", "A yard opens up on the edge of the box."],
  first_time_finish: ["It drops to you first time — no time to think.", "The cross arrives right onto your boot."],
  run_behind: ["You time the run — the last line is beaten.", "You're away, the keeper rushing out to meet you."],
  hold_up: ["You shield it, support breaking past you.", "Back to goal, you feel the runners arriving."],
  aerial_duel: ["The ball hangs — this header is yours to attack.", "You rise above your marker at the back post."],
  press: ["You spring the trap and the defender panics.", "You force the error high up the pitch."],
  link_up: ["The one-two is on, space opening ahead.", "A teammate peels off — the lane is there."],
  counter: ["Acres of space ahead on the break.", "It's three-on-two and you're flying."],
  defensive_set_piece: ["The delivery hangs into your zone.", "You track your man as the ball drops."],
  late_pressure: ["The whole ground senses it — this is the moment.", "Deep into stoppage time, one last push."],
};
const CHANCE_ASSIST = [
  "Your runner's gone — the far post is wide open.",
  "A teammate is screaming for it in the box.",
  "The killer ball is on if you weight it right.",
];
const CHANCE_GENERIC = ["The opening is there if you take it.", "A half-gap appears in front of you."];

const SETUP_FALLBACK = ["The move builds and the ball finds you.", "You drop into the pocket and call for it."];

// --- Outcome tone --------------------------------------------------------------------------------
// Mirrors getPayoffStamp's gradient but kept local so this module stays engine-independent.
function outcomeTone(result: MatchResult): { tone: HighlightBeatTone; emphasis: HighlightBeatEmphasis } {
  if (result.screamer) return { tone: "goal", emphasis: "major" };
  if (result.goals > 0 || result.assists > 0) return { tone: "goal", emphasis: "strong" };
  if (result.chancesCreated > 0) return { tone: "positive", emphasis: "strong" };
  if (result.outcomeTier === "Great") return { tone: "positive", emphasis: "strong" };
  if (result.success) return { tone: "neutral", emphasis: "normal" };
  // Failed: a missed/saved shot or pass reads as a near-miss; losing the ball reads negative.
  const attacking = result.choiceOutcome === "goal" || result.choiceOutcome === "assist";
  return { tone: attacking ? "near" : "negative", emphasis: "normal" };
}

type Drama = "routine" | "notable" | "big";
function dramaOf(result: MatchResult): Drama {
  const decisive =
    result.goals > 0 || result.assists > 0 || result.screamer || result.outcomeTier === "Great";
  if (decisive || result.definingMoment) return "big";
  const hardChance = result.chanceQuality === "Difficult chance" || result.chanceQuality === "Half chance";
  if (!result.success || hardChance) return "notable";
  return "routine";
}

/**
 * Build the ordered beat chain for one resolved moment. `moment`/`choice` may be undefined for an
 * auto-resolved/legacy result — the chain degrades gracefully with generic copy.
 */
export function buildHighlightChain(input: {
  result: MatchResult;
  moment?: MatchMoment;
  choice?: MatchChoice;
  seed: string;
}): HighlightBeat[] {
  const { result, moment, choice, seed } = input;
  const drama = dramaOf(result);
  const beats: HighlightBeat[] = [];

  // 1. Setup — lean on the authored, position-specific situation copy.
  beats.push({
    kind: "setup",
    text: moment?.situation?.trim() || pick(SETUP_FALLBACK, `${seed}-setup`),
    tone: "neutral",
    emphasis: "normal",
  });

  // 2. Action — what the player committed to (weaves in the chosen option).
  const actionBank = ACTION_BY_OUTCOME[choice?.outcome ?? "trust"] ?? ACTION_BY_OUTCOME.trust;
  const actionLead = pick(actionBank, `${seed}-action`);
  beats.push({
    kind: "action",
    text: choice ? `${actionLead} — ${choice.label.toLowerCase()}.` : `${actionLead}.`,
    tone: "neutral",
    emphasis: "normal",
  });

  // 3 / 4. Tension — pressure and/or chance, scaled by drama.
  const tight = result.chanceQuality === "Difficult chance" || result.chanceQuality === "Half chance" || !result.success;
  const pressureBeat: HighlightBeat = {
    kind: "pressure",
    text: pick(tight ? PRESSURE_TIGHT : PRESSURE_LOOSE, `${seed}-pressure`),
    tone: tight ? "danger" : "build",
    emphasis: "normal",
  };
  const chanceBank =
    choice?.outcome === "assist"
      ? CHANCE_ASSIST
      : (moment && CHANCE_BY_CATEGORY[moment.category]) || CHANCE_GENERIC;
  const chanceBeat: HighlightBeat = {
    kind: "chance",
    text: pick(chanceBank, `${seed}-chance`),
    tone: "build",
    emphasis: drama === "big" ? "strong" : "normal",
  };

  if (drama === "big") {
    beats.push(pressureBeat, chanceBeat);
  } else if (drama === "notable") {
    beats.push(result.success ? chanceBeat : pressureBeat);
  }
  // routine: straight from action to the outcome — keeps low-stakes moments snappy.

  // 5. Outcome — the payoff (reuses the resolved title/detail; the popup adds the stamp + heat chip).
  const tone = outcomeTone(result);
  beats.push({
    kind: "outcome",
    text: result.title,
    sub: result.detail,
    tone: tone.tone,
    emphasis: tone.emphasis,
  });

  // 6. Impact — the reward tally (the popup renders count-up tiles; text carries the "why").
  beats.push({
    kind: "impact",
    text: result.performanceReasons[0] ?? "",
    tone: "neutral",
    emphasis: "normal",
  });

  return beats;
}
