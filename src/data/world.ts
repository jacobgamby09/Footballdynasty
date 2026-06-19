import type { ClubSeasonRecord, Country, CountryId, LeagueSeason, LeagueTierId, World, WorldClub, WorldLeague } from "../types";
import { clamp } from "../utils";
import { baseLeagueTeams } from "./fixtures";
import { contractMarketClubs, initialClub, leagueTiers } from "./leagues";

// Global quality tiers, bottom -> top. The existing 6 bands ARE the global tier scale:
// "elite" = tier 1 (best in the world) ... "grassroots-dev" = tier 6 (global bottom).
const TIER_ORDER: LeagueTierId[] = [
  "grassroots-dev",
  "local-semi-pro",
  "regional-pro",
  "national-pro",
  "top-flight",
  "elite",
];

// Each country's divisions, top -> bottom, as the global tier each division maps to.
// Big-3 reach tier 1 (6 divisions); mid countries top at tier 2 (5 divisions). All
// countries reach tier 6 so any start country begins at the global bottom.
const BIG3_TIERS: LeagueTierId[] = ["elite", "top-flight", "national-pro", "regional-pro", "local-semi-pro", "grassroots-dev"];
const MID_TIERS: LeagueTierId[] = ["top-flight", "national-pro", "regional-pro", "local-semi-pro", "grassroots-dev"];

const COUNTRIES: Country[] = [
  { id: "england", name: "England", tiers: BIG3_TIERS },
  { id: "spain", name: "Spain", tiers: BIG3_TIERS },
  { id: "italy", name: "Italy", tiers: BIG3_TIERS },
  { id: "germany", name: "Germany", tiers: MID_TIERS },
  { id: "france", name: "France", tiers: MID_TIERS },
  { id: "holland", name: "Holland", tiers: MID_TIERS },
  { id: "denmark", name: "Denmark", tiers: MID_TIERS },
];

const TIER1_CLUBS = 20;
const DEFAULT_CLUBS = 16;

// Deterministic generated-club name pools (no RNG). 40 x 16 = 640 unique combos,
// enough for the ~600 generated clubs; a global counter walks them so names are stable.
const CITY_POOL = [
  "Ashford", "Brookvale", "Crestwood", "Dawnport", "Elmsworth", "Fairhaven", "Graniton", "Havenbrook",
  "Irongate", "Kingsmere", "Lakemont", "Marsh End", "Norwick", "Oakvale", "Pinecliff", "Queensford",
  "Ravenhill", "Stormgate", "Thornwick", "Updale", "Westmoor", "Whitlock", "Yarborough", "Ridgeway",
  "Stonefield", "Highmoor", "Blackwater", "Greycastle", "Redhill", "Silverbrook", "Carrowmore", "Dunmere",
  "Eastcliff", "Foxhollow", "Goldcrest", "Hartwell", "Lynwood", "Maybridge", "Northgate", "Roseport",
];
const SUFFIX_POOL = ["FC", "United", "City", "Athletic", "Rovers", "Town", "County", "Albion", "Wanderers", "Sporting", "Real", "Dynamo", "Olympic", "Borough", "Park", "Castle"];

type ClubSpec = { name: string; shortCode?: string; shortName?: string; strength?: number };

function shortNameOf(name: string) {
  return name.replace(/\s+(FC|United|Athletic|Borough|Works|Town|City|Crown|County|Albion|Rovers|Wanderers|Sporting|Dynamo|Olympic|Park|Castle|1902)$/i, "").split(" ")[0] || name;
}

function makeShortCode(name: string, used: Set<string>) {
  const letters = name.split(/\s+/).map((part) => part[0]).join("").toUpperCase();
  let base = (letters.length >= 3 ? letters : name.replace(/\s+/g, "").toUpperCase()).slice(0, 3);
  if (base.length < 2) base = (base + "XX").slice(0, 3);
  let code = base;
  let n = 1;
  while (used.has(code)) {
    // Unbounded n guarantees a fresh string (codes may grow past 3 chars when a
    // prefix is popular — fine; they only need to be unique). Bounding n here would
    // loop forever once a prefix's variants are exhausted across ~620 clubs.
    code = (base.slice(0, 2) + n).toUpperCase();
    n += 1;
  }
  used.add(code);
  return code;
}

// Real, named clubs for a given country/tier — reuses the existing Danish-flavoured
// names so the player's start country has identity. Everything else is generated.
function namedSpecsFor(countryId: CountryId, tierId: LeagueTierId): ClubSpec[] {
  if (countryId !== "denmark") return [];
  if (tierId === "grassroots-dev") {
    return [
      { name: initialClub.name, shortCode: initialClub.shortCode, shortName: initialClub.shortName, strength: initialClub.strength },
      ...baseLeagueTeams.map((team) => ({ name: team.name, shortCode: team.short, strength: team.strength })),
    ];
  }
  return contractMarketClubs.filter((club) => club.tierId === tierId).map((club) => ({ name: club.club, shortCode: club.short }));
}

export function emptyClubSeasonRecord(clubId: string): ClubSeasonRecord {
  return { clubId, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

export function seedWorld(): World {
  const countries: Record<string, Country> = {};
  const clubs: Record<string, WorldClub> = {};
  const leagues: Record<string, WorldLeague> = {};
  const leagueSeasons: Record<string, LeagueSeason> = {};
  const usedCodes = new Set<string>();
  let generatedCounter = 0;

  for (const country of COUNTRIES) {
    countries[country.id] = country;

    country.tiers.forEach((tierId, levelIndex) => {
      const level = levelIndex + 1;
      const tier = leagueTiers[tierId];
      const tierIndex = TIER_ORDER.indexOf(tierId);
      const leagueId = `${country.id}-${level}`;
      const clubCount = tierId === "elite" ? TIER1_CLUBS : DEFAULT_CLUBS;
      const isTop = level === 1;
      const isBottom = level === country.tiers.length;

      const specs = namedSpecsFor(country.id, tierId).slice(0, clubCount);
      while (specs.length < clubCount) {
        const city = CITY_POOL[generatedCounter % CITY_POOL.length];
        const suffix = SUFFIX_POOL[Math.floor(generatedCounter / CITY_POOL.length) % SUFFIX_POOL.length];
        specs.push({ name: `${city} ${suffix}` });
        generatedCounter += 1;
      }

      const [lo, hi] = tier.teamRange;
      const clubIds: string[] = [];
      specs.forEach((spec, slot) => {
        const id = `${leagueId}-${slot}`;
        const shortCode = spec.shortCode && !usedCodes.has(spec.shortCode)
          ? (usedCodes.add(spec.shortCode), spec.shortCode)
          : makeShortCode(spec.name, usedCodes);
        const strength = spec.strength ?? clamp(Math.round(lo + ((hi - lo) * slot) / (clubCount - 1)), lo, hi);
        const reputation = Math.round(tierIndex * 15 + 10 + (strength - tier.averageOvr));
        clubs[id] = { id, name: spec.name, shortName: spec.shortName ?? shortNameOf(spec.name), shortCode, leagueId, tierId, strength, reputation };
        clubIds.push(id);
      });

      leagues[leagueId] = {
        id: leagueId,
        name: `${country.name} Div ${level}`,
        countryId: country.id,
        level,
        tierId,
        clubIds,
        // tier1<->tier2 boundary = 3, all others = 2; top has no promotion, bottom no relegation.
        promotionSlots: isTop ? 0 : country.tiers[levelIndex - 1] === "elite" ? 3 : 2,
        relegationSlots: isBottom ? 0 : tierId === "elite" ? 3 : 2,
      };
      leagueSeasons[leagueId] = { leagueId, records: Object.fromEntries(clubIds.map((id) => [id, emptyClubSeasonRecord(id)])) };
    });
  }

  return { seasonNumber: 1, countries, clubs, leagues, leagueSeasons, tierOrder: [...TIER_ORDER] };
}
