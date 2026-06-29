# Next Steps

## Current State (2026-06-26)

Shipped on `main` (see `HANDOVER.md` section 0 + `PROGRESS.md`): the match engine + Feed + per-career
variety, a **match-moment dopamine layer** (payoff ladder + screamer, reveal count-ups, in-match heat,
defining moments), and **Honours & Legacy V1 complete** (regenerable NPC award world, Club Legacy
status, data-driven awards + leaderboards, season Honours reveal, redesigned 6-section Dynasty hub).
All OVR-neutral (season-lab End OVR byte-identical 57.01/67.59/67.08/63.77 — the 2026-06-27 rating-curve
tuning moved the guardrail here from the earlier 57.20/67.39/67.11/63.83). A 2D-pitch moment
experiment was built then fully reverted (history scrubbed).

**Next candidates:**
- Balance tuning pass now that the dopamine + Honours layers are in (screamer rate, heat thresholds,
  Club Legacy status thresholds, the tier-capped renewal wage bonus). New baselines as needed.
- Honours & Legacy V2: real award races in more leagues + rivalry/Feed hooks; leaderboard "pin your
  rank"; sponsor-eligibility coupling. V3: all ~38 leagues → IndexedDB.
- Gen-2 offer-driven heir start (the long-standing dynasty gap).
- ~~#9 part 2 — Stamina as an availability/sharpness stat~~ **DONE (2026-06-27):** one engine source
  `getStaminaFitnessLoadMultiplier` (shared by app + season-lab + `scripts/stamina-fitness-probe.mjs`)
  multiplies the fitness load on post-match decay (freshness-damped, compounds) and live readiness
  (minute-ramped, fades late). Guardrail moved to `57.01/67.49/67.07/63.69`. Output-neutral. Later (option 3,
  deferred): let higher tiers/match tempo bite more via the moment library.
- ~~Unify OVR across app and labs (the "two OVR truths")~~ **DONE (2026-06-29):** Forward weights extracted
  into one shared `src/engine/ovrWeights.js` (+ `.d.ts`) imported by the app (`positionRoles.ts`), both balance
  labs and `scripts/app-ovr-probe.mjs`. The guardrail now measures the real app OVR; app OVR unchanged,
  match-lab output unchanged, season-lab End OVR re-baselined to **`51.83/61.49/61.06/58.03`** (the current
  guardrail). The labs also now treat Pace/Stamina as "key" for start bonuses + the potential upgrade,
  matching the app's `bumpKeyAttributePotential`.
- ~~Man of the Match (#23)~~ **DONE (2026-06-29):** rating-based V1 — eligibility guardrails (≥25' or a
  decisive G/A in ≥20', rating ≥ 7.5) + a seeded "best-rival" bar; post-match badge, Feed story, season +
  career counters, season-end cabinet award. V2 deferred: club-record granularity (most / in a season /
  consecutive), MotM-by-season breakdown, a cameo "Impact award", data-driven vs real NPC ratings.
- **Remaining playtest polish (⚫):** #24/#25 Feed + manager-message variety, #26 first-goal labelling, #19
  Ballerup OVR. Small, bounded, low balance-risk.
- ~~Attribute-model cleanup (offensive-only)~~ **DONE (2026-06-29, `ATTRIBUTE_MODEL_PLAN.md`):** removed
  Tackling/Marking (function remapped) + Fullback/Centerback positions + dead `strikerKey`; 15 active stats;
  Work Rate stays striker-key (guardrail held `51.83/61.48/61.07/58.03`); SAVE_VERSION 26. Winger/AM defined
  but locked.
- **"More positions" release (the deferred follow-on):** make Winger + Attacking Midfielder playable — add
  Crossing + per-role moment banks, a position picker at career start, lab parity + award-world tuning for
  the new roles, and per-role OVR weights per `ATTRIBUTE_MODEL_PLAN.md` §3. A real feature, not a cleanup.

The older direction below predates the above and is kept for reference.

## Current Build Direction

Match engine er nu det vigtigste build focus. Den nuvaerende prototype beviser flowet, men naeste lag skal goere kampene mere realistiske, stats-drevne og forklarbare. Se `MATCH_ENGINE.md` for den samlede engine-retning.

Naeste engine-lag boer handle om:

- opponent profiles i stedet for kun opponentStrength
- position modules for Forward, Winger, Midfielder, Fullback og Centerback
- highlight generation baseret paa player stats, rolle, service, score state og modstanderprofil
- resolution V2 med player_score vs opponent_score, chance quality og outcome bands
- explanation tags, saa UI kan forklare hvorfor et valg lykkedes eller fejlede
- batch simulation/debug tool til balance af goals, ratings, XP og role progression

Kampkonteksten omkring engine'en skal fortsat udbygges:

- simpel fixture list i stedet for one-off upcoming match
- role/minutes v2 med substitution, bench cameos og tydelig selection logic
- pre-match briefing med manager instruction, opponent form og tactical focus
- post-match summary v2 med bedre XP breakdown og season narrative
- flere club/career consequences efter kamp, saa resultaterne foeles som en del af saesonen

Senest implementeret:

- role/minutes v1 paavirker nu player highlight-vinduer og antal involveringer
- post-match summary v1 viser score, rating, XP, trust, rewards og role impact
- Player screen viser seneste kamp som progression-feedback
- season fixture loop v1 med 12 kampe, record, form, points og next fixture
- selection logic v2 med score, factor breakdown, next-role target og post-match role review
- club fixtures/table v1 med upcoming 5 preview, full fixture list og league table
- training v3 med obligatorisk weekly session, direkte attribute focus, intensity, XP range og after-training recap
- core loop fastlagt som Training -> Match -> Training -> Match
- match engine direction dokumenteret i `MATCH_ENGINE.md`
- match engine V2 foundation module med opponent profiles, Forward highlight taxonomy, chance quality og explanation tags
- position role data layer i `src/positionRoles.ts` med Forward, Winger, Midfielder, Fullback og Centerback uden målmand
- position modules styrer nu key attributes, OVR weights, manager instructions, tactical focus og let match tendency bias
- f�rste position moment libraries for Forward, Winger, Midfielder, Fullback, Centerback og Shared
- position-aware rating/XP V1 med performance weights og key-attribute XP bias
- position-aware post-match Performance Breakdown med rating, role fit og XP drivers

Naeste oplagte gameplay-hul:

- position-aware post-match breakdown, saa rating/XP forklares forskelligt pr. position
- flere moment variants per position, saa hver rolle har nok variation over flere saesoner
- match engine V2 resolution bands, explanation UI og batch simulation/debug tools
- facilities/coaches/home gym som training multipliers, der haever floor og reducerer variance
- recovery/fatigue model v2, saa haard traening kan give kortsigtet risiko
- end-of-season checkpoint med contract, role review og transfer interest
- bedre attribute detail view med full XP history og level-up forecast
- league target position og end-of-season rewards/consequences
- fixture result consequences, hvor holdform og pres paavirker morale/trust

## Current Focus

Etabler en stærk Striker V1 vertical slice, hvor UI og gameplay-kernen kan mærkes:

- en ung angriber kæmper for spilletid
- ugentlige valg påvirker udvikling, fatigue og morale
- kampene består af choice-based moments
- match rating påvirker XP, manager trust og karriere-momentum
- bedre performance åbner for større rolle, kontrakt og transferinteresse

## Recently Completed

- Første React/Vite app foundation.
- Første mobile-first Player dashboard.
- Bottom nav med Player, Training, Club, Home.
- Central advance-time knap.
- Placeholder-skærme for Training, Club og Home.
- Første visuelle implementation af `DESIGN.md`.
- Første `GameState` med attributes, XP, training focus, intensity, fitness, trust og season stats.
- Første funktionelle Training loop.
- Første Match Day flow med choice-based moment og resultater.

## Immediate Design Tasks

Current priority:

1. Refactor match engine into clearer setup/generation/resolution helpers.
2. Replace binary match resolution with player_score vs opponent_score and outcome bands.
3. Add explanation UI to match result and post-match report.
4. Make stats affect both highlight frequency and outcome, not only final success.
5. Add batch simulation/debug script for match balance.
6. Define how match rating is composed for a striker.
7. Expand opponent profile effects into substitutions, score state and sim event types.
8. Balance matchweek-loopet: training XP, match XP, fatigue og season length.
9. Lad scoreline og match context aendre senere timeline-events dynamisk.

Legacy backlog:

1. Definer Striker V1 attributes og deres konkrete effekt.
2. Design de første 10-15 striker match moments.
3. Balancer matchweek-loopet: training XP, match XP, fatigue og season length.
4. Definer manager trust og spilletidsmodel.
5. Definer XP, attribute progression og potentiale.
6. Definer første simple klubtier-model.
7. Definer første simple kontraktmodel.
8. Definer hvordan match rating beregnes for angriber.
9. Gør match resolution mindre deterministisk med tydelige, fair modifiers.
10. Lad scoreline og match context ændre senere timeline-events dynamisk.
11. Tilfoej mulighed for 2-3 training focus stats, unlocket via facilities/prestige.
12. Definer nav-strukturens endelige scope for Club og Home.
13. Tilføj save/load til localStorage.
14. Tilføj simple career events efter uge/kamp.
15. Tilføj spilletid/substitution model, så spilleren ikke altid får samme mængde involvering.
16. Tilføj dedikeret full-time summary screen efter live match.
17. Gem match speed som brugerindstilling.
18. Tilføj dedikeret full-time summary screen.
19. Vis i full-time summary hvilke player highlights der blev auto-simuleret.

## Striker V1 Moment List Draft

Moments der bør designes først:

- Simple shot chance
- First-time finish
- One-on-one with keeper
- Run behind defensive line
- Hold-up play under pressure
- Aerial duel in the box
- Pressing trigger
- Cutback decision
- Counterattack choice
- Loose ball in the box
- Link-up pass around the box
- Late game chance under pressure
- Defensive set piece marking
- Penalty decision or penalty execution
- Bad touch under pressure

For hvert moment skal vi definere:

- situation text
- available choices
- relevant attributes
- success/fail outcomes
- rating impact
- trust impact
- fatigue impact
- possible special outcomes

## Key Systems To Specify Next

### Weekly Loop

Skal afklare:

- Hvor mange valg pr. uge?
- Skal spilleren kunne gemme presets?
- Hvor ofte kommer relation/lifestyle-events?
- Hvordan vises fatigue og recovery tydeligt?

### Training

Skal afklare:

- Hvor mange fokusområder kan vælges?
- Skal intensitet være separat fra fokus?
- Hvordan skalerer facilities og coaches XP?
- Hvordan forhindres én optimal træningsstrategi?

### Match Moments

Skal afklare:

- Skal spilleren se sandsynligheder?
- Skal valg have skjulte konsekvenser?
- Hvordan påvirker kampens stilling moment-valg?
- Hvordan varierer moments efter rolle/archetype?

### Career Progression

Skal afklare:

- Hvilke klubtiers findes i første version?
- Hvor hurtigt bør en spiller kunne rykke op?
- Hvordan skabes risiko ved for tidligt klubskifte?
- Hvornår bliver agent, sponsor og media relevant?

## Suggested MVP Scope

MVP bør indeholde:

- Angriberposition
- 3 striker archetypes
- 12-15 match moments
- Weekly training/recovery loop
- Fitness, fatigue, morale, form
- Manager trust og spilletid
- Simple XP og attribute progression
- 4-5 klubtiers
- Simple kontrakter
- First-generation career til ca. 5-8 sæsoner

MVP bør ikke starte med:

- fuld målmand
- landshold
- dybt sponsor-system
- komplet mediesystem
- alle ligaer
- fuld familie/life sim
- avanceret holdtaktik

## Design Principles For Future Expansion

- Nye positioner skal tilføje moment pools og role weights, ikke nye grundsystemer.
- Nye klubber/ligaer skal bruge samme tier- og reputation-model.
- Nye legacy-bonusser skal påvirke start og efficiency, ikke give direkte dominans.
- Nye relationer skal primært være event hooks, ikke tunge simulationer.
- Nye equipment items skal give små modifiers, ikke store attribute jumps.

## Next Conversation Recommendation

Næste designsession bør fokusere på en af to retninger:

1. UI: Player screen wireframe og informationshierarki.
2. Gameplay: Striker attributes, archetypes og de første match moments.

## Next After League Context V1

- Build transfer/division progression so the player can move from grassroots to higher league tiers.
- Add club tier data for facilities, wage ranges, reputation and expected squad OVR.
- Rebalance start OVR, training XP and attribute XP cost curve against the new 1-100 dynasty scale.

## Next Economy Layer

Core direction:

- Keep cash as active-career spending only.
- Keep prestige as career status and sponsor access, not a spendable wallet.
- Convert career achievements and final prestige into Legacy Points at retirement.

Recommended implementation order:

1. Stabilize cash economy with weekly wages, contracts, support prices and upgrade impact across 30/38 match seasons.
2. Done: add prestige tier definitions and a UI card that shows current tier, total prestige and progress to the next tier.
3. Done V1: add prestige gains from goals, assists, ratings, starts, club tier and season output.
4. Done foundation: add Home -> Deals as the permanent contract/sponsor surface with current contract terms and sponsor eligibility. Next: add Sponsor V1 offers with weekly retainers, concrete objectives, payouts and pressure tradeoffs.
5. Later: add retirement conversion from final prestige plus career achievements into Legacy Points.

Balance principle:

`Contracts fund the early run. Prestige unlocks sponsors. Sponsors help the player break through mid/late support-cost walls. Legacy Points are earned at retirement and improve future generations.`

## Next After Sponsor Deals V1

Done V1:

- Home -> Deals contains current contract info and sponsor offers.
- Sponsor offers are prestige-gated and pay weekly retainer plus objective bonus.
- Sponsor payouts are included in match/week economy and season balance lab output.

Recommended next steps:

1. Tune recovery/minutes/output balance, because recovery-heavy upgrade paths now create very high minutes, goals, assists and sponsor income.
2. Add sponsor tiers beyond Known Talent / Regional Name only after the early-mid economy feels stable.
3. Add clearer contract screen details and negotiation timing around expiring deals.
4. Later: add fame/media/sponsor identity as a separate layer once prestige and sponsor cash are stable.

Balance note:

Sponsors should help the player break through cash upgrade walls, but they must not become guaranteed passive income that makes contracts irrelevant. Objective bonuses should matter, while weekly retainers should stay supportive rather than dominant.

## Next After Recovery Balance Patch V1

Recovery is now a stabilizer instead of a pure accelerator.

Recommended next checks:

1. Playtest 8-12 weeks manually and check whether low fitness feels recoverable rather than punishing.
2. Decide whether recovery-track focus should remain a valid availability build, or whether role/trust/ability should further cap minutes.
3. Revisit prestige thresholds and sponsor unlock timing, because the reduced output means Known Talent is reached later in balanced builds.
4. Add lab metrics for missed squads, weeks below 25 fitness and weeks above 45 fitness to make recovery tuning easier.

Current balance read:

- Balanced/development/recovery spending now end near the target OVR curve by season 4.
- No-upgrade, performance-only, career-only and lifestyle-only builds fall behind, which is acceptable if the game teaches that development/recovery support matters.
- Pure recovery-track still creates high availability but sacrifices OVR growth, which may be a good tradeoff if it feels clear in UI.

## Next After Prestige Unlock Patch V1

Prestige now unlocks the first sponsor tier earlier:

- Known Talent: 350 prestige
- Regional Name: 1,500 prestige

Current recommendation:

1. Manual playtest to see whether sponsor unlock around late season 4 feels too late, just right or still invisible.
2. If it feels too late in real play, add small milestone prestige events rather than lowering thresholds again.
3. Candidate milestone events:
   - first senior appearance
   - first goal
   - first assist
   - first start
   - first 7.0+ rating
   - first role promotion
4. Keep goals/assists important, but let reputation grow through visible career steps too.

## Next After Recovery Ceiling Patch V1

Recovery now has both a soft floor and a soft ceiling.

Recommended next checks:

1. Run long career labs and compare balanced, development, recovery and recovery-track end fitness.
2. Manual playtest a recovery-heavy route and check whether it feels strong without removing fatigue decisions.
3. If pure recovery still sits too close to 100 fitness, lower the ceiling overflow from 25% to 15%.
4. If balanced builds feel too punished, raise the ceiling cap slightly before changing match fatigue.
