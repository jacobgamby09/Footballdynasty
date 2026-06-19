import type { ClubSeasonRecord, LeagueSeason, LeagueTierId, World, WorldClub, WorldLeague } from "../types";
import { clamp } from "../utils";
import { baseLeagueTeams } from "./fixtures";
import { contractMarketClubs, initialClub, leagueTiers } from "./leagues";

// Bottom -> top. Drives promotion/relegation direction (used from Stage 2).
const TIER_ORDER: LeagueTierId[] = [
  "grassroots-dev",
  "local-semi-pro",
  "regional-pro",
  "national-pro",
  "top-flight",
  "elite",
];

const CLUBS_PER_LEAGUE = 12;

// Deterministic name pools for generated (higher-tier) clubs. No RNG: selection is
// indexed by a global counter so generated names stay unique and stable.
const CITY_POOL = [
  "Ashford", "Brookvale", "Crestwood", "Dawnport", "Elmsworth", "Fairhaven",
  "Graniton", "Havenbrook", "Irongate", "Kingsmere", "Lakemont", "Marsh End",
  "Norwick", "Oakvale", "Pinecliff", "Queensford", "Ravenhill", "Stormgate",
  "Thornwick", "Updale", "Westmoor", "Whitlock", "Yarborough", "Ridgeway",
  "Stonefield", "Highmoor", "Blackwater", "Greycastle", "Redhill", "Silverbrook",
];
const SUFFIX_POOL = ["FC", "United", "City", "Athletic", "Rovers", "Town", "County", "Albion"];

type ClubSpec = { name: string; shortCode?: string; shortName?: string; strength?: number };

function shortNameOf(name: string) {
  return name.replace(/\s+(FC|United|Athletic|Borough|Works|Town|City|Crown|County|Albion|Rovers|1902)$/i, "").split(" ")[0] || name;
}

function makeShortCode(name: string, used: Set<string>) {
  const letters = name.split(/\s+/).map((part) => part[0]).join("").toUpperCase();
  let base = (letters.length >= 3 ? letters : name.replace(/\s+/g, "").toUpperCase()).slice(0, 3);
  if (base.length < 2) base = (base + "XX").slice(0, 3);
  let code = base;
  let n = 1;
  while (used.has(code)) {
    code = (base.slice(0, 2) + n).toUpperCase();
    n += 1;
  }
  used.add(code);
  return code;
}

// Pre-seeded real clubs per tier, reusing existing names so the early game is
// unchanged and named market clubs become real world entities.
function seedSpecsForTier(tierId: LeagueTierId): ClubSpec[] {
  if (tierId === "grassroots-dev") {
    return [
      { name: initialClub.name, shortCode: initialClub.shortCode, shortName: initialClub.shortName, strength: initialClub.strength },
      ...baseLeagueTeams.map((team) => ({ name: team.name, shortCode: team.short, strength: team.strength })),
    ];
  }
  return contractMarketClubs
    .filter((club) => club.tierId === tierId)
    .map((club) => ({ name: club.club, shortCode: club.short }));
}

export function emptyClubSeasonRecord(clubId: string): ClubSeasonRecord {
  return { clubId, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

export function seedWorld(): World {
  const clubs: Record<string, WorldClub> = {};
  const leagues: Record<string, WorldLeague> = {};
  const leagueSeasons: Record<string, LeagueSeason> = {};
  const usedCodes = new Set<string>();
  let generatedCounter = 0;

  TIER_ORDER.forEach((tierId, tierIndex) => {
    const tier = leagueTiers[tierId];
    const leagueId = `lg-${tierId}`;
    const clubIds: string[] = [];

    const specs = seedSpecsForTier(tierId).slice(0, CLUBS_PER_LEAGUE);
    while (specs.length < CLUBS_PER_LEAGUE) {
      const city = CITY_POOL[generatedCounter % CITY_POOL.length];
      const suffix = SUFFIX_POOL[Math.floor(generatedCounter / CITY_POOL.length) % SUFFIX_POOL.length];
      specs.push({ name: `${city} ${suffix}` });
      generatedCounter += 1;
    }

    const [lo, hi] = tier.teamRange;
    specs.forEach((spec, slot) => {
      const id = `${tierId}-${slot}`;
      const shortCode = spec.shortCode && !usedCodes.has(spec.shortCode)
        ? (usedCodes.add(spec.shortCode), spec.shortCode)
        : makeShortCode(spec.name, usedCodes);
      const strength = spec.strength ?? clamp(Math.round(lo + ((hi - lo) * slot) / (CLUBS_PER_LEAGUE - 1)), lo, hi);
      const reputation = Math.round(tierIndex * 15 + 10 + (strength - tier.averageOvr));
      clubs[id] = {
        id,
        name: spec.name,
        shortName: spec.shortName ?? shortNameOf(spec.name),
        shortCode,
        leagueId,
        tierId,
        strength,
        reputation,
      };
      clubIds.push(id);
    });

    leagues[leagueId] = {
      id: leagueId,
      name: tier.name,
      tierId,
      clubIds,
      promotionSlots: tierIndex === TIER_ORDER.length - 1 ? 0 : 2,
      relegationSlots: tierIndex === 0 ? 0 : 2,
    };
    leagueSeasons[leagueId] = {
      leagueId,
      records: Object.fromEntries(clubIds.map((id) => [id, emptyClubSeasonRecord(id)])),
    };
  });

  return { seasonNumber: 1, clubs, leagues, leagueSeasons, tierOrder: [...TIER_ORDER] };
}
