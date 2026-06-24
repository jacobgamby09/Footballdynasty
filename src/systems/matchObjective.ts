import { seededNoise } from "../engine/matchEngineCore";
import type { GameState, MatchObjective, MatchObjectiveResult, MatchTotals, UpcomingMatch } from "../types";

// Career landmarks worth a personal milestone objective when the player is one short of reaching them.
const LANDMARKS = [5, 10, 25, 50, 75, 100, 150, 200];

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

// Career goals/assists = past generations + seasons (dynastyHistory) plus the current season so far.
function getCareerTotals(state: GameState): { goals: number; assists: number } {
  const history = state.dynastyHistory ?? [];
  return {
    goals: history.reduce((sum, season) => sum + (season.goals ?? 0), 0) + state.seasonStats.goals,
    assists: history.reduce((sum, season) => sum + (season.assists ?? 0), 0) + state.seasonStats.assists,
  };
}

// Deterministically pick at most one personal objective for an upcoming match, by priority:
// milestone (rare landmark) > rivalry (derby/high-importance) > form (drought) > contract clause
// (routine "prove it", ~half the time). Seeded by fixture id + season so it is stable per fixture.
export function generateMatchObjective(state: GameState, context: UpcomingMatch): MatchObjective | undefined {
  const fixtureTag = `${context.id}-${state.season.season}`;
  const career = getCareerTotals(state);

  const goalLandmark = LANDMARKS.find((landmark) => career.goals === landmark - 1);
  if (goalLandmark) {
    return {
      id: `obj-milestone-goal-${fixtureTag}`,
      type: "goal",
      target: 1,
      label: `Career goal #${goalLandmark}`,
      detail: `One more strike reaches your ${ordinal(goalLandmark)} career goal.`,
      reward: { prestige: 6, cash: 30 },
      source: "milestone",
    };
  }

  const assistLandmark = LANDMARKS.find((landmark) => career.assists === landmark - 1);
  if (assistLandmark) {
    return {
      id: `obj-milestone-assist-${fixtureTag}`,
      type: "assist",
      target: 1,
      label: `Career assist #${assistLandmark}`,
      detail: `Set one up to reach your ${ordinal(assistLandmark)} career assist.`,
      reward: { prestige: 5, cash: 25 },
      source: "milestone",
    };
  }

  if (context.matchImportance === "High") {
    return {
      id: `obj-rivalry-${fixtureTag}`,
      type: "rating",
      target: 7,
      label: "Rise to the occasion",
      detail: `Put in a 7.0+ shift against ${context.opponentShort}.`,
      reward: { prestige: 5, trust: 2 },
      source: "rivalry",
    };
  }

  if (state.seasonStats.apps >= 3 && state.seasonStats.goals === 0) {
    return {
      id: `obj-form-${fixtureTag}`,
      type: "goal",
      target: 1,
      label: "End the drought",
      detail: "Open your account for the season.",
      reward: { trust: 3, prestige: 2 },
      source: "form",
    };
  }

  if (state.contract.goalBonus > 0 && seededNoise(`${fixtureTag}-objective`) < 0.5) {
    return {
      id: `obj-contract-${fixtureTag}`,
      type: "goal",
      target: 1,
      label: "Repay the faith",
      detail: `Score to trigger your $${state.contract.goalBonus} goal bonus.`,
      reward: { prestige: 3, trust: 1 },
      source: "contract",
    };
  }

  return undefined;
}

// Evaluate an objective against the finished match. A player who never appeared cannot complete one.
export function evaluateMatchObjective(objective: MatchObjective, totals: MatchTotals, playerAppeared: boolean): MatchObjectiveResult {
  const progress =
    objective.type === "goal" ? totals.goals : objective.type === "assist" ? totals.assists : totals.rating;
  const completed = playerAppeared && progress >= objective.target;
  return { objective, completed, progress };
}

// A short post-match line for the career-impact list / feed.
export function getObjectiveResultLine(result: MatchObjectiveResult): string {
  const reward = result.objective.reward;
  const bits = [
    reward.cash ? `+$${reward.cash}` : "",
    reward.prestige ? `+${reward.prestige} prestige` : "",
    reward.trust ? `+${reward.trust} trust` : "",
  ].filter(Boolean);
  return result.completed
    ? `Objective met: ${result.objective.label}${bits.length ? ` (${bits.join(", ")})` : ""}.`
    : `Objective missed: ${result.objective.label}.`;
}
