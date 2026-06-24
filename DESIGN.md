# Football Dynasty - Visual Design and UI Direction

## Design Goal

Football Dynasty skal have en mobile-first UI, der føles som et kompakt sports-dashboard for én spillers karriere. Player screen er hovedskærmen og skal fungere som spillets "home screen": et hurtigt, informativt overblik over spillerens identitet, klub, rolle, udvikling, form, relationer og næste vigtige handling.

UI'et skal føles moderne, mørkt, premium og sportsligt, men stadig læsbart og funktionelt. Det skal have incremental tilfredsstillelse gennem bars, stats, små badges, progression cards og tydelige forbedringer, uden at blive et urealistisk casino- eller fantasy-interface.

## Visual References

Retningen tager inspiration fra de vedhæftede screenshots:

- `C:/Users/JacobGamby/Downloads/download.jpg`
- `C:/Users/JacobGamby/Downloads/Home _ X.jpg`
- `C:/Users/JacobGamby/Downloads/모바일 토토 플랫폼에서 유저의 이탈을 막고 체류 시간을 늘리는 브라우징 최적화 노하우.jpg`
- `C:/Users/JacobGamby/Downloads/Mobile UI optimization techniques to reduce new user churn and double platform retention time.jpg`

Vigtige takeaways:

- mørk baggrund
- afrundede, kompakte cards
- lime/grøn og gul/orange accentfarver
- mange data points, men pakket i klare moduler
- mobile-first bottom navigation
- stærk topsektion med identitet og status
- sports-dashboard energi
- små highlights, badges og progress bars

## Core UI Principles

### Mobile First

Designes først til mobil. Desktop/tablet kan senere vise samme moduler i flere kolonner, men mobiloplevelsen er den primære.

Standard target:

- 390px bredde som primær design-reference.
- 360px som minimumscheck.
- 430px som større mobilcheck.

### Dashboard, Not Landing Page

Første skærm er ikke en marketingforside. Den er spillerens karriere-dashboard. Brugeren skal straks kunne se:

- hvem de er
- hvor de spiller
- hvor gode de er
- hvordan formen er
- hvad næste vigtige handling er

### Dense But Legible

UI'et må gerne være tæt og data-rigt, men det skal aldrig føles rodet. Hvert card skal have én klar funktion.

Regel:

- ét card = én beslutning, én statusgruppe eller én progressionstype.

### Realistic Sport Premium

Stilen skal føles som moderne football analytics, ikke som fantasy RPG. Effekter, glows og neon kan bruges, men kun som accent.

## Mood Keywords

- dark
- premium
- compact
- athletic
- tactical
- data-rich
- incremental
- career-focused
- sharp
- modern
- mobile-native

## Color Direction

### Base Palette

- App background: near-black charcoal
- Surface: dark graphite
- Elevated surface: soft black/charcoal card
- Borders: subtle grey with low opacity
- Primary text: warm white
- Secondary text: muted grey
- Disabled text: deep grey

### Accent Palette

Primary accent:

- lime green for progress, growth, ready states and selected navigation.

Secondary accent:

- gold/yellow for prestige, goals, ratings, contract value and standout achievements.

Warning accent:

- orange for fatigue, pressure, risk and intense training.

Negative accent:

- red only for injury, morale problems, failed negotiations or serious decline.

Cool accent:

- electric blue can be used sparingly for analytics, tactical fit and match insights.

### Usage Rules

- Lime green is the main interaction/progression color.
- Gold is reserved for high-value career signals.
- Avoid making every card glow.
- Avoid large gradients as primary backgrounds.
- Use dark surfaces and subtle borders as the main structure.
- Progress bars should be readable at small sizes.
- The overall app should lean more lime/progression than gold/prestige. Gold is special, not constant.

## Typography

The type system should feel compact and sports-like.

Recommended direction:

- Use a clean sans-serif for all UI.
- Use tabular numbers for stats, ratings, wages and percentages.
- Use strong numeric hierarchy: big numbers should be instantly scannable.
- Avoid decorative fonts except possibly in logo/brand.

Type scale direction:

- Screen title: 24-30px
- Key player rating/OVR: 36-48px
- Card headings: 13-16px
- Stat labels: 10-12px
- Body copy: 13-15px
- Microcopy: 10-11px

### OVR And Potential Presentation

OVR is one of the most important player identity numbers and should feel prominent, centered and tappable.

The OVR detail modal should explain:

- current position-based OVR
- growth profile / projected trajectory, when relevant
- which attributes are weighted for the active position
- generation tier, when relevant

Potential should not be presented as a hard ceiling or as a second competing OVR on the main Player card. If shown, it should explain the player's current growth curve: progress is easier below expectation, slower near the natural development zone, and very expensive beyond it unless training, support, facilities, performance and dynasty advantages improve the situation.

## Layout System

### Spacing

Use a tight 4px/8px spacing rhythm.

Suggested values:

- screen padding: 16px
- card padding: 12-16px
- card gap: 10-12px
- internal compact gap: 4-8px

### Cards

Cards should be compact, dark and slightly elevated.

Recommended card style:

- border radius: 8-14px
- background: dark graphite
- border: 1px subtle grey/white opacity
- shadow: minimal or none
- glow: only for selected, upgraded or high-prestige elements

Avoid cards inside cards unless the inner unit is a small badge/stat chip.

### Navigation

Primary navigation should be bottom navigation on mobile.

Locked initial nav proposal:

- Player
- Training
- Club
- Home

The nav should also include one larger central action button for advancing time.

Central action states:

- Advance
- Next Week
- Match Day
- Continue Recovery
- Contract Meeting

Suggested layout:

- Left side: Player, Training
- Center: large Advance/Match Day button
- Right side: Club, Home

The center button is the primary engine of the game loop. It should feel important, but not oversized enough to dominate every screen.

Progression rule:

- The center button should always represent the next required progression action in the current flow.
- Screens should avoid separate full-width "continue" buttons when the center button can perform the same action.
- Examples: `Training` opens training, `Start Training` completes the session, `Continue Career` leaves a recap, `Match Day` starts the next fixture.
- Content buttons should be reserved for local choices, navigation, filters, details, or optional actions.

## Player Screen

Player screen is the main screen. It must be the best screen in the game.

Purpose:

- Give complete career status at a glance.
- Show the most important current decisions.
- Make progression visible.
- Create emotional attachment to the player.

### Player Screen Information Hierarchy

Top priority:

- player name
- age
- club
- position
- role/archetype
- OVR/current ability
- growth profile or projected trajectory
- form
- fitness
- manager trust

Second priority:

- key attributes
- match rating trend
- playing time/status
- morale
- contract status
- wage
- transfer interest

Third priority:

- relationships
- equipment
- facilities bonuses
- reputation
- season stats
- career milestones

### Suggested Player Screen Structure

#### 1. Status Header

Content:

- compact stylized player avatar
- name
- age
- nationality
- club badge/name
- position
- role
- career stage

Quick resources:

- cash/wage
- prestige/fame
- energy/fitness

Design notes:

- Should feel like a football player card mixed with a modern analytics header.
- The avatar should add identity without consuming too much vertical space.
- Avoid large hero portraits on the Player screen.
- The avatar can be expanded or customized in a separate profile/customization view later.

#### 2. OVR and Career Status Card

Content:

- OVR/current ability
- growth profile marker, if shown
- squad status
- manager trust
- next role target

Example:

- OVR 54
- Growth marker 72
- Status: Prospect
- Trust: 38%
- Next: Rotation at 55% trust

Design notes:

- This should be one of the most visually satisfying cards.
- OVR can be large, but not the only meaningful number.

#### 3. Readiness Strip

Compact horizontal status row:

- Fitness
- Form
- Morale
- Pressure

Each item should be a small chip/bar with color state.

Example:

- Fitness 86
- Form Good
- Morale Happy
- Pressure Low

#### 4. Key Attributes Card

For Striker V1:

- Finishing
- Off Ball
- Composure
- First Touch
- Acceleration
- Heading
- Strength
- Work Rate

Display as compact bars, radial mini-chart or grouped stat rows.

Important:

- Attributes should show progress toward next point/level.
- Primary role stats should be visually marked.
- Tapping an attribute should open a growth detail popup with current level, XP to next level, base XP requirement, growth pressure multiplier, selected training range and active modifiers.
- Growth details should explain what can improve the curve: training focus, support tracks, facilities and dynasty growth upgrades.

#### 5. Season Snapshot Card

Content:

- appearances
- starts
- minutes
- goals
- assists
- average rating
- last 5 ratings

Design notes:

- This card makes the football career feel real.
- Use small charts/sparklines for form.

#### 6. Next Action Card

Content changes depending on context:

- next match
- training week
- contract meeting
- transfer window
- injury recovery
- manager event

Design notes:

- This is the main call-to-action area.
- Should not look like marketing copy. It should be operational.

Example:

Next Match: Away vs Aalborg

- Expected minutes: 20-30
- Role: Impact Sub
- Manager focus: Pressing
- Primary action: Prepare Week

#### 7. Relationships Card

Compact bars/chips:

- Manager
- Teammates
- Agent
- Fans
- Media
- Family/Mentor

Use relation status labels rather than only numbers.

Example:

- Manager: Warming
- Teammates: Neutral
- Fans: Unknown
- Agent: Basic

#### 8. Contract and Market Card

Content:

- current wage
- contract length
- contract status
- role promise
- active bonuses
- market value
- transfer interest
- release clause if relevant

Design notes:

- This card should become more important as the player rises.
- Early game can show simple info only, but the status must be clear: secure, review soon, expiring, expired or offer ready.
- Contract offers should use a dedicated `Club offer` screen with current terms compared directly against the proposed terms.
- External offers after contract expiry should use the same screen pattern but label the context as `Contract market`, so the player understands this is no longer a renewal.
- The main progress button should become `Accept Offer` on the offer screen. Any secondary decline action belongs inside the screen content, not as the primary progression path.
- Contract UI should always show weekly wage, weeks, role promise, signing bonus and match bonuses as numbers. Avoid vague value copy.

Club identity UI:

- Header club chip, Club tab title, match headers, post-match score headers, league table highlight and dynasty history should all read from current club state.
- After an external contract offer is accepted, the player should immediately see the new club name in these surfaces.
- If fixtures are regenerated after a club move, the UI should treat already played results as history and upcoming fixtures as the new club context.

#### 9. Equipment and Facilities Card

Content:

- boots
- recovery setup
- private coach
- home gym/facility bonuses

Design notes:

- Use small item chips, not inventory clutter.
- Show modifiers clearly and modestly.

### Player Screen Scrolling Model

Recommended structure:

- One main vertical scroll.
- Critical information visible in the first viewport.
- Secondary systems lower on the page.
- Optional expandable details for dense areas like full attributes, relationships and equipment.

This gives the best mobile UI because the Player screen can remain a true dashboard without hiding the entire game behind tabs. Tabs can be used inside specific cards later, but the main Player screen should feel like one coherent career overview.

First viewport should include:

- Status Header
- OVR and Career Status
- Readiness Strip
- Next Action

Below first viewport:

- Key Attributes
- Season Snapshot
- Relationships
- Contract and Market
- Equipment and Facilities

## Visual Language For Stats

### OVR

OVR is a headline number, but should not dominate the entire game. It should sit beside role, trust and form so the player learns that career momentum matters as much as raw ability.

OVR must be clickable/tappable wherever it is presented as a primary player metric. The detail view explains that OVR is position-based current ability, shows the active position/role, and lists the weighted attributes used for the calculation.

OVR should not be presented as a full-profile average. A specialist stat can be valuable in match moments without making the player high OVR for the active position.

### Attribute Bars

Use horizontal bars for clarity.

Bar states:

- grey track
- lime fill for normal growth
- gold marker for potential/current milestone
- small plus indicator when boosted by equipment/facilities

### Trends

Use small sparklines for:

- last 5 match ratings
- weekly fitness
- form
- reputation
- training efficiency

### Badges

Badges should represent achievements or identity:

- First Goal
- Debut
- Derby Hero
- Clinical Week
- Manager Favorite
- Rising Prospect

Badges should not become the main progression system.

## Support Track UI

The Support tab should avoid overwhelming the player with too many similar upgrade choices.

Use a few broad track cards:

- Training
- Recovery
- Career

Each card should show:

- current invested levels
- exact next investment effect
- current concrete bonuses already active
- next named breakthrough
- one clear progress bar
- one primary `Invest` action

The player should understand the strategic choice at a glance: train faster, recover better or improve career earnings.

Avoid vague copy such as `improves performance` as the only payoff. Every support track should show a concrete number or transparent progress toward the next rounded number, for example `+8 XP floor`, `+12 XP ceiling`, `+1 training relief`, `+1% wage`, `+2% sponsor payout` or `Progress toward focus slot 2`.

`Current bonuses` should use compact chips so the player can see what the track is already doing without opening a tooltip. Keep the chips short: `2 focus slots`, `+30 XP floor`, `+2 weekly recovery`, `+4 training relief`, `+12% wage`.

When Training unlocks more focus slots, the support card should state it directly as a current bonus, for example `2 focus slots`. Slot 2 and slot 3 efficiency should be readable as percentages, because those upgrades are intentionally granular.

On the Training confirmation screen, selected focuses must be presented in ordered slot cards (`Slot 1`, `Slot 2`, `Slot 3`) with their actual XP efficiency. Green attribute selection alone is not enough, because the player must understand which selected stat receives primary XP and which receives reduced secondary XP.

During a player highlight, the match progress label may show the current Match Director phase (`Chasing goal`, `Team pressure`, `Late siege`) instead of the generic `Player moment`. This is short contextual language, not an extra explanatory panel, and should help the player read why the situation is happening.

The live match surface should use one compact momentum strip with a centered neutral point. Do not show a fake possession or win-probability percentage. Pair the strip with a short state label such as `Team pressure`, `Opponent building` or `Even spell`.

Moment result feedback should read in one pass: chosen action, result, the three decisive factors and what happened to the attack. Teamplay outcomes must explicitly say whether they produced a chance, continued into another playable decision or ended without a shot.

Club names are interactive navigation, not decorative labels. Use the shared club-link treatment in tables, fixtures, match headers, contract offers, career history and summaries. The club profile itself should remain compact: identity first, four unit ratings, season form, football identity and career fit.

The Feed is a compact editorial list, not a card dashboard. Group stories by week, use one restrained tone rail per story, keep headlines short and render club references as links. Weekly Summary may show one teaser, but the full feed belongs in the Home subtab.

Timeline rows use a stable three-column layout: event icon, minute and commentary. Goals/positive team events use lime or gold; opponent danger uses orange; neutral tempo and substitutions remain muted.

Live player stats use a compact 3x2 metric grid on mobile. Keep labels short and use tabular numbers so updates do not shift the layout.

## Prestige And Sponsor UI

Prestige should be presented as career status, not as spendable cash.

Use a compact tier card where the player can instantly read:

- current prestige tier
- current prestige points
- progress to next tier
- next meaningful unlock

Example:

- Tier: `Known Talent`
- Progress: `1,240 / 2,000`
- Unlock: `Regional sponsor interest`

The prestige card should use the same single-bar language as attribute/support progress. The bar fills toward the next tier, while the total prestige score can keep growing beyond 100.

Sponsor UI should appear only when the player has enough prestige or a relevant trigger. Sponsor offers should be shown like contract offers: clear comparison, concrete payouts and clear obligations.

Sponsors and contracts should live together in a dedicated `Deals` surface under Home. Player screen can show high-level career status, but detailed contract terms, commercial eligibility and sponsor slots belong in Home -> Deals.

Each sponsor card should show:

- weekly retainer
- objective bonus
- objective condition
- pressure or obligation impact
- contract length

Avoid vague sponsor copy such as `improves fame`. Sponsors should say exactly what they pay and what they ask for, for example:

- `$120/wk`
- `+$400 for 3 goals this month`
- `Pressure +2 while active`
- `Requires Known Talent`

Core UI rule:

`Cash is shown as spendable money. Prestige is shown as status progress. Legacy Points are shown as dynasty spending power.`

## Match Moment UI Direction

Match moments should feel like tense football decisions, not long text adventures.

Structure:

- match header: minute, score, opponent, player rating
- situation card
- 2-4 choice buttons
- small visible hints: risk, reward, relevant stats
- result feedback

Choice buttons should be compact but readable.

Example:

Situation: 67' - Through on goal, defender closing.

Choices:

- Place Shot
- Round Keeper
- Square Pass

Each choice can show:

- relevant attribute icons/labels
- risk level
- possible rating impact

Open decision:

- Exact percentages should not be shown in the first version.

Locked starting point:

- Show relevant stats and risk/reward labels.
- Avoid exact probabilities so there is no obvious mathematically correct choice.
- Let player build, match context, fatigue and tactical goals influence what feels right.

Example:

- High chance
- Risky
- Uses Composure
- Manager likes this

Better example for first prototype:

- Uses: Finishing + Composure
- Risk: Medium
- Reward: Goal threat
- Manager: Neutral

## Training UI Direction

Training should feel like weekly preparation.

Suggested screen sections:

- weekly readiness
- session quality
- training focus slots, including current capacity
- intensity selector
- recovery impact
- expected XP
- next match context

Controls:

- segmented control for intensity
- selectable focus chips/cards
- sliders only if precision matters
- clear warning when fatigue/injury risk rises

Development Summary should explain why the session felt good or bad:

- show quality label near the top
- keep total XP and level-up progress visually primary
- do not hide progression causes behind vague flavor text

## UI States

Important state colors:

- Ready: lime
- Improving: lime/gold
- Peak: gold
- Fatigued: orange
- Injured: red
- Unhappy: orange/red
- Locked: grey
- Boosted: blue or gold accent

## Microinteractions

Use small, satisfying feedback:

- stat bars animate after training
- OVR ticks up when threshold is crossed
- badges pop subtly
- match rating settles after final whistle
- trust bar moves after manager-relevant events

Avoid excessive confetti or arcade effects except for major milestones.

## Tone of UI Text

UI copy should be short, direct and football-native.

Good:

- Match Day
- Fit to Start
- Impact Sub
- Manager Trust Rising
- First Team Door Opening
- Contract Talks Available

Avoid:

- Long tutorial paragraphs
- Over-explaining mechanics on cards
- Fantasy RPG terms that break realism

## Accessibility and Readability

- Text must be readable on dark backgrounds.
- Do not rely on color alone for critical states.
- Use labels, icons and bars together where needed.
- Tap targets should be comfortable on mobile.
- Avoid tiny dense text in primary actions.
- Every card should still work on 360px width.

## What To Avoid

- Bright full-screen neon gradients.
- Overly futuristic sci-fi UI.
- Casino/sports betting visual language as the main identity.
- Huge cards that waste mobile vertical space.
- Too many competing accent colors.
- Long prose blocks in the app.
- Generic fantasy RPG inventory look.
- Making OVR the only thing that matters.
- Desktop-first tables squeezed onto mobile.

## Initial Screen List

MVP screens:

- Player
- Training
- Match Moment
- Season/Career
- Contract/Transfer
- Legacy/Facilities

Player screen remains the home screen.

## Open Design Questions

1. Hvor meget customization skal den stiliserede avatar have i første prototype?
2. Hvilke fire nav-destinationer er endelige: Player, Training, Club, Home eller skal en af dem erstattes af Career?
3. Skal Home være en separat house/facilities/legacy-skærm, eller skal den fungere som career hub?
4. Hvor meget af full attributes-listen skal vises direkte på Player screen versus i en expandable full stats section?

## Current Recommendation

Start med:

- dark charcoal UI
- lime as primary progression accent
- gold as prestige/rating accent
- compact card dashboard
- Player screen as the default/main screen
- Home as the player's private base, facilities and legacy space
- bottom nav with four small buttons and one large central advance-time button
- match choice hints based on stats/risk/reward, not percentages
- no exact percentages in the first prototype
- compact stylized avatar
- one main Player screen scroll with expandable detail sections lower on the page

## Locked UI Decisions

- Player screen is the main screen.
- Home is the player's private base/facilities/legacy screen.
- The first prototype uses a compact stylized avatar, not a large realistic portrait.
- Lime green is the dominant accent color.
- Gold is reserved for prestige, rating and special moments.
- Match choices show relevant stats and risk/reward, not exact percentages.
- Bottom navigation has four smaller destinations plus a larger central advance-time button.
- Player screen uses one vertical scroll with critical information in the first viewport and expandable secondary detail sections below.

## Deals UI V1

Home -> Deals is the dedicated career-economy surface.

Current structure:

- Overview card: weekly wage, prestige tier and sponsor status.
- Contract card: current contract terms and renewal/market context.
- Sponsor card: active sponsor or available sponsor offers.

Sponsor offer cards must show concrete numbers:

- weekly retainer
- objective label
- objective bonus
- pressure modifier
- duration

The player should never have to guess whether a sponsor is cosmetic. If a deal affects cash or pressure, the card should say so directly.
