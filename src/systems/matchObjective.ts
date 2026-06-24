import type { MatchObjective, MatchObjectiveResult, SponsorDeal } from "../types";

// Personal match objective = the player's current sponsor's matchday target. Only present while a
// sponsor deal is active (sponsors are earned over time). The actual bonus is paid by the sponsor
// system (getSponsorPayout); this is purely the player-facing presentation of that stake, so
// reward.cash mirrors the sponsor bonus for display only and is NEVER applied a second time.
export function getSponsorMatchObjective(sponsor: SponsorDeal | undefined): MatchObjective | undefined {
  if (!sponsor) return undefined;
  return {
    id: `sponsor-${sponsor.id}`,
    type: sponsor.objective.type,
    target: sponsor.objective.target,
    label: sponsor.objective.label,
    detail: `Deliver to bank ${sponsor.name}'s $${sponsor.objectiveBonus} matchday bonus.`,
    reward: { cash: sponsor.objectiveBonus },
    source: "sponsor",
  };
}

// A short post-match line for the career-impact list / feed.
export function getObjectiveResultLine(result: MatchObjectiveResult): string {
  const bonus = result.objective.reward.cash;
  return result.completed
    ? `Sponsor objective met: ${result.objective.label}${bonus ? ` (+$${bonus})` : ""}.`
    : `Sponsor objective missed: ${result.objective.label}.`;
}
