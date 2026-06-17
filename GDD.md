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

## Fitness, Fatigue and Injuries

Stamina er en permanent attribute. Fitness/readiness er en dynamisk status fra 0-100.

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

Første support categories:

- Match boots: small match execution/rating support.
- Recovery kit: reduces match fatigue.
- Personal coach: raises weekly training XP floor.
- Nutrition plan: softens training fatigue.
- Video analyst: improves selection/match prep.
- Better agent: improves contract wage and signing bonus negotiation.
- Lifestyle support: improves morale/match sharpness slightly, with future pressure tradeoff potential.

Support upgrades skal være stærke nok til, at weekly wage føles brugbar, men små nok til ikke at erstatte attributes, training og match performance som hovedmotor.

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

- Wage is paid weekly, so the player has continuous cash flow during the active career.
- Match bonuses are paid after games and should be tied to the current contract.
- Role promise should affect selection context, but not remove performance pressure.
- Better season performance should create better renewal packages: higher weekly wage, stronger bonuses, better role promise or larger signing bonus.
- Contract money feeds in-run economy. It should make boots, recovery, coaching, agent services and other active-career purchases feel reachable.

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
