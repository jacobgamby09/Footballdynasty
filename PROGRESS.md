# Progress Log

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
