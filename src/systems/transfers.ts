import { seededNoise } from "../engine/matchEngineCore";
import { getPositionModule } from "../positionRoles";
import { clamp } from "../utils";
import { getAverageRating } from "./formatting";
import { calculateOvr, getContractLeagueTier, getLeagueTierIndex } from "./ovr";
import { getCurrentFixture } from "./seasonState";
import { getSelectionReport } from "./selection";
import type { ClubState, GameState, LastMatchSummary, WorldClub } from "../types";

export type InterestedClub = { club: WorldClub; interest: number };

// Which clubs in the persistent world would take the player right now. Pure read of
// game.world (no contracts import — keeps the import graph acyclic; contracts.ts
// depends on this module, not the other way around). See WORLD_MODEL.md, Stage 3.
export function getInterestedWorldClubs(game: GameState, lastMatch?: LastMatchSummary): InterestedClub[] {
  const world = game.world;
  if (!world) return [];

  const currentTier = getContractLeagueTier(game.contract);
  const currentTierIndex = getLeagueTierIndex(currentTier.id);
  const selection = getSelectionReport(game, getCurrentFixture(game.season));
  const averageRating = getAverageRating(game.seasonStats.ratings);
  const ovr = calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights);
  const formSignal =
    Math.max(0, averageRating - 6.4) * 8 + game.seasonStats.goals * 1.6 + game.seasonStats.assists * 1.2 + (lastMatch?.rating ?? 6.5) - 6.5;
  // Can reach one tier above the current level when the player is clearly outperforming it.
  const maxReachableTierIndex = clamp(
    currentTierIndex + (ovr >= currentTier.averageOvr + 8 || formSignal >= 12 ? 1 : 0),
    0,
    world.tierOrder.length - 1,
  );
  const seed = `${game.week}-${game.season.season}-${game.club.shortCode}-${selection.score}-${game.prestige}-world-transfer`;

  return Object.values(world.clubs)
    .filter((club) => club.shortCode !== game.club.shortCode)
    .filter((club) => getLeagueTierIndex(club.tierId) <= maxReachableTierIndex)
    .map((club) => {
      const tierGap = getLeagueTierIndex(club.tierId) - currentTierIndex;
      const lowerTierBias = tierGap < 0 ? 16 : tierGap === 0 ? 9 : -10;
      // Higher-reputation clubs are pickier: they cool on a player who is below their level.
      const reputationResistance = Math.max(0, club.reputation - (ovr + game.prestige * 0.5)) * 0.5;
      const interest =
        selection.score * 0.42 +
        ovr * 0.4 +
        game.prestige * 0.24 +
        formSignal +
        lowerTierBias -
        reputationResistance +
        seededNoise(`${seed}-${club.id}`) * 18;
      return { club, interest };
    })
    .filter((entry) => entry.interest >= 28)
    .sort((a, b) => b.interest - a.interest);
}

// Map a world club to the player's embedded club state on transfer. Uses the world
// club's exact short code so the player's results feed that club's world standings.
export function worldClubToClubState(club: WorldClub): ClubState {
  return {
    name: club.name,
    shortName: club.shortName,
    shortCode: club.shortCode,
    tierId: club.tierId,
    strength: club.strength,
  };
}
