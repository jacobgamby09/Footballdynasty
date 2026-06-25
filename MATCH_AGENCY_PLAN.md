# Plan — Deeper match-choice agency (4 steps)

Builds on the Match Director + 50-moment library + live presentation already shipped. The goal
is to make the **moment decision itself** carry more agency and stakes. None of these touch
attribute values or potential, so the 60/70 OVR guidance is safe by construction.

## Shared principles (apply to every step)

- **Determinism first.** All new modifiers are deterministic (seed from existing seeds). Odds
  are shown **qualitatively** (bands, not %), matching the `MATCH_ENGINE.md` rule "maa ikke
  afsloere praecise procenter".
- **Mirror the engine in the labs.** Any change to `resolvePlayerChoice` /
  `chooseAutoSimChoice` / `matchDirector` MUST be mirrored in `scripts/match-balance-lab.mjs`
  (and `season-balance-lab.mjs` where relevant) — the labs re-implement the engine math.
- **Bump `SAVE_VERSION`** (currently 21, in `src/state/save.ts` + `SavePayload.version`) only
  when new persisted state is added (steps 2 and 4; step 3 only if the optional manager-ask
  ships).
- **Verification per step:** `npm run build` green; relevant lab green; in-browser smoke
  (`localStorage.clear()` → play a match) with 0 console errors; `play-session-regression-smoke.mjs`.

## What already exists (don't rebuild)

- Each library `choice(id, label, uses[], risk, reward, manager, outcome)` already carries
  `risk` (Low/Med/High), `reward` (payoff label), `manager` (Likes/Risky/Neutral), `outcome`
  (goal/assist/trust). Defined in `src/engine/forwardMomentLibrary.js`.
- `resolvePlayerChoice` (`src/engine/matchEngineCore.js`): `resultScore = score + fitnessModifier
  + managerModifier + roleConfidenceModifier + trustConfidenceModifier + chanceContext.modifier
  − riskPenalty − opponentModifier + variance`; `threshold` High 55 / Med 50 / Low 45;
  `managerModifier` Likes +3 / Risky −2; `variance` = seeded ±9; `fatigueCost` High −8 / Med −6
  / Low −4; `trustDelta` already branches on outcome (Risky goal-fail = −1).
- `MatchMomentScreen` (`src/components/screens.tsx:~747`) already renders each choice button with
  `choice.label`, `"{risk} risk"`, `choice.reward`.
- `matchDirector.js`: `getDirectorMomentWeight` uses `phaseCategoryWeights[phase][category]` +
  score-state eligibility. The director input is built in `systems/match.ts → createMatch`.
- Contract has `goalBonus` / `assistBonus` / `appearanceBonus`. `feed.ts` generates weekly
  stories from scored candidates (`FeedCategory` / `FeedStory`).

---

## Step 1 — Visible risk/reward per choice  ✅ DONE (commit 60d4b09)  *(~UI + one pure helper, no SAVE bump)*

**Player feel:** every moment is a readable gamble — you see your odds, the payoff, the fatigue
cost and what the coach prefers, then choose.

1. **New pure helper** `estimateChoiceOdds(input)` in `matchEngineCore.js`: recompute the
   deterministic part of `resolvePlayerChoice`'s `resultScore` **excluding `variance`**, then
   return a band from `(deterministicScore − threshold)`:
   - `≥ +8` → `"Strong"`, `+2..+8` → `"Favoured"`, `−2..+2` → `"Even"`, `−8..−2` →
     `"Against the odds"`, `< −8` → `"Long shot"`. (variance is ±9, so the bands reflect real
     likelihood without exposing a number.)
   - Export a tiny `ChoiceOdds` type. Takes the same inputs the live screen already has
     (league-adjusted attributeValues, fitness, trust, role, opponentProfile, moment, choice).
2. **UI** (`MatchMomentScreen`): on each choice button add (a) an **odds chip** from
   `estimateChoiceOdds`, (b) a **coach-lean chip** from `choice.manager` ("Coach likes" /
   "Coach wary" / nothing for Neutral), (c) a **fatigue hint** from `choice.risk` (High = "heavy
   legs"). Keep the existing risk + reward text.
3. **No resolution change, no new state.** `systems/match.ts` passes the already-available
   inputs to `estimateChoiceOdds` for display.

**Acceptance:** choices show an honest odds band that worsens for High-risk / strong opponents /
low fitness; coach-lean matches `choice.manager`; build green; no console errors.

---

## Step 2 — Player-controlled mentality dial  ❌ REMOVED 2026-06-25 (shipped, then pulled)

> Built and shipped, then removed at the user's request: the effect was real but subtle, and we'd
> rather let the match engine's own simulation drive resolution for now. Fully reverted (SAVE 24→25);
> since "balanced" was a strict no-op, the engine is back to the exact baseline the OVR curve is tuned
> for. Original spec kept below for reference if we revisit it.

### (original spec) Player-controlled mentality dial  *(engine + director hook)*

> **Shipped:** `matchMentality: "push" | "balanced" | "hold"` on `GameState` (default `balanced`),
> `SAVE_VERSION` 22. Director hook (`getDirectorMomentWeight` × `mentalityCategoryWeights`) shifts
> the moment mix — push toward attacking, hold toward defensive. Resolution hook
> (`getMentalityResolutionModifier` / `getMentalityFatigueModifier`, mirrored into
> `estimateChoiceOdds` so the odds chip stays honest): push +3 to High-risk resultScore & −2
> fatigue; hold +3 to Low-risk & +1 trust on Low-risk success. `chooseAutoSimChoice` biased to
> match. UI: full `MentalityDial` on `PreMatchScreen`, compact version on the live screen (both
> wired through `setMatchMentality` in `App.tsx`). Lab sweep proves it: director attacking share
> push 87% / balanced 84% / hold 79%; High-risk success push 86% vs balanced/hold 68% at −10 vs
> −8 fatigue. Balanced/undefined is a strict no-op — season-lab OVR byte-identical. Verified
> in-browser (dial renders, switches, carries pre-match → live). Build + all labs + smoke green.


**Player feel:** a Push / Balanced / Hold dial you set pre-match and change live — you adapt to
the scoreline yourself, on top of the Director's automatic score-state.

1. **State:** add `matchMentality: "push" | "balanced" | "hold"` to `GameState` (default
   `"balanced"`). Set on `PreMatchScreen`; changeable on the live match screen. `SAVE_VERSION`++.
2. **Director hook** (`matchDirector.js → getDirectorMomentWeight`): multiply `phaseWeight` by a
   mentality×category factor — `push` boosts attacking categories (`shot`, `first_time_finish`,
   `run_behind`, `counter`), `hold` boosts `hold_up` / `press` / defensive categories,
   `balanced` = 1.0. Thread `mentality` through the director input built in `createMatch`.
3. **Resolution hook** (`resolvePlayerChoice` + `chooseAutoSimChoice`): add a `mentalityModifier`
   term — `push`: +3 to High-risk `resultScore` and an extra −2 `fatigueCost`; `hold`: +3 to
   Low-risk and a small trust bump on Low-risk success; `balanced`: 0. Thread `mentality` in.
4. **UI:** 3-way segmented control on `PreMatchScreen`; a compact version on the live screen.

**Acceptance:** lab shows `push` shifts the category mix toward attacking and raises High-risk
success slightly at a fatigue cost; `hold` does the inverse; OVR/peak unchanged; build + match
lab green. Mirror the resolution/director math in `match-balance-lab.mjs`.

---

## Step 3 — Manager comply / defy  ✅ DONE  *(resolution + UI; uses existing `choice.manager`)*

> **Shipped:** unified `managerTrustShift` in `resolvePlayerChoice` — `Risky` (defy): +2 decisive
> / +1 success / **−3 fail (doghouse)**; `Likes` (obey): +1 on success; `Neutral`: 0. Tags
> "Backed your instinct" / "Coach unhappy" / "Followed the plan" feed the result popup. Verified
> by direct assertion (defy-win +6 vs defy-fail −2 vs obey +1) and both labs green. No SAVE bump
> (trust already persisted). 3b (mid-match manager ask) deferred — not shipped.


**Player feel:** the coach has a preference each moment; obeying builds trust, defying-and-
succeeding is glory, defying-and-failing is the doghouse.

1. **Sharpen `trustDelta`** in `resolvePlayerChoice`: when `choice.manager === "Risky"` (defiant)
   → decisive/Great outcome gives **+2 extra trust** ("vindicated"); Poor outcome gives **−2..−3**
   (doghouse). When `choice.manager === "Likes"` (obedient) → success gives a small extra trust.
   Add matching `explanationTags` ("Backed your instinct", "Coach unhappy").
2. **Surface it:** reuse the Step-1 coach-lean chip pre-choice; in the result popup show a short
   "you obeyed / defied the coach" beat tied to the outcome.
3. **Optional (3b, adds transient state → SAVE bump if shipped):** a mid-match **manager ask** —
   a transient instruction (e.g. "see out the game") that for a window re-tags Low-risk choices
   as `Likes` and High-risk as `Risky` in the presented choices.

**Acceptance:** defying + winning yields clearly more trust than obeying; defying + failing
clearly less; lab reports the trust swing distribution; no OVR impact; build green. Mirror the
trust math in the lab.

---

## Step 4 — Personal match objectives / storylines  ✅ DONE  *(ties into The Feed; SAVE bump 22→23)*

> **Shipped (revised):** the personal objective IS the active sponsor's matchday target — present
> ONLY while a sponsor deal is active. (An earlier build fabricated contract/milestone/rivalry/form
> objectives; that felt forced when it was "just the goal bonus", so it was replaced by surfacing the
> existing sponsor objective — one system, no parallel mechanic.) `getSponsorMatchObjective(sponsor)`
> (`src/systems/matchObjective.ts`) maps `sponsor.objective` → a `MatchObjective` view-model with
> `reward.cash` mirroring `sponsor.objectiveBonus` for DISPLAY only. Attached on `createMatch`;
> `finishMatchState` reads completion from `sponsorPayout.objectiveCompleted` (authoritative — the
> sponsor system already pays the bonus, so there is NO second payout) and stores it on
> `lastMatch.objective` + a `careerImpact` line. Feed: a completed sponsor objective becomes a
> commercial ("contract" category) story. UI: objective card on `PreMatchScreen` + complete/missed
> card on the post-match summary, both gated on a sponsor existing. `SAVE_VERSION` 23 (no shape
> change). Verified: probe confirms no-sponsor → no objective, with-sponsor → mirrors the deal
> (target/label/bonus); in-browser a no-sponsor career shows NO objective card (mentality card still
> there), 0 console errors; smoke + build green; OVR untouched. **Deferred:** live in-match progress
> widget (surfaced pre + post only).


**Player feel:** most matches carry a personal stake — a clause to trigger, a milestone to hit,
a point to prove — and the outcome shows up in the weekly Feed.

1. **State / type:** `MatchObjective = { id; type: "goal"|"assist"|"rating"|"appearance";
   target; label; reward: { cash?; prestige?; trust? }; source: "contract"|"milestone"|"rivalry"|"form" }`.
   Attach `objective?: MatchObjective` to the upcoming match / `activeMatch`. `SAVE_VERSION`++.
2. **Generation (deterministic, at `createMatch`/match setup):** pick 0–1 objective from existing
   data, by priority:
   - **Contract clause** — if `contract.goalBonus`/`assistBonus` > 0: "Score to bank $X".
   - **Milestone** — career totals (from `dynastyHistory` + season stats) near a round number
     (e.g. 1 from a 10/25/50 goal landmark): "Reach your Nth career goal".
   - **Rivalry / old club** — derby (high `matchImportance`) or opponent == a former club. (Old-
     club needs a small `formerClubs: ClubId[]` tracked on retirement/transfer; scope to derby
     first, add old-club in a follow-up.)
   - **Form** — on a scoring drought: "End your N-game drought".
   Seed the pick by fixture id so it's stable.
3. **Tracking + reward:** in `finishMatchState`, evaluate the objective against `totals`
   (goals/assists/rating/appeared); on completion apply the reward (cash/prestige/trust) and
   mark it done.
4. **Feed tie-in:** a completed (or notably failed) objective becomes a candidate in `feed.ts`
   (new candidate source, existing `FeedCategory`), so the storyline surfaces in the weekly Feed.
5. **UI:** `PreMatchScreen` shows the objective; live screen/summary shows progress; post-match
   summary shows the reward.

**Acceptance:** `feed-balance-lab` (or a small objective lab) shows sensible objective frequency
and completion rates; objectives never raise OVR; rewards are modest (don't break the cash/curve
balance — keep within the existing bonus magnitudes); build + feed lab green.

---

## Sequencing & dependencies

1. **Step 1** (visible risk/reward) — standalone, highest agency-per-effort, no SAVE bump. Its
   `estimateChoiceOdds` helper + coach-lean chip are reused by steps 2 and 3.
2. **Step 3** (comply/defy) — cheap, reuses `choice.manager` + the Step-1 chip.
3. **Step 2** (mentality dial) — small engine hook; benefits from the odds chip (you see how the
   dial shifts your odds).
4. **Step 4** (objectives/storylines) — biggest; depends on The Feed (shipped) and contract
   clauses (exist). Old-club rivalry is a follow-up once `formerClubs` is tracked.

Each step is independently shippable behind its own commit + lab verification. Keep the
determinism + no-OVR-impact guardrails throughout, and update `PROGRESS.md` per step.
