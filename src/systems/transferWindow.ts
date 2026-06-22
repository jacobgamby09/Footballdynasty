import { getPositionModule } from "../positionRoles";
import { getAverageRating } from "./formatting";
import { getClubLeagueTier } from "./ovr";
import { calculateOvr } from "./ovr";
import { getClubContractOffer, getTransferMarketOffers } from "./contracts";
import { isSeasonComplete } from "./seasonState";
import type { ClubFitStatus, ContractOffer, GameState, LastMatchSummary, TransferWindowKind, TransferWindowState } from "../types";

export function getTransferWindowId(game: GameState, kind: TransferWindowKind) {
  return `s${game.season.season}-${kind}`;
}

export function getPendingTransferWindowKind(game: GameState): TransferWindowKind | undefined {
  const played = game.season.results.length;
  const total = game.season.fixtures.length;
  if (total <= 0) {
    return undefined;
  }

  if (isSeasonComplete(game.season)) {
    return "end-season";
  }

  const midPoint = Math.floor(total / 2);
  if (played === midPoint) {
    return "mid-season";
  }

  return undefined;
}

export function createTransferWindowState(game: GameState, lastMatch?: LastMatchSummary): TransferWindowState | undefined {
  const kind = getPendingTransferWindowKind(game);
  if (!kind) {
    return undefined;
  }

  const id = getTransferWindowId(game, kind);
  if (game.transferWindow?.id === id) {
    return game.transferWindow;
  }

  const allOffers = getTransferMarketOffers(game, lastMatch).filter((offer) => offer.club !== game.club.name);
  const offerLimit = kind === "end-season" ? 3 : 2;
  const offers = dedupeOffers(allOffers).slice(0, offerLimit);
  const currentClubOffer = getCurrentClubWindowOffer(game, lastMatch, kind);
  const clubFit = getClubFitStatus(game);
  const interestLevel = offers.length > 0 ? "Offers" : getInterestLevel(game, clubFit);

  return {
    id,
    kind,
    title: kind === "mid-season" ? "Mid-season window" : "Season decisions",
    week: game.week,
    clubFit,
    clubFitSummary: getClubFitSummary(game, clubFit),
    interestLevel,
    currentClubOffer,
    offers,
  };
}

export function getClubFitStatus(game: GameState): ClubFitStatus {
  const tier = getClubLeagueTier(game.club);
  const ovr = calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights);
  const fitGap = ovr - Math.round((tier.averageOvr + game.club.strength) / 2);

  if (fitGap >= 9) {
    return "Outgrown";
  }
  if (fitGap >= 3) {
    return "Good fit";
  }
  if (fitGap >= -6) {
    return "Developing";
  }
  return "Under level";
}

export function getClubFitSummary(game: GameState, status = getClubFitStatus(game)) {
  const tier = getClubLeagueTier(game.club);
  const ovr = calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights);

  if (status === "Outgrown") {
    return `Your ${ovr} OVR is ahead of the ${tier.name} level. Bigger clubs should start watching.`;
  }
  if (status === "Good fit") {
    return `Your ${ovr} OVR belongs at this level, but strong form can open the next step.`;
  }
  if (status === "Developing") {
    return `Your ${ovr} OVR is still building toward the ${tier.name} standard. Minutes matter.`;
  }
  return `Your ${ovr} OVR is below this level. Staying patient may protect your development.`;
}

export function getNextTransferWindowLabel(game: GameState) {
  const total = game.season.fixtures.length;
  const played = game.season.results.length;
  if (total <= 0) {
    return "Window pending";
  }
  if (isSeasonComplete(game.season)) {
    return "Open now";
  }
  const midPoint = Math.floor(total / 2);
  if (played < midPoint) {
    return `${midPoint - played} matches`;
  }
  return `${total - played} matches`;
}

function getInterestLevel(game: GameState, clubFit: ClubFitStatus): TransferWindowState["interestLevel"] {
  const averageRating = getAverageRating(game.seasonStats.ratings);
  const output = game.seasonStats.goals + game.seasonStats.assists;
  if (clubFit === "Outgrown" || averageRating >= 7.1 || output >= 12) {
    return "Interested";
  }
  if (clubFit === "Good fit" || averageRating >= 6.7 || output >= 6 || game.prestige >= 500) {
    return "Watched";
  }
  return "Quiet";
}

function getCurrentClubWindowOffer(game: GameState, lastMatch: LastMatchSummary | undefined, kind: TransferWindowKind): ContractOffer | undefined {
  const offer = getClubContractOffer(game, lastMatch);
  if (offer?.source === "current-club") {
    return offer;
  }
  if (kind === "end-season") {
    const seasonOffer = getClubContractOffer({ ...game, contract: { ...game.contract, weeksRemaining: 1 } }, lastMatch);
    return seasonOffer?.source === "current-club" ? seasonOffer : undefined;
  }
  return undefined;
}

function dedupeOffers(offers: ContractOffer[]) {
  const seen = new Set<string>();
  return offers.filter((offer) => {
    const key = offer.clubId ?? offer.club;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
