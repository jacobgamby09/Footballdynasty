# Next Steps

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

Naeste oplagte gameplay-hul:

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
