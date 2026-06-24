import type { ClubId, FeedCategory, FeedStory, FeedTextPart, GameState, LastMatchSummary, World, WorldClub } from "../types";
import { findWorldClub, getWorldLeagueTable } from "./world";

type StoryCandidate = Omit<FeedStory, "id" | "week" | "season"> & { key: string };

const SOURCES: Record<FeedCategory, string[]> = {
  player: ["Matchday Live", "Local Football Desk", "The Football Wire"],
  result: ["League Watch", "Matchday Live", "Grassroots Weekly"],
  upset: ["The Football Wire", "League Watch", "Final Whistle"],
  form: ["Form Guide", "Grassroots Weekly", "League Watch"],
  table: ["League Watch", "The Football Wire", "Table Tracker"],
  milestone: ["Record Book", "Local Football Desk", "The Football Wire"],
  contract: ["Contract Desk", "Local Football Desk", "The Football Wire"],
  transfer: ["Transfer Desk", "Market Watch", "The Football Wire"],
};

const text = (value: string): FeedTextPart => ({ type: "text", text: value });
const club = (value: WorldClub, label = value.shortName): FeedTextPart => ({ type: "club", clubId: value.id, text: label });
const findClub = (world: World, identity?: string) =>
  findWorldClub(world, identity, identity) ??
  Object.values(world.clubs).find((item) => item.name === identity || item.shortName === identity || item.shortCode === identity);

function hash01(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}

function pick<T>(items: T[], seed: string) {
  return items[Math.min(items.length - 1, Math.floor(hash01(seed) * items.length))];
}

export function generateWeeklyFeed(before: GameState, after: GameState, lastMatch?: LastMatchSummary): FeedStory[] {
  const candidates = [
    ...buildPlayerCandidates(before, after, lastMatch),
    ...buildResultCandidates(before, after, lastMatch),
    ...buildLeagueCandidates(before.world, after.world, after.club.clubId, after.week),
    ...buildMarketCandidates(after),
  ];
  const recent = before.worldFeed.slice(0, 12);
  const usedHeadlines = new Set(
    before.worldFeed
      .filter((story) => story.season === after.season.season)
      .map((story) => story.headline.map((part) => part.text).join("")),
  );
  const scored = candidates.map((candidate) => ({
    ...candidate,
    importance:
      candidate.importance -
      recent.filter((story) => story.category === candidate.category).length * 7 -
      recent.filter((story) => story.clubIds.some((clubId) => candidate.clubIds.includes(clubId))).length * 3,
  }));
  const selected: StoryCandidate[] = [];
  for (const candidate of scored.sort((a, b) => b.importance - a.importance || a.key.localeCompare(b.key))) {
    if (selected.length >= 3) break;
    if (selected.some((story) => story.key === candidate.key)) continue;
    if (usedHeadlines.has(candidate.headline.map((part) => part.text).join(""))) continue;
    if (selected.filter((story) => story.clubIds.some((clubId) => candidate.clubIds.includes(clubId))).length >= 2) continue;
    if (candidate.category === "result" && selected.some((story) => story.category === "result")) continue;
    if (candidate.category === "form" && selected.some((story) => story.category === "form")) continue;
    if (candidate.category === "table" && selected.some((story) => story.category === "table")) continue;
    selected.push(candidate);
  }
  if (selected.length < 2) {
    const fallbackClub = findWorldClub(after.world, after.club.clubId, after.club.shortCode);
    if (fallbackClub) selected.push(buildRoundupCandidate(after, fallbackClub));
  }
  if (selected.length < 2) {
    const fallbackClub = findWorldClub(after.world, after.club.clubId, after.club.shortCode);
    if (fallbackClub) selected.push(buildTableWatchCandidate(after, fallbackClub));
  }
  const stories = selected.slice(0, 3).map((candidate, index) => ({
    ...candidate,
    id: `feed-s${after.season.season}-w${after.week}-${candidate.key}-${index}`,
    week: after.week,
    season: after.season.season,
    source: pick(SOURCES[candidate.category], `${candidate.key}|source|${after.week}`),
  }));
  return [...stories, ...before.worldFeed].slice(0, 120);
}

function buildPlayerCandidates(before: GameState, after: GameState, match?: LastMatchSummary): StoryCandidate[] {
  if (!match) return [];
  const playerClub = findWorldClub(after.world, after.club.clubId, after.club.shortCode);
  if (!playerClub) return [];
  const name = `${after.player.firstName} ${after.player.lastName}`;
  const result: StoryCandidate[] = [];
  if (match.goals > 0 || match.assists > 0) {
    const output = [
      match.goals > 0 ? `${match.goals} goal${match.goals === 1 ? "" : "s"}` : "",
      match.assists > 0 ? `${match.assists} assist${match.assists === 1 ? "" : "s"}` : "",
    ].filter(Boolean).join(" and ");
    result.push({
      key: `player-output-${match.matchNumber}`,
      category: "player",
      source: "",
      tone: "positive",
      importance: 92 + match.goals * 12 + match.assists * 8,
      headline: [text(`${name} delivers against `), club(findClub(after.world, match.opponent) ?? playerClub)],
      body: [text(`${output} put `), club(playerClub), text(" at the center of this week's conversation.")],
      clubIds: [playerClub.id],
      playerRelated: true,
    });
  } else if (match.rating >= 7.4) {
    result.push({
      key: `player-rating-${match.matchNumber}`,
      category: "player",
      source: "",
      tone: "positive",
      importance: 72 + Math.round((match.rating - 7) * 10),
      headline: [text(`${name} catches the eye against `), club(findClub(after.world, match.opponent) ?? playerClub)],
      body: [text(`A ${match.rating.toFixed(1)} rating gave `), club(playerClub), text(" a strong individual performance even without direct output.")],
      clubIds: [playerClub.id],
      playerRelated: true,
    });
  } else if (match.rating <= 5.9 && match.manualHighlights + match.autoSimulated > 0) {
    result.push({
      key: `player-struggle-${match.matchNumber}`,
      category: "player",
      source: "",
      tone: "negative",
      importance: 52,
      headline: [text(`A difficult afternoon for ${name}`)],
      body: [text("The young attacker struggled to influence the match as "), club(playerClub), text(" searched for a response.")],
      clubIds: [playerClub.id],
      playerRelated: true,
    });
  }
  if (before.seasonStats.goals === 0 && after.seasonStats.goals > 0) {
    result.push({
      key: `first-goal-${after.season.season}`,
      category: "milestone",
      source: "",
      tone: "breaking",
      importance: 118,
      headline: [text(`First senior goal for ${name}`)],
      body: [text("A personal landmark arrives in the colors of "), club(playerClub), text(".")],
      clubIds: [playerClub.id],
      playerRelated: true,
    });
  }
  if (before.seasonStats.assists === 0 && after.seasonStats.assists > 0) {
    result.push({
      key: `first-assist-${after.season.season}`,
      category: "milestone",
      source: "",
      tone: "positive",
      importance: 100,
      headline: [text(`First senior assist for ${name}`)],
      body: [text("The breakthrough contribution gives "), club(playerClub), text(" another reason to trust the prospect.")],
      clubIds: [playerClub.id],
      playerRelated: true,
    });
  }
  return result;
}

function buildResultCandidates(before: GameState, after: GameState, match?: LastMatchSummary): StoryCandidate[] {
  if (!match) return [];
  const playerClub = findWorldClub(after.world, after.club.clubId, after.club.shortCode);
  const opponent = findClub(after.world, match.opponent);
  if (!playerClub || !opponent) return [];
  const margin = Math.abs(match.teamGoals - match.opponentGoals);
  const playerWon = match.teamGoals > match.opponentGoals;
  const winner = playerWon ? playerClub : opponent;
  const loser = playerWon ? opponent : playerClub;
  const upset = playerWon ? playerClub.strength + 4 <= opponent.strength : opponent.strength + 4 <= playerClub.strength;
  const result: StoryCandidate[] = [];
  if (upset) {
    result.push({
      key: `upset-${match.matchNumber}-${winner.id}`,
      category: "upset",
      source: "",
      tone: "breaking",
      importance: 96 + margin * 8,
      headline: [club(winner), text(" stun the favorites")],
      body: [club(winner), text(" beat "), club(loser), text(` ${playerWon ? match.teamGoals : match.opponentGoals}-${playerWon ? match.opponentGoals : match.teamGoals} in one of the week's standout results.`)],
      clubIds: [winner.id, loser.id],
      playerRelated: true,
    });
  }
  if (margin >= 3) {
    result.push({
      key: `big-win-${match.matchNumber}-${winner.id}`,
      category: "result",
      source: "",
      tone: winner.id === playerClub.id ? "positive" : "negative",
      importance: 68 + margin * 7,
      headline: [club(winner), text(" deliver a statement win")],
      body: [club(loser), text(` had no answer as the match finished ${playerWon ? match.teamGoals : match.opponentGoals}-${playerWon ? match.opponentGoals : match.teamGoals}.`)],
      clubIds: [winner.id, loser.id],
      playerRelated: true,
    });
  }
  if (margin < 3) {
    const draw = match.teamGoals === match.opponentGoals;
    result.push({
      key: `weekly-result-${match.matchNumber}`,
      category: "result",
      source: "",
      tone: draw ? "neutral" : winner.id === playerClub.id ? "positive" : "negative",
      importance: 44 + margin * 4,
      headline: draw
        ? [club(playerClub), text(" and "), club(opponent), text(" share the points")]
        : [club(winner), text(" edge "), club(loser)],
      body: [text(`The contest finished ${match.teamGoals}-${match.opponentGoals} after a closely fought league match.`)],
      clubIds: [playerClub.id, opponent.id],
      playerRelated: true,
    });
  }
  return result;
}

function buildLeagueCandidates(before: World, after: World, playerClubId: ClubId | undefined, week: number): StoryCandidate[] {
  if (!playerClubId) return [];
  const playerClub = after.clubs[playerClubId];
  if (!playerClub) return [];
  const league = after.leagues[playerClub.leagueId];
  const beforeTable = getWorldLeagueTable(before, league.id);
  const afterTable = getWorldLeagueTable(after, league.id);
  const candidates: StoryCandidate[] = [];
  afterTable.forEach((row) => {
    const worldClub = after.clubs[row.clubId ?? ""];
    const previous = beforeTable.find((item) => item.clubId === row.clubId);
    const record = row.clubId ? after.leagueSeasons[league.id]?.records[row.clubId] : undefined;
    const previousRecord = row.clubId ? before.leagueSeasons[league.id]?.records[row.clubId] : undefined;
    if (!worldClub || !previous || !record) return;
    const streak = getStreak(record.recentForm ?? []);
    const previousStreak = getStreak(previousRecord?.recentForm ?? []);
    if (streak.type === "W" && (streak.length === 3 || streak.length === 5) && previousStreak.length < streak.length) {
      candidates.push({
        key: `win-streak-${worldClub.id}-${streak.length}`,
        category: "form",
        source: "",
        tone: "positive",
        importance: 58 + streak.length * 8 + (row.position <= 3 ? 10 : 0),
        headline: [club(worldClub), text(` make it ${streak.length} wins in a row`)],
        body: [text("The run has lifted "), club(worldClub), text(` to ${row.position}. place and changed the mood around the club.`)],
        clubIds: [worldClub.id],
        playerRelated: worldClub.id === playerClubId,
      });
    }
    if (streak.type === "L" && (streak.length === 3 || streak.length === 5) && previousStreak.length < streak.length) {
      candidates.push({
        key: `loss-streak-${worldClub.id}-${streak.length}`,
        category: "form",
        source: "",
        tone: "negative",
        importance: 55 + streak.length * 7,
        headline: [text("Pressure builds at "), club(worldClub)],
        body: [club(worldClub), text(` have lost ${streak.length} straight and now sit ${row.position}. in the table.`)],
        clubIds: [worldClub.id],
        playerRelated: worldClub.id === playerClubId,
      });
    }
    if (previous.position > 1 && row.position === 1 && week > 2) {
      candidates.push({
        key: `new-leader-${worldClub.id}-${week}`,
        category: "table",
        source: "",
        tone: "breaking",
        importance: 84,
        headline: [club(worldClub), text(" take control at the top")],
        body: [text("A strong week moves "), club(worldClub), text(" into first place in the division.")],
        clubIds: [worldClub.id],
        playerRelated: worldClub.id === playerClubId,
      });
    }
    const movement = previous.position - row.position;
    if (Math.abs(movement) >= 4 && week > 2) {
      candidates.push({
        key: `table-move-${worldClub.id}-${week}`,
        category: "table",
        source: "",
        tone: movement > 0 ? "positive" : "negative",
        importance: 50 + Math.abs(movement) * 4,
        headline: [club(worldClub), text(movement > 0 ? " climb fast" : " slide down the table")],
        body: [club(worldClub), text(` moved ${Math.abs(movement)} places this week and now sit ${row.position}.`)],
        clubIds: [worldClub.id],
        playerRelated: worldClub.id === playerClubId,
      });
    }
  });
  return candidates;
}

function buildMarketCandidates(after: GameState): StoryCandidate[] {
  const offers = after.transferWindow?.offers ?? after.contractOffers ?? (after.contractOffer ? [after.contractOffer] : []);
  return offers.slice(0, 2).flatMap((offer) => {
    const interestedClub = findWorldClub(after.world, offer.clubId, offer.club);
    if (!interestedClub || offer.source !== "external-club") return [];
    return [{
      key: `transfer-${interestedClub.id}-${after.week}`,
      category: "transfer" as const,
      source: "",
      tone: "neutral" as const,
      importance: 82,
      headline: [club(interestedClub), text(" make their interest official")],
      body: [text(`${after.player.firstName} ${after.player.lastName} now has a career decision to make after an offer from `), club(interestedClub), text(".")],
      clubIds: [interestedClub.id],
      playerRelated: true,
    }];
  });
}

function buildRoundupCandidate(after: GameState, playerClub: WorldClub): StoryCandidate {
  const table = getWorldLeagueTable(after.world, playerClub.leagueId);
  const leader = after.world.clubs[table[0]?.clubId ?? playerClub.id] ?? playerClub;
  return {
    key: `roundup-${after.week}`,
    category: "table",
    source: "",
    tone: "neutral",
    importance: 20,
    headline: [text(`Week ${after.week} leaders: `), club(leader)],
    body: [club(leader), text(` lead the way after week ${after.week}, while every point remains valuable.`)],
    clubIds: [leader.id],
    playerRelated: leader.id === playerClub.id,
  };
}

function buildTableWatchCandidate(after: GameState, playerClub: WorldClub): StoryCandidate {
  const table = getWorldLeagueTable(after.world, playerClub.leagueId);
  const subjectRow = table.find((row) => row.clubId !== table[0]?.clubId && row.clubId !== playerClub.id) ?? table[1] ?? table[0];
  const subject = after.world.clubs[subjectRow?.clubId ?? playerClub.id] ?? playerClub;
  return {
    key: `table-watch-${after.week}-${subject.id}`,
    category: "table",
    source: "",
    tone: "neutral",
    importance: 18,
    headline: [text(`Week ${after.week} watch: `), club(subject)],
    body: [club(subject), text(` sit ${subjectRow?.position ?? "-"}. with ${subjectRow?.points ?? 0} points as the division begins to take shape.`)],
    clubIds: [subject.id],
    playerRelated: subject.id === playerClub.id,
  };
}

function getStreak(form: Array<"W" | "D" | "L">) {
  const type = form.at(-1);
  let length = 0;
  for (let index = form.length - 1; index >= 0 && form[index] === type; index -= 1) length += 1;
  return { type, length };
}
