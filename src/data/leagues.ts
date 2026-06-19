import type { ClubState, LeagueTier, LeagueTierId } from "../types";

export const leagueTiers: Record<LeagueTierId, LeagueTier> = {
  "grassroots-dev": {
    id: "grassroots-dev",
    name: "Grassroots Development League",
    averageOvr: 15,
    teamRange: [10, 22],
    wageRange: [25, 90],
    facilityLevel: 1,
    prestigeMultiplier: 0.45,
    description: "A local entry point where raw players can still earn minutes while learning the game.",
  },
  "local-semi-pro": {
    id: "local-semi-pro",
    name: "Local Semi-Pro League",
    averageOvr: 28,
    teamRange: [22, 36],
    wageRange: [90, 240],
    facilityLevel: 2,
    prestigeMultiplier: 0.75,
    description: "Organized senior football with better squads, better facilities and less room for weak fundamentals.",
  },
  "regional-pro": {
    id: "regional-pro",
    name: "Regional Pro League",
    averageOvr: 45,
    teamRange: [37, 54],
    wageRange: [240, 650],
    facilityLevel: 3,
    prestigeMultiplier: 1,
    description: "Lower professional football where strong attributes start to separate real prospects.",
  },
  "national-pro": {
    id: "national-pro",
    name: "National League",
    averageOvr: 62,
    teamRange: [55, 70],
    wageRange: [650, 1800],
    facilityLevel: 4,
    prestigeMultiplier: 1.35,
    description: "Full-time football with strong tactical demands and much less forgiveness.",
  },
  "top-flight": {
    id: "top-flight",
    name: "Top Flight",
    averageOvr: 78,
    teamRange: [70, 86],
    wageRange: [1800, 6500],
    facilityLevel: 5,
    prestigeMultiplier: 1.8,
    description: "Elite domestic football where even excellent players need role fit and consistency.",
  },
  elite: {
    id: "elite",
    name: "Elite Continental Level",
    averageOvr: 90,
    teamRange: [86, 98],
    wageRange: [6500, 30000],
    facilityLevel: 6,
    prestigeMultiplier: 2.5,
    description: "The endgame environment for legendary runs and dynasty-defining seasons.",
  },
};

export const currentLeagueTier = leagueTiers["grassroots-dev"];
export const currentClubName = "Northbridge FC";
export const currentClubShortName = "Northbridge";
export const currentClubStrength = 15;
export const initialClub: ClubState = {
  name: currentClubName,
  shortName: currentClubShortName,
  shortCode: "NBR",
  tierId: currentLeagueTier.id,
  strength: currentClubStrength,
};

export const contractMarketClubs: Array<{ club: string; short: string; tierId: LeagueTierId; wageFactor: number; roleBias: number }> = [
  { club: "Northbridge FC", short: "NBR", tierId: "grassroots-dev", wageFactor: 1, roleBias: 0 },
  { club: "Kolding Borough", short: "KOL", tierId: "grassroots-dev", wageFactor: 0.92, roleBias: 5 },
  { club: "Roskilde Athletic", short: "ROS", tierId: "grassroots-dev", wageFactor: 0.98, roleBias: 2 },
  { club: "Aalborg United", short: "AAL", tierId: "grassroots-dev", wageFactor: 1.04, roleBias: -1 },
  { club: "Esbjerg Works", short: "ESB", tierId: "local-semi-pro", wageFactor: 0.9, roleBias: 4 },
  { club: "Viborg Town", short: "VIB", tierId: "local-semi-pro", wageFactor: 1, roleBias: 0 },
  { club: "Silkeborg City", short: "SIL", tierId: "local-semi-pro", wageFactor: 1.08, roleBias: -3 },
  { club: "Odense Crown", short: "ODE", tierId: "regional-pro", wageFactor: 0.95, roleBias: 2 },
  { club: "Aarhus 1902", short: "AAR", tierId: "regional-pro", wageFactor: 1.06, roleBias: -2 },
];
