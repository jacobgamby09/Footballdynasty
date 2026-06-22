import { contractMarketClubs, leagueTiers } from "../data/leagues";
import { seededNoise } from "../engine/matchEngineCore";
import { getPositionModule } from "../positionRoles";
import { clamp } from "../utils";
import { createClubStateFromOffer, rebuildSeasonForClub } from "./club";
import { getAverageRating, roundToNearest } from "./formatting";
import { calculateOvr, getContractLeagueTier, getLeagueTierIndex } from "./ovr";
import { getPrestigeLeverageScore } from "./prestige";
import { getCurrentFixture } from "./seasonState";
import { getPlayerMatchRole, getRoleThreshold, getSelectionReport } from "./selection";
import { getAgentSigningBonusLeverage, getAgentWageLeverage, getSupportLevel, getSupportTrackBreakthroughCount } from "./support";
import { getInterestedWorldClubs, worldClubToClubState } from "./transfers";
import type { MatchRole } from "../positionRoles";
import type { Contract, ContractOffer, GameState, LastMatchSummary, LeagueTier, MatchTotals, WorldClub } from "../types";

export function getMatchContractEarnings(contract: Contract, totals: Pick<MatchTotals, "goals" | "assists">, madeSquad: boolean) {
  const appearanceBonus = madeSquad ? contract.appearanceBonus : 0;
  const goalBonus = totals.goals * contract.goalBonus;
  const assistBonus = totals.assists * contract.assistBonus;
  const weeklyWage = contract.weeklyWage;

  return {
    weeklyWage,
    appearanceBonus,
    goalBonus,
    assistBonus,
    total: weeklyWage + appearanceBonus + goalBonus + assistBonus,
  };
}

function getTierWageCap(tier: LeagueTier, role: MatchRole) {
  const roleCapRatio: Record<MatchRole, number> = {
    Bench: 0.45,
    "Impact Sub": 0.58,
    "Rotation Starter": 0.74,
    Starter: 0.9,
  };
  return Math.round(tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * roleCapRatio[role]);
}


function getContractLeverage(agentLevel: number, careerBreakthroughs: number) {
  return 1 + getAgentWageLeverage(agentLevel) + careerBreakthroughs * 0.018;
}

function getSigningBonusLeverage(agentLevel: number, careerBreakthroughs: number) {
  return 1 + getAgentSigningBonusLeverage(agentLevel) + careerBreakthroughs * 0.03;
}


function buildContractBonuses(weeklyWage: number, source: "current" | "external" | "season" = "current") {
  const sourceBase = source === "season" ? { app: 12, goal: 20, assist: 16 } : source === "external" ? { app: 8, goal: 14, assist: 10 } : { app: 8, goal: 14, assist: 11 };
  return {
    appearanceBonus: roundToNearest(sourceBase.app + weeklyWage * 0.08, 5),
    goalBonus: roundToNearest(sourceBase.goal + weeklyWage * 0.14, 5),
    assistBonus: roundToNearest(sourceBase.assist + weeklyWage * 0.11, 5),
  };
}


export function advanceContractWeek(contract: Contract): Contract {
  return {
    ...contract,
    weeksRemaining: Math.max(0, contract.weeksRemaining - 1),
  };
}


export function contractFromOffer(offer: ContractOffer): Contract {
  return {
    club: offer.club,
    tierId: offer.tierId,
    label: offer.label,
    weeklyWage: offer.weeklyWage,
    weeksRemaining: offer.weeks,
    rolePromise: offer.rolePromise,
    appearanceBonus: offer.appearanceBonus,
    goalBonus: offer.goalBonus,
    assistBonus: offer.assistBonus,
    pressureModifier: offer.pressureModifier,
  };
}


export function acceptContractOfferState(state: GameState, chosen?: ContractOffer): GameState {
  const offer = chosen ?? state.contractOffer ?? state.contractOffers?.[0];
  if (!offer) {
    return state;
  }
  const worldClub = offer.clubId ? state.world?.clubs[offer.clubId] : undefined;
  const nextClub =
    offer.source === "external-club"
      ? worldClub
        ? worldClubToClubState(worldClub)
        : createClubStateFromOffer(offer, state.club)
      : state.club;

  return {
    ...state,
    cash: state.cash + offer.signingBonus,
    club: nextClub,
    season: offer.source === "external-club" ? rebuildSeasonForClub(state.season, nextClub, state.world) : state.season,
    contract: contractFromOffer(offer),
    contractOffer: undefined,
    contractOffers: undefined,
    lastEvent: `${offer.title} accepted. ${offer.club} now pays $${offer.weeklyWage}/wk.`,
  };
}

// Transfer-market offers when a contract has expired. The player gets a single offer
// from the most interested world club, OR — when genuinely in demand (several clubs
// strongly interested) — a choice of up to 3, spread across tiers so the terms differ
// (a higher club offering a smaller role/more wage vs. a same-tier starting role).
// See WORLD_MODEL.md, Stage 3b.
export function getTransferMarketOffers(game: GameState, lastMatch?: LastMatchSummary): ContractOffer[] {
  const currentTier = getContractLeagueTier(game.contract);

  if (game.world) {
    const interested = getInterestedWorldClubs(game, lastMatch);
    if (interested.length > 0) {
      const STRONG_INTEREST = 58;
      const strongCount = interested.filter((entry) => entry.interest >= STRONG_INTEREST).length;
      const count = clamp(strongCount, 1, 3);
      const chosen: typeof interested = [];
      const tiersUsed = new Set<string>();
      for (const entry of interested) {
        if (chosen.length >= count) break;
        if (!tiersUsed.has(entry.club.tierId)) { chosen.push(entry); tiersUsed.add(entry.club.tierId); }
      }
      for (const entry of interested) {
        if (chosen.length >= count) break;
        if (!chosen.includes(entry)) chosen.push(entry);
      }
      return chosen.map((entry) => buildOfferFromWorldClub(game, entry.club, currentTier, lastMatch));
    }
  }

  const single = getExpiredContractMarketOffer(game, lastMatch);
  return single ? [single] : [];
}


export function getClubContractOffer(game: GameState, lastMatch?: LastMatchSummary): ContractOffer | undefined {
  const current = game.contract;
  if (current.weeksRemaining <= 0) {
    return getExpiredContractMarketOffer(game, lastMatch);
  }

  const selection = getSelectionReport(game, getCurrentFixture(game.season));
  const averageRating = getAverageRating(game.seasonStats.ratings);
  const ovr = calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights);
  const prestigeLeverage = getPrestigeLeverageScore(game.prestige);
  const agentLevel = getSupportLevel(game, "agentNegotiation");
  const careerBreakthroughs = getSupportTrackBreakthroughCount(game, "career");
  const rolePromise = getPromisedRole(selection.score, current.rolePromise);
  const expiringSoon = current.weeksRemaining <= 1;
  const performanceSpike = Boolean(
    lastMatch &&
      lastMatch.rating >= 7.4 &&
      (lastMatch.goals > 0 || lastMatch.assists > 0 || lastMatch.selectionAfter >= lastMatch.selectionBefore + 6),
  );
  const roleBase: Record<MatchRole, number> = {
    Bench: 45,
    "Impact Sub": 75,
    "Rotation Starter": 130,
    Starter: 220,
  };
  const formBonus = Math.max(0, averageRating - 6.2) * 26;
  const outputBonus = Math.min(80, game.seasonStats.goals * 3 + game.seasonStats.assists * 2);
  const selectionWage = 34 + selection.score * 0.55 + ovr * 0.55 + formBonus + outputBonus;
  const rawWage = Math.max(current.weeklyWage + (expiringSoon ? 20 : 0), roleBase[rolePromise], selectionWage);
  const contractTier = getContractLeagueTier(current);
  const weeklyWage = roundToNearest(clamp(rawWage * getContractLeverage(agentLevel, careerBreakthroughs), contractTier.wageRange[0], getTierWageCap(contractTier, rolePromise)), 5);
  const meaningfulUpgrade = weeklyWage >= current.weeklyWage + 15 || rolePromise !== current.rolePromise;

  if (!expiringSoon && (!performanceSpike || !meaningfulUpgrade)) {
    return undefined;
  }

  const pressureModifier = rolePromise === "Starter" ? 8 : rolePromise === "Rotation Starter" ? 5 : rolePromise === "Impact Sub" ? 2 : 0;
  const title = current.weeksRemaining <= 0 ? "New club terms" : meaningfulUpgrade ? "Improved club offer" : "Extension offer";
  const weeks = rolePromise === "Starter" ? 12 : rolePromise === "Rotation Starter" ? 10 : 8;
  const bonuses = buildContractBonuses(weeklyWage);

  return {
    club: current.club,
    label: rolePromise === "Starter" ? "First team deal" : rolePromise === "Rotation Starter" ? "Rotation deal" : "Development deal",
    title,
    weeklyWage,
    weeks,
    rolePromise,
    appearanceBonus: bonuses.appearanceBonus,
    goalBonus: bonuses.goalBonus,
    assistBonus: bonuses.assistBonus,
    signingBonus: roundToNearest(weeklyWage * (expiringSoon ? 0.7 : 0.35) * getSigningBonusLeverage(agentLevel, careerBreakthroughs), 10),
    pressureModifier,
    summary: getContractOfferSummary(rolePromise, weeklyWage, current.weeklyWage),
    source: "current-club",
    tierId: contractTier.id,
  };
}


export function getExpiredContractMarketOffer(game: GameState, lastMatch?: LastMatchSummary): ContractOffer | undefined {
  const currentTier = getContractLeagueTier(game.contract);

  // Stage 3: when a world exists, the transfer market is the real world. Pick the most
  // interested world club (falling back to any grassroots club) and build the offer
  // from that club. The legacy static-list path below stays as a fallback.
  if (game.world) {
    const interested = getInterestedWorldClubs(game, lastMatch);
    const club =
      interested[0]?.club ??
      Object.values(game.world.clubs).find((c) => c.tierId === "grassroots-dev" && c.shortCode !== game.club.shortCode);
    if (club) {
      return buildOfferFromWorldClub(game, club, currentTier, lastMatch);
    }
  }

  const currentTierIndex = getLeagueTierIndex(currentTier.id);
  const selection = getSelectionReport(game, getCurrentFixture(game.season));
  const averageRating = getAverageRating(game.seasonStats.ratings);
  const ovr = calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights);
  const prestigeLeverage = getPrestigeLeverageScore(game.prestige);
  const agentLevel = getSupportLevel(game, "agentNegotiation");
  const careerBreakthroughs = getSupportTrackBreakthroughCount(game, "career");
  const formSignal = Math.max(0, averageRating - 6.4) * 8 + game.seasonStats.goals * 1.6 + game.seasonStats.assists * 1.2 + (lastMatch?.rating ?? 6.5) - 6.5;
  const maxReachableTierIndex = clamp(
    currentTierIndex + (ovr >= currentTier.averageOvr + 8 || formSignal >= 12 ? 1 : 0),
    0,
    Object.keys(leagueTiers).length - 1,
  );
  const seed = `${game.week}-${game.season.season}-${game.contract.club}-${selection.score}-${game.prestige}-expired-market`;
  const candidates = contractMarketClubs
    .filter((club) => club.club !== game.contract.club)
    .filter((club) => getLeagueTierIndex(club.tierId) <= maxReachableTierIndex)
    .map((club) => {
      const tierIndex = getLeagueTierIndex(club.tierId);
      const tierGap = tierIndex - currentTierIndex;
      const lowerTierBias = tierGap < 0 ? 16 : tierGap === 0 ? 9 : -10;
      const interest =
        selection.score * 0.42 +
        ovr * 0.4 +
        prestigeLeverage * 0.24 +
        formSignal +
        club.roleBias +
        lowerTierBias +
        seededNoise(`${seed}-${club.short}`) * 18;
      return { ...club, interest };
    })
    .filter((club) => club.interest >= 28)
    .sort((a, b) => b.interest - a.interest);

  const club = candidates[0] ?? contractMarketClubs.find((candidate) => candidate.tierId === "grassroots-dev" && candidate.club !== game.contract.club);
  if (!club) {
    return undefined;
  }

  const tier = leagueTiers[club.tierId];
  const rolePromise = getPromisedRole(selection.score + club.roleBias + (getLeagueTierIndex(club.tierId) < currentTierIndex ? 8 : 0), "Bench");
  const leverage = getContractLeverage(agentLevel, careerBreakthroughs);
  const roleWage: Record<MatchRole, number> = {
    Bench: tier.wageRange[0],
    "Impact Sub": tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * 0.28,
    "Rotation Starter": tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * 0.52,
    Starter: tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * 0.78,
  };
  const rawWage = roleWage[rolePromise] + Math.max(0, ovr - tier.averageOvr) * 5 + formSignal * 3;
  const weeklyWage = roundToNearest(clamp(rawWage * club.wageFactor * leverage, tier.wageRange[0], getTierWageCap(tier, rolePromise)), 5);
  const pressureModifier = rolePromise === "Starter" ? 7 : rolePromise === "Rotation Starter" ? 4 : rolePromise === "Impact Sub" ? 1 : -1;
  const bonuses = buildContractBonuses(weeklyWage, "external");

  return {
    club: club.club,
    label: rolePromise === "Starter" ? "First team deal" : rolePromise === "Rotation Starter" ? "Rotation deal" : "Fresh start deal",
    title: "Free agent offer",
    weeklyWage,
    weeks: rolePromise === "Starter" ? 12 : 8,
    rolePromise,
    appearanceBonus: bonuses.appearanceBonus,
    goalBonus: bonuses.goalBonus,
    assistBonus: bonuses.assistBonus,
    signingBonus: roundToNearest(weeklyWage * 0.3 * getSigningBonusLeverage(agentLevel, careerBreakthroughs), 10),
    pressureModifier,
    summary: getExternalContractOfferSummary(club.club, tier, currentTier, rolePromise, weeklyWage, game.contract.weeklyWage),
    source: "external-club",
    tierId: club.tierId,
  };
}


function buildOfferFromWorldClub(game: GameState, club: WorldClub, currentTier: LeagueTier, lastMatch?: LastMatchSummary): ContractOffer {
  const currentTierIndex = getLeagueTierIndex(currentTier.id);
  const tier = leagueTiers[club.tierId];
  const tierIndex = getLeagueTierIndex(club.tierId);
  const selection = getSelectionReport(game, getCurrentFixture(game.season));
  const averageRating = getAverageRating(game.seasonStats.ratings);
  const ovr = calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights);
  const agentLevel = getSupportLevel(game, "agentNegotiation");
  const careerBreakthroughs = getSupportTrackBreakthroughCount(game, "career");
  const formSignal =
    Math.max(0, averageRating - 6.4) * 8 + game.seasonStats.goals * 1.6 + game.seasonStats.assists * 1.2 + (lastMatch?.rating ?? 6.5) - 6.5;
  const rolePromise = getPromisedRole(selection.score + (tierIndex < currentTierIndex ? 8 : 0), "Bench");
  const leverage = getContractLeverage(agentLevel, careerBreakthroughs);
  // Reputation nudges wage within the tier band (seedWorld bases reputation on tierIndex*15+10).
  const reputationFactor = clamp(0.92 + (club.reputation - (tierIndex * 15 + 10)) * 0.01, 0.85, 1.15);
  const roleWage: Record<MatchRole, number> = {
    Bench: tier.wageRange[0],
    "Impact Sub": tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * 0.28,
    "Rotation Starter": tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * 0.52,
    Starter: tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * 0.78,
  };
  const rawWage = roleWage[rolePromise] + Math.max(0, ovr - tier.averageOvr) * 5 + formSignal * 3;
  const weeklyWage = roundToNearest(clamp(rawWage * reputationFactor * leverage, tier.wageRange[0], getTierWageCap(tier, rolePromise)), 5);
  const pressureModifier = rolePromise === "Starter" ? 7 : rolePromise === "Rotation Starter" ? 4 : rolePromise === "Impact Sub" ? 1 : -1;
  const bonuses = buildContractBonuses(weeklyWage, "external");

  return {
    club: club.name,
    clubId: club.id,
    label: rolePromise === "Starter" ? "First team deal" : rolePromise === "Rotation Starter" ? "Rotation deal" : "Fresh start deal",
    title: "Transfer offer",
    weeklyWage,
    weeks: rolePromise === "Starter" ? 12 : 8,
    rolePromise,
    appearanceBonus: bonuses.appearanceBonus,
    goalBonus: bonuses.goalBonus,
    assistBonus: bonuses.assistBonus,
    signingBonus: roundToNearest(weeklyWage * 0.3 * getSigningBonusLeverage(agentLevel, careerBreakthroughs), 10),
    pressureModifier,
    summary: getExternalContractOfferSummary(club.name, tier, currentTier, rolePromise, weeklyWage, game.contract.weeklyWage),
    source: "external-club",
    tierId: club.tierId,
  };
}


export function getExternalContractOfferSummary(club: string, tier: LeagueTier, currentTier: LeagueTier, rolePromise: MatchRole, weeklyWage: number, currentWage: number) {
  const wageText =
    weeklyWage > currentWage
      ? `The wage improves to $${weeklyWage}/wk`
      : weeklyWage === currentWage
        ? `The wage matches your old $${currentWage}/wk`
        : `The wage drops to $${weeklyWage}/wk`;
  const tierText = tier.id === currentTier.id ? "at your current level" : `in ${tier.name}`;
  return `${club} offers a ${rolePromise} path ${tierText}. ${wageText}, but this is a fresh start after letting the deal run down.`;
}


export function getContractStatusLabel(game: GameState) {
  if (game.contractOffer) {
    return "Offer ready";
  }
  if (game.contract.weeksRemaining <= 0) {
    return "Expired";
  }
  if (game.contract.weeksRemaining <= 1) {
    return "Expiring";
  }
  if (game.contract.weeksRemaining <= 3) {
    return "Review soon";
  }
  return "Secure";
}


export function getPromisedRole(selectionScore: number, currentRole: MatchRole): MatchRole {
  const earnedRole = getPlayerMatchRole(selectionScore);
  return getRoleThreshold(earnedRole) >= getRoleThreshold(currentRole) ? earnedRole : currentRole;
}


export function getContractOfferSummary(rolePromise: MatchRole, weeklyWage: number, currentWage: number) {
  if (weeklyWage > currentWage && rolePromise === "Starter") {
    return "The club is ready to treat you as a first-team player, with pressure to match.";
  }
  if (weeklyWage > currentWage) {
    return "Your season earned a better weekly wage and stronger match bonuses.";
  }
  return "The club keeps you on the pathway, but wants another season before a bigger promise.";
}

