import type { GameState, MatchTotals, SponsorDeal, SponsorPayout } from "../types";

export const sponsorDefinitions: SponsorDeal[] = [
  {
    id: "hometown-kit",
    name: "Hometown Kit Deal",
    tierLabel: "Local Favourite",
    prestigeRequired: 120,
    weeklyRetainer: 14,
    objectiveBonus: 45,
    objective: { type: "appearance", target: 1, label: "Make an appearance" },
    pressureModifier: -1,
    weeksRemaining: 6,
    summary: "Your hometown club shop wants your name on a shirt. Small money, friendly terms — the first to believe in you.",
  },
  {
    id: "local-boot-room",
    name: "Local Boot Room",
    tierLabel: "Known Talent",
    prestigeRequired: 350,
    weeklyRetainer: 35,
    objectiveBonus: 120,
    objective: { type: "goal", target: 1, label: "Score 1 goal" },
    pressureModifier: 1,
    weeksRemaining: 8,
    summary: "Small local boot shop. Modest weekly cash, real upside when you score.",
  },
  {
    id: "recovery-drink",
    name: "Recovery Drink",
    tierLabel: "Known Talent",
    prestigeRequired: 350,
    weeklyRetainer: 28,
    objectiveBonus: 90,
    objective: { type: "rating", target: 7, label: "Earn 7.0+ rating" },
    pressureModifier: 0,
    weeksRemaining: 6,
    summary: "A low-risk starter deal built around strong all-round performances.",
  },
  {
    id: "academy-ambassador",
    name: "Academy Ambassador",
    tierLabel: "Known Talent",
    prestigeRequired: 350,
    weeklyRetainer: 24,
    objectiveBonus: 75,
    objective: { type: "appearance", target: 1, label: "Make an appearance" },
    pressureModifier: -1,
    weeksRemaining: 6,
    summary: "Community-facing deal. Smaller cash, but very stable and low pressure.",
  },
  {
    id: "regional-sportswear",
    name: "Regional Sportswear",
    tierLabel: "Regional Name",
    prestigeRequired: 1_500,
    weeklyRetainer: 95,
    objectiveBonus: 260,
    objective: { type: "goal", target: 1, label: "Score 1 goal" },
    pressureModifier: 3,
    weeksRemaining: 10,
    summary: "A proper regional campaign. Better money, higher expectations.",
  },
  {
    id: "technical-gear",
    name: "Technical Gear Partner",
    tierLabel: "Regional Name",
    prestigeRequired: 1_500,
    weeklyRetainer: 80,
    objectiveBonus: 220,
    objective: { type: "assist", target: 1, label: "Create 1 assist" },
    pressureModifier: 2,
    weeksRemaining: 10,
    summary: "Pays for visible creative output rather than goals.",
  },
];

export function getAvailableSponsorDeals(game: GameState) {
  if (game.sponsor) {
    return [];
  }

  return sponsorDefinitions.filter((deal) => game.prestige >= deal.prestigeRequired);
}

export function acceptSponsorDealState(state: GameState, dealId: string): GameState {
  if (state.sponsor) {
    return state;
  }

  const deal = sponsorDefinitions.find((item) => item.id === dealId);
  if (!deal || state.prestige < deal.prestigeRequired) {
    return state;
  }

  return {
    ...state,
    sponsor: cloneSponsorDeal(deal),
    lastEvent: `${deal.name} sponsor deal accepted.`,
  };
}

export function advanceSponsorWeek(sponsor?: SponsorDeal) {
  if (!sponsor) {
    return undefined;
  }

  const weeksRemaining = sponsor.weeksRemaining - 1;
  if (weeksRemaining <= 0) {
    return undefined;
  }

  return { ...sponsor, objective: { ...sponsor.objective }, weeksRemaining };
}

export function getSponsorPayout(sponsor: SponsorDeal | undefined, totals: MatchTotals, playerAppeared: boolean): SponsorPayout {
  if (!sponsor) {
    return {
      retainer: 0,
      objectiveBonus: 0,
      total: 0,
      objectiveCompleted: false,
    };
  }

  const objectiveCompleted = isSponsorObjectiveCompleted(sponsor, totals, playerAppeared);
  const objectiveBonus = objectiveCompleted ? sponsor.objectiveBonus : 0;

  return {
    retainer: sponsor.weeklyRetainer,
    objectiveBonus,
    total: sponsor.weeklyRetainer + objectiveBonus,
    objectiveCompleted,
    sponsorName: sponsor.name,
  };
}

export function cloneSponsorDeal(sponsor: SponsorDeal): SponsorDeal {
  return {
    ...sponsor,
    objective: { ...sponsor.objective },
  };
}

function isSponsorObjectiveCompleted(sponsor: SponsorDeal, totals: MatchTotals, playerAppeared: boolean) {
  switch (sponsor.objective.type) {
    case "appearance":
      return playerAppeared;
    case "goal":
      return totals.goals >= sponsor.objective.target;
    case "assist":
      return totals.assists >= sponsor.objective.target;
    case "rating":
      return playerAppeared && totals.rating >= sponsor.objective.target;
  }
}
