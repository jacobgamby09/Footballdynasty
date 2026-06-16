# Progress Log

## 2026-06-16

### Match Engine V2 Direction

- Created `MATCH_ENGINE.md` as the source of truth for match engine design.
- Match engine is now the highest-priority gameplay system because it binds attributes, opponents, training, role progression and career feedback together.
- V2 direction is setup/generation/resolution separation, opponent profiles, striker highlight taxonomy, chance quality, outcome bands, explanation tags and batch simulation for balance.
- Added position architecture for Forward, Winger, Midfielder, Fullback and Centerback. Goalkeeper is intentionally out of scope for now.
- Implemented first code-level position module architecture. Player identity, OVR weighting, key attributes, training key markers, tactical focus and manager instructions now read from position modules. Current active module is Forward.

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
- Sidste moment afsluttes med `Finish Match`.
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
