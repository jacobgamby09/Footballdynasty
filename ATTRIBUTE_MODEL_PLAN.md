# Attribute Model Cleanup — Design Proposal (REVIEW BEFORE IMPLEMENTING)

Status: **steps 1–2 IMPLEMENTED 2026-06-29** (reviewed + approved). Goal: a lean offensive-only attribute
model where every visible stat has a purpose, ahead of making Winger and Attacking Midfielder real roles.

**Shipped (foundation step):** removed Tackling + Marking (their track-back / defensive-set-piece function
remapped to Work Rate/Positioning/Strength, not deleted), removed the Fullback + Centerback positions,
dropped the dead `strikerKey`, regrouped Heading to Physical, recomposed the NPC award world to the offensive
groups. **Decisions taken:** Work Rate stays KEY for the striker (Forward OVR + guardrail unchanged, held at
`51.83/61.48/61.07/58.03`); active pool is **15 stats** (Crossing deferred to the Winger build so it isn't a
dead stat); **SAVE_VERSION bumped 25→26** (old saves reset). Winger + Midfielder are defined but
**locked/not-playable**. Build green, smoke 0, match-lab output identical. **Deferred (the "more positions"
release):** §8 step 4 — Crossing + Winger/AM moment banks + a position picker + lab parity. The design body
below is kept as the record.

---

## 1. Audit findings (what exists today)

**17 attributes** (`src/data/attributes.ts`): Finishing, Long Shots, Passing, Vision, Dribbling, Off Ball,
Composure, First Touch, Acceleration, Pace, Stamina, Heading, Strength, Work Rate, **Tackling**, **Marking**,
Positioning.

**5 position modules** (`src/positionRoles.ts`): Forward (→ UI label "Striker"), Winger, Midfielder
(→ "Offensive midfielder"), **Fullback**, **Centerback**. Only the first three are offensive.

**Where attributes actually bite:**
- **OVR** — per-position `ovrWeights`. Forward is the shared single source (`engine/ovrWeights.js`); the
  others are inline. Weight 0 = doesn't count.
- **Match moments** — `choice.uses` arrays in `engine/forwardMoments.js` (forward + winger + midfielder +
  fullback + centerback + shared pools) and `engine/forwardMomentLibrary.js` (expansion). Resolution =
  `averageAttributes(attributeValues, choice.uses)` in `matchEngineCore.js`. **All 17 appear somewhere.**
- **Highlight taxonomy** (`matchEngine.ts`) — each category has `primaryAttributes` (e.g. shot →
  Finishing/Composure/Off Ball; `defensive_set_piece` → Marking/Positioning/Heading).
- **Generation** (`systems/generation.ts`) — attributes in a position's `keyAttributes` get higher
  start + potential. By list membership, never by name.
- **`keyAttributes`** also gives a **+1 resolution bonus** when a choice uses one (`match.ts:1872`) and
  drives focus selection.
- **Fitness** — only **Stamina** is named, via `getStaminaFitnessLoadMultiplier`. Good — the availability
  design is intact.
- **Training / selection / feed** — no attribute hardcoded by name (operate via focus list + OVR).

**Dead / near-dead:**
- `attributeInfo[].strikerKey` — defined for all 17, **never read**. Pure dead data; remove it.
- For a **striker specifically**, these have OVR weight 0 *and* appear in few/no forward moments: currently
  fine as "situational", but Tackling/Marking only earn their keep through defensive moments we're removing.

**Reality check on "more positions":** Winger/Midfielder pools exist but are **~4 moments each** vs the
forward pool's ~40. Position is **hardcoded to Forward** at career start (`initialState.ts:39`). So the stat
model is the easy part — the real cost of shipping Winger/AM is **moment content + a position picker**, not
the attribute list.

---

## 2. Recommended stat pool — **16 stats** (your list is 16, not 15)

Remove **Tackling** + **Marking**; add **Crossing**. Keep Positioning (it's a Mental reading-the-game stat,
not a defensive one). Heading stays but I'd regroup it under Physical (it's an aerial/physical stat).

| Group | Stats |
|---|---|
| Technical | Finishing · Long Shots · First Touch · Passing · Dribbling · **Crossing (new)** |
| Physical / Movement | Acceleration · Pace · Stamina · Strength · Heading |
| Mental / Off-ball | Off Ball · Composure · Vision · Work Rate · Positioning |

### Per-stat purpose

| Stat | What it is | Primary effect | Who cares |
|---|---|---|---|
| Finishing | Converting chances in the box | shot/first-time-finish resolution | Striker **key**, Winger/AM supp/sit |
| Long Shots | Threat from distance | edge-of-box shot moments | AM supp, Striker/Winger sit |
| First Touch | Clean control | hold-up, cutbacks, setting up shots | all three **key** |
| Passing | Linking / final ball | layoffs, assists, link-up | AM **key**, Winger supp, Striker sit |
| Dribbling | Carrying past pressure | 1v1s, creating your own shot | Winger/AM **key**, Striker sit |
| **Crossing** | Delivery from wide | winger cross/cutback moments | Winger **key**; only meaningful once winger cross moments use it |
| Acceleration | First 3–5 m / first step | box separation, loose balls, pressing jump | Striker/Winger **key**, AM supp |
| Pace | Top speed over distance | runs behind, counters | Winger **key**, Striker **supporting**, AM sit |
| Stamina | Holding level over 90' + congestion | **fitness decay only** (availability, not output) | all **supporting** |
| Strength | Duels, shielding, contact | hold-up, aerial duels, drawing fouls | Striker **key**, Winger/AM sit |
| Heading | Aerial timing | aerial duels, headers, knock-downs | Striker **key**, Winger/AM sit |
| Off Ball | Movement that makes space | run-behind, chance quality | all **key** |
| Composure | Calm under pressure | high-pressure shots/touches | Striker/AM **key**, Winger sit |
| Vision | Spotting the best action | through balls, creative assists | AM **key**, Winger supp |
| Work Rate | Press / recover / follow instructions | pressing moments + **manager trust** | Striker/Winger/AM **key→supp** (see flag) |
| Positioning | Reading where to be | rebounds, late arrivals, second balls | AM supp, Striker/Winger sit |

> **Crossing is the one genuinely-new stat.** It is dead on arrival unless winger cross/cutback moments
> actually use it (today they use Passing/Vision). So Crossing should land **together with the winger
> moment work**, not before — otherwise it's exactly the meaningless stat we're trying to avoid.

> **Pressing: don't add it.** Work Rate (+ Stamina + Positioning) already carries offensive players'
> defensive/press contribution. A separate Pressing stat is only worth it if we build a whole press-moment
> family that needs its own axis — revisit later, not now.

---

## 3. Per-role tiers + proposed OVR weights

Tiers map cleanly to weights: **key** = high weight + in `keyAttributes`; **supporting** = low weight (~0.5–0.7),
*not* in `keyAttributes`; **situational** = weight 0 (absent from `ovrWeights`, still usable in moments).

### Striker (Forward) — essentially unchanged (keeps the guardrail still)
| Tier | Stats (weights) |
|---|---|
| Key | Finishing 1.35 · Off Ball 1.2 · Composure 1.15 · First Touch 1.05 · Acceleration 0.9 · **Work Rate 0.8** · Heading 0.7 · Strength 0.65 |
| Supporting | Pace 0.6 · Stamina 0.5 |
| Situational | Passing · Vision · Long Shots · Dribbling · Crossing · Positioning |

> **⚠ One disagreement with your proposal:** you put **Work Rate as *supporting*** for the striker. I
> recommend **keeping it key.** Work Rate isn't a pure OVR-floor stat like Pace/Stamina — it drives pressing
> moments *and* manager trust, and dropping it from `keyAttributes` removes its +1 resolution bonus. Keeping
> it key also means the **striker model is unchanged**, so the OVR guardrail (`51.83/61.49/61.06/58.03`)
> doesn't move from this cleanup. If you'd rather it be supporting, that's fine — it just lowers Work Rate's
> weight (~0.55) and re-baselines the guardrail. Your call.

### Winger — re-pointed toward a wide threat
| Tier | Stats (weights) |
|---|---|
| Key | Dribbling 1.25 · Pace 1.2 · Acceleration 1.15 · **Crossing 1.1** · First Touch 1.0 · Off Ball 0.95 |
| Supporting | Stamina 0.7 · Work Rate 0.65 · Passing 0.6 · Vision 0.55 · Finishing 0.55 |
| Situational | Heading · Strength · Long Shots · Composure · Positioning |

(vs today: adds Crossing + Off Ball as key, moves Passing/Vision to supporting — wide threat, not playmaker.)

### Attacking Midfielder ("Offensive midfielder") — playmaker, not box-to-box
| Tier | Stats (weights) |
|---|---|
| Key | Passing 1.25 · Vision 1.2 · First Touch 1.1 · Composure 1.05 · Dribbling 1.0 · Off Ball 0.95 |
| Supporting | Work Rate 0.7 · Stamina 0.7 · Long Shots 0.6 · Acceleration 0.6 |
| Situational | Finishing · Pace · Strength · Crossing · Heading · Positioning |

(vs today's Midfielder: drops Tackling + Positioning from key, adds Dribbling + Off Ball — clearly attacking.)

These weights are a first pass to react to — easy to nudge once you see the lab numbers.

---

## 4. How the three tiers are represented (consistently)

| Surface | Key | Supporting | Situational |
|---|---|---|---|
| **OVR weight** | high (0.9–1.35) + in `keyAttributes` | low (0.5–0.7), not in `keyAttributes` | absent (weight 0) |
| **Training-grid star** | filled lime star (existing) | outline muted star (the one just shipped) | no star |
| **Stat description** | "Key for a {role}" | "Supports your OVR — {role}" | "Situational — matters for {other role}" |
| **Match engine** | +1 `keyAttributeBonus` when used in a choice + focus pref + generation bonus | appears in some `choice.uses` (e.g. Pace in run-behind) but no +1 bonus | appears in few moments only |

The star logic I just shipped already derives from `keyAttributes` (filled) + `ovrWeights>0 && !key`
(outline). It generalizes to all three roles for free — no per-role UI work.

---

## 5. Removing Tackling & Marking — what breaks, and the rework

Not free. Every read (from the audit):

1. **Fullback + Centerback modules** (`positionRoles.ts`) — both removed entirely (non-offensive). Takes
   their `keyAttributes`/`ovrWeights`/moment pools with them.
2. **Midfielder OVR** — loses Tackling 0.8 (replaced by Dribbling/Off Ball per §3).
3. **Forward & expansion moments** — Tackling is in **7** forward-pool moments, Marking in **5**, plus the
   expansion pool — these are the striker's counter-press / track-back / defensive-header moments. Their
   `choice.uses` must be **remapped**, not deleted: Tackling → **Work Rate + Positioning** (winning the ball
   back is effort + reading), Marking → **Positioning + Heading** (tracking a runner / defensive header).
   This keeps "offensive players still have some defensive responsibility" without a defensive stat.
4. **`defensive_set_piece` highlight taxonomy** (`matchEngine.ts`) — currently Marking/Positioning/Heading.
   Re-point to **Positioning/Heading/Strength**, or drop the category for offensive roles.
5. **Winger/Midfielder pools** — a few `uses` reference Tackling/Marking; remap as above.

`OpponentProfile` has **no** Tackling/Marking fields, and the **shared pool doesn't use them** — so those are
untouched. Net: ~12–18 moments get a `uses` remap + one taxonomy edit. Contained, and the match-lab measures
the resolution impact.

---

## 6. Migration plan

**Files to change**
- `src/positionRoles.ts` — drop `Fullback`/`Centerback` from `PositionGroup`, `positionGroups`,
  `positionModules`, and the `PositionMomentPool` union; update Winger/Midfielder (and optionally Forward)
  per §3; `AttributeKey` loses Tackling/Marking, gains Crossing.
- `src/data/attributes.ts` — `initialAttributes` (− Tackling/Marking, + Crossing); `attributeInfo` (same,
  rewrite descriptions to be role-aware, **delete the dead `strikerKey` field**).
- `src/engine/ovrWeights.js` (+ `.d.ts`) — Forward weights (only if Work Rate is re-tiered). Optionally add
  `wingerOvrWeights` / `attackingMidOvrWeights` shared modules so the labs can measure them later.
- `src/engine/forwardMoments.js` — remove fullback/centerback pool creators + dispatcher entries; remap the
  Tackling/Marking `uses`; (later) point winger cross moments at Crossing.
- `src/engine/forwardMomentLibrary.js` — remap the Tackling `uses` in the expansion pool.
- `src/matchEngine.ts` — rework/drop `defensive_set_piece` primaryAttributes.
- `scripts/season-balance-lab.mjs` + `scripts/match-balance-lab.mjs` — `baseAttributes` (− Tackling/Marking,
  + Crossing); remove FB/CB; re-measure the guardrail.
- `src/state/save.ts` — `SAVE_VERSION` (see below).
- No change needed: `generation.ts`, `selection.ts`, `training.ts`, `feed.ts` (all operate by list/OVR, not
  by attribute name).

**Removed stats / save handling**
- `mergeSavedAttributes` (`save.ts`) reconciles a loaded save against `initialAttributes` attribute-by-
  attribute — so Tackling/Marking **drop automatically** and Crossing **defaults in** on load. No messy
  partial state even without a version bump.
- **Recommendation: bump `SAVE_VERSION` anyway** (25 → 26). You said old saves don't matter much in dev, the
  attribute set + positions change materially, and a bump forces a clean slate (the strict version check
  discards old saves) rather than relying on silent reconciliation. Clean > clever here.

---

## 7. Risk assessment

- **Balance (medium):** removing Tackling/Marking + remapping ~12–18 moment `uses` + the Midfielder reweight
  **will move the lab guardrail** — deliberate, must re-baseline + re-document. The **striker barely moves**
  if Work Rate stays key (the reworked moments just swap to Work Rate/Positioning, which strikers already
  have). Winger/AM numbers shift more (intended — they're being re-pointed). Measure every step with the labs.
- **UI (low):** the 3-tier star already generalizes; 17→16 stats fits the grid fine. The real UI work
  (position picker for Winger/AM) is a separate later step, not part of this cleanup.
- **Match engine (medium):** the moment `uses` remap changes resolution for those specific moments; the
  taxonomy edit changes one highlight category. Contained, deterministic, lab-measurable.
- **Determinism:** unaffected (no new randomness; remapping `uses` is static).

---

## 8. Suggested implementation order

1. **Drop the dead weight (no balance move):** delete `strikerKey`; remove Fullback + Centerback modules +
   their moment pools (they're not player-selectable anyway). Build + smoke. Guardrail unchanged.
2. **Stat-pool cleanup (striker stays put):** remove Tackling/Marking from the model; remap the forward +
   expansion moment `uses` (→ Work Rate/Positioning/Strength); rework the `defensive_set_piece` taxonomy.
   Re-measure + re-baseline the guardrail; confirm the striker feel is intact via the match-lab.
3. **Define Winger + AM in the new model:** rewrite their `keyAttributes`/`ovrWeights` per §3 (Crossing added
   to the type but only wired into moments in step 4). Modules ready; not yet player-selectable.
4. **(Separate, bigger) Make Winger + AM playable:** new winger/AM moment content (winger crosses use
   Crossing), a position picker at career start, lab parity for the new roles. This is the "more positions"
   feature — out of scope for the *cleanup*, but the cleanup makes it clean.

Steps 1–3 are the "clean up the model" deliverable. Step 4 is the follow-on build.

---

## 9. Open questions for you

1. **Work Rate for the striker — key (my rec, keeps guardrail) or supporting (your proposal, moves it)?**
2. **Confirm 16 stats** (your list totalled 16, not 15) — Tackling/Marking out, Crossing in.
3. **Crossing now or with winger content?** I recommend adding it to the *type* now but only wiring it into
   moments in step 4, so it isn't a dead stat in the interim.
4. **Save: bump version (clean slate) — OK?**
5. **Are Winger/AM in scope for the player to *pick* soon, or are we just cleaning the model now and keeping
   striker-only play for a while?** (Decides whether step 4 is near-term.)
