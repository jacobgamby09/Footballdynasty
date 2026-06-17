import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  ChevronsRight,
  Dumbbell,
  Flame,
  Gauge,
  HeartPulse,
  Home,
  ShieldCheck,
  Shirt,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  createSimEvents,
  createTeamMatchModel,
  getSimScoreAtMinute,
  chooseAutoSimChoice,
  resolvePlayerChoice,
  selectPlayerHighlights,
  seededNoise,
  type EngineSimEvent,
} from "./engine/matchEngineCore";
import { createPositionMatchPool } from "./engine/forwardMoments";
import {
  buildOpponentProfile,
  type ForwardHighlightCategory,
  type OpponentForm,
  type OpponentProfile,
  type ServiceLevel,
} from "./matchEngine";
import {
  getPositionModule,
  positionModules,
  type AttributeKey,
  type MatchRole,
  type PositionGroup,
  type PositionModule,
} from "./positionRoles";

type NavKey = "player" | "training" | "club" | "home";
type ScreenKey = NavKey | "pre-match" | "match" | "summary" | "training-summary";
type Intensity = "Light" | "Balanced" | "Hard";
type MatchSpeed = 1 | 2 | 4;
type Venue = "Home" | "Away";
type ClubView = "overview" | "fixtures" | "table";

type Attribute = {
  label: AttributeKey;
  value: number;
  potential: number;
  xp: number;
};

type SeasonStats = {
  apps: number;
  starts: number;
  goals: number;
  assists: number;
  ratings: number[];
};

type Fixture = {
  id: string;
  opponent: string;
  opponentShort: string;
  venue: Venue;
  competition: string;
  opponentStrength: number;
  opponentForm: OpponentForm;
  serviceLevel: ServiceLevel;
};

type FixtureResult = {
  fixtureId: string;
  opponent: string;
  venue: Venue;
  competition: string;
  teamGoals: number;
  opponentGoals: number;
  outcome: "W" | "D" | "L";
  rating: number;
};

type LeagueTeam = {
  name: string;
  short: string;
  strength: number;
};

type LeagueTableRow = {
  name: string;
  short: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalDifference: number;
  points: number;
};

type SeasonState = {
  season: number;
  fixtureIndex: number;
  fixtures: Fixture[];
  results: FixtureResult[];
};

type GameState = {
  week: number;
  positionGroup: PositionGroup;
  positionCode: string;
  archetype: string;
  cash: number;
  prestige: number;
  fitness: number;
  morale: number;
  pressure: number;
  trust: number;
  selectedFocus: AttributeKey;
  trainingFocuses: AttributeKey[];
  trainingCompletedWeek: number;
  intensity: Intensity;
  attributes: Attribute[];
  seasonStats: SeasonStats;
  season: SeasonState;
  lastEvent: string;
  activeMatch?: MatchState;
  lastMatch?: LastMatchSummary;
  lastTraining?: TrainingSummary;
};

type AttributeLevelUp = {
  attribute: AttributeKey;
  before: number;
  after: number;
};

type TrainingSummary = {
  week: number;
  focuses: AttributeKey[];
  intensity: Intensity;
  ranges: Partial<Record<AttributeKey, { min: number; max: number }>>;
  xp: Partial<Record<AttributeKey, number>>;
  fitnessDelta: number;
  moraleDelta: number;
  trustDelta: number;
  selectionBefore: number;
  selectionAfter: number;
  levelUps: AttributeLevelUp[];
};

type UpcomingMatch = {
  id: string;
  opponent: string;
  opponentShort: string;
  venue: Venue;
  competition: string;
  kickoff: string;
  teamStrength: number;
  opponentStrength: number;
  opponentForm: OpponentForm;
  opponentProfile: OpponentProfile;
  matchImportance: "Low" | "Normal" | "High";
  positionGroup: PositionGroup;
  playerRole: MatchRole;
  selection: SelectionReport;
  expectedMinutes: string;
  managerInstruction: string;
  tacticalFocus: string;
  serviceLevel: ServiceLevel;
};

type SelectionReport = {
  score: number;
  role: MatchRole;
  nextRole?: "Impact Sub" | "Rotation Starter" | "Starter";
  pointsToNextRole: number;
  factors: SelectionFactor[];
  summary: string;
};

type SelectionFactor = {
  label: string;
  value: string;
  impact: number;
  tone: "good" | "neutral" | "warn";
};

type MatchState = {
  matchSeed: string;
  fixtureId: string;
  matchNumber: number;
  seasonLength: number;
  opponent: string;
  venue: Venue;
  competition: string;
  matchImportance: UpcomingMatch["matchImportance"];
  opponentForm: UpcomingMatch["opponentForm"];
  opponentProfile: OpponentProfile;
  serviceLevel: UpcomingMatch["serviceLevel"];
  teamStrength: number;
  opponentStrength: number;
  positionGroup: PositionGroup;
  playerRole: MatchRole;
  selectionScore: number;
  selectionSummary: string;
  expectedMinutes: string;
  entryMinute: number;
  exitMinute?: number;
  managerInstruction: string;
  tacticalFocus: string;
  score: string;
  events: MatchEvent[];
  currentEventIndex: number;
  liveMinute: number;
  results: MatchResult[];
  currentResult?: MatchResult;
  isComplete?: boolean;
};

type MatchEvent = SimMatchEvent | PlayerMatchEvent;

type SimMatchEvent = EngineSimEvent;

type PlayerMatchEvent = MatchMoment & {
  type: "player_moment";
};

type MatchMoment = {
  id: string;
  category: ForwardHighlightCategory;
  minute: number;
  opponent: string;
  situation: string;
  context: string;
  choices: MatchChoice[];
  result?: MatchResult;
};

type MatchChoice = {
  id: string;
  label: string;
  uses: AttributeKey[];
  risk: "Low" | "Medium" | "High";
  reward: string;
  manager: "Likes" | "Neutral" | "Risky";
  outcome: "goal" | "assist" | "trust" | "defense";
};

type ChanceQuality = "Clear chance" | "Good chance" | "Half chance" | "Difficult chance";
type OutcomeTier = "Poor" | "Okay" | "Good" | "Great";

type MatchResult = {
  title: string;
  detail: string;
  success: boolean;
  outcomeTier: OutcomeTier;
  chanceQuality: ChanceQuality;
  explanationTags: string[];
  performanceReasons: string[];
  rating: number;
  trustDelta: number;
  fitnessDelta: number;
  goals: number;
  assists: number;
  xp: Partial<Record<AttributeKey, number>>;
  source?: "manual" | "auto";
};

type MatchTotals = {
  rating: number;
  trustDelta: number;
  fitnessDelta: number;
  goals: number;
  assists: number;
  teamGoals: number;
  opponentGoals: number;
  chanceQualities: ChanceQuality[];
  explanationTags: string[];
  performanceReasons: string[];
  xp: Partial<Record<AttributeKey, number>>;
};

type LastMatchSummary = MatchTotals & {
  fixtureId: string;
  matchNumber: number;
  seasonLength: number;
  opponent: string;
  venue: Venue;
  competition: string;
  playerRole: MatchRole;
  expectedMinutes: string;
  autoSimulated: number;
  manualHighlights: number;
  cashDelta: number;
  prestigeDelta: number;
  moraleDelta: number;
  roleBefore: MatchRole;
  roleAfter: MatchRole;
  selectionBefore: number;
  selectionAfter: number;
  pointsToNextRole: number;
  careerImpact: string[];
};

const initialAttributes: Attribute[] = [
  { label: "Finishing", value: 54, potential: 82, xp: 42 },
  { label: "Long Shots", value: 43, potential: 70, xp: 8 },
  { label: "Passing", value: 45, potential: 72, xp: 24 },
  { label: "Vision", value: 41, potential: 71, xp: 15 },
  { label: "Dribbling", value: 48, potential: 76, xp: 29 },
  { label: "Off Ball", value: 50, potential: 78, xp: 18 },
  { label: "Composure", value: 46, potential: 74, xp: 64 },
  { label: "First Touch", value: 49, potential: 76, xp: 33 },
  { label: "Acceleration", value: 57, potential: 80, xp: 21 },
  { label: "Pace", value: 52, potential: 78, xp: 19 },
  { label: "Stamina", value: 55, potential: 79, xp: 36 },
  { label: "Heading", value: 42, potential: 69, xp: 12 },
  { label: "Strength", value: 44, potential: 71, xp: 40 },
  { label: "Work Rate", value: 61, potential: 77, xp: 56 },
  { label: "Tackling", value: 32, potential: 58, xp: 11 },
  { label: "Marking", value: 34, potential: 60, xp: 17 },
  { label: "Positioning", value: 47, potential: 73, xp: 27 },
];

const attributeInfo: Record<
  AttributeKey,
  { group: "Technical" | "Mental" | "Physical" | "Defensive"; strikerKey: boolean; description: string; affects: string }
> = {
  Finishing: {
    group: "Technical",
    strikerKey: true,
    description: "Quality when converting chances inside the box.",
    affects: "Shots, one-on-ones and loose balls near goal.",
  },
  "Long Shots": {
    group: "Technical",
    strikerKey: false,
    description: "Threat from distance when space opens outside the area.",
    affects: "Edge-of-box shots and low-service matches.",
  },
  Passing: {
    group: "Technical",
    strikerKey: false,
    description: "Reliability when linking play or finding a teammate.",
    affects: "Layoffs, cutbacks and safer assist choices.",
  },
  Vision: {
    group: "Mental",
    strikerKey: false,
    description: "Ability to spot runs and choose the best final action.",
    affects: "Through balls, square passes and creative assists.",
  },
  Dribbling: {
    group: "Technical",
    strikerKey: false,
    description: "Control when carrying the ball past pressure.",
    affects: "Taking on defenders and creating your own shot.",
  },
  "Off Ball": {
    group: "Mental",
    strikerKey: true,
    description: "Movement that creates space before the pass arrives.",
    affects: "Runs behind, pull-away headers and chance quality.",
  },
  Composure: {
    group: "Mental",
    strikerKey: true,
    description: "Calm execution when pressure or risk is high.",
    affects: "High-pressure shots, first touches and risky choices.",
  },
  "First Touch": {
    group: "Technical",
    strikerKey: true,
    description: "How cleanly you control awkward or fast passes.",
    affects: "Hold-up play, cutbacks and setting up a shot.",
  },
  Acceleration: {
    group: "Physical",
    strikerKey: true,
    description: "First steps over short distances.",
    affects: "Pressing jumps, loose balls and rounding the keeper.",
  },
  Pace: {
    group: "Physical",
    strikerKey: false,
    description: "Top speed when sprinting into space.",
    affects: "Counterattacks and longer runs behind the line.",
  },
  Stamina: {
    group: "Physical",
    strikerKey: false,
    description: "How well performance holds during repeated efforts.",
    affects: "Late-game actions, pressing and fatigue resistance.",
  },
  Heading: {
    group: "Technical",
    strikerKey: true,
    description: "Timing and direction when attacking aerial balls.",
    affects: "Crosses, knockdowns and defensive set pieces.",
  },
  Strength: {
    group: "Physical",
    strikerKey: true,
    description: "Physical duels, shielding and contact balance.",
    affects: "Hold-up play, aerial duels and drawing fouls.",
  },
  "Work Rate": {
    group: "Mental",
    strikerKey: true,
    description: "Willingness to press, recover and follow instructions.",
    affects: "Manager trust, pressing and off-ball defensive work.",
  },
  Tackling: {
    group: "Defensive",
    strikerKey: false,
    description: "Ability to win the ball cleanly in defensive actions.",
    affects: "Counter-pressing and tracking back.",
  },
  Marking: {
    group: "Defensive",
    strikerKey: false,
    description: "Staying tight to an assignment without losing shape.",
    affects: "Set-piece defending and tracking runners.",
  },
  Positioning: {
    group: "Mental",
    strikerKey: false,
    description: "Reading where to be when the game shifts.",
    affects: "Defensive shape, rebounds and second-ball situations.",
  },
};

const seasonFixtures: Fixture[] = [
  {
    id: "md1-aalborg",
    opponent: "Aalborg United",
    opponentShort: "Aalborg",
    venue: "Away",
    competition: "Regional League",
    opponentStrength: 56,
    opponentForm: "Good",
    serviceLevel: "Mixed",
  },
  {
    id: "md2-roskilde",
    opponent: "Roskilde Athletic",
    opponentShort: "Roskilde",
    venue: "Home",
    competition: "Regional League",
    opponentStrength: 51,
    opponentForm: "Mixed",
    serviceLevel: "Good",
  },
  {
    id: "md3-viborg",
    opponent: "Viborg Reserves",
    opponentShort: "Viborg",
    venue: "Away",
    competition: "Cup Qualifier",
    opponentStrength: 60,
    opponentForm: "Hot",
    serviceLevel: "Low",
  },
  {
    id: "md4-kolding",
    opponent: "Kolding Town",
    opponentShort: "Kolding",
    venue: "Home",
    competition: "Regional League",
    opponentStrength: 48,
    opponentForm: "Poor",
    serviceLevel: "Good",
  },
  {
    id: "md5-horsens",
    opponent: "Horsens Academy",
    opponentShort: "Horsens",
    venue: "Away",
    competition: "Regional League",
    opponentStrength: 53,
    opponentForm: "Mixed",
    serviceLevel: "Mixed",
  },
  {
    id: "md6-esbjerg",
    opponent: "Esbjerg Youth",
    opponentShort: "Esbjerg",
    venue: "Home",
    competition: "Regional League",
    opponentStrength: 58,
    opponentForm: "Good",
    serviceLevel: "Low",
  },
  {
    id: "md7-fredericia",
    opponent: "Fredericia Colts",
    opponentShort: "Fredericia",
    venue: "Away",
    competition: "Regional League",
    opponentStrength: 49,
    opponentForm: "Poor",
    serviceLevel: "Good",
  },
  {
    id: "md8-naestved",
    opponent: "Naestved U21",
    opponentShort: "Naestved",
    venue: "Home",
    competition: "Regional Cup",
    opponentStrength: 61,
    opponentForm: "Hot",
    serviceLevel: "Mixed",
  },
  {
    id: "md9-silkeborg",
    opponent: "Silkeborg II",
    opponentShort: "Silkeborg",
    venue: "Away",
    competition: "Regional League",
    opponentStrength: 57,
    opponentForm: "Good",
    serviceLevel: "Low",
  },
  {
    id: "md10-randers",
    opponent: "Randers Academy",
    opponentShort: "Randers",
    venue: "Home",
    competition: "Regional League",
    opponentStrength: 54,
    opponentForm: "Mixed",
    serviceLevel: "Good",
  },
  {
    id: "md11-vejle",
    opponent: "Vejle Juniors",
    opponentShort: "Vejle",
    venue: "Away",
    competition: "Regional League",
    opponentStrength: 62,
    opponentForm: "Good",
    serviceLevel: "Mixed",
  },
  {
    id: "md12-final",
    opponent: "Odense Prospects",
    opponentShort: "Odense",
    venue: "Home",
    competition: "Regional League",
    opponentStrength: 59,
    opponentForm: "Hot",
    serviceLevel: "Good",
  },
];

const leagueTeams: LeagueTeam[] = [
  { name: "Northbridge FC", short: "NBR", strength: 54 },
  { name: "Aalborg United", short: "AAL", strength: 56 },
  { name: "Roskilde Athletic", short: "ROS", strength: 51 },
  { name: "Viborg Reserves", short: "VIB", strength: 60 },
  { name: "Kolding Town", short: "KOL", strength: 48 },
  { name: "Horsens Academy", short: "HOR", strength: 53 },
  { name: "Esbjerg Youth", short: "ESB", strength: 58 },
  { name: "Fredericia Colts", short: "FRE", strength: 49 },
  { name: "Silkeborg II", short: "SIL", strength: 57 },
  { name: "Randers Academy", short: "RAN", strength: 54 },
  { name: "Vejle Juniors", short: "VEJ", strength: 62 },
  { name: "Odense Prospects", short: "ODE", strength: 59 },
];

const initialState: GameState = {
  week: 1,
  positionGroup: "Forward",
  positionCode: positionModules.Forward.shortCode,
  archetype: positionModules.Forward.defaultArchetype,
  cash: 420,
  prestige: 12,
  fitness: 86,
  morale: 74,
  pressure: 26,
  trust: 38,
  selectedFocus: "Finishing",
  trainingFocuses: ["Finishing"],
  trainingCompletedWeek: 0,
  intensity: "Balanced",
  attributes: initialAttributes,
  seasonStats: {
    apps: 0,
    starts: 0,
    goals: 0,
    assists: 0,
    ratings: [],
  },
  season: {
    season: 1,
    fixtureIndex: 0,
    fixtures: seasonFixtures,
    results: [],
  },
  lastEvent: "Pre-season complete. Your first senior fixture is waiting.",
};

const navItems = [
  { key: "player" as const, label: "Player", icon: UserRound },
  { key: "training" as const, label: "Training", icon: Dumbbell },
  { key: "club" as const, label: "Club", icon: Building2 },
  { key: "home" as const, label: "Home", icon: Home },
];

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("player");
  const [game, setGame] = useState<GameState>(initialState);
  const [matchSpeed, setMatchSpeed] = useState<MatchSpeed>(2);

  const activeNav =
    activeScreen === "pre-match" || activeScreen === "match" || activeScreen === "summary" || activeScreen === "training-summary"
      ? undefined
      : activeScreen;
  const isMatchDay = hasPlayableFixture(game.season);
  const needsTraining = game.trainingCompletedWeek !== game.week;
  const advanceLabel =
    activeScreen === "pre-match"
      ? "Start Match"
      : activeScreen === "match"
      ? game.activeMatch?.isComplete
        ? "Finish Match"
        : "In Match"
      : activeScreen === "summary"
        ? "Continue Career"
      : activeScreen === "training-summary"
        ? "Continue Career"
        : activeScreen === "training" && needsTraining
          ? "Start Training"
        : needsTraining
          ? "Training"
        : isMatchDay
          ? "Match Day"
          : "Next Week";

  useEffect(() => {
    if (activeScreen !== "match" || !game.activeMatch || game.activeMatch.currentResult) {
      return;
    }

    const timer = window.setInterval(() => {
      setGame((state) => {
        if (!state.activeMatch || state.activeMatch.currentResult || state.activeMatch.isComplete) {
          return state;
        }

        const match = state.activeMatch;
        const nextEvent = match.events[match.currentEventIndex];

        if (!nextEvent) {
          return {
            ...state,
            activeMatch: {
              ...match,
              liveMinute: Math.min(90, match.liveMinute + 1),
              isComplete: match.liveMinute >= 90,
            },
          };
        }

        if (match.liveMinute >= nextEvent.minute) {
          if (nextEvent.type === "player_moment") {
            return state;
          }

          return {
            ...state,
            activeMatch: {
              ...match,
              currentEventIndex: match.currentEventIndex + 1,
            },
          };
        }

        return {
          ...state,
          activeMatch: {
            ...match,
            liveMinute: Math.min(nextEvent.minute, match.liveMinute + 1),
          },
        };
      });
    }, 550 / matchSpeed);

    return () => window.clearInterval(timer);
  }, [activeScreen, game.activeMatch, matchSpeed]);

  function setTrainingFocus(focus: AttributeKey) {
    setGame((state) => ({
      ...state,
      trainingFocuses: [focus],
      selectedFocus: focus,
      lastEvent: `${focus} selected for this week's training.`,
    }));
  }

  function setIntensity(intensity: Intensity) {
    setGame((state) => ({
      ...state,
      intensity,
      lastEvent: `${intensity} intensity selected.`,
    }));
  }

  function handleAdvance() {
    if (activeScreen === "match") {
      if (game.activeMatch?.isComplete && !game.activeMatch.currentResult) {
        finishMatch();
      }
      return;
    }

    if (activeScreen === "summary") {
      closeSummary();
      return;
    }

    if (activeScreen === "pre-match") {
      if (!game.activeMatch && isMatchDay) {
        setGame((state) => ({ ...state, activeMatch: createMatch(state, getUpcomingMatch(state)) }));
      }
      setActiveScreen("match");
      return;
    }

    if (activeScreen === "training-summary") {
      closeTrainingSummary();
      return;
    }

    if (activeScreen === "training" && needsTraining) {
      startTraining();
      return;
    }

    if (needsTraining) {
      setActiveScreen("training");
      return;
    }

    if (isMatchDay) {
      setGame((state) => ({ ...state, activeMatch: createMatch(state, getUpcomingMatch(state)) }));
      setActiveScreen("pre-match");
      return;
    }

    setGame((state) => ({
      ...state,
      week: state.week + 1,
      lastEvent: "Week advanced. Confirm your next training focus before anything else.",
    }));
    setActiveScreen("player");
  }

  function startTraining() {
    setGame((state) => applyTrainingWeek(state));
    setActiveScreen("training-summary");
  }

  function resolveMatchChoice(choice: MatchChoice) {
    setGame((state) => {
      if (!state.activeMatch || state.activeMatch.currentResult) {
        return state;
      }

      const event = state.activeMatch.events[state.activeMatch.currentEventIndex];
      if (!event || event.type !== "player_moment") {
        return state;
      }

      const moment = event;
      const result = { ...createMatchResult(state, moment, choice), source: "manual" as const };
      return {
        ...state,
        activeMatch: {
          ...state.activeMatch,
          currentResult: result,
        },
      };
    });
  }

  function continueMatch() {
    setGame((state) => {
      if (!state.activeMatch) {
        return state;
      }

      const results = state.activeMatch.currentResult
        ? [...state.activeMatch.results, state.activeMatch.currentResult]
        : state.activeMatch.results;
      const nextIndex = state.activeMatch.currentEventIndex + 1;

      if (nextIndex >= state.activeMatch.events.length) {
        return {
          ...state,
          activeMatch: {
            ...state.activeMatch,
            currentEventIndex: state.activeMatch.events.length,
            results,
            currentResult: undefined,
          },
        };
      }

      return {
        ...state,
        activeMatch: {
          ...state.activeMatch,
          currentEventIndex: nextIndex,
          results,
          currentResult: undefined,
        },
      };
    });
  }

  function skipToNextEvent() {
    setGame((state) => {
      if (!state.activeMatch || state.activeMatch.currentResult || state.activeMatch.isComplete) {
        return state;
      }

      const match = state.activeMatch;
      const nextEvent = match.events[match.currentEventIndex];

      if (!nextEvent) {
        return {
          ...state,
          activeMatch: {
            ...match,
            liveMinute: 90,
            isComplete: true,
          },
        };
      }

      return {
        ...state,
        activeMatch: {
          ...match,
          liveMinute: nextEvent.minute,
        },
      };
    });
  }

  function skipToNextHighlight() {
    setGame((state) => {
      if (!state.activeMatch || state.activeMatch.currentResult || state.activeMatch.isComplete) {
        return state;
      }

      const match = state.activeMatch;
      const nextPlayerIndex = match.events.findIndex(
        (event, index) => index >= match.currentEventIndex && event.type === "player_moment",
      );

      if (nextPlayerIndex === -1) {
        return {
          ...state,
          activeMatch: {
            ...match,
            currentEventIndex: match.events.length,
            liveMinute: 90,
            isComplete: true,
          },
        };
      }

      const nextPlayerEvent = match.events[nextPlayerIndex];
      return {
        ...state,
        activeMatch: {
          ...match,
          currentEventIndex: nextPlayerIndex,
          liveMinute: nextPlayerEvent.minute,
        },
      };
    });
  }

  function skipToFullTime() {
    setGame((state) => {
      if (!state.activeMatch || state.activeMatch.currentResult) {
        return state;
      }

      const simulatedResults = simulateRemainingPlayerMoments(state, state.activeMatch);
      return {
        ...state,
        activeMatch: {
          ...state.activeMatch,
          currentEventIndex: state.activeMatch.events.length,
          liveMinute: 90,
          results: [...state.activeMatch.results, ...simulatedResults],
          isComplete: true,
        },
      };
    });
  }

  function finishMatch() {
    setGame((state) => {
      if (!state.activeMatch) {
        return state;
      }

      const results = state.activeMatch.currentResult
        ? [...state.activeMatch.results, state.activeMatch.currentResult]
        : state.activeMatch.results;

      return finishMatchState(state, results);
    });
    setActiveScreen("summary");
  }

  function closeSummary() {
    setActiveScreen("player");
  }

  function closeTrainingSummary() {
    setActiveScreen("player");
  }

  function navigate(nav: NavKey) {
    setActiveScreen(nav);
  }

  return (
    <main className="app-shell">
      <section className="phone-frame" aria-label="Football Dynasty prototype">
        <div className="status-bar" aria-hidden="true">
          <span>9:41</span>
          <span className="status-icons">5G 100%</span>
        </div>

        <div className="screen-scroll">
          {activeScreen === "player" && <PlayerScreen game={game} />}
          {activeScreen === "training" && (
            <TrainingScreen
              game={game}
              onIntensityChange={setIntensity}
              onFocusChange={setTrainingFocus}
            />
          )}
          {activeScreen === "club" && <ClubScreen game={game} />}
          {activeScreen === "home" && <HomeScreen game={game} />}
          {activeScreen === "pre-match" && game.activeMatch && <PreMatchScreen match={game.activeMatch} />}
          {activeScreen === "match" && game.activeMatch && (
            <MatchMomentScreen
              attributes={game.attributes}
              match={game.activeMatch}
              onChoose={resolveMatchChoice}
              onContinue={continueMatch}
              onSetMatchSpeed={setMatchSpeed}
              onSkipToEvent={skipToNextEvent}
              onSkipToHighlight={skipToNextHighlight}
              onSkipToFullTime={skipToFullTime}
              matchSpeed={matchSpeed}
            />
          )}
          {activeScreen === "summary" && game.lastMatch && (
            <PostMatchSummaryScreen attributes={game.attributes} summary={game.lastMatch} />
          )}
          {activeScreen === "training-summary" && game.lastTraining && (
            <TrainingSummaryScreen
              attributes={game.attributes}
              summary={game.lastTraining}
            />
          )}
        </div>

        <BottomNav
          activeNav={activeNav}
          advanceLabel={advanceLabel}
          disabled={activeScreen === "match" && (!game.activeMatch?.isComplete || Boolean(game.activeMatch.currentResult))}
          onAdvance={handleAdvance}
          onNavigate={navigate}
        />
      </section>
    </main>
  );
}

function PlayerScreen({ game }: { game: GameState }) {
  return (
    <>
      <Header game={game} />
      <CareerCard game={game} />
      <ReadinessStrip game={game} />
      <SeasonContextCard game={game} />
      <NextActionCard game={game} />
      <SelectionBriefingCard game={game} />
      {game.lastMatch && <LastMatchCard summary={game.lastMatch} />}
      <AttributesCard
        attributes={game.attributes}
        positionModule={getPositionModule(game.positionGroup)}
        recentXp={game.lastTraining?.xp}
      />
      <SeasonSnapshot stats={game.seasonStats} />
      <RelationshipsCard game={game} />
      <ContractMarketCard game={game} />
      <EquipmentFacilitiesCard />
    </>
  );
}

function SelectionBriefingCard({ game }: { game: GameState }) {
  const upcomingMatch = getUpcomingMatch(game);
  const nextRoleText = upcomingMatch.selection.nextRole
    ? `${upcomingMatch.selection.pointsToNextRole} pts to ${upcomingMatch.selection.nextRole}`
    : "Starter role secured";

  return (
    <section className="card selection-card">
      <div className="section-heading">
        <div>
          <span className="metric-label">Selection briefing</span>
          <h2>{upcomingMatch.playerRole}</h2>
        </div>
        <ShieldCheck size={19} />
      </div>
      <div className="selection-score-hero">
        <div>
          <span>Manager score</span>
          <strong>{upcomingMatch.selection.score}</strong>
        </div>
        <div className="selection-score-copy">
          <b>{nextRoleText}</b>
          <ProgressBar value={upcomingMatch.selection.score} />
          <small>Score factors for next match</small>
        </div>
      </div>
      <div className="selection-factor-grid">
        {upcomingMatch.selection.factors.map((factor) => (
          <div className={`selection-factor tone-${factor.tone}`} key={factor.label}>
            <span>{factor.label}</span>
            <strong>{factor.value}</strong>
            <em>
              {factor.impact > 0 ? "+" : ""}
              {factor.impact}
            </em>
          </div>
        ))}
      </div>
    </section>
  );
}

function SeasonContextCard({ game }: { game: GameState }) {
  const record = getSeasonRecord(game.season.results);
  const currentFixture = getCurrentFixture(game.season);
  const progress = ((game.season.fixtureIndex + 1) / game.season.fixtures.length) * 100;

  return (
    <section className="card season-context-card">
      <div className="section-heading">
        <div>
          <span className="metric-label">Season context</span>
          <h2>
            Match {game.season.fixtureIndex + 1}/{game.season.fixtures.length}
          </h2>
        </div>
        <BarChart3 size={19} />
      </div>
      <ProgressBar value={progress} />
      <div className="next-grid">
        <InfoTile label="Record" value={`${record.wins}-${record.draws}-${record.losses}`} tone={record.wins > record.losses ? "good" : undefined} />
        <InfoTile label="Form" value={getRecentFormText(game.season.results)} />
        <InfoTile label="Next" value={currentFixture.opponentShort} tone={currentFixture.competition.includes("Cup") ? "gold" : undefined} />
      </div>
    </section>
  );
}

function LastMatchCard({ summary }: { summary: LastMatchSummary }) {
  return (
    <section className="card last-match-card">
      <div className="section-heading">
        <div>
          <span className="metric-label">Last match</span>
          <h2>
            Match {summary.matchNumber}/{summary.seasonLength}
          </h2>
          <p>{summary.venue} vs {summary.opponent}</p>
        </div>
        <Trophy size={19} />
      </div>
      <div className="next-grid">
        <InfoTile label="Score" value={`${summary.teamGoals}-${summary.opponentGoals}`} tone="gold" />
        <InfoTile label="Rating" value={summary.rating.toFixed(1)} tone="gold" />
        <InfoTile label="Trust" value={`${summary.trustDelta > 0 ? "+" : ""}${summary.trustDelta}`} />
      </div>
      <p>{summary.careerImpact[0]}</p>
    </section>
  );
}

function Header({ game }: { game: GameState }) {
  return (
    <header className="hero-header">
      <div className="avatar-card">
        <div className="avatar-core">
          <Shirt size={30} strokeWidth={1.8} />
        </div>
        <span className="avatar-ring" />
      </div>

      <div className="player-identity">
        <div className="eyebrow">Week {game.week} - Season 1</div>
        <h1>Jonas Vale</h1>
        <div className="identity-row">
          <span>17 yrs</span>
          <span>{game.positionCode}</span>
          <span>{game.archetype}</span>
        </div>
        <div className="club-chip">
          <span className="club-dot" />
          Northbridge FC
        </div>
      </div>

      <div className="resource-stack" aria-label="Resources">
        <ResourcePill icon={<BadgeDollarSign size={14} />} value={`$${game.cash}`} />
        <ResourcePill icon={<Sparkles size={14} />} value={`${game.prestige}`} />
      </div>
    </header>
  );
}

function ResourcePill({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="resource-pill">
      {icon}
      <span>{value}</span>
    </div>
  );
}

function CareerCard({ game }: { game: GameState }) {
  const ovr = calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights);
  const upcomingMatch = getUpcomingMatch(game);
  const status = upcomingMatch.selection.role === "Bench" ? "Prospect" : upcomingMatch.selection.role;
  const nextRoleText = upcomingMatch.selection.nextRole
    ? `${upcomingMatch.selection.pointsToNextRole} pts to ${upcomingMatch.selection.nextRole}`
    : "Starter secured";

  return (
    <section className="card career-card">
      <div className="career-score">
        <div>
          <span className="metric-label">OVR</span>
          <strong>{ovr}</strong>
        </div>
      </div>

      <div className="career-details">
        <InfoRow label="Squad status" value={status} />
        <InfoRow label="Expected minutes" value={upcomingMatch.expectedMinutes} />
        <ProgressRow label="Manager trust" value={game.trust} accent="lime" />
        <ProgressRow label="Selection score" value={upcomingMatch.selection.score} display={`${upcomingMatch.selection.score}/100`} accent="gold" />
        <InfoRow label="Next role" value={nextRoleText} />
      </div>
    </section>
  );
}

function ReadinessStrip({ game }: { game: GameState }) {
  const [selectedReadiness, setSelectedReadiness] = useState<string | undefined>();
  const readiness = [
    {
      label: "Fitness",
      value: game.fitness,
      state: game.fitness > 78 ? "Ready" : game.fitness > 58 ? "Tired" : "Heavy",
      icon: HeartPulse,
    },
    {
      label: "Form",
      value: getFormScore(game.seasonStats.ratings),
      state: getFormLabel(game.seasonStats.ratings),
      icon: BarChart3,
    },
    {
      label: "Morale",
      value: game.morale,
      state: game.morale > 70 ? "Happy" : game.morale > 45 ? "Content" : "Frustrated",
      icon: Flame,
    },
    {
      label: "Pressure",
      value: game.pressure,
      state: game.pressure > 70 ? "High" : game.pressure > 40 ? "Rising" : "Low",
      icon: Gauge,
    },
  ];
  const selectedItem = readiness.find((item) => item.label === selectedReadiness);
  const selectedDetails = selectedItem ? getReadinessDetails(game, selectedItem.label) : [];

  return (
    <section className="readiness-grid" aria-label="Readiness">
      {readiness.map((item) => {
        const Icon = item.icon;
        return (
          <button className="mini-card readiness-card" key={item.label} type="button" onClick={() => setSelectedReadiness(item.label)}>
            <div className="mini-icon">
              <Icon size={15} />
            </div>
            <span>{item.label}</span>
            <strong>{item.state}</strong>
            <ProgressBar value={item.value} />
          </button>
        );
      })}

      {selectedItem && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedReadiness(undefined)}>
          <div
            className="attribute-modal readiness-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedItem.label} details`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <span className="metric-label">Readiness</span>
                <h2>{selectedItem.label}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close readiness details" onClick={() => setSelectedReadiness(undefined)}>
                x
              </button>
            </div>
            <div className="readiness-modal-score">
              <strong>{selectedItem.value}/100</strong>
              <span>{selectedItem.state}</span>
              <ProgressBar value={selectedItem.value} />
            </div>
            <div className="attribute-modal-impact readiness-detail-list">
              {selectedDetails.map((detail) => (
                <div className="readiness-detail-row" key={detail.label}>
                  <span>{detail.label}</span>
                  <strong>{detail.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function getReadinessDetails(game: GameState, label: string) {
  const upcomingMatch = getUpcomingMatch(game);
  const averageRating = getAverageRating(game.seasonStats.ratings);
  const lastRating = game.seasonStats.ratings.at(-1);

  if (label === "Fitness") {
    return [
      { label: "Current level", value: `${game.fitness}/100` },
      { label: "Last training", value: game.lastTraining ? formatSigned(game.lastTraining.fitnessDelta) : "No session yet" },
      { label: "Last match", value: game.lastMatch ? formatSigned(game.lastMatch.fitnessDelta) : "No match yet" },
      { label: "Selection impact", value: game.fitness >= 75 ? "Strong minutes case" : game.fitness >= 58 ? "Playable but tired" : "Minutes risk" },
    ];
  }

  if (label === "Form") {
    return [
      { label: "Form score", value: `${getFormScore(game.seasonStats.ratings)}/100` },
      { label: "Average rating", value: averageRating.toFixed(1) },
      { label: "Last rating", value: lastRating ? lastRating.toFixed(1) : "No match yet" },
      { label: "Sample", value: `${game.seasonStats.ratings.length} recent match${game.seasonStats.ratings.length === 1 ? "" : "es"}` },
    ];
  }

  if (label === "Morale") {
    return [
      { label: "Current level", value: `${game.morale}/100` },
      { label: "Last training", value: game.lastTraining ? formatSigned(game.lastTraining.moraleDelta) : "No session yet" },
      { label: "Last match", value: game.lastMatch ? formatSigned(game.lastMatch.moraleDelta) : "No match yet" },
      { label: "Mood effect", value: game.morale >= 70 ? "Positive environment" : game.morale >= 45 ? "Stable" : "Confidence drag" },
    ];
  }

  return [
    { label: "Current level", value: `${game.pressure}/100` },
    { label: "Next match", value: `${upcomingMatch.venue} vs ${upcomingMatch.opponentShort}` },
    { label: "Importance", value: upcomingMatch.matchImportance },
    { label: "Selection fight", value: upcomingMatch.selection.nextRole ? `${upcomingMatch.selection.pointsToNextRole} pts to ${upcomingMatch.selection.nextRole}` : "Starter secured" },
  ];
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function NextActionCard({ game }: { game: GameState }) {
  const isMatchDay = hasPlayableFixture(game.season);
  const needsTraining = game.trainingCompletedWeek !== game.week;
  const focus = getCurrentTrainingFocuses(game)[0];
  const projection = getTrainingProjection(game);
  const upcomingMatch = getUpcomingMatch(game);
  const focusRange = projection.ranges[focus];

  return (
    <section className="card next-card">
      <div className="section-heading">
        <div>
          <span className="metric-label">{!needsTraining && isMatchDay ? "Match Day" : "Next Action"}</span>
          <h2>
            {!needsTraining && isMatchDay
              ? formatFixtureTitle(upcomingMatch.venue, upcomingMatch.opponentShort)
              : needsTraining
                ? "Complete weekly training"
                : "Ready for next week"}
          </h2>
        </div>
        <CalendarDays size={19} />
      </div>

      <div className="next-grid">
        <InfoTile label="Role" value={!needsTraining && isMatchDay ? upcomingMatch.playerRole : "Prospect"} />
        <InfoTile label="Focus" value={!needsTraining && isMatchDay ? upcomingMatch.tacticalFocus : focus} />
        <InfoTile
          label={needsTraining ? "XP Range" : "Status"}
          value={needsTraining && focusRange ? `${focusRange.min}-${focusRange.max}` : !needsTraining && isMatchDay ? upcomingMatch.matchImportance : "Trained"}
          tone={needsTraining ? "good" : undefined}
        />
      </div>

      <div className="match-hint">
        <Activity size={16} />
        <span>
          {!needsTraining && isMatchDay
            ? `${upcomingMatch.competition}. ${upcomingMatch.selection.summary}`
            : game.lastEvent}
        </span>
      </div>
    </section>
  );
}

function AttributesCard({
  attributes,
  positionModule,
  recentXp,
}: {
  attributes: Attribute[];
  positionModule: PositionModule;
  recentXp?: Partial<Record<AttributeKey, number>>;
}) {
  const [showAll, setShowAll] = useState(false);
  const keyAttributes = positionModule.keyAttributes;
  const visibleAttributes = showAll
    ? attributes
    : attributes.filter((attribute) => keyAttributes.includes(attribute.label));

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <span className="metric-label">Key attributes</span>
          <h2>{showAll ? "Full profile" : `${positionModule.displayName} essentials`}</h2>
        </div>
        <button
          className={`icon-button ${showAll ? "is-open" : ""}`}
          aria-label={showAll ? "Show key attributes" : "View all attributes"}
          type="button"
          onClick={() => setShowAll((value) => !value)}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="attribute-list">
        {visibleAttributes.map((attribute) => {
          const info = attributeInfo[attribute.label];
          const recentGain = recentXp?.[attribute.label] ?? 0;
          const xpToLevel = Math.max(0, 100 - attribute.xp);
          return (
            <div className="attribute-row" key={attribute.label}>
              <div className="attribute-topline">
                <span>{attribute.label}</span>
                <div className="attribute-score">
                  {recentGain > 0 && <small className="recent-xp">+{recentGain} XP</small>}
                  <strong>{attribute.value}</strong>
                </div>
              </div>
              {showAll && (
                <div className="attribute-description">
                  <span>{info.group}</span>
                  <p>{info.description}</p>
                  <small>{info.affects}</small>
                </div>
              )}
              <div className="attribute-xp-line">
                <span>Next level</span>
                <em>{xpToLevel} XP</em>
              </div>
              <div className="attribute-track" aria-label={`${attribute.label} ${attribute.xp}% XP to next level`}>
                <span style={{ width: `${attribute.xp}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SeasonSnapshot({ stats }: { stats: SeasonStats }) {
  const maxRating = 10;
  const averageRating = getAverageRating(stats.ratings).toFixed(1);

  return (
    <section className="card season-card">
      <div className="section-heading">
        <div>
          <span className="metric-label">Season snapshot</span>
          <h2>First team door opening</h2>
        </div>
        <Trophy size={19} />
      </div>

      <div className="stat-grid">
        <InfoTile label="Apps" value={`${stats.apps}`} />
        <InfoTile label="Starts" value={`${stats.starts}`} />
        <InfoTile label="Goals" value={`${stats.goals}`} tone="gold" />
        <InfoTile label="Avg rating" value={averageRating} />
      </div>

      <div className="rating-trend" aria-label="Last five match ratings">
        {stats.ratings.map((rating, index) => (
          <span key={`${rating}-${index}`} style={{ height: `${(rating / maxRating) * 100}%` }}>
            <i>{rating.toFixed(1)}</i>
          </span>
        ))}
      </div>
    </section>
  );
}

function RelationshipsCard({ game }: { game: GameState }) {
  const relationships = [
    { label: "Manager", status: getTrustStatus(game.trust), value: game.trust },
    { label: "Teammates", status: "Neutral", value: 51 },
    { label: "Agent", status: "Basic", value: 34 },
    { label: "Fans", status: game.prestige > 18 ? "Noticing" : "Unknown", value: Math.min(100, 18 + game.prestige) },
  ];

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <span className="metric-label">Relationships</span>
          <h2>Trust network</h2>
        </div>
        <UsersRound size={19} />
      </div>

      <div className="relationship-list">
        {relationships.map((relationship) => (
          <ProgressRow
            key={relationship.label}
            label={relationship.label}
            value={relationship.value}
            display={relationship.status}
            accent={relationship.label === "Manager" ? "lime" : "neutral"}
          />
        ))}
      </div>
    </section>
  );
}

function ContractMarketCard({ game }: { game: GameState }) {
  const marketValue = 18 + Math.round((calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights) - 50) * 2.5) + game.seasonStats.goals * 2;

  return (
    <section className="card split-card">
      <div>
        <span className="metric-label">Contract</span>
        <h2>$120/wk</h2>
        <p>18 months left</p>
      </div>
      <div>
        <span className="metric-label">Market</span>
        <h2>${marketValue}k</h2>
        <p>{game.prestige > 20 ? "Regional interest" : "Local interest"}</p>
      </div>
    </section>
  );
}

function EquipmentFacilitiesCard() {
  const items = ["Starter boots", "Shared gym", "Basic agent"];

  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <span className="metric-label">Setup</span>
          <h2>Equipment and facilities</h2>
        </div>
        <ShieldCheck size={19} />
      </div>

      <div className="chip-row">
        {items.map((item) => (
          <span className="soft-chip" key={item}>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function TrainingScreen({
  game,
  onIntensityChange,
  onFocusChange,
}: {
  game: GameState;
  onIntensityChange: (intensity: Intensity) => void;
  onFocusChange: (focus: AttributeKey) => void;
}) {
  const [detailAttribute, setDetailAttribute] = useState<AttributeKey | undefined>(undefined);
  const projected = getTrainingProjection(game);
  const focus = getCurrentTrainingFocuses(game)[0];
  const focusRange = projected.ranges[focus];
  const detailInfo = detailAttribute ? attributeInfo[detailAttribute] : undefined;
  const positionModule = getPositionModule(game.positionGroup);

  return (
    <section className="simple-screen">
      <ScreenTitle label="Training" title="Confirm session" />
      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Expected outcome</span>
            <h2>{getTrainingIntensityLabel(game.intensity)}</h2>
          </div>
          <Dumbbell size={19} />
        </div>
        <ProgressRow label="Readiness" value={game.fitness} accent="lime" />
        <ProgressRow
          label={`${focus} XP range`}
          value={focusRange ? focusRange.max : 0}
          display={focusRange ? `${focusRange.min}-${focusRange.max} XP` : "No focus"}
          accent="lime"
        />
        <ProgressRow label="Fitness impact" value={Math.abs(projected.fitnessDelta) * 10} display={`${projected.fitnessDelta}`} accent="neutral" />
      </div>

      <div className="card training-slot-card">
        <span className="metric-label">Stat focus</span>
        <div className="training-stat-grid">
          {game.attributes.map((attribute) => {
            const info = attributeInfo[attribute.label];
            const isKeyAttribute = positionModule.keyAttributes.includes(attribute.label);
            return (
              <div
                className={`stat-focus-button ${focus === attribute.label ? "is-active" : ""} ${isKeyAttribute ? "is-key" : ""}`}
                key={attribute.label}
                role="button"
                tabIndex={0}
                onClick={() => onFocusChange(attribute.label)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onFocusChange(attribute.label);
                  }
                }}
              >
                <span className="stat-focus-name">{attribute.label}</span>
                <span className="stat-focus-value">{attribute.value}</span>
                <small>{info.group}</small>
                <button
                  className="stat-info-button"
                  type="button"
                  aria-label={`${attribute.label} details`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDetailAttribute(attribute.label);
                  }}
                >
                  i
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {detailAttribute && detailInfo && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDetailAttribute(undefined)}>
          <div className="attribute-modal" role="dialog" aria-modal="true" aria-label={`${detailAttribute} details`} onClick={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <div>
                <span className="metric-label">{detailInfo.group}</span>
                <h2>{detailAttribute}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close attribute details" onClick={() => setDetailAttribute(undefined)}>
                x
              </button>
            </div>
            <p>{detailInfo.description}</p>
            <div className="attribute-modal-impact">
              <span>Affects</span>
              <strong>{detailInfo.affects}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="card segmented-card">
        <span className="metric-label">Intensity</span>
        <div className="segmented-control">
          {(["Light", "Balanced", "Hard"] as Intensity[]).map((intensity) => (
            <button
              className={game.intensity === intensity ? "is-selected" : ""}
              key={intensity}
              type="button"
              onClick={() => onIntensityChange(intensity)}
            >
              {intensity}
            </button>
          ))}
        </div>
      </div>

    </section>
  );
}

function MatchScoreHeader({
  liveMinute,
  match,
  teamGoals,
  opponentGoals,
}: {
  liveMinute: number;
  match: MatchState;
  teamGoals: number;
  opponentGoals: number;
}) {
  const homeName = match.venue === "Home" ? "Northbridge" : match.opponent;
  const awayName = match.venue === "Home" ? match.opponent : "Northbridge";
  const homeGoals = match.venue === "Home" ? teamGoals : opponentGoals;
  const awayGoals = match.venue === "Home" ? opponentGoals : teamGoals;

  return (
    <header className="match-score-header">
      <span className="metric-label">{liveMinute}'</span>
      <div className="scoreboard-row">
        <strong>{homeName}</strong>
        <div className="score-pill">
          {homeGoals}-{awayGoals}
        </div>
        <strong>{awayName}</strong>
      </div>
      <small>{match.competition}</small>
    </header>
  );
}

function SummaryScoreHeader({ summary }: { summary: LastMatchSummary }) {
  const homeName = summary.venue === "Home" ? "Northbridge" : summary.opponent;
  const awayName = summary.venue === "Home" ? summary.opponent : "Northbridge";
  const homeGoals = summary.venue === "Home" ? summary.teamGoals : summary.opponentGoals;
  const awayGoals = summary.venue === "Home" ? summary.opponentGoals : summary.teamGoals;

  return (
    <header className="match-score-header summary-score-header">
      <span className="metric-label">{summary.competition} - Match {summary.matchNumber}/{summary.seasonLength}</span>
      <div className="scoreboard-row">
        <strong>{homeName}</strong>
        <div className="score-pill">
          {homeGoals}-{awayGoals}
        </div>
        <strong>{awayName}</strong>
      </div>
      <small>Full time</small>
    </header>
  );
}

function PreMatchScreen({ match }: { match: MatchState }) {
  const matchupDelta = match.teamStrength - match.opponentStrength;
  const matchupTone = matchupDelta >= 4 ? "good" : matchupDelta <= -4 ? "warn" : undefined;
  const entryPlan = getPreMatchEntryPlan(match);

  return (
    <section className="simple-screen pre-match-screen">
      <ScreenTitle
        label={`${match.competition} - Match ${match.matchNumber}/${match.seasonLength}`}
        title="Pre-match"
      />

      <MatchScoreHeader
        liveMinute={0}
        match={match}
        opponentGoals={0}
        teamGoals={0}
      />

      <div className="card pre-match-plan-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Player plan</span>
            <h2>{match.playerRole}</h2>
          </div>
          <ShieldCheck size={19} />
        </div>
        <div className="next-grid">
          <InfoTile label="Expected time" value={match.expectedMinutes} tone="gold" />
          <InfoTile label="Entry plan" value={entryPlan} />
          <InfoTile label="Selection" value={`${match.selectionScore}/100`} tone={match.selectionScore >= 60 ? "good" : undefined} />
        </div>
      </div>

      <div className="card pre-match-brief-card">
        <span className="metric-label">Manager brief</span>
        <h2>{match.tacticalFocus}</h2>
        <p>{match.managerInstruction}</p>
      </div>

      <div className="card">
        <span className="metric-label">Opponent context</span>
        <div className="next-grid">
          <InfoTile label="Opponent" value={match.opponent} />
          <InfoTile label="Venue" value={match.venue} />
          <InfoTile label="Importance" value={match.matchImportance} tone={match.matchImportance === "High" ? "gold" : undefined} />
          <InfoTile label="Opponent form" value={match.opponentForm} tone={match.opponentForm === "Hot" ? "warn" : undefined} />
          <InfoTile label="Service" value={match.serviceLevel} tone={match.serviceLevel === "Good" ? "good" : undefined} />
          <InfoTile label="Matchup" value={getMatchupText(matchupDelta)} tone={matchupTone} />
          <InfoTile label="Def. line" value={match.opponentProfile.defensiveLine} />
          <InfoTile label="Pressing" value={match.opponentProfile.pressing} tone={match.opponentProfile.pressing === "Aggressive" ? "warn" : undefined} />
        </div>
      </div>
    </section>
  );
}

function getPreMatchEntryPlan(match: MatchState) {
  if (match.playerRole === "Starter") {
    return "Start XI";
  }

  if (match.playerRole === "Rotation Starter") {
    return "Start, managed load";
  }

  if (match.playerRole === "Impact Sub") {
    if (match.entryMinute <= 56) {
      return "Early second half";
    }

    if (match.entryMinute <= 70) {
      return "If chasing or tired legs";
    }

    return "Late attacking option";
  }

  if (match.entryMinute <= 65) {
    return "If match opens up";
  }

  return "Late bench option";
}

function MatchMomentScreen({
  attributes,
  match,
  matchSpeed,
  onChoose,
  onContinue,
  onSetMatchSpeed,
  onSkipToEvent,
  onSkipToHighlight,
  onSkipToFullTime,
}: {
  attributes: Attribute[];
  match: MatchState;
  matchSpeed: MatchSpeed;
  onChoose: (choice: MatchChoice) => void;
  onContinue: () => void;
  onSetMatchSpeed: (speed: MatchSpeed) => void;
  onSkipToEvent: () => void;
  onSkipToHighlight: () => void;
  onSkipToFullTime: () => void;
}) {
  const event = match.events[match.currentEventIndex];
  const isPlayerMoment = event?.type === "player_moment" && match.liveMinute >= event.minute;
  const completedResults = match.currentResult ? [...match.results, match.currentResult] : match.results;
  const processedEventIndex = isPlayerMoment ? match.currentEventIndex : match.currentEventIndex - 1;
  const simTotals = summarizeSimEvents(match.events, processedEventIndex);
  const totals = summarizeMatchResults(completedResults, simTotals);
  const visibleScore = getTimelineScore(match, completedResults, processedEventIndex);
  const recentEvents = getRecentTimelineItems(match, completedResults);
  const nextEventMinute = event ? `${event.minute}'` : "FT";
  const pitchStatus = getPitchStatus(match);

  return (
    <section className="simple-screen match-screen">
      <MatchScoreHeader
        liveMinute={match.liveMinute}
        match={match}
        opponentGoals={visibleScore.opponentGoals}
        teamGoals={visibleScore.teamGoals}
      />

      <div className="match-progress-card">
        <span>
          {isPlayerMoment ? "Player moment" : match.isComplete ? "Full time" : `Live - next ${nextEventMinute}`}
        </span>
        <ProgressBar value={(match.liveMinute / 90) * 100} />
      </div>

      <div className={`match-role-card ${pitchStatus.tone}`}>
        <div>
          <span className="metric-label">Player status</span>
          <strong>{pitchStatus.label}</strong>
          <small>{pitchStatus.detail}</small>
        </div>
        <div className="match-role-meta">
          <span>{match.playerRole}</span>
          <b>{getAppearanceText(match)}</b>
        </div>
      </div>

      {!isPlayerMoment && !match.isComplete && (
        <div className="match-control-card">
          <div className="speed-control" aria-label="Match speed">
            {([1, 2, 4] as MatchSpeed[]).map((speed) => (
              <button
                className={matchSpeed === speed ? "is-selected" : ""}
                key={speed}
                type="button"
                onClick={() => onSetMatchSpeed(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
          <div className="skip-grid">
            <button type="button" onClick={onSkipToEvent}>
              Next Event
            </button>
            <button type="button" onClick={onSkipToHighlight}>
              Highlight
            </button>
            <button type="button" onClick={onSkipToFullTime}>
              Sim Full Time
            </button>
          </div>
        </div>
      )}

      <div className="card match-moment-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">{isPlayerMoment ? "Your moment" : match.isComplete ? "Full time" : "Live match"}</span>
            <h2>{isPlayerMoment ? event.situation : match.isComplete ? "Final whistle" : "Match in progress"}</h2>
          </div>
          {isPlayerMoment ? <Target size={19} /> : <Activity size={19} />}
        </div>
        <p>
          {isPlayerMoment
            ? event.context
            : match.isComplete
              ? "The match is over. Review the final output and return to your player dashboard."
              : `${match.competition}. ${match.managerInstruction}`}
        </p>
      </div>

      {!isPlayerMoment && (
        <div className="card timeline-log-card">
          <span className="metric-label">Timeline</span>
          <div className="timeline-list">
            {recentEvents.length > 0 ? (
              recentEvents.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <strong>{item.minute}'</strong>
                  <span>{item.text}</span>
                </div>
              ))
          ) : (
              <div className="timeline-item">
                <strong>0'</strong>
                <span>Kickoff. Northbridge settle into shape.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isPlayerMoment && !match.currentResult && (
        <div className="card choice-preview">
          {event.choices.map((choice) => (
            <button className="match-choice" key={choice.id} type="button" onClick={() => onChoose(choice)}>
              <span>
                <strong>{choice.label}</strong>
                <small>
                  Uses: {choice.uses.join(" + ")} - Avg {getChoiceAttributeAverage(attributes, choice)}
                </small>
              </span>
              <span className="choice-tags">
                <em>{choice.risk} risk</em>
                <em>{choice.reward}</em>
                <em>{choice.manager}</em>
              </span>
            </button>
          ))}
        </div>
      )}

      {isPlayerMoment && match.currentResult && (
        <div className="result-popup-backdrop">
          <div className={`card result-card result-popup ${getResultPopupTone(match.currentResult.outcomeTier)}`}>
            <span className="metric-label">Result</span>
            <div className="result-verdict">
              <strong>{match.currentResult.outcomeTier}</strong>
              <span>{match.currentResult.chanceQuality}</span>
            </div>
            <h2>{match.currentResult.title}</h2>
            <p>{match.currentResult.detail}</p>
            <div className="next-grid">
              <InfoTile label="Rating" value={match.currentResult.rating.toFixed(1)} tone="gold" />
              <InfoTile label="Trust" value={`${match.currentResult.trustDelta > 0 ? "+" : ""}${match.currentResult.trustDelta}`} />
              <InfoTile label="Fitness" value={`${match.currentResult.fitnessDelta}`} tone="warn" />
            </div>
            <div className="result-explain-card">
              <div>
                <span>Why</span>
                <strong>{getOutcomeTierSummary(match.currentResult.outcomeTier)}</strong>
              </div>
              <ul>
                {getReadableExplanations(match.currentResult.explanationTags, 3).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
            <button className="primary-action" type="button" onClick={onContinue}>
              Resume Match
            </button>
          </div>
        </div>
      )}

      <div className="card match-summary-card">
        <span className="metric-label">Match so far</span>
        <div className="stat-grid">
          <InfoTile label="Goals" value={`${totals.goals}`} tone={totals.goals > 0 ? "gold" : undefined} />
          <InfoTile label="Assists" value={`${totals.assists}`} />
          <InfoTile label="Trust" value={`${totals.trustDelta > 0 ? "+" : ""}${totals.trustDelta}`} />
          <InfoTile label="Rating" value={totals.rating.toFixed(1)} tone="gold" />
        </div>
      </div>
    </section>
  );
}

function PostMatchSummaryScreen({ attributes, summary }: { attributes: Attribute[]; summary: LastMatchSummary }) {
  const xpEntries = Object.entries(summary.xp)
    .filter(([, value]) => (value ?? 0) > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 4);
  const xpProgressEntries = xpEntries.map(([attribute, value]) => {
    const key = attribute as AttributeKey;
    const currentAttribute = attributes.find((item) => item.label === key);
    const gain = value ?? 0;
    const currentXp = currentAttribute?.xp ?? 0;
    const previousXp = ((currentXp - gain) % 100 + 100) % 100;
    const completedLevel = previousXp + gain >= 100;
    const meterEndXp = completedLevel ? 100 : currentXp;
    const gainedMeterWidth = clamp(meterEndXp - previousXp, 0, 100 - previousXp);
    const meterSplit = meterEndXp > 0 ? clamp((previousXp / meterEndXp) * 100, 0, 100) : 0;
    const meterStyle = {
      "--xp-from": `${previousXp}%`,
      "--xp-to": `${meterEndXp}%`,
      "--xp-gain": `${gainedMeterWidth}%`,
      "--xp-split": `${meterSplit}%`,
    } as CSSProperties;

    return {
      attribute,
      currentXp,
      gain,
      meterStyle,
    };
  });
  const roleText =
    summary.roleBefore === summary.roleAfter ? summary.roleAfter : `${summary.roleBefore} -> ${summary.roleAfter}`;
  const nextRole = getNextRole(summary.roleAfter);
  const selectionTarget = nextRole ? getRoleThreshold(nextRole) : 100;
  const selectionBeforePercent = clamp((summary.selectionBefore / selectionTarget) * 100, 0, 100);
  const selectionAfterPercent = clamp((summary.selectionAfter / selectionTarget) * 100, 0, 100);
  const selectionGainPercent = clamp(selectionAfterPercent - selectionBeforePercent, 0, 100 - selectionBeforePercent);
  const selectionSplitPercent =
    selectionAfterPercent > 0 ? clamp((selectionBeforePercent / selectionAfterPercent) * 100, 0, 100) : 0;
  const selectionMeterStyle = {
    "--selection-before": `${selectionBeforePercent}%`,
    "--selection-after": `${selectionAfterPercent}%`,
    "--selection-gain": `${selectionGainPercent}%`,
    "--selection-split": `${selectionSplitPercent}%`,
  } as CSSProperties;
  const selectionStatus = nextRole
    ? `${summary.pointsToNextRole} pts to ${nextRole}`
    : "Starter role secured";
  const performanceReasons = getReadableExplanations(summary.explanationTags, 3);
  const performanceBreakdown = getUniqueItems(summary.performanceReasons, 4);
  const primaryChanceQuality = getPrimaryChanceQuality(summary.chanceQualities);

  return (
    <section className="simple-screen summary-screen">
      <SummaryScoreHeader summary={summary} />

      <div className="card summary-hero-card">
        <div>
          <span className="metric-label">
            {summary.venue} - {summary.playerRole}
          </span>
          <h2>{summary.rating.toFixed(1)}</h2>
          <p>Match rating</p>
        </div>
        <div className="summary-output">
          <InfoTile label="Goals" value={`${summary.goals}`} tone={summary.goals > 0 ? "gold" : undefined} />
          <InfoTile label="Assists" value={`${summary.assists}`} />
        </div>
      </div>

      {performanceReasons.length > 0 && (
        <div className="card">
          <div className="section-heading">
            <div>
              <span className="metric-label">Performance read</span>
              <h2>{primaryChanceQuality}</h2>
            </div>
            <Activity size={19} />
          </div>
          <div className="reason-list">
            {performanceReasons.map((reason) => (
              <div className="reason-item" key={reason}>
                <Sparkles size={14} />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {performanceBreakdown.length > 0 && (
        <div className="card">
          <div className="section-heading">
            <div>
              <span className="metric-label">Performance breakdown</span>
              <h2>Why the rating moved</h2>
            </div>
            <BarChart3 size={19} />
          </div>
          <div className="reason-list">
            {performanceBreakdown.map((reason) => (
              <div className="reason-item" key={reason}>
                <ShieldCheck size={14} />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <span className="metric-label">Career impact</span>
        <div className="selection-progress-card">
          <div className="selection-progress-copy">
            <div>
              <strong>{roleText}</strong>
              <span>{selectionStatus}</span>
            </div>
            <b>
              {`${summary.selectionBefore} -> ${summary.selectionAfter}`}
            </b>
          </div>
          <div className="selection-progress-track" aria-label="Selection score progress">
            <span className="selection-progress-fill" style={selectionMeterStyle} />
          </div>
        </div>
      </div>

      <div className="card">
        <span className="metric-label">Progress gained</span>
        <div className="stat-grid">
          <InfoTile label="Trust" value={`${summary.trustDelta > 0 ? "+" : ""}${summary.trustDelta}`} />
          <InfoTile label="Fitness" value={`${summary.fitnessDelta}`} tone="warn" />
          <InfoTile label="Cash" value={`+$${summary.cashDelta}`} tone="good" />
          <InfoTile label="Prestige" value={`+${summary.prestigeDelta}`} tone="gold" />
        </div>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Development XP</span>
            <h2>{xpEntries.length > 0 ? "Attributes improved" : "No major XP gains"}</h2>
          </div>
          <Dumbbell size={19} />
        </div>
        <div className="xp-progress-list">
          {xpProgressEntries.length > 0 ? (
            xpProgressEntries.map((entry) => (
              <div className="match-xp-progress" key={entry.attribute}>
                <div className="xp-meter-labels">
                  <span>{entry.attribute}</span>
                  <strong>
                    {entry.currentXp}/100 XP
                  </strong>
                </div>
                <div className="xp-meter-track" aria-label={`${entry.attribute} XP progress`}>
                  <span className="xp-meter-fill" style={entry.meterStyle} />
                </div>
                <small>+{entry.gain} XP gained</small>
              </div>
            ))
          ) : (
            <p>Keep earning minutes to create more development moments.</p>
          )}
        </div>
      </div>

    </section>
  );
}

function TrainingSummaryScreen({
  attributes,
  summary,
}: {
  attributes: Attribute[];
  summary: TrainingSummary;
}) {
  const xpEntries = Object.entries(summary.xp)
    .filter(([, value]) => (value ?? 0) > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 6);
  const primaryFocus = summary.focuses[0] ?? (xpEntries[0]?.[0] as AttributeKey | undefined) ?? "Finishing";
  const primaryAttribute = attributes.find((attribute) => attribute.label === primaryFocus);
  const primaryGain = summary.xp[primaryFocus] ?? 0;
  const levelUp = summary.levelUps.find((item) => item.attribute === primaryFocus);
  const currentXp = primaryAttribute?.xp ?? 0;
  const previousXp = levelUp ? ((currentXp - primaryGain) % 100 + 100) % 100 : clamp(currentXp - primaryGain, 0, 100);
  const meterEndXp = levelUp ? 100 : currentXp;
  const gainedMeterWidth = clamp(meterEndXp - previousXp, 0, 100 - previousXp);
  const currentLevel = primaryAttribute?.value ?? levelUp?.after ?? 0;
  const previousLevel = levelUp?.before ?? currentLevel;
  const meterSplit = meterEndXp > 0 ? clamp((previousXp / meterEndXp) * 100, 0, 100) : 0;
  const meterStyle = {
    "--xp-from": `${previousXp}%`,
    "--xp-to": `${meterEndXp}%`,
    "--xp-gain": `${gainedMeterWidth}%`,
    "--xp-split": `${meterSplit}%`,
  } as CSSProperties;
  return (
    <section className="simple-screen summary-screen">
      <ScreenTitle label={`Week ${summary.week} training`} title="Development Summary" />

      <div className="card training-progress-hero">
        <div className="section-heading">
          <div>
            <span className="metric-label">Attribute progress</span>
            <h2>{primaryFocus}</h2>
            <p>
              Level {previousLevel}
              {levelUp ? ` to ${levelUp.after}` : ""} - +{primaryGain} XP
            </p>
          </div>
          <Dumbbell size={19} />
        </div>
        <div className="training-xp-meter">
          <div className="xp-meter-labels">
            <span />
            <strong>{currentXp}/100 XP</strong>
          </div>
          <div className="xp-meter-track" aria-label={`${primaryFocus} XP progress`}>
            <span className="xp-meter-fill" style={meterStyle} />
          </div>
        </div>
      </div>

      <div className="card">
        <span className="metric-label">Session completed</span>
        <div className="chip-row">
          <span className="soft-chip">{summary.intensity} intensity</span>
          {summary.focuses.map((focus) => {
            const range = summary.ranges[focus];
            return (
              <span className="soft-chip" key={focus}>
                {focus}
                {range ? ` ${range.min}-${range.max} XP` : ""}
              </span>
            );
          })}
          {summary.focuses.map((focus) => (
            <span className="soft-chip" key={`${focus}-actual`}>
              +{summary.xp[focus] ?? 0} XP gain
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Attribute XP</span>
            <h2>{xpEntries.length > 0 ? "Session gains" : "Recovery focus"}</h2>
          </div>
          <Dumbbell size={19} />
        </div>
        <div className="xp-list">
          {xpEntries.map(([attribute, value]) => (
            <div className="xp-item" key={attribute}>
              <span>{attribute}</span>
              <strong>+{value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <span className="metric-label">Career impact</span>
        <div className="next-grid">
          <InfoTile
            label="Selection"
            value={`${summary.selectionBefore} -> ${summary.selectionAfter}`}
            tone={summary.selectionAfter > summary.selectionBefore ? "good" : undefined}
          />
          <InfoTile label="Fitness" value={`${summary.fitnessDelta > 0 ? "+" : ""}${summary.fitnessDelta}`} tone={summary.fitnessDelta >= 0 ? "good" : "warn"} />
          <InfoTile label="Trust" value={`${summary.trustDelta > 0 ? "+" : ""}${summary.trustDelta}`} />
        </div>
      </div>

      <div className="card">
        <span className="metric-label">Level-ups</span>
        <div className="impact-list">
          {summary.levelUps.length > 0 ? (
            summary.levelUps.map((levelUp) => (
              <div className="impact-item" key={`${levelUp.attribute}-${levelUp.after}`}>
                <Sparkles size={15} />
                <span>
                  {levelUp.attribute} {levelUp.before} to {levelUp.after}
                </span>
              </div>
            ))
          ) : (
            <div className="impact-item">
              <Sparkles size={15} />
              <span>No attribute level-up yet. XP progress has been banked.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ClubScreen({ game }: { game: GameState }) {
  const [clubView, setClubView] = useState<ClubView>("overview");
  const upcomingMatch = getUpcomingMatch(game);
  const strengthGap = upcomingMatch.teamStrength - upcomingMatch.opponentStrength;
  const outlook = strengthGap >= 4 ? "Favorable" : strengthGap <= -4 ? "Difficult" : "Balanced";
  const record = getSeasonRecord(game.season.results);
  const goals = getSeasonGoals(game.season.results);
  const table = getLeagueTable(game.season);

  if (clubView === "fixtures") {
    return <ClubFixturesView game={game} onBack={() => setClubView("overview")} />;
  }

  if (clubView === "table") {
    return <ClubTableView season={game.season} onBack={() => setClubView("overview")} />;
  }

  return (
    <section className="simple-screen">
      <ScreenTitle label="Club" title="Northbridge FC" />
      <div className="card">
        <InfoRow label="League tier" value="Regional" />
        <InfoRow label="Squad role" value={upcomingMatch.playerRole} />
        <ProgressRow label="Manager trust" value={game.trust} accent="lime" />
        <ProgressRow label="Team form" value={getTeamFormScore(game.season.results)} display={getRecentFormText(game.season.results)} accent="neutral" />
      </div>
      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Season record</span>
            <h2>
              {record.wins}-{record.draws}-{record.losses}
            </h2>
          </div>
          <Trophy size={19} />
        </div>
        <div className="next-grid">
          <InfoTile label="Played" value={`${game.season.results.length}/${game.season.fixtures.length}`} />
          <InfoTile label="Goals" value={`${goals.for}-${goals.against}`} tone="gold" />
          <InfoTile label="Points" value={`${record.points}`} tone="good" />
        </div>
      </div>
      <button className="card club-drill-card" type="button" onClick={() => setClubView("fixtures")}>
        <div className="section-heading">
          <div>
            <span className="metric-label">Upcoming fixtures</span>
            <h2>Next 5 matches</h2>
          </div>
          <CalendarDays size={19} />
        </div>
        <FixturePreviewList season={game.season} />
      </button>
      <button className="card club-drill-card" type="button" onClick={() => setClubView("table")}>
        <div className="section-heading">
          <div>
            <span className="metric-label">League table</span>
            <h2>Regional League</h2>
          </div>
          <Trophy size={19} />
        </div>
        <LeagueTablePreview table={table} />
      </button>
      <div className="card split-card">
        <div>
          <span className="metric-label">Next match</span>
          <h2>{upcomingMatch.opponentShort}</h2>
          <p>{upcomingMatch.venue} - {upcomingMatch.competition}</p>
        </div>
        <div>
          <span className="metric-label">Role</span>
          <h2>{upcomingMatch.playerRole}</h2>
          <p>{upcomingMatch.expectedMinutes}</p>
        </div>
      </div>
      <div className="card selection-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Selection logic</span>
            <h2>{upcomingMatch.selection.score}/100</h2>
          </div>
          <ShieldCheck size={19} />
        </div>
        <ProgressBar value={upcomingMatch.selection.score} />
        <div className="selection-factor-grid">
          {upcomingMatch.selection.factors.slice(0, 4).map((factor) => (
            <div className={`selection-factor tone-${factor.tone}`} key={factor.label}>
              <span>{factor.label}</span>
              <strong>{factor.value}</strong>
              <em>
                {factor.impact > 0 ? "+" : ""}
                {factor.impact}
              </em>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Match plan</span>
            <h2>{upcomingMatch.tacticalFocus}</h2>
          </div>
          <CalendarDays size={19} />
        </div>
        <div className="next-grid">
          <InfoTile label="Outlook" value={outlook} tone={outlook === "Favorable" ? "good" : outlook === "Difficult" ? "warn" : undefined} />
          <InfoTile label="Opp. form" value={upcomingMatch.opponentForm} />
          <InfoTile label="Service" value={upcomingMatch.serviceLevel} />
        </div>
        <div className="match-hint">
          <Activity size={16} />
          <span>{upcomingMatch.managerInstruction}</span>
        </div>
      </div>
    </section>
  );
}

function FixturePreviewList({ season }: { season: SeasonState }) {
  const upcoming = getUpcomingFixtures(season, 5);

  return (
    <div className="fixture-preview-list">
      {upcoming.map((fixture, index) => (
        <div className="fixture-row compact" key={fixture.id}>
          <span className="fixture-index">M{season.fixtureIndex + index + 1}</span>
          <div>
            <strong>{fixture.opponentShort}</strong>
            <small>
              {fixture.venue} - {fixture.competition}
            </small>
          </div>
          <FixtureStatusBadge type="form" value={fixture.opponentForm} />
        </div>
      ))}
    </div>
  );
}

function LeagueTablePreview({ table }: { table: LeagueTableRow[] }) {
  const northbridgeIndex = table.findIndex((row) => row.short === "NBR");
  const start = clamp(northbridgeIndex - 1, 0, Math.max(0, table.length - 4));
  const rows = table.slice(start, start + 4);

  return (
    <div className="league-table mini-table">
      {rows.map((row) => (
        <LeagueTableRowView compact key={row.short} row={row} />
      ))}
    </div>
  );
}

function ClubFixturesView({ game, onBack }: { game: GameState; onBack: () => void }) {
  return (
    <section className="simple-screen club-detail-screen">
      <DetailHeader label="Club" title="Fixtures" onBack={onBack} />
      <div className="card">
        <span className="metric-label">Season schedule</span>
        <div className="fixture-list">
          {game.season.fixtures.map((fixture, index) => {
            const result = game.season.results.find((item) => item.fixtureId === fixture.id);
            const isCurrent = index === game.season.fixtureIndex;

            return (
              <div className={`fixture-row ${isCurrent ? "is-current" : ""}`} key={fixture.id}>
                <span className="fixture-index">M{index + 1}</span>
                <div>
                  <strong>{fixture.opponentShort}</strong>
                  <small>
                    {fixture.venue} - {fixture.competition}
                  </small>
                </div>
                {result ? (
                  <FixtureStatusBadge
                    type="result"
                    value={`${result.outcome} ${result.teamGoals}-${result.opponentGoals}`}
                    tone={result.outcome}
                  />
                ) : (
                  <FixtureStatusBadge type={isCurrent ? "next" : "form"} value={isCurrent ? "Next" : fixture.opponentForm} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ClubTableView({ season, onBack }: { season: SeasonState; onBack: () => void }) {
  const table = getLeagueTable(season);

  return (
    <section className="simple-screen club-detail-screen">
      <DetailHeader label="Club" title="League Table" onBack={onBack} />
      <div className="card">
        <div className="table-header">
          <span>#</span>
          <span>Club</span>
          <span>P</span>
          <span>GD</span>
          <span>Pts</span>
        </div>
        <div className="league-table">
          {table.map((row) => (
            <LeagueTableRowView key={row.short} row={row} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FixtureStatusBadge({
  type,
  value,
  tone,
}: {
  type: "result" | "next" | "form";
  value: string;
  tone?: FixtureResult["outcome"];
}) {
  const label = type === "form" ? "Form" : type === "result" ? "Result" : "Status";
  const toneClass = tone ? ` result-${tone.toLowerCase()}` : type === "next" ? " fixture-next" : "";

  return (
    <span className={`fixture-status${toneClass}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function DetailHeader({ label, title, onBack }: { label: string; title: string; onBack: () => void }) {
  return (
    <div className="detail-header">
      <button className="icon-button" type="button" aria-label="Back to club overview" onClick={onBack}>
        <ChevronRight className="back-chevron" size={18} />
      </button>
      <ScreenTitle label={label} title={title} />
    </div>
  );
}

function LeagueTableRowView({ row, compact = false }: { row: LeagueTableRow; compact?: boolean }) {
  return (
    <div className={`table-row ${row.short === "NBR" ? "is-player-club" : ""} ${compact ? "compact" : ""}`}>
      <span>{row.position}</span>
      <strong>{compact ? row.short : row.name}</strong>
      {!compact && <em>{row.played}</em>}
      <em>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</em>
      <b>{row.points}</b>
    </div>
  );
}

function HomeScreen({ game }: { game: GameState }) {
  return (
    <section className="simple-screen">
      <ScreenTitle label="Home" title="Private base" />
      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Facility</span>
            <h2>Backyard pitch</h2>
          </div>
          <Home size={19} />
        </div>
        <ProgressRow label="Technical XP" value={10} display="+10%" accent="lime" />
        <ProgressRow label="Recovery support" value={6} display="+6%" accent="gold" />
      </div>
      <div className="card split-card">
        <div>
          <span className="metric-label">Legacy</span>
          <h2>Gen 1</h2>
          <p>No heir yet</p>
        </div>
        <div>
          <span className="metric-label">Prestige</span>
          <h2>{game.prestige}</h2>
          <p>Local name</p>
        </div>
      </div>
    </section>
  );
}

function ScreenTitle({ label, title }: { label: string; title: string }) {
  return (
    <header className="screen-title">
      <span className="metric-label">{label}</span>
      <h1>{title}</h1>
    </header>
  );
}

function ChoiceRow({
  label,
  meta,
  risk,
  active,
  onClick,
}: {
  label: string;
  meta: string;
  risk: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className={`choice-row ${active ? "is-active" : ""}`} type="button" onClick={onClick}>
      <span>
        <strong>{label}</strong>
        <small>{meta}</small>
      </span>
      <em>{risk}</em>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "gold";
}) {
  return (
    <div className={`info-tile ${tone ? `tone-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  display,
  accent,
}: {
  label: string;
  value: number;
  display?: string;
  accent: "lime" | "gold" | "neutral";
}) {
  return (
    <div className={`progress-row accent-${accent}`}>
      <div className="progress-copy">
        <span>{label}</span>
        <strong>{display ?? `${Math.round(value)}%`}</strong>
      </div>
      <ProgressBar value={value} />
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-track">
      <span style={{ width: `${clamp(value, 0, 100)}%` }} />
    </div>
  );
}

function BottomNav({
  activeNav,
  advanceLabel,
  disabled,
  onAdvance,
  onNavigate,
}: {
  activeNav?: NavKey;
  advanceLabel: string;
  disabled: boolean;
  onAdvance: () => void;
  onNavigate: (nav: NavKey) => void;
}) {
  const splitNav = useMemo(
    () => ({
      left: navItems.slice(0, 2),
      right: navItems.slice(2),
    }),
    [],
  );

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      <div className="nav-side">
        {splitNav.left.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            active={activeNav === item.key}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <button className="advance-button" type="button" disabled={disabled} onClick={onAdvance}>
        <ChevronsRight size={24} />
        <span>{advanceLabel}</span>
      </button>

      <div className="nav-side">
        {splitNav.right.map((item) => (
          <NavButton
            key={item.key}
            item={item}
            active={activeNav === item.key}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}

function NavButton({
  item,
  active,
  onNavigate,
}: {
  item: (typeof navItems)[number];
  active: boolean;
  onNavigate: (nav: NavKey) => void;
}) {
  const Icon = item.icon;

  return (
    <button
      className={`nav-button ${active ? "is-active" : ""}`}
      type="button"
      onClick={() => onNavigate(item.key)}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={19} />
      <span>{item.label}</span>
    </button>
  );
}

function applyTrainingWeek(state: GameState): GameState {
  const projection = getTrainingProjection(state);
  const rolledXp = rollTrainingXp(state, projection.ranges);
  const selectionBefore = getSelectionReport(state, getCurrentFixture(state.season)).score;
  const attributeResult = addAttributeXpDetailed(state.attributes, rolledXp);
  const fitness = clamp(state.fitness + projection.fitnessDelta, 0, 100);
  const morale = clamp(state.morale + projection.moraleDelta, 0, 100);
  const trust = clamp(state.trust + projection.trustDelta, 0, 100);
  const nextStateForSelection = {
    ...state,
    fitness,
    morale,
    trust,
    attributes: attributeResult.attributes,
  };
  const selectionAfter = getSelectionReport(nextStateForSelection, getCurrentFixture(state.season)).score;
  const summary: TrainingSummary = {
    week: state.week,
    focuses: getCurrentTrainingFocuses(state),
    intensity: state.intensity,
    ranges: projection.ranges,
    xp: rolledXp,
    fitnessDelta: projection.fitnessDelta,
    moraleDelta: projection.moraleDelta,
    trustDelta: projection.trustDelta,
    selectionBefore,
    selectionAfter,
    levelUps: attributeResult.levelUps,
  };

  return {
    ...state,
    trainingCompletedWeek: state.week,
    fitness,
    morale,
    trust,
    attributes: attributeResult.attributes,
    selectedFocus: getCurrentTrainingFocuses(state)[0],
    lastTraining: summary,
    lastEvent: getTrainingSummaryText(summary),
  };
}

function getTrainingSummaryText(summary: TrainingSummary) {
  const topXp = Object.entries(summary.xp).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0];
  const levelText = summary.levelUps.length > 0 ? `${summary.levelUps.length} level-up.` : "No level-up yet.";
  return `Training complete: ${topXp?.[0] ?? "Attributes"} +${topXp?.[1] ?? 0} XP. ${levelText}`;
}

function addAttributeXp(
  attributes: Attribute[],
  xpGain: Partial<Record<AttributeKey, number>>,
): Attribute[] {
  return addAttributeXpDetailed(attributes, xpGain).attributes;
}

function addAttributeXpDetailed(
  attributes: Attribute[],
  xpGain: Partial<Record<AttributeKey, number>>,
): { attributes: Attribute[]; levelUps: AttributeLevelUp[] } {
  const levelUps: AttributeLevelUp[] = [];
  const nextAttributes = attributes.map((attribute) => {
    const gain = xpGain[attribute.label] ?? 0;
    if (gain <= 0 || attribute.value >= attribute.potential) {
      return attribute;
    }

    const totalXp = attribute.xp + gain;
    const levels = Math.floor(totalXp / 100);
    const nextValue = Math.min(attribute.potential, attribute.value + levels);
    if (nextValue > attribute.value) {
      levelUps.push({
        attribute: attribute.label,
        before: attribute.value,
        after: nextValue,
      });
    }

    return {
      ...attribute,
      value: nextValue,
      xp: totalXp % 100,
    };
  });

  return { attributes: nextAttributes, levelUps };
}

function finishMatchState(state: GameState, results: MatchResult[]): GameState {
  const match = state.activeMatch;
  const simTotals = match ? summarizeSimEvents(match.events, match.events.length - 1) : undefined;
  const totals = summarizeMatchResults(results, simTotals);
  const trustAfter = clamp(state.trust + totals.trustDelta, 0, 100);
  const moraleDelta = totals.rating >= 7 ? 3 : -2;
  const cashDelta = 120 + totals.goals * 40 + totals.assists * 25;
  const prestigeDelta = Math.max(0, Math.round((totals.rating - 6) * 2));
  const selectionBefore = getSelectionReport(state, getCurrentFixture(state.season));
  const postMatchState = {
    ...state,
    trust: trustAfter,
    fitness: clamp(state.fitness + totals.fitnessDelta, 0, 100),
    morale: clamp(state.morale + moraleDelta, 0, 100),
    seasonStats: {
      ...state.seasonStats,
      ratings: [...state.seasonStats.ratings.slice(-4), totals.rating],
    },
  };
  const selectionAfter = getSelectionReport(postMatchState, getNextFixtureAfterMatch(state.season));
  const roleBefore = match?.playerRole ?? selectionBefore.role;
  const roleAfter = selectionAfter.role;
  const lastMatch = match
    ? buildLastMatchSummary({
        match,
        results,
        totals,
        cashDelta,
        prestigeDelta,
        moraleDelta,
        roleBefore,
        roleAfter,
        selectionBefore: selectionBefore.score,
        selectionAfter: selectionAfter.score,
        pointsToNextRole: selectionAfter.pointsToNextRole,
      })
    : state.lastMatch;
  const fixtureResult = match
    ? createFixtureResult(match, totals)
    : undefined;

  return {
    ...state,
    week: state.week + 1,
    fitness: clamp(state.fitness + totals.fitnessDelta, 0, 100),
    trust: trustAfter,
    morale: clamp(state.morale + moraleDelta, 0, 100),
    pressure: clamp(state.pressure + totals.goals * 2, 0, 100),
    cash: state.cash + cashDelta,
    prestige: state.prestige + prestigeDelta,
    attributes: addAttributeXp(state.attributes, totals.xp),
    seasonStats: {
      apps: state.seasonStats.apps + 1,
      starts: state.seasonStats.starts + (match && isStartingRole(match.playerRole) ? 1 : 0),
      goals: state.seasonStats.goals + totals.goals,
      assists: state.seasonStats.assists + totals.assists,
      ratings: postMatchState.seasonStats.ratings,
    },
    season: fixtureResult
      ? advanceSeasonFixture(state.season, fixtureResult)
      : state.season,
    lastEvent: getMatchSummaryText(results, totals),
    lastMatch,
    activeMatch: undefined,
  };
}

function createFixtureResult(match: MatchState, totals: MatchTotals): FixtureResult {
  const outcome = totals.teamGoals > totals.opponentGoals ? "W" : totals.teamGoals < totals.opponentGoals ? "L" : "D";

  return {
    fixtureId: match.fixtureId,
    opponent: match.opponent,
    venue: match.venue,
    competition: match.competition,
    teamGoals: totals.teamGoals,
    opponentGoals: totals.opponentGoals,
    outcome,
    rating: totals.rating,
  };
}

function advanceSeasonFixture(season: SeasonState, result: FixtureResult): SeasonState {
  const nextIndex = Math.min(season.fixtureIndex + 1, season.fixtures.length);
  const existingIndex = season.results.findIndex((item) => item.fixtureId === result.fixtureId);
  const results =
    existingIndex >= 0
      ? season.results.map((item, index) => (index === existingIndex ? result : item))
      : [...season.results, result];

  return {
    ...season,
    fixtureIndex: nextIndex,
    results,
  };
}

function hasPlayableFixture(season: SeasonState) {
  const fixture = season.fixtures[season.fixtureIndex];
  return !!fixture && !season.results.some((result) => result.fixtureId === fixture.id);
}

function buildLastMatchSummary({
  match,
  results,
  totals,
  cashDelta,
  prestigeDelta,
  moraleDelta,
  roleBefore,
  roleAfter,
  selectionBefore,
  selectionAfter,
  pointsToNextRole,
}: {
  match: MatchState;
  results: MatchResult[];
  totals: MatchTotals;
  cashDelta: number;
  prestigeDelta: number;
  moraleDelta: number;
  roleBefore: UpcomingMatch["playerRole"];
  roleAfter: UpcomingMatch["playerRole"];
  selectionBefore: number;
  selectionAfter: number;
  pointsToNextRole: number;
}): LastMatchSummary {
  return {
    ...totals,
    fixtureId: match.fixtureId,
    matchNumber: match.matchNumber,
    seasonLength: match.seasonLength,
    opponent: match.opponent,
    venue: match.venue,
    competition: match.competition,
    playerRole: match.playerRole,
    expectedMinutes: match.expectedMinutes,
    autoSimulated: results.filter((result) => result.source === "auto").length,
    manualHighlights: results.filter((result) => result.source !== "auto").length,
    cashDelta,
    prestigeDelta,
    moraleDelta,
    roleBefore,
    roleAfter,
    selectionBefore,
    selectionAfter,
    pointsToNextRole,
    careerImpact: getCareerImpactLines(totals, roleBefore, roleAfter, selectionBefore, selectionAfter, pointsToNextRole),
  };
}

function summarizeMatchResults(results: MatchResult[], simTotals = createEmptySimTotals()): MatchTotals {
  const emptySummary = {
    rating: 6 + simTotals.ratingDelta,
    trustDelta: simTotals.trustDelta,
    fitnessDelta: simTotals.fitnessDelta,
    goals: 0,
    assists: 0,
    teamGoals: simTotals.teamGoals,
    opponentGoals: simTotals.opponentGoals,
    chanceQualities: [] as ChanceQuality[],
    explanationTags: [] as string[],
    performanceReasons: [] as string[],
    xp: {} as Partial<Record<AttributeKey, number>>,
  };

  if (results.length === 0) {
    return {
      ...emptySummary,
      rating: Number(clamp(emptySummary.rating, 5.4, 7.4).toFixed(1)),
    };
  }

  const totals = results.reduce(
    (summary, result) => {
      Object.entries(result.xp).forEach(([key, value]) => {
        const attribute = key as AttributeKey;
        summary.xp[attribute] = (summary.xp[attribute] ?? 0) + (value ?? 0);
      });

      return {
        rating: summary.rating + result.rating,
        trustDelta: summary.trustDelta + result.trustDelta,
        fitnessDelta: summary.fitnessDelta + result.fitnessDelta,
        goals: summary.goals + result.goals,
        assists: summary.assists + result.assists,
        teamGoals: summary.teamGoals,
        opponentGoals: summary.opponentGoals,
        chanceQualities: [...summary.chanceQualities, result.chanceQuality],
        explanationTags: [...summary.explanationTags, ...result.explanationTags],
        performanceReasons: [...summary.performanceReasons, ...result.performanceReasons],
        xp: summary.xp,
      };
    },
    {
      ...emptySummary,
      rating: simTotals.ratingDelta,
    },
  );

  return {
    ...totals,
    teamGoals: totals.teamGoals + totals.goals,
    rating: Number(clamp(totals.rating / results.length, 5.4, 9.6).toFixed(1)),
  };
}

function getMatchSummaryText(results: MatchResult[], totals: ReturnType<typeof summarizeMatchResults>) {
  const output = [
    totals.goals > 0 ? `${totals.goals} goal${totals.goals === 1 ? "" : "s"}` : "",
    totals.assists > 0 ? `${totals.assists} assist${totals.assists === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(" and ");

  if (output) {
    return `Match complete: ${output}, ${totals.rating.toFixed(1)} rating.`;
  }

  return `Match complete: ${totals.rating.toFixed(1)} rating. ${results[results.length - 1]?.detail ?? ""}`;
}

function getExplanationCopy(tag: string) {
  const copies: Record<string, string> = {
    execution_helped: "Your execution matched the moment.",
    execution_lacked: "The action lacked the final sharpness.",
    quality_clear_chance: "Clear chance created.",
    quality_good_chance: "Good chance quality.",
    quality_half_chance: "Only a half chance.",
    quality_difficult_chance: "Difficult chance under pressure.",
    opponent_countered_action: "Opponent profile countered this action.",
    fatigue_limited_action: "Fatigue reduced your execution.",
    high_risk_choice: "High-risk choice raised the swing.",
    highlight_shot: "Finishing moment.",
    highlight_first_time_finish: "First-touch finish moment.",
    highlight_run_behind: "Movement behind the line mattered.",
    highlight_hold_up: "Hold-up play shaped the action.",
    highlight_aerial_duel: "Aerial duel context.",
    highlight_press: "Pressing and work rate mattered.",
    highlight_link_up: "Link-up decision.",
    highlight_counter: "Counterattack context.",
    highlight_defensive_set_piece: "Set-piece responsibility.",
    highlight_late_pressure: "Late pressure moment.",
  };

  return copies[tag] ?? tag.replace(/_/g, " ");
}

function getReadableExplanations(tags: string[], limit = 3) {
  const priority = [
    "quality_clear_chance",
    "quality_good_chance",
    "quality_half_chance",
    "quality_difficult_chance",
    "opponent_countered_action",
    "fatigue_limited_action",
    "high_risk_choice",
    "execution_helped",
    "execution_lacked",
  ];
  const uniqueTags = Array.from(new Set(tags));
  const sortedTags = uniqueTags.sort((a, b) => {
    const aIndex = priority.includes(a) ? priority.indexOf(a) : priority.length;
    const bIndex = priority.includes(b) ? priority.indexOf(b) : priority.length;
    return aIndex - bIndex;
  });

  return sortedTags.slice(0, limit).map((tag) => getExplanationCopy(tag));
}

function getUniqueItems(items: string[], limit: number) {
  return Array.from(new Set(items)).slice(0, limit);
}

function getResultPopupTone(tier: OutcomeTier) {
  if (tier === "Poor") {
    return "is-failure";
  }
  if (tier === "Okay") {
    return "is-okay";
  }
  return "is-success";
}

function getOutcomeTierSummary(tier: OutcomeTier) {
  const summaries: Record<OutcomeTier, string> = {
    Poor: "Edge lost",
    Okay: "Job done",
    Good: "Edge gained",
    Great: "Big moment",
  };

  return summaries[tier];
}

function getPrimaryChanceQuality(qualities: ChanceQuality[]) {
  if (qualities.length === 0) {
    return "No player chance";
  }

  const counts = qualities.reduce(
    (summary, quality) => ({
      ...summary,
      [quality]: (summary[quality] ?? 0) + 1,
    }),
    {} as Partial<Record<ChanceQuality, number>>,
  );

  return Object.entries(counts).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0]?.[0] ?? qualities[0];
}

function isStartingRole(role: UpcomingMatch["playerRole"]) {
  return role === "Starter" || role === "Rotation Starter";
}

function getCareerImpactLines(
  totals: MatchTotals,
  roleBefore: UpcomingMatch["playerRole"],
  roleAfter: UpcomingMatch["playerRole"],
  selectionBefore: number,
  selectionAfter: number,
  pointsToNextRole: number,
) {
  const lines: string[] = [];
  const scoreDelta = selectionAfter - selectionBefore;

  if (roleBefore !== roleAfter) {
    lines.push(`Role updated: ${roleBefore} to ${roleAfter}.`);
  } else if (pointsToNextRole > 0) {
    lines.push(`${pointsToNextRole} selection score needed for the next role.`);
  } else if (roleAfter === "Starter") {
    lines.push("Starter status held after the performance.");
  } else if (totals.trustDelta > 0) {
    lines.push(`Manager trust moved ${totals.trustDelta} closer to the next role.`);
  } else if (totals.trustDelta < 0) {
    lines.push(`Manager trust slipped ${Math.abs(totals.trustDelta)} after the performance.`);
  } else {
    lines.push("Role status held steady.");
  }

  if (scoreDelta !== 0) {
    lines.push(`Selection score ${scoreDelta > 0 ? "+" : ""}${scoreDelta} after this match.`);
  }

  if (totals.rating >= 7.4) {
    lines.push("Strong rating improves selection momentum.");
  } else if (totals.rating < 6.2) {
    lines.push("Low rating adds pressure before the next selection.");
  }

  if (totals.goals + totals.assists > 0) {
    lines.push("Direct output improves contract and scout attention.");
  }

  return lines;
}

function createEmptySimTotals() {
  return {
    teamGoals: 0,
    opponentGoals: 0,
    ratingDelta: 0,
    trustDelta: 0,
    fitnessDelta: 0,
  };
}

function summarizeSimEvents(events: MatchEvent[], upToIndex: number) {
  return events.slice(0, upToIndex + 1).reduce((summary, event) => {
    if (event.type === "player_moment") {
      return summary;
    }

    return {
      teamGoals: summary.teamGoals + event.teamGoalDelta,
      opponentGoals: summary.opponentGoals + event.opponentGoalDelta,
      ratingDelta: summary.ratingDelta + event.ratingDelta,
      trustDelta: summary.trustDelta + event.trustDelta,
      fitnessDelta: summary.fitnessDelta + event.fitnessDelta,
    };
  }, createEmptySimTotals());
}

function getTimelineScore(match: MatchState, results: MatchResult[], upToIndex: number) {
  const simTotals = summarizeSimEvents(match.events, upToIndex);
  const playerGoalsBeforeOrAtEvent = match.events.slice(0, upToIndex + 1).filter((event) => event.type === "player_moment").length;
  const appliedPlayerGoals = results.slice(0, playerGoalsBeforeOrAtEvent).reduce((sum, result) => sum + result.goals, 0);

  return {
    teamGoals: simTotals.teamGoals + appliedPlayerGoals,
    opponentGoals: simTotals.opponentGoals,
  };
}

function getRecentTimelineItems(match: MatchState, results: MatchResult[]) {
  let playerResultIndex = 0;
  const processed = match.events.slice(0, match.currentEventIndex).flatMap((event) => {
    if (event.type !== "player_moment") {
      const goalText =
        event.teamGoalDelta > 0
          ? " Goal for Northbridge."
          : event.opponentGoalDelta > 0
            ? ` Goal for ${match.opponent}.`
            : "";
      return [
        {
          id: event.id,
          minute: event.minute,
          text: `${event.title}.${goalText}`,
        },
      ];
    }

    const result = results[playerResultIndex];
    playerResultIndex += 1;

    if (!result) {
      return [];
    }

    const output =
      result.goals > 0 ? "You scored." : result.assists > 0 ? "You assisted." : `${result.rating.toFixed(1)} action.`;

    return [
      {
        id: `${event.id}-result`,
        minute: event.minute,
        text: output,
      },
    ];
  });

  const playerStatusEvents = [
    match.entryMinute > 0 && match.liveMinute >= match.entryMinute
      ? {
          id: "player-sub-on",
          minute: match.entryMinute,
          text: "You are sent on from the bench.",
        }
      : undefined,
    match.exitMinute && match.liveMinute >= match.exitMinute
      ? {
          id: "player-sub-off",
          minute: match.exitMinute,
          text: "You are subbed off.",
        }
      : undefined,
  ].filter((item): item is { id: string; minute: number; text: string } => !!item);

  return [...processed, ...playerStatusEvents].sort((a, b) => a.minute - b.minute).slice(-4);
}

function formatFixtureTitle(venue: Venue, opponent: string) {
  return venue === "Home" ? `Northbridge - ${opponent}` : `${opponent} - Northbridge`;
}

function getAppearanceText(match: MatchState) {
  if (match.entryMinute === 0 && !match.exitMinute) {
    return "Full match";
  }
  if (match.entryMinute === 0 && match.exitMinute) {
    return `0'-${match.exitMinute}'`;
  }
  if (match.exitMinute) {
    return `${match.entryMinute}'-${match.exitMinute}'`;
  }
  return `On ${match.entryMinute}'`;
}

function getMatchupText(delta: number) {
  if (delta >= 7) {
    return "Favourable";
  }

  if (delta >= 3) {
    return "Slight edge";
  }

  if (delta <= -7) {
    return "Very tough";
  }

  if (delta <= -3) {
    return "Tough";
  }

  return "Even";
}

function getPitchStatus(match: MatchState) {
  if (match.isComplete) {
    return {
      label: "Full time",
      detail: match.exitMinute ? `Played until ${match.exitMinute}'.` : "Match finished.",
      tone: "neutral",
    };
  }

  if (match.liveMinute < match.entryMinute) {
    return {
      label: "On the bench",
      detail: `Expected to enter around ${match.entryMinute}'.`,
      tone: "bench",
    };
  }

  if (match.exitMinute && match.liveMinute >= match.exitMinute) {
    return {
      label: "Subbed off",
      detail: `Your shift ended at ${match.exitMinute}'.`,
      tone: "off",
    };
  }

  return {
    label: match.entryMinute === 0 ? "On the pitch" : "Subbed on",
    detail: match.entryMinute === 0 ? "You started this match." : `You entered at ${match.entryMinute}'.`,
    tone: "on",
  };
}

function getUpcomingMatch(state: GameState): UpcomingMatch {
  const fixture = getCurrentFixture(state.season);
  const positionModule = getPositionModule(state.positionGroup);
  const opponentProfile = buildOpponentProfile({
    opponentStrength: fixture.opponentStrength,
    opponentForm: fixture.opponentForm,
    serviceLevel: fixture.serviceLevel,
    seed: fixture.id,
  });
  const teamStrength = 52 + Math.round(getFormScore(state.seasonStats.ratings) / 12);
  const matchImportance = fixture.competition.includes("Cup")
    ? "High"
    : Math.abs(teamStrength - fixture.opponentStrength) <= 3
      ? "Normal"
      : "Low";
  const selection = getSelectionReport(state, fixture, matchImportance);

  return {
    ...fixture,
    kickoff: `Match ${state.season.fixtureIndex + 1}/${state.season.fixtures.length}`,
    teamStrength,
    opponentProfile,
    matchImportance,
    positionGroup: state.positionGroup,
    playerRole: selection.role,
    selection,
    expectedMinutes: getExpectedMinutes(selection.role),
    tacticalFocus: getTacticalFocus(state, fixture.serviceLevel, positionModule),
    managerInstruction: getManagerInstruction(selection.role, fixture.serviceLevel, positionModule),
  };
}

function getCurrentFixture(season: SeasonState) {
  return season.fixtures[Math.min(season.fixtureIndex, season.fixtures.length - 1)] ?? season.fixtures[0];
}

function getUpcomingFixtures(season: SeasonState, count: number) {
  return season.fixtures.slice(season.fixtureIndex, season.fixtureIndex + count);
}

function getSeasonRecord(results: FixtureResult[]) {
  return results.reduce(
    (record, result) => {
      if (result.outcome === "W") {
        record.wins += 1;
        record.points += 3;
      } else if (result.outcome === "D") {
        record.draws += 1;
        record.points += 1;
      } else {
        record.losses += 1;
      }

      return record;
    },
    { wins: 0, draws: 0, losses: 0, points: 0 },
  );
}

function getSeasonGoals(results: FixtureResult[]) {
  return results.reduce(
    (goals, result) => ({
      for: goals.for + result.teamGoals,
      against: goals.against + result.opponentGoals,
    }),
    { for: 0, against: 0 },
  );
}

function getRecentFormText(results: FixtureResult[]) {
  if (results.length === 0) {
    return "No form";
  }

  return results
    .slice(-5)
    .map((result) => result.outcome)
    .join("");
}

function getTeamFormScore(results: FixtureResult[]) {
  if (results.length === 0) {
    return 50;
  }

  const recent = results.slice(-5);
  const points = getSeasonRecord(recent).points;
  const maxPoints = recent.length * 3;

  return Math.round((points / maxPoints) * 100);
}

function getLeagueTable(season: SeasonState): LeagueTableRow[] {
  const northbridgeRecord = getSeasonRecord(season.results);
  const northbridgeGoals = getSeasonGoals(season.results);
  const played = season.results.length;
  const table = leagueTeams.map((team) => {
    if (team.short === "NBR") {
      return {
        name: team.name,
        short: team.short,
        position: 0,
        played,
        wins: northbridgeRecord.wins,
        draws: northbridgeRecord.draws,
        losses: northbridgeRecord.losses,
        goalDifference: northbridgeGoals.for - northbridgeGoals.against,
        points: northbridgeRecord.points,
      };
    }

    const teamPlayed = played;
    const strengthGap = team.strength - 53;
    const wins = clamp(Math.floor(teamPlayed * 0.32 + strengthGap / 8), 0, teamPlayed);
    const draws = clamp(Math.round(teamPlayed * 0.22 + ((team.short.charCodeAt(0) + played) % 2)), 0, teamPlayed - wins);
    const losses = Math.max(0, teamPlayed - wins - draws);
    const goalDifference = Math.round(strengthGap / 2 + wins - losses + ((team.short.charCodeAt(1) + played) % 3) - 1);

    return {
      name: team.name,
      short: team.short,
      position: 0,
      played: teamPlayed,
      wins,
      draws,
      losses,
      goalDifference,
      points: wins * 3 + draws,
    };
  });

  return table
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || a.name.localeCompare(b.name))
    .map((row, index) => ({ ...row, position: index + 1 }));
}

function getNextFixtureAfterMatch(season: SeasonState) {
  return season.fixtures[Math.min(season.fixtureIndex + 1, season.fixtures.length - 1)] ?? getCurrentFixture(season);
}

function getSelectionReport(
  state: GameState,
  fixture: Fixture,
  importance: UpcomingMatch["matchImportance"] = fixture.competition.includes("Cup") ? "High" : "Normal",
): SelectionReport {
  const form = getFormScore(state.seasonStats.ratings);
  const lastRating = state.seasonStats.ratings[state.seasonStats.ratings.length - 1] ?? 6.4;
  const trustImpact = Math.round(state.trust * 0.45);
  const fitnessImpact = Math.round((state.fitness - 50) * 0.15);
  const formImpact = Math.round((form - 50) * 0.18);
  const ratingImpact = Math.round((lastRating - 6.4) * 6);
  const importanceImpact = importance === "High" ? -3 : importance === "Low" ? 1 : 0;
  const fixtureImpact = fixture.opponentStrength >= 60 ? -2 : fixture.opponentStrength <= 50 ? 1 : 0;
  const score = clamp(22 + trustImpact + fitnessImpact + formImpact + ratingImpact + importanceImpact + fixtureImpact, 0, 100);
  const role = getPlayerMatchRole(score);
  const nextRole = getNextRole(role);
  const nextThreshold = nextRole ? getRoleThreshold(nextRole) : 100;

  return {
    score,
    role,
    nextRole,
    pointsToNextRole: nextRole ? Math.max(0, nextThreshold - score) : 0,
    factors: [
      {
        label: "Trust",
        value: `${state.trust}%`,
        impact: trustImpact,
        tone: state.trust >= 55 ? "good" : state.trust < 30 ? "warn" : "neutral",
      },
      {
        label: "Fitness",
        value: `${Math.round(state.fitness)}%`,
        impact: fitnessImpact,
        tone: state.fitness >= 75 ? "good" : state.fitness < 58 ? "warn" : "neutral",
      },
      {
        label: "Form",
        value: getFormLabel(state.seasonStats.ratings),
        impact: formImpact,
        tone: form >= 62 ? "good" : form < 48 ? "warn" : "neutral",
      },
      {
        label: "Last rating",
        value: lastRating.toFixed(1),
        impact: ratingImpact,
        tone: lastRating >= 7 ? "good" : lastRating < 6.2 ? "warn" : "neutral",
      },
      {
        label: "Fixture",
        value: importance,
        impact: importanceImpact + fixtureImpact,
        tone: importance === "High" || fixture.opponentStrength >= 60 ? "warn" : "neutral",
      },
    ],
    summary: getSelectionSummary(score, role, nextRole),
  };
}

function getSelectionSummary(
  score: number,
  role: UpcomingMatch["playerRole"],
  nextRole?: UpcomingMatch["playerRole"],
) {
  if (!nextRole) {
    return `Selection score ${score}. You are trusted to start.`;
  }

  return `Selection score ${score}. ${getRoleThreshold(nextRole) - score} more needed for ${nextRole}.`;
}

function getNextRole(role: UpcomingMatch["playerRole"]): SelectionReport["nextRole"] {
  if (role === "Bench") {
    return "Impact Sub";
  }
  if (role === "Impact Sub") {
    return "Rotation Starter";
  }
  if (role === "Rotation Starter") {
    return "Starter";
  }
  return undefined;
}

function getRoleThreshold(role: UpcomingMatch["playerRole"]) {
  const thresholds: Record<UpcomingMatch["playerRole"], number> = {
    Bench: 0,
    "Impact Sub": 30,
    "Rotation Starter": 55,
    Starter: 68,
  };

  return thresholds[role];
}

function getPlayerMatchRole(selectionScore: number): UpcomingMatch["playerRole"] {
  if (selectionScore >= 68) {
    return "Starter";
  }
  if (selectionScore >= 55) {
    return "Rotation Starter";
  }
  if (selectionScore >= 30) {
    return "Impact Sub";
  }
  return "Bench";
}

function getExpectedMinutes(role: UpcomingMatch["playerRole"]) {
  const minutes: Record<UpcomingMatch["playerRole"], string> = {
    Bench: "0-15",
    "Impact Sub": "15-30",
    "Rotation Starter": "55-70",
    Starter: "75-90",
  };

  return minutes[role];
}

function getTacticalFocus(state: GameState, serviceLevel: UpcomingMatch["serviceLevel"], positionModule: PositionModule) {
  if (state.selectedFocus === "Work Rate") {
    return positionModule.tacticalFocuses.workRate;
  }
  if (serviceLevel === "Low") {
    return positionModule.tacticalFocuses.lowService;
  }
  if (["Off Ball", "Pace", "Acceleration", "Dribbling"].includes(state.selectedFocus)) {
    return positionModule.tacticalFocuses.movement;
  }
  return positionModule.tacticalFocuses.default;
}

function getManagerInstruction(role: MatchRole, serviceLevel: UpcomingMatch["serviceLevel"], positionModule: PositionModule) {
  const instruction = positionModule.managerInstructions[role];
  return serviceLevel === "Low" && instruction.lowService ? instruction.lowService : instruction.default;
}

function getPlayerMomentCount(role: UpcomingMatch["playerRole"], involvementScore: number) {
  const roleBase: Record<UpcomingMatch["playerRole"], number> = {
    Bench: 0,
    "Impact Sub": 1,
    "Rotation Starter": 2,
    Starter: 2,
  };
  const bonus = involvementScore > 68 ? 1 : involvementScore > 54 && role !== "Bench" ? 1 : 0;

  return clamp(roleBase[role] + bonus, role === "Bench" ? 0 : 1, role === "Starter" ? 4 : 3);
}

function getRoleMinuteWindow(role: UpcomingMatch["playerRole"]) {
  const windows: Record<UpcomingMatch["playerRole"], { start: number; end: number }> = {
    Bench: { start: 78, end: 89 },
    "Impact Sub": { start: 62, end: 89 },
    "Rotation Starter": { start: 18, end: 72 },
    Starter: { start: 8, end: 88 },
  };

  return windows[role];
}

function getAppearanceWindow(
  role: UpcomingMatch["playerRole"],
  state: GameState,
  context: UpcomingMatch,
  simEvents: SimMatchEvent[],
  matchSeed: string,
) {
  const window = getRoleMinuteWindow(role);
  const seed = `${matchSeed}-${state.week}-${context.id}-${role}-${state.trust}-${state.fitness}`;
  const variation = Math.round(seededNoise(seed) * 12) - 6;
  const earlyEvent = seededNoise(`${seed}-early`) > 0.88 ? -12 : 0;
  const scoreAround60 = getSimScoreAtMinute(simEvents, 60);
  const teamGoalDiff = scoreAround60.teamGoals - scoreAround60.opponentGoals;
  const matchStateAdjustment =
    teamGoalDiff < 0
      ? -7
      : teamGoalDiff >= 2
        ? -5
        : teamGoalDiff > 0
          ? 4
          : 0;

  if (role === "Bench") {
    return { entryMinute: clamp(window.start + variation + earlyEvent + (teamGoalDiff < 0 ? -6 : 0), 55, 89) };
  }

  if (role === "Impact Sub") {
    return { entryMinute: clamp(66 + variation + earlyEvent + matchStateAdjustment, 48, 82) };
  }

  if (role === "Rotation Starter") {
    const exitAdjustment = state.fitness < 62 ? -8 : teamGoalDiff >= 2 ? -5 : teamGoalDiff < 0 ? 6 : 0;
    return { entryMinute: 0, exitMinute: clamp(window.end + variation + exitAdjustment, 55, 86) };
  }

  return { entryMinute: 0 };
}

function getEventLabel(type: MatchEvent["type"]) {
  const labels: Record<MatchEvent["type"], string> = {
    player_moment: "Your moment",
    team_goal: "Northbridge",
    opponent_goal: "Opponent",
    team_chance: "Northbridge chance",
    opponent_chance: "Opponent chance",
    tempo: "Match tempo",
    substitution: "Tactical change",
  };

  return labels[type];
}

function formatDelta(value: number) {
  if (value > 0) {
    return `+${Number(value.toFixed(2))}`;
  }

  return `${Number(value.toFixed(2))}`;
}

function createMatch(state: GameState, context: UpcomingMatch): MatchState {
  const matchSeed = createMatchSeed(state, context);
  const positionModule = getPositionModule(state.positionGroup);
  const matchPool = createPositionMatchPool({
    opponentShort: context.opponentShort,
    managerInstruction: context.managerInstruction,
    tacticalFocus: context.tacticalFocus,
    fitness: state.fitness,
    momentPools: positionModule.momentPools,
  }) as MatchMoment[];
  const involvementScore =
    state.trust * 0.35 +
    state.fitness * 0.25 +
    getFormScore(state.seasonStats.ratings) * 0.2 +
    calculateOvr(state.attributes, positionModule.ovrWeights) * 0.2 +
    positionModule.matchTendencies.involvementBias[context.playerRole] * 10;
  const playerMomentCount = getPlayerMomentCount(context.playerRole, involvementScore);
  const minuteWindow = getRoleMinuteWindow(context.playerRole);
  const teamMatchModel = createTeamMatchModel({
    matchSeed,
    teamStrength: context.teamStrength,
    trust: state.trust,
    formScore: getFormScore(state.seasonStats.ratings),
    venue: context.venue,
    serviceLevel: context.serviceLevel,
    opponentProfile: context.opponentProfile,
  });
  const simEvents = createSimEvents({
    matchSeed,
    model: teamMatchModel,
    opponentShort: context.opponentShort,
    managerInstruction: context.managerInstruction,
  });
  const appearanceWindow = getAppearanceWindow(context.playerRole, state, context, simEvents, matchSeed);
  const playerWindowStart = Math.max(minuteWindow.start, appearanceWindow.entryMinute);
  const playerWindowEnd = Math.max(playerWindowStart, appearanceWindow.exitMinute ?? minuteWindow.end);
  const selectedMoments = selectPlayerHighlights({
    moments: matchPool,
    matchSeed,
    count: playerMomentCount,
    simEvents,
    playerWindowStart,
    playerWindowEnd,
    role: context.playerRole,
    serviceLevel: context.serviceLevel,
    opponentProfile: context.opponentProfile,
    attributeValues: getAttributeValueMap(state.attributes),
    preferredCategories: positionModule.matchTendencies.preferredForwardCategories,
  });
  const playerEvents: PlayerMatchEvent[] = Array.from({ length: playerMomentCount }, (_, index) => {
    const moment = selectedMoments[index % selectedMoments.length];
    const spread = playerMomentCount === 1 ? 0.5 : index / (playerMomentCount - 1);
    const roleMinute = Math.round(playerWindowStart + (playerWindowEnd - playerWindowStart) * spread);
    const minuteNoise = Math.round(seededNoise(`${matchSeed}-player-minute-${index}`) * 8) - 4;
    return {
      ...moment,
      type: "player_moment" as const,
      minute: clamp(Math.round((moment.minute + roleMinute) / 2) + index * 2 + minuteNoise, playerWindowStart, playerWindowEnd),
    };
  });
  const events = [...simEvents, ...playerEvents].sort((a, b) => a.minute - b.minute);

  return {
    matchSeed,
    fixtureId: context.id,
    matchNumber: state.season.fixtureIndex + 1,
    seasonLength: state.season.fixtures.length,
    opponent: context.opponentShort,
    venue: context.venue,
    competition: context.competition,
    matchImportance: context.matchImportance,
    opponentForm: context.opponentForm,
    opponentProfile: context.opponentProfile,
    serviceLevel: context.serviceLevel,
    teamStrength: context.teamStrength,
    opponentStrength: context.opponentStrength,
    positionGroup: context.positionGroup,
    playerRole: context.playerRole,
    selectionScore: context.selection.score,
    selectionSummary: context.selection.summary,
    expectedMinutes: context.expectedMinutes,
    entryMinute: appearanceWindow.entryMinute,
    exitMinute: appearanceWindow.exitMinute,
    managerInstruction: context.managerInstruction,
    tacticalFocus: context.tacticalFocus,
    score: "0-0",
    events,
    currentEventIndex: 0,
    liveMinute: 0,
    results: [],
    isComplete: false,
  };
}

function createMatchResult(state: GameState, moment: MatchMoment, choice: MatchChoice): MatchResult {
  const resultSeed = `${state.activeMatch?.matchSeed ?? "match"}-${moment.id}-${choice.id}-${state.activeMatch?.results.length ?? 0}`;
  const positionModule = getPositionModule(state.activeMatch?.positionGroup ?? state.positionGroup);
  const coreResult = resolvePlayerChoice({
    moment,
    choice,
    attributeValues: getAttributeValueMap(state.attributes),
    fitness: state.fitness,
    trust: state.trust,
    playerRole: state.activeMatch?.playerRole,
    opponentProfile: state.activeMatch?.opponentProfile,
    resultSeed,
  });
  const positionAdjustedResult = {
    ...coreResult,
    rating: getPositionAdjustedRating(coreResult.rating, coreResult.outcomeTier, coreResult.decisiveOutcome, moment, choice, positionModule),
  };
  const xp = buildChoiceXp(choice, positionAdjustedResult.outcomeTier, positionModule, moment);
  const positionLabel = positionModule.displayName.toLowerCase();
  const performanceReasons = buildPerformanceReasons(moment, choice, positionAdjustedResult, positionModule, xp);

  if (choice.outcome === "goal") {
    return {
      title: positionAdjustedResult.decisiveOutcome ? "Clinical action" : positionAdjustedResult.success ? `Useful ${positionLabel} action` : "Chance slips away",
      detail: positionAdjustedResult.decisiveOutcome
        ? `${moment.minute}': ${choice.label} works. You turn the moment into a goal and your match rating jumps.`
        : positionAdjustedResult.success
          ? `${moment.minute}': ${choice.label} is the right idea and keeps the attack alive, but it does not become a clear finish.`
          : `${moment.minute}': ${choice.label} is the right idea, but the execution is not clean enough this time.`,
      ...positionAdjustedResult,
      performanceReasons,
      xp,
    };
  }

  if (choice.outcome === "assist") {
    return {
      title: positionAdjustedResult.decisiveOutcome ? "Chance created" : positionAdjustedResult.success ? "Attack connected" : "Move breaks down",
      detail: positionAdjustedResult.decisiveOutcome
        ? `${moment.minute}': ${choice.label} opens the defense and gives a teammate the clean finish.`
        : positionAdjustedResult.success
          ? `${moment.minute}': ${choice.label} helps the move, but the final chance never fully opens.`
          : `${moment.minute}': ${choice.label} nearly unlocks them, but the final connection is missing.`,
      ...positionAdjustedResult,
      performanceReasons,
      xp,
    };
  }

  return {
    title: positionAdjustedResult.outcomeTier === "Great" ? "Manager will remember that" : positionAdjustedResult.success ? "Useful shift" : "Useful but imperfect",
    detail: positionAdjustedResult.outcomeTier === "Great"
      ? `${moment.minute}': ${choice.label} is not flashy, but it is exactly the kind of ${positionLabel} work that earns minutes.`
      : positionAdjustedResult.success
        ? `${moment.minute}': ${choice.label} helps the team shape and keeps you in the manager's thoughts.`
        : `${moment.minute}': ${choice.label} helps the team shape, though the action lacks sharpness.`,
    ...positionAdjustedResult,
    performanceReasons,
    xp,
  };
}

function simulateRemainingPlayerMoments(state: GameState, match: MatchState): MatchResult[] {
  return match.events
    .slice(match.currentEventIndex)
    .filter((event): event is PlayerMatchEvent => event.type === "player_moment")
    .map((moment) => {
      const choice = chooseAutoSimChoice({
        moment,
        attributeValues: getAttributeValueMap(state.attributes),
        fitness: state.fitness,
        trust: state.trust,
        matchSeed: match.matchSeed,
      });
      return { ...createMatchResult(state, moment, choice), source: "auto" as const };
    });
}

function buildChoiceXp(choice: MatchChoice, tier: OutcomeTier, positionModule: PositionModule, moment: MatchMoment): Partial<Record<AttributeKey, number>> {
  const xp: Partial<Record<AttributeKey, number>> = {};
  const tierBase: Record<OutcomeTier, number> = {
    Poor: 7,
    Okay: 10,
    Good: 14,
    Great: 18,
  };
  const base = tierBase[tier];
  choice.uses.forEach((key, index) => {
    const keyAttributeBonus = positionModule.keyAttributes.includes(key) ? 2 : 0;
    xp[key] = (xp[key] ?? 0) + base + (index === 0 ? 4 : 0) + keyAttributeBonus;
  });

  if (choice.manager === "Likes") {
    const managerBonusAttribute = getManagerBonusAttribute(choice, positionModule);
    xp[managerBonusAttribute] = (xp[managerBonusAttribute] ?? 0) + 4;
  }

  if (positionModule.matchTendencies.preferredForwardCategories.includes(moment.category)) {
    const focusAttribute = choice.uses.find((key) => positionModule.keyAttributes.includes(key)) ?? choice.uses[0];
    xp[focusAttribute] = (xp[focusAttribute] ?? 0) + 2;
  }

  return xp;
}

function getManagerBonusAttribute(choice: MatchChoice, positionModule: PositionModule): AttributeKey {
  return (
    choice.uses.find((key) => key === "Work Rate" || key === "Positioning") ??
    choice.uses.find((key) => positionModule.keyAttributes.includes(key)) ??
    positionModule.keyAttributes[0]
  );
}

function getPositionAdjustedRating(
  rating: number,
  tier: OutcomeTier,
  decisiveOutcome: boolean,
  moment: MatchMoment,
  choice: MatchChoice,
  positionModule: PositionModule,
) {
  const weight = getPositionPerformanceWeight(moment, choice, positionModule);
  const tierScale: Record<OutcomeTier, number> = {
    Poor: -0.12,
    Okay: 0.08,
    Good: 0.22,
    Great: 0.34,
  };
  const decisiveScale = decisiveOutcome ? 0.16 : 0;
  const adjustment = (weight - 1) * (tierScale[tier] + decisiveScale);

  return Number(clamp(rating + adjustment, 5.4, 9.8).toFixed(1));
}

function getPositionPerformanceWeight(moment: MatchMoment, choice: MatchChoice, positionModule: PositionModule) {
  const weights = positionModule.performanceWeights;

  if (choice.outcome === "goal") {
    return weights.goal;
  }
  if (choice.outcome === "assist") {
    return weights.assist;
  }
  if (moment.category === "defensive_set_piece") {
    return weights.defensive;
  }
  if (moment.category === "press") {
    return weights.defensive * 0.7 + weights.trust * 0.3;
  }
  if (moment.category === "link_up" || moment.category === "hold_up") {
    return weights.possession;
  }
  if (moment.category === "counter" || moment.category === "run_behind") {
    return weights.transition;
  }

  return weights.trust;
}

function buildPerformanceReasons(
  moment: MatchMoment,
  choice: MatchChoice,
  result: Pick<MatchResult, "outcomeTier" | "rating" | "goals" | "assists" | "success"> & { decisiveOutcome: boolean },
  positionModule: PositionModule,
  xp: Partial<Record<AttributeKey, number>>,
) {
  const reasons = [
    `${positionModule.displayName} focus: ${getPositionFocusReason(moment, choice, positionModule)}.`,
    `${result.outcomeTier} action: ${getOutcomeReason(result, choice)}.`,
  ];
  const xpReason = getXpReason(xp, positionModule);
  if (xpReason) {
    reasons.push(xpReason);
  }
  if (choice.manager === "Likes") {
    reasons.push("Manager read: this choice matched the role instruction.");
  } else if (choice.manager === "Risky") {
    reasons.push("Manager read: risky choice with a bigger rating swing.");
  }

  return Array.from(new Set(reasons)).slice(0, 4);
}

function getPositionFocusReason(moment: MatchMoment, choice: MatchChoice, positionModule: PositionModule) {
  const weight = getPositionPerformanceWeight(moment, choice, positionModule);
  if (weight >= 1.15) {
    return "the action strongly matched your role";
  }
  if (weight >= 0.95) {
    return "the action fit your expected job";
  }
  if (choice.outcome === "goal" && positionModule.group !== "Forward") {
    return "useful output, but not your main role expectation";
  }
  return "solid team work, but outside your highest-value focus";
}

function getOutcomeReason(
  result: Pick<MatchResult, "outcomeTier" | "goals" | "assists" | "success"> & { decisiveOutcome: boolean },
  choice: MatchChoice,
) {
  if (result.goals > 0) {
    return "goal output gave the rating a clear lift";
  }
  if (result.assists > 0) {
    return "chance creation turned into direct output";
  }
  if (result.outcomeTier === "Great") {
    return "execution stood out even without direct output";
  }
  if (result.success) {
    return choice.outcome === "trust" ? "clean role action improved trust" : "good idea without the final decisive touch";
  }
  return "execution limited the rating gain";
}

function getXpReason(xp: Partial<Record<AttributeKey, number>>, positionModule: PositionModule) {
  const topEntry = Object.entries(xp)
    .filter(([, value]) => (value ?? 0) > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0] as [AttributeKey, number] | undefined;

  if (!topEntry) {
    return undefined;
  }

  const [attribute, value] = topEntry;
  const keyNote = positionModule.keyAttributes.includes(attribute) ? " key attribute" : "";
  return `XP driver: ${attribute}${keyNote} gained +${value}.`;
}

function getChoiceAttributeAverage(attributes: Attribute[], choice: MatchChoice) {
  const total = choice.uses.reduce((sum, key) => sum + getAttributeValue(attributes, key), 0);
  return Math.round(total / choice.uses.length);
}

function getTrainingIntensityLabel(intensity: Intensity) {
  if (intensity === "Light") {
    return "Light session";
  }
  if (intensity === "Hard") {
    return "Hard session";
  }
  return "Balanced session";
}

function getTrainingProjection(state: GameState) {
  const intensity = getIntensityProfile(state.intensity);
  const ranges: Partial<Record<AttributeKey, { min: number; max: number }>> = {};

  getCurrentTrainingFocuses(state).forEach((focus) => {
    const baseRange = getBaseTrainingRange(state, focus);
    ranges[focus] = {
      min: Math.max(1, Math.round(baseRange.min * intensity.xpFloor)),
      max: Math.max(1, Math.round(baseRange.max * intensity.xpCeiling)),
    };
  });

  return {
    ranges,
    fitnessDelta: intensity.fitnessDelta,
    moraleDelta: intensity.moraleDelta,
    trustDelta: intensity.trustDelta,
  };
}

function getCurrentTrainingFocuses(state: GameState): AttributeKey[] {
  return state.trainingFocuses.length > 0 ? state.trainingFocuses : ["Finishing"];
}

function getBaseTrainingRange(_state: GameState, _focus: AttributeKey) {
  return { min: 5, max: 40 };
}

function getIntensityProfile(intensity: Intensity) {
  const profiles: Record<
    Intensity,
    { xpFloor: number; xpCeiling: number; fitnessDelta: number; moraleDelta: number; trustDelta: number }
  > = {
    Light: { xpFloor: 0.75, xpCeiling: 0.75, fitnessDelta: 4, moraleDelta: 1, trustDelta: 0 },
    Balanced: { xpFloor: 1, xpCeiling: 1, fitnessDelta: -4, moraleDelta: 0, trustDelta: 1 },
    Hard: { xpFloor: 1.25, xpCeiling: 1.25, fitnessDelta: -10, moraleDelta: -1, trustDelta: 2 },
  };

  return profiles[intensity];
}

function rollTrainingXp(
  state: GameState,
  ranges: Partial<Record<AttributeKey, { min: number; max: number }>>,
): Partial<Record<AttributeKey, number>> {
  const xp: Partial<Record<AttributeKey, number>> = {};

  getCurrentTrainingFocuses(state).forEach((focus) => {
    const range = ranges[focus];
    if (!range) {
      return;
    }

    const roll = seededNoise(`${state.week}-${focus}-${state.intensity}-${state.fitness}-${state.trust}`);
    xp[focus] = Math.round(range.min + roll * (range.max - range.min));
  });

  return xp;
}

function createMatchSeed(state: GameState, context: UpcomingMatch) {
  return [
    "match",
    context.id,
    state.week,
    state.seasonStats.apps,
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 8),
  ].join("-");
}

function calculateOvr(attributes: Attribute[], weights: Partial<Record<AttributeKey, number>> = positionModules.Forward.ovrWeights) {
  const weighted = attributes.reduce(
    (sum, attribute) => {
      const weight = weights[attribute.label] ?? 1;
      return {
        value: sum.value + attribute.value * weight,
        weight: sum.weight + weight,
      };
    },
    { value: 0, weight: 0 },
  );

  return Math.round(weighted.value / weighted.weight);
}

function getAttributeValue(attributes: Attribute[], key: AttributeKey) {
  return attributes.find((attribute) => attribute.label === key)?.value ?? 0;
}

function getAttributeValueMap(attributes: Attribute[]) {
  return Object.fromEntries(attributes.map((attribute) => [attribute.label, attribute.value]));
}

function getAverageRating(ratings: number[]) {
  if (ratings.length === 0) {
    return 6.4;
  }

  return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
}

function getFormScore(ratings: number[]) {
  return clamp(Math.round((getAverageRating(ratings) - 5) * 35), 0, 100);
}

function getFormLabel(ratings: number[]) {
  const average = getAverageRating(ratings);
  if (average >= 7.2) {
    return "Hot";
  }
  if (average >= 6.7) {
    return "Good";
  }
  if (average >= 6.2) {
    return "Mixed";
  }
  return "Cold";
}

function getTrustStatus(trust: number) {
  if (trust >= 70) {
    return "Trusted";
  }
  if (trust >= 55) {
    return "Rotation";
  }
  if (trust >= 35) {
    return "Warming";
  }
  return "Distant";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default App;
