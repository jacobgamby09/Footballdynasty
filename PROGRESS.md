# Progress Log

## 2026-06-23

### Create Dynasty V1

- Added a first-run Create Dynasty flow before country selection.
- New careers now capture player first name, family/dynasty last name, nationality and position setup before choosing the starting club country.
- Position choice is intentionally scoped to Striker for now, with Winger and Attacking Midfielder shown as future offensive-role expansion.
- Player header, dynasty history and retirement text now read from persistent player identity instead of the old hardcoded Jonas Vale label.
- Dynasty state now stores `familyName` and `nationality`, and `GameState` now stores `player`.
- Retiring into the next generation preserves the family name and creates a new first name for the heir.
- Save version bumped to 20 because player identity and dynasty family/nationality are now part of persisted state.

## 2026-06-22

### Transfer Window V1

- Added a persistent transfer-window checkpoint with two windows: mid-season and end-season.
- Transfer windows now generate a dedicated career decision screen with current club context, club fit, interest level, current-club extension and external offers.
- Added club-fit reads: Under level, Developing, Good fit and Outgrown.
- Home -> Deals now shows club fit, next transfer window and current market interest.
- The main progress button is disabled while concrete transfer/extension offers are active, forcing an explicit accept/decline decision.
- Accepting an offer from the transfer-window screen reuses the existing contract acceptance path and clears the window.
- Season rollover now preserves an already accepted contract/transfer instead of always overwriting it with an automatic current-club renewal.
- Save version bumped to 11 because `transferWindow` is now part of career state.

### Readiness Model V1

- Reworked fitness labels into clearer 0-100 readiness bands: Sharp, Ready, Tired, Risky and Not match fit.
- Selection now treats 60+ readiness as nearly neutral, 40-59 as managed-minutes territory and 20-39 as true risk.
- Under 20 readiness now triggers a recovery session instead of normal training, preventing low-fitness spirals from locking the player out for too long.
- Match state now stores start fitness and calculates live match readiness from minutes played plus completed action fatigue.
- Match UI now shows live readiness during matches, and player moment resolution uses live readiness instead of only pre-match fitness.
- Recovery floor and floor-pull were strengthened so recovery support improves stability without being the only way to stay involved.
- Balance lab mirrors the new readiness labels, recovery session threshold and recovery-floor tuning.
- Latest 60-run, 8-season lab read: no-upgrade builds still fall behind but remain involved in many matches; balanced/development/recovery builds reach roughly 49 OVR by season 8; pure recovery gives the best availability/readiness but output per 90 is now clearly too high and should be tuned in the match engine next.

### Match Output Realism Patch V1

- Tightened chance-quality thresholds so `Clear chance` and `Good chance` require stronger execution relative to the opponent.
- Goal and assist outcomes are no longer automatic for Good/Great actions; decisive output now uses deterministic probability by outcome tier and chance quality.
- Teammate finishing after assist-type actions now has lower, opponent-sensitive conversion, while successful creative actions still create chances, rating and XP.
- Latest 60-run, 8-season lab read after the patch:
  - Balanced spending goals/90 fell from roughly 1.4 to 0.48.
  - Development spending goals/90 sits around 0.45.
  - Recovery spending goals/90 sits around 0.59.
  - Recovery-track focus goals/90 sits around 0.65.
- Output now looks much closer to a football career curve, but reduced goals/assists also lowers prestige, cash and some match-driven XP. Future progression tuning should compensate through training, support, facilities, contracts and sponsor balance rather than inflated match conversion.

### Gen 1 Progression Balance Patch V1

- Rebalanced the main progression stack after match-output realism lowered match-driven rewards.
- Attribute XP requirements now scale a little less aggressively at mid/high values, while still making elite stats more expensive than early stats.
- Soft growth pressure slows growth beyond the natural curve without acting like a hidden cap.
- Gen 1's starting OVR remains low, but its growth profile marker now sits around 60 OVR. Strong support, facilities and performances can still push beyond that, but the target is closer to 70 than high-70s.
- Training range, club-facility XP scaling and facility support efficiency were strengthened so progression comes from training, facilities and support rather than inflated match conversion.
- Secondary focus slots now start slightly more useful and scale higher through efficiency upgrades.
- Match-action XP was reduced so good performances remain meaningful but no longer become the main growth engine during high-minute seasons.
- Over-profile XP pressure was strengthened slightly so Gen 1 can break its natural curve, but gets noticeably more expensive above it.
- Season balance lab now prints a `Gen1 dynasty read` line with peak OVR, final target gap, prestige and a provisional lab legacy-seed score.
- Latest 20-run, 15-season Gen 1 lab read:
  - Balanced spending: 71.6 OVR, final target gap +2.3, 0.71 goals/90, healthy dynasty foundation.
  - Development spending: 71.6 OVR, final target gap +2.3, 0.68 goals/90, healthy dynasty foundation.
  - Recovery spending: 68.1 OVR, final target gap -1.3, healthy dynasty foundation.
  - Training-track focus: 68.1 OVR, final target gap -1.2, healthy foundation but poor late fitness.
  - No-upgrade/career-only builds land around 59 OVR, which keeps support investment meaningful.
- Balance watch: if a player becomes too strong for their current tier, goals/90 can still spike. That should be handled mostly through transfer/league progression and tier fit, not by nerfing player development again.

## 2026-06-18

### Prestige Tier V1

- Added a central prestige tier system: Local Prospect, Known Talent, Regional Name, National Profile, Star Player, Icon and Legend.
- Prestige is still stored as one raw career score, so no save-version bump is required; tiers are derived from existing `game.prestige`.
- Match prestige gains now scale from goals, assists, chances created, rating, match importance and league prestige multiplier.
- Season prestige rewards now scale from apps, starts, goals, assists, average rating, table position, goal difference and club tier.
- Player screen now shows a dedicated prestige card with current tier, total prestige, progress to next tier and sponsor-interest unlock text.
- Week Summary and Season Review now show prestige movement in tier context instead of only a raw `+X`.
- Contract/transfer logic now uses a normalized prestige leverage score so larger raw prestige totals do not explode old interest formulas.
- Season balance lab now tracks prestige gained, end prestige, prestige tier and season-by-season prestige curve output.

### Career Deals Screen V1

- Added `Deals` as a Home subtab alongside Base, Support and Dynasty.
- Moved detailed contract viewing out of the Player dashboard and into Home -> Deals.
- Deals now shows a compact commercial overview, the current contract card and a sponsor slot placeholder.
- Sponsor slot displays eligibility from prestige tier, current retainer, objective and pressure values, ready for Sponsor V1 offers.
- DESIGN and GDD now define contracts and sponsors as one `Career Deals` surface instead of separate shops.

### Economy Direction: Prestige, Sponsors And Legacy

- Locked the three-currency direction in the design docs: cash is active-career spending, prestige is career status/access and Legacy Points are dynasty spending power.
- Prestige should be an unbounded score with readable tiers such as Local Prospect, Known Talent, Regional Name, National Profile, Star Player, Icon and Legend.
- Prestige is not spent directly. It unlocks opportunities, especially sponsor interest, transfer visibility and career pressure.
- Sponsors are defined as the mid/late-career cash accelerator: weekly retainers, objective payouts and pressure/obligation tradeoffs unlocked by prestige, role, club tier and agent/career setup.
- Retirement should convert final prestige plus career achievements into Legacy Points, preserving the incentive to invest cash into the current player instead of hoarding it for dynasty upgrades.

### Club State V1

- Added saveable current club state with name, short name/code, league tier and squad strength.
- Initial Northbridge data is now the starting club, not the permanent source of truth.
- Accepting an external contract offer now updates the active club state.
- Upcoming fixtures are regenerated for the new club/tier while already played fixtures/results are preserved.
- Header club chip, Club tab title, league tier, league table preview/detail, season review, dynasty history and match/post-match score headers now read from the active club state.
- Training facilities, selection comparison and match contextual ability scaling now use the active club's league tier instead of the starting league.
- Match snapshots now store club name/short name, so post-match summaries remain stable even if the player changes club later.
- Remaining limitation: this is still a tier-template fixture model, not a full persistent league/transfer ecosystem with promotion, relegation and club-specific schedules.

### Contract Progression V2

- Starting contract is now a short `Trial terms` deal, so contract progression appears early in a new career.
- Added mid-season club-led contract offers when a deal is expiring or strong performance justifies improved terms.
- Declining an offer no longer implies the same club will always return. If the contract runs out, the next offer can come from the external contract market.
- Added a first contract market club pool with same-tier/lower-status bias and limited upward reach for strong OVR, form, prestige and agent leverage.
- Accepted external offers now update the player's visible contract club and persist the offer tier for later contract cycles.
- Added a dedicated `Club offer` screen showing current terms against the proposed weekly wage, role promise, length, signing bonus and match bonuses.
- Later updated: offer cards now contain both Accept and Decline actions, while the main button treats active offers as a required decision.
- Player contract card now shows contract status such as `Review soon`, `Expiring`, `Expired` or `Offer ready`.
- Weekly economy and match payouts continue to use the active contract after accepting an offer.
- Season balance lab now mirrors contract offers, accepts meaningful upgrades and tracks `Contract offers`, so support-price tuning includes wage growth.
- Verification: `npm run build` passes, and `npm run balance:season -- --seasons=3 --career-seasons=5 --generations=1` runs successfully.
- Balance watch: contracts now make cash scale much faster in balanced/development spending scenarios, so support prices, bonus values and high-output match rates should be tuned with contract progression enabled.

### Multi-Focus Training Unlocks V1

- Training Setup breakthroughs now unlock more weekly focus capacity: one focus by default, two focus slots after the first Training breakthrough and three after the third Training breakthrough.
- Training focus selection now supports multiple active stats while keeping at least one selected focus.
- Secondary focus slots use reduced XP weights, so extra slots feel like better training capacity rather than a flat XP duplication.
- Specialist programs were later removed from the active weekly loop; extra focus capacity now comes from Training Setup.
- Support cards now show focus-slot capacity as a concrete current Training Setup bonus.
- Season balance lab now mirrors multi-focus training unlocks and weighted secondary focus XP.

### Support Clarity And Scaling V1

- Support track cards now show `Current bonuses` in compact chips, so the player can see what a track is already doing before buying again.
- Training support was strengthened: Personal Coach now gives a larger XP floor/ceiling, and training breakthroughs add more visible range improvement.
- Coach/support XP now scales with club facilities, coach level and training breakthroughs.
- Recovery support was moderately strengthened through weekly recovery, training fatigue relief and match fatigue relief, while still keeping caps so fatigue remains relevant.
- The season balance lab mirrors the same support, recovery and training-quality scaling as the playable app.
- GDD and DESIGN now state that every support track should show both `Next investment` and `Current bonuses`.

### Support Tracks And Breakthroughs V1

- Reworked the Support tab from seven separate shop cards into five broad investment tracks: Training, Recovery, Performance, Career and Lifestyle.
- Each track now shows invested levels, next named breakthrough, exact next investment effect and a single progress bar.
- Support purchases still use the existing underlying support levels, so training, recovery, match prep, contract and lifestyle effects continue to work without a save-breaking economy rewrite.
- The player-facing action is now `Invest`, making support feel like long-term setup progress rather than a crowded list of tiny upgrades.
- Breakthroughs now have V1 mechanical effects: Training improves XP range, Recovery improves fatigue/recovery, Performance improves prep/selection, Career improves contracts and Lifestyle improves pressure management.
- Support investment now writes a breakthrough event when a breakpoint is crossed.
- Season balance lab now mirrors support breakthrough effects, so future economy/progression runs include the same mechanics as the playable app.
- Recovery breakthroughs were tuned down after lab output showed they could make fatigue too easy to solve.
- Support cards now show an exact `Next investment` effect instead of vague upgrade copy.
- Removed underlying component chips from Support cards so broad tracks do not look like hidden micro-upgrade choices.
- Boots no longer provide a vague rating bonus. They now provide a concrete match-moment action attribute boost.
- Lifestyle no longer provides a vague rating bonus. It now reduces weekly pressure and remains the likely future bridge into fame/sponsor systems.
- GDD and DESIGN now define Support as broad tracks with breakthrough payoffs.

### Support Balance Lab V1

- Added dedicated support-track scenarios to `npm run balance:season`, so Training, Recovery, Performance, Career and Lifestyle can be tested as separate investment strategies.
- Lab output now reports support track levels and track breakthroughs, not just raw support item levels.
- The lab now mirrors contract cash multipliers from Career, pressure relief from Lifestyle and match-moment action boosts from Boots.
- Early read: focused tracks now produce clearly different season profiles. Training drives development but can leave fitness low, Recovery protects availability strongly, Career produces a clearer cash edge, and Lifestyle now has a real pressure/selection effect.
- Balance watch: pure Recovery can over-solve fitness in isolation, and the current hard Gen 1 potential cap can hide broader OVR differences. Long-term design should replace hard caps with soft growth pressure.

### Career Balance Curve Lab V1

- `npm run balance:season` now prints a compact per-season career curve when `--career-seasons` is greater than 1.
- The curve reports tier, OVR movement, apps/starts, goals/assists/chances, goals/90, assists/90, chances/90, end fitness, net cash, support level and growth profile marker per season.
- Added first curve target notes for Gen 1: final OVR range, early per-90 output, late-career fitness and support growth speed.
- Initial reads show the lab can now pinpoint where balance breaks: early assists/90 can spike too high, no-upgrade careers run out of fitness, recovery protects availability strongly, and balanced/development spending can land inside the intended Gen 1 final OVR range.

### Chance Created / Assist Conversion V1

- Assist actions now separate chance creation from actual assists.
- A successful assist-type action creates a chance, but the teammate still has to convert it before the player receives an assist.
- Teammate conversion uses chance quality, outcome tier and opponent keeper/defense, so a good pass against a strong defensive side can still become a missed chance.
- Match UI and post-match report now show `Chances`, making creative output visible without inflating assists.
- Season balance lab now reports chances created, chances per 90 and assist conversion, and the career curve shows goals/assists/chances as `G/A/CC`.
- Early read: assist conversion now sits closer to 20-30% in the career lab. Remaining high assists/90 spikes are more likely driven by highlight/chance volume in low-minute samples than by every good pass becoming an assist.

### Realistic Highlight Volume V1

- Player highlight count is now based on actual minutes played, role and involvement score instead of giving every selected player a fixed minimum number of moments.
- Short sub appearances can now realistically produce zero or one player moments, while longer appearances can still generate multiple actions.
- `selectPlayerHighlights` now returns no highlights when requested count is zero, fixing a lab/runtime mismatch where zero-count simulations could still receive a fallback moment.
- The season lab mirrors the same minute-based moment-count model as the playable match engine.
- Early read: assists/90, chances/90 and highlights/90 are much more realistic. OVR gain is now lower, which confirms that future progression tuning should come from training, support, facilities and XP curves rather than inflated match highlight volume.

### Progression Budget Lab V1

- Season balance lab now separates training XP from match XP.
- The lab also separates training level-ups from match level-ups, so we can see which systems are actually driving attribute growth.
- Career curve output now includes a target OVR column and a gap column for each season.
- Added a first Gen 1 target curve: season 1 around 20 OVR, season 3 around 30, season 5 around 40, season 8 around 55, season 11 around 70, season 14 around 80, then gradual decline.
- Balance warnings now flag when the career curve is more than 5 OVR ahead of or behind the current target.
- Initial read after realistic highlight volume: match output is healthier, but progression is too slow. Most five-season scenarios finish 10-16 OVR behind target, so the next tuning pass should strengthen training/support/facility progression rather than increasing match highlight volume.

### Specialist Programs And Training Quality V1

- Added five active training specialist programs: Finishing coach, Movement coach, Technical coach, Strength coach and Mental coach.
- The Training screen now lets the player choose one active specialist program before starting the weekly session.
- Historical note: specialist programs added bonus XP when selected focus matched their group; this was later removed from the active loop.
- Added weekly training quality: Poor, Solid, Sharp and Breakthrough.
- Training quality is driven by fitness, morale, pressure, facility level, nutrition, recovery and support breakthroughs.
- Training quality modifies the weekly XP range and is shown in both the Training screen and Development Summary.
- Development Summary now shows specialist bonus XP as a separate feedback card when relevant.
- Season balance lab now mirrors specialist programs and training quality, and reports specialist XP plus quality distribution.
- First read: specialist programs help progression without breaking match realism. Training-track focus improved to roughly 30 OVR after five seasons, still about 10 OVR behind the first Gen 1 target curve, so the next pass should tune facility/support scaling and recovery quality rather than increasing match highlights.

### Potential Soft-Cap Direction

- GDD and DESIGN now define potential as a soft growth curve instead of a hard attribute ceiling.
- Potential should represent natural development pressure: progress is efficient below expectation, slower near the player's natural level, and very expensive beyond it.
- Dynasty generation quality should improve starting floor and growth efficiency, not simply unlock a fixed higher max.
- Natural obstacles should create the practical ceiling: rising XP requirements, club/facility quality, support investment, age curve, league level, performance and career choices.
- Implemented first soft-cap progression pass in the playable app and season balance lab.
- Attribute XP no longer stops at the V1 potential marker. Attributes can keep growing toward 100, but XP requirements increase when a stat moves beyond its growth profile.
- Attribute rows now show a growth label: `Fast growth`, `Normal growth`, `Hard push` or `Elite push`.
- OVR detail and Home/Base copy now describe growth profile markers instead of hard potential ceilings.
- Season lab now reports `Growth profile OVR` and warns when the player exceeds the profile enough that soft-cap pressure should be visible.
- Attribute Growth Detail V1 added to Training: tapping a stat now shows current level, XP to next, growth status, base requirement, growth pressure multiplier, profile marker, selected training range, active modifiers and how to improve growth.

### Potential And Generation Model V1

- Added persistent dynasty state with generation, legacy level, legacy points and potential tier.
- Added generation profiles that raise starting attributes and attribute potential over future generations.
- New games now create attributes through the generation model instead of reading the raw base table directly.
- Home/Base originally showed generation and the active position's V1 potential OVR ceiling.
- The tappable OVR modal originally included current OVR and V1 potential ceiling context; this has now started evolving toward growth-profile/trajectory explanation.
- `npm run balance:season` now supports `--generations=N` to compare long-career outcomes across generation profiles.
- First 20-run, 15-season, 6-generation lab read: the current V1 ceiling values scale from Gen 1 47 OVR to Gen 6 92 OVR, which confirms the data can support dynasty growth.
- Balance warning: with development spending and club facilities, Gen 1 reaches its current 47 OVR cap, while Gen 6 reaches around 60 OVR against a 92 OVR ceiling. These hard caps are now considered temporary scaffolding; long-term progression should use soft growth curves, stronger late-career support, transfers, facilities, multi-focus training, age curve and retirement/legacy upgrades.

### Career-Long Support Upgrade Direction

- Expanded V1 Player Support tracks from short placeholder caps to longer career tracks.
- Support upgrade prices now scale more steeply with level so higher wages matter later in the run.
- Added helper curves for coach XP bonuses, nutrition training-fatigue relief, recovery support, boots action boosts, contract negotiation and lifestyle pressure relief.
- Recovery and nutrition now use capped/diminishing effects so they help availability without removing fatigue as a tradeoff.
- GDD now defines in-run upgrade families for 15-20 season careers: Core Support, Performance Gear, Private Training, Career Infrastructure and Repeatable Cash Sinks.

### Season Balance Lab - Upgrade Scenarios

- `npm run balance:season` now compares four spending scenarios:
  - No upgrades
  - Balanced spending
  - Development spending
  - Recovery spending
- Added weekly wage, appearance bonus, goal bonus and assist bonus to the lab economy.
- Added support-purchase simulation with cash reserves, spending priorities and long-run support levels.
- Added optional long-horizon projection: `npm run balance:season -- --seasons=60 --career-seasons=15`.
- Added warnings for low OVR gain, trust capping, low end fitness, slow support spending and extreme goals/assists per 90.
- First read: support spending increases minutes and starts, but OVR gain is still far too low across both one-season and 15-season horizons.
- First long-horizon read: 15 seasons only produces about +14 OVR, while assists/90 are too high, so the next tuning pass should focus on XP curve/output, trust soft caps and assist/chance weighting.

### Progression Balance V1

- Reworked attribute XP requirements so low attributes improve faster and high attributes become progressively more expensive.
- Raised baseline training range from `5-40 XP` to `12-55 XP`.
- Increased Personal Coach impact on training XP floor/ceiling.
- Personal Coach now adds support XP to the weakest key attribute beside the chosen training focus.
- Nutrition and Recovery support now provide a small weekly support recovery bonus after matches.
- Season lab trust warning now reads as a same-club limitation because transfer trust reset is not modeled yet.
- Current read: one-season no-upgrade progression is now around +3 OVR, while support spending improves minutes, starts, level-ups and first-season OVR slightly.
- Current long-horizon read: spending scenarios reach around +29 OVR over 15 seasons, still below the intended full-career curve. This points to future club tier facilities, better contracts, multi-focus unlocks and dynasty upgrades as required progression layers.

### Club Development Environment V1

- Added a development environment model derived from league tier facility level.
- Facilities now affect training XP multiplier, XP floor, recovery support and support-upgrade efficiency.
- Training screen now shows facility level and XP multiplier so the modifier is visible to the player.
- Matchweek recovery now receives a small facility/support adjusted recovery bonus.
- Season lab now simulates a tier path across long career projections:
  - seasons 1-3 Grassroots
  - seasons 4-6 Semi-Pro
  - seasons 7-9 Regional Pro
  - seasons 10-12 National Pro
  - seasons 13-15 Top Flight
- Season lab currently reports Potential OVR and warns when the player has reached the temporary V1 position cap.
- Current long-horizon read: support plus facilities can reach the current first-generation cap around 47 OVR. This now supports replacing hard caps with soft growth pressure from XP scaling, dynasty/generation quality, facilities, special development and age curve.

### Position-Based OVR Explanation

- OVR now uses only the active position's weighted attributes instead of giving every unweighted stat a hidden default contribution.
- Player screen OVR is now tappable and opens an explanation modal.
- The OVR modal explains that the number is role/position-based current ability and lists the weighted attributes with their current values and weight share.
- GDD and DESIGN now define OVR as active-position ability, not a full-profile average.

### Season Balance Lab V1

- Added `npm run balance:season`.
- The season lab simulates complete 12-match seasons instead of isolated fixture reruns.
- Each simulated week now includes training, fitness cost, attribute XP, role selection, match minutes, player highlights, chained follow-ups, match XP, trust, rating and fitness changes.
- The report outputs apps, starts, minutes, goals, assists, goals/90, assists/90, highlights/90, average rating, OVR gain, level-ups, end trust, end fitness and role distribution.
- First 300-season read: 9.44 apps, 264 minutes, 1.28 goals, 2.01 assists, 6.88 average rating, 1.04 OVR gain and 1.85 level-ups on average.
- Balance warning from the season lab: end trust reaches 100 too consistently, while end fitness trends low. This should guide the next tuning pass.

## 2026-06-17

### Chained Match Moments V1

- Added first support for chained player highlights.
- Successful actions can now open one immediate follow-up decision in the same attacking move.
- V1 follow-ups cover shooting lanes, byline/angle decisions, press turnovers and hold-up/link-up continuations.
- Follow-ups are capped at one extra step for now, keeping most highlights quick.
- Added UI copy for follow-up moments and a result note when an action keeps the move alive.
- Added several new Forward moments: shoulder drop, near-post run, rebound read and channel chase.
- Auto-simmed highlights can also resolve one follow-up action.
- Updated match balance run after the expanded moment pool.

### League Context / Ability Scale V1

- Added the first explicit global ability scale direction to `GDD.md`.
- Added `LeagueTier` data with Grassroots, semi-pro, pro, top-flight and elite tiers.
- Rebalanced the first playable environment to `Grassroots Development League` with average OVR 15 and team range 10-22.
- Rebalanced Jonas Vale's starting attributes from mid-level 40-60 values down to a first-generation grassroots prospect around 10-20 OVR.
- Lowered the first contract to grassroots-level wage and bonuses.
- Match engine now keeps raw OVR for UI/dynasty progression but converts player attributes and opponent profiles into league-adjusted match ability for highlight generation/resolution.
- Team score simulation still uses raw club/opponent strength, so match results reflect the actual league tier.
- Selection score now includes a visible `Level fit` factor comparing player OVR against the current league average.
- Save version bumped to reset old high-OVR local saves into the new scale.
- Match balance lab now runs against the new grassroots scale and relative ability model.

### Season Review V1

- Added an explicit end-of-season checkpoint after the final fixture.
- The core loop now stops at `Season Review` instead of drifting into empty weeks or another training prompt.
- Season Review shows Northbridge record, league position, goal difference, form, player appearances, starts, goals, assists and average rating.
- Added a manager verdict, market interest, contract outlook and season rewards.
- Season rewards are claimed when starting the next season, not when merely opening the review screen.
- Starting the next season resets the season fixture/results snapshot and season stats while preserving player attributes, role momentum, cash, prestige and career state.
- Player and Club screens now handle season-complete state without presenting a fake next fixture.

### Dynasty History V1

- Added persistent `dynastyHistory` to the career state.
- Completed seasons are archived when the player starts the next season from Season Review.
- Home now has `Base` and `Dynasty` subtabs.
- Dynasty tab shows completed season history plus the current season in progress.
- Season rows track club, league finish, record, apps, goals, assists and average rating.
- Dynasty tab also shows career totals across completed and current seasons.

### Economy Direction

- Cemented the three-currency model in `GDD.md`.
- `Cash` is spendable during the active run and should primarily buy in-run upgrades.
- `Prestige` is career standing/status, not a spendable wallet.
- `Legacy Points` are the spendable dynasty currency, primarily awarded at retirement from career achievements and final prestige.
- Core economy rule: cash should not directly buy permanent dynasty power, so spending during the active career remains meaningful.

### Contract V1

- Added a persistent active contract to career state.
- Contracts include club, label, weekly wage, weeks remaining, role promise, appearance bonus, goal bonus, assist bonus and pressure modifier.
- Weekly wage is now paid after each matchweek.
- Match cash now comes from contract wage and bonuses instead of a hardcoded generic match reward.
- Post-match summary shows contract payout breakdown.
- Player screen contract card now reads from actual contract data.
- Season Review now generates a renewal package with wage, role promise, signing bonus and performance bonuses.
- Starting the next season applies the generated contract package.
- Contract role promise now contributes to selection score as a visible factor.

### End Week Summary V1

- Added a dedicated End Week Summary screen after Post Match Summary.
- Main button flow is now `Post Match -> Week Summary -> Next Week/Season Review`.
- Week Summary shows cash flow, wage/bonus breakdown, development XP, level-ups, match rating, selection movement, trust, prestige, condition and season status.
- Post Match Summary is now reserved for match-specific feedback: score, rating, performance read, career impact and match development XP.
- GDD now defines End Week Summary as the weekly payoff screen that summarizes important changes without replacing detailed training/match reports.

### In-Run Economy V1

- Added `supportUpgrades` to persistent career state.
- Home now has a `Support` subtab for current-run cash upgrades.
- Added first support upgrade catalog: Match boots, Recovery kit, Personal coach, Nutrition plan, Video analyst, Better agent and Lifestyle support.
- Cash purchases now reduce current cash and increase owned support levels.
- Personal coach raises training XP floor/ceiling slightly.
- Nutrition plan reduces training fatigue.
- Recovery kit reduces match fatigue.
- Match boots add concrete action attribute support for relevant match moments.
- Lifestyle support reduces weekly pressure and can later feed fame/sponsor systems.
- Video analyst adds a small visible selection-score factor.
- Better agent improves contract wage and signing bonus negotiation.
- GDD now defines Player Support as current-run only and separate from dynasty power.
- GDD now also defines long-term in-run economy scaling: tiered upgrade tracks, rising costs, soft caps, club-tier access, repeatable cash sinks and retainers/upkeep so cash remains useful across 10-15 seasons.

## 2026-06-16

### Match Engine V2 Direction

- Created `MATCH_ENGINE.md` as the source of truth for match engine design.
- Match engine is now the highest-priority gameplay system because it binds attributes, opponents, training, role progression and career feedback together.
- V2 direction is setup/generation/resolution separation, opponent profiles, striker highlight taxonomy, chance quality, outcome bands, explanation tags and batch simulation for balance.
- Added position architecture for Forward, Winger, Midfielder, Fullback and Centerback. Goalkeeper is intentionally out of scope for now.
- Implemented first code-level position module architecture. Player identity, OVR weighting, key attributes, training key markers, tactical focus and manager instructions now read from position modules. Current active module is Forward.
- Implemented Match Engine V2 foundation module in `src/matchEngine.ts` with opponent profiles, Forward highlight taxonomy, profile-based highlight weighting, chance quality and explanation tags.
- Pre-match opponent context now exposes defensive line and pressing style from the opponent profile.
- Match result UI now shows chance quality and readable explanation reasons. Post-match summary includes a Performance Read card based on aggregated explanation tags.

### Match Flow - Dynamic Substitution Timing

- Impact Sub entry is no longer a fixed/scripted minute.
- Substitution timing now uses role, deterministic match variance, simulated score state around minute 60, and a rare early-event modifier.
- Impact Subs still usually enter around 60-70, but can enter earlier if Northbridge needs a goal or if an early match event creates an opening.
- Late entries remain possible when the match state is stable or the role is closer to bench depth.
- Player highlights are now scheduled inside the actual appearance window, so player actions cannot happen before the player enters the match.
- Match Day now opens a pre-match screen before the live match starts, showing opponent context, player role, expected minutes, entry plan, selection score, and the manager brief.
- Post-match summary now uses the same centered club-score-club presentation as the live match header.
- Match generation now creates a unique seed per match instance, so replaying the same fixture from the same career state can produce different sim events, player highlights, minutes, scorelines, and action outcomes.

## 2026-06-15

### Training V3 - Mandatory Weekly Session

- Training er nu en obligatorisk del af hver uge.
- Den centrale knap hedder `Training`, indtil ugens traening er gennemfoert.
- Core loop er nu fastlagt som `Training -> Match -> Training -> Match`.
- En matchweek er den mindste praktiske tidsenhed, saa saesoner kan holdes korte og prestige-progression kan fylde mere.
- Training screen lader spilleren vaelge en direkte attribute som fokus.
- Foerste version understoetter en stat ad gangen, saa systemet er let at udvide til flere fokusvalg senere.
- Intensity er separat fra fokus og paavirker XP-range, fitness, morale og trust.
- Balanced early-game training viser et tydeligt `5-40 XP` range.
- Training completion giver en after-training recap med:
  - focus
  - intensity
  - expected XP range
  - actual XP
  - fitness/trust impact
  - attribute level-ups
- Training afslutter ikke laengere ugen automatisk. Efter recap gaar spilleren videre til Match Day, hvis der er en uspillede fixture.
- Player dashboard viser om ugens traening mangler, er gennemfoert, eller om Match Day er klar.

### Established Direction

- Spillet er et incremental football career sim, hvor spilleren styrer én fodboldspiller frem for en klub.
- Første fokus er en angriberkarriere.
- Kampene skal starte som choice-based moments.
- Spillet skal være en blanding af realisme og incremental progression.
- Fundamentet skal bygges generisk, så andre positioner kan tilføjes senere.

### Core Decisions

- Weekly loop er den foreløbige primære tidsenhed.
- Angriber er første vertical slice.
- Målmand kan vente.
- Match rating er central feedback og påvirker XP, manager trust, form, morale og karrieremuligheder.
- Manager trust er en vigtig early-game progression wall.
- Legacy/facilities skal tænkes ind tidligt, selv hvis de implementeres senere.

### Created Documents

- `GDD.md`: samlet game design document.
- `NEXT_STEPS.md`: prioriterede næste design- og scope-opgaver.
- `PROGRESS.md`: løbende beslutnings- og fremdriftslog.
- `DESIGN.md`: mobile-first visuel retning og UI-fundament.

### Visual Direction Decisions

- UI'et skal være mobile-first.
- Player screen skal være hovedskærmen/home screen.
- Visuel retning: dark premium sports-dashboard med kompakte cards.
- Primær accent: lime/grøn til progression og aktive states.
- Sekundær accent: gul/guld til ratings, prestige og vigtige career moments.
- Første Player screen skal vise klub, position, rolle, OVR, stats, form, fitness, manager trust, relationer, kontrakt og næste handling.
- Match moments skal bruge choice-based UI med korte valg og tydelige risk/reward hints.
- Første prototype bruger en kompakt stiliseret avatar, ikke et stort realistisk portræt.
- Match choices viser stats/risk/reward, ikke eksakte procenter.
- Bottom nav skal have fire mindre knapper og en større central advance-time-knap.
- Player screen bør være én main scroll med kritisk info først og expandable secondary sections længere nede.

### Open Questions

- Hvor meget information skal spilleren se om sandsynligheder i match moments?
- Hvor mange ugentlige valg er nok uden at loopet bliver tungt?
- Hvordan balancerer vi mål/assists mod godt angriberspil uden direkte output?
- Hvor stor skal forskellen være mellem striker archetypes?
- Hvor hurtigt skal en spiller kunne gå fra lav tier til topniveau?
- Hvor meget avatar-customization skal være med i første prototype?
- Skal nav-destinationerne være Player, Training, Club, Home, eller skal Career erstatte en af dem?
- Skal Home være house/facilities/legacy-skærm eller bredere career hub?

## 2026-06-15 - First UI Prototype

### Implemented

- Oprettet React + Vite + TypeScript app.
- Bygget første mobile-first Player dashboard.
- Tilføjet kompakt stiliseret avatar.
- Tilføjet OVR/career status card.
- Tilføjet readiness strip med Fitness, Form, Morale og Pressure.
- Tilføjet Next Action/Match Day card.
- Tilføjet key attributes, season snapshot, relationships, contract/market og equipment/facilities cards.
- Tilføjet bottom nav med Player, Training, Club og Home.
- Tilføjet stor central advance-time knap.
- Tilføjet simple placeholder-skærme for Training, Club og Home.

### Verification

- `npm install` completed with 0 vulnerabilities.
- `npm run build` passes.
- Browsercheck på 390px mobilbredde viser Player screen korrekt.
- Testet nav-skift til Training, Club og Home.
- Testet central advance-time knap: uge og manager trust opdateres.

### Notes

- Dev-server brugte `http://127.0.0.1:5177/`, fordi lavere Vite-porte allerede var optaget.
- Home er nu defineret som private base/facilities/legacy-skærm.
- Player er default/main dashboard.

## 2026-06-15 - First Playable State

### Implemented

- Udskiftet store dele af dummy Player UI med en samlet `GameState`.
- OVR beregnes nu ud fra striker attributes.
- Attributes har nu XP progress og kan stige ved træning/kamp.
- Training screen har nu reelle valg for fokus og intensity.
- `Next Week` anvender træningsvalg til XP, fitness og manager trust.
- `Match Day` åbner nu første choice-based match moment.
- Match choice viser stats/risk/reward uden eksakte procenter.
- Match result påvirker rating, goals/assists, fitness, manager trust, morale, prestige, cash og attribute XP.
- Season snapshot og ratings opdateres efter kamp.
- Relationships og market value bruger nu dele af state i stedet for kun hardcoded tekst.

### Current Playable Loop

1. Vælg træningsfokus og intensity på Training.
2. Tryk `Next Week` for at anvende træning.
3. På Match Day tryk central-knappen for at åbne et match moment.
4. Vælg handling i momentet.
5. Afslut kampen og se Player dashboard ændre sig.

### Known Limitations

- Kun ét match moment findes endnu.
- Match resolution er deterministisk og meget simpel.
- Der er ingen persistent save/load endnu.
- Club/Home er stadig primært placeholder med lidt state.
- Training har kun ét fokus-slot.

## 2026-06-15 - Match Moment Generator

### Implemented

- Tilføjet en lille pool af striker moments:
  - through on goal
  - cutback
  - pressing trigger
  - aerial duel
  - hold-up play
  - late box scramble
- `Match Day` vælger nu et moment fra poolen baseret på state.
- Match choices har nu outcome-type: goal, assist eller trust.
- Match resolution er nu generisk på tværs af moments og bruger:
  - relevante attributes
  - fitness
  - risk
  - manager preference
- Rettet match result rating tile, så rating ikke længere vises som sort/svært læselig tekst.

### Still To Improve

- Moment-generatoren bør senere vælge ud fra position, role, tactical fit, form og scoreline.
- Resolution bør senere have kontrolleret randomness eller seedet variance.

## 2026-06-15 - Multi-Moment Match Day

### Implemented

- Match Day kører nu 2-4 personal moments i samme kamp.
- Match state holder nu:
  - moment list
  - current moment index
  - current result
  - accumulated results
- Match screen viser progress som `Moment X/Y`.
- Spilleren fortsætter mellem moments med `Continue`.
- Kampen afsluttes med `Finish Match` i main progress-knappen, når live-kampen rammer full time.
- Kampens samlede resultater aggregeres først til karrieren efter kampen:
  - rating
  - goals
  - assists
  - trust
  - fitness
  - XP
  - cash/prestige
  - season stats

### Still To Improve

- Moment-generatoren bør senere vælge ud fra position, role, tactical fit, form og scoreline.
- Resolution bør senere have kontrolleret randomness eller seedet variance.
- Scoreline bør opdateres live efter goals/assists i kampen.

## 2026-06-15 - Timeline Match Engine

### Implemented

- Match Day bruger nu en timeline engine i stedet for kun player moments.
- Kampe kan indeholde events uden spillerinvolvering:
  - team chance
  - opponent chance
  - team goal
  - opponent goal
  - quiet tempo spell
  - tactical/substitution event
- Player moments blandes ind i samme timeline.
- En kamp kan nu starte med et event som `Quiet spell`, hvor spilleren ikke får et valg.
- Scoreline beregnes løbende ud fra sim-events og player goals.
- Sim-events kan påvirke rating, trust og fitness marginalt.
- Match summary inkluderer nu både team/opponent goals og spillerens egne outputs.

### Design Impact

- Det er nu muligt at have en kamp, hvor holdet vinder eller taber uden at spilleren er direkte involveret.
- Spilleren er en del af kampen, ikke hele kampen.
- Involvement count påvirkes foreløbigt af trust, fitness, form og OVR.
- Fundamentet er bedre rustet til senere sæsoner, fordi kampflowet ikke altid er identisk.

### Still To Improve

- Sim-events bør senere være drevet af team strength, opponent strength og tactical style.
- Scoreline bør påvirke hvilke senere events der genereres.
- Substitution/minutes system mangler stadig.
- Player rating bør senere inkludere off-ball/discipline baseline for kampe med få involvements.

## 2026-06-15 - Live Match Flow

### Implemented

- Kampen forløber nu live med et `liveMinute` clock.
- Minutterne tikker automatisk frem under Match Day.
- Ikke-player events bliver processed naturligt uden manuelt `Continue`.
- Timeline-log viser de seneste kampbegivenheder.
- Når uret rammer et player moment, pauser kampen og viser choices.
- Efter et player choice vises result-card, og knappen hedder nu `Resume Match`.
- Når spilleren resumer, fortsætter live clocket fra samme kamp.
- Det er verificeret, at:
  - kampen kan starte med live mode uden valg
  - Northbridge kan score uden spillerinvolvering
  - kampen pauser ved `Your moment`
  - player choice kan resumes tilbage til live match

### Still To Improve

- Full-time flow bør have en dedikeret match summary screen.
- Timeline-log bør kunne vise flere ikon-typer og score updates tydeligere.

## 2026-06-15 - Match Speed and Skip Highlight

### Implemented

- Live match clock kører nu cirka x2 hurtigere.
- Tilføjet `Skip Highlight` i live match mode.
- `Skip Highlight` springer almindelige sim-events over og stopper ved næste player moment.
- Hvis der ikke er flere player moments, springer kampen til full time.

### Still To Improve

- Persist match speed preference.

## 2026-06-15 - Match Controls

### Implemented

- Tilføjet match speed selector: `1x`, `2x`, `4x`.
- `2x` er default.
- Tilføjet tre skip modes:
  - `Next Event`
  - `Highlight`
  - `Full Time`
- `Next Event` hopper til næste timeline event.
- `Highlight` hopper til næste player moment.
- `Full Time` hopper til kampens afslutning.
- Controls vises kun i live mode, ikke når kampen er pauset ved player moment.

### Still To Improve

- Match speed bør gemmes som preference.
- Full Time bør åbne en dedikeret summary screen i stedet for samme live card.

## 2026-06-15 - Sim Full Time Resolves Player Highlights

### Implemented

- `Full Time` er omdøbt til `Sim Full Time`.
- Når spilleren simulerer resten af kampen, bliver resterende player moments nu auto-resolved.
- Auto-sim bruger samme `createMatchResult` resolution som manuelle valg.
- AI-valg prioriterer:
  - stærke relevante attributes
  - lavere risk ved lav fitness
  - manager-friendly choices ved lav trust
  - goal/assist upside når det giver mening
- Simulerede player moments kan nu stadig give:
  - goals
  - assists
  - rating
  - trust
  - fitness cost
  - attribute XP

### Design Impact

- `Sim Full Time` betyder nu "lad spillet spille mine resterende highlights" frem for "drop mine resterende highlights".
- Spilleren mister agency, men mister ikke progression og career impact.

## 2026-06-15 - Match Context Layer

### Implemented

- Tilfojet en upcoming match-model med modstander, venue, turnering, kickoff, holdstyrke, modstanderform og kampvigtighed.
- Match Day oprettes nu fra upcoming match context i stedet for hardcoded kampdata.
- Kampen viser nu venue, opponent, competition, spillerrolle, forventede minutter, manager instruction og tactical focus.
- Club screen viser nu en egentlig match preview med rolle, forventede minutter, tactical focus, opponent form, service level og manager instruction.
- Next Action card paa Player screen bruger nu samme upcoming match context som match engine.
- Sim-events bruger nu modstanderens styrke, form og kampkontekst i tekst og simple outcome-bias.

### Design Impact

- Kampen foeles mere som en del af karrieren og mindre som et isoleret minispil.
- Samme match engine kan senere fodres med fixtures fra en saesonplan.
- Rolle og forventede minutter er nu synlige foer kamp, hvilket baner vej for en rigtig spilletidsmodel.

### Still To Improve

- Upcoming match er stadig genereret fra simpel state, ikke en rigtig fixture list.
- Rolle/expected minutes paavirker endnu ikke live clock, substitution eller player event-vinduer dybt nok.
- Vi mangler en dedicated full-time summary, hvor match context og career impact samles tydeligt.

## 2026-06-15 - Role Minutes and Post-Match Progression

### Implemented

- Tilfojet `lastMatch` summary state, saa kampens progression kan vises efter final whistle og paa Player screen.
- Tilfojet dedikeret post-match summary screen med:
  - scoreline
  - match rating
  - goals/assists
  - manager trust delta
  - fitness cost
  - cash/prestige gain
  - attribute XP
  - manual vs auto-sim highlights
  - role progression impact
- Rolle paavirker nu player highlight-vinduer:
  - Bench: meget sene eller ingen highlights
  - Impact Sub: sene highlights
  - Rotation Starter: mid-game highlights
  - Starter: bredt highlight-vindue og mulighed for flere moments
- Season starts stiger nu kun ved starter-roller.
- Player screen viser nu et kompakt Last Match card efter en kamp.

### Design Impact

- Kampen har nu en tydelig progression-payoff i stedet for kun at returnere til dashboardet.
- Spillet har en mere synlig kaede: role -> minutes -> highlights -> performance -> XP/trust -> next role.
- Dette er foerste skridt mod en reel playable development loop.

## 2026-06-15 - Season Fixture Loop V1

### Implemented

- Tilfojet en fast 12-kamps mini-season fixture list.
- Upcoming match hentes nu fra season fixtureIndex i stedet for en lokal match-generator.
- Tilfojet season state med:
  - current fixture index
  - fixture list
  - completed results
  - W-D-L record
  - goals for/against
  - points
  - recent form
- Efter en kamp gemmes fixture result i season state, og naeste fixture bliver aktiv.
- Player screen viser nu Season Context med Match X/12, record, form og next opponent.
- Club screen viser nu Season Record med played, goals og points.
- Post-match summary og Last Match card viser nu matchnummer i saesonen.

### Design Impact

- Kampene foeles nu som del af en saeson frem for isolerede events.
- Spilleren kan se, at holdets resultater bevæger sig over tid.
- Dette laegger fundamentet for league table, selection pressure, cup progression og end-of-season rewards.

## 2026-06-15 - Selection Logic V2

### Implemented

- Tilfojet selection score 0-100 som afgorer match role:
  - 0-29 Bench
  - 30-54 Impact Sub
  - 55-67 Rotation Starter
  - 68+ Starter
- Selection score beregnes nu fra:
  - manager trust
  - fitness
  - form
  - last rating
  - fixture importance/opponent strength
- Player screen viser nu Selection Briefing med score, role, next role target og faktor-breakdown.
- Club screen viser samme selection logic i kompakt form.
- Post-match summary viser selection score foer/efter kampen og points needed til naeste rolle.
- Career impact forklarer nu role progression ud fra selection score, ikke kun trust.

### Design Impact

- Rollen foeles mindre magisk og mere som en incremental ladder.
- Spilleren kan se, hvad der skal grindes for at faa flere minutter.
- Dette goer training, fitness og match rating vigtigere uden at tilfoje mere match-complexity.

## 2026-06-15 - Club Fixtures and League Table

### Implemented

- Club screen har nu klikbare preview cards for:
  - kommende 5 fixtures
  - league table preview
- Tilfojet fuld Fixtures view med alle 12 season fixtures, completed results og current next match.
- Tilfojet fuld League Table view med position, played, goal difference og points.
- Northbridge bruger rigtige season results i tabellen.
- Andre teams bruger en simpel stabil strength-baseret table simulation, indtil vi bygger fuld league simulation.

### Design Impact

- Club foeles mere som et football manager-hub.
- Spilleren kan nu se kontekst omkring naeste kampe og saesonens status uden at forlade mobile-first UI.
- Dette forbereder end-of-season review, league targets og fixture pressure.

## 2026-06-15 - Clean Season Start

### Implemented

- Prototype starter nu fra Week 1 og Match 1/12 i stedet for mid-season.
- Season results starter tomme.
- Player season stats starter paa 0 apps, 0 starts, 0 goals, 0 assists og ingen ratings.
- Fixture list hoejreside er gjort tydeligere:
  - completed fixtures viser `Result`
  - current fixture viser `Status Next`
  - upcoming fixtures viser `Form Poor/Mixed/Good/Hot`

### Design Impact

- Career loop starter renere og mere naturligt.
- Fixture-listen forklarer nu hvad tallene/labels betyder uden ekstra tekstblokke.

## 2026-06-15 - Training Week V2

### Implemented

- Training screen har nu tre ugentlige slots:
  - Technical
  - Physical
  - Mental / recovery
- Hvert slot har flere valg med egne XP, fitness, morale, trust og risk tradeoffs.
- Intensity paavirker nu samlet XP/fatigue/trust for hele planen.
- Training week genererer en dedikeret Development Summary screen.
- Summary viser:
  - completed plan
  - attribute XP breakdown
  - fitness/trust impact
  - selection score before/after
  - attribute level-ups
- Attribute XP systemet registrerer nu level-ups eksplicit.

### Design Impact

- Training er nu et rigtigt gameplay-loop i stedet for et enkelt focus toggle.
- Attributes bliver tydeligere som motoren bag progression.
- Spilleren kan nu planlaegge mellem XP gain og match readiness.

## 2026-06-15 - Attribute Card V2

### Implemented

- Player screen viser nu kun striker essential attributes som default:
  - Finishing
  - Off Ball
  - Composure
  - First Touch
  - Acceleration
- Attribute card kan foldes ud til full profile med alle 8 striker stats.
- Attribute progress viser nu kun én grøn XP bar mod næste level.
- Fjernet den gule potential/secondary bar fra attribute-listen.
- Hver stat viser tydeligt XP remaining til næste attribute point.
- Recent training XP vises stadig som små chips på relevante stats.

### Design Impact

- Player dashboard er lettere at scanne.
- Attribute progression er mere tydelig og mindre visuelt støjende.
- Full stat depth er stadig tilgængelig uden at fylde default view.

## 2026-06-15 - Training XP Chips

### Implemented

- Attribute card bruger nu hele ugens projected training XP i stedet for én single `selectedFocus`.
- Alle attributes der trænes i planen viser `+X planned`.
- Den/de største XP targets viser `main`.
- Gamle `focus` chip er fjernet fra attribute card, fordi den var misvisende ved multi-stat training.

### Design Impact

- Spilleren kan nu se alle stats der bliver forbedret af en training plan.
- Multi-stat drills som Finishing reps viser korrekt både Finishing og Composure.

## 2026-06-17 - Match Highlight Feedback

### Implemented

- Player highlights viser nu en tydelig result popup efter valg.
- Popup'en markerer valget som `Successful` eller `Unsuccessful` med tydelig success/failure styling.
- Sidste player highlight afslutter ikke længere kampen tidligt.
- Hvis der ikke er flere highlights, fortsætter live-kampen normalt mod 90 minutter.

### Design Impact

- Valg i kamp giver en mere umiddelbar YES/OEV feedback.
- Match flow føles mindre scriptet, fordi highlights ikke længere fungerer som skjulte slutpunkter.

## 2026-06-17 - Sim Scoreline Balance

### Implemented

- Sim-events bruger nu en seeded RNG-sekvens i stedet for enkeltstående sequential seed lookups.
- Team chances og opponent chances kan nu også konverteres til mål, ikke kun eksplicitte goal templates.
- Goal conversion tager højde for team strength, opponent attack, opponent defense/keeper, trust, form og venue.
- Kampen genererer nu 6-8 naturlige sim-events i stedet for 4-6.

### Design Impact

- 0-0 er stadig muligt, men bør ikke længere dominere korte test-runs.
- Scorelines bør føles mere varierede uden at alle kampe bliver målfester.

## 2026-06-17 - Match Balance Lab

### Implemented

- Tilføjet `npm run balance:match`.
- Scriptet simulerer 500 kampe per scenario som default.
- Balance lab rapporterer:
  - scoreline distribution
  - average goals
  - 0-0 rate
  - player highlights per match
  - player choice success rate
  - player goals/assists per match
  - average rating
  - role split
  - simple balance warnings
- Første scenarios:
  - Baseline prospect
  - Improved finisher
  - Low fitness
  - High trust

### Initial Read

- Baseline ligger omkring 1.6 mål/kamp og 18% 0-0 i labbet.
- Improved finisher og high trust giver flere highlights og flere team goals.
- Auto/player choice success ligger højt, så næste tuning-pass bør gøre valg mindre automatiske.

## 2026-06-17 - Player Outcome Tiers

### Implemented

- Player highlight results er nu opdelt i fire tiers:
  - Poor
  - Okay
  - Good
  - Great
- `success` betyder nu acceptabel eller bedre aktion, ikke automatisk mål/assist.
- Goal/assist kræver et decisive outcome baseret på tier og chance quality.
- Result popup viser tier direkte i stedet for kun `Successful` / `Unsuccessful`.
- Okay har neutral styling, Poor har failure styling, Good/Great har success styling.
- Match balance lab rapporterer nu outcome tier distribution.

### Initial Read

- Baseline prospect lander primært i Good/Okay med færre Great moments.
- Improved finisher skaber tydeligt flere Great outcomes og flere mål.
- Low fitness reducerer Great outcomes uden at gøre spilleren konstant dårlig.
- Næste tuning-kandidat er at gøre role/choice mix mere varieret, så high trust ikke kun bliver sikre trust-actions.

## 2026-06-17 - Role-Aware Highlight Mix

### Implemented

- Player highlight selection bruger nu vægtet draft i stedet for bare top-sortering.
- Hver valgt highlight fjernes fra puljen, så flere moments i samme kamp bliver mere varierede.
- Highlight-vægt tager nu højde for:
  - player role
  - score state around the target minute
  - late match context
  - service level
  - player attribute fit
  - opponent profile counters
- Impact Sub favoriserer flere direct/late attacking moments.
- Rotation Starter og Starter får mere plads til link-up og bredere striker work.
- Auto-sim choice selection vægter goal/assist ambition højere og har seeded choice variance.
- Tilføjet en ny `third-man-run` / `link_up` highlight med assist-path.
- Assist outcomes er lidt mere opnåelige end goals, hvis aktionen er Good og chance quality ikke er Difficult.

### Initial Read

- Baseline prospect: cirka 1 highlight/kamp, 0.11 assists/kamp, næsten ingen mål.
- Improved finisher: cirka 0.76 mål/kamp og 0.35 assists/kamp i labbet.
- High trust / Rotation Starter: cirka 3 highlights/kamp og 0.45 assists/kamp.
- 0-0 ligger stadig omkring 14-20% afhængigt af scenario.
- Baseline average goals er stadig lidt lav og bør være et senere scoreline tuning punkt.

## 2026-06-17 - FM-Style Result Layer

### Implemented

- Match engine har nu et underliggende team result layer før highlight generation.
- Kampen beregner non-player:
  - Northbridge xG
  - opponent xG
  - Northbridge goals
  - opponent goals
  - attack/chance volume
- xG tager højde for:
  - team strength
  - opponent attack/midfield
  - opponent defense/keeper
  - service level
  - form
  - trust
  - venue
- Sim timeline-events repræsenterer nu det allerede simulerede kampmiljø, i stedet for at være den eneste mål-generator.
- Player goals/assists lægges stadig ovenpå, så spilleren kan påvirke kampen uden at hele verden afhænger af spilleren.
- Balance lab viser nu average xG for begge hold.

### Initial Read

- Baseline prospect: cirka 2.75 mål/kamp, 6% 0-0.
- Low fitness: cirka 2.80 mål/kamp, 7% 0-0.
- High trust / Rotation Starter: cirka 2.71 mål/kamp, 6% 0-0.
- Improved finisher: cirka 3.56 mål/kamp, fordi player contribution løfter scoreline markant.
- Baseline/high trust ligger nu tættere på et FM-agtigt miljø omkring spilleren.

## 2026-06-17 - Match Engine Foundation Pass

### Implemented

- Flyttet det rene result layer ud af `App.tsx` til `src/engine/matchEngineCore.js`.
- Tilføjet TypeScript declarations i `src/engine/matchEngineCore.d.ts`.
- Appen og `npm run balance:match` bruger nu samme runtime-kode til:
  - team xG model
  - non-player scoreline
  - sim timeline-events
  - seeded RNG helpers
  - score-at-minute lookup
- Balance lab spejler ikke længere result-layer logikken manuelt.

### Design Impact

- Match engine har nu en tydeligere API boundary uden at ændre UI-flowet.
- Ligaer/divisioner kan senere kobles på via model input som team strength, service level, opponent profile og venue.
- Næste naturlige engine-refactor er at flytte player highlight generation/resolution ud i samme engine namespace.

## 2026-06-17 - Player Highlight Engine Boundary

### Implemented

- Flyttet player-side engine logic ind i `src/engine/matchEngineCore.js`.
- Appen og balance lab bruger nu samme runtime-kode til:
  - weighted player highlight selection
  - role-aware highlight mix
  - score-state aware highlight weighting
  - auto-sim choice selection
  - player choice resolution
  - outcome tiers
  - chance quality
  - decisive goal/assist outcomes
- `App.tsx` beholder nu primært UI-tekst, XP mapping og state orchestration for match results.
- Balance lab spejler ikke længere player highlight generation/resolution manuelt.

### Design Impact

- Match engine er tættere på et rigtigt modul, som senere kan bruges af ligaer, divisioner og season simulation.
- Player contribution kan balanceres ét sted i stedet for at divergere mellem spillet og labbet.
- Næste naturlige foundation-step er at flytte match data definitions / moment library ud af `App.tsx`.

## 2026-06-17 - Shared Forward Moment Library

### Implemented

- Flyttet forward highlight kataloget ud af `App.tsx` til `src/engine/forwardMoments.js`.
- Tilføjet TypeScript declarations i `src/engine/forwardMoments.d.ts`.
- Appen og `npm run balance:match` bruger nu samme moment library til player highlights.
- Balance lab bruger nu den fulde striker/forward moment pool i stedet for en separat mini-testliste.

### Current Lab Read

- Baseline prospect: cirka 2.55 mål/kamp, 6% 0-0, 1 player highlight/kamp.
- Improved finisher: cirka 3.02 mål/kamp, 5% 0-0, 2 player highlights/kamp.
- High trust / Rotation Starter: cirka 2.89 mål/kamp, 6% 0-0, 3 player highlights/kamp.
- Great outcomes er stadig sjældne i nogle scenarios og bør tunes forsigtigt, så vi ikke gør early-career spilleren for stærk.

### Design Impact

- Match balancing tester nu den samme highlight variation som spilleren møder i UI.
- Næste naturlige step er at begynde at udvide samme struktur med rolle-/positionsspecifikke moment libraries uden målmand.
## 2026-06-17 - Local Save/Load V1

### Implemented

- Tilføjet versioneret localStorage save under `football-dynasty-save`.
- Appen loader automatisk gemt career state ved start.
- Career state gemmes automatisk, når spilleren ikke er midt i en aktiv live-kamp.
- Aktive live-kampe gemmes ikke midt i timeline for at undgå ødelagte reload-states.
- Home screen viser save status:
  - `Saved locally`
  - `Match in progress`
- Home screen har nu `New Career`, som sletter local save og starter forfra efter confirm.
- Save load normaliserer attributes, fixtures, results, last match og last training mod nuværende state-shape.

### Design Impact

- Mobiltest og længere balancing-forløb kan nu overleve refresh/dev-server reload.
- Næste større progression-lag kan trygt bygge mod end-of-season checkpoint og kontrakt/transfer flow.

## 2026-06-17 - Assist Scoreline Integrity Fix

### Implemented

- Decisive player assists tæller nu som et Northbridge goal i både live timeline og post-match scoreline.
- Balance lab tæller nu også player assists som team goals, så simulationen matcher spillets scorelogik.
- Assist conversion er tunet lidt strengere, så bugfixet ikke gør scorelines for målrige.

### Design Rule

- Spilleren kan kun få mål/assist fra et player moment.
- Hvis spilleren skipper/auto-simulerer resterende highlights, kan auto-simmed player moments stadig give mål/assist.
- Non-player sim goals giver ikke automatisk spilleren mål/assist.

## 2026-06-17 - Position-Aware Post-Match Breakdown

### Implemented

- `MatchResult` har nu `performanceReasons` ud over de tekniske explanation tags.
- Post-match summary viser nu et `Performance breakdown` card med korte forklaringer på:
  - position fit
  - outcome/rating driver
  - XP driver
  - manager read
- Performance breakdown deduplikeres på tværs af flere highlights.
- Match result copy bruger nu positionens displayName i stedet for altid striker-formuleringer.

### Design Impact

- Spilleren kan bedre forstå, hvorfor rating og XP ændrede sig.
- Foundation er klar til, at Winger/Midfielder/Fullback/Centerback kan føles fair uden goals/assists som eneste forklaring.

## 2026-06-17 - Position-Aware Rating/XP V1

### Implemented

- Tilføjet `performanceWeights` til position modules i `src/positionRoles.ts`.
- Match result rating justeres nu let efter positionens job:
  - Forward belønnes mest for mål og direkte chance-actions.
  - Winger belønnes mere for assists, transition og wide creation.
  - Midfielder belønnes mere for possession/link-up og chance creation.
  - Fullback belønnes mere for defensive actions, transition og support.
  - Centerback belønnes mest for defensive actions og set pieces.
- Match XP får nu små key-attribute bonuses, så positionens nøglestats udvikles lidt mere naturligt.
- Manager-liked actions giver nu bonus til en relevant used/key attribute i stedet for altid kun `Work Rate`.
- Balance lab spejler Forward performance rating adjustment.

### Current Lab Read

- Build passed.
- Balance lab passed med 200 runs per scenario.
- Baseline prospect: cirka 2.55 mål/kamp, 6% 0-0, 6.77 avg rating.
- Improved finisher: cirka 3.00 mål/kamp, 5% 0-0, 6.90 avg rating.
- High trust / Rotation Starter: cirka 2.88 mål/kamp, 6% 0-0, 6.82 avg rating.
- Forward ratings faldt en anelse på shared/non-striker moments, hvilket er mere realistisk.

### Design Impact

- Andre positioner kan nu belønnes for deres egne job, når de åbnes senere.
- Næste UI-lag bør forklare post-match rating/XP med positionens rating focus, ikke kun goals/assists.

## 2026-06-17 - Position Moment Libraries V1

### Implemented

- Udvidet `src/engine/forwardMoments.js` med første version af position-specific moment pools:
  - Forward
  - Winger
  - Midfielder
  - Fullback
  - Centerback
  - Shared
- Tilføjet `createPositionMatchPool`, så `positionModule.momentPools` nu vælger kampens moment-bibliotek.
- Forward bruger nu både `forward` og `shared`, så den aktive striker-oplevelse allerede får mere variation.
- Winger/Midfielder/Fullback/Centerback har nu første moment foundations klar til senere position-select.
- `scripts/match-balance-lab.mjs` bruger samme position pool selector for Forward test-scenarios.

### Current Lab Read

- Build passed.
- Balance lab passed med 200 runs per scenario.
- Baseline prospect: cirka 2.55 mål/kamp, 6% 0-0, 1 player highlight/kamp.
- Improved finisher: cirka 3.00 mål/kamp, 5% 0-0, 2 player highlights/kamp.
- High trust / Rotation Starter: cirka 2.88 mål/kamp, 6% 0-0, 3 player highlights/kamp.
- Shared moments sænker player assists lidt, men scoreline-balancen forbliver stabil.

### Design Impact

- Kampoplevelsen har nu et bredere moment-katalog, så samme sæson bør føles mindre repetitiv.
- Position-aware rating/XP er nu implementeret som V1; næste lag er bedre post-match forklaring pr. position.

## 2026-06-17 - Position Role Foundation

### Implemented

- Flyttet position modules ud af `App.tsx` til `src/positionRoles.ts`.
- Første scope er alle markspillergrupper uden målmand:
  - Forward
  - Winger
  - Midfielder
  - Fullback
  - Centerback
- Hvert position module definerer nu:
  - short code
  - default archetype
  - key attributes
  - OVR weights
  - moment pools
  - match tendencies
  - rating focus
  - tactical focus
  - manager instructions
- Appen bruger fortsat position modules til Player/Training UI, OVR, tactical focus og manager instruction.
- Match highlight selection bruger nu en let position category bias via `preferredForwardCategories`.

### Current Lab Read

- Build passed.
- Balance lab passed med 200 runs per scenario.
- Baseline prospect: cirka 2.56 mål/kamp, 6% 0-0, 1 player highlight/kamp.
- Improved finisher: cirka 3.04 mål/kamp, 6% 0-0, 2 player highlights/kamp.
- High trust / Rotation Starter: cirka 2.90 mål/kamp, 6% 0-0, 3 player highlights/kamp.
- Great outcomes er stadig sjældne i nogle scenarios, men striker-balancen blev ikke markant ændret af positionslaget.

### Design Impact

- Positioner kan nu udbygges uden at lægge mere positionsdata ind i `App.tsx`.
- Næste naturlige step er at tilføje rigtige moment libraries for Winger/Midfielder/Fullback/Centerback og lade positionens `momentPools` vælge bibliotek.

## 2026-06-20 - Sponsor Deals V1

### Implemented

- Added `src/systems/sponsors.ts` as the sponsor engine surface.
- Sponsors now unlock from prestige and can be accepted from Home -> Deals.
- One active sponsor at a time in V1.
- Active sponsor deals pay:
  - weekly retainer
  - objective bonus when the match objective is completed
  - pressure modifier while the deal is active
- Match finish now includes sponsor cash in total weekly cash and advances sponsor duration.
- Week Summary now breaks out sponsor cash next to wage and contract bonuses.
- Save/load clones active sponsor state safely; older saves fall back to no active sponsor.
- Season balance lab now auto-accepts available sponsor deals and tracks sponsor earned/deals.

### Current Lab Read

- Build passed.
- `npm run balance:season -- --seasons=12 --career-seasons=4 --generations=1` passed.
- Sponsor earnings are visible once prestige reaches Known Talent.
- Recovery-heavy paths create many more minutes, which raises goals, assists, prestige and sponsor cash sharply.
- This confirms sponsors are connected to the wider economy, but also flags recovery/minutes/output balance as the next tuning area.

### Design Impact

- Home -> Deals is now the permanent career-economy hub for contract and sponsor information.
- Sponsors are no longer a placeholder: they are a mid-run cash lever gated by prestige and performance.
- V1 remains deliberately narrow so future sponsor tiers, fame systems and negotiations can build on one clear model.

## 2026-06-21 - Recovery Balance Patch V1

### Implemented

- Recovery is now balanced as a stabilizer instead of a direct accelerator.
- Reduced direct weekly recovery, recovery-session gain, match-action relief and recovery breakthrough relief.
- Added a recovery fitness floor that softly protects against critical fitness collapse without pushing the player to permanent high readiness.
- Training preview now reports the actual post-mitigation fitness delta, so UI and result are aligned.
- Fitness now caps match role readiness:
  - Critical: bench only
  - Heavy: max Impact Sub
  - Tired: max Rotation Starter
- Recovery has a smaller impact on training quality, so it no longer doubles as a hidden XP engine.
- Season balance lab mirrors the new recovery formulas and role caps.

### Current Lab Read

Command: `npm run balance:season -- --seasons=12 --career-seasons=4 --generations=1`

- Balanced spending: 59.7 apps, 872 minutes, 39.4 end OVR, 30.3 end fitness, near target curve.
- Recovery spending: 66.6 apps, 1046 minutes, 38.8 end OVR, 35.0 end fitness, near target curve.
- Recovery-track focus: 106 apps, 2960 minutes, 36.2 end OVR, 45.8 end fitness, still strong but far lower than the previous runaway result.
- Sponsor cash no longer broadly unlocks in balanced/development by season 4, but recovery-track can still reach Known Talent and earn sponsor money.

### Design Impact

- Recovery still matters clearly when the player is low on fitness.
- Recovery no longer automatically creates huge starts/minutes/output/sponsor snowball in ordinary balanced builds.
- The remaining balance question is whether very focused recovery builds should be allowed to trade OVR growth for much higher availability, or whether their minutes should be capped further by role/trust/ability.

## 2026-06-21 - Prestige Unlock Patch V1

### Implemented

- Lowered early prestige tier thresholds:
  - Known Talent: 350 prestige
  - Regional Name: 1,500 prestige
- Sponsor definitions now use the same thresholds.
- Match prestige now gives more credit for appearance and team result, not only direct goals/assists.
- Season prestige now gives more credit for appearances, starts and season consistency.
- Deals UI now checks prestige tier instead of a hardcoded 500-point unlock.
- Season balance lab now tracks first sponsor unlock week and first sponsor deal week.

### Current Lab Read

Command: `npm run balance:season -- --seasons=12 --career-seasons=4 --generations=1`

- Balanced spending: first sponsor unlock average week 116.4, first sponsor deal average week 115.0, end prestige 499.8.
- Development spending: first sponsor unlock average week 116.9, first sponsor deal average week 114.3, end prestige 458.9.
- Recovery spending: first sponsor unlock average week 111.6, first sponsor deal average week 110.7, end prestige 566.6.
- Recovery-track focus: first sponsor unlock average week 60.3, first sponsor deal average week 61.0, end prestige 1,743.5.

### Design Impact

- Sponsor access now arrives as a late season 4 reward for balanced/development builds instead of being mostly unreachable.
- Recovery-heavy builds still reach sponsors earlier because they earn more appearances and output, which is a meaningful availability tradeoff.
- Pure non-recovery/non-development builds generally do not unlock sponsors by season 4, which reinforces that early support choices matter.

## 2026-06-21 - Recovery Ceiling Patch V1

### Implemented

- Added a soft recovery fitness ceiling on top of the existing recovery floor.
- Recovery still protects against critical collapse, but extreme recovery builds are now pulled down from permanent 95-100 fitness.
- Training, match resolution and the season balance lab all use the same floor/ceiling formula.
- Recovery support UI now shows the effective fitness band so the mechanic is less hidden.

### Design Intent

- Recovery should be a strong availability build, not a way to remove fatigue from the game.
- High recovery can still produce better readiness than other builds, but the player should still need to manage training intensity, match load and long seasons.

### Current Lab Read

Command: `npm run balance:season -- --seasons=8 --career-seasons=10 --generations=1`

- Balanced spending: 64.1 end OVR, 48.8 end fitness.
- Development spending: 63.9 end OVR, 46.0 end fitness.
- Recovery spending: 63.9 end OVR, 48.0 end fitness.
- Recovery-track focus: 50.0 end OVR, 83.5 end fitness.

This keeps pure recovery clearly better at availability, but no longer lets it sit at permanent 95-100 readiness.

## 2026-06-22 - Specialist Program Removed

### Implemented

- Removed specialist program selection from the weekly Training screen.
- Removed specialist XP from training projection, training summary and development recap.
- Removed active specialist data/types from the current game model.
- Kept the training loop focused on stat focus, intensity, readiness, facilities and support upgrades.

### Design Decision

- A freely switchable weekly specialist was not a meaningful choice; optimal play was just matching the specialist to the chosen stat.
- Specialists may return later as paid, time-limited economy commitments rather than a free dropdown.

## 2026-06-22 - Support Model V2

### Implemented

- Replaced the old support catalog with three active tracks: Training, Recovery and Career.
- Split Training support into XP Floor, XP Ceiling, Focus Slot unlocks and separate Slot 2/Slot 3 efficiency upgrades.
- Focus slot 2 now unlocks through a 5-step track, starts at 20% XP efficiency and improves by 1 percentage point per level.
- Focus slot 3 now unlocks after slot 2, starts at 10% XP efficiency and improves by 1 percentage point per level.
- Split Recovery support into Training Load, Match Recovery and Recovery Baseline.
- Career support now uses Agent Negotiation for wage/signing leverage and Sponsorship Appeal for sponsor payout scaling.
- Removed active boots, analyst, lifestyle and specialist effects from the playable support model for now.
- Added save version 10 with migration from old support keys into the new support tracks.
- Updated the season balance lab to mirror Support V2 and removed Specialist XP from lab output.

### Verification

- `npm run build` passes.
- `npm run balance:season -- --seasons=8 --career-seasons=2 --generations=1` runs successfully with the new Support V2 scenarios.

### Balance Read

- V2 is technically working, but the lab still flags end fitness as too low over 30-match seasons.
- Balanced/development support improves OVR versus no upgrades, but recovery tuning remains the next likely balance pass.

## 2026-06-22 - Transfer-Aware Season Lab

### Implemented

- Updated `scripts/season-balance-lab.mjs` so long-career simulations now model mid-season and end-season transfer windows.
- The lab now generates external transfer offers from player OVR, form, output, prestige, current tier fit and deterministic seeded variation.
- Accepted external offers now change the simulated tier, club name, contract terms and trust baseline.
- Removed the old hardcoded “climb one tier every few seasons” lab shortcut; tier movement now comes from accepted offers.
- Added lab metrics for transfer windows, transfer offers, accepted transfers and net tier moves.

### Current Lab Read

Command: `npm run balance:season -- --seasons=20 --career-seasons=15 --generations=1`

- Balanced spending: 73.7 end OVR, 0.31 goals/90, 90.9 end fitness, 5.6 accepted transfers, +4.6 net tier moves.
- Development spending: 75.1 end OVR, 0.32 goals/90, 88.2 end fitness, 6.1 accepted transfers, +4.9 net tier moves.
- Recovery spending: 69.0 end OVR, 0.26 goals/90, 91.0 end fitness, 5.0 accepted transfers, +4.0 net tier moves.
- No upgrades/career-track still lag badly because they do not build enough development/recovery support.

### Design Impact

- The lab now tests the world-career fantasy more honestly: good players move up instead of staying in one club forever.
- Transfer frequency is plausible for a 15-season first-generation run, but development builds may now run slightly hot versus the desired Gen1 ceiling.

## 2026-06-22 - Gen1 Soft-Cap Balance

### Implemented

- Increased the attribute XP multiplier when a stat is pushed above its natural potential profile.
- Mirrored the same over-profile formula in the season balance lab.
- The intent is to keep Gen1 growth meaningful while reserving higher ceilings for dynasty upgrades and later generations.

### Current Lab Read

Command: `npm run balance:season -- --seasons=20 --career-seasons=15 --generations=1`

- Balanced spending: 68.9 end OVR, p90 70, 0.26 goals/90, 5.3 accepted transfers.
- Development spending: 69.3 end OVR, p90 70, 0.27 goals/90, 5.1 accepted transfers.
- Recovery spending: 65.2 end OVR, p90 66, strong availability profile.
- No-upgrade/career-only builds still land around 56-57 OVR, which keeps support and future dynasty upgrades meaningful.

## 2026-06-22 - Founder Start Rebalance

### Implemented

- Lowered Gen1 starting attributes to a raw founder profile that calculates to 10 OVR.
- Kept Grassroots around 15 average OVR, so Gen1 starts as a real underdog but can still earn minutes.
- Softened upper league tier averages/ranges so the jump from Grassroots to Local Semi-Pro is not too brutal:
  - Grassroots 15 avg, 10-22 range.
  - Local Semi-Pro 24 avg, 18-31 range.
  - Regional Pro 38 avg, 31-47 range.
  - National Pro 55 avg, 47-65 range.
  - Top Flight 74 avg, 65-84 range.
  - Elite 88 avg, 82-98 range.
- Mirrored the new base attributes and tier curve in the season balance lab.
- Updated the lab target curve for a founder generation that should usually peak below the stronger dynasty generations.

### Current Lab Read

Command: `npm run balance:season -- --seasons=20 --career-seasons=15 --generations=1`

- Balanced spending: 68.5 end OVR, p90 69, 0.29 goals/90, 4.9 accepted transfers.
- Development spending: 68.9 end OVR, p90 69, 0.33 goals/90, 5.3 accepted transfers.
- Recovery spending: 64.9 end OVR, p90 65, very strong availability.
- No-upgrade/career-only builds land around 55-56 OVR.
- S1 remains playable: even no-upgrade builds get regular substitute appearances, while support builds earn more minutes over time.

## 2026-06-22 - Retirement And Legacy Points V1

### Implemented

- Added a deterministic Legacy Points estimate system for retirement planning.
- Retirement is available from age 30, with age currently derived from season number.
- Home / Dynasty now shows a legacy planning card with current LP, estimated payout and retirement hint.
- Added a Retirement Decision screen with point sources, tier multiplier, momentum and after-retirement LP.
- Retiring banks the estimated Legacy Points, increments generation and starts the next generation in the same country.
- Current-run economy resets on retirement, while dynasty generation, Legacy Points and season history persist.
- New dynasty season snapshots now store generation, tier, end OVR and prestige for future legacy calculations.

### Formula Direction

- Peak OVR is the main driver.
- Apps, goals and assists use diminishing returns.
- Average rating rewards quality above 6.4.
- Prestige contributes through a soft square-root curve.
- Highest league tier reached applies a multiplier from Grassroots 1.00 up to Elite 2.50.

### Next Design Gap

- Gen 2+ should eventually start from offer-driven onboarding instead of automatically restarting in the same country's bottom club.
- Legacy Points are banked but still need V1 dynasty spending upgrades.

## 2026-06-22 - Dynasty Upgrades V1

### Implemented

- Added spendable Legacy Point upgrades under Home / Dynasty.
- Added three permanent dynasty tracks:
  - Home Academy: improves next-generation key and general starting attributes.
  - Bloodline Training: adds permanent XP floor and XP ceiling to weekly training.
  - Family Network: improves next-generation starting cash, wage and early trust.
- Dynasty upgrade tracks use foldable cards, progress bars and breakthrough names so the closed view stays clean.
- Legacy Points are now spent only on permanent dynasty economy, while cash remains the current-run support currency.
- New careers and retirements preserve dynasty upgrades and apply them when creating the next generation.
- Save version bumped to 12 because dynasty upgrade levels are now part of save state.

### Design Intent

- V1 should make Gen 2+ clearly feel better prepared without skipping the early climb.
- A modest Gen 1 retirement should buy a small number of meaningful breakthroughs.
- A strong Gen 1 retirement should create visible advantages, but still need in-run cash support, transfers and facilities.

## 2026-06-23 - Contract Length And Striker Output Pass

### Implemented

- Left training XP logic untouched pending a separate training redesign.
- Kept the starter trial contract short, but changed later contract offers to use real season-length terms:
  - Impact Sub/Bench deals: 1 season.
  - Rotation Starter deals: around 1.5 seasons.
  - Starter deals: 2 seasons.
- Mirrored contract-length logic in the season balance lab.
- Tuned forward match output so striker highlights lean more toward real goal moments:
  - Stronger forward preference for shot, first-time finish, run-behind, aerial and late-pressure moments.
  - Higher conversion rates for successful goal/assist actions by chance quality.
  - Slightly higher forward highlight volume per 90.
  - Auto-sim choices now prefer goal actions a bit more for striker moments.

### Current Lab Read

Command: `npm run balance:season -- --seasons=50 --career-seasons=1 --generations=1`

- No-upgrade S1: 1.14 goals avg, p50 1, p90 3.
- Balanced S1: 1.00 goals avg, p50 1, p90 2.
- Development S1: 1.26 goals avg, p50 1, p90 3.
- Match lab improved finisher: 0.51 goals/match, high trust: 0.36 goals/match.

### Notes

- This is a clear improvement from median 0-goal S1 output, but still conservative in auto-sim.
- Manual players who choose attacking options should feel more dangerous than the lab's auto-choice baseline.
- If live testing still feels too dry, the next step should be a first-half/second-half season output lab instead of another blind conversion buff.

## 2026-06-23 - Training Fitness Impact Fix

### Implemented

- Fixed recovery ceiling behavior so it limits upward recovery instead of pulling current fitness down.
- Training preview no longer turns Light/Balanced/Hard into inflated negative fitness impacts just because the player is already above the current recovery ceiling.
- Synced the same recovery-ceiling fix into the season balance lab.
- Build passes after the change.

### Current Read

- The intensity baseline is still Light recover, Balanced moderate load and Hard heavy load.
- The broader lab still warns that end-season fitness can run too low, so recovery balance remains a separate tuning target.

## 2026-06-23 - Training XP Reveal V1

### Implemented

- Added a new `Training Result` reveal screen between `Start Training` and `Development Summary`.
- The weekly XP roll is still deterministic and resolved by the training system, but the UI now reveals it with:
  - Animated XP count-up.
  - Filling XP meter.
  - Roll-tier label based on where the outcome lands inside the possible XP range.
  - Stronger glow/shine effects for high rolls.
- Main progress button now moves from `Start Training` -> `Development Summary` -> `Continue Career`, keeping the bottom button as the primary progression control.

### Verification

- Build passes.
- Mobile browser smoke test confirmed:
  - Fresh career can enter Training.
  - Starting training opens `Training Result`.
  - Main button advances to `Development Summary`.

## 2026-06-23 - Free Agent Contract Flow V1

### Implemented

- Contract offers now show explicit Accept and Decline actions inside the offer card instead of relying on the bottom progress button for acceptance.
- The bottom progress button now treats active contract offers as `Decision Required` on the offer screen and routes back to `Contract` if the player navigates away.
- Declining an expired/external market offer now sends the player into a real Free Agent state instead of silently leaving them in the old club flow.
- Free Agent weeks are simulated one at a time with the main `Sim Week` button.
- Free Agent solo training uses the normal training system but only gives 55% of normal XP because the player is outside club facilities.
- New market offers during Free Agent weeks are short 4-week trial terms, matching the early-career trial fantasy.
- Save version bumped to 13 because `freeAgent` is now persisted.

### Design Intent

- Letting a contract expire should be a valid but risky strategy.
- Declining offers should create time pressure and lower training efficiency, not a hidden automatic stay.
- Trial offers should get the player back into club football quickly without feeling like long-term security.

## 2026-06-23 - Sponsor Access: Light Starter + Dynasty Compounding

### Implemented

- Added a **light starter sponsor** so a strong Gen-1 can earn a first deal without
  waiting for the full "Known Talent" status:
  - New prestige tier `Local Favourite` at **120** (between Local Prospect and Known Talent).
  - New sponsor `Hometown Kit Deal` (prestigeRequired 120, $14/wk retainer, $45 appearance
    objective, low pressure) — small, friendly, the first to believe in you.
- Added **dynasty compounding** so sponsor access arrives sooner each generation:
  - `DynastyState.reputation` (new persisted field): a starting-prestige floor the heir
    inherits, grown from each career's peak prestige via `sqrt(endPrestige) * 3`,
    never-decreasing (`Math.max` with the previous value).
  - `createCareerForCountry` now starts the player at `12 + reputation`.
  - `retireCareer` banks the new floor into the next generation's dynasty.
- Mirrored both into the season balance lab (new tier + sponsor + per-generation inherited
  prestige carry), and bumped `SAVE_VERSION` to 14.

### Verification

- Build green (tsc + vite).
- Balance lab (3 gens × 6 career-seasons): Gen-1 reaches the light sponsor ~week 31 (start of
  season 2 — earned, not instant); Gen 2+ start above 120 so it's available from week 1
  (compounding works). End prestige compounds gen over gen (~1652 → ~3400+).
- In-browser: fresh Gen-1 = prestige 12 / reputation 0; light sponsor not offered at 119,
  offered at 120+; only a harmless favicon 404 in console.

### Design Intent

- Sponsors stay status-gated and realistic — the big deals (350 / 1500) still take real
  status to reach.
- A standout Gen-1 gets a small taste (the hometown deal) without cheapening the real ones.
- A successful bloodline compounds: the heir's family name already means something locally,
  so the light sponsor is available from the start of later generations.

### Noted (not fixed here)

- ~~`data/dynastyUpgrades.ts` has a duplicated `familyNetwork` id~~ — **fixed** below
  (2026-06-23 cleanup).
- ~~The lab models a `sponsorshipAppeal` / `agentNegotiation` career track whose upgrade
  ids don't exist (lab/data drift)~~ — **incorrect, retracted.** `agentNegotiation` and
  `sponsorshipAppeal` are real, wired-up **support** upgrades (`data/support.ts`,
  `SupportUpgradeId`), used in contracts/match/season/training. No drift — they were just
  not dynasty upgrades.

## 2026-06-23 - Dynasty Upgrade Id Cleanup

### Implemented

- Renamed the dynasty **upgrade** id `familyNetwork` → `networkReach` so it no longer
  collides with the **track** id `familyNetwork`. The two live in separate maps (no runtime
  bug), but the shared string broke the sibling convention (other tracks' upgrades are
  domain-prefixed: `academy*`, `bloodline*`) and overlapped `DynastyUpgradeId` /
  `DynastyTrackId`. Now the upgrade ids and track ids are fully disjoint and the track id
  still matches its display name.
- Updated the type union, the upgrade definition, the track's `upgradeIds`,
  `initialDynastyUpgrades`, and the `getDynastyNetworkBonus` lookup. `SAVE_VERSION` → 15
  (the `dynasty.upgrades` key changed).

### Verification

- Build green; the only remaining `familyNetwork` references are the three intended track
  references (type, track definition, track-breakthrough lookup).

## 2026-06-23 - Sponsor Balance: Full Ladder Across All Prestige Tiers

### Problem

- The sponsor ladder stopped at the Regional Name tier (1,500 prestige), but the prestige
  ladder runs to Legend (100,000). Retainers ($14-95/wk) were trivial against upper league
  wages ($1,800-30,000/wk), so sponsors became irrelevant exactly when prestige was highest.

### Implemented

- Extended the sponsor ladder so every prestige tier has tier-appropriate deals, with
  retainers/bonuses scaled to that tier's wage band:
  - National Profile (7,500): National Energy ($200/wk, +$650 goal) · Broadcast Feature
    ($165/wk, +$520 rating).
  - Star Player (20,000): Boot Brand Flagship ($620/wk, +$2,000 goal) · Lifestyle Label
    ($520/wk, +$1,600 assist).
  - Icon (50,000): Global Kit Partner ($1,500/wk, +$5,000 goal) · Luxury Watch House
    ($1,200/wk, +$4,000 rating).
  - Legend (100,000): Global Legacy Campaign ($3,200/wk, +$9,500 goal) · Signature Brand
    ($2,600/wk, +$8,000 rating).
  - Pressure scales with the money (goal deals 3→5, rating/assist deals 2→5), so the big
    campaigns carry real expectation.
- `getAvailableSponsorDeals` now offers only the **highest unlocked prestige band's** deals,
  so a star isn't pestered with the $14 hometown kit and the ladder feels progressive.
- Mirrored the new deals + the top-band filter into the season balance lab.

### Verification

- Build green.
- Lab (grassroots-locked) unaffected: light hometown sponsor still unlocks ~week 30.
- In-browser via injected prestige: at 8,000 only the two National deals show; at 120,000
  only the two Legend deals show ($3,200 / $2,600 retainers), with all lower deals correctly
  hidden. No console errors.

### Note

- ~~The balance lab keeps the player at grassroots all career~~ — **resolved** in the lab
  upgrade below; it now climbs the full pyramid, so the upper tiers ARE exercised.

## 2026-06-23 - Balance Lab Upgrade: Tier Climbing & Trustworthy Career Data

### Problem

- The lab pinned the player at grassroots for an entire career (`state.tier` was set once and
  never changed), so it could not exercise wages, prestige, sponsors or progression at any
  higher tier — exactly the data we now need to trust. It also defaulted to a single career
  season, and had a latent bug: `getMatchPrestigeDelta` read `match.teamGoals` /
  `match.opponentGoals` which were never set, so every match scored prestige as a draw.

### Implemented

- **Team results.** `simulateMatch` now derives the club's full-time score from the sim
  events (`getSimScoreAtMinute(simEvents, 90)`) and returns `teamGoals` / `opponentGoals` —
  fixing the always-a-draw prestige bug and feeding the standings.
- **Club strength + player lift.** The player starts at the WEAKEST club in the bottom
  division (`clubStrength = teamRange[0]`, like `createCareerForCountry`). Match team strength
  is `clubStrength + playerLift` (a strong player drags a weak club up; a weak one can't), so
  results — and therefore promotion — are driven by the player, mirroring the game's
  `advanceWorldMatchweek`.
- **Promotion / relegation between seasons.** `resolveTierMovement` moves the player WITH
  their club on season-long form: promotion at ~1.7+ points/game, relegation at ~1.0- ppg,
  top tier no promotion, bottom no relegation. Skipped if the player already transferred that
  season (that move already set the tier). Transfers (existing) remain the other climb path.
- **Full-career default.** `--career-seasons` now defaults to 14 (age 16 -> retirement at 30)
  and `--seasons` (Monte Carlo) to 120, so the default report shows the whole arc.
- **Reporting.** Per-season table gains a `ClubPPG` column (the club's league form); the
  career summary gains `Promotions`, `Relegations` and `Highest tier reached`.

### Verification

- Build green; full default run ~20-50s.
- Climb is believable and support-sensitive: no-support careers plateau around National Pro /
  Top Flight (career curve behind target, ~0.8 promotions & ~1.0 relegations); balanced/dev
  support reach Elite (p50) with National Profile prestige (~11-13k). Promotions AND
  relegations both fire at sane rates; the per-season ClubPPG makes the logic transparent.
- The upper sponsor tiers (added earlier) are now genuinely exercised by the lab rather than
  only in-browser.

### Caveat

- The lab models one transfer policy ("accept clearly better offers"), so climbing is
  transfer-dominated with promotion as the secondary path; a "loyal / decline transfers"
  policy would show more promotions. Rival strength in a division is abstracted into the ppg
  thresholds rather than a full round-robin.

## 2026-06-23 - Balance Pass: Softer No-Recovery Fitness Floor

### Finding (from the upgraded full-career lab)

- The progression system is broadly healthy: support investment meaningfully changes outcomes
  (OVR gain 46->60, fitness 28->89, highest tier Top Flight->Elite), and supported paths track
  the target OVR curve. Most warnings came from the no-support *control* scenario, which is
  meant to lag.
- The one clear issue: the no-recovery fitness floor was **28** — below the lab's own
  "too low" threshold (30). Because fitness settles at the floor, a player who never invests
  in recovery sat at ~27 fitness for an entire career (barely playable), not just below par.

### Change

- Raised the base recovery fitness floor 28 -> 34 in `systems/support.ts`
  (`getRecoveryFitnessFloor`) and mirrored it in the lab. Recovery investment is still highly
  valuable (floor climbs to 68, ceiling untouched at 70-88) — ignoring it is now "tired but
  playable" rather than broken. Pure computed value; no `SAVE_VERSION` change.

### Verification

- Build green. Lab: no-support / training-track / career-track end fitness now ~33-34 (was
  ~27), clearing the "end fitness too low" warning; supported scenarios unchanged at ~89.
- Left as healthy design spread (not chased): heavy-support paths run ~+6-7 OVR ahead of the
  target curve and no-support ~-7 behind — the two ends bracketing the moderate-support target.

## 2026-06-23 - Aging & Decline (Stage 1 of long-term cash upgrades)

### Why

- Cash had exactly one sink (support) with a bottomless cost ramp, so the optimal play was
  always "dump everything into support" — a decisionless economy. The chosen direction: make
  age matter (peak + decline) so that **longevity** and **potential** become expensive,
  long-term CASH upgrades (Stage 2) — a real late-career choice (extend/heighten your prime
  vs. bank for the heir). Stage 1 builds the aging foundation those upgrades sit on.

### Implemented (Stage 1 — aging core, no upgrades yet)

- New `systems/aging.ts`: `getAgeModifier(age, peakAge=28, declineResist=0)` — an
  effective-ability multiplier that is 1.0 through age 28, then declines (accelerating, floor
  0.55). `getAgeAdjustedAttributes` scales attribute VALUES by it; raw attributes / XP are
  untouched (physical decline, not skill loss — so a future longevity upgrade that raises the
  peak restores full effect). `getPlayerAgeFromSeason(n) = 16 + (n-1)`.
- Applied to the **effective** ability path only: `systems/selection.ts` (selection OVR) and
  `systems/match.ts` (match attribute map + contextual OVR, live-match resolution). Identity
  before the peak, so ages 16-28 are byte-for-byte unchanged.
- Careers already run past 30 (retirement is opt-in), so no flow change was needed; the
  decline now gives a real reason to retire. (A hard retirement cap ~40 is noted for Stage 2.)
- Lab mirrored: `agedFlat(state)` applied to the performance/selection/transfer-interest path
  (not raw-OVR reporting or training-focus choice); `--career-seasons` default 14 -> 22 (age
  ~37); target curve extended to peak at season 13 (age 28) then decline; new `EffOVR` column
  and effective-OVR-based curve comparison.

### Verification

- Build green; no `SAVE_VERSION` change (age is derived from the existing season number).
- Lab (balanced career): raw OVR keeps climbing (10 -> 78) but **effective OVR peaks ~69 at
  age 28 then declines to ~43 by age 37**; goals/90 collapse and the player is relegated from
  Elite late — the intended arc. In-browser: identical attributes show Level fit (effective
  OVR) 70 at age 28 vs 48 at age 35; no console errors.

### Next

- Stage 2: `longevity` + `potential` as expensive CASH support upgrades wired into the age
  model (longevity raises peakAge / flattens decline; potential lifts the attribute ceiling),
  plus a hard retirement cap that longevity extends. Stage 3: simple cash -> Legacy Points
  overflow.

## 2026-06-23 - Longevity Cash Upgrade + Retirement Cap (Stage 2)

### Implemented

- New **`longevity`** support upgrade (cash, per-career, baseCost 300 on the steep shared
  ramp — the expensive late-career sink) in its own **Longevity** track (`data/support.ts`).
- `systems/support.ts → getAgingProfile(state)` derives `{ peakAge, declineResist,
  hardRetirementAge }` from longevity: each track **breakthrough** pushes the peak age and the
  retirement cap one year later (28->34, 40->46); raw **levels** flatten the decline slope
  (`declineResist`). Wired into selection + match via `getAgeAdjustedAttributes(..., peakAge,
  declineResist)`.
- **Hard retirement cap:** `getLegacyEstimate` now returns `forced` / `hardRetirementAge`;
  `App.startNextSeason` routes to the retirement screen instead of starting another season
  once the player passes the cap (longevity extends it).
- Lab mirrored: longevity upgrade + track + a `longevity-track` scenario; `agedFlat` uses the
  longevity peak/declineResist. `SAVE_VERSION` -> 16 (new `supportUpgrades` key).

### Verification

- Build green; Support UI shows the new Longevity track (4 tracks total); no console errors.
- Lab (longevity-track vs no-longevity), late-career **effective** OVR:
  - No longevity: peaks ~28, then crashes — age 37 eff ~36, relegated to National Pro.
  - Longevity-track: peak pushed to ~age 33, eff ~68, and **age 37 eff ~66, still Elite**.
  - So the expensive longevity investment buys many extra elite years — the intended payoff.

### Next

- Stage 2b (optional): `potential` cash upgrade to lift the attribute soft-cap (more invasive
  — must thread support context into `getAttributeGrowthPressure`).
- Stage 3: simple cash -> Legacy Points overflow.

## 2026-06-23 - Re-anchor the OVR curve to the generational targets

### Problem

- Multi-generation lab revealed the optimal (balanced-support) curve had drifted far above the
  intended dynasty guidance (Gen-1 ~60, Gen-2 ~70): Gen-1 peaked at **74** effective OVR (79
  raw), Gen-2 **80**, Gen-3 **84**. The generation *potentials* were fine (~60 / ~68 / ~76) —
  the soft cap was too soft, so a long heavy-support career blew ~14 past potential.

### Change

- Steepened the over-potential growth penalty in `systems/attributeXp.ts`
  (`getAttributeGrowthPressure`) and its lab mirror: the over-curve XP-cost multiplier went
  `1 + over*0.22 + over^1.2*0.08` -> `1 + over*0.7 + over^1.6*0.22`. Reaching your potential is
  unchanged (the >=0 zones are untouched); only growing *past* it is now much harder, so optimal
  play asymptotes near potential instead of overshooting.
- Pure formula change; no `SAVE_VERSION` change.

### Verification (lab, balanced = optimal)

- Generational peak effective OVR now **Gen-1 ~63, Gen-2 ~70 (exact), Gen-3 ~77** — a gradual
  ~+7/generation climb matching the 60/70 guidance.
- Gen-1 spread is healthy: no-support ~54, tracks 57-60, development/balanced 62-63 — support
  matters without exploding the ceiling.

### Note

- This makes the model coherent for Stage 2b: **ceiling = talent** (potential, raised across
  generations by Legacy and within a career, modestly, by the upcoming cash `potential`
  upgrade); **support = speed / longevity / economy**, not ceiling. With the cap now binding,
  a capped cash potential upgrade is a clean lever.

## 2026-06-23 - Potential Cash Upgrade (Stage 2b)

### Implemented

- New **`potential`** support upgrade ("Specialist coaching", own **Talent** track, maxLevel 4,
  baseCost 600). Buying a level raises the **potential (ceiling)** of the player's KEY
  attributes (position OVR-weighted) by +1, capped at 95 — applied at purchase time
  (`bumpKeyAttributePotential` in `systems/support.ts`), so the growth soft-cap, UI labels and
  growthProfileOvr all reflect it with zero threading. Non-key attributes are untouched.
- Per-career (attributes regenerate each generation), so it must be re-bought — like the rest
  of support. `SAVE_VERSION` -> 17. Lab mirrored (upgrade + Talent track + buy-time bump).

### Balance (the key constraint — must respect the 60/70 generational guidance)

- Because the re-anchored soft cap now binds, raising potential directly lifts the ceiling, so
  the upgrade is hard-capped (maxLevel 4) to stay inside the guidance. Fully invested
  (balanced + potential), peak effective OVR: **Gen-1 65.3, Gen-2 73.5, Gen-3 79.5** — a
  +2-3 lift over the no-potential baseline (63 / 70 / 77), and under the "don't exceed" lines
  (Gen-1 70, Gen-2 75).

### Verification

- Build green; no console errors.
- In-browser: Talent track renders (5 tracks total); Invest buys a level; Finishing potential
  61->62, Off Ball 62->63 (key), Tackling 43 unchanged (non-key); "Talent breakthrough" fires.

### Status of the long-term cash-upgrade arc

- Stage 1 (aging core), Stage 2 (longevity + retirement cap), the OVR re-anchor, and Stage 2b
  (potential) are all done. Late-career cash is now a real choice: longevity (more elite
  years) vs. potential (higher ceiling) vs. banking for the heir. Stage 3 (cash -> Legacy
  Points overflow) remains optional.

## 2026-06-23 - Potential upgrade: real opportunity cost (re-cost)

### Why

- The lab models cash (priority-order buys, affordability, reserve), but it revealed the
  potential upgrade at baseCost 600 was ~6.5k total = 0.16% of ~4.15M career income, so it was
  auto-maxed (`talent 4.00`) in every career — NOT a real trade-off, just a free +2-3 OVR.

### Change

- Raised `potential` baseCost 600 -> 12000 (game + lab). The 4 levels now cost ~82k total
  (12k / 16.7k / 22.8k / 30.2k) — a deliberate mid-career investment. Effect unchanged
  (maxLevel 4, +1 key-attribute potential per level).

### Result (lab)

- A default balanced build now only affords **~2 of 4** levels (`talent 2.08`), so it competes
  with other spending — a genuine "raise the ceiling vs. develop/longevity" choice. Peak
  effective OVR: Gen-1 **63.9**, Gen-2 **71.6** (closer to the 60/70 guidance). A player who
  deliberately prioritises potential can still max it (4/4 -> ~65 / ~73.5) by sacrificing
  elsewhere.

### Note (deeper, deferred)

- Even so, over a full career late cash is abundant (longevity also only ~33/60 maxed). The
  root "late cash is too plentiful" is best solved by a big late sink — the heir investment
  (a future Stage 3 / dynasty cash-estate) — rather than by inflating individual upgrade costs.

## 2026-06-23 - Stage 3: Family Trust Fund (late-cash sink → heir)

### Why

- Even after the longevity/potential upgrades, over a full career cash stays abundant (no real
  late scarcity). Stage 3 adds the missing late-career *choice*: a cash sink that serves the
  dynasty — spend surplus on yourself (longevity/potential/support) OR bank it for your heir.

### Implemented (scope: trust fund / starting capital only)

- `systems/estate.ts`: `getEstateCost(level)` (escalating: 40k -> 1.68M at L20 -> ~7M at L44),
  `getEstateHeirCash(dynasty)` (sqrt-scaled, capped 60k — diminishing, no cross-gen snowball),
  `investEstateState` (a true cash sink). `DynastyState.estate` persists across generations.
- `createCareerForCountry`: heir `startingCash += getEstateHeirCash(dynasty)` — a material
  head start (distinct from Legacy Points = talent).
- UI: a Family Trust Fund card in Home → Dynasty (cash / heir-inherits / next-level + Invest
  button), wired via `App.investEstate`. `SAVE_VERSION` -> 18.

### Why it's safe for the 60/70 curve

- The heir bonus is starting *cash*, and cash buys speed + longevity, NOT the ceiling. The
  re-anchored soft cap binds (optimal play asymptotes to potential), and potential is itself
  capped. So a rich heir reaches their generation's potential (~60/70) *faster* and with more
  peak years — never *higher*. No curve break by construction.

### Verification

- Build green; no console errors.
- In-browser: investing deducts the cost (cash 100k -> 60k on a 40k buy), estate 0 -> 1,
  "Heir inherits" -> $9,000, lastEvent confirms. Heir application is the verified one-liner
  `getEstateHeirCash` wired into `createCareerForCountry`.

### Status

- The long-term cash-upgrade arc is complete: aging + longevity + potential + re-anchor +
  trust fund. Late-career cash is now a genuine choice (improve self vs. set up heir). The big
  remaining core-fantasy gap is the **Gen-2 offer-driven start** (inherited name + contract
  offers instead of the country picker); the trust fund's "club connections" idea (3b) is the
  natural bridge into it.

## 2026-06-23 - Tier-gated "Elite" upgrades (mid-late pacing fix)

### Why

- Lab investigation showed the upgrade economy is heavily front-loaded: meaningful OVR growth
  ends ~age 22, but the player keeps spending ~$180-230k/season for ~15 more seasons on the
  bottomless XP sink for ~zero OVR. Fix: give mid-late cash fresh, meaningful purchases — but
  WITHOUT raising OVR past the 60/70 guidance.

### Implemented

- New `requiresPrestige` gate on support upgrades (`isSupportUpgradeUnlocked` /
  `getSupportUpgradeLockReason` show "X prestige" when locked).
- New **Elite** support track, three prestige-gated, NON-OVR upgrades:
  - `consistency` (Regional Name, 1.5k): raises the match-rating floor (bad games hurt less).
  - `eliteConditioning` (National Profile, 7.5k): lifts the fitness ceiling (stay fresher).
  - `marquee` (Star Player, 20k): +prestige gain & sponsor income.
- Effects applied at call sites in `match.ts`/`season.ts` (rating floor, fitness ceiling,
  prestige×/sponsor) — none touch attribute values or potential. `SAVE_VERSION` -> 19.

### Why OVR can't run away (the key guardrail)

- OVR is a function of attribute values, capped by potential (the re-anchored soft cap). The
  ONLY OVR-ceiling lever is `potential` (capped at +4). These three perks touch rating /
  fitness / economy only, so they cannot move OVR — guaranteed by construction.

### Verification

- Build green; no console errors.
- Lab (balanced + elite perks): peak effective OVR Gen-1 62, Gen-2 72, Gen-3 80 — unchanged
  from the no-elite baseline (64 / 71.6 / 78.8) within noise. OVR stays on the 60/70 curve.
- In-browser: all 6 tracks render; at 12 prestige the 3 perks show LOCKED with thresholds
  (1.5k / 7.5k / 20k); at 25k prestige Consistency buys (cash -9k, level 0->1) and Finishing
  value 11 / potential 61 are unchanged — attributes/OVR untouched.
## 2026-06-24 - Play-session fixes: fitness, transfer choices and focus clarity

### Implemented

- Low-fitness starters are substituted earlier and more reliably. `Risky` starters can now be managed from the late first half onward, while match state can still delay or accelerate the decision.
- Players who record zero minutes now recover on matchday: unused substitutes receive a clear recovery gain, while players left out of the squad receive a slightly larger gain.
- Transfer-window offers are independent decisions. Declining one offer no longer removes every other offer.
- Added an explicit `Stay at club` action that closes the transfer window without pretending every offer was individually declined.
- Training now lists each active focus slot in order with its actual XP efficiency, making the primary and reduced secondary focuses readable before starting the session.
## 2026-06-24 - Match Director V1

### Implemented

- Added a pure engine `matchDirector` between team simulation and player-highlight presentation.
- Player moments are now selected and timed from dynamic match phases, score state, role, attributes, service and opponent profile.
- Added director memory for recent categories, used moment families, phase history, highlight budget and chain budget.
- Added strong repetition cooldowns, narrative-continuity weights and spacing protection around other highlights and simulated goals.
- Existing moment chains now respect the Director's chain allowance, player exit minute and nearby goal events.
- Live player moments show the readable match phase, such as `Chasing goal` or `Late siege`.
- Match balance lab now reports unique moment IDs, phase/category distribution, adjacent repetition and tight-spacing rates.

### Verification snapshot

- 500-match scenarios used 19 different moment IDs.
- Adjacent category repetition stayed between 0-2%.
- Unrelated highlight pairs under six minutes stayed at 0%.
- Build and short career lab remained green.
## 2026-06-24 - Forward Moment Library V2

### Implemented

- Added 31 new forward moments, raising the forward + shared playable pool from 19 to 50 unique situations.
- New families cover rebounds, cutbacks, volleys, blind-side movement, offside-line runs, 1v1 attacks, counters, hold-up combinations, pressing triggers and attacking/defensive set pieces.
- Every new moment carries Match Director metadata for phases, score states, minute range, rarity, cooldown and narrative family.
- Added nine explicit chain routes with bespoke second actions: finish/square, rebound, run-to-finish, cross decision, aerial second ball, hold-up return, dribble break, press turnover and clearance counter.
- Expanded result feedback with deterministic saves, blocks, shots off the frame, misses and teammate finishing outcomes.
- Normalized conversion on the new pool so variety does not become an automatic goals buff.
- Extended the match lab with unique situation text, family coverage and chain-route metrics.

### Verification snapshot

- 2,000-match scenarios used all 50 moment IDs, all 50 situation texts and all 50 narrative families.
- All nine chain routes appeared in simulation.
- Roughly 38-42% of selected moments were chain-capable.
- Adjacent category repetition remained at 0-3%; unrelated tight-spacing remained 0%.
## 2026-06-24 - Live Match Presentation V2

### Implemented

- Added context-aware live commentary driven by the latest meaningful event, score and match minute.
- Added a compact momentum strip based on recent team/opponent chances and goals. It communicates pressure without exposing a misleading percentage.
- Expanded simulated event commentary with multiple deterministic variants for goals, chances, substitutions and quiet phases.
- Timeline now prioritizes meaningful events and uses icons plus team/opponent/goal-involvement tones.
- Added live player stats for rating, successful actions, total actions, shots, shots on target, key passes and fitness.
- Follow-up chains now receive a restrained pulse while goals/assists retain the strongest reward treatment.
- Added reduced-motion behavior for new transitions.
### Moment result clarity and momentum polish

- Streamlined the live result popup around action, outcome factors and attack consequence.
- Teamplay now clearly states whether it created a chance, opened a follow-up decision, retained possession or ended before a shot.
- Reworked the momentum meter into a cleaner full-width neutral line with one directional marker.
### Browser-stable country flags

- Replaced OS-dependent flag emoji with local SVG assets for all seven countries.
- Added one shared flag component across onboarding, player, club and contract surfaces.
### Club profiles and universal club links

- Added a reusable club profile with unit OVR, average rating, form, facilities, tactical identity, strengths, weaknesses and player career fit.
- Club profiles are deterministically derived from the persistent world and current league record.
- Connected club names across league tables, fixtures, match headers, summaries, transfer offers, contracts, player context and dynasty history.
- Split fixture/table preview navigation from individual club links to avoid nested controls.
### The Feed V1

- Added deterministic weekly story generation after the world matchweek resolves.
- Added candidate scoring for player performances, milestones, results, upsets, form streaks, table movement and transfers.
- Added repetition control, category limits, club-density limits and 2-3 story weekly output.
- Added a chronological Home feed with clickable club references and a leading Weekly Summary teaser.
- Added `balance:feed`; a 90-week lab produced 2.19 stories per week, six categories and zero same-season headline repeats.
- Raised `SAVE_VERSION` to 21. Development saves from earlier versions intentionally reset.

## 2026-06-24 - Match Agency (plan in MATCH_AGENCY_PLAN.md)

### Step 1 - Visible risk/reward per choice (commit 60d4b09)

- Added pure helper `estimateChoiceOdds(input)` in `matchEngineCore.js` (+ `.d.ts`). It mirrors
  `resolvePlayerChoice`'s deterministic `resultScore` EXACTLY but drops the seeded `variance`, then
  buckets `delta = score - threshold` into a band: `>=9` Strong, `>=2` Favoured, `>-2` Even,
  `>-9` Against the odds, else Long shot. Lives in the same file as `resolvePlayerChoice` so it
  reuses the identical helper math (honesty guarantee).
- `systems/match.ts` `getChoiceOdds(state, moment, choice)` builds inputs IDENTICAL to
  `createMatchResult`'s resolution call (league+age-adjusted attrs, live readiness, trust, role,
  league-adjusted opponent) and returns `estimateChoiceOdds(...)`.
- `MatchMomentScreen` renders an honest odds chip + a readable coach-lean chip per choice
  ("Coach likes" / "Coach wary" / "Coach neutral"). `types.ts`: `ChoiceOddsBand` / `ChoiceOdds`.
- No resolution change, no new state, no `SAVE_VERSION` change. Verified in-browser: strong
  grassroots player = all Strong (correct); top-flight + High-risk = "Against the odds" while
  Medium = "Favoured". 0 console errors.

### Step 3 - Manager comply / defy

- Sharpened `trustDelta` in `resolvePlayerChoice` with a unified `managerTrustShift`: `Risky`
  (defy) gives +2 on decisive / +1 on success / **-3 on fail (the doghouse)**; `Likes` (obey)
  gives +1 on success; `Neutral` is unchanged from prior behaviour. Applied additively across all
  three outcome branches (goal/assist/other); the old inline `manager === "Risky" ? -1 : 1` on the
  goal branch was folded into the shift.
- Added `explanationTags` beats surfaced in the result popup: "Backed your instinct" (defy +
  decisive), "Coach unhappy" (defy + fail), "Followed the plan" (obey + success). Reuses the
  Step-1 coach-lean chip pre-choice.
- No new persisted state -> no `SAVE_VERSION` change. Labs import `resolvePlayerChoice` directly,
  so no mirror needed. Verified by direct assertion: defy-win +6, obey-win +5, neutral-win +4;
  defy-fail -2 ("Coach unhappy") vs obey/neutral-fail +1. Build + match lab + season lab + smoke
  all green; OVR/peak unchanged (trust-only change).
- 3b (transient mid-match manager ask) deferred — not shipped.

### Step 2 - Player-controlled mentality dial (SAVE_VERSION 21 -> 22)

- New `matchMentality: "push" | "balanced" | "hold"` on `GameState` (default `balanced`), added to
  `createCareerForCountry`; `normalizeSavedGame` already spreads the fallback so old shapes default
  to balanced. `SAVE_VERSION` bumped to 22 (`save.ts` + `SavePayload.version`).
- Director hook (`matchDirector.js`): `mentalityCategoryWeights` multiplied into
  `getDirectorMomentWeight` — push lifts attacking categories (shot/first_time_finish/run_behind/
  counter/late_pressure/aerial_duel) and damps holding ones; hold does the inverse; balanced/
  undefined = ×1. `mentality` threaded via the existing `...input` spread from `createMatchDirectorPlan`.
- Resolution hook (`matchEngineCore.js`): `getMentalityResolutionModifier` (push +3 High-risk, hold
  +3 Low-risk) added to `resultScore` AND mirrored into `estimateChoiceOdds` (odds chip stays
  honest); `getMentalityFatigueModifier` (push −2 fatigue); `mentalityTrustShift` (hold + Low-risk +
  success → +1 trust). `chooseAutoSimChoice` biased to match the dial.
- Plumbing: `match.ts` passes `state.matchMentality` into `createMatchDirectorPlan`, `getChoiceOdds`/
  `estimateChoiceOdds`, `createMatchResult`/`resolvePlayerChoice`, and both `chooseAutoSimChoice`
  calls. `.d.ts` updated with `EngineMentality` + optional `mentality` on all four inputs.
- UI: reusable `MentalityDial` (screens.tsx) — full 3-way control with hints on `PreMatchScreen`,
  compact version in a live `match-mentality-bar` (hidden at full time). Wired via `setMatchMentality`
  in `App.tsx`. Styles added in `styles.css` (push=orange, balanced=gold, hold=lime).
- Verification: match-lab mentality sweep — director attacking share push 87% / balanced 84% / hold
  79%; resolution probe High-risk success push 86% vs balanced/hold 68% at −10 vs −8 fatigue (shared
  variance isolates the deterministic shift). Balanced/undefined is a strict no-op: season-lab OVR
  byte-identical (57.20 / 67.39 / 67.11 / 63.83). In-browser: dial renders, switches, and carries
  from pre-match into the live match (verified via Playwright). Build + match/season/feed labs +
  smoke all green.

### Step 4 - Personal match objective = sponsor matchday target (SAVE_VERSION 22 -> 23)

- The personal objective IS the active sponsor's matchday target, surfaced before/after the match.
  It is present ONLY while a sponsor deal is active (sponsors are earned over time). An earlier build
  fabricated contract/milestone/rivalry/form objectives, but a routine "score to trigger your goal
  bonus" felt forced, so it was replaced by reusing the existing sponsor-objective mechanic - one
  system, no parallel objective generator.
- `src/systems/matchObjective.ts`: `getSponsorMatchObjective(sponsor)` maps `sponsor.objective`
  (type/target/label) to a `MatchObjective` view-model whose `reward.cash` mirrors
  `sponsor.objectiveBonus` for DISPLAY only. `getObjectiveResultLine` formats the careerImpact/feed line.
- `createMatch` attaches `getSponsorMatchObjective(state.sponsor)` (undefined when no sponsor).
  `finishMatchState` derives completion from `sponsorPayout.objectiveCompleted` (authoritative) and
  stores it on `lastMatch.objective` + a `careerImpact` line. The sponsor system already pays the
  bonus via `sponsorPayout.total`, so there is NO second payout and OVR/cash balance is untouched.
- Feed (`feed.ts`): a completed sponsor objective becomes a commercial ("contract" category) story.
- UI: objective card on `PreMatchScreen` + complete/missed card on `PostMatchSummaryScreen`, both
  gated on `match.objective` existing (i.e. a sponsor is active). `MatchObjectiveType` now also
  includes "appearance" (sponsors can require an appearance); `MatchObjectiveSource` = "sponsor".
- `SAVE_VERSION` stays 23 (no persisted-shape change vs the prior Step 4 build).
- Verification: transpile-and-require probe - no sponsor -> objective undefined; with a sponsor ->
  mirrors the deal (target 1, "Score 1 goal", reward $260, source sponsor); `createMatch` on a fresh
  (sponsorless) career attaches `undefined`. In-browser: a no-sponsor Italy career shows NO objective
  card on pre-match (mentality card still present), 0 console errors. Smoke + build green; season-lab
  OVR byte-identical.

### Match agency: all 4 steps shipped

Sequence 1 (visible risk/reward) -> 3 (manager comply/defy) -> 2 (mentality dial) -> 4 (objectives)
all complete. Deferred polish: old-club rivalry objectives (needs `formerClubs` tracking), a live
in-match objective-progress widget, and Step 3b (transient mid-match manager ask).

## 2026-06-24 - The Feed gets its own screen (1-5 stories)

- The weekly feed was a single teaser tucked into the Week Summary; it is now its own beat in the
  post-match flow: **Match -> Match summary -> Week Summary -> News feed ("End Week") -> Home**.
- New `NewsFeedScreen` (screens.tsx) renders this week's stories
  (`worldFeed.filter(week === game.week && season)`) as full `feed-story` cards, with a header count
  ("N stories this week") and an empty state for a quiet week. Reuses the existing feed-story styling.
- New `ScreenKey` `"news-feed"`. App.tsx: `closeWeekSummary` now -> `news-feed`; new `closeNewsFeed`
  carries the old branching (free-agent / transfer-window / contract-offer / season-review / player).
  Advance labels: Week Summary -> "The Feed", News feed -> "End Week" (or "Contract"/"Season Review").
- The single feed teaser was removed from `WeekSummaryScreen` (replaced by a one-line "headlines are
  next" hint); the full archive still lives under Home -> Feed.
- `generateWeeklyFeed` now produces **1-5 stories by "meat"** instead of a fixed 2-3: story cap 3->5,
  the player's own club may headline up to 3 beats in a big week (others capped at 2), and the
  guaranteed minimum dropped from 2 to 1 (a genuinely quiet week shows a single story / round-up).
  Candidate triggers already gate by what happened, so the count scales naturally. Removed the now-
  unused `buildTableWatchCandidate` fallback.
- No `SAVE_VERSION` change (news-feed is a transient screen; feed-story shape unchanged).
- Verification: `balance:feed` over 60 weeks -> weeklyRange [1, 5], 1.83 stories/week avg, 0 headline
  repeats, 6 categories (lab assertion updated 2-3 -> 1-5). In-browser (Italy career): full flow
  summary -> "Week Summary" -> "The Feed" -> news-feed (2 story cards) -> "End Week" -> home, teaser
  gone, 0 console errors. Build + smoke green.

## 2026-06-24 - Per-career variety (starting club + match moments)

- Problem: every fresh career started at the exact same club (the literal weakest in the bottom
  division, e.g. Fredericia Colts in DK) and played near-identical opening moments, because the
  world seed, starting-club pick, attributes and match seed were all fully deterministic with no
  per-career entropy.
- Fix: a new persisted `careerSeed` on `GameState`, set once at creation. `App.tsx` `makeCareerSeed()`
  draws one-time entropy via `Math.random` ONLY at the create/retire UI action and stores it in the
  save; the engine and balance labs never call it (they read the stored seed or omit it for a fixed
  deterministic fallback), so replay + lab reproducibility are preserved.
- `createCareerForCountry` now: derives `careerSeed` (provided one, else identity-based fallback
  `firstName-lastName-country-generation`), picks the starting club from the **weakest 3-4** clubs in
  the bottom division (seeded) instead of always the single weakest, and stores `careerSeed`.
- `createMatchSeed` includes `state.careerSeed`, so even two careers that land on the same club get
  different match-moment selection. Both career entry points (onboarding + heir/Gen-2+ in
  `retireCareer`) pass a fresh seed.
- `SAVE_VERSION` 23 -> 24.
- Balance note: the season lab reimplements the weakest-club start, so its OVR targets are unchanged
  (verified byte-identical 57.20/67.39/67.11/63.83). The bottom-3-4 clubs are all grassroots-dev, so
  club strength barely moves and the OVR curve is unaffected (OVR is potential-bound, not club-bound).
- Verified: probe shows distinct seeds -> distinct clubs (Kolding/Roskilde/Northbridge) and distinct
  match seeds, same-club careers still differ in match seed, and the no-seed fallback is stable.
  In-browser a fresh DK career started at Kolding Town with a random `careerSeed`, save v24, 0 console
  errors. Build + smoke + season + feed labs green.

## 2026-06-25 - Match choices use real outcome distributions

- Replaced qualitative odds, raw attribute averages, risk chips and vague reward
  chips with three consequence-specific possible outcomes per choice.
- `estimateChoiceOutcomes` samples the actual deterministic
  `resolvePlayerChoice` path across 500 stable preview seeds, so attributes,
  fitness, trust, role, opponent, moment difficulty and mentality all affect the
  displayed distribution without maintaining a second probability formula.
- Percentages are rounded to 5% steps, preserve a visible 5% floor for possible
  rare outcomes and are rebalanced to total exactly 100%.
- Outcome labels adapt to the action: shots show miss/attempt/goal, teamplay
  shows breakdown/chance/assist, and control or defensive actions use relevant
  non-scoring consequences.
- Choice UI now shows only title, `Stats used`, possible outcomes and the coach
  preference. The post-choice result also removes the misleading `Avg` value.
- Added a play-session smoke assertion for three outcomes, 5% rounding and a
  100% total. No save-shape change.

## 2026-06-25 - Fitness: full rest when benched + no starting on empty legs

- Two linked fitness issues: (1) sitting out a match barely recovered fitness (a flat +14 matchday
  bump), and (2) you could be selected to START with low fitness.
- Recovery (`finishMatchState`): sitting out is now a full rest week — projected fitness is lifted to
  the recovery ceiling (`getRecoveryFitnessCeiling`: 70 with no recovery investment, climbing toward
  88), so you come back ~70-80% instead of staying low. Counts as rest when you weren't picked to play
  (`playerRole === "Bench"`) OR logged no minutes, so a token garbage-time cameo still rests (fixes a
  trap where a benched low-fitness player got a 10-min cameo and never recovered).
- Selection (`capRoleByFitness`): you now need ~60%+ ("Ready"/"Sharp") to start. Risky (20-40%) ->
  Bench (sit out and recover), Tired (40-60%) -> Impact Sub (can come on, can't start), Not match fit
  (<20%) -> Bench. Previously Tired could still be a Rotation Starter and Risky an Impact Sub.
- Together this forms a self-correcting rotation/rest loop: heavy minutes drag you below 60 -> you get
  rotated to the bench -> a rest week restores you to your conditioning ceiling -> you start again.
- Verified by probe: roles cap correctly across fitness 15/30/50/65/85 (start only at >=60); benched
  players at 20-35% recover to 70 even with a cameo; a Tired sub who plays stays put. Build + smoke
  green; season-lab OVR byte-identical (lab reimplements selection/recovery; the OVR curve is
  unaffected). No `SAVE_VERSION` change.
