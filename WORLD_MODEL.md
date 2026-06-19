# Persistent World Model

Design + build log for turning the football world (leagues, clubs, tables) into
**persistent simulation state that exists independently of the player**, instead
of being regenerated around the player on demand.

This is the foundation for real transfers and league progression now, and a cheap
dynasty hand-off later. Built in stages so the game stays playable at every step.

> Status: **Stage 1 complete** on branch `feature/persistent-world` (see "Build log").
> This doc is the source of truth for the design and the hand-off to Codex.

---

## Why (the problem in the current code)

Today the world is faked, player-centric, and stateless:

- `systems/season.ts → getLeagueTable(game)` **recomputes** the whole table on
  every call. It takes a template list (`systems/club.ts → createLeagueTeams`,
  derived from `data/fixtures.ts → baseLeagueTeams` + a tier offset), gives the
  player's club its real record, and **fabricates every other club's W/D/L from a
  formula** based on `strength`, matches played, and char codes of the short name.
- "Other clubs" only exist as two static templates: `contractMarketClubs`
  (for offers) and `baseLeagueTeams` (for the table).
- `startNextSeasonState` regenerates the player's fixtures from a tier template.

So other clubs have **no persistent standings, no shared identity, no memory across
seasons or generations**. This works for V1 but fights both rich transfers and the
dynasty loop.

## Core principle

The world is its own state. The player's career is a **view into** that world.

- Leagues and clubs are first-class entities that live in `GameState.world`.
- They persist across seasons and (later) across generations.
- Eventually the player references the world by id (`career.clubId`) instead of
  embedding a club. **Stage 1 deliberately keeps the existing `game.club`** and
  links to the world by `shortCode`; the `clubId` migration is a later stage to
  bound the blast radius.

The existing `data/leagues.ts → leagueTiers` (6 tiers) stays as-is: it is the
**rules of a level** (averageOvr, wageRange, facility, prestige). A `WorldLeague`
is a **concrete competition** at a tier with specific member clubs.

## Data model

Types live in `src/types.ts`. Stage 1 adds:

```ts
type ClubId = string;
type LeagueId = string;

type WorldClub = {
  id: ClubId;
  name: string;
  shortName: string;
  shortCode: string;
  leagueId: LeagueId;     // which league it plays in now (changes on promo/releg)
  tierId: LeagueTierId;   // denormalised for convenience; matches its league's tier
  strength: number;       // squad OVR; may drift season to season (Stage 2)
  reputation: number;     // drives transfer interest (replaces wageFactor/roleBias)
};

type WorldLeague = {
  id: LeagueId;
  name: string;
  tierId: LeagueTierId;
  clubIds: ClubId[];
  promotionSlots: number;
  relegationSlots: number;
};

type World = {
  seasonNumber: number;             // the world's own clock
  clubs: Record<ClubId, WorldClub>;
  leagues: Record<LeagueId, WorldLeague>;
  tierOrder: LeagueTierId[];        // bottom -> top, for promotion/relegation
};
```

Deferred to **Stage 2** (documented here so the shape is agreed, not yet in code):

```ts
type ClubSeasonRecord = {
  clubId: ClubId;
  played: number; wins: number; draws: number; losses: number;
  goalsFor: number; goalsAgainst: number; points: number;
};
type LeagueSeason = { leagueId: LeagueId; table: ClubSeasonRecord[] };
// World gains: leagueSeasons: Record<LeagueId, LeagueSeason>
```

## Seeding (`data/world.ts → seedWorld()`)

`seedWorld()` builds the initial world deterministically (no `Math.random` /
`Date.now` — those are banned in this codebase because they break the sim-lab and
save-resume). One league per tier, ~12 clubs each:

- **Bottom tier (`grassroots-dev`)** reuses the existing names so the early game is
  unchanged: the player's `initialClub` (Northbridge) + the 11 `baseLeagueTeams`.
- **`local-semi-pro` / `regional-pro`** seed the named `contractMarketClubs` for
  those tiers (Esbjerg Works, Viborg Town, Silkeborg City; Odense Crown, Aarhus
  1902) plus generated fillers.
- **`national-pro` / `top-flight` / `elite`** are fully generated from deterministic
  name pools, with `strength` spread across each tier's `teamRange` and `reputation`
  derived from tier + strength.

Short codes are made unique across the world. Clubs link to their league via
`leagueId`; leagues list their `clubIds`.

## Staged plan

### Stage 1 — world exists + table reads from it  *(this branch)*
- Add the types above + `GameState.world`.
- `data/world.ts → seedWorld()` builds the world from existing tiers/templates.
- `systems/world.ts → getWorldLeagueTable(...)` builds a `LeagueTableRow[]` from the
  world's clubs in the player's league. **Standings are still derived** by the same
  deterministic formula as today (so behaviour barely changes) — but sourced from
  persistent world identities, not a throwaway template.
- `systems/season.ts → getLeagueTable(game)` reads the world when present, with a
  fallback to the old fabrication (keeps old saves / lab safe).
- `initialState` seeds the world; `state/save.ts` clones it and seeds it on
  normalise; `SAVE_VERSION` bumped (old single-career saves reset — fine now).
- **Acceptance:** `npm run build` green, `npm run balance:season` runs, Club tab
  league table renders from the world, save/load works.

### Stage 2 — standings become real + carry across seasons
- Add `ClubSeasonRecord` / `LeagueSeason`; reset at season start.
- Each matchweek, advance **all** clubs' records (light deterministic sim for
  non-player clubs; player's club from real results) and **store** them. Hook this
  into `finishMatchState` (player week) + a world tick.
- At season end: finalise standings, apply promotion/relegation (move `clubIds`
  between leagues by `tierOrder`), drift club strengths, start next `LeagueSeason`,
  bump `world.seasonNumber`.
- `getWorldLeagueTable` then reads stored records instead of deriving.

### Stage 3 — transfers read the world
- Replace `contractMarketClubs`-based offers with a query over `world.clubs`
  (filter by tier/reputation/squad-need vs. the player's OVR/form/prestige).
- Accepting a move sets the player's club to a real world club + its league.

### Stage 4 — `clubId` migration + dynasty hand-off  *(later)*
- Replace embedded `game.club` with `career.clubId` referencing the world.
- On retirement/new generation, keep `world` (aged N seasons), reset the career;
  the son enters the same world at a youth/low club. `dynastyHistory` stores
  `clubId` so "your father played for X" becomes possible.

## Module placement & layering

Respect the existing acyclic DAG (`data ← systems ← state/components ← App`):

- `types.ts` — world types.
- `data/world.ts` — `seedWorld()` + name pools. **Must not import from `systems/`**
  (data is a low layer). Inline tiny helpers (e.g. short-code) here.
- `systems/world.ts` — pure world logic (table, later: advance/finalise). May import
  `data/*`, `utils`, `types`.
- `systems/season.ts` — `getLeagueTable` calls `systems/world.ts`.
- `state/initialState.ts` — seeds `world`. `state/save.ts` — clone + normalise.

## Save strategy

`SAVE_VERSION` bumped to invalidate pre-world saves. This is intentional: while the
loop is open, saves are single-career and disposable, so this is the cheap window to
get the `world` shape right before multi-generation saves exist. `normalizeSavedGame`
also seeds `world` defensively if a loaded save lacks it.

## Sim-lab

The balance labs (`scripts/*.mjs`) import only from `engine/*` and re-implement
season/training, so Stage 1 does not touch them. When Stage 2 lands, the lab should
seed a `World` too, so it can validate multi-season league progression (and later the
generation hand-off) numerically — extending the existing balance workflow.

## Build log

### Stage 1 — DONE
Files added/changed:
- `src/types.ts` — `ClubId`, `LeagueId`, `WorldClub`, `WorldLeague`, `World`;
  `GameState.world`; `SavePayload.version` 2 → 3.
- `src/data/world.ts` — `seedWorld()` + deterministic name pools (`TIER_ORDER`,
  `CITY_POOL`, `SUFFIX_POOL`). One league per tier × 12 clubs; grassroots reuses
  `initialClub` + `baseLeagueTeams`; semi-pro/regional seed named market clubs;
  higher tiers generated. Pure, no RNG.
- `src/systems/world.ts` — `findLeagueByClubShortCode`, `findLeagueByTier`,
  `getWorldLeagueTable(world, leagueId, player)` (player row from real results,
  others still derived — Stage 2 replaces with stored records).
- `src/systems/season.ts` — `getLeagueTable` reads the world when present, with a
  fallback to the legacy template table (keeps sim-lab / pre-world states working).
- `src/state/initialState.ts` — seeds `world: seedWorld()`.
- `src/state/save.ts` — `SAVE_VERSION` 3, `cloneWorld`, normalise seeds `world` if
  missing.

Verification: `npm run build` green; `npm run balance:season -- --seasons=2` runs;
zero import cycles across all `src` files; browser smoke confirmed the Club tab
league table renders 12 persistent world clubs (Northbridge + grassroots field) and
save/load works. Bundle grew ~3 kB (real new content: ~72 seeded clubs).

Known Stage-1 limitations (by design, addressed later):
- Standings for non-player clubs are still derived per render, not accumulated.
- Player club is still embedded (`game.club`) and linked to the world by `shortCode`.
- `systems/club.ts → createLeagueTeams` is now only used by the legacy fallback.

## Hand-off notes for Codex

- Branch: `feature/persistent-world`. Build with `npm run build` (tsc + vite) and
  keep it green per commit; also run `npm run balance:season -- --seasons=2` as a
  smoke check.
- Hard constraints: **no `Math.random` / `Date.now` / argless `new Date()`** in
  `src` (breaks lab + resume) — seed everything deterministically. Keep the import
  graph acyclic (`data` must not import `systems`).
- Stage boundaries above are the commit boundaries. Each stage should leave the game
  playable. Update this doc's status + the staged plan as you go.
