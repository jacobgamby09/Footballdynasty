import type { ClubState, ContractOffer, Fixture, LeagueTeam, LeagueTierId, SeasonState, Venue, World } from "../types";
import type { OpponentForm, ServiceLevel } from "../matchEngine";
import { contractMarketClubs, leagueTiers } from "../data/leagues";
import { baseLeagueTeams, seasonFixtures } from "../data/fixtures";
import { clamp } from "../utils";

const FIXTURE_FORMS: OpponentForm[] = ["Poor", "Mixed", "Good", "Hot"];
const FIXTURE_SERVICES: ServiceLevel[] = ["Low", "Mixed", "Good"];

// Deterministic [0,1) hash (FNV-1a). No Math.random / Date.now (would break the
// sim-lab and save-resume): same seed -> same value, different seeds spread out.
function fixtureHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// Build the player's season fixtures from their REAL league in the world, so the
// opponents match the player's country (a Spanish side faces Spanish clubs, etc.).
// Falls back to the legacy static (Danish-flavoured) schedule only when the club
// can't be located in the world — e.g. pre-world saves or sim-lab states.
export function createSeasonFixturesFromWorld(club: ClubState, world?: World): Fixture[] {
  if (!world) return createSeasonFixtures(club);

  const playerWorldClub = club.clubId ? world.clubs[club.clubId] : undefined;
  const league = playerWorldClub
    ? world.leagues[playerWorldClub.leagueId]
    : Object.values(world.leagues).find((l) => l.clubIds.some((id) => world.clubs[id]?.shortCode === club.shortCode));
  if (!league) return createSeasonFixtures(club);

  const opponents = league.clubIds
    .map((id) => world.clubs[id])
    .filter((c) => c && c.shortCode !== club.shortCode && c.id !== club.clubId);
  if (opponents.length === 0) return createSeasonFixtures(club);

  const tier = leagueTiers[club.tierId];
  // Double round-robin: the player faces every other club home AND away, so the
  // season length tracks the league size (16 clubs -> 30 matches, a 20-club tier-1
  // -> 38). The first leg uses one venue per opponent; the second leg (same order)
  // swaps it, so each club is played once home and once away. The world advances one
  // matchweek per player match, so the standings stay consistent (every club plays
  // the same number of games).
  const makeFixture = (opponent: (typeof opponents)[number], index: number, venue: Venue): Fixture => {
    const seed = `${club.shortCode}|s${world.seasonNumber}|${opponent.id}|${index}`;
    return {
      id: `md${index + 1}-${opponent.shortCode.toLowerCase()}`,
      opponent: opponent.name,
      opponentShort: opponent.shortName,
      venue,
      competition: tier.name,
      opponentStrength: clamp(opponent.strength, tier.teamRange[0], tier.teamRange[1]),
      opponentForm: FIXTURE_FORMS[Math.floor(fixtureHash(`${seed}|form`) * FIXTURE_FORMS.length) % FIXTURE_FORMS.length],
      serviceLevel: FIXTURE_SERVICES[Math.floor(fixtureHash(`${seed}|svc`) * FIXTURE_SERVICES.length) % FIXTURE_SERVICES.length],
    };
  };
  const firstLeg = opponents.map((opponent, i) => makeFixture(opponent, i, i % 2 === 0 ? "Away" : "Home"));
  const secondLeg = opponents.map((opponent, i) =>
    makeFixture(opponent, opponents.length + i, i % 2 === 0 ? "Home" : "Away"),
  );
  return [...firstLeg, ...secondLeg];
}

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

export function rebuildSeasonForClub(season: SeasonState, club: ClubState, world?: World): SeasonState {
  const nextFixtures = createSeasonFixturesFromWorld(club, world);
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
