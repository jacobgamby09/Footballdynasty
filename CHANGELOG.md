# Changelog

Notable player-facing, balance and correctness changes, newest first. Detailed dev notes live in
`PROGRESS.md`; the current handover state lives in `HANDOVER.md`; the match model in `MATCH_ENGINE.md`.

Every balance step was shipped on its own and measured against the season-lab **End OVR guardrail** (see the
table at the bottom) before moving on. UI/copy-only changes hold that guardrail byte-identical.

---

## 2026-06-28

### Changed
- **Invest shop (renamed from "Support") rebuilt for beginners** (`ce3f2eb`). Every track now leads with the
  problem + your current numbers (visible even collapsed); each upgrade reads as a plain before → after with
  a "Best if…" line; milestones are secondary. All numbers come from the real formulas — stepped upgrades
  that don't move a value yet say so honestly ("Eases hard weeks in 3 more upgrades"). UI/copy only, no
  mechanic change (guardrail byte-identical). New view builders in `systems/training.ts`
  (`getInvestTrackView`); the shared Dynasty-shop card is untouched.

---

## 2026-06-27 — Balance & bug patch

### Balance (OVR baseline moved deliberately — one measured step at a time)
- **Match-rating curve reshaped** (`6e9733c`, #5/#6). No longer a flat average of moment ratings: a base +
  cumulative goal/assist credit via the shared `aggregateMatchRating`. Cameos down (~6.4), big games up
  (**brace 8.3, hat-trick 9.7**).
- **Goal conversion trimmed ~15%** (`4dc0199`, #7/#8). Strong finishers no longer run hot; the lab's "avg
  goals too high" warning cleared. Ordinary players untouched.
- **Athleticism floor on Forward OVR** (`14cc9fe`, #9 part 1). Pace + Stamina now carry **~12% of OVR**, so a
  primary-maxed striker who dumps athleticism is capped (**−7 OVR** at dumped) instead of reaching a perfect
  rating — a balanced striker is unchanged. App-only OVR change (the labs reimplement OVR), so a new
  `scripts/app-ovr-probe.mjs` measures the real app number.
- **Stamina is now an availability/sharpness stat, never an output stat** (`95de7c7`, #9 part 2). One engine
  source (`getStaminaFitnessLoadMultiplier`) shapes post-match fitness decay (freshness-damped → compounds
  across a congested run) and live readiness (minute-ramped → fades late). Neutral at Stamina 55 (an average
  striker is unaffected). New `scripts/stamina-fitness-probe.mjs` verifies the targets.

### Fixed
- Match-stat + world/leaderboard correctness bugs (`7895fbe`, #7/#15/#20) — player moment goals fold into the
  team tally, NPC name de-duplication, and related leaderboard fixes.
- Player's league stats now scope to the **current** league after a mid-season transfer (`4236b2f`, #14).
- **Awards decided on real performance, not a participation quota** (`aaafc5a`, #29/#30). POTY can be won on
  genuine performance vs. the rest of the squad; the **Golden Boot goes to the top scorer even on half a
  season**, counting goals in the new club after a transfer. (A first pass added a games-played floor in
  `c48b51d`; it was removed here.)
- Chain-highlight follow-up flash fix (`93c33aa`, #1).
- Contract-offer clarity: reason line + wage/role deltas (`c48b51d`, #28).

### Changed (UX & match experience)
- Chain highlights default to **manual step-through**, slowed enough to read (`93c33aa`, #2).
- Demotion wording distinguishes match fitness from form; club-view resets on navigation; pre-match league
  standing; promotion/relegation cut lines in the table (`d679720`, #10/#18/#11/#17).
- Better appearance ratings, leaderboards in the league view, expandable prestige card (`9c775de`,
  #16/#13/#21).
- Season-start brief + training-slot UX (focus badges, level-ups in the training summary) (`3be6b41`,
  #12/#3/#4).

---

## 2026-06-26 — Foundation

### Changed
- **Match moments auto-resolve as cinematic chain highlights** (`185d3f5`). Normal play no longer shows
  choice cards: the sim auto-picks the contextually-best action and plays it out beat-by-beat. Agency is
  reserved for rare "defining moments". Goals/assists verified unchanged vs. the choice-based baseline.

### Added
- **Honours & Legacy V1 (complete)** (`b6e15e1` → `0a4dc85`). Regenerable NPC award world, Club Legacy
  status, data-driven season awards + leaderboards, season Honours reveal, redesigned Dynasty hub, status
  rewards + retirement.

### Fixed
- Cramped in-card action buttons (`82e547a`); Dynasty sub-nav overflow on mobile (`f87c9bc`).

---

## OVR baseline (season-lab guardrail)

Balance changes moved the guardrail deliberately and measurably:

| Step | OVR baseline (4 scenarios) |
|---|---|
| Start (before the patch) | 57.20 / 67.39 / 67.11 / 63.83 |
| After rating curve (#5/#6) | 57.01 / 67.64 / 67.16 / 63.85 |
| After goal trim (#7/#8) | 57.01 / 67.59 / 67.08 / 63.77 |
| After stamina (#9 part 2) | **57.01 / 67.49 / 67.07 / 63.69** ← current |

> #9 part 1 (the athleticism floor) did **not** move the lab number — it is an app-only OVR change, and the
> labs reimplement OVR with their own weights. That gap (the "two OVR truths") is tracked in `NEXT_STEPS.md`:
> extract the Forward weights into one shared `.js` the app, both labs and the probe all import.

---

## Notes

- Verified each step with `npm run build`, `scripts/season-balance-lab.mjs` (guardrail),
  `scripts/match-balance-lab.mjs` (output) and `scripts/play-session-regression-smoke.mjs` (exit 0).
- Determinism preserved throughout; no `SAVE_VERSION` bump (all changes additive/optional).
