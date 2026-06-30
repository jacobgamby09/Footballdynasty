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

// Action banks are kept outcome-neutral on purpose (the goal bank works for a shot OR a header — the
// situation + chance beats carry the "how"). `defense` is used for pressing/defensive moments.
const ACTION_BY_OUTCOME: Record<string, string[]> = {
  goal: [
    "You back yourself.",
    "You go for goal.",
    "You attack the chance.",
    "You commit — no half measures.",
    "You don't hesitate.",
    "You go for the throat.",
    "You decide to be greedy.",
    "You trust your instinct.",
    "You take it early.",
    "You pounce on it.",
    "You pull the trigger.",
    "You make your mind up in a flash.",
    "You fancy this one.",
    "You back your quality.",
    "You seize the moment.",
    "You read it and go.",
    "You take it on.",
    "You go all in.",
    "You let your instincts take over.",
    "You commit to the finish.",
    "You take responsibility for the chance.",
    "You go for it.",
  ],
  assist: [
    "Head up — you look for the runner.",
    "You spot the pass early.",
    "You play for the team.",
    "You wait for the run, then release it.",
    "You pick out a teammate.",
    "You see the better option and take it.",
    "You slide it into the danger zone.",
    "You set up the shot for someone else.",
    "You take a touch and look up.",
    "You play the unselfish ball.",
    "You spot the gap and thread it.",
    "You delay, then pick the moment.",
    "You find the free man.",
    "You weight the pass perfectly.",
    "You square it to a teammate.",
    "You hold it up and lay it off.",
    "You see the run before it's made.",
    "You play the killer ball.",
    "You create instead of forcing the shot.",
    "You drop the shoulder and slide it through.",
    "You set the table for a teammate.",
    "You play it first time into space.",
  ],
  trust: [
    "You do the simple thing well.",
    "You take responsibility.",
    "You keep it ticking.",
    "You hold your nerve.",
    "You do the ugly work.",
    "You make the smart, safe choice.",
    "You protect the ball.",
    "You don't force it.",
    "You take the sensible option.",
    "You keep the move alive.",
    "You slow it down and reset.",
    "You keep your shape and recycle.",
    "You play within yourself.",
    "You take the percentage option.",
    "You keep it simple under pressure.",
    "You link the play and move on.",
    "You shield it and wait for support.",
    "You make yourself available.",
    "You take the safe touch.",
    "You keep possession ticking over.",
    "You do your job, no frills.",
    "You read it and play it safe.",
  ],
  defense: [
    "You read the danger.",
    "You get across to cover.",
    "You step in.",
    "You snuff it out.",
    "You track back hard.",
    "You put your body on the line.",
    "You stay switched on.",
    "You close the space down.",
    "You stay patient and don't dive in.",
    "You win it back.",
    "You hunt the ball down.",
    "You time the challenge.",
    "You shepherd him away from goal.",
    "You hold your position.",
    "You jockey and force the mistake.",
    "You nick it cleanly.",
    "You cut out the danger.",
    "You stand him up and delay.",
  ],
};

const PRESSURE_TIGHT = [
  "A defender is glued to your shoulder.",
  "The angle's tight and closing fast.",
  "Two defenders collapse around you.",
  "You're stretching, half off balance.",
  "There's barely a yard to work in.",
  "A boot comes flying in at you.",
  "You're hemmed in against the touchline.",
  "The marker won't give you a moment.",
  "No time, no space.",
  "You take it under real pressure.",
  "Bodies everywhere — the box is packed.",
  "A defender's breathing down your neck.",
  "You're surrounded the instant it arrives.",
  "The challenge comes in late and hard.",
  "You've got a defender draped all over you.",
  "It's a scramble and you're off balance.",
  "The keeper's already rushing out at you.",
  "You're squeezed onto your weaker side.",
  "The cover reads it and steps across.",
  "You've got a split second before it's gone.",
];
const PRESSURE_LOOSE = [
  "A defender closes, but you've got the half-yard.",
  "There's just enough space to work in.",
  "You feel the marker, but the picture's clear.",
  "One touch to set yourself — the gap holds.",
  "You've got a beat before they get there.",
  "Room to pick your head up.",
  "The defender backs off and gives you the yard.",
  "You've found a pocket of space.",
  "Time to do it properly.",
  "The lane stays open just long enough.",
  "You've drifted into the space they left.",
  "The defence is a step too slow.",
  "Half a yard, and that's all you need.",
  "The cover's late; the path is clear.",
  "You've time to take a touch and pick it.",
  "A gap opens up between the lines.",
  "You're in behind with space to attack.",
  "The defender shows you the room and you take it.",
  "Calm enough — the chance is there.",
  "Nobody steps; the space holds.",
];

const CHANCE_BY_CATEGORY: Record<string, string[]> = {
  shot: [
    "The ball sits up perfectly for the shot.",
    "A yard opens up on the edge of the box.",
    "It rolls into your stride, goal in sight.",
    "The keeper's angle looks beatable from here.",
    "You've got a clean sight of goal.",
    "The ball's begging to be hit.",
    "There's a gap at the near post.",
    "You've shifted it onto your shooting side.",
    "The rebound drops invitingly.",
  ],
  first_time_finish: [
    "It drops to you first time — no time to think.",
    "The cross arrives right onto your boot.",
    "The ball's coming in fast and low.",
    "A teammate slides it across the six-yard box.",
    "It bounces up onto your stronger side.",
    "The cutback finds you eight yards out.",
    "It's a tap-in if you get there first.",
    "The ball flashes across the face of goal.",
    "It arrives at pace and you've one touch.",
  ],
  run_behind: [
    "You time the run — the last line is beaten.",
    "You're away, the keeper rushing out to meet you.",
    "The through ball splits them open.",
    "You've got a clear run at goal.",
    "The trap breaks and you're gone.",
    "You're clean through on goal.",
    "It's just you and the keeper now.",
    "The pass drops in behind and you chase it.",
  ],
  hold_up: [
    "You shield it, support breaking past you.",
    "Back to goal, you feel the runners arriving.",
    "You hold the defender off and wait.",
    "The ball sticks and the move builds around you.",
    "You bring others into play.",
    "You take the weight off it and lay it back.",
    "You ride the challenge and keep it.",
    "You buy a second for the runners.",
  ],
  aerial_duel: [
    "The ball hangs — this header is yours to attack.",
    "You rise above your marker at the back post.",
    "The cross floats into your zone.",
    "You get a clean run at the header.",
    "It's a battle in the air and you climb highest.",
    "The delivery's perfect for a header.",
    "You attack the cross with a free run.",
    "You meet it on the rise.",
  ],
  press: [
    "You spring the trap and the defender panics.",
    "You force the error high up the pitch.",
    "The defender's in trouble on the ball.",
    "You sense the loose touch and pounce.",
    "You hunt it down and close the angle.",
    "The back line is rattled by your press.",
    "A heavy touch invites you in.",
    "You smell the turnover.",
  ],
  link_up: [
    "The one-two is on, space opening ahead.",
    "A teammate peels off — the lane is there.",
    "You combine quickly in tight space.",
    "The give-and-go opens the door.",
    "A quick exchange pulls them apart.",
    "The wall pass is on.",
    "You bounce it off a teammate and spin.",
    "A neat triangle opens the middle.",
  ],
  counter: [
    "Acres of space ahead on the break.",
    "It's three-on-two and you're flying.",
    "The counter is on, defenders scrambling back.",
    "You drive into the open field.",
    "The break is quick and you're leading it.",
    "They're caught upfield and you pounce.",
    "Open grass ahead, support either side.",
    "You burst clear on the turnover.",
  ],
  defensive_set_piece: [
    "The delivery hangs into your zone.",
    "You track your man as the ball drops.",
    "The corner swings into a crowded box.",
    "You pick up the runner at the back post.",
    "It's chaos in the six-yard box.",
    "The ball's whipped toward the near post.",
    "You're marking the danger man.",
    "Everyone piles in as the cross comes.",
  ],
  late_pressure: [
    "The whole ground senses it — this is the moment.",
    "Deep into stoppage time, one last push.",
    "The clock's red and you need something.",
    "Last attack of the game, everyone forward.",
    "Nerves jangling, the chance falls late.",
    "It's now or never.",
    "The crowd's on its feet for one final chance.",
    "Seconds left, and it falls to you.",
  ],
};
const CHANCE_ASSIST = [
  "Your runner's gone — the far post is wide open.",
  "A teammate is screaming for it in the box.",
  "The killer ball is on if you weight it right.",
  "Someone's made the run beyond the last man.",
  "There's a teammate free in the middle.",
  "The cutback is begging to be played.",
  "A runner peels off the back post.",
  "The pass into the box is there.",
  "Your strike partner's found space.",
  "There's a free man arriving late.",
  "The overlap's gone and the lane's open.",
  "A teammate's pulled off into the gap.",
];
const CHANCE_GENERIC = [
  "The opening is there if you take it.",
  "A half-gap appears in front of you.",
  "There's a moment to make something happen.",
  "The chance is on — just.",
  "It's there to be seized.",
  "A window opens, briefly.",
  "The picture clears in front of you.",
  "You sense the opportunity.",
  "The space is there for a beat.",
  "It's the kind of moment you live for.",
];

const SETUP_FALLBACK = [
  "The move builds and the ball finds you.",
  "You drop into the pocket and call for it.",
  "Play works its way to your feet.",
  "You get on the ball in a dangerous area.",
  "The ball breaks your way.",
  "The play shifts and you're involved.",
  "You show for it and it arrives.",
  "A teammate looks up and finds you.",
  "The ball comes loose near you.",
  "You drift into the action.",
];

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
  // Self-contained football line keyed by what the player went for. We no longer staple the raw choice
  // label on in lowercase — the situation + chance beats carry the specifics. Pressing/defensive moments
  // that ended in a "trust" outcome read better from the defensive bank ("you close it down") than the
  // possession one ("you keep it ticking"), so route those there; attacking outcomes keep their own bank.
  const baseOutcome = choice?.outcome ?? "trust";
  const defensiveMoment = moment?.category === "press" || moment?.category === "defensive_set_piece";
  const actionKey = defensiveMoment && baseOutcome === "trust" ? "defense" : baseOutcome;
  const actionBank = ACTION_BY_OUTCOME[actionKey] ?? ACTION_BY_OUTCOME.trust;
  beats.push({
    kind: "action",
    text: pick(actionBank, `${seed}-action`),
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
