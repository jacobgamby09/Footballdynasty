# Handover — Football Dynasty (for Claude / next agent)

This is a working handover for whoever picks the project up next. It captures
**what was just done**, the **rules you must not break**, **how to verify**, and
**where to go next**. The deep design lives in the other docs — this file is the
map, not the territory.

_Last updated: 2026-06-24 (through match agency, The Feed screen, per-career
variety). Branch `main`, all work committed + pushed (`273e4d2` is HEAD).
`SAVE_VERSION` **24**._

**Current onboarding note:** new games start with Create Dynasty before country
selection (first name, family/dynasty last name, nationality, position — Striker
only). The starting club is now **varied** (one of the weakest 3-4 clubs in the
chosen country's bottom division, seeded per career), not always the single
weakest. The remaining Gen-2 gap is offer-driven heir start logic.

> **⚠ Read "Latest session" (section 0) first** — it covers everything done most
> recently and flags the one deliberate exception to the no-`Math.random` rule.

---

## 0. Latest session — match agency + The Feed screen + per-career variety

All on `main`, committed and pushed (`60d4b09` → `273e4d2`). Per-step detail with
"Shipped" notes lives in `MATCH_AGENCY_PLAN.md`; dated entries in `PROGRESS.md`.
`SAVE_VERSION` moved 21 → 24 across this work.

**A. Match-agency arc — 4 steps (sequence 1 → 3 → 2 → 4):**
- **Step 1 · visible risk/reward** (`60d4b09`): `estimateChoiceOdds(input)` in
  `engine/matchEngineCore.js` (mirrors `resolvePlayerChoice`'s deterministic
  `resultScore` minus the seeded variance) + `getChoiceOdds` in `systems/match.ts`
  build the SAME inputs as resolution → an honest odds chip + a coach-lean chip on
  each choice in `MatchMomentScreen`. No new state.
- **Step 3 · manager comply/defy** (`325d321`): a unified `managerTrustShift` in
  `resolvePlayerChoice` — defy (`Risky`) +2 decisive / −3 fail (doghouse), obey
  (`Likes`) +1; explanation beats ("Backed your instinct" / "Coach unhappy").
- **Step 2 · mentality dial** (`2214d36`, SAVE→22): `matchMentality:
  "push"|"balanced"|"hold"` on `GameState`. Director hook
  (`matchDirector.js` `mentalityCategoryWeights`) shifts the moment mix; resolution
  hook (`getMentalityResolutionModifier`/`getMentalityFatigueModifier`, mirrored
  into `estimateChoiceOdds`) + `chooseAutoSimChoice` bias. UI = `MentalityDial`
  (full on pre-match, compact live). Balanced is a strict no-op.
- **Step 4 · personal objective = sponsor's matchday target** (`3322be3`, reworked
  by `f077777`, SAVE→23): originally fabricated objectives, but per user that felt
  forced, so it now SURFACES the existing sponsor objective and only when a sponsor
  is active. `systems/matchObjective.ts → getSponsorMatchObjective(sponsor)` maps
  `sponsor.objective` → a view-model (`reward.cash` mirrors `sponsor.objectiveBonus`
  for DISPLAY only). `finishMatchState` reads completion from
  `sponsorPayout.objectiveCompleted` — **the sponsor system already pays the bonus,
  so there is NO second payout.** Cards on pre-match + post-match summary.

**B. The Feed is its own screen** (`fc38cd8`): weekly flow is now **Match → Match
summary → Week Summary → News feed ("End Week") → Home**. New `NewsFeedScreen`
(+ `"news-feed"` `ScreenKey`); `closeWeekSummary` → `news-feed`, new `closeNewsFeed`
carries the contract/season/free-agent branching. `generateWeeklyFeed` now yields
**1-5 stories by "meat"** (cap 3→5; the player's own club may headline up to 3
beats, others capped at 2; guaranteed minimum 2→1). Single teaser removed from
`WeekSummaryScreen`; full archive still under Home → Feed. `balance:feed` assertion
updated to range [1,5].

**C. Per-career variety** (`36f8ec3`, SAVE→24): new persisted `careerSeed` on
`GameState`. Starting club is picked from the **weakest 3-4** (seeded), and
`careerSeed` is folded into `createMatchSeed`, so two fresh careers differ in both
club and match moments. **This is the source of the one sanctioned `Math.random`**
(`makeCareerSeed` in `App.tsx`; see constraint #1). Labs reimplement the weakest-club
start, so season-lab OVR is byte-identical (curve is potential-bound, not club-bound).

**D. Odds-band rename** (`273e4d2`): worst band `"Long shot"` → `"Slim chance"`
(read as a long-range shot). String only, in `types.ts` / `matchEngineCore.d.ts` /
`matchEngineCore.js`; the `odds-long` tone CSS class is unchanged.

**Verified this session:** `npm run build` green; `balance:match` (incl. a mentality
sweep), `balance:season` (OVR 57/67 unchanged), `balance:feed` (range [1,5]) and
`node scripts/play-session-regression-smoke.mjs` all green; multiple in-browser
Playwright passes (0 console errors).

**Deferred / next levers (not started):**
- Old-club rivalry objectives — needs a `formerClubs: ClubId[]` tracked on
  transfer/retirement; derby (High-importance) is the only contextual stake for now.
- A live in-match objective-progress widget (currently surfaced pre + post only).
- Step 3b — a transient mid-match manager "ask" (re-tags choices for a window).
- Possible **within-career** match-moment repetition (the user noticed openings can
  feel samey across a single career) — a Director-variety lever, not yet tuned.

---

## 1. What this project is

A mobile-first **football career sim** ("Football Dynasty"): you play a single
player from the bottom of the pyramid upward, week by week (train → match →
train), across a persistent multi-country world of leagues and clubs, with the
long-term goal of a multi-generation dynasty.

- **Stack:** React 19 + Vite 8 (rolldown-vite) + TypeScript. State persists to
  `localStorage`. No backend.
- **Entry:** `src/App.tsx` (~775 lines — the shell + week handlers + screen
  routing). Everything else is modularized under `src/`.

### Doc map (read these, don't re-derive)
| Doc | What it covers |
|---|---|
| `GDD.md` / `DESIGN.md` | Game design — the fantasy, loops, progression. |
| `MATCH_ENGINE.md` | How a match is simulated. |
| `WORLD_MODEL.md` | **The persistent world** (countries, tiers, promotion/relegation, fixtures). Stage log lives here — start here for world work. |
| `REFACTOR.md` | History of the `App.tsx` → modules split + the module layering DAG. |
| `PROGRESS.md` | **Active running log** — dated entries per change (read the tail for the latest). |
| `NEXT_STEPS.md` | Older planning notes. |
| `HANDOVER.md` | This file — the orientation map. |

---

## 2. Hard constraints — DO NOT break these

These are load-bearing. Violating them silently breaks the sim-lab or
save-resume, often without an obvious error.

1. **No `Math.random()`, `Date.now()`, or argless `new Date()` anywhere in
   `src/` — with ONE sanctioned exception (see below).** Everything must be
   deterministic. Seed from stable inputs (club short code, season number, week
   index, opponent id…) via an FNV-style hash. Examples already in the code:
   `hash01` in `systems/world.ts`, `fixtureHash` in `systems/club.ts`,
   `seededNoise` in `engine/matchEngineCore.js`.
   _Why:_ the balance labs replay seasons and saves resume mid-run; real
   randomness makes both non-reproducible.

   **The one allowed `Math.random`:** `makeCareerSeed()` in `App.tsx` mints a
   `careerSeed` ONCE, at the moment the player creates a career or an heir
   starts, and it is persisted in the save. It gives each fresh career a
   different start (club + match moments). This is safe because (a) it runs only
   in that UI action, never in the engine, and (b) the engine and the balance
   labs NEVER call it — they read the stored `careerSeed` back, or omit it and
   fall back to a deterministic identity-based seed. So replay and lab
   reproducibility are fully preserved. **Do not "fix" this into a hash, and do
   not add any other `Math.random`/`Date.now`.**

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
   saves and the app falls back to onboarding. That is the intended, accepted
   behaviour during development. Currently **`SAVE_VERSION = 24`**. The loader
   intentionally accepts only the exact current version.

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

## 4. Build history

Three waves so far. **Wave 1 (Stages E–G)** was the world/identity work, each
shipped on a `feature/world-v2-stage-X` branch and merged `--no-ff`. **Wave 2
(economy + dynasty layer)** landed as direct commits on `main` (`c3dc692` →
`0d5cda5`). **Wave 3 (balance lab + aging + long-term cash upgrades + Stage 3
trust fund + tier-gated Elite perks)** followed as `feature/*` branches merged
`--no-ff`. Build stays green throughout; the full blow-by-blow is in `PROGRESS.md`.

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

### Wave 2 — economy + dynasty layer (`c3dc692` → `0d5cda5`)

Direct commits on `main`. This added the meta-progression around the
week-to-week loop. New systems modules and what they do:

- **Dynasty loop** (`17dbc57`) — the core-fantasy spine.
  - `systems/legacy.ts` — `getLegacyEstimate` scores the finished career into
    **Legacy Points**; retirement is age-gated (`RETIREMENT_AGE`).
  - `App.tsx → retireCareer()` banks the points, increments `dynasty.generation`,
    carries `dynasty` + history forward, and calls `createCareerForCountry(...)`
    to begin the next generation. New `retirement` screen + `RetirementScreen`.
  - `systems/dynastyUpgrades.ts` + `data/dynastyUpgrades.ts` — spend Legacy
    Points on persistent upgrade tracks (`DynastyState.upgrades`).
  - `systems/generation.ts` — `getGenerationProfile` / `createGenerationAttributes`
    give later generations a stronger starting attribute base (dynasty bonuses).
  - ⚠️ **Nuance — not yet the originally-envisioned Gen-2 flow.** The son keeps
    the hardcoded name "Jonas Vale" and still **starts from the bottom of the
    same country** (no inherited name, no offer-driven start). Dynasty
    *continuity* (points, upgrades, generation bonuses, carried history) is in;
    the offer-driven inherited-name onboarding is still open (see §6).
- **Prestige + sponsors** (`c3dc692`) — `systems/prestige.ts` (tiers Local
  Prospect → Icon, threshold-gated) and `systems/sponsors.ts` (deals with
  weekly retainer + objective bonuses, unlocked by prestige tier).
- **Support model v2 + expandable upgrades** (`9824101`, `3209438`) — reworked
  `systems/support.ts` / `data/support.ts` and the support UI.
- **Transfer windows + free agency** (`17dbc57`, `0d5cda5`) —
  `systems/transferWindow.ts` opens deterministic mid- and end-season windows
  with club-fit + offers (`transfer-window` screen). Letting a contract expire
  now drops the player into a real **free-agent** state (`FreeAgentState`,
  `free-agent` screen): solo training at 55% XP, short trial offers back into
  club football. Offer cards have explicit Accept/Decline.
  `scripts/transfer-window-smoke.mjs` is a dedicated smoke lab.
- **Training reveal** (`0d5cda5`) — an animated XP-reveal screen
  (`training-reveal`) between `Start Training` and the development summary; the
  roll is still deterministic, only the presentation is new.
- **Gen-1 progression tuning** (`40bdfb6`) — attribute XP / selection / match
  tuning; `systems/attributeXp.ts`.

New `ScreenKey`s: `training-reveal`, `free-agent`, `transfer-window`,
`retirement`. New `GameState` slices: `dynasty` (expanded), `transferWindow?`,
`freeAgent?`, plus sponsor/prestige state.

### Wave 3 — balance lab, aging & the long-term cash-upgrade arc (`c3dc692`+ → `d507ada`)

Direct commits on `main`. Two threads: a trustworthy balance lab, and an aging
system that turns late-career cash into a real choice. (Read `PROGRESS.md` tail
for the full blow-by-blow.)

- **Sponsor ladder** (`systems/sponsors.ts`): deals now scale across *all* prestige
  tiers up to Legend (100k), with a light "Hometown Kit" starter at a new
  `Local Favourite` (120) tier; `getAvailableSponsorDeals` only offers the highest
  unlocked band. **Dynasty compounding** (`DynastyState.reputation`): each heir
  inherits a starting-prestige floor grown from the previous career's peak.
- **Balance lab made trustworthy** (`scripts/season-balance-lab.mjs`): it used to
  pin the player at grassroots for a whole career. Now it models **promotion/
  relegation + transfers** so the player climbs the full pyramid (defaults to a
  22-season career, ~age 37); `simulateMatch` derives a real team result; per-season
  `ClubPPG` + `EffOVR` columns; `Promotions`/`Relegations`/`Highest tier`. The lab
  is now the source of truth for career-long balance — **mirror any game formula you
  change into it** (it re-implements the engine-adjacent math since it may only
  import from `engine/`).
- **Aging & decline** (`systems/aging.ts`): players peak at 28 then physically
  decline (`getAgeModifier` scales *effective* ability only — raw attributes/XP are
  untouched). Applied in `selection.ts` + `match.ts`. Careers can run to a hard cap
  (~40) — `getLegacyEstimate` exposes `forced`/`hardRetirementAge`; `App.startNextSeason`
  forces retirement past the cap.
- **Long-term cash upgrades** (the late-career "real choice"):
  - **Longevity** (`support.ts` `longevity` + Longevity track): breakthroughs push
    peak age + retirement cap (28→34, 40→46), levels flatten the decline. Expensive.
  - **Potential** (`potential` + Talent track, baseCost 12000 → ~82k for all 4):
    each level lifts KEY-attribute potential +1 (capped), applied at purchase by
    `bumpKeyAttributePotential`. Priced so a balanced build only affords ~2/4 — a
    genuine "ceiling vs. longevity/development" trade-off, not an auto-buy.
  - `getAgingProfile(state)` ties longevity → `{ peakAge, declineResist,
    hardRetirementAge }`.
- **OVR curve re-anchored to dynasty guidance** (`systems/attributeXp.ts`): the
  over-potential growth penalty was too soft, so optimal play overshot potential by
  ~14 (Gen-1 peaked 74). Steepened it so play asymptotes near potential. **Target
  curve (designer's intent): optimal Gen-1 ≈ 60, Gen-2 ≈ 70, ~+7/generation** — these
  are guidance, not hard caps. Current optimal: Gen-1 ~64, Gen-2 ~71.6 (fully-maxed
  potential nudges to ~65 / ~73.5). **Keep new upgrades inside this curve.**

- **Stage 3 — Family Trust Fund** (`systems/estate.ts`): the late-career cash sink that
  serves the dynasty. `DynastyState.estate` (persists) is a cash-bought level
  (`investEstateState`, escalating cost 40k → ~1.7M); each heir inherits a sqrt-scaled,
  capped (60k) starting-cash bonus (`getEstateHeirCash`, added in `createCareerForCountry`).
  Distinct from Legacy Points (talent) — this is MATERIAL inheritance. Safe for the curve:
  cash buys speed/longevity, not the ceiling. UI: Trust Fund card in Home → Dynasty.

- **Tier-gated Elite perks** (mid-late pacing fix): the lab showed upgrade value is heavily
  front-loaded — OVR growth ends ~age 22, but ~$180k/season keeps pouring into the bottomless
  XP sink for ~zero OVR. New **Elite** support track with three **prestige-gated, NON-OVR**
  upgrades (`requiresPrestige` gate): `consistency` (rating floor, 1.5k), `eliteConditioning`
  (fitness ceiling, 7.5k), `marquee` (prestige/sponsor income, 20k). Effects wired at call
  sites in `match.ts`/`season.ts` — **none touch attribute values or potential**, so OVR
  cannot run away (verified: gated build still peaks ~62/72). The rule for any future gated
  upgrade: gate anything EXCEPT ceiling (potential/XP) raisers.

New `SupportUpgradeId`s: `longevity`, `potential`, `consistency`, `eliteConditioning`,
`marquee`. New `SupportTrackId`s: `longevity`, `talent`, `elite`. New `SupportUpgradeDefinition`
field `requiresPrestige`. New `DynastyState` fields: `reputation`, `estate`.

---

## 5. How to work & verify

```bash
npm run build          # tsc --noEmit && vite build  — must stay green
npm run balance:season # season economy lab (engine-only, now transfer-aware)
npm run balance:match  # match outcome lab
node scripts/transfer-window-smoke.mjs  # transfer-window smoke
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

**Already done (don't re-investigate)**: sponsor reachability
(full ladder + light starter + dynasty compounding), the longer-season balance
pass (lab upgrade + fitness floor + OVR re-anchor + aging), the late-career cash
sink (longevity + potential), AND **Stage 3 (Family Trust Fund)** — surplus cash
now banks into the heir's starting capital, so late cash is a genuine choice
(improve yourself vs. set up your child). Only the **trust-fund** scope shipped;
the "club connections → better heir start" idea (3b) is the bridge to #1 below.

**Priority next steps (most → least important):**

1. **Finish the Gen-2 fantasy** (the big remaining core-fantasy gap). The dynasty loop banks Legacy Points and carries
   continuity, but the next generation still starts from the bottom of the same
   country with the hardcoded name "Jonas Vale". Vision: the son **inherits a name**
   and gets an **offer-driven start** (contracts based on the family's standing)
   instead of repeating the country picker. Pieces exist — `club.clubId`, world-
   reading offers in `systems/transfers.ts` / `systems/contracts.ts`, generation
   bonuses — so it's wiring `retireCareer()` into the offer flow + a name/onboarding
   screen, not new infrastructure. (Stage 3's cash-estate dovetails with this.)

**Smaller / still open:**
- **Browse-the-pyramid UI** — view other leagues/divisions (data is all there).
- **Cups** — dropped when fixtures went world-based; a real cup vs. OTHER leagues
  is a separate feature.
- **Potential vs. growth-into-ceiling timing** — potential is most effective bought
  early (more seasons to grow into it) but is now mid-career-priced; fine, just noted.

`balance:season` is the source of truth for career-long balance — run it (and
`transfer-window-smoke.mjs`) when touching transfer/economy/growth/aging code, and
mirror any game-formula change into the lab.

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

---

# Current implementation note (2026-06-24)

- Match Director V1 now owns player-highlight selection and timing above the deterministic team simulation.
- Start with `src/engine/matchDirector.js`, then `src/systems/match.ts`.
- Match balance output now includes director variation metrics; preserve those metrics when changing moment selection.
- Forward Moment Library V2 adds 31 metadata-driven situations in `src/engine/forwardMomentLibrary.js`; forward + shared now totals 50 situations with nine chain routes.
- Live Match Presentation V2 adds deterministic commentary variants, momentum, typed timeline events and derived live player stats without changing match outcomes.

---

## 7. 2026-06-24 detailed handoff

This is the practical starting point for Claude. Everything below is currently
**uncommitted** in the shared working tree. Do not discard or recreate it.

### Match-result clarity and live presentation

- The player-highlight result popup is now organized around the action outcome,
  readable reasons, rating/trust/fitness impact and the attack consequence.
- Teamplay choices explicitly state whether they created a team chance, opened
  a chained player decision, retained possession or ended before a shot.
- The momentum display is a restrained full-width line with one directional
  marker instead of a pseudo-percentage.
- Live presentation includes deterministic commentary variants, typed timeline
  events, momentum and derived player stats. These are presentation layers and
  must not mutate the deterministic team result.
- Main files: `src/components/screens.tsx`, `src/styles.css`,
  `src/systems/match.ts`, `src/types.ts`.

### Browser-stable flags

- OS-dependent flag emoji were replaced by local SVG assets in `public/flags/`.
- `CountryFlag` in `src/components/shared.tsx` is the shared renderer.
- Flags are wired into onboarding, player, club, contract and related country
  surfaces. Keep future flag usage on this component; do not reintroduce emoji.

### Club profiles and universal club links

- `src/systems/clubProfile.ts` derives a deterministic club profile from the
  persistent world and current competition state.
- Profiles expose keeper/defence/midfield/attack OVR, average rating, form,
  facilities, tactical identity, strengths, weaknesses and player career fit.
- `ClubProfileScreen` is reusable and opened through App-level club selection.
- Club names are clickable across league tables, fixtures, match headers,
  summaries, offers, contracts, player context and dynasty history.
- Fixture/table navigation was separated from individual club links to avoid
  invalid nested buttons.
- `clubView` remains App-level state so returning from a profile preserves the
  fixtures/table subview. `homeView` is also App-level so returning from a club
  opened in Feed preserves the Feed tab.
- Main files: `src/systems/clubProfile.ts`, `src/components/shared.tsx`,
  `src/components/cards.tsx`, `src/components/screens.tsx`, `src/App.tsx`.

### The Feed V1

- `src/systems/feed.ts` is a deterministic candidate/ranking engine called
  after each resolved world matchweek from `src/systems/match.ts`.
- It selects 2-3 weekly stories from player performances, first-goal/assist
  milestones, results, upsets, big wins, form streaks, table movement and
  transfer interest.
- Selection controls headline repetition, category density and single-club
  dominance. Two fallback stories guarantee useful output.
- `GameState.worldFeed` stores up to 120 stories. Headlines and bodies use
  structured text parts so club references remain clickable.
- UI: a `Feed` Home subtab (chronological week groups) AND a dedicated weekly
  `NewsFeedScreen` in the post-match flow (see section 0B). `generateWeeklyFeed`
  now produces 1-5 stories by "meat", not a fixed 2-3.
- Save shape is version 24. Old development saves intentionally reset.
- Main files: `src/systems/feed.ts`, `src/components/screens.tsx`,
  `src/state/initialState.ts`, `src/state/save.ts`, `src/types.ts`,
  `scripts/feed-balance-lab.mjs`.

### Verification snapshot

The following passed after the latest edits:

```bash
npm run build
npm run smoke:play-session
npm run balance:feed -- --weeks=90
git diff --check
```

Feed lab output:

```text
90 weeks
197 stories
2.19 stories/week
weekly range 2-3
0 same-season repeated headlines
categories: table 61, result 58, form 48, player 25, upset 3, milestone 2
```

Browser smoke reached a real post-match Weekly Summary and confirmed the leading
teaser, two generated stories, clickable club references and no horizontal
mobile overflow.

The Codex in-app browser's CDP click/screenshot channel timed out during the
final return-navigation check, while DOM inspection, build and state tests
remained healthy. Recheck this exact flow when browser control is available:

`Home -> Feed -> click club -> Back -> Feed remains selected`.

### Continue from here

- The dev server is available at `http://localhost:5173`.
- The production build only reports Vite's existing `>500 kB` chunk warning.
- Design notes are updated in `GDD.md`, `DESIGN.md` and `PROGRESS.md`.
- Before adding more templates, run a several-season Feed freshness audit.
  Watch table/result/form dominance, repeated clubs in consecutive weeks,
  sparse upset/milestone output and whether player-related stories crowd out the
  wider football world.
- Keep Feed deterministic. Never use runtime randomness or generated prose.
- Do not change match outcomes to make Feed stories interesting. Feed reports
  the simulation; it does not steer it.
