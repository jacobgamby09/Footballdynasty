# Honours & Legacy — Implementation Plan

Design canon lives in `GDD.md → Honours & Legacy System`. This file is the concrete build plan.
Scope here is **V1**; V2/V3 are summarized at the end.

> Revision: V1 now ships a **real player-league award race** (not a seeded threshold), and persists a
> compact per-season stats table for the player's league. Both changes resolve points raised in review
> (a threshold award is hollow + would be thrown away; in-memory NPC stats are lost on a mid-season
> reload). See "Persistence & determinism contract".

## Guiding rules (carry through every phase)

- **Regenerate identities, persist only the player-league season stats + lasting outcomes.** NPC
  *identities/attributes* (name, age, position, OVR, potential) are derived deterministically from
  `playerId + worldSeed` and never stored. Their *accumulated season stats* for the player's league
  ARE stored compactly (they cannot be replayed after a reload), then deleted at season end once
  winners/records are banked.
- **Determinism.** No `Math.random` / `Date.now` in `src/`. Squad generation and per-matchweek event
  distribution seed off `worldSeed` / `careerSeed`, exactly like `data/world.ts → seedWorld()` and the
  existing `advanceWorldMatchweek` sim.
- **Balance neutrality.** Honours / Club Legacy / awards grant Prestige, Club Legacy status and (at
  retirement) Legacy Points — but never alter goals/assists/XP or the OVR development curve. The
  season-lab End OVR baseline (57.20 / 67.39 / 67.11 / 63.83) must stay byte-identical after V1.
- **Reuse, don't reinvent.** Rewards hook into existing systems (manager-trust floor, contract-offer
  quality, sponsor eligibility, prestige gain, the retirement Legacy Points formula). The NPC race
  hooks into the existing `advanceWorldMatchweek` / `simulateClubWeek`, which already produce a weekly
  `ClubWeekResult { outcome, goalsFor, goalsAgainst }` per club — we distribute that `goalsFor` to a
  regenerated squad. Team trophies are derived from `season.results` / league tables.

## V1 scope

1. **Dynasty tab redesign** into the unified museum: Overview / Cabinet / Records / Club Legacy /
   Bloodline / Upgrades. Cabinet filterable by Current player / Generation / Entire dynasty.
2. **Club Legacy**: per-club record, score, 6 status tiers (relative to club), frozen-on-transfer.
3. **Club Records**: 5 core records per club, seeded/scaled (never from 0), tracked + broken live.
4. **Player-league NPC race (real)**: regenerate squads for the player's league; distribute each
   matchweek's club `goalsFor` into goals/assists/minutes/ratings; accumulate into a persisted compact
   stats table → real top-scorer / assist / rating tables.
5. **Data-driven awards** from those tables: Top Scorer, Assist Leader, Club / League / Young Player of
   the Year, Team of the Season. Award prestige scales with league tier. Other leagues = synthetic
   seeded winner.
6. **Player Cabinet**: team trophies (derived) + individual awards; frozen per generation.
7. **Season Honours sequence**: short, skippable end-of-season reveal reusing the match-reveal dopamine
   tech (`useCountUp` + reveal flair); trophies fly into the cabinet; "lose by a small margin" is shown.
8. **Status rewards + retirement hookup** via existing systems.

### Explicit V1 non-goals
- Real per-player races for leagues other than the player's own (synthetic winners there). → V2.
- Rivalry / Feed integration ("you vs the league top scorer"). → V2.
- IndexedDB migration / full ~38-league NPC realism. → V3, only if proven necessary.
- No new spendable currency — Legacy Points stays the only dynasty currency.

## Persistence & determinism contract

| Data | Source | Persisted? |
|---|---|---|
| NPC identity + attributes (name/age/pos/OVR/potential) | `regenerateSquad(clubId, worldSeed)` | **No** — regenerated on demand |
| `LeaguePlayerSeasonStats` (player's league, current season) | accumulated each matchweek | **Yes, during the season; deleted at season rollover** after banking |
| Per-matchweek goal/assist/minute/rating distribution | seeded `(worldSeed, clubId, week)` | **No** — deterministic, recomputed; only its accumulation persists |
| Award winners, Team of the Season, broken records | season rollover → cabinet/history | **Yes** (permanent, tiny) |
| `ClubLegacyRecord` per club represented (frozen on leave) | accrued each match/season | **Yes** (bounded by clubs played) |
| Club record thresholds (clubs the player has touched) | seeded, then updated | **Yes**; untouched clubs **regenerated** |
| Player Cabinet + Dynasty Cabinet | season rollover | **Yes** |

Reload safety: a mid-season reload reconstructs the live standings from the persisted
`LeaguePlayerSeasonStats` + regenerated identities — nothing is lost. Save size stays bounded because the
per-season table is cleared every rollover; only winners/records/cabinet survive across seasons.

## Data model (types to add)

```
LeaguePlayerSeasonStats { playerId; clubId; apps; starts; minutes; goals; assists; ratingTotal; ratingCount }
// averageRating = ratingTotal / ratingCount (derived). Held only for the player's active league.

ClubLegacyStatus = "New Arrival" | "First-Team Regular" | "Fan Favourite" | "Club Hero" | "Club Icon" | "Club Legend"
ClubLegacyRecord { clubId; seasons; appearances; starts; goals; assists; ratingTotal; ratingCount;
                   promotions; honours: string[]; recordsHeld: string[]; legacyScore; status; frozen: boolean }

ClubRecordSet { appearances; goalsAllTime; assistsAllTime; goalsInSeason; bestSeasonRating }
// each entry: { value, holder: "club-legend" | "you" }

CabinetEntry { id; kind: "team" | "individual"; label; season; clubId?; detail? }
DynastyCabinet { generations; entriesByGeneration: Record<number, CabinetEntry[]> } // aggregates derived
```

Attach to `GameState.dynasty`. Bump `SAVE_VERSION`; default-fill new slices on load (in `save.ts`
normalise). The live `LeaguePlayerSeasonStats` lives on the world/season slice, cleared at rollover.

## Build order (each step: build + smoke + season-lab byte-identical → commit)

1. **Types + save migration.** Add the types, extend the dynasty slice, bump `SAVE_VERSION`, default on
   load. No behaviour yet. *Verify: old save loads; lab byte-identical.*
2. **Dynasty tab shell.** Rebuild the tab with the six subtabs (folding in existing upgrades); empty
   states wired. Player-screen `Career Honours` teaser.
3. **Club Records seeding.** `seedClubRecords(club, tier, seed)` → credible scaled thresholds; show
   read-only on the club profile. *Pure, deterministic.*
4. **Club Legacy accrual + status.** Update the active club's record each match/rollover; compute
   `legacyScore` + status; freeze on transfer (keep frozen records). *Milestones dominate; routine ≈ 0.*
5. **Squad regeneration.** `regenerateSquad(clubId, worldSeed)` → deterministic ~18-player squad
   (name/age/pos/OVR). Pure; no persistence. *Probe: stable across reloads for the same seed.*
6. **Matchweek distribution.** In `advanceWorldMatchweek`, for the player's league, split each club's
   weekly `goalsFor` into goals/assists and assign minutes/ratings (seeded); accumulate into the
   persisted `LeaguePlayerSeasonStats`. *Deterministic; lab unaffected (separate from player dev).* 
7. **League tables.** Real top-scorer / assist / average-rating lists for the player's league, surfaced
   in Dynasty → Records (and reusable in club profile / Feed later).
8. **Data-driven awards.** Compute Club/League/Young Player of the Year, Top Scorer, Assist Leader, Team
   of the Season from the tables; the player competes on the same list. Tier-scaled prestige. Synthetic
   winner for other leagues.
9. **Season Honours sequence + Cabinet.** End-of-season reveal (reuse `useCountUp`/flair); trophies →
   Player Cabinet; team trophies derived from `season.results`. Then **clear** the season stats table.
10. **Status rewards + retirement.** Wire status into trust floor / contract quality / sponsor
    eligibility; feed honours/records/Club Legend into the existing Legacy Points payout (+ a Club
    Legend retirement bonus). Collapse the season into the Dynasty Cabinet aggregate.

## Verification per step
- `npm run build` + `node scripts/play-session-regression-smoke.mjs` green.
- `node scripts/season-balance-lab.mjs` → End OVR byte-identical (Honours never touches XP/goals/dev).
- Deterministic Node probes: squad regeneration stable per seed; record seeding scales with tier (no
  0s); matchweek distribution sums back to club `goalsFor`; award winner is contested (player can lose
  by a small margin — never a free win).
- Reload test: persist mid-season, reload, confirm the top-scorer list is intact.
- In-browser: 0 console errors; reduced-motion-safe Honours sequence.

## Balance & determinism notes
- Routine output gives minimal Club Legacy; milestones/records/promotions/titles dominate; diminishing
  returns so a weak-club farm is never optimal. The stronger-club path stays better for OVR/earnings —
  Club Legacy is heart, not head.
- Award prestige scales with league tier: a tier-6 Golden Boot is huge *Club* Legacy, small *global*
  prestige.
- All randomness seeded off `worldSeed` / `careerSeed`; frozen Club Legacy records are immutable.

## V2 (next, well-defined)
Extend the real race to more leagues; add rivalry + Feed hooks (the player tracked against the league's
top scorer, news beats when a record falls).

## V3 (only if needed)
Full NPC realism across all ~38 leagues. This is the point to migrate persistence from localStorage to
**IndexedDB** (async, larger quota) — kept feasible by V1's separation of regenerable identities from
the bounded, season-scoped persisted stats.
