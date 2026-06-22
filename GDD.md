# Football Dynasty - Game Design Document

## High Concept

Football Dynasty er et incremental football career sim, hvor spilleren styrer én fodboldspillers karriere fra ukendt talent til mulig legende. Fokus er ikke at styre klubben, men at udvikle sig selv gennem træning, kamppræstationer, relationer, kontrakter, transfers, udstyr, prestige og til sidst legacy gennem næste generation.

Spillet skal føles som en blanding af realistisk karrieresimulation og incremental progression. Tallene må gerne stige, men de skal stige på en måde, der føles fodboldmæssigt troværdig.

## Core Fantasy

Du starter som en ung spiller langt fra toppen. Du kæmper for minutter, bygger managerens tillid, forbedrer dine attributter, vælger din spillestil, får bedre kontrakter, skifter måske til større klubber og forsøger at skabe en karriere, der kan overgå generationen før dig.

Når din karriere nærmer sig slutningen, kan du trække dig tilbage og starte forfra som din søn. Du mister meget af din direkte spillerstyrke, men beholder dele af dit fundament: faciliteter, netværk, navn, erfaring og legacy-bonusser.

## Design Pillars

### 1. One Player, Many Decisions

Spilleren styrer ikke hele holdet. Alle systemer skal kredse om den ene spillers udvikling, rolle, performance og karrierevalg.

### 2. Realistic Incremental Progression

Progression skal føles tydelig og tilfredsstillende, men ikke absurd. Udstyr, faciliteter og træning giver primært små multipliers, bedre effektivitet, flere muligheder og mere stabilitet frem for store arkadeagtige stat boosts.

### 3. Choice-Based Football Moments

Kampe skal ikke være fuld taktisk holdstyring. De skal bestå af personlige moments, hvor spilleren træffer valg i afgørende situationer. Valgene afgøres af attributes, fatigue, morale, pressure, kampkontekst og modstander.

### 4. Career Momentum

Spillet skal handle om momentum: spilletid, form, manager trust, kontraktværdi, transferinteresse og reputation. Gode beslutninger skal skabe bedre muligheder, men større muligheder skal også øge risiko og forventninger.

### 5. Legacy Without Removing the Early Game

Prestige og næste generation skal gøre starten hurtigere og mere strategisk, ikke trivial. En søn kan have bedre fundament, men skal stadig kæmpe for sin egen karriere.

## Primary Game Loop

Spillets primære loop er et kompakt matchweek-loop: træning -> kamp -> træning -> kamp.

1. Vælg træningsfokus.
2. Vælg intensitet eller recovery-balance.
3. Gennemfør træning og se XP, attribute progress og fitness-impact.
4. Spil eller simuler kampens personlige moments.
5. Modtag rating, XP, fatigue, form, manager trust og reputation-effekter.
6. Se End Week Summary med økonomi, udvikling, condition, career movement og sæsonstatus.
7. Brug cash eller tid på udstyr, privat træning, agent, recovery eller andre in-run forbedringer mellem matchweeks.
8. Over tid: forhandl kontrakt, skift klub, ændr rolle eller planlæg karriereretning.

Sæsoner bør holdes korte nok til, at mange sæsoner og prestige-progression kan mærkes. Hvis progressionen bliver for langsom, bør vi hellere justere XP-output, training multipliers og season rewards end at tilføje mange ekstra uger uden kampe.

## First Vertical Slice

Første version fokuserer på angriberpositionen. Målet er ikke at bygge hele spillet med det samme, men at bevise kernen:

- En ung angriber starter lavt i systemet.
- Spilleren træner og udvikler attributter.
- Spilleren får begrænset spilletid.
- Kampe består af choice-based moments.
- Match rating påvirker XP, form, manager trust og karrieremuligheder.
- Bedre performance fører til mere spilletid, bedre kontrakt og transferinteresse.

Fundamentet skal dog designes generisk, så midtbane, forsvar og andre roller kan tilføjes senere uden at skrive hele spillet om.

## Player Attributes

Attributes bør være generelle nok til alle positioner, men kunne vægtes forskelligt pr. rolle.

Alle spillere har hele attribute-profilen, også når nogle stats ikke er centrale for deres nuværende position. UI'et må gerne fremhæve positionens nøglestats først, men spilleren skal kunne åbne fuld profil og se alle stats, beskrivelser og hvad de påvirker i kampmotoren.

Foreløbige attributes:

- Finishing
- Shooting
- Passing
- Technique
- Dribbling
- First Touch
- Crossing
- Heading
- Tackling
- Positioning
- Off Ball
- Vision
- Acceleration
- Pace
- Stamina
- Strength
- Composure
- Mentality
- Work Rate
- Consistency

Potentiale bør være individuelt pr. attribute frem for ét samlet potentiale. En spiller kan have højt potentiale i Finishing og Off Ball, men lavere potentiale i Strength eller Passing.

Potential should not be a hard stop. It should act as growth pressure: the closer a player gets to their natural development zone, the harder and more expensive further progress becomes. Exceptional careers can still push beyond expectation through the full stack of training, support, facilities, performance, age timing and dynasty advantages.

## Ability Scale And League Context

Football Dynasty bruger en global 1-100 ability scale, men performance skal altid vurderes relativt til spillerens aktuelle miljoe.

Eksempelretning:

- 1-15: grassroots / helt tidlig udvikling
- 16-30: lav semi-pro
- 31-45: staerk semi-pro / lav pro
- 46-60: regional pro
- 61-75: national liga
- 76-90: topdivision
- 91-100: elite/world class

En spiller paa 18 OVR er ikke automatisk ubrugelig. Hvis ligaens gennemsnit er 15 OVR, er spilleren en svag men relevant prospect. Hvis samme spiller rykkes til en 45 OVR liga, bliver han langt under niveau.

Core rule:

`Player performance = player ability relative to league, club and opponent level.`

Det betyder:

- startspilleren kan starte omkring 10-20 OVR uden at gameplay kollapser
- startklubben og startligaen skal vaere paa tilsvarende lavt niveau
- en 40 OVR spiller kan vaere staerk i en lav liga, men ikke i en topdivision
- en 85 OVR spiller skal foeles elite, men kun dominant hvis han spiller under sit niveau
- dynasty progression skal give bedre startpunkt over generationer uden at springe hele fodboldpyramiden over

### Position-Based OVR

OVR is not a raw average of every attribute. OVR is the player's current ability for the active position/role.

Each position defines its own weighted attribute profile. For example, a Forward OVR is driven by striker-relevant attributes such as Finishing, Off Ball, Composure, First Touch, Acceleration, Heading, Strength and Work Rate. Attributes outside that position profile can still matter in specific match moments, but they should not inflate the headline OVR.

Core rule:

`OVR = weighted current ability for the active position, not total attribute grind.`

This means:

- a Forward with 100 Long Shots but weak core striker attributes should remain a low-OVR specialist
- a player can have different effective OVRs in different positions later
- role fit can become a useful layer on top of position OVR
- the Player screen OVR must be clickable and explain which attributes currently define the rating

### Potential And Generation Model

Potential is not a hard attribute cap. It is the player's natural development curve for each attribute: progress is efficient below expectation, slower near the player's natural level, and very expensive beyond it.

Core rule:

`Generation quality raises the starting floor and improves growth efficiency. Training, support, club facilities, age and performance decide how far beyond expectation the player can push.`

V1 generation direction:

- Gen 1 starts as a true grassroots prospect with low starting OVR and limited growth efficiency.
- Later generations start slightly better, especially in key attributes for their position.
- Later generations receive better attribute growth profiles, with key attributes improving more than secondary attributes.
- Dynasty upgrades should eventually influence generation quality through Legacy Points, not direct cash spending.
- The player should still need to climb through appropriate leagues. A better generation should feel advantaged, not instantly elite.

Soft-cap progression should come from natural obstacles instead of a fixed wall:

- XP required per attribute level rises as the attribute gets higher.
- XP required rises further when the attribute is above the player's current growth profile.
- Better club facilities, private support, dynasty upgrades and strong performance can mitigate the curve.
- Age affects the curve: young players develop faster, peak years are about maximizing output, and older players fight decline/maintenance.
- Higher leagues should demand higher ability, so raw OVR only matters relative to club, league and opponent context.

The UI should expose:

- current position OVR
- growth profile / projected trajectory, if relevant
- generation number and generation tier label
- an explanation that OVR is role-weighted and potential is a soft growth curve, not a fixed ceiling

Balance target:

- Gen 1 should be capable of a meaningful but limited career.
- Stronger generations should make higher leagues and higher long-term growth realistic.
- A long career should need the full stack: generation growth profile, training choices, in-run support, recovery, club facilities, contracts and transfers.
- Career balance should be measured as a season-by-season curve, not only as a final career total. The lab should track OVR, output, minutes, fitness, economy, support growth and league tier per season.

Progression budget rule:

- Training should be the main stable source of attribute growth.
- Match XP should be meaningful feedback for good performances, but not the primary growth engine.
- Support upgrades and club facilities should make training stronger, more reliable and less punishing on recovery.
- If realistic match highlight volume makes progression too slow, tune training, support, facilities and XP requirements before increasing match moments.

First Gen 1 calibration curve:

- Season 1: around 20 OVR
- Season 3: around 30 OVR
- Season 5: around 40 OVR
- Season 8: around 52 OVR
- Season 11: around 62 OVR
- Season 14: around 70 OVR
- Late career: gradual plateau or decline depending on age, recovery and support.

Current Gen 1 balance direction:

- Gen 1 should still start as a true low-level prospect around the grassroots environment.
- Gen 1 should not be hard-capped at grassroots/semi-pro ability. A strong first run can become a meaningful career and create the first real dynasty foundation.
- The Gen 1 growth profile marker should sit below the best possible career outcome. It represents the natural curve, not the maximum. Current target is roughly 60 profile OVR, with strong support/facilities/performance able to push toward roughly 70-72.
- Gen 1 ending in the mid/high 70s should be exceptional and usually signal that the player has outgrown their league. The preferred follow-up is better transfer/league progression and tier fit, not flattening the earned development into a hard cap.
- Balanced and development-focused support spending should be able to land near the target curve over a 15-season career.
- No-upgrade or economy-only play should fall clearly behind, proving that active in-run support investment matters.
- If a player outgrows the current league, output can spike. The preferred fix is better transfer/league progression and tier fit, not reducing the player's earned development.

### League Tiers

Ligaer skal defineres med konkret kontekst:

- average squad OVR
- weak/strong team range
- wage range
- facility level
- prestige multiplier
- transfer visibility
- expected player OVR range

V1 starter i `Grassroots Development League`:

- average OVR: 15
- team range: 10-22
- wage range: low cash terms
- facility level: 1
- purpose: give en 10-20 OVR foerstegenerationsspiller et trovaerdigt startmiljoe

Senere tiers skal bruges til transfers, kontrakter, facilities, wage scaling og prestige/legacy rewards.

### Attribute XP Scaling

Attribute level-ups skal ikke koste det samme gennem hele karrieren.

Lavere stats bør være relativt hurtige at forbedre, mens høje stats skal kræve markant mere XP. Det giver en naturlig kurve, hvor tidlig progression føles tydelig, men eliteudvikling kræver bedre miljø, bedre investeringer og længere tid.

Eksempelretning:

- 30 -> 31: lav XP cost
- 40 -> 41: moderat XP cost
- 50 -> 51: højere XP cost
- 60 -> 61: væsentligt højere XP cost
- 70+ -> elite progression: langsomt og krævende

Core rule:

`Attribute level costs should scale upward with current attribute value.`

Training upgrades, support items, club facilities og dynasty bonuses skal mitigere kurven ved at forbedre:

- XP floor
- training efficiency
- variance
- recovery cost per XP
- access to high-level training methods

De skal ikke fjerne kurven. En elite-stat skal stadig føles som noget man bygger over tid.

UI'et skal være tydeligt, når XP requirements stiger. Spilleren skal kunne se:

- XP gained
- XP needed
- progress to next level
- relevante modifiers fra support, club facilities eller dynasty

Ellers risikerer højere XP-krav at føles som skjult nerf i stedet for naturlig progression.

## Position Architecture

Spillet skal understøtte alle markspiller-positioner over tid, men uden at bygge separate spil for hver position. Fundamentet er derfor position modules.

Første scope uden målmand:

- Forward
- Winger
- Midfielder
- Fullback
- Centerback

Hvert position module definerer:

- short code og default archetype
- key attributes til Player/Training UI
- OVR weights for den position
- rating focus, så post-match vurdering kan skifte efter rolle
- manager instructions og tactical focus
- match tendencies, som påvirker involveringsgrad og highlight-typer
- moment pools, så nye positionsspecifikke highlights kan tilføjes senere

Alle spillere beholder stadig alle stats. Positionen afgør kun, hvilke stats der vægtes højest og fremhæves først.

## Striker V1

Angriber er første position, fordi feedbacken er tydelig: mål, assists, chancer, spilletid og form.

Mulige striker-archetypes:

- Poacher
- Clinical Finisher
- Pressing Forward
- Target Man
- Complete Forward
- Link-Up Forward

Angriberens primære stats:

- Finishing
- Off Ball
- Composure
- First Touch
- Acceleration
- Heading
- Strength
- Technique
- Work Rate

Angriberen skal ikke kun vurderes på mål. En god angriberkamp kan også komme fra pres, assists, link-up play, chance creation og taktisk disciplin.

## Match Moments

Kampe består af individuelle moments, genereret ud fra:

- position
- role/archetype
- minutter på banen
- manager trust
- tactical fit
- form
- fitness
- fatigue
- holdets styrke
- modstanderens styrke
- kampens stilling og vigtighed

Eksempler på striker moments:

- Shot chance
- Run behind defensive line
- First-time finish
- Hold-up play
- Aerial duel
- Pressing trigger
- One-on-one chance
- Cutback decision
- Penalty box scramble
- Counterattack choice
- Late equalizer chance
- Defensive set piece

Et moment består af:

1. Situation.
2. 2-4 mulige valg.
3. En resolution baseret på stats, kontekst og randomness.
4. Konsekvenser for rating, confidence, fatigue, trust og kampresultat.


Moment-biblioteket skal vaere bredt nok til, at en saeson ikke foeles loest efter faa kampe. Hver position boer derfor have baade egne moments og faelles moments, og generatoren skal kunne blande dem ud fra position, rolle, score state, service, fitness og modstanderprofil.

Eksempel:

Situation: Du modtager bolden i feltet med en forsvarer tæt på.

Valg:

- First-time shot: høj reward, høj miss-risk. Kræver Finishing, Technique og Composure.
- Take a touch: bedre chance hvis succes, men risiko for blokering. Kræver First Touch og Composure.
- Lay it off: lavere personlig glory, men kan skabe assist og øge manager trust. Kræver Passing og Vision.

## Match Context

Kampen skal altid have en tydelig ramme, foer spilleren trykker Match Day. Spilleren boer vide:

- hvem modstanderen er
- om kampen er hjemme eller ude
- hvilken turnering kampen er i
- hvor vigtig kampen er
- hvilken rolle manageren forventer, at spilleren har
- hvor mange minutter spilleren cirka forventes at faa
- hvilken taktisk instruktion spilleren spiller under

Match context skal bruges af UI, moment-generator og match engine. Det betyder, at en kamp mod en svaer udebanemodstander, en lav trust bench-rolle eller en vigtig cupkamp kan foeles anderledes uden at vi skal bygge en helt ny kampmotor.

## Match Rating

Match rating er central feedback og bør påvirke:

- XP
- manager trust
- fan hype
- form
- morale
- media attention
- contract leverage
- transfer interest

For angriber bør rating vægtes af:

- goals
- assists
- shot quality
- chance conversion
- chance creation
- pressing contribution
- link-up play
- mistakes
- tactical discipline
- opponent level
- minutes played
- expectations for current role

## Manager Trust

Manager trust afgør tidlig progression og spilletid.

Trust stiger ved:

- gode ratings
- god træningsindsats
- tactical fit
- professionalism
- vigtige mål eller aktioner
- accept af rolle eller taktiske instruktioner

Trust falder ved:

- dårlige kampe
- lav fitness
- dårlig morale
- konflikter
- transfer drama
- gentagne taktiske fejl

Trust påvirker:

- om du starter
- hvor mange minutter du får
- om du bliver skiftet ind
- om du får lov at spille favoritrolle
- hvor tålmodig manageren er med fejl
- om klubben tilbyder ny kontrakt

## Training

Training har to lag:

1. General training: baseline XP hver uge.
2. Focus training: spilleren vælger 1-3 fokusområder.

Eksempler på fokus:

- Finishing
- Off Ball Movement
- First Touch
- Physical Conditioning
- Pressing
- Heading
- Link-Up Play
- Composure
- Recovery

Training skal altid have tradeoffs:

- mere XP vs mere fatigue
- kortsigtet kampform vs langsigtet udvikling
- forbedre svagheder vs specialisere styrker
- risiko for skade vs hurtigere progression

### Specialist Programs

Specialist programs are removed from the active weekly training loop for now.

Reason:

- If specialists can be changed freely every week, the optimal choice is simply to match the specialist to the selected stat.
- That creates extra UI without a meaningful decision.
- The current training loop should stay focused on stat focus, intensity, readiness, facilities and support upgrades.

Future specialist direction:

- Specialists can return later as paid, time-limited commitments.
- Example: hire a finishing coach for 8-12 weeks, with a cash cost and limited flexibility.
- This should be part of the economy/support layer, not a free weekly dropdown.

### Training Quality

Every weekly session should have a quality outcome:

- Poor
- Solid
- Sharp
- Breakthrough

Training quality is influenced by:

- fitness/readiness
- morale
- pressure
- club facilities
- nutrition/recovery support
- training and recovery breakthroughs

Quality modifies XP range and should be visible in the Training screen and Development Summary. This gives progression a weekly emotional beat without making match highlights unrealistic.

## Fitness, Fatigue and Injuries

Stamina er en permanent attribute. Fitness/readiness er en dynamisk status fra 0-100.

Readiness bands:

- 80-100: Sharp
- 60-79: Ready
- 40-59: Tired
- 20-39: Risky
- 0-19: Not match fit

Core rule:

`Fitness should create load-management decisions, not frequently block the player from match gameplay.`

60+ readiness should feel close to full effectiveness. Below 60, the player should start feeling managed minutes and slightly weaker actions. Below 40, selection risk and performance risk become meaningful. Below 20, the player is not match fit and should normally be protected by a recovery session rather than allowed to dig a deeper fatigue hole.

Match readiness can fall during the match from minutes and intense player actions. The live match UI should show this as a visible number and band, so the player understands why late actions feel harder.

Recovery upgrades should make the system less swingy:

- reduce training fatigue
- reduce match fatigue
- improve weekly recovery floor
- make hard workloads easier to sustain

Recovery upgrades should be valuable, but not mandatory. A player without recovery investment can still get match involvement, but will more often need managed minutes, recovery weeks and conservative intensity choices.

Lav fitness:

- reducerer match performance
- øger injury risk
- reducerer træningsudbytte
- gør manageren mere tilbøjelig til at rotere spilleren

Skader holdes simple i første version:

- Knock: kortvarig effekt
- Minor Injury: 1-3 uger
- Moderate Injury: 4-8 uger
- Major Injury: sjælden og karrierepåvirkende

## Morale, Form and Pressure

Morale beskriver spillerens mentale tilstand:

- Thriving
- Happy
- Content
- Frustrated
- Disengaged

Form beskriver seneste performance. Pressure beskriver forventninger udefra.

Fame skal ikke kun være positivt. Høj reputation giver flere muligheder, men også højere forventninger og hårdere konsekvenser efter dårlige kampe.

## Economy and Currencies

Spillets economy skal understøtte to forskellige progressionstyper:

1. In-run progression for den aktive spiller.
2. Dynasty progression for fremtidige generationer.

Derfor skal spillet have tre tydeligt adskilte currencies/statusser.

### Cash

Cash er den aktive spillers spendable currency.

Cash kommer primært fra:

- wage
- signing bonus
- appearance bonus
- goal/assist bonus
- sponsor deals
- event rewards

Cash bruges primært på in-run economy:

- boots
- recovery gear
- nutrition plan
- personal coach
- physio
- analyst
- agent services
- lifestyle/morale purchases
- short-term training camps

Core rule:

`Cash is for the current player. Cash should not directly buy permanent dynasty power.`

Det betyder, at spilleren skal have et klart incitament til at bruge sin løn under karrieren. Hvis cash kan gemmes direkte til permanente dynasty upgrades, bliver det optimale ofte at spare alt og farme. Det skal undgås.

### Prestige

Prestige er ikke en spendable currency. Prestige er spillerens aktuelle reputation/status i karrieren.

Prestige påvirker:

- club interest
- transfer visibility
- sponsor interest
- media pressure
- fan expectations
- contract leverage
- retirement legacy value

Prestige kan stige gennem:

- gode ratings
- mål og assists
- vigtige kampmoments
- trophies/promotions
- højere klubniveau
- awards
- langvarig god form

Core rule:

`Prestige is career standing, not a wallet.`

Prestige skal gerne give muligheder og pres, men spilleren skal ikke bruge prestige som en almindelig butik-valuta.

### Prestige Tiers And Sponsor Access

Prestige should be an unbounded career score with readable status tiers, not a 0-100 bar.

Core rule:

`Prestige is accumulated reputation. Prestige tiers unlock opportunities; they are not spent directly.`

The UI should show both the current tier and progress to the next tier, for example:

- `Known Talent`
- `1,240 / 2,000 prestige`
- `760 prestige to Regional Name`

Example tier direction:

- Local Prospect: 0 prestige
- Known Talent: 350 prestige
- Regional Name: 1,500 prestige
- National Profile: 7,500 prestige
- Star Player: 20,000 prestige
- Icon: 50,000 prestige
- Legend: 100,000 prestige

Prestige should scale with context. A goal in a higher division, a cup upset, promotion, a decisive derby moment or a strong season at a visible club should be worth more than routine output in a low-pressure match.

Prestige gain sources:

- goals and assists
- chances created and high ratings
- starts and apps at higher club tiers
- promotions, trophies and cup runs
- awards and season milestones
- signing for a bigger club
- clutch match moments
- sponsor objective completion

Prestige should eventually create pressure too. A higher-profile player gets better sponsors and more interest, but bad runs should carry more scrutiny.

### Sponsors

Sponsors are the bridge between career status and late-run cash growth.

Sponsor offers should be unlocked by prestige tier, player role, club visibility, recent output and agent/career setup. They should not be available immediately in the first weeks of a grassroots career.

Sponsor deals can provide:

- weekly cash retainers
- performance bonuses
- objective-based payouts
- short-term campaign rewards
- pressure or obligation modifiers

Sponsor deals should create interesting choices, not just free money. A high-paying sponsor can add pressure, require starts/goals/ratings, or fit a certain player identity. A safer sponsor can pay less but be easier to complete.

Contracts and sponsors should share a `Career Deals` surface. The contract is the guaranteed income layer; sponsors are status-gated commercial opportunities. This keeps sponsor decisions connected to the player's professional career instead of making them feel like a separate shop.

Sponsor examples:

- Local Boot Deal: small weekly retainer, bonus for goals or decisive actions.
- Regional Fitness Brand: bonus for high availability and strong fitness.
- Youth Academy Ambassador: bonus for apps/starts and morale stability.
- Technical Gear Partner: bonus for chance creation or skill moments.
- National Sportswear Deal: larger retainer, higher pressure, unlocked by strong prestige.

Core rule:

`Contracts are the early cash engine. Sponsors are the mid/late cash accelerator unlocked by prestige.`

This protects the loop: early careers depend on weekly wage and careful cash spending; later careers can break through support-cost walls by earning status, sponsors and better contract leverage.

### Legacy Points

Legacy Points er dynastyens spendable currency.

Legacy Points optjenes primært ved retirement, hvor hele karrieren omregnes til en permanent legacy payout.

Legacy payout kan baseres på:

- career length
- peak OVR
- total apps
- total goals/assists
- average rating
- trophies/promotions
- top club reached
- wage peak
- transfer reputation
- awards
- final prestige

Legacy Points bruges på dynasty economy:

- family home
- home gym
- private pitch
- recovery room
- analysis setup
- mentor network
- academy links
- better starting attribute floor
- better potential floor
- heir support systems

Core rule:

`A stronger active career creates a stronger retirement payout. Legacy Points improve future generations.`

Det skaber en sund incentive loop:

1. Cash bruges på den aktive spiller.
2. In-run upgrades hjælper spilleren med at performe bedre.
3. Bedre performance øger prestige og career achievements.
4. Ved retirement konverteres karrieren til Legacy Points.
5. Legacy Points forbedrer næste generation.

In-run purchases skal derfor aldrig føles som spild, selvom de forsvinder ved retirement. De hjælper spilleren med at opbygge den karriere, der senere bliver til Legacy Points.

### In-Run Economy V1

Første cash-spending layer er `Player Support`.

Player Support er current-run only. Levels hjælper den aktive spiller, men arves ikke direkte som dynasty power.

Support Model V2 replaces broad vague items with concrete, granular upgrade tracks.

Active support effect carriers:

- XP Floor: each level adds `+1` minimum XP to focused weekly training.
- XP Ceiling: each level adds `+1` maximum XP to focused weekly training.
- Second Focus Slot: a 5-step unlock track. When unlocked, the player can train a second stat each week.
- Slot 2 Efficiency: after slot 2 is unlocked, each level adds `+1%` XP efficiency to the second focus slot.
- Third Focus Slot: an 8-step unlock track that only opens after slot 2 is unlocked.
- Slot 3 Efficiency: after slot 3 is unlocked, each level adds `+1%` XP efficiency to the third focus slot.
- Training Load: reduces fitness loss from weekly training intensity.
- Match Recovery: reduces fitness loss from match minutes and player actions.
- Recovery Baseline: improves weekly recovery and the low-fitness protection band.
- Agent Negotiation: each level adds `+1%` wage leverage and `+2%` signing-bonus leverage.
- Sponsorship Appeal: each level adds `+2%` sponsor retainer and objective-bonus payout.

Inactive for now:

- Boots, analyst, lifestyle and freely switchable specialists are not part of the active V2 support loop.
- These themes can return later only if they have concrete, non-overlapping effects and do not make the support screen harder to understand.

Support upgrades skal være stærke nok til, at weekly wage føles brugbar, men små nok til ikke at erstatte attributes, training og match performance som hovedmotor.

### Support Tracks And Breakthroughs

Player Support should be presented as a small number of broad investment tracks, not a long list of equally good micro-upgrades.

V2 support tracks:

- Training: XP floor, XP ceiling, focus-slot unlocks and focus-slot efficiency.
- Recovery: training load, match recovery and recovery baseline.
- Career: agent negotiation and sponsorship appeal.

Each track contains small cash investments. Every investment gives a small immediate level gain through the underlying support systems, but the main player-facing payoff is the track bar.

When a track bar reaches a breakpoint, the player earns a named breakthrough. Breakthroughs are memorable milestones and UI feedback, but the core V2 power comes from the clearly stated per-level effects above.

V2 concrete investment rules:

- Small purchases must say exactly what they add.
- XP floor and XP ceiling use many small levels, so the player frequently has something meaningful to buy.
- Focus-slot unlocks are separate from focus-slot efficiency. Slot 2 and slot 3 should feel weak when first unlocked, then improve through 1% efficiency upgrades.
- Recovery is split into three readable answers: `I get tired from training`, `I get tired from matches`, and `I need a better weekly recovery baseline`.
- Career support is economic. It should improve wages, signing bonuses and sponsor payouts, not secretly improve selection score.

Support cards should show both:

- `Next investment`: the exact change bought by the next cash spend.
- `Current bonuses`: the current concrete effects already active from that track.

Core rule:

`The player chooses between a few long-term support tracks, not a dozen tiny upgrades.`

The granular support items can still exist under the hood as effect carriers, but the UI should group them into readable tracks with progress, cost and next breakthrough.

Support balance lab rules:

- Every broad support track must create a visible difference in season-lab output.
- Training should improve development speed, but poor recovery should still make overtraining costly.
- Recovery should improve availability and consistency, but it must not make fitness irrelevant.
- Career should show up primarily in cash/contract outcomes.
- Sponsorship Appeal should matter only once prestige has unlocked sponsor offers.

Multi-focus training rule:

- Extra focus slots should be unlocked through Training, not available by default.
- Slot 2 starts at 20% XP efficiency when unlocked and can be upgraded by 1 percentage point per level.
- Slot 3 starts at 10% XP efficiency when unlocked and can be upgraded by 1 percentage point per level.
- The first Training breakthrough should unlock the second focus slot so the system matters early enough in a career.
- Primary focus receives full training value.
- Secondary and third focus slots receive reduced XP value, so they represent better training capacity rather than multiplying the entire week.
- Coach/support XP can help weak key attributes, but the weekly player-facing choice should remain stat focus plus intensity.

### In-Run Economy Scaling Direction

In-run upgrades skal designes til en hel karriere på 10-15 sæsoner, ikke kun de første par uger.

V1 levels er placeholders. Den langsigtede model bør understøtte:

- mange levels på brede upgrade tracks
- tiered unlocks
- stigende priser
- soft caps
- diminishing returns
- club-tier access
- always-available cash sinks

Core rule:

`In-run upgrades are career-long progression tracks. V1 levels are placeholders; final tuning should support 10-15 seasons through tiered unlocks, rising costs, soft caps and diminishing returns.`

Upgrade tracks bør opdeles i tiers, eksempelvis:

- Local / Starter
- Semi-Pro
- Professional
- Elite
- World Class

Et tier kan have flere levels, men næste tier kræver typisk en kombination af:

- højere club tier
- bedre contract/wage level
- højere prestige/status
- agent access
- sponsor or staff access

Eksempel:

- Local boots level 1-5
- Semi-Pro boots level 1-5
- Professional boots level 1-5
- Elite boots level 1-5
- World Class boots level 1-5

Når spilleren rammer loftet i et tier, skal det være naturligt, at næste skridt kræver en bedre karrieresituation. Det gør contracts, transfers og club tier vigtige uden at gøre cash irrelevant.

### Cash Sinks and Always-Useful Spending

Cash må aldrig blive dødt, selv når en tier-gated upgrade track midlertidigt er capped.

Core rule:

`Cash should always have at least one meaningful active-run use, even when tier-gated upgrade tracks are temporarily capped.`

In-run economy bør derfor have tre typer cash spending:

1. Tier-gated progression tracks.
2. Always-available repeatable services.
3. High-ceiling retainers/upkeep systems.

Tier-gated progression tracks giver langsigtet ambition:

- boots
- analyst setup
- agent access
- elite coach
- advanced recovery tech

Always-available cash sinks giver spilleren noget meningsfuldt at købe, selv når næste tier er låst:

- extra recovery session
- individual training camp
- mental coach session
- short-term nutrition boost
- travel comfort
- pre-match opposition report
- confidence/form work

Retainers/upkeep systems giver cash en løbende funktion:

- personal staff retainer
- private coach hours
- physio subscription
- agent retainer
- lifestyle management
- media team

Det betyder, at en spiller i en lavere klub godt kan ramme et naturligt gear-loft, men stadig bruge cash på midlertidige services, preparation og recovery, mens de forsøger at performe sig til næste contract eller club tier.

## Contracts

Kontrakter er karrierens økonomiske motor.

En kontrakt kan indeholde:

- weekly wage
- length measured in matchweeks/seasons
- role promise
- signing bonus
- appearance bonus
- goal bonus
- assist bonus
- release clause
- loyalty bonus
- media obligations

Forhandling bør ske gennem pakker eller forhandlingsstile:

- Safe
- Balanced
- Ambitious
- Risky

Hvert forsøg bør have cooldown eller konsekvens, så kontrakter ikke bliver spam-optimering.

Contract V1 direction:

- The starting contract should be intentionally short, so the player meets contract offers early and understands the economy loop.
- Wage is paid weekly, so the player has continuous cash flow during the active career.
- Match bonuses are paid after games and should be tied to the current contract.
- Role promise should affect selection context, but not remove performance pressure.
- Better season performance should create better renewal packages: higher weekly wage, stronger bonuses, better role promise or larger signing bonus.
- Contract money feeds in-run economy. It should make boots, recovery, coaching, agent services and other active-career purchases feel reachable.

Contract V2 direction:

- Contract offers should be club-led: the club presents an offer when the current deal is expiring, or when performances make an improved deal believable.
- Offers should be shown as a dedicated `Club offer` screen before returning to the normal career loop.
- The offer should compare current terms against new terms: weekly wage, role promise, length, signing bonus and match bonuses.
- The player can accept immediately or decline for now. Declining should not end the career, but leaves the player on current/expired terms until another offer is triggered.
- If a player declines and the contract expires, the next offer should come from the contract market rather than automatically from the same club.
- Expired-contract market offers should usually come from same-tier or lower-status clubs, with higher-tier offers reserved for strong OVR, form, prestige or agent leverage.
- Letting a contract run down should become a valid future strategy for forcing a move, but it should carry risk: worse wages, lower role/status or less prestigious clubs can be the fallback.
- Better Agent and Career Setup upgrades should improve wage and signing bonus negotiation, not directly create permanent power.
- Contract offers must be part of balance lab economy because higher wages determine how quickly in-run support upgrades become reachable.

## Club State

Club identity must be saveable simulation state, not hardcoded UI text.

Club V1 state should include:

- club name
- short name/code
- league tier
- squad strength
- facility context through the league tier

When the player accepts an external contract offer, the active club should update immediately. Future fixtures, league table context, match headers, season history, training facilities and selection comparisons should use the new club state.

V1 can regenerate the remaining fixture list from tier templates while preserving already played results. Later transfer/league versions should replace this with true club-specific divisions, promotion/relegation, transfer windows and persistent league memberships.

## End Week Summary

End Week Summary er ugens samlede payoff-skærm.

Den skal vises efter post-match summary og før næste uge/season review.

Formålet er at samle alle vigtige ændringer, så spilleren tydeligt kan mærke progression uden at skulle lede efter tallene på flere skærme.

End Week Summary bør vise:

- economy: weekly wage, bonuses, net cash og cash balance
- development: training XP, match XP, level-ups og vigtigste attribute gains
- career movement: rating, selection score, manager trust og prestige
- condition: fitness, morale og fatigue impact fra træning/kamp
- season: kampresultat, record og næste modstander eller season review status

Skærmen skal være kompakt og scanbar. Den må gerne føles tilfredsstillende, men skal ikke erstatte de mere detaljerede training- og post-match summaries.

## Transfers

Transfers sker primært i vinduer/offseason.

Klubinteresse bør afhænge af:

- position need
- role fit
- recent form
- age
- potential
- reputation
- current league level
- contract length
- wage demand
- tactical fit
- agent quality
- personality/professionalism

Transfer-valg skal have tradeoffs:

- større klub, mindre spilletid
- mindre klub, større rolle
- høj løn, dårligere udvikling
- lav løn, bedre faciliteter
- kort kontrakt, mere frihed
- lang kontrakt, mere sikkerhed

## Equipment and Personal Support

Equipment skal være realistisk og incremental.

Eksempler:

- Boots: små bonuses til acceleration, touch eller shot execution.
- Recovery gear: bedre weekly recovery.
- Nutrition plan: lavere fatigue og injury risk.
- Personal analyst: bedre moment feedback og tactical fit.
- Private coach: ekstra XP til specifikke fokusområder.

Udstyr bør primært give små modifiers, ikke store direkte attribute boosts.

## Personal Facilities

Egne faciliteter fungerer som prestige-lag og legacy-fundament.

Eksempler:

- Backyard Pitch
- Home Gym
- Recovery Room
- Analysis Setup
- Private Training Complex
- Family Academy

Effekter:

- højere training efficiency
- bedre recovery
- mere XP fra bestemte fokusområder
- bedre offseason development
- bedre start for næste generation

Permanente dynasty-faciliteter bør primært koste Legacy Points og eventuelt være låst bag career milestones. Midlertidige private services i den aktive karriere kan koste cash, men skal ikke give permanent dynasty power direkte.

## Relationships

Relationer skal give dybde uden at blive for tunge.

Vigtige relationer:

- Manager
- Teammates
- Agent
- Fans
- Media
- Family/Mentor

Relationer bør primært drives af simple bars og events.

## Aging and Career Phases

Karrieren har en naturlig livsbue:

- 16-20: høj udvikling, lav consistency
- 21-25: hurtig vækst, stigende trust
- 26-29: peak
- 30-33: langsom decline, mental og teknisk styrke holder længere
- 34+: fysisk decline, legacy og retirement fylder mere

Ældre spillere kan stadig være stærke via Composure, Positioning, Technique, Mentality og Consistency.

## Retirement and Legacy

Retirement bør være et valg, ikke kun en fast alder.

Mulige retirement paths:

- Retire early at peak: større fame legacy, færre penge.
- Play long career: flere penge og records, større decline/injury risk.
- Become club legend: kræver loyalitet.
- Chase trophies: kræver strategiske klubskifter.
- Mentor son: bedre næste generation-start.

Legacy kan give:

- bedre starting attribute floor
- bedre potential floor
- adgang til private facilities
- surname reputation
- bedre agent network
- mentor bonus
- family security baseline
- unlocked training methods

Famous surname bør også kunne give højere pressure.

## Open Design Questions

- Hvor detaljeret skal kampmoment-interaktionen være i første prototype?
- Skal alle valg vise sandsynligheder, delvise hints eller ingen tal?
- Hvor meget randomness er acceptabelt, før spilleren føler sig snydt?
- Hvordan balanceres mål/assists mod usynligt godt angriberspil?
- Hvordan undgår vi at weekly loop bliver rutineklik?
- Hvornår skal kontrakter og transfers introduceres i spillerens første karriere?
- Hvor meget skal sønnen arve fra faren uden at early-game forsvinder?

## Career-Long In-Run Upgrade Direction

In-run economy should have enough meaningful spending targets for a 15-20 season career. The player should rarely feel that cash is solved or that every useful upgrade is maxed.

Upgrade families:

- Core Support: broad, always useful, many levels. Examples: Personal Coach, Recovery Team, Nutrition Plan, Analyst Setup, Agent, Lifestyle Support.
- Performance Gear: role/build flavored upgrades. Examples: Boots, recovery wear, GPS/watch, specialist equipment for shooting, pace, passing or strength.
- Private Training: targeted development routes. Examples: finishing coach, speed coach, strength coach, technical coach, mental coach and position coach.
- Career Infrastructure: expensive late-career systems. Examples: personal physio, private chef, elite coach retainer, agency representation, brand/media manager and personal training camp.
- Repeatable Cash Sinks: seasonal or short-term services that keep cash useful. Examples: training camp, recovery retreat, specialist boot fitting, match-prep package and one-season coach contracts.

Balance rules:

- Baseline progression must be playable, but not optimal.
- Cash upgrades should improve floor, consistency and mitigation before raw power.
- Higher wages should open better support loops, not directly buy permanent dynasty power.
- Some upgrade levels can be club-tier or reputation-gated, but not every useful cash spend should be gated.
- Repeatable services should exist so the player always has something useful to buy during long careers.

V1 implementation direction:

- Player Support tracks should have many levels with rising prices.
- Effects should use diminishing returns so early levels feel useful and late levels remain valuable without removing tradeoffs.
- Recovery upgrades should help the player train and play more often, but should not make fatigue irrelevant.
- Personal Coach should improve training XP floor/ceiling over time rather than giving direct attribute jumps.

## Club Development Environment

Club tier and facilities are a core progression layer. Higher clubs should not only pay more; they should provide a stronger development environment.

Development environment affects:

- training XP multiplier
- training XP floor
- recovery support
- support upgrade efficiency

Design direction:

- Grassroots facilities are playable but limited.
- Semi-pro and pro facilities make paid support upgrades more valuable.
- Top clubs create better consistency and recovery, but the player must still be good enough relative to the league.
- Better facilities should accelerate development without making fatigue irrelevant.
- Long-career progression should come from the full stack: baseline training, cash support, club facilities, growth profile, age curve and dynasty upgrades.

Important rule:

`There should be no hard potential wall. Past the player's natural growth profile, progress should become slower and more expensive unless the player has earned better conditions through generation quality, dynasty upgrades, club facilities, career choices or special development events.`

### Sponsor Deals V1

Sponsor deals are part of the active-career economy, not dynasty spending.

Core V1 rules:

- Prestige unlocks sponsor access.
- Cash from sponsors is spendable in the current run only.
- The player can hold one active sponsor deal at a time.
- Each sponsor has a weekly retainer, one match objective bonus, a duration and a pressure modifier.
- Sponsor objectives are concrete: appearance, goal, assist or rating target.
- Sponsor deals expire after their duration and can be replaced by new offers.

Design intent:

- Contracts fund the early run.
- Prestige unlocks sponsor access.
- Sponsors help bridge mid-career upgrade walls.
- Sponsor pressure makes bigger deals a tradeoff instead of a strict upgrade.
- Sponsor balance must be tested together with minutes, output, recovery and upgrade prices.
