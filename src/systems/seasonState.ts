import type { FixtureResult, MatchState, MatchTotals, SeasonState } from "../types";

export function createFixtureResult(match: MatchState, totals: MatchTotals): FixtureResult {
  const outcome = totals.teamGoals > totals.opponentGoals ? "W" : totals.teamGoals < totals.opponentGoals ? "L" : "D";

  return {
    fixtureId: match.fixtureId,
    opponent: match.opponent,
    venue: match.venue,
    competition: match.competition,
    teamGoals: totals.teamGoals,
    opponentGoals: totals.opponentGoals,
    outcome,
    rating: totals.rating,
  };
}


export function advanceSeasonFixture(season: SeasonState, result: FixtureResult): SeasonState {
  const nextIndex = Math.min(season.fixtureIndex + 1, season.fixtures.length);
  const existingIndex = season.results.findIndex((item) => item.fixtureId === result.fixtureId);
  const results =
    existingIndex >= 0
      ? season.results.map((item, index) => (index === existingIndex ? result : item))
      : [...season.results, result];

  return {
    ...season,
    fixtureIndex: nextIndex,
    results,
  };
}


export function hasPlayableFixture(season: SeasonState) {
  const fixture = season.fixtures[season.fixtureIndex];
  return !!fixture && !season.results.some((result) => result.fixtureId === fixture.id);
}


export function isSeasonComplete(season: SeasonState) {
  return season.fixtures.length > 0 && season.results.length >= season.fixtures.length;
}


export function getCurrentFixture(season: SeasonState) {
  return season.fixtures[Math.min(season.fixtureIndex, season.fixtures.length - 1)] ?? season.fixtures[0];
}


export function getUpcomingFixtures(season: SeasonState, count: number) {
  return season.fixtures.slice(season.fixtureIndex, season.fixtureIndex + count);
}


export function getSeasonRecord(results: FixtureResult[]) {
  return results.reduce(
    (record, result) => {
      if (result.outcome === "W") {
        record.wins += 1;
        record.points += 3;
      } else if (result.outcome === "D") {
        record.draws += 1;
        record.points += 1;
      } else {
        record.losses += 1;
      }

      return record;
    },
    { wins: 0, draws: 0, losses: 0, points: 0 },
  );
}


export function getSeasonGoals(results: FixtureResult[]) {
  return results.reduce(
    (goals, result) => ({
      for: goals.for + result.teamGoals,
      against: goals.against + result.opponentGoals,
    }),
    { for: 0, against: 0 },
  );
}


export function getRecentFormText(results: FixtureResult[]) {
  if (results.length === 0) {
    return "No form";
  }

  return results
    .slice(-5)
    .map((result) => result.outcome)
    .join("");
}


export function getTeamFormScore(results: FixtureResult[]) {
  if (results.length === 0) {
    return 50;
  }

  const recent = results.slice(-5);
  const points = getSeasonRecord(recent).points;
  const maxPoints = recent.length * 3;

  return Math.round((points / maxPoints) * 100);
}


export function getNextFixtureAfterMatch(season: SeasonState) {
  return season.fixtures[Math.min(season.fixtureIndex + 1, season.fixtures.length - 1)] ?? getCurrentFixture(season);
}

