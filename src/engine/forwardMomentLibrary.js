export function createForwardExpansionPool(input) {
  const opponent = input.opponentShort;
  const instruction = input.managerInstruction;
  const focus = input.tacticalFocus;

  return [
    moment("blindside-cutback", "first_time_finish", "Cutback arrives behind the defensive line", `Your blind-side movement has created a pocket. ${focus}`, ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [18, 88], "box-cutback", "finish_or_square", [
      choice("open-body-finish", "Open body finish", ["Finishing", "Composure"], "Medium", "Placed finish", "Neutral", "goal"),
      choice("stab-near-post", "Stab near post", ["Finishing", "Acceleration"], "High", "Beat keeper early", "Risky", "goal"),
      choice("roll-six-yard", "Roll across six-yard box", ["Vision", "Passing"], "Low", "Tap-in chance", "Likes", "assist"),
    ], opponent),
    moment("six-yard-deflection", "late_pressure", "A blocked cross drops inside the six-yard box", "Bodies are moving the wrong way and the ball is alive for one sharp reaction.", ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [35, 90], "box-scramble", "rebound_finish", [
      choice("hook-deflection", "Hook at the loose ball", ["Finishing", "Acceleration"], "High", "Scramble goal", "Neutral", "goal"),
      choice("set-feet-scramble", "Set feet first", ["First Touch", "Composure"], "Medium", "Cleaner contact", "Neutral", "goal"),
      choice("nudge-runner", "Nudge to runner", ["First Touch", "Vision"], "Low", "Assist chance", "Likes", "assist"),
    ], opponent),
    moment("chipped-cross-drop", "aerial_duel", "A chipped cross hangs between you and the keeper", "The flight gives you time to read it, but the keeper is already moving.", ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [20, 88], "aerial-box", "aerial_second_ball", [
      choice("loop-header", "Loop header", ["Heading", "Composure"], "Medium", "Guide it over keeper", "Neutral", "goal"),
      choice("attack-through-keeper", "Attack through traffic", ["Heading", "Strength"], "High", "Power header", "Risky", "goal"),
      choice("head-across", "Head across goal", ["Heading", "Vision"], "Low", "Assist chance", "Likes", "assist"),
    ], opponent),
    moment("penalty-spot-screen", "shot", "A defender screens the keeper near the penalty spot", "The ball sits in front of you, but the shooting lane is narrow and closing.", ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [18, 86], "central-finish", "finish_or_square", [
      choice("shoot-through-legs", "Shoot through legs", ["Finishing", "Composure"], "Medium", "Hidden finish", "Neutral", "goal"),
      choice("shift-yard", "Shift for a yard", ["First Touch", "Dribbling"], "High", "Clearer angle", "Risky", "goal"),
      choice("touch-wide-runner", "Touch to wide runner", ["Vision", "Passing"], "Low", "Keep chance alive", "Likes", "assist"),
    ], opponent),
    moment("volley-drop", "first_time_finish", "A half-clearance drops at waist height", "There is no time for a perfect setup. Technique and nerve decide the contact.", ["team_pressure", "end_to_end", "chasing_goal"], ["level", "trailing"], [22, 84], "volley", "rebound_finish", [
      choice("sidefoot-volley", "Side-foot volley", ["Finishing", "First Touch"], "Medium", "Controlled volley", "Neutral", "goal"),
      choice("full-volley", "Full volley", ["Long Shots", "Composure"], "High", "Spectacular finish", "Risky", "goal"),
      choice("cushion-back", "Cushion back", ["First Touch", "Vision"], "Low", "Runner chance", "Likes", "assist"),
    ], opponent),
    moment("keeper-parry-angle", "late_pressure", "The keeper parries toward a tight angle", "The rebound is reachable, but the goal is shrinking with every step.", ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [35, 90], "keeper-rebound", "rebound_finish", [
      choice("finish-tight-angle", "Finish tight angle", ["Finishing", "Composure"], "High", "Rebound goal", "Neutral", "goal"),
      choice("round-recovering-keeper", "Touch around keeper", ["First Touch", "Acceleration"], "High", "Open goal", "Risky", "goal"),
      choice("cut-back-rebound", "Cut rebound back", ["Vision", "Passing"], "Medium", "Assist chance", "Likes", "assist"),
    ], opponent),
    moment("blocked-shot-rebound", "late_pressure", "A teammate's shot is blocked into your path", "The defense steps out together, leaving one heartbeat before the block arrives.", ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [25, 90], "box-rebound", "rebound_finish", [
      choice("snap-rebound", "Snap rebound", ["Finishing", "Acceleration"], "High", "Quick goal", "Neutral", "goal"),
      choice("fake-blocker", "Fake the blocker", ["Dribbling", "Composure"], "High", "Open finish", "Risky", "goal"),
      choice("feed-overlap", "Feed overlap", ["Passing", "Vision"], "Low", "Second chance", "Likes", "assist"),
    ], opponent),
    moment("back-post-knockdown", "aerial_duel", "A deep delivery reaches you at the back post", "The angle favors a knockdown, but the far corner is briefly exposed.", ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [25, 89], "back-post", "aerial_second_ball", [
      choice("header-far-corner", "Head far corner", ["Heading", "Composure"], "High", "Goal chance", "Neutral", "goal"),
      choice("knock-central", "Knock central", ["Heading", "Vision"], "Low", "Assist chance", "Likes", "assist"),
      choice("bring-down-back-post", "Bring it down", ["First Touch", "Strength"], "Medium", "Extend attack", "Neutral", "trust"),
    ], opponent),
    moment("curved-offside-run", "run_behind", "The centerback line steps up as the passer looks forward", `One curved run can beat the trap. ${instruction}`, ["team_pressure", "end_to_end", "chasing_goal"], ["level", "trailing"], [12, 84], "offside-line", "run_to_finish", [
      choice("curve-inside", "Curve inside shoulder", ["Off Ball", "Acceleration"], "Medium", "Break line", "Likes", "goal"),
      choice("hold-last-step", "Delay final step", ["Off Ball", "Composure"], "Low", "Stay onside", "Likes", "trust"),
      choice("drag-marker-wide", "Drag marker wide", ["Off Ball", "Work Rate"], "Low", "Open teammate lane", "Likes", "assist"),
    ], opponent),
    moment("split-centerbacks", "run_behind", "A gap opens between the two centerbacks", "Both defenders glance at the ball. The space exists only until they communicate.", ["team_pressure", "end_to_end", "chasing_goal"], ["level", "trailing"], [16, 86], "central-run", "run_to_finish", [
      choice("explode-gap", "Explode through gap", ["Acceleration", "Off Ball"], "High", "Clear chance", "Neutral", "goal"),
      choice("check-then-go", "Check then go", ["Off Ball", "Composure"], "Medium", "Beat marker", "Likes", "goal"),
      choice("open-lane-ten", "Open lane for ten", ["Work Rate", "Positioning"], "Low", "Create central lane", "Likes", "assist"),
    ], opponent),
    moment("decoy-near-post", "run_behind", "The winger shapes for a low cross", "Your first movement can attack the ball or pull the near centerback away.", ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [20, 88], "cross-movement", "cross_decision", [
      choice("attack-front-zone", "Attack front zone", ["Off Ball", "Acceleration"], "Medium", "First contact", "Neutral", "goal"),
      choice("dart-then-stop", "Dart then stop", ["Off Ball", "Composure"], "Medium", "Cutback space", "Likes", "goal"),
      choice("decoy-centerback", "Take centerback away", ["Work Rate", "Off Ball"], "Low", "Team chance", "Likes", "assist"),
    ], opponent),
    moment("peel-back-post", "run_behind", "The defense collapses toward the near post", "You can disappear behind the fullback while every eye follows the ball.", ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [28, 89], "back-post-run", "cross_decision", [
      choice("peel-far-post", "Peel to far post", ["Off Ball", "Composure"], "Medium", "Back-post finish", "Likes", "goal"),
      choice("crash-late", "Crash late", ["Acceleration", "Heading"], "High", "Power chance", "Risky", "goal"),
      choice("hold-recycle", "Hold for recycle", ["Positioning", "First Touch"], "Low", "Sustain pressure", "Likes", "trust"),
    ], opponent),
    moment("inside-channel-race", "run_behind", "A pass is threaded into the inside channel", "The fullback has the shorter route, but you have momentum and space beyond him.", ["end_to_end", "chasing_goal", "protecting_lead"], ["level", "trailing", "leading"], [18, 84], "channel-run", "run_to_finish", [
      choice("race-inside", "Race inside", ["Pace", "Acceleration"], "High", "Reach box", "Neutral", "goal"),
      choice("use-body-channel", "Use body to protect", ["Strength", "First Touch"], "Medium", "Keep attack", "Likes", "trust"),
      choice("release-overlap-channel", "Release overlap", ["Vision", "Passing"], "Medium", "Assist chance", "Likes", "assist"),
    ], opponent),
    moment("second-phase-box-entry", "late_pressure", "A recycled cross finds the box disorganized", "The first wave is over, but a late entry can attack defenders facing their own goal.", ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [35, 90], "second-phase", "rebound_finish", [
      choice("arrive-late-box", "Arrive late", ["Off Ball", "Composure"], "Medium", "Unmarked finish", "Likes", "goal"),
      choice("attack-second-ball", "Attack second ball", ["Acceleration", "Finishing"], "High", "Scramble chance", "Neutral", "goal"),
      choice("screen-recycle", "Screen for runner", ["Strength", "Work Rate"], "Low", "Team chance", "Likes", "assist"),
    ], opponent),
    moment("isolated-centerback", "counter", "You receive isolated against one centerback", "There is space on both sides, but support is several strides behind.", ["end_to_end", "chasing_goal", "protecting_lead"], ["level", "trailing", "leading"], [18, 84], "one-v-one", "dribble_break", [
      choice("attack-front-foot", "Attack front foot", ["Dribbling", "Acceleration"], "High", "Beat defender", "Risky", "goal"),
      choice("shift-across-body", "Shift across body", ["First Touch", "Composure"], "Medium", "Shooting lane", "Neutral", "goal"),
      choice("wait-overlap", "Wait for overlap", ["Strength", "Vision"], "Low", "Assist chance", "Likes", "assist"),
    ], opponent),
    moment("keeper-sweeper-race", "counter", "A through ball sends you racing against the keeper", "The keeper starts outside the box. Your next touch decides who reaches the ball first.", ["end_to_end", "chasing_goal"], ["level", "trailing"], [20, 82], "keeper-race", "run_to_finish", [
      choice("touch-past-keeper", "Touch past keeper", ["Acceleration", "First Touch"], "High", "Open goal", "Risky", "goal"),
      choice("early-chip", "Early chip", ["Finishing", "Composure"], "High", "Beat keeper", "Neutral", "goal"),
      choice("draw-and-square", "Draw and square", ["Composure", "Vision"], "Medium", "Assist chance", "Likes", "assist"),
    ], opponent),
    moment("breakaway-two-v-one", "counter", "A two-versus-one break opens through midfield", "The defender backs toward goal and cannot cover both runners.", ["end_to_end", "chasing_goal", "protecting_lead"], ["level", "trailing", "leading"], [20, 86], "breakaway", "finish_or_square", [
      choice("commit-defender", "Commit defender", ["Dribbling", "Composure"], "Medium", "Open decision", "Neutral", "trust"),
      choice("early-square-break", "Square early", ["Passing", "Vision"], "Low", "Assist chance", "Likes", "assist"),
      choice("carry-and-finish", "Carry and finish", ["Pace", "Finishing"], "High", "Goal chance", "Risky", "goal"),
    ], opponent),
    moment("transition-wide-lane", "counter", "The counter funnels you into a wide lane", "The angle is poor for a direct finish, but runners are flooding the middle.", ["end_to_end", "protecting_lead", "chasing_goal"], ["level", "leading", "trailing"], [24, 86], "wide-transition", "cross_decision", [
      choice("drive-byline", "Drive byline", ["Pace", "Dribbling"], "High", "Cutback lane", "Neutral", "assist"),
      choice("early-diagonal", "Early diagonal", ["Passing", "Vision"], "Medium", "Runner chance", "Likes", "assist"),
      choice("cut-in-wide", "Cut inside", ["Dribbling", "Finishing"], "High", "Goal threat", "Risky", "goal"),
    ], opponent),
    moment("dribble-box-entry", "counter", "A defender jockeys you at the corner of the box", "The defender is protecting the inside. One convincing touch can break the balance.", ["team_pressure", "end_to_end", "chasing_goal"], ["level", "trailing"], [22, 86], "box-dribble", "dribble_break", [
      choice("inside-feint", "Feint inside", ["Dribbling", "Composure"], "High", "Beat defender", "Risky", "goal"),
      choice("outside-burst", "Burst outside", ["Acceleration", "Pace"], "High", "Crossing lane", "Neutral", "assist"),
      choice("bounce-and-move", "Bounce pass and move", ["Passing", "Off Ball"], "Medium", "Return chance", "Likes", "trust"),
    ], opponent),
    moment("bounce-pass-return", "link_up", "A quick bounce pass can pull a defender out", "The midfielder is close enough for a one-two if your touch and movement connect.", ["cagey_opening", "team_pressure", "chasing_goal"], ["level", "trailing"], [8, 82], "one-two", "hold_up_return", [
      choice("one-touch-return", "One-touch return", ["First Touch", "Passing"], "Medium", "Break line", "Likes", "assist"),
      choice("spin-after-set", "Set and spin", ["Off Ball", "Acceleration"], "High", "Return chance", "Neutral", "goal"),
      choice("secure-bounce", "Secure bounce pass", ["Composure", "Passing"], "Low", "Keep possession", "Likes", "trust"),
    ], opponent),
    moment("chest-set-runner", "hold_up", "A direct ball arrives above chest height", "A midfielder runs beyond you while the centerback leans through your back.", ["cagey_opening", "opponent_pressure", "protecting_lead"], ["level", "leading"], [10, 80], "direct-hold-up", "hold_up_return", [
      choice("chest-runner", "Chest to runner", ["First Touch", "Strength"], "Medium", "Release runner", "Likes", "assist"),
      choice("pin-and-turn", "Pin and turn", ["Strength", "Dribbling"], "High", "Face goal", "Risky", "goal"),
      choice("win-contact", "Win contact", ["Strength", "Composure"], "Low", "Relieve pressure", "Likes", "trust"),
    ], opponent),
    moment("pocket-receive-turn", "link_up", "You receive between midfield and defense", "There is room to turn, but pressure is arriving from your blind side.", ["cagey_opening", "team_pressure", "chasing_goal"], ["level", "trailing"], [10, 82], "pocket-receive", "dribble_break", [
      choice("turn-between-lines", "Turn between lines", ["First Touch", "Composure"], "Medium", "Attack defense", "Neutral", "trust"),
      choice("slip-wide-pocket", "Slip wide runner", ["Vision", "Passing"], "Medium", "Chance created", "Likes", "assist"),
      choice("roll-marker-pocket", "Roll marker", ["Dribbling", "Strength"], "High", "Shooting lane", "Risky", "goal"),
    ], opponent),
    moment("layoff-spin", "hold_up", "The pass arrives into feet with a teammate underneath", `A clean layoff can trigger your spin behind. ${instruction}`, ["cagey_opening", "team_pressure", "chasing_goal"], ["level", "trailing"], [12, 82], "layoff", "hold_up_return", [
      choice("layoff-spin-run", "Lay off and spin", ["First Touch", "Off Ball"], "Medium", "Return chance", "Likes", "goal"),
      choice("reverse-layoff", "Reverse layoff", ["Vision", "Passing"], "High", "Split defense", "Risky", "assist"),
      choice("hold-central", "Hold central", ["Strength", "Composure"], "Low", "Keep structure", "Likes", "trust"),
    ], opponent),
    moment("overload-central", "link_up", "Three attackers overload the central channel", "The defense narrows quickly. The correct release can create the free player.", ["team_pressure", "chasing_goal", "game_management"], ["level", "trailing", "leading"], [18, 84], "central-overload", "finish_or_square", [
      choice("third-man-slip", "Slip third man", ["Vision", "Passing"], "Medium", "Assist chance", "Likes", "assist"),
      choice("dummy-overload", "Dummy the pass", ["Composure", "Off Ball"], "Medium", "Open runner", "Likes", "assist"),
      choice("drive-overload-gap", "Drive the gap", ["Dribbling", "Acceleration"], "High", "Goal chance", "Risky", "goal"),
    ], opponent),
    moment("keeper-backpass", "press", "A soft backpass rolls toward the goalkeeper", `The press is on if you commit now. ${instruction}`, ["cagey_opening", "team_pressure", "chasing_goal"], ["level", "trailing"], [8, 82], "keeper-press", "press_turnover", [
      choice("sprint-keeper", "Sprint at keeper", ["Acceleration", "Work Rate"], "High", "Force error", "Likes", "goal"),
      choice("curve-press-keeper", "Curve the press", ["Off Ball", "Work Rate"], "Medium", "Trap pass", "Likes", "trust"),
      choice("hold-block-six", "Block midfield outlet", ["Positioning", "Composure"], "Low", "Control press", "Likes", "trust"),
    ], opponent),
    moment("loose-touch-centerback", "press", "The centerback's first touch escapes forward", "The loose ball is reachable, but missing the duel leaves space behind you.", ["cagey_opening", "team_pressure", "chasing_goal"], ["level", "trailing"], [8, 84], "centerback-press", "press_turnover", [
      choice("pounce-touch", "Pounce on touch", ["Acceleration", "Work Rate"], "High", "Win near goal", "Likes", "goal"),
      choice("body-centerback", "Use body", ["Strength", "Positioning"], "Medium", "Win turnover", "Neutral", "trust"),
      choice("force-backward", "Force backward", ["Work Rate", "Off Ball"], "Low", "Sustain press", "Likes", "trust"),
    ], opponent),
    moment("counterpress-edge", "press", "Possession is lost near the edge of their box", "The opponent wants one clean pass to escape. Your reaction can keep the attack alive.", ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [20, 89], "counterpress", "press_turnover", [
      choice("counterpress-ball", "Counterpress ball", ["Work Rate", "Acceleration"], "Medium", "Immediate turnover", "Likes", "trust"),
      choice("screen-counterpass", "Screen escape pass", ["Positioning", "Off Ball"], "Low", "Lock them in", "Likes", "trust"),
      choice("tackle-through-edge", "Win it back", ["Work Rate", "Strength"], "High", "Loose chance", "Risky", "assist"),
    ], opponent),
    moment("front-zone-corner", "aerial_duel", "The corner is whipped toward the front zone", "You have half a step on the marker, but the delivery is fast and crowded.", ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [15, 90], "attacking-corner", "aerial_second_ball", [
      choice("flick-front-zone", "Flick front zone", ["Heading", "Off Ball"], "Medium", "Redirect goalward", "Neutral", "goal"),
      choice("power-front-header", "Power header", ["Heading", "Strength"], "High", "Big chance", "Risky", "goal"),
      choice("screen-keeper-corner", "Screen keeper", ["Strength", "Work Rate"], "Low", "Team chance", "Likes", "assist"),
    ], opponent, "uncommon"),
    moment("back-post-free-kick", "aerial_duel", "A wide free kick hangs toward the back post", "The defensive line is flat. Your timing can create a header or a knockdown.", ["team_pressure", "chasing_goal", "late_siege"], ["level", "trailing"], [20, 90], "attacking-free-kick", "aerial_second_ball", [
      choice("attack-free-kick", "Attack delivery", ["Heading", "Off Ball"], "High", "Header chance", "Neutral", "goal"),
      choice("knock-free-kick", "Knock across goal", ["Heading", "Vision"], "Medium", "Assist chance", "Likes", "assist"),
      choice("hold-second-phase", "Hold second phase", ["Positioning", "Composure"], "Low", "Recycle pressure", "Likes", "trust"),
    ], opponent, "uncommon"),
    moment("long-throw-scramble", "late_pressure", "A long throw causes chaos inside the box", "The first header only loops upward. The next contact will decide the scramble.", ["chasing_goal", "late_siege", "team_pressure"], ["level", "trailing"], [55, 90], "long-throw", "rebound_finish", [
      choice("attack-looping-ball", "Attack looping ball", ["Heading", "Strength"], "High", "Scramble goal", "Neutral", "goal"),
      choice("read-drop-throw", "Read the drop", ["Off Ball", "Composure"], "Medium", "Second-ball finish", "Likes", "goal"),
      choice("set-edge-runner", "Set edge runner", ["First Touch", "Vision"], "Low", "Assist chance", "Likes", "assist"),
    ], opponent, "rare"),
    moment("defensive-clearance-break", "defensive_set_piece", "You clear a defensive set piece into open grass", "The danger is gone for a moment, and the opponent has committed numbers forward.", ["opponent_pressure", "protecting_lead", "game_management"], ["level", "leading"], [20, 88], "defensive-transition", "clearance_counter", [
      choice("chase-clearance", "Chase clearance", ["Pace", "Work Rate"], "Medium", "Counter outlet", "Likes", "trust"),
      choice("head-to-runner", "Head to runner", ["Heading", "Vision"], "Medium", "Launch counter", "Neutral", "assist"),
      choice("hold-shape-clearance", "Hold shape", ["Positioning", "Composure"], "Low", "Protect lead", "Likes", "trust"),
    ], opponent),
  ];
}

function moment(id, category, situation, context, phases, scoreStates, minuteRange, family, chainRoute, choices, opponent, rarity = "common") {
  return {
    id,
    category,
    minute: Math.round((minuteRange[0] + minuteRange[1]) / 2),
    opponent,
    situation,
    context,
    choices,
    director: {
      phases,
      scoreStates,
      minuteRange,
      rarity,
      cooldown: rarity === "rare" ? 18 : rarity === "uncommon" ? 14 : 10,
      family,
      conversionModifier: 0.55,
    },
    chainRoutes: [chainRoute],
  };
}

function choice(id, label, uses, risk, reward, manager, outcome) {
  return { id, label, uses, risk, reward, manager, outcome };
}
