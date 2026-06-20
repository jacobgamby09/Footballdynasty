# Handover — Football Dynasty (for Codex)

This is a working handover for whoever picks the project up next. It captures
**what was just done**, the **rules you must not break**, **how to verify**, and
**where to go next**. The deep design lives in the other docs — this file is the
map, not the territory.

_Last updated: 2026-06-20. Branch `main` @ `631f3aa`._

---

## 1. What this project is

A mobile-first **football career sim** ("Football Dynasty"): you play a single
player from the bottom of the pyramid upward, week by week (train → match →
train), across a persistent multi-country world of leagues and clubs, with the
long-term goal of a multi-generation dynasty.

- **Stack:** React 19 + Vite 8 (rolldown-vite) + TypeScript. State persists to
  `localStorage`. No backend.
- **Entry:** `src/App.tsx` (~550 lines — the shell + week handlers + screen
  routing). Everything else is modularized under `src/`.

### Doc map (read these, don't re-derive)
| Doc | What it covers |
|---|---|
| `GDD.md` / `DESIGN.md` | Game design — the fantasy, loops, progression. |
| `MATCH_ENGINE.md` | How a match is simulated. |
| `WORLD_MODEL.md` | **The persistent world** (countries, tiers, promotion/relegation, fixtures). Stage log lives here — start here for world work. |
| `REFACTOR.md` | History of the `App.tsx` → modules split + the module layering DAG. |
| `PROGRESS.md` / `NEXT_STEPS.md` | Older running notes. |
| `HANDOVER.md` | This file. |

---

## 2. Hard constraints — DO NOT break these

These are load-bearing. Violating them silently breaks the sim-lab or
save-resume, often without an obvious error.

1. **No `Math.random()`, `Date.now()`, or argless `new Date()` anywhere in
   `src/`.** Everything must be deterministic. Seed from stable inputs (club
   short code, season number, week index, opponent id…) via an FNV-style hash.
   Examples already in the code: `hash01` in `systems/world.ts`, `fixtureHash`
   in `systems/club.ts`, `seededNoise` in `engine/matchEngineCore.js`.
   _Why:_ the balance labs replay seasons and saves resume mid-run; real
   randomness makes both non-reproducible.

2. **Keep the import graph acyclic.** Layering DAG:
   `types ← data ← utils ← state/systems ← components ← App`.
   In particular **`data` must not import from `systems`**. Within `systems`
   the rough order is: `formatting < ovr < support < seasonState < selection <
   training < contracts < season < match`, with `transfers` between selection
   and contracts and `world` near the bottom.

3. **Balance labs import only from `engine/`.** `scripts/season-balance-lab.mjs`
   and `scripts/match-balance-lab.mjs` (`npm run balance:season` /
   `balance:match`) are `.mjs` and must not reach into `systems/` or `state/`.

4. **Bump `SAVE_VERSION` when the save/world shape changes.** It lives in
   `src/state/save.ts` (and the matching literal type in `src/types.ts →
   SavePayload.version`). Saves are **disposable** — a version bump discards old
   saves and the app falls back to the country picker. That is the intended,
   accepted behaviour during development. Currently **`SAVE_VERSION = 9`**.

---

## 3. The world model (current shape)

Full detail in `WORLD_MODEL.md`. The essentials:

- **Two axes.** Global **Tier** = quality (1 = best in the world … 6 = global
  bottom), reusing the 6 existing tier-id bands: `elite`(=tier 1), `top-flight`,
  `national-pro`, `regional-pro`, `local-semi-pro`, `grassroots-dev`(=tier 6).
  **Division level** = a country's ladder position (1 = that country's top
  division).
- **7 countries.** England, Spain, Italy = 6 divisions (tiers 1–6).
  Germany, France, Holland, Denmark = 5 divisions (tiers 2–6). **Every** country
  reaches tier 6, so any start country begins at the global bottom.
- **Club counts:** tier-1 divisions have 20 clubs, all others 16.
- **Promotion/relegation** (per country, between adjacent levels): the
  tier1↔tier2 boundary moves 3 clubs; every other boundary moves 2 (so a 2nd
  division promotes 3 / relegates 2). Top division: no promotion. Bottom: no
  relegation. **The player moves up/down WITH their club** (not special-cased).
- **Standings** accumulate in `world.leagueSeasons[leagueId].records` (keyed by
  `ClubId`). Each player match advances the **whole world one matchweek**: the
  player's club takes its real result, every other club gets a deterministic
  light-sim result (`simClubWeek`). So every club always has the same number of
  games played → the table is always consistent.

Key files: `data/world.ts` (`seedWorld`, `COUNTRIES`, name pools),
`systems/world.ts` (`advanceWorldMatchweek`, `rolloverWorldSeason`,
`getWorldLeagueTable`, lookups).

---

## 4. What was done THIS session (Stages E → G)

All merged to `main` (`--no-ff`), pushed, branches deleted. Each verified
in-browser via Playwright + `npm run build` + `balance:season`.

### Stage E — Gen-1 country selection (`56844e8`)
- New-game flow now opens a **`CountrySelectScreen`** (7 countries). Picking one
  starts the career in that country's **weakest tier-6 club** ("start from the
  bottom").
- `state/initialState.ts → createCareerForCountry(countryId)` builds the fresh
  Gen-1 state; `initialState = createCareerForCountry("denmark")` is the load
  fallback.
- `App.tsx`: `careerStarted` (from `hasSavedGame()`) gates picker-vs-saved;
  the save effect is suppressed until a country is chosen; bottom nav hidden on
  the picker; "New Career" returns to the picker.

### Stage F — country-correct identity (`2641de0`)
Three fixes so the world reads like the player's actual country instead of
always-Danish:
1. **Themed club names** (`data/world.ts`): a per-country `NAME_POOLS` map
   (cities + suffixes) replaces the old single English pool. Suffix follows the
   city (so the city is the short name). A per-country counter walks cities
   one-by-one and offsets the suffix by `(cityIndex + band)` → suffixes vary
   _within_ a division while every generated name stays unique across the
   country. **Denmark keeps its real named clubs** (Northbridge FC, Aalborg…)
   and themes only the generated overflow.
2. **World-based fixtures** (`systems/club.ts →
   createSeasonFixturesFromWorld(club, world)`): the player's schedule is built
   from their **real league's** other clubs, not the static Danish
   `seasonFixtures` list. Wired into `initialState`, `season.ts` (rollover),
   `save.ts` (fallback), and `rebuildSeasonForClub` (transfer). Legacy
   `createSeasonFixtures` is kept ONLY as the no-world fallback (pre-world saves
   / sim-lab).
3. **Highlight names** (`engine/matchEngineCore.js → createSimEvent`): no longer
   hardcodes "Northbridge"; reads `input.teamShort` (passed as
   `state.club.shortName` from `systems/match.ts`).

### Stage G — full league schedule (`82fba66` then `631f3aa`)
- The season was hardcoded to 12 matches regardless of league size. It is now a
  **double round-robin**: the player faces every other club home AND away.
  Season length tracks league size: **16-club division → 30 matches, 20-club
  tier-1 → 38**.
- Implementation in `createSeasonFixturesFromWorld`: first leg assigns one venue
  per opponent, second leg (same order) swaps it → each club played once home,
  once away (15/15 split in a 16-club league).
- _(History: it briefly shipped as a single round-robin (15 matches) in `82fba66`,
  then changed to home+away in `631f3aa` per the user's preference.)_

---

## 5. How to work & verify

```bash
npm run build          # tsc --noEmit && vite build  — must stay green
npm run balance:season # season economy lab (engine-only)
npm run balance:match  # match outcome lab
npm run dev            # vite dev server on 127.0.0.1:5173
```

**Verification discipline used this session (please continue it):**
1. `npm run build` green (types + bundle).
2. `npm run balance:season` runs (sanity on the economy).
3. **In-browser smoke** with the Playwright MCP. Because save shapes change,
   `localStorage.clear()` then reload to reach the country picker. An in-page
   `evaluate` driver clicks through: central nav button → `Start Training` →
   central → `Match Day` → `Start Match` → `Sim Full Time` → `Finish Match`.
   Inspect `JSON.parse(localStorage.getItem('football-dynasty-save')).game` to
   assert on real state (fixtures, world records, club identity).
4. Check `browser_console_messages` for 0 errors.

**Git workflow:** branch per stage (`feature/world-v2-stage-X`), commit with a
detailed body, merge to `main` with `--no-ff`, push, delete the branch (local +
origin). Co-author trailer: `Co-Authored-By: Claude Opus 4.8
<noreply@anthropic.com>`. Remote: `https://github.com/jacobgamby09/Footballdynasty.git`
(push works via Git Credential Manager; no `gh` CLI).

**Environment gotchas (Windows):**
- Shell is PowerShell; a Bash tool is also available. Vite 8 is rolldown-vite —
  there is **no local esbuild**.
- Run any ad-hoc Node diagnostics with a `timeout` and prefer foreground; the
  harness auto-backgrounds long Node commands and they can get stuck. Stop the
  dev server by killing the PID on port 5173, not by killing all node.

---

## 6. Open work / next steps

**The big one — the dynasty loop** (core fantasy, still missing):
retirement → Legacy Points → **Gen 2+ offer-driven start**. Gen 1 picks a
country; from Gen 2 the son inherits a name and should be **offered contracts**
rather than choosing a country. The foundations are in place: the player is
linked to the world by `club.clubId` and is not special-cased in rollover, and
the transfer/offer system (`systems/transfers.ts`, `systems/contracts.ts`)
already reads the world and produces demand-gated multi-offers. What's missing:
a retirement trigger, Legacy Points, and the Gen-2 onboarding screen/flow.

**Smaller / open under earlier stages:**
- **Browse-the-pyramid UI** — let the player view other leagues/divisions in the
  world (the data is all there; it's a read-only screen).
- **Balance pass for the longer season** — the economy (XP/season, cash,
  contract weeks, fitness) was tuned around 12 matches; seasons are now 30–38.
  Re-check `balance:season` assumptions and the warnings it prints (OVR gain,
  end fitness). This is the most likely thing to need tuning after Stage G.
- **Cups** — cup framing was dropped when fixtures went world-based. If desired,
  a real cup vs. clubs from OTHER leagues is a separate feature.

**Watch-outs when extending fixtures/world:**
- `createSeasonFixtures` (the legacy Danish static list) still exists as the
  no-world fallback — don't delete it, but don't extend it either; real work
  goes through `createSeasonFixturesFromWorld`.
- If you change the number of player matches, the world stays consistent
  automatically (one matchweek per player match) — but anything that assumed a
  fixed 12 (UI, labs) should be checked; UI already reads
  `season.fixtures.length` dynamically.
- Name-pool uniqueness relies on `clubCount ≤ pool.cities.length` per division
  and the `(cityIndex + band)` suffix offset — keep city pools ≥ ~36 entries.
