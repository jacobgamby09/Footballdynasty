import { leagueTiers } from "../data/leagues";
import { getPositionModule } from "../positionRoles";
import type { MatchRole } from "../positionRoles";
import type { ClubId, ClubProfile, GameState, WorldClub } from "../types";
import { clamp } from "../utils";
import { calculateOvr } from "./ovr";
import { findWorldClub, getWorldLeagueTable } from "./world";

function hash01(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function offset(seed: string, range: number) {
  return Math.round((hash01(seed) - 0.5) * range * 2);
}

export function findClubByIdentity(game: GameState, identity?: string): WorldClub | undefined {
  if (!identity) return undefined;
  return (
    findWorldClub(game.world, identity) ??
    Object.values(game.world.clubs).find(
      (club) =>
        club.shortCode === identity ||
        club.shortName === identity ||
        club.name === identity,
    )
  );
}

export function getClubProfile(game: GameState, clubId: ClubId): ClubProfile | undefined {
  const club = game.world.clubs[clubId];
  if (!club) return undefined;
  const league = game.world.leagues[club.leagueId];
  const country = league ? game.world.countries[league.countryId] : undefined;
  const tier = leagueTiers[club.tierId];
  if (!league || !country || !tier) return undefined;

  const table =
    getWorldLeagueTable(game.world, league.id).find((row) => row.clubId === club.id) ?? {
      clubId: club.id,
      name: club.name,
      short: club.shortCode,
      position: league.clubIds.length,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalDifference: 0,
      points: 0,
    };
  const record = game.world.leagueSeasons[league.id]?.records[club.id];
  const played = Math.max(1, record?.played ?? 0);
  const goalsFor = record?.goalsFor ?? 0;
  const goalsAgainst = record?.goalsAgainst ?? 0;
  const pointsPerGame = (record?.points ?? 0) / played;
  const goalDifferencePerGame = (goalsFor - goalsAgainst) / played;
  const unitOvr = {
    keeper: clamp(club.strength + offset(`${club.id}|keeper`, 4), tier.teamRange[0] - 2, tier.teamRange[1] + 2),
    defense: clamp(club.strength + offset(`${club.id}|defense`, 4), tier.teamRange[0] - 2, tier.teamRange[1] + 2),
    midfield: clamp(club.strength + offset(`${club.id}|midfield`, 4), tier.teamRange[0] - 2, tier.teamRange[1] + 2),
    attack: clamp(club.strength + offset(`${club.id}|attack`, 4), tier.teamRange[0] - 2, tier.teamRange[1] + 2),
  };
  const performanceAdjustment = (record?.played ?? 0) > 0 ? (pointsPerGame - 1.25) * 0.22 + goalDifferencePerGame * 0.08 : 0;
  const averageRating = clamp(
    6.35 + (club.strength - tier.averageOvr) * 0.025 + performanceAdjustment,
    5.8,
    7.8,
  );
  const style = getClubStyle(club, unitOvr);
  const playerOvr = calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights);
  const careerFit = getCareerFit(playerOvr, club.strength);

  return {
    club,
    country,
    league,
    tier,
    table,
    unitOvr,
    averageRating: Number(averageRating.toFixed(2)),
    form: getFormLabel(pointsPerGame, goalDifferencePerGame, record?.played ?? 0),
    recentForm: record?.recentForm ?? [],
    style: style.label,
    styleDetail: style.detail,
    strength: getUnitLabel(unitOvr, true),
    weakness: getUnitLabel(unitOvr, false),
    cleanSheets: record?.cleanSheets ?? 0,
    goalsPerMatch: Number((goalsFor / played).toFixed(2)),
    concededPerMatch: Number((goalsAgainst / played).toFixed(2)),
    facilityLabel:
      tier.facilityLevel >= 5 ? "Elite" : tier.facilityLevel >= 4 ? "Excellent" : tier.facilityLevel >= 3 ? "Strong" : tier.facilityLevel >= 2 ? "Basic" : "Limited",
    careerFit,
  };
}

function getClubStyle(club: WorldClub, units: ClubProfile["unitOvr"]) {
  const styles = [
    { label: "High press", detail: "Tries to win the ball early and keep opponents under repeat pressure." },
    { label: "Direct counter", detail: "Attacks space quickly after regaining possession." },
    { label: "Possession control", detail: "Uses midfield circulation to move opponents before accelerating." },
    { label: "Compact block", detail: "Protects central areas and asks opponents to break down a disciplined shape." },
    { label: "Wide overloads", detail: "Creates chances by stretching the pitch and attacking crosses." },
  ];
  let index = Math.floor(hash01(`${club.id}|style`) * styles.length) % styles.length;
  if (units.defense >= units.attack + 4) index = 3;
  if (units.attack >= units.defense + 4) index = 1;
  if (units.midfield >= Math.max(units.attack, units.defense) + 2) index = 2;
  return styles[index];
}

function getFormLabel(pointsPerGame: number, goalDifferencePerGame: number, played: number) {
  if (played === 0) return "No form";
  const score = pointsPerGame + goalDifferencePerGame * 0.25;
  if (score >= 2.05) return "Hot";
  if (score >= 1.45) return "Good";
  if (score >= 0.85) return "Mixed";
  return "Poor";
}

function getUnitLabel(units: ClubProfile["unitOvr"], strongest: boolean) {
  const labels = [
    ["Goalkeeping", units.keeper],
    ["Defense", units.defense],
    ["Midfield", units.midfield],
    ["Attack", units.attack],
  ] as const;
  const sorted = [...labels].sort((a, b) => strongest ? b[1] - a[1] : a[1] - b[1]);
  return `${sorted[0][0]} ${strongest ? "is their strongest unit" : "offers opponents the best route"}.`;
}

function getCareerFit(playerOvr: number, clubStrength: number): ClubProfile["careerFit"] {
  const gap = playerOvr - clubStrength;
  let projectedRole: MatchRole;
  if (gap >= 6) projectedRole = "Starter";
  else if (gap >= 1) projectedRole = "Rotation Starter";
  else if (gap >= -5) projectedRole = "Impact Sub";
  else projectedRole = "Bench";

  if (gap >= 7) return { label: "Level outgrown", detail: "You would expect an important role, but the sporting step is limited.", projectedRole };
  if (gap >= -3) return { label: "Good career fit", detail: "Your current level matches the squad and offers a realistic route to minutes.", projectedRole };
  if (gap >= -9) return { label: "Ambitious step", detail: "The level is above you now, but development could create an opportunity.", projectedRole };
  return { label: "Major step up", detail: "Breaking into this squad would require significant development or exceptional form.", projectedRole };
}
