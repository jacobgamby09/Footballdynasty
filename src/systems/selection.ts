import { seededNoise } from "../engine/matchEngineCore";
import { buildOpponentProfile } from "../matchEngine";
import { getPositionModule } from "../positionRoles";
import { clamp } from "../utils";
import { getAgeAdjustedAttributes, getPlayerAgeFromSeason } from "./aging";
import { getFormLabel, getFormScore, getPressureLabel } from "./formatting";
import { calculateOvr, getClubLeagueTier } from "./ovr";
import { getAgingProfile } from "./support";
import { getCurrentFixture } from "./seasonState";
import type { MatchRole, PositionModule } from "../positionRoles";
import type { Contract, FitnessAvailability, Fixture, GameState, SelectionReport, UpcomingMatch } from "../types";

export function getUpcomingMatch(state: GameState): UpcomingMatch {
  const fixture = getCurrentFixture(state.season);
  const positionModule = getPositionModule(state.positionGroup);
  const club = state.club;
  const opponentProfile = buildOpponentProfile({
    opponentStrength: fixture.opponentStrength,
    opponentForm: fixture.opponentForm,
    serviceLevel: fixture.serviceLevel,
    seed: fixture.id,
  });
  const teamStrength = club.strength + Math.round((getFormScore(state.seasonStats.ratings) - 50) / 18);
  const matchImportance = fixture.competition.includes("Cup")
    ? "High"
    : Math.abs(teamStrength - fixture.opponentStrength) <= 3
      ? "Normal"
      : "Low";
  const selection = getSelectionReport(state, fixture, matchImportance);
  const fitnessAvailability = getFitnessAvailability(state.fitness);
  const isInSquad = isAvailableForSquad(state.fitness, `squad-${state.week}-${fixture.id}-${state.fitness}`);

  return {
    ...fixture,
    kickoff: `Match ${state.season.fixtureIndex + 1}/${state.season.fixtures.length}`,
    teamStrength,
    opponentProfile,
    matchImportance,
    positionGroup: state.positionGroup,
    playerRole: isInSquad ? selection.role : "Bench",
    selection,
    expectedMinutes: getExpectedMinutes(isInSquad ? selection.role : "Bench", fitnessAvailability, isInSquad),
    fitnessAvailability,
    isInSquad,
    tacticalFocus: getTacticalFocus(state, fixture.serviceLevel, positionModule),
    managerInstruction: isInSquad
      ? getManagerInstruction(selection.role, fixture.serviceLevel, positionModule)
      : "Recovery first. The staff are unlikely to risk you unless the situation changes.",
  };
}


export function getSelectionReport(
  state: GameState,
  fixture: Fixture,
  importance: UpcomingMatch["matchImportance"] = fixture.competition.includes("Cup") ? "High" : "Normal",
): SelectionReport {
  const form = getFormScore(state.seasonStats.ratings);
  const lastRating = state.seasonStats.ratings[state.seasonStats.ratings.length - 1] ?? 6.4;
  const availability = getFitnessAvailability(state.fitness);
  const leagueTier = getClubLeagueTier(state.club);
  const trustImpact = Math.round(state.trust * 0.45);
  const fitnessImpact = getFitnessSelectionImpact(state.fitness);
  const formImpact = Math.round((form - 50) * 0.18);
  const ratingImpact = Math.round((lastRating - 6.4) * 6);
  const importanceImpact = importance === "High" ? -3 : importance === "Low" ? 1 : 0;
  const aging = getAgingProfile(state);
  const playerOvr = calculateOvr(
    getAgeAdjustedAttributes(state.attributes, getPlayerAgeFromSeason(state.season.season), aging.peakAge, aging.declineResist),
    getPositionModule(state.positionGroup).ovrWeights,
  );
  const abilityImpact = clamp(Math.round((playerOvr - leagueTier.averageOvr) * 0.8), -8, 10);
  const fixtureGap = fixture.opponentStrength - state.club.strength;
  const fixtureImpact = fixtureGap >= 6 ? -2 : fixtureGap <= -4 ? 1 : 0;
  const promiseImpact = Math.round(getRoleThreshold(state.contract.rolePromise) * 0.12);
  const pressureImpact = -Math.round(state.pressure * 0.08);
  const score = clamp(
    22 + trustImpact + fitnessImpact + formImpact + ratingImpact + importanceImpact + fixtureImpact + promiseImpact + abilityImpact + pressureImpact,
    0,
    100,
  );
  const role = availability === "Not match fit" ? "Bench" : capRoleByFitness(getPlayerMatchRole(score), availability);
  const nextRole = getNextRole(role);
  const nextThreshold = nextRole ? getRoleThreshold(nextRole) : 100;

  return {
    score,
    role,
    nextRole,
    pointsToNextRole: nextRole ? Math.max(0, nextThreshold - score) : 0,
    factors: [
      {
        label: "Trust",
        value: `${state.trust}%`,
        impact: trustImpact,
        tone: state.trust >= 55 ? "good" : state.trust < 30 ? "warn" : "neutral",
      },
      {
        label: "Fitness",
        value: availability,
        impact: fitnessImpact,
        tone: state.fitness >= 60 ? "good" : state.fitness < 40 ? "warn" : "neutral",
      },
      {
        label: "Form",
        value: getFormLabel(state.seasonStats.ratings),
        impact: formImpact,
        tone: form >= 62 ? "good" : form < 48 ? "warn" : "neutral",
      },
      {
        label: "Last rating",
        value: lastRating.toFixed(1),
        impact: ratingImpact,
        tone: lastRating >= 7 ? "good" : lastRating < 6.2 ? "warn" : "neutral",
      },
      {
        label: "Fixture",
        value: importance,
        impact: importanceImpact + fixtureImpact,
        tone: importance === "High" || fixtureGap >= 6 ? "warn" : "neutral",
      },
      {
        label: "Level fit",
        value: `${playerOvr}/${leagueTier.averageOvr}`,
        impact: abilityImpact,
        tone: abilityImpact >= 2 ? "good" : abilityImpact < -2 ? "warn" : "neutral",
      },
      {
        label: "Contract",
        value: state.contract.rolePromise,
        impact: promiseImpact,
        tone: promiseImpact >= 7 ? "good" : "neutral",
      },
      {
        label: "Pressure",
        value: getPressureLabel(state.pressure),
        impact: pressureImpact,
        tone: pressureImpact < -4 ? "warn" : "neutral",
      },
    ],
    summary: getSelectionSummary(score, role, nextRole),
  };
}


export function getSelectionSummary(
  score: number,
  role: UpcomingMatch["playerRole"],
  nextRole?: UpcomingMatch["playerRole"],
) {
  if (!nextRole) {
    return `Selection score ${score}. You are trusted to start.`;
  }

  return `Selection score ${score}. ${getRoleThreshold(nextRole) - score} more needed for ${nextRole}.`;
}


export function getFitnessAvailability(fitness: number): FitnessAvailability {
  if (fitness < 20) {
    return "Not match fit";
  }
  if (fitness < 40) {
    return "Risky";
  }
  if (fitness < 60) {
    return "Tired";
  }
  if (fitness < 80) {
    return "Ready";
  }
  return "Sharp";
}


export function getFitnessSelectionImpact(fitness: number) {
  if (fitness < 20) {
    return -38;
  }
  if (fitness < 40) {
    return -16;
  }
  if (fitness < 60) {
    return -6;
  }
  if (fitness < 80) {
    return 0;
  }
  return Math.min(2, Math.round((fitness - 80) * 0.1));
}


export function isAvailableForSquad(fitness: number, matchSeed: string) {
  if (fitness < 12) {
    return false;
  }
  if (fitness < 20) {
    return seededNoise(`${matchSeed}-fitness-selection`) > 0.78;
  }
  if (fitness < 40) {
    return seededNoise(`${matchSeed}-fitness-selection`) > 0.25;
  }
  return true;
}


export function getNextRole(role: UpcomingMatch["playerRole"]): SelectionReport["nextRole"] {
  if (role === "Bench") {
    return "Impact Sub";
  }
  if (role === "Impact Sub") {
    return "Rotation Starter";
  }
  if (role === "Rotation Starter") {
    return "Starter";
  }
  return undefined;
}


export function getRoleThreshold(role: UpcomingMatch["playerRole"]) {
  const thresholds: Record<UpcomingMatch["playerRole"], number> = {
    Bench: 0,
    "Impact Sub": 30,
    "Rotation Starter": 55,
    Starter: 68,
  };

  return thresholds[role];
}


export function getPlayerMatchRole(selectionScore: number): UpcomingMatch["playerRole"] {
  if (selectionScore >= 68) {
    return "Starter";
  }
  if (selectionScore >= 55) {
    return "Rotation Starter";
  }
  if (selectionScore >= 30) {
    return "Impact Sub";
  }
  return "Bench";
}


function capRoleByFitness(role: UpcomingMatch["playerRole"], availability: FitnessAvailability): UpcomingMatch["playerRole"] {
  if (availability === "Not match fit") {
    return "Bench";
  }

  if (availability === "Risky" && (role === "Starter" || role === "Rotation Starter")) {
    return "Impact Sub";
  }

  if (availability === "Tired" && role === "Starter") {
    return "Rotation Starter";
  }

  return role;
}


export function getExpectedMinutes(role: UpcomingMatch["playerRole"], availability: FitnessAvailability = "Ready", isInSquad = true) {
  if (!isInSquad || availability === "Not match fit") {
    return "Not selected";
  }
  if (availability === "Risky") {
    return "Emergency only";
  }
  const minutes: Record<UpcomingMatch["playerRole"], string> = {
    Bench: "Bench cover",
    "Impact Sub": "Second half",
    "Rotation Starter": availability === "Tired" ? "Limited start" : "Around an hour",
    Starter: availability === "Tired" ? "Managed start" : "Full match",
  };

  return minutes[role];
}


export function getTacticalFocus(state: GameState, serviceLevel: UpcomingMatch["serviceLevel"], positionModule: PositionModule) {
  if (state.selectedFocus === "Work Rate") {
    return positionModule.tacticalFocuses.workRate;
  }
  if (serviceLevel === "Low") {
    return positionModule.tacticalFocuses.lowService;
  }
  if (["Off Ball", "Pace", "Acceleration", "Dribbling"].includes(state.selectedFocus)) {
    return positionModule.tacticalFocuses.movement;
  }
  return positionModule.tacticalFocuses.default;
}


export function getManagerInstruction(role: MatchRole, serviceLevel: UpcomingMatch["serviceLevel"], positionModule: PositionModule) {
  const instruction = positionModule.managerInstructions[role];
  return serviceLevel === "Low" && instruction.lowService ? instruction.lowService : instruction.default;
}


export function getPlayerMomentCount(role: UpcomingMatch["playerRole"], involvementScore: number, minutes: number, matchSeed: string) {
  if (role === "Bench" || minutes <= 0) {
    return 0;
  }

  const roleRatesPer90: Record<UpcomingMatch["playerRole"], number> = {
    Bench: 0,
    "Impact Sub": 3.1,
    "Rotation Starter": 3.65,
    Starter: 4.0,
  };
  const involvementModifier = clamp((involvementScore - 50) / 46, -0.45, 0.45);
  const expectedMoments = Math.max(0, (minutes / 90) * roleRatesPer90[role] * (1 + involvementModifier));
  const baseMoments = Math.floor(expectedMoments);
  const extraMoment = seededNoise(`${matchSeed}-${role}-${minutes}-moment-volume`) < expectedMoments - baseMoments ? 1 : 0;
  const lateSubCeiling = minutes < 18 ? 1 : minutes < 32 ? 2 : 3;
  const roleCeiling = role === "Starter" ? 4 : role === "Rotation Starter" ? 3 : lateSubCeiling;

  return clamp(baseMoments + extraMoment, 0, roleCeiling);
}

