# Progress Log

## 2026-06-18

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
- Main button now progresses through contract offers with `Accept Offer`; declining is a secondary in-screen action.
- Player contract card now shows contract status such as `Review soon`, `Expiring`, `Expired` or `Offer ready`.
- Weekly economy and match payouts continue to use the active contract after accepting an offer.
- Season balance lab now mirrors contract offers, accepts meaningful upgrades and tracks `Contract offers`, so support-price tuning includes wage growth.
- Verification: `npm run build` passes, and `npm run balance:season -- --seasons=3 --career-seasons=5 --generations=1` runs successfully.
- Balance watch: contracts now make cash scale much faster in balanced/development spending scenarios, so support prices, bonus values and high-output match rates should be tuned with contract progression enabled.

### Multi-Focus Training Unlocks V1

- Training Setup breakthroughs now unlock more weekly focus capacity: one focus by default, two focus slots after the first Training breakthrough and three after the third Training breakthrough.
- Training focus selection now supports multiple active stats while keeping at least one selected focus.
- Secondary focus slots use reduced XP weights, so extra slots feel like better training capacity rather than a flat XP duplication.
- Specialist programs can bonus multiple selected focuses when the active specialist covers those attributes.
- Support cards now show focus-slot capacity as a concrete current Training Setup bonus.
- Season balance lab now mirrors multi-focus training unlocks and weighted secondary focus XP.

### Support Clarity And Scaling V1

- Support track cards now show `Current bonuses` in compact chips, so the player can see what a track is already doing before buying again.
- Training support was strengthened: Personal Coach now gives a larger XP floor/ceiling, and training breakthroughs add more visible range improvement.
- Specialist program XP now scales more clearly with club facilities, coach level and training breakthroughs.
- Recovery support was moderately strengthened through weekly recovery, training fatigue relief and match fatigue relief, while still keeping caps so fatigue remains relevant.
- The season balance lab mirrors the same support, recovery, specialist and training-quality scaling as the playable app.
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
- Specialist programs add bonus XP when the selected training focus matches the specialist's attribute group.
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
