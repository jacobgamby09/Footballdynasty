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
    initialState.ts     // initialState/Contract + construction        [planned — Phase 4]
  state/
    save.ts             // save/load, clone, normalize                 [planned — Phase 3]
  systems/              // pure gameplay logic
    ovr.ts              // OVR, attribute XP/growth, clamp util         [planned — Phase 4]
    training.ts         // applyTrainingWeek, quality, focus            [planned — Phase 4]
    support.ts          // buySupportUpgradeState + support getters     [planned — Phase 4]
    match.ts            // createMatch, resolve, follow-up, summaries   [planned — Phase 4]
    selection.ts        // selection report, fitness, role/minutes      [planned — Phase 4]
    season.ts           // fixtures advance, league table, review       [planned — Phase 4]
    contracts.ts        // offers, accept, advance, status              [planned — Phase 4]
    formatting.ts       // clamp, formatSigned, labels                  [planned — Phase 4]
  components/
    shared/             // ProgressBar, InfoRow, ChoiceRow, BottomNav…  [planned — Phase 5]
    cards/              // *Card components                             [planned — Phase 5]
    screens/            // Player/Training/Club/Home/Match/…            [planned — Phase 5]
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

## Remaining phases (plan)

- **Phase 3 — `state/save.ts`**: `SAVE_KEY`, `SAVE_VERSION`, `loadSavedGame`,
  `normalizeSavedGame`, `normalizeSavedClub`, `mergeSavedAttributes`,
  `saveGameState`, `clearSavedGame`, `cloneGameState`, `cloneTrainingSummary`,
  `cloneLastMatchSummary`, `createInitialState`.
- **Phase 4 — `systems/*`**: extract the pure-logic core first (`clamp`,
  attribute-XP/growth), then training, support, match, selection, season,
  contracts. Finish moving the Phase 2 construction helpers + `initialState`
  into `data/initialState.ts`.
- **Phase 5 — `components/*`**: shared presentational components first, then
  cards, then screens.
- **Phase 6 — slim `App.tsx`**: left with `App()` (state + handlers + routing);
  optionally extract handlers into a `useGameState` hook.
