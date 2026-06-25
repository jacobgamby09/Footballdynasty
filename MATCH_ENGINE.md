# Match Engine Design

## Purpose

Match engine er spillets vigtigste system. Den skal forbinde attributes, traening, rolle, modstander, kampkontekst og career progression paa en maade, der foeles fair, realistisk og varieret.

Hvis spilleren bliver bedre, skal kampen foeles anderledes. Hvis modstanderen er anderledes, skal kampen foeles anderledes. Hvis kampens score state aendrer sig, skal events og valg foeles anderledes.

## Design Goals

- Stats skal paavirke baade hvilke highlights spilleren faar, og hvordan de bliver afgjort.
- Modstandere skal have profiler, ikke kun en samlet strength-score.
- Kampen skal kunne ende forskelligt, selv fra samme career-state.
- Randomness skal skabe variation, men ikke foeles som ren terning.
- Outcomes skal kunne forklares med konkrete aarsager.
- Engine-data skal kunne bruges af UI: pre-match, live moments, post-match, XP og readiness.
- Foerste robuste version skal vaere striker-first, men strukturen skal kunne udvides til andre positioner.

## Relative Ability Model

Match engine maa ikke behandle en raw 18 OVR spiller ens i alle ligaer. Den skal foerst forstaa kampens niveau.

Core rule:

`raw player ability -> league-adjusted match ability -> resolution`

UI viser raw attributes og raw OVR, fordi de beskriver dynasty progression paa den globale 1-100 skala. Selve match engine bruger en kontekstjusteret score, hvor ligaens average OVR bliver engine baseline.

Eksempel:

- Player Finishing 18 i en 15 OVR liga bliver behandlet som lidt over kampens baseline.
- Player Finishing 18 i en 45 OVR liga bliver behandlet som langt under kampens baseline.
- Opponent profiles normaliseres paa samme maade i player highlight resolution.

Team score simulation bruger stadig raw team/opponent strength, fordi holdenes xG skal komme fra forskellen mellem klubberne i den konkrete liga.

Dette goer det muligt at starte dynastyen med meget lave stats uden at spilleren foeles broken, og det goer samtidig transfers til hoejere tiers risikable.

## Non-Goals For V2

- Fuld 22-spiller taktisk simulation.
- Real-time pitch visualisering.
- Perfekt xG-model.
- Manager/club AI paa Football Manager-niveau.

V2 skal ikke simulere alt. Den skal simulere nok til, at spilleren tror paa sammenhaengen mellem egne stats, modstanderen, kampen og resultatet.

## Engine Layers

### 1. Match Setup

Match setup oprettes foer live-kampen starter og skal indeholde:

- fixture id
- match seed
- home/away
- competition
- match importance
- team profile
- opponent profile
- player role
- expected minutes
- entry plan
- tactical focus
- manager instruction
- selection score
- weather/tempo later

Match setup maa gerne vises i pre-match screen, men maa ikke afsloere praecise interne minutter eller procenter.

### 2. Match State

Match state udvikler sig minut for minut:

- minute
- score
- momentum
- team fatigue
- opponent fatigue
- player fatigue
- tactical pressure
- score state: leading, level, trailing
- game phase: early, first half, second half, late, stoppage

Match state skal paavirke:

- sandsynlighed for team/opponent events
- sandsynlighed for player highlight
- substitution timing
- risk/reward i player moments
- rating impact

### 3. Highlight Generator

Highlight generator vaelger, hvilke moments der opstaar.

Den skal tage hoejde for:

- player position
- player role
- player attributes
- player fatigue
- manager trust
- tactical focus
- service level
- opponent defensive profile
- score state
- match phase

Eksempel:

- Hoj Off Ball + hoj service + langsomme centerbacks = flere runs behind.
- Lav First Touch + hoej opponent pressing = flere bad-touch/under-pressure moments.
- Hoj Strength + lav service = flere hold-up moments.
- Hoj Work Rate + trailing late = flere pressing/defensive effort moments.

### 3a. Highlight Volume

Player moments must scale with actual minutes played. A player who enters in the 78th minute should not receive the same action volume as a starter.

V1 rule:

- Moment count is based on minutes played, role and involvement score.
- Short sub appearances can produce zero moments.
- Impact subs should usually get zero to two moments depending on entry time and match context.
- Starters and long rotation appearances can get several moments, but still within a believable per-90 range.
- Progression balance should not rely on inflated match volume. If development is too slow, training, support, facilities and XP curves should carry that weight.

### 3b. Chained Player Moments

Not every player highlight should end after one click. Some successful or partially successful actions can create a follow-up decision in the same move.

Example:

1. Player beats a defender.
2. The move continues immediately.
3. Player chooses between shot, cutback, cross/pass or retaining the attack.

Design rules:

- Most highlights remain one-step, so match flow stays quick.
- Good/Great outcomes have the best chance to create a follow-up.
- Okay outcomes can rarely create a weaker follow-up.
- Poor outcomes stop the chain.
- V1 caps chains at one follow-up to avoid long or repetitive sequences.
- Follow-ups should feel like the same move continuing, not a random new highlight.

Chained moments make attributes feel richer: Dribbling, Strength, First Touch, Work Rate or Pace can create the platform for a later Finishing, Vision or Passing decision.

### 4. Resolution Engine

Resolution engine afgoer outcome for et highlight.

Input:

- choice
- relevant player attributes
- relevant opponent attributes
- fatigue
- morale
- pressure
- form
- match phase
- score state
- home/away
- randomness

Output:

- success/failure/partial
- goal/assist/chance/miss/turnover/trust action
- rating delta
- trust delta
- fitness delta
- morale/pressure impact
- XP by involved attributes
- explanation tags

Resolution skal ikke bare returnere "success". Den skal returnere hvorfor.

### Chance Creation vs Assists

Assist-type choices should not become assists directly.

V1 rule:

- A successful assist action creates a chance.
- The player only receives an assist if the teammate converts that chance.
- Conversion is based on chance quality, outcome tier and opponent keeper/defense.
- Created chances are tracked separately in match UI, post-match report and balance labs.

This keeps creative play rewarding without making early-career assists unrealistically high. A good pass can still improve rating, trust and XP even if the teammate misses.

## Attribute Mapping

Alle spillere har alle stats. Positionen bestemmer vaegtning og synlighed, ikke om statten eksisterer.

### Technical

| Attribute | Primary Effects |
| --- | --- |
| Finishing | Shot conversion, first-time shots, close-range chances |
| Long Shots | Edge-of-box shots, low-service matches, rebounds |
| Passing | Layoffs, link-up play, simple assists, keeping attacks alive |
| Vision | Through balls, cutbacks, creative assists, choosing high-value options |
| Dribbling | Beating a defender, carrying into space, creating own shot |
| First Touch | Receiving under pressure, controlling through balls, setting shot quality |
| Heading | Aerial chances, defensive set pieces, crosses |

### Physical

| Attribute | Primary Effects |
| --- | --- |
| Acceleration | First steps, separation, reactions to loose balls |
| Pace | Long runs, counters, staying ahead of defenders |
| Stamina | Late-game effectiveness, repeated actions, pressing durability |
| Strength | Hold-up play, duels, shielding, target-man moments |

### Mental

| Attribute | Primary Effects |
| --- | --- |
| Off Ball | Chance volume, positioning, timing runs, finding space |
| Composure | High-pressure finishing, late chances, 1v1s, risky choices |
| Work Rate | Pressing, tracking back, manager trust actions |
| Positioning | Defensive shape, rebounds, being in the right place |
| Tackling | Defensive interventions, pressing outcomes |
| Marking | Set piece defending, tracking assignments |

## Position Architecture

Match engine skal vaere faelles for alle positioner, men positionen skal aendre:

- hvilke highlights spilleren typisk faar
- hvilke stats der vaegtes hoejest
- hvilke modstander-stats der counter spilleren
- hvordan match rating beregnes
- hvilke handlinger manageren beloenner
- hvilke XP-kilder der forekommer oftest

Vi bygger ikke separate kampmaskiner pr. position. Vi bygger en faelles engine med position modules.

### Position Groups

Foerste scope skal understoette disse position groups:

- Forward
- Winger
- Midfielder
- Fullback
- Centerback

Goalkeeper er bevidst udenfor scope for nu.

### Position Module Shape

Et position module boer definere:

```ts
type PositionGroup =
  | "Forward"
  | "Winger"
  | "Midfielder"
  | "Fullback"
  | "Centerback";

type PositionModule = {
  group: PositionGroup;
  displayName: string;
  shortCode: string;
  defaultArchetype: string;
  keyAttributes: AttributeKey[];
  ovrWeights: Partial<Record<AttributeKey, number>>;
  momentPools: PositionMomentPool[];
  matchTendencies: {
    involvementBias: Record<MatchRole, number>;
    attacking: number;
    chanceCreation: number;
    possession: number;
    defending: number;
    transition: number;
    preferredForwardCategories: ForwardHighlightCategory[];
  };
  highlightCategories: string[];
  ratingFocus: string[];
  tacticalFocuses: TacticalFocusSet;
  managerInstructions: Record<MatchRole, ManagerInstruction>;
};
```

Current implementation lives in `src/positionRoles.ts`. The app uses this module for OVR, key attributes, tactical focus, match-generation bias and moment pool selection.

The first position moment libraries live in `src/engine/forwardMoments.js`:

- Forward
- Winger
- Midfielder
- Fullback
- Centerback
- Shared

These libraries intentionally reuse the current core engine categories while changing situation text, choices and attribute requirements by position. This gives match variety now without creating separate resolution engines per position.

Position modules also define `performanceWeights`, which let the same outcome mean different things by position. A goal is heavily rewarded for a Forward, assists and transition actions matter more for a Winger, possession/link-up matters more for a Midfielder, and defensive actions matter more for Fullbacks and Centerbacks. This keeps future positions from being judged like strikers.

### Forward Module

Primary fantasy:

- score goals
- create chances
- attack space
- hold up play
- press defenders

Likely key attributes:

- Finishing
- Off Ball
- Composure
- First Touch
- Acceleration
- Heading
- Strength
- Work Rate

Common highlights:

- shot chance
- first-time finish
- one-on-one
- run behind
- hold-up play
- aerial duel
- pressing trigger
- cutback decision
- late pressure chance

Opponent counters:

- keeper
- centerBackPace
- aerialDefense
- defensiveLine
- pressing
- discipline

Rating should reward:

- goals
- assists
- shot quality
- chance creation
- good pressing
- hold-up success
- role discipline

### Winger Module

Primary fantasy:

- beat fullbacks
- create from wide areas
- carry in transition
- cross/cut back
- track runs defensively

Likely key attributes:

- Pace
- Acceleration
- Dribbling
- Passing
- Vision
- First Touch
- Work Rate
- Stamina

Common highlights:

- wide 1v1
- early cross
- cutback
- counter carry
- far-post run
- overlap/underlap link
- track fullback
- press touchline

Opponent counters:

- fullbackPace later
- defensiveLine
- pressing
- discipline
- stamina/fatigueResistance

Rating should reward:

- assists
- chances created
- successful carries
- useful crosses/cutbacks
- defensive work
- turnovers avoided

### Midfielder Module

Primary fantasy:

- control tempo
- receive under pressure
- progress the ball
- create chances
- win midfield duels

Likely key attributes:

- Passing
- Vision
- First Touch
- Composure
- Positioning
- Work Rate
- Stamina
- Tackling

Common highlights:

- receive under pressure
- through ball
- switch play
- late box arrival
- interception
- tackle in midfield
- keep possession under press
- counter-prevention foul/duel

Opponent counters:

- pressing
- midfield
- discipline
- defensiveLine
- fatigueResistance

Rating should reward:

- progressive passes
- chance creation
- ball wins
- tempo control
- press resistance
- low-error possession

### Fullback Module

Primary fantasy:

- defend wide channels
- overlap and cross
- recover defensively
- support attacks without losing shape

Likely key attributes:

- Pace
- Stamina
- Work Rate
- Tackling
- Positioning
- Marking
- Passing
- First Touch

Common highlights:

- 1v1 defending wide
- recovery run
- overlap
- cross under pressure
- back-post marking
- stop counter
- support winger
- defensive clearance

Opponent counters:

- wingerPace later
- pressing
- attack
- defensiveLine
- discipline

Rating should reward:

- defensive duels
- recoveries
- crosses/cutbacks
- interceptions
- shape discipline
- low-error defending

### Centerback Module

Primary fantasy:

- win duels
- mark strikers
- block shots
- control the defensive line
- contribute on set pieces

Likely key attributes:

- Strength
- Heading
- Marking
- Positioning
- Tackling
- Composure
- Work Rate
- Passing

Common highlights:

- aerial clearance
- mark striker run
- block shot
- step out/intercept
- last-man duel
- set-piece defense
- set-piece attack
- calm pass under pressure

Opponent counters:

- forwardPace later
- forwardStrength later
- aerialThreat later
- attack
- pressing

Rating should reward:

- duels won
- blocks
- interceptions
- clearances
- errors avoided
- set-piece impact
- clean-sheet context

### Global Rule

Position changes frequency and weighting, not possibility.

A Forward can still get XP from Tackling if they make a pressing tackle. A Centerback can still gain Heading/Composure from an attacking set piece. A Midfielder can still score. The engine should create likely football patterns without locking players out of unusual moments.

## Opponent Profiles

Opponent skal udvides fra simple `opponentStrength` til en profil.

### Suggested Opponent Profile Fields

- overall
- defense
- attack
- midfield
- keeper
- centerBackPace
- aerialDefense
- defensiveLine: low/mid/high
- pressing: passive/balanced/aggressive
- discipline
- fatigueResistance
- form
- homeAdvantage

### How Profiles Affect Striker Moments

- High defensive line + low CB pace: more run-behind moments.
- Low block + strong aerial defense: fewer clean central shots, more long shots/layoffs.
- Aggressive pressing: more first-touch pressure and turnovers.
- Weak keeper: higher shot conversion and rebound chance.
- Strong aerial defense: heading moments harder, hold-up duels harder.
- Poor discipline: more fouls, set pieces, penalties later.

## Chance Quality

Internally, attacking moments should have chance quality.

Suggested labels:

- Tap-in
- Clear chance
- Good chance
- Half chance
- Difficult angle
- Low-percentage

Chance quality should be generated from:

- service level
- tactical focus
- player Off Ball
- player First Touch
- opponent defense
- pressure from defender
- match state

Internal chance quality can still use terms such as "Clear chance" or "Under
pressure". At the decision point, the player sees a three-outcome probability
preview rounded to 5% steps. It is produced by sampling the real choice resolver,
not by exposing one internal chance-quality percentage.

## Resolution Formula V2

Use a weighted score:

```text
player_score =
  weighted_player_attributes
  + form_modifier
  + morale_modifier
  + fitness_modifier
  + tactical_fit_modifier
  + choice_fit_modifier

opponent_score =
  weighted_opponent_attributes
  + home_away_modifier
  + momentum_modifier
  + pressure_modifier

success_margin =
  player_score
  - opponent_score
  + chance_quality_modifier
  + controlled_variance
```

Outcome bands:

- big success
- success
- partial success
- failure
- bad failure

This is better than binary success/fail because football often has useful failures and imperfect successes.

Example:

- Big success: goal.
- Success: shot on target / assist / strong trust gain.
- Partial: chance created but saved, small trust gain, XP still earned.
- Failure: move breaks down.
- Bad failure: counter risk, trust loss, high fatigue.

## Controlled Variance

Randomness should be bounded and contextual.

Rules:

- High attributes should move the floor up.
- Better facilities/coaching later should reduce development randomness, not match randomness.
- Big mismatches should still usually show.
- Upsets should happen, but not constantly.
- Same fixture replay can differ, but a 90 OVR striker should not feel equal to a 45 OVR striker.

Suggested variance:

- Low-risk choice: small variance, lower ceiling.
- Medium-risk choice: medium variance.
- High-risk choice: larger variance, higher ceiling and lower floor.

## Match Rating

Match rating should come from multiple components:

- base for minutes played
- goals
- assists
- shot quality and shot outcome
- chance creation
- pressing/trust actions
- turnovers
- defensive effort
- fatigue context
- role expectation
- match importance

Important principle:

A striker can have a good rating without scoring if they create chances, press well, hold up play, or assist. Scoring should matter a lot, but not be the only path.

## XP Rules

XP should be tied to action involvement.

- Attributes used in a choice gain XP.
- Harder context gives slightly more XP.
- Success gives more XP than failure.
- Failure still gives some XP if the player attempted a relevant action.
- Auto-simmed highlights should give XP, but slightly less than manual choices if needed for balance.

XP should not imply attribute level-up directly in post-match UI. Always label as XP.

## Explanation Tags

Every resolved highlight should produce explanation tags.

Examples:

- `finishing_helped`
- `composure_under_pressure`
- `poor_first_touch`
- `defender_pace_matched`
- `keeper_quality_denied`
- `fatigue_late_game`
- `good_off_ball_run`
- `low_service_half_chance`

UI can turn these into short readable lines:

- "Your Off Ball created the separation."
- "Low service made this a half chance."
- "The keeper quality kept it out."
- "Fatigue reduced your final action."

This is essential for making the engine feel fair.

## Testing And Balancing

We need a dev simulation harness.

There are now two balance layers:

- `npm run balance:match` tests isolated match outcomes and player highlight behavior.
- `npm run balance:season` tests full-season progression across training, role selection, minutes, match output, XP, trust and fitness.

The season lab should be used before major tuning decisions because player output must emerge from career progression, not from a static one-match snapshot.

It should run batches like:

- 1000 matches: low striker vs average opponent
- 1000 matches: high striker vs average opponent
- 1000 matches: average striker vs elite defense
- 1000 matches: tired striker vs fresh striker
- 1000 matches: impact sub vs starter

Track:

- average team goals
- average opponent goals
- player goals
- assists
- average rating
- chance volume
- conversion rate
- XP per match
- trust delta
- role progression speed
- upset frequency
- repeated event frequency

Target: use data to tune, not vibes alone.

## Implementation Plan

### Phase 1 - Structure

- Create typed opponent profiles.
- Create typed team profile.
- Move match setup into a dedicated builder.
- Add match state score phase helpers.
- Keep current UI stable.

### Phase 2 - Highlight Taxonomy

- Define striker highlight categories:
  - shot
  - first-time finish
  - run behind
  - hold-up
  - aerial duel
  - press
  - link-up
  - counter
  - defensive set piece
  - late pressure chance
- Give each category:
  - trigger weights
  - required role/minute context
  - primary stats
  - opponent counters
  - possible choices

### Phase 3 - Resolution V2

- Replace simple threshold checks with player_score vs opponent_score.
- Add outcome bands.
- Add explanation tags.
- Add chance quality.
- Add rating delta composition.

### Phase 4 - Debug Tools

- Add a local batch simulator script.
- Output JSON/CSV summaries.
- Add simple tuning constants in one place.
- Use results to tune role progression, goals, XP and ratings.

### Phase 5 - UI Integration

- Pre-match shows opponent profile in readable terms.
- Match moments show chance quality and pressure labels.
- Result screen explains 1-2 key reasons.
- Post-match summary shows XP and performance breakdown.

## Current Risk

The current prototype has improved variance, but still mixes:

- event generation
- match state
- player moments
- resolution
- rating
- XP

inside one file and mostly one flow. The next serious engine step should separate these concepts before adding many more highlights.
