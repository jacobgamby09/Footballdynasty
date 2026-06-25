# Honours & Legacy — Implementation Plan

Design canon lives in `GDD.md → Honours & Legacy System`. This file is the concrete build plan.
Scope here is **V1**; V2/V3 are summarized at the end.

## Guiding rules (carry through every phase)

- **Regenerate, don't persist the world.** NPC rosters/season stats are derived deterministically from
  a seed and held in memory for the current season only. The save stores **outcomes** (winners,
  records, cabinet entries, the player's own Club Legacy records) — never thousands of NPC objects.
- **Determinism.** No `Math.random` / `Date.now` in `src/`. Everything seeds off the existing
  `careerSeed` / world seeding (`data/world.ts → seedWorld()`), exactly like the rest of the engine.
- **Balance neutrality where it counts.** Honours/Club Legacy/awards may grant Prestige, Club Legacy
  status and (at retirement) Legacy Points, but must **not** alter goals/assists/XP or the OVR
  development curve. The season-lab End OVR baseline (57.20 / 67.39 / 67.11 / 63.83) must stay
  byte-identical after V1. Verify after each step.
- **Reuse, don't reinvent.** Rewards hook into existing systems: manager-trust floor, contract-offer
  quality, sponsor eligibility, prestige gain, and the retirement Legacy Points formula. Team trophies
  are **derived from existing `season.results` / league tables**, not a new source of truth.

## V1 scope

Deliver the *felt loop* and the *stay-vs-move tension* with minimal world dependency:

1. Club Legacy: per-club record, score, 6 status tiers, frozen-on-transfer.
2. Club Records: 5 core records per club, seeded/scaled (never from 0), tracked + broken live.
3. Player Cabinet: team trophies (titles/promotions/cups, derived) + individual awards.
4. Individual awards via a **seeded league threshold** (not a free win) — real NPC race is V2.
5. Season-end Honours sequence reusing the match-reveal dopamine tech (`useCountUp` + reveal flair).
6. Dynasty tab redesign into the unified museum (Overview / Cabinet / Records / Club Legacy / Bloodline / Upgrades).

### Explicit V1 non-goals
- No `WorldPlayer` NPC rosters, no per-match event distribution, no league stat tables. (That is V2.)
- No IndexedDB migration. (That is V3, only if the real world proves it necessary.)
- No new spendable currency. Legacy Points stays the only dynasty currency.

## Persisted vs regenerated (V1)

| Data | Where | Persisted? |
|---|---|---|
| `ClubLegacyRecord` per club the player has represented | new `dynasty.clubLegacy` slice | **Yes** (small, bounded by clubs played) |
| Club records (current holders + thresholds) | per-club, on the world club / season record | **Yes** for clubs the player has touched; **regenerated** for the rest |
| Player Cabinet (this gen) + Dynasty Cabinet (aggregate) | new `dynasty.cabinet` slice | **Yes** |
| Award winners / season honours | folded into cabinet + bloodline history | **Yes** |
| Seeded record thresholds for untouched clubs | derived from club tier/age/league | **Regenerated on demand** |
| Award threshold for the player's league | seeded from league tier + season | **Regenerated on demand** |

## Data model (types to add)

```
ClubLegacyStatus = "New Arrival" | "First-Team Regular" | "Fan Favourite" | "Club Hero" | "Club Icon" | "Club Legend"

ClubLegacyRecord {
  clubId; seasons; appearances; starts; goals; assists;
  ratingTotal; ratingCount;            // -> averageRating derived
  promotions; honours: string[];       // award/trophy ids won here
  recordsHeld: string[];               // record ids currently held
  legacyScore; status; frozen: boolean // frozen = true after leaving
}

ClubRecordSet {                        // per club; thresholds seeded if untouched
  appearances; goalsAllTime; assistsAllTime; goalsInSeason; bestSeasonRating;
}                                      // each: { value, holder: "club-legend" | "you" }

CabinetEntry { id; kind: "team" | "individual"; label; season; clubId?; detail? }

DynastyCabinet {
  generations: number;
  entriesByGeneration: Record<number, CabinetEntry[]>;
  // aggregates (league titles, promotions, awards…) derived from entries
}
```

Attach to `GameState.dynasty` (new or extended slice). Bump `SAVE_VERSION` and add a migration that
defaults the new slice for old saves (the existing `save.ts` normalise step is the home for this).

## Build order (each step: build + smoke + season-lab unchanged → commit)

1. **Types + save migration.** Add the types above, extend the dynasty slice, bump `SAVE_VERSION`,
   default-fill on load. No behaviour yet. *Verify: old save loads; lab byte-identical.*
2. **Club Records seeding.** `seedClubRecords(club, leagueTier, seed)` → credible scaled thresholds.
   Surface read-only on the club profile (`All-time goals 46 / 81`). *Pure, deterministic.*
3. **Club Legacy accrual.** On each finished match / season rollover, update the active club's
   `ClubLegacyRecord` (apps, goals, assists, rating, milestones). Compute `legacyScore` + `status`.
   Freeze the record on transfer; keep all frozen records. *Milestones dominate; routine ≈ 0.*
4. **Status rewards (reuse existing systems).** Wire status into: manager-trust floor, contract-offer
   quality, sponsor eligibility, home-game prestige. No new mechanics. *Verify staying isn't mechanically dominant.*
5. **Team trophies → Cabinet.** Derive titles/promotions/cups from `season.results` / league tables at
   season end; write `CabinetEntry`s into the cabinet + dynasty aggregate.
6. **Individual awards (seeded threshold).** `getAwardScore(player season)` vs a seeded
   league-tier threshold → Top Scorer / Player of the Year etc. Award prestige scales with tier.
   Winners become `CabinetEntry`s + Club Legacy honours.
7. **Season Honours sequence.** A short, skippable end-of-season reveal (reuse `useCountUp` + reveal
   flair); trophies fly into the cabinet. Compact `Career Honours` line on the Player screen.
8. **Dynasty tab redesign.** Rebuild the tab with subtabs (Overview / Cabinet / Records / Club Legacy /
   Bloodline / Upgrades), folding in the existing dynasty upgrades surface.
9. **Retirement hookup.** Feed honours/records/Club Legend status into the existing Legacy Points
   payout (the formula already references awards + prestige); add a Club Legend retirement bonus.

## Verification per step
- `npm run build` + `node scripts/play-session-regression-smoke.mjs` green.
- `node scripts/season-balance-lab.mjs` → End OVR byte-identical (Honours never touches XP/goals/dev).
- A deterministic Node probe for: record seeding (no 0s, scales with tier), Club Legacy status
  thresholds, and award score vs threshold (player loses by a small margin sometimes — not free).
- In-browser: 0 console errors; reduced-motion safe Honours sequence.

## Balance & determinism notes
- Routine output gives minimal Club Legacy; milestones/records/promotions/titles give the bulk.
- Diminishing returns on records and apps so a weak-club farm is never optimal.
- The stronger-club path stays better for OVR and earnings — Club Legacy is heart, not head.
- All seeding via the existing world/career seed. Frozen records are immutable once the player leaves.

## V2 (next, well-defined)
Lightweight **real** NPC competitor set for the player's league: seed ~200–400 `WorldPlayer`s, distribute
each world match's goals/assists/minutes/ratings to them, accumulate season stats, build real top-scorer
/ assist / rating tables and a genuine award race + Team of the Season. Held in memory per season,
collapsed to winners/records on rollover. Replaces the V1 seeded threshold.

## V3 (only if needed)
Broaden NPC realism across all leagues; this is the point to migrate persistence from localStorage to
**IndexedDB** (async, larger quota). Kept feasible by V1's separation of regenerable world from
persisted outcomes.
