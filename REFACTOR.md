# App.tsx Split — Refactor Log

Living document tracking the incremental split of the monolithic `src/App.tsx`
into focused modules. Updated once per phase. Every change here is a **pure
mechanical relocation** — no gameplay, balance or behavior changes are mixed in.

## Goal

`src/App.tsx` started at **7,339 lines** holding state, types, data, all UI
components and all gameplay logic in one file. The goal is to split it into a
layered module structure so the code is navigable and safe to extend, **without
changing any runtime behavior**.

## Target architecture

Dependency direction is a strict DAG: `types ← data ← state ← systems ← components ← App`.

```
src/
  App.tsx               // App(): state, handlers, screen routing
  types.ts              // all type/interface declarations            [DONE — Phase 1]
  data/
    attributes.ts       // attributes, generation profiles, info      [DONE — Phase 2]
    leagues.ts          // league tiers, club, contract market         [DONE — Phase 2]
    fixtures.ts         // season fixtures, base league teams          [DONE — Phase 2]
    support.ts          // support/specialist definitions              [DONE — Phase 2]
  utils.ts              // clamp (generic math leaf)                   [DONE — Phase 3]
  state/
    save.ts             // save/load, clone, normalize                 [DONE — Phase 5]
    initialState.ts     // initialContract, initialState                [DONE — Phase 4]
  systems/              // pure gameplay logic (import-safe DAG, see Phase 6)
    attributeXp.ts      // attribute XP requirement + growth pressure   [DONE — Phase 3]
    generation.ts       // getGenerationProfile, createGenerationAttrs  [DONE — Phase 4]
    club.ts             // fixtures/league/club construction            [DONE — Phase 4]
    formatting.ts       // format/label helpers                         [DONE — Phase 6a]
    ovr.ts              // OVR, attribute maps, league scaling, tiers   [DONE — Phase 6b]
    support.ts          // buySupportUpgradeState + support getters     [DONE — Phase 6c]
    seasonState.ts      // fixture readers/writers, form, record        [DONE — Phase 6d]
    selection.ts        // selection report, fitness, role/minutes      [DONE — Phase 6e]
    training.ts         // applyTrainingWeek, quality, focus, attr XP   [DONE — Phase 6f]
    contracts.ts        // offers, accept, advance, status              [DONE — Phase 6g]
    season.ts           // league table, review, dynasty, next season   [DONE — Phase 6h]
    match.ts            // createMatch, resolve, sim, summaries         [DONE — Phase 6i]
  components/
    shared.tsx          // primitives, nav, headers (+ navItems)        [DONE — Phase 7a]
    cards.tsx           // screen section cards (+ getReadinessDetails)  [DONE — Phase 7b]
    screens.tsx         // full screens + sub-views                     [DONE — Phase 7c]
```

## Working conventions

Each phase follows the same discipline:

1. Work on branch `refactor/split-app` (branched from `main` at `05548d3`).
2. Move declarations verbatim — copy exact text, add `export`, change nothing else.
3. Verify with `npm run build` (runs `tsc --noEmit` + `vite build`). Must stay green.
4. Confirm the production JS bundle stays functionally identical in size — type
   moves are byte-identical; value moves differ only by module-wrapper overhead.
5. One phase = one commit, with a message explaining what moved and why.
6. Push the branch. PRs are opened manually in the browser (no `gh` CLI installed).

## Line-count progress

| Milestone | `App.tsx` lines | Delta | Commit |
|-----------|----------------:|------:|--------|
| Baseline (branch point) | 7,339 | — | `05548d3` |
| Phase 1 — types | 6,972 | −367 | `a41d3ef` |
| Phase 2 — data | 6,459 | −513 | `06af327` |
| Phase 3 — pure-logic core | 6,401 | −58 | `49fbd60` |
| Phase 4 — construction + initial state | 6,261 | −140 | `1f5f727` |
| Phase 5 — save/load | 6,095 | −166 | `67d1d13` |
| Phase 6a — formatting | 5,950 | −145 | `80cf634` |
| Phase 6b — ovr | 5,858 | −92 | `1030291` |
| Phase 6c — support | 5,694 | −164 | `b495fee` |
| Phase 6d — seasonState | 5,592 | −102 | `01ecf3d` |
| Phase 6e — selection | 5,303 | −289 | `9565117` |
| Phase 6f — training | 4,772 | −531 | `74bd68a` |
| Phase 6g — contracts | 4,547 | −225 | `b7a945e` |
| Phase 6h — season | 4,311 | −236 | `cede98f` |
| Phase 6i — match | 3,141 | −1,170 | `5071d4e` |
| Phase 6 — import cleanup | 3,141 | 0 | `fcd29df` |
| Phase 7a — shared components | 2,824 | −317 | `b2a6240` |
| Phase 7b — cards | 2,097 | −727 | `72b0008` |
| Phase 7c — screens | 678 | −1,419 | `4dfa986` |
| Phase 7 — import prune | 547 | −131 | `d184a8a` |

---

## Phase 0 — Safety net

- Created branch `refactor/split-app` from `main` (`05548d3`).
- Confirmed baseline `npm run build` green before any change.
- Recorded that `scripts/match-balance-lab.mjs` and `season-balance-lab.mjs`
  import only from `src/engine/*`, **not** from `App.tsx`, so they are unaffected
  by this refactor. (They re-implement season/training logic independently; a
  future opportunity is to let them share extracted systems modules.)

---

## Phase 1 — Extract types → `src/types.ts`

**Commit:** `a41d3ef` — *Extract shared types into types.ts module*

### What moved
All 52 `type` declarations that previously lived at the top of `App.tsx`
(originally lines 50–462, plus `GenerationProfile` at 484–491) moved verbatim
into a new `src/types.ts`, each prefixed with `export`.

`types.ts` re-imports the external types it references, using `import type`:
- from `./engine/matchEngineCore`: `EngineSimEvent`
- from `./matchEngine`: `ForwardHighlightCategory`, `OpponentForm`, `OpponentProfile`, `ServiceLevel`
- from `./positionRoles`: `AttributeKey`, `MatchRole`, `PositionGroup`

Types moved (in file order): `NavKey`, `ScreenKey`, `Intensity`, `MatchSpeed`,
`Venue`, `ClubView`, `HomeView`, `SupportUpgradeId`, `SupportTrackId`,
`FitnessAvailability`, `LeagueTierId`, `Attribute`, `GrowthPressureTone`,
`SeasonStats`, `DynastySeason`, `Fixture`, `FixtureResult`, `LeagueTeam`,
`ClubState`, `LeagueTier`, `DevelopmentEnvironment`, `TrainingSpecialistId`,
`TrainingQuality`, `TrainingSpecialist`, `TrainingQualityProfile`,
`LeagueTableRow`, `SeasonState`, `DynastyState`, `Contract`, `ContractOffer`,
`SupportUpgradeDefinition`, `SupportTrackDefinition`, `GameState`, `SavePayload`,
`AttributeLevelUp`, `TrainingSummary`, `UpcomingMatch`, `SelectionReport`,
`SelectionFactor`, `MatchState`, `MatchEvent`, `SimMatchEvent`,
`PlayerMatchEvent`, `MatchMoment`, `MatchChoice`, `ChanceQuality`, `OutcomeTier`,
`MatchResult`, `MatchTotals`, `LastMatchSummary`, `GenerationProfile`.

### What changed in `App.tsx`
The type block was replaced with a single `import type { … } from "./types"`
listing all the moved type names.

### Verification
- `npm run build` green.
- Production bundle **byte-identical** (`index-CuabfAQf.js`, 379.50 kB) — proof of
  zero behavior change, since types are erased at compile time.
- 0 `type` declarations remain in `App.tsx`.

### Notes
- `tsconfig.json` has no `noUnusedLocals`, so importing the full type list is safe.
- Confirmed `GenerationProfile` (the one type that lived inside the data block)
  was moved too, and `generationProfiles` still resolves it via the import.

---

## Phase 2 — Extract static data → `src/data/*`

**Commit:** `06af327` — *Extract static game data into data/ modules*

### What moved
Only **pure data literals** (no functions) were relocated. Three contiguous
ranges were removed from `App.tsx` and recreated as exported constants:

**`src/data/attributes.ts`** (imports: `AttributeKey` from `../positionRoles`;
`Attribute`, `DynastyState`, `GenerationProfile` from `../types`)
- `initialAttributes`
- `generationProfiles`
- `initialDynasty`
- `attributeInfo`

**`src/data/leagues.ts`** (imports: `ClubState`, `LeagueTier`, `LeagueTierId` from `../types`)
- `leagueTiers`
- `currentLeagueTier`, `currentClubName`, `currentClubShortName`, `currentClubStrength`
- `initialClub`
- `contractMarketClubs`

**`src/data/fixtures.ts`** (imports: `Fixture`, `LeagueTeam` from `../types`)
- `seasonFixtures`
- `baseLeagueTeams`

**`src/data/support.ts`** (imports: `AttributeKey` from `../positionRoles`;
`SupportTrackDefinition`, `SupportUpgradeDefinition`, `SupportUpgradeId`,
`TrainingSpecialist`, `TrainingSpecialistId` from `../types`)
- `supportUpgradeDefinitions`
- `supportTrackDefinitions`
- `supportUpgradeMap`
- `bootsActionAttributes`
- `trainingSpecialists`
- `trainingSpecialistMap`
- `initialSupportUpgrades`

### What changed in `App.tsx`
Four value-import statements were added (one per data module). All ~20 in-file
references to the moved constants now resolve through those imports.

### Deliberately NOT moved (kept in `App.tsx`)
These depend on `clamp` and/or the attribute-XP curve (`getAttributeXpRequirement`),
which still live in the logic block. Moving them now would create a circular
import (`data → App → data`). They will move in Phase 4, after `clamp` and the
attribute-XP functions are extracted:
- `getGenerationProfile`, `createGenerationAttributes`
- `createSeasonFixtures`, `createLeagueTeams`
- `createClubStateFromOffer`, `rebuildSeasonForClub`
- `getClubStrengthForTier`, `getClubShortName`, `getClubShortCode`
- `initialContract`, `initialState`

### Verification
- `npm run build` green.
- Bundle 379.51 kB (was 379.50 kB) — the +0.01 kB is module-wrapper overhead from
  4 new modules (1635 → 1639 modules transformed); runtime behavior unchanged.
- Confirmed all 17 moved constants are gone from `App.tsx` and all retained
  construction functions are still present.

### Dependency learning
This phase surfaced the key coupling for the rest of the refactor: **data
construction depends on a small pure-logic core** — `clamp`,
`getBaseAttributeXpRequirement`, `getAttributeGrowthPressure`,
`getAttributeXpRequirement`. That core must be extracted to a leaf module
**before** the construction helpers and `initialState` can leave `App.tsx`.
Phase 4 is sequenced to do the core first.

---

## Phase 3 — Extract pure-logic core → `src/utils.ts` + `src/systems/attributeXp.ts`

**Commit:** `49fbd60` — *Extract pure-logic core: clamp and attribute-XP curve*

### What moved
The smallest set of pure functions that the Phase 2 data-construction helpers
depend on, so those helpers can leave `App.tsx` next without a circular import.

**`src/utils.ts`** (no imports — generic leaf)
- `clamp`

**`src/systems/attributeXp.ts`** (imports: `Attribute`, `GrowthPressureTone` from `../types`)
- `getAttributeXpRequirement`
- `getBaseAttributeXpRequirement`
- `getAttributeGrowthPressure`

### What changed in `App.tsx`
Two import statements added; the four function definitions removed. All existing
call sites (`getAttributeGrowthDetail`, `getAttributeProgressPercent`,
`getXpPercent`, the construction helpers, training/level-up logic, …) now resolve
through the imports.

### Verification
- `npm run build` green.
- Bundle 379.51 kB, functionally identical (1641 modules).
- Confirmed the four functions no longer exist in `App.tsx`.

### Notes
- The wider OVR/attribute cluster (`calculateOvr`, `getOvrBreakdown`,
  `getAttributeValueMap`, `getLeagueAdjusted*`, `getContextualAbilityScore`,
  `getAttributeProgressPercent`, `getAttributeGrowthDetail`, `getXpPercent`) was
  deliberately left in `App.tsx` for now — it belongs to the larger `systems/ovr.ts`
  extraction (Phase 6). Only the leaf functions needed to unblock data
  construction were moved here.

---

## Phase 4 — Move game construction + initial state out of `App.tsx`

**Commit:** `1f5f727` — *Move game construction and initial state out of App.tsx*

### What moved
With `clamp` and the attribute-XP curve extracted in Phase 3, the construction
helpers could finally leave `App.tsx`.

**`src/systems/generation.ts`** (imports: `positionModules` from `../positionRoles`;
`Attribute` from `../types`; `generationProfiles`, `initialAttributes` from
`../data/attributes`; `getAttributeXpRequirement` from `./attributeXp`; `clamp` from `../utils`)
- `getGenerationProfile`
- `createGenerationAttributes`

**`src/systems/club.ts`** (imports: club/fixture types from `../types`;
`contractMarketClubs`, `leagueTiers` from `../data/leagues`; `baseLeagueTeams`,
`seasonFixtures` from `../data/fixtures`; `clamp` from `../utils`)
- `createSeasonFixtures`, `createLeagueTeams`
- `createClubStateFromOffer`, `rebuildSeasonForClub`
- `getClubStrengthForTier`, `getClubShortName`, `getClubShortCode`

**`src/state/initialState.ts`** (imports: `positionModules` from `../positionRoles`;
`Contract`, `GameState` from `../types`; `initialDynasty` from `../data/attributes`;
`initialClub` from `../data/leagues`; `initialSupportUpgrades` from `../data/support`;
`createGenerationAttributes` from `../systems/generation`; `createSeasonFixtures`
from `../systems/club`)
- `initialContract`
- `initialState`

### What changed in `App.tsx`
Imported back only the symbols still referenced by code remaining in `App.tsx`:
the seven `systems/club` helpers and `initialState`. A usage audit (grep for each
symbol outside the moved block) confirmed `getGenerationProfile`,
`createGenerationAttributes` and `initialContract` were used **only** inside the
moved code, so they are not re-imported. `tsc` confirms this — a missing external
reference would fail the build.

### Verification
- `npm run build` green.
- Bundle 379.52 kB, functionally identical (1644 modules).
- Confirmed all 11 declarations are gone from `App.tsx`.

### Notes
- `initialState.ts` is placed under `state/` (not `data/`) because it is no longer
  pure data — it depends on the `systems/` construction functions. The DAG is
  preserved: `data ← systems ← state(initialState)`.

---

## Phase 5 — Extract save/load → `src/state/save.ts`

**Commit:** `67d1d13` — *Extract save/load into state/save.ts*

### What moved
The whole persistence layer (a contiguous block in `App.tsx`) into
`src/state/save.ts`:
- `SAVE_KEY`, `SAVE_VERSION` (module-internal, not exported)
- `createInitialState`, `cloneGameState`, `cloneTrainingSummary`, `cloneLastMatchSummary`
- `loadSavedGame`, `normalizeSavedGame`, `normalizeSavedClub`, `mergeSavedAttributes`
- `saveGameState`, `clearSavedGame`

Imports: `getPositionModule` from `../positionRoles`; persistence types from
`../types`; `initialAttributes` from `../data/attributes`; `contractMarketClubs`,
`initialClub`, `leagueTiers` from `../data/leagues`; `createSeasonFixtures`,
`getClubShortCode`, `getClubShortName`, `getClubStrengthForTier` from
`../systems/club`; `initialState` from `./initialState`.

### What changed in `App.tsx`
Imported back the four entry points still used by the component layer:
`createInitialState` (reset), `loadSavedGame` (initial `useState`),
`saveGameState` (persist effect), `clearSavedGame` (reset). The clone/normalize
helpers and `SAVE_KEY`/`SAVE_VERSION` are internal to `save.ts` and not
re-imported. The Phase 4 `initialState` import became redundant (its only
consumer, `createInitialState`, moved to `save.ts`) and was swapped for the
`save` import.

### Verification
- `npm run build` green.
- Bundle 379.52 kB, functionally identical (1645 modules).
- Confirmed all 12 declarations are gone from `App.tsx`.
- Cycle-free: `save.ts` depends only on already-extracted modules; nothing it
  imports depends back on `save.ts`. This is exactly why Phase 4 (moving
  `initialState` + club helpers out) was sequenced first.

---

## Phase 6 — Extract gameplay logic → `src/systems/*`

The bulk of the file: ~159 logic functions split into nine cohesive systems
modules. Done as nine sub-commits (6a–6i) plus an import-cleanup commit, each
build-green.

### How the split was derived (tooling)
Splitting interdependent logic risked import cycles, so the boundaries were
computed, not guessed:
1. Built the internal call graph of all 159 top-level logic functions
   (scanning each function's full text **including default-parameter calls** —
   an early version missed these and hid a real cycle).
2. Confirmed the function graph is itself acyclic (Tarjan SCC: 159 singletons).
3. Assigned functions to modules by domain, then ran Tarjan SCC on the
   **module** graph and iterated until acyclic.
4. The one real module cycle found — `season ↔ contracts` (via
   `startNextSeasonState → getSeasonContractOffer → getSeasonReview`) — was
   resolved by keeping `getSeasonContractOffer` in `season` (its only caller is
   `startNextSeasonState`), making `season → contracts` one-directional.

### Import-safe order (low → high)
`formatting < ovr < support < seasonState < selection < training < contracts < season < match`

Each module imports only from lower modules + `data/*`, `utils`, `types`,
`positionRoles`, `matchEngine`, `engine/*`. Verified **zero import cycles**
across all 26 `src` files after extraction.

### Modules (commit)
- **6a `formatting.ts`** (`80cf634`) — formatSigned/Delta/PercentDelta,
  roundToNearest, getUniqueItems, morale/pressure/intensity/matchup/event labels,
  trust/form/average-rating, formatFixtureTitle, sumXp, getTopXpEntry.
- **6b `ovr.ts`** (`1030291`) — calculateOvr, calculatePotentialOvr,
  getOvrBreakdown, attribute value maps, getXpPercent, league-adjusted maps +
  getContextualAbilityScore, and tier helpers getClubLeagueTier /
  getContractLeagueTier / getLeagueTierIndex.
- **6c `support.ts`** (`b495fee`) — buySupportUpgradeState, track/upgrade getters,
  and the support-effect helpers (XP floor/ceiling, fatigue relief, recovery,
  boots, lifestyle).
- **6d `seasonState.ts`** (`01ecf3d`) — fixture readers/writers and form/record
  helpers (low-level so selection/season can read fixtures without a cycle).
- **6e `selection.ts`** (`9565117`) — getUpcomingMatch, getSelectionReport, fitness
  availability/impact, role/minutes, tactical focus, manager instruction.
- **6f `training.ts`** (`74bd68a`) — applyTrainingWeek, projection/quality, focus
  capacity, specialist XP, rollTrainingXp, attribute-XP application,
  getAttributeGrowthDetail, support-card display helpers.
- **6g `contracts.ts`** (`b7a945e`) — earnings, advanceContractWeek, contractFromOffer,
  acceptContractOfferState, club/expired-market offers, status/role helpers.
- **6h `season.ts`** (`cede98f`) — getLeagueTable, getSeasonReview/Verdict, market
  interest, contract outlook, startNextSeasonState, dynasty snapshot/totals,
  getSeasonContractOffer.
- **6i `match.ts`** (`5071d4e`) — match creation/seed, choice resolution, follow-ups,
  auto-sim, rating/XP composition, result/explanation/timeline helpers,
  summaries, buildLastMatchSummary, finishMatchState and post-match plumbing.

### App import-back + cleanup
During the step-by-step moves, `App.tsx` imported back any moved function still
referenced by the not-yet-moved logic in the file, so every intermediate build
stayed green. Once all nine modules were out, **6 cleanup** (`fcd29df`) removed
34 imports that had become unused (symbols only referenced by logic that had
since moved into sibling modules).

### Result
`App.tsx` went from 6,095 → **3,141 lines** in this phase. The only logic
function deliberately left in `App.tsx` is `getReadinessDetails` (a presentational
readiness helper used directly by the Player UI). Build green; bundle functionally
identical throughout.

---

## Phase 7 — Extract React components → `src/components/*`

The remaining bulk of `App.tsx` was 44 React components. Split into three files
along the natural layering, executed as three sub-commits (7a–7c) plus an
import prune, each build-green.

### How the split was derived
Same discipline as Phase 6: built the component reference graph (who renders
whom, scanning full bodies), assigned components to three groups, and ran Tarjan
SCC on the group graph to confirm acyclicity. Result:

`shared < cards < screens < App`

- `shared` renders only `shared`.
- `cards` → `shared`.
- `screens` → `cards`, `shared`.
- `App` → `screens`, `shared`.

Per-file imports (lucide icons, React hooks/types, systems, data, sibling
component groups) were computed by reusing `App.tsx`'s own import statements as
the authoritative symbol→source map, re-pathed from `components/` (`./x` → `../x`).

### Modules (commit)
- **7a `shared.tsx`** (`b2a6240`) — Header, ResourcePill, ScreenTitle, ChoiceRow,
  InfoRow, InfoTile, ProgressRow, ProgressBar, BottomNav, NavButton, WeekNote,
  DetailHeader, FixtureStatusBadge, LeagueTableRowView, MatchScoreHeader,
  SummaryScoreHeader, and the `navItems` nav config (used only by BottomNav/NavButton).
- **7b `cards.tsx`** (`72b0008`) — SelectionBriefingCard, SeasonContextCard,
  LastMatchCard, CareerCard, ReadinessStrip (+ its `getReadinessDetails` helper),
  NextActionCard, AttributesCard, SeasonSnapshot, RelationshipsCard,
  ContractMarketCard, EquipmentFacilitiesCard, SupportTrackCard, FixturePreviewList,
  LeagueTablePreview, DynastySeasonRow.
- **7c `screens.tsx`** (`4dfa986`) — PlayerScreen, TrainingScreen, ClubScreen,
  ClubFixturesView, ClubTableView, HomeScreen, SupportShopView, PreMatchScreen,
  MatchMomentScreen, PostMatchSummaryScreen, WeekSummaryScreen, SeasonReviewScreen,
  TrainingSummaryScreen, ContractOfferScreen.

### Import prune
After all three groups moved out, **Phase 7 prune** (`d184a8a`) removed every
`App.tsx` import that had become unused (lucide icons, data constants, types and
systems helpers only referenced by the extracted components). `App.tsx` dropped
to **547 lines** — just `App()` (state, the matchweek handlers, and screen
routing) plus 14 imports. Verified zero import cycles across all 29 src files.

---

## Final state

`App.tsx`: **7,339 → 547 lines** (−93%). The file now holds only the `App()`
component: game state, the advance-week / match / training / contract handlers,
and screen routing. Everything else lives in focused modules:

- `types.ts`, `utils.ts`
- `data/*` (4 files) — static game data
- `state/*` — `initialState.ts`, `save.ts`
- `systems/*` (12 files) — pure gameplay logic, acyclic DAG
- `components/*` — `shared.tsx`, `cards.tsx`, `screens.tsx`

Build (`tsc --noEmit` + `vite build`) green at every commit; the production
bundle stayed functionally identical throughout. Zero import cycles.

### Optional follow-ups (not yet done)
- Split `screens.tsx` (still the largest file) into per-screen files if it grows.
- Extract `App()`'s handlers into a `useGameState` hook.
- Let the balance labs (`scripts/*.mjs`) import the extracted `systems/*` modules
  instead of re-implementing season/training logic.

> Note on numbering: the original plan listed `state/save.ts` as Phase 3 and a
> single `systems/*` phase. As the dependency reality became clear the order was
> refined — the pure-logic core (Phase 3) and construction (Phase 4) had to precede
> save (Phase 5), the gameplay-logic split became Phase 6a–6i, and the component
> split became Phase 7a–7c.
