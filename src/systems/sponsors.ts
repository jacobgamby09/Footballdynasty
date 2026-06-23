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
  {
    id: "national-energy",
    name: "National Energy Drink",
    tierLabel: "National Profile",
    prestigeRequired: 7_500,
    weeklyRetainer: 200,
    objectiveBonus: 650,
    objective: { type: "goal", target: 1, label: "Score 1 goal" },
    pressureModifier: 3,
    weeksRemaining: 12,
    summary: "A national brand wants you fronting the campaign — real money, real expectations.",
  },
  {
    id: "broadcast-feature",
    name: "Broadcast Feature Spot",
    tierLabel: "National Profile",
    prestigeRequired: 7_500,
    weeklyRetainer: 165,
    objectiveBonus: 520,
    objective: { type: "rating", target: 7.2, label: "Earn 7.2+ rating" },
    pressureModifier: 2,
    weeksRemaining: 10,
    summary: "Recurring broadcast spot. Steady money for consistent, high-rated performances.",
  },
  {
    id: "boot-flagship",
    name: "Boot Brand Flagship",
    tierLabel: "Star Player",
    prestigeRequired: 20_000,
    weeklyRetainer: 620,
    objectiveBonus: 2_000,
    objective: { type: "goal", target: 1, label: "Score 1 goal" },
    pressureModifier: 4,
    weeksRemaining: 12,
    summary: "Flagship boot deal — you are the face of the line. Big money, big pressure to deliver.",
  },
  {
    id: "lifestyle-label",
    name: "Lifestyle Label",
    tierLabel: "Star Player",
    prestigeRequired: 20_000,
    weeklyRetainer: 520,
    objectiveBonus: 1_600,
    objective: { type: "assist", target: 1, label: "Create 1 assist" },
    pressureModifier: 3,
    weeksRemaining: 12,
    summary: "A lifestyle label built around your flair and creativity rather than raw goals.",
  },
  {
    id: "global-kit",
    name: "Global Kit Partner",
    tierLabel: "Icon",
    prestigeRequired: 50_000,
    weeklyRetainer: 1_500,
    objectiveBonus: 5_000,
    objective: { type: "goal", target: 1, label: "Score 1 goal" },
    pressureModifier: 5,
    weeksRemaining: 14,
    summary: "A global kit partner. Iconic money, and the whole world watching every match.",
  },
  {
    id: "prestige-watch",
    name: "Luxury Watch House",
    tierLabel: "Icon",
    prestigeRequired: 50_000,
    weeklyRetainer: 1_200,
    objectiveBonus: 4_000,
    objective: { type: "rating", target: 7.5, label: "Earn 7.5+ rating" },
    pressureModifier: 4,
    weeksRemaining: 12,
    summary: "A luxury watch house aligning with your elite, week-in week-out consistency.",
  },
  {
    id: "legacy-campaign",
    name: "Global Legacy Campaign",
    tierLabel: "Legend",
    prestigeRequired: 100_000,
    weeklyRetainer: 3_200,
    objectiveBonus: 9_500,
    objective: { type: "goal", target: 1, label: "Score 1 goal" },
    pressureModifier: 5,
    weeksRemaining: 16,
    summary: "A career-defining global campaign. Legend money for a legend's output.",
  },
  {
    id: "signature-brand",
    name: "Signature Brand",
    tierLabel: "Legend",
    prestigeRequired: 100_000,
    weeklyRetainer: 2_600,
    objectiveBonus: 8_000,
    objective: { type: "rating", target: 7.5, label: "Earn 7.5+ rating" },
    pressureModifier: 5,
    weeksRemaining: 16,
    summary: "Your own signature brand — the bloodline's name on the product.",
  },
];

export function getAvailableSponsorDeals(game: GameState) {
  if (game.sponsor) {
    return [];
  }

  // Only the deals that match the player's CURRENT standing: the highest prestige
  // band they have unlocked. A star isn't pestered with the $14 hometown kit, and the
  // ladder feels progressive as bigger brands replace smaller ones on the way up.
  const unlocked = sponsorDefinitions.filter((deal) => game.prestige >= deal.prestigeRequired);
  if (unlocked.length === 0) {
    return [];
  }
  const topThreshold = Math.max(...unlocked.map((deal) => deal.prestigeRequired));
  return unlocked.filter((deal) => deal.prestigeRequired === topThreshold);
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
