import { currentClubShortName } from "../data/leagues";
import { clamp } from "../utils";
import type { AttributeKey } from "../positionRoles";
import type { Intensity, MatchEvent, Venue } from "../types";

export function formatSigned(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}


export function sumXp(xp: Partial<Record<AttributeKey, number>>) {
  return Object.values(xp).reduce((sum, value) => sum + (value ?? 0), 0);
}


export function getTopXpEntry(xp: Partial<Record<AttributeKey, number>>) {
  const [attribute, value] = Object.entries(xp)
    .filter(([, xpValue]) => (xpValue ?? 0) > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0] ?? [];

  return attribute && value ? { attribute: attribute as AttributeKey, value } : undefined;
}


export function getMoraleLabel(morale: number) {
  if (morale >= 75) {
    return "Happy";
  }
  if (morale >= 55) {
    return "Stable";
  }
  if (morale >= 40) {
    return "Low";
  }
  return "Frustrated";
}


export function getPressureLabel(pressure: number) {
  if (pressure > 70) {
    return "High";
  }
  if (pressure > 40) {
    return "Rising";
  }
  return "Low";
}


export function formatPercentDelta(value: number) {
  return `${Number(value.toFixed(1))}%`;
}


export function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}


export function getUniqueItems(items: string[], limit: number) {
  return Array.from(new Set(items)).slice(0, limit);
}


export function formatFixtureTitle(venue: Venue, opponent: string, clubShortName = currentClubShortName) {
  return venue === "Home" ? `${clubShortName} - ${opponent}` : `${opponent} - ${clubShortName}`;
}


export function getMatchupText(delta: number) {
  if (delta >= 7) {
    return "Favourable";
  }

  if (delta >= 3) {
    return "Slight edge";
  }

  if (delta <= -7) {
    return "Very tough";
  }

  if (delta <= -3) {
    return "Tough";
  }

  return "Even";
}


export function getEventLabel(type: MatchEvent["type"], teamShortName = currentClubShortName) {
  const labels: Record<MatchEvent["type"], string> = {
    player_moment: "Your moment",
    team_goal: teamShortName,
    opponent_goal: "Opponent",
    team_chance: `${teamShortName} chance`,
    opponent_chance: "Opponent chance",
    tempo: "Match tempo",
    substitution: "Tactical change",
  };

  return labels[type];
}


export function formatDelta(value: number) {
  if (value > 0) {
    return `+${Number(value.toFixed(2))}`;
  }

  return `${Number(value.toFixed(2))}`;
}


export function getTrainingIntensityLabel(intensity: Intensity) {
  if (intensity === "Light") {
    return "Light session";
  }
  if (intensity === "Hard") {
    return "Hard session";
  }
  return "Balanced session";
}


export function getAverageRating(ratings: number[]) {
  if (ratings.length === 0) {
    return 6.4;
  }

  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}


export function getFormScore(ratings: number[]) {
  return clamp(Math.round((getAverageRating(ratings) - 5) * 35), 0, 100);
}


export function getFormLabel(ratings: number[]) {
  const average = getAverageRating(ratings);
  if (average >= 7.2) {
    return "Hot";
  }
  if (average >= 6.7) {
    return "Good";
  }
  if (average >= 6.2) {
    return "Mixed";
  }
  return "Cold";
}


export function getTrustStatus(trust: number) {
  if (trust >= 70) {
    return "Trusted";
  }
  if (trust >= 55) {
    return "Rotation";
  }
  if (trust >= 35) {
    return "Warming";
  }
  return "Distant";
}

