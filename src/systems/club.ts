import type { ClubState, ContractOffer, Fixture, LeagueTeam, LeagueTierId, SeasonState } from "../types";
import { contractMarketClubs, leagueTiers } from "../data/leagues";
import { baseLeagueTeams, seasonFixtures } from "../data/fixtures";
import { clamp } from "../utils";

export function createSeasonFixtures(club: ClubState): Fixture[] {
  const tier = leagueTiers[club.tierId];
  const strengthOffset = tier.averageOvr - leagueTiers["grassroots-dev"].averageOvr;
  return seasonFixtures.map((fixture, index) => {
    const isClubOpponent = fixture.opponent === club.name || fixture.opponentShort === club.shortName || fixture.opponentShort === club.shortCode;
    const fallbackOpponent = baseLeagueTeams[(index + 1) % baseLeagueTeams.length] ?? baseLeagueTeams[0];
    return {
      ...fixture,
      opponent: isClubOpponent ? fallbackOpponent.name : fixture.opponent,
      opponentShort: isClubOpponent ? fallbackOpponent.short : fixture.opponentShort,
      competition: fixture.competition.includes("Cup") ? `${tier.name} Cup` : tier.name,
      opponentStrength: clamp(fixture.opponentStrength + strengthOffset, tier.teamRange[0], tier.teamRange[1]),
    };
  });
}

export function createLeagueTeams(club: ClubState): LeagueTeam[] {
  const tier = leagueTiers[club.tierId];
  const strengthOffset = tier.averageOvr - leagueTiers["grassroots-dev"].averageOvr;
  const playerTeam = {
    name: club.name,
    short: club.shortCode,
    strength: club.strength,
  };
  const opponents = baseLeagueTeams
    .filter((team) => team.name !== club.name && team.short !== club.shortCode)
    .map((team) => ({
      ...team,
      strength: clamp(team.strength + strengthOffset, tier.teamRange[0], tier.teamRange[1]),
    }));

  return [playerTeam, ...opponents].slice(0, 12);
}

export function createClubStateFromOffer(offer: ContractOffer, fallback: ClubState): ClubState {
  const marketClub = contractMarketClubs.find((club) => club.club === offer.club);
  const tierId = offer.tierId ?? marketClub?.tierId ?? fallback.tierId;
  return {
    name: offer.club,
    shortName: getClubShortName(offer.club),
    shortCode: marketClub?.short ?? getClubShortCode(offer.club),
    tierId,
    strength: getClubStrengthForTier(tierId, marketClub?.roleBias ?? 0),
  };
}

export function rebuildSeasonForClub(season: SeasonState, club: ClubState): SeasonState {
  const nextFixtures = createSeasonFixtures(club);
  return {
    ...season,
    fixtures: nextFixtures.map((fixture, index) => (index < season.fixtureIndex ? season.fixtures[index] ?? fixture : fixture)),
  };
}

export function getClubStrengthForTier(tierId: LeagueTierId, bias = 0) {
  const tier = leagueTiers[tierId];
  return clamp(Math.round(tier.averageOvr + bias), tier.teamRange[0], tier.teamRange[1]);
}

export function getClubShortName(name: string) {
  return name.replace(/\s+(FC|United|Athletic|Borough|Works|Town|City|Crown|1902)$/i, "").split(" ")[0] || name;
}

export function getClubShortCode(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
