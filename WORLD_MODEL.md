# Persistent World Model

Design + build log for turning the football world (leagues, clubs, tables) into
**persistent simulation state that exists independently of the player**, instead
of being regenerated around the player on demand.

This is the foundation for real transfers and league progression now, and a cheap
dynasty hand-off later. Built in stages so the game stays playable at every step.

> Status: **Stage 3 complete** on branch `feature/transfers` (Stages 1-2 merged to
> `main`). See "Build log". This doc is the source of truth for the design and the
> hand-off to Codex.

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

Added in **Stage 2** (standings as stored, accumulated state):

```ts
type ClubSeasonRecord = {
  clubId: ClubId;
  played: number; wins: number; draws: number; losses: number;
  goalsFor: number; goalsAgainst: number; points: number;
};
type LeagueSeason = { leagueId: LeagueId; records: Record<ClubId, ClubSeasonRecord> };
// World gained: leagueSeasons: Record<LeagueId, LeagueSeason>
```

(Records are keyed by `ClubId` rather than an array so per-matchweek updates are
cheap; the sorted table is derived on read by `getWorldLeagueTable`.)

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

### Stage 2 — standings become real + carry across seasons  *(DONE)*
- Add `ClubSeasonRecord` / `LeagueSeason`; reset at season start.
- Each matchweek, advance **all** clubs' records (light deterministic sim for
  non-player clubs; player's club from real results) and **store** them. Hook this
  into `finishMatchState` (player week) + a world tick.
- At season end: finalise standings, apply promotion/relegation (move `clubIds`
  between leagues by `tierOrder`), drift club strengths, start next `LeagueSeason`,
  bump `world.seasonNumber`.
- `getWorldLeagueTable` then reads stored records instead of deriving.

### Stage 3 — transfers read the world  *(DONE)*
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
- `systems/world.ts` — pure world logic (table, matchweek advance, season rollover,
  seeded variation). May import `data/*`, `utils`, `types`.
- `systems/transfers.ts` — world transfer query (interested clubs, world→club state).
  Must NOT import `systems/contracts` (contracts depends on transfers, not vice versa).
- `systems/season.ts` — `getLeagueTable` calls `systems/world.ts`.
- `systems/contracts.ts` — depends on `systems/transfers.ts` for the transfer market.
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

### Stage 2 — DONE
- **2a (commit `2de6e36`)** — accumulated standings. `types`: `ClubSeasonRecord`,
  `LeagueSeason`, `World.leagueSeasons`. `data/world.ts`: seeds zeroed records +
  `emptyClubSeasonRecord`. `systems/world.ts`: `advanceWorldMatchweek` (player club
  takes its real result, others a deterministic light sim), `resetWorldSeason`, and
  `getWorldLeagueTable` now reads stored records. `systems/match.ts`:
  `finishMatchState` advances the world one matchweek. `systems/season.ts`:
  `getLeagueTable` reads stored records. `SAVE_VERSION` 4; `cloneWorld` deep-clones
  `leagueSeasons`. Verified in-browser: the table accumulates real points after a
  match and persists across reload.
- **2b (commit `2def55b`)** — promotion/relegation + strength drift.
  `systems/world.ts`: `rolloverWorldSeason(world, playerShortCode)` +
  `sortedClubIdsByRecord`. `systems/season.ts`: `startNextSeasonState` calls it.
  Player club pinned; league sizes preserved. **Playtested end-to-end** (full
  12-match season driven in-browser to season 2): the two strongest grassroots
  clubs (Viborg Reserves, Vejle Juniors) were promoted to local-semi-pro with
  strength drifting up (21→23, 22→24), two clubs (Esbjerg Works, Viborg Town) were
  relegated in with strength drifting down, both leagues stayed at 12 clubs, and the
  player's club (Northbridge) was correctly pinned. No console errors across the run.

**Stage 2 polish — seeded variation (deterministic, not RNG).** `systems/world.ts`
gained a `hash01(seed)` pseudo-random helper (FNV-style, returns [0,1)). Two uses,
both seeded by club + season so they vary yet stay reproducible (no `Math.random`):
- `simClubWeek` wobble now includes `seasonNumber`, so a club's weekly results — and
  thus the table — differ season to season instead of being identical every year.
- `rolloverWorldSeason` adds a strength swing to promoted/relegated clubs: ~30% of
  moves get a thematic shift (a relegated club "sells its best players" → extra drop;
  a promoted club "invests" → extra boost), otherwise a small ±2 wobble. This makes
  the yo-yo likely but not guaranteed.

Playtested over 3 seasons: promotion was no longer purely the strongest club (a
str-20 club went up over a str-21 club), a relegated club stayed down across two
seasons, and a club that bounced back down returned weaker (20 → 15) — all with no
console errors. Tuning knobs: the 0.3 drift factor, the 0.3 swing probability, the
4–7 swing magnitude and the ±5 weekly wobble in `systems/world.ts`.

Known Stage-2 limitations (addressed later):
- Non-player results are a light deterministic sim, not real fixtures.
- World advances one matchweek per player matchweek (12), abstracting real rounds.
- Player club still embedded + pinned; `clubId` migration + dynasty are Stage 4.

### Stage 3 — DONE (branch `feature/transfers`)
The transfer market is now the real world. New module **`systems/transfers.ts`**
(pure world query; does NOT import `contracts`, so the graph stays acyclic —
`contracts` depends on `transfers`):
- `getInterestedWorldClubs(game, lastMatch?)` — ranks `world.clubs` by interest
  (selection score, OVR, prestige, form, tier gap, minus a reputation-resistance so
  high-rep clubs cool on an under-level player), capped to one tier above current.
  Seeded by club+week so it varies yet is reproducible.
- `worldClubToClubState(club)` — maps a `WorldClub` to the player's embedded club on
  transfer, keeping the world club's exact short code so results feed its standings.

`systems/contracts.ts`:
- `getExpiredContractMarketOffer` now builds the offer from the most-interested world
  club (new helper `buildOfferFromWorldClub`, wage shaped from the club's tier band +
  a reputation factor); the legacy `contractMarketClubs` path remains as a fallback.
- `acceptContractOfferState` joins the real world club via `worldClubToClubState` when
  the offer carries a `clubId` (added to `ContractOffer`).

Verified end-to-end in-browser: with the trial contract expired, finishing a match
produced a transfer offer from a real world club (Vejle Juniors, `clubId`
`grassroots-dev-10`, source `external-club`); accepting moved the player into that
club (matching short code → the player now sits in that club's league and feeds its
standings), and the old club reverts to NPC sim. Build + balance:season green; zero
import cycles; no console errors.

### Stage 3b — DONE: multi-offer transfer choice (demand-gated)
When the player is genuinely in demand, the transfer market offers a *choice* of clubs
instead of a single deal.
- `types`: `GameState.contractOffers?: ContractOffer[]` (alongside the single
  `contractOffer` used for current-club renewals).
- `systems/contracts.ts`: `getTransferMarketOffers(game, lastMatch)` — count scales
  with demand (number of clubs above a strong-interest threshold, clamped 1–3) and the
  chosen clubs are spread across tiers (distinct-tier first, then fill) so the terms
  differ (a higher club offering more wage / smaller role vs. a same-tier starter
  role). `acceptContractOfferState(state, chosen?)` accepts a specific offer.
- `systems/match.ts`: `finishMatchState` routes an expired contract to the market
  (single offer → `contractOffer`, several → `contractOffers`); renewals stay single.
- UI: `components/screens.tsx → ContractOfferScreen` renders one card per offer with a
  per-club Accept button (plus the central "Accept Offer" = top pick) and "Decline all".
  `App.tsx` carries `contractOffers` through the offer flow.

Verified in-browser: an in-demand player (high prestige/form, expired deal) got 3
offers spread across tiers (Silkeborg II grassroots $90 Starter, Havenbrook FC
local-semi-pro $240 Starter, Randers Academy grassroots $90 Starter); the choice
screen rendered all three; accepting the non-first semi-pro offer moved the player up
to that club's division. A non-in-demand player still gets a single offer. No console
errors; build + balance:season green; zero import cycles.

Stage-3 notes / future:
- Mid-season transfers reuse the existing fixture rebuild; the world record sync is
  approximate mid-season (most moves happen at the season boundary).
- `contractMarketClubs` (static list) is now only a fallback for world-less states.
- Demand tuning knobs: `STRONG_INTEREST` (58) and the 1–3 count in
  `getTransferMarketOffers`; interest weights in `systems/transfers.ts`.

## Hand-off notes for Codex

- Branch: `feature/persistent-world`. Build with `npm run build` (tsc + vite) and
  keep it green per commit; also run `npm run balance:season -- --seasons=2` as a
  smoke check.
- Hard constraints: **no `Math.random` / `Date.now` / argless `new Date()`** in
  `src` (breaks lab + resume) — seed everything deterministically. Keep the import
  graph acyclic (`data` must not import `systems`).
- Stage boundaries above are the commit boundaries. Each stage should leave the game
  playable. Update this doc's status + the staged plan as you go.

---

# World v2 — Multi-country pyramid

> Status: **Stage A + B + C done** (Stages 1-3 + v2 A/B merged to `main`; Stage C on
> branch `feature/world-v2-stage-c`). Replaces the single 6-tier ladder with countries,
> each holding its own ladder of divisions that map onto a shared global tier scale.

## Why
The single global pyramid can't express that the Danish Superliga ≈ the English
second tier, or that big countries have deep pyramids while small ones are shallow.
v2 decouples **competition** from **quality**.

## The locked model

Two axes:
- **Tier 1–6** = global quality. **Tier 1 = the best leagues in the world**; tier 6 =
  the global bottom. This is the comparability axis (transfers, player level, wages).
- **Division = (country, level)** — level 1 = the top of *that country*. Each division
  is pinned to a global tier.

**Countries & divisions (all reach tier 6 so any start country begins at the bottom):**

| Country | Divisions | Tiers (level 1 → down) |
|---------|-----------|------------------------|
| England / Spain / Italy | 6 | 1, 2, 3, 4, 5, 6 |
| Germany / France / Holland / Denmark | 5 | 2, 3, 4, 5, 6 |

- **Tier 1 divisions: 20 clubs.** All other divisions: **16 clubs.**
- **Promotion / relegation (within a country, between adjacent levels):**
  - Tier 1 division (top of the big-3): 0 up, **3 down**.
  - Tier 2 division: **3 up**, **2 down**.
  - All other divisions: **2 up / 2 down**.
  - A country's top division: 0 up. A country's bottom (tier 6): 0 down.
  - Sizes stay constant at every boundary (each boundary moves the same count both
    ways: the tier1↔tier2 boundary is 3, all others 2).
- **Player start:** pick a country at career start → begin in that country's bottom
  division (always tier 6, ~15–25 OVR). Big country = climb all 6 tiers with one
  club; mid country = climb to tier 2 then transfer abroad to reach tier 1.
- **Two ways up:** (a) promoted *with your club* through a country's divisions
  (player club is no longer pinned — it is a real world club that moves), (b) transfer
  to another club/country, gated by global tier.

Consequence (accepted): mid countries top out at tier 2, so tier 1 is reachable only
by transferring to England/Spain/Italy. World size ≈ 620 clubs (3×100 + 4×80) — fine
for localStorage; trim lower-division club counts later if needed.

## Tier scale (global quality bands)
Reuse the existing 6 bands but **inverted and renumbered so 1 = best**: tier 1 ≈ elite
(avg OVR ~90), …, tier 6 ≈ the bottom (avg OVR ~15, accommodating a raw Gen-1 start).
`getLeagueTierIndex` / `getContextualAbilityScore` must be updated for 1 = top.

## Etape-plan (commit boundaries; keep build + balance:season green each step)

- **Stage A — model + seed. ✅ DONE.** Added `Country`/`CountryId` types; `WorldLeague`
  gained `countryId` + `level`; `World` gained `countries`. The existing 6 tier bands
  ARE the global tiers (elite = tier 1 … grassroots-dev = tier 6) — kept as-is to
  avoid churn. `data/world.ts seedWorld()` now builds 7 countries (England/Spain/Italy
  = 6 divisions tiers 1-6; Germany/France/Holland/Denmark = 5 divisions tiers 2-6),
  tier-1 divisions = 20 clubs else 16, promotion/relegation slots per the spec
  (tier1↔2 = 3, else 2). Northbridge is seeded into Denmark's bottom (tier 6); the
  Danish-flavoured names populate Denmark, the rest are generated from name pools.
  `systems/world.ts rolloverWorldSeason` now promotes/relegates **per country**
  between adjacent levels (player club still pinned until Stage C). `cloneWorld`
  clones `countries`; `SAVE_VERSION` → 5. Verified (bundled seed run): 7 countries,
  38 leagues, 620 clubs, no duplicate short codes, slot counts exactly per spec,
  initial-state + getLeagueTable/getSeasonReview/getUpcomingMatch all run clean.
  (Bugfix: `makeShortCode` must use an unbounded counter — bounding it looped forever
  once a prefix's variants were exhausted across ~620 clubs, which blanked the app.)
- **Stage B — promotion/relegation per country.** Rework `rolloverWorldSeason` to
  move clubs between adjacent levels *within each country* using the counts above,
  with strength drift toward the new tier.
- **Stage C — player follows club + `clubId`. ✅ DONE.** `ClubState` gained an optional
  `clubId`; `initialState` links the player's club to its seeded world entity (Denmark,
  tier 6) by short code and carries the clubId; `worldClubToClubState` (transfers) sets
  it too. `rolloverWorldSeason` no longer special-cases the player — its club
  promotes/relegates like any other. `startNextSeasonState` then re-syncs `game.club`
  (and `contract.tierId`) from the world club after rollover, rebuilds the season
  fixtures for the new division, and announces promotion/relegation in `lastEvent`.
  `SAVE_VERSION` → 6. Verified in-browser: with the player's club forced to win its
  division, the season rollover promoted it (Denmark Div 5 → Div 4) and the player
  followed — same clubId, tier grassroots-dev → local-semi-pro, contract + fixtures +
  renewal wage all reflecting the higher division, no console errors.
- **Stage D — cross-country transfers by tier.** `getInterestedWorldClubs` already
  gates by tier; confirm/﻿tune interest across countries (a tier-2 player hears from
  tier-1/2 clubs in any country).
- **Stage E — country selection. ✅ DONE (selection part).** A `CountrySelectScreen`
  is shown at the start of a new Gen-1 career (no save yet, or after "New Career"):
  pick one of the 7 countries and the career starts in that country's **weakest
  tier-6 club** ("start from the bottom"). `createCareerForCountry(countryId)` builds
  the fresh state; `initialState` is now `createCareerForCountry("denmark")` (the load
  fallback). `hasSavedGame()` gates whether the app opens on the picker or the saved
  career; the save effect is suppressed until a country is chosen; the bottom nav is
  hidden on the picker. Verified in-browser: fresh start shows the 7-country picker;
  picking Italy started the player at Elmsworth Albion (Italy tier 6, weakest in its
  division), the career persisted across reload, no console errors.
  Still open under "Stage E": a **browse-the-pyramid UI** (see other leagues/divisions)
  and **Gen 2+ offer-driven start** (the son inherits a name → offered contracts rather
  than picking a country) — the latter belongs with the dynasty loop.

- **Stage F — country-correct identity. ✅ DONE.** Two follow-ups so the world reads
  like the player's actual country instead of always-Danish:
  1. **Themed club names.** `data/world.ts` replaces the single English `CITY_POOL`/
     `SUFFIX_POOL` with a per-country `NAME_POOLS` map (England, Spain, Italy, Germany,
     France, Holland, Denmark each get their own city + suffix lists; the suffix always
     follows the city so the city is the short name). A per-country counter walks cities
     one-by-one (distinct within a division) and offsets the suffix by `cityIndex + band`
     so suffixes vary *within* a division while every generated name stays unique across
     the country. Denmark still injects its real named clubs (Northbridge FC, Aalborg…)
     and only themes the generated overflow.
  2. **World-based fixtures.** `systems/club.ts → createSeasonFixturesFromWorld(club, world)`
     builds the player's 12-match schedule from their REAL league's other clubs (seeded
     venue/form/service, real strengths), replacing the static Danish `seasonFixtures`
     list. Used by `initialState`, `season.ts` (rollover), `save.ts` (fallback) and
     `rebuildSeasonForClub` (transfer). Legacy `createSeasonFixtures` is kept only as the
     no-world fallback (pre-world saves / sim-lab).
  3. **Highlight names.** `engine/matchEngineCore.js → createSimEvent` no longer hardcodes
     "Northbridge"; it reads `input.teamShort` (passed from `state.club.shortName` in
     `match.ts`), so goal/chance/sub highlights name the player's actual club.
  `SAVE_VERSION` → 7 (themed world re-seeds on load). Verified in-browser: a Spain career
  starts at Torrente Deportivo, all fixtures are Spanish sides, a full match shows no
  "Northbridge" anywhere, and every country's pyramid is themed correctly.

- **Stage G — full league schedule. ✅ DONE.** The season was hardcoded to 12 matches
  regardless of league size. `createSeasonFixturesFromWorld` now builds a **single
  round-robin**: the player faces every other club in their league exactly once, so the
  season length tracks the league size (16-club division → 15 matches, a 20-club tier-1
  → 19). Cup framing dropped — it's a clean league schedule (all matches use the tier's
  league competition). The world already advances one matchweek per player match, so the
  standings stay consistent (every club plays the same number of games — verified: after
  2 player matches all 16 league clubs show `played: 2`). `SAVE_VERSION` → 8.

## Hand-off notes
Same hard constraints as v1: no `Math.random`/`Date.now`; acyclic imports
(`data` ⊄ `systems`); seed deterministically; bump `SAVE_VERSION` (disposable saves).
Update this section's status + stage markers as each stage lands.
