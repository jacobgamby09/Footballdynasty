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
import type {
  Attribute,
  AttributeLevelUp,
  ChanceQuality,
  ClubState,
  ClubView,
  Contract,
  ContractOffer,
  DevelopmentEnvironment,
  DynastySeason,
  DynastyState,
  FitnessAvailability,
  Fixture,
  FixtureResult,
  GameState,
  GenerationProfile,
  GrowthPressureTone,
  HomeView,
  Intensity,
  LastMatchSummary,
  LeagueTableRow,
  LeagueTeam,
  LeagueTier,
  LeagueTierId,
  MatchChoice,
  MatchEvent,
  MatchMoment,
  MatchResult,
  MatchSpeed,
  MatchState,
  MatchTotals,
  NavKey,
  OutcomeTier,
  PlayerMatchEvent,
  ScreenKey,
  SeasonState,
  SeasonStats,
  SelectionFactor,
  SelectionReport,
  SimMatchEvent,
  SupportTrackDefinition,
  SupportTrackId,
  SupportUpgradeDefinition,
  SupportUpgradeId,
  SavePayload,
  TrainingQuality,
  TrainingQualityProfile,
  TrainingSpecialist,
  TrainingSpecialistId,
  TrainingSummary,
  UpcomingMatch,
  Venue,
} from "./types";
import { attributeInfo, generationProfiles, initialAttributes, initialDynasty } from "./data/attributes";
import {
  contractMarketClubs,
  currentClubName,
  currentClubShortName,
  currentClubStrength,
  currentLeagueTier,
  initialClub,
  leagueTiers,
} from "./data/leagues";
import { baseLeagueTeams, seasonFixtures } from "./data/fixtures";
import {
  bootsActionAttributes,
  initialSupportUpgrades,
  supportTrackDefinitions,
  supportUpgradeDefinitions,
  supportUpgradeMap,
  trainingSpecialistMap,
  trainingSpecialists,
} from "./data/support";
import { getAttributeGrowthPressure, getAttributeXpRequirement, getBaseAttributeXpRequirement } from "./systems/attributeXp";
import { clamp } from "./utils";
import {
  createClubStateFromOffer,
  createLeagueTeams,
  createSeasonFixtures,
  getClubShortCode,
  getClubShortName,
  getClubStrengthForTier,
  rebuildSeasonForClub,
} from "./systems/club";
import { clearSavedGame, createInitialState, loadSavedGame, saveGameState } from "./state/save";

const navItems = [
  { key: "player" as const, label: "Player", icon: UserRound },
  { key: "training" as const, label: "Training", icon: Dumbbell },
  { key: "club" as const, label: "Club", icon: Building2 },
  { key: "home" as const, label: "Home", icon: Home },
];

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("player");
  const [game, setGame] = useState<GameState>(() => loadSavedGame());
  const [matchSpeed, setMatchSpeed] = useState<MatchSpeed>(2);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved">("saved");

  const activeNav =
    activeScreen === "pre-match" ||
    activeScreen === "match" ||
    activeScreen === "summary" ||
    activeScreen === "training-summary" ||
    activeScreen === "week-summary" ||
    activeScreen === "contract-offer" ||
    activeScreen === "season-review"
      ? undefined
      : activeScreen;
  const seasonComplete = isSeasonComplete(game.season);
  const isMatchDay = hasPlayableFixture(game.season);
  const needsTraining = game.trainingCompletedWeek !== game.week && !seasonComplete;
  const advanceLabel =
    activeScreen === "pre-match"
      ? "Start Match"
      : activeScreen === "match"
      ? game.activeMatch?.isComplete
        ? "Finish Match"
        : "In Match"
      : activeScreen === "summary"
        ? "Week Summary"
      : activeScreen === "training-summary"
        ? "Continue Career"
      : activeScreen === "week-summary"
        ? game.contractOffer
          ? "Contract"
          : seasonComplete
            ? "Season Review"
            : "Next Week"
      : activeScreen === "contract-offer"
        ? "Accept Offer"
      : activeScreen === "season-review"
        ? "Next Season"
        : activeScreen === "training" && needsTraining
          ? "Start Training"
        : seasonComplete
          ? "Season Review"
        : needsTraining
          ? "Training"
        : isMatchDay
          ? "Match Day"
          : "Next Week";

  useEffect(() => {
    if (game.activeMatch) {
      setSaveStatus("unsaved");
      return;
    }

    saveGameState(game);
    setSaveStatus("saved");
  }, [game]);

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
    setGame((state) => {
      const capacity = getTrainingFocusCapacity(state);
      const currentFocuses = getCurrentTrainingFocuses(state);
      const alreadySelected = currentFocuses.includes(focus);
      const nextFocuses = alreadySelected
        ? currentFocuses.length > 1
          ? currentFocuses.filter((item) => item !== focus)
          : currentFocuses
        : capacity <= 1
          ? [focus]
          : [...currentFocuses, focus].slice(0, capacity);

      return {
        ...state,
        trainingFocuses: nextFocuses,
        selectedFocus: nextFocuses[0] ?? focus,
        lastEvent:
          capacity > 1
            ? `${nextFocuses.join(", ")} selected for this week's training.`
            : `${focus} selected for this week's training.`,
      };
    });
  }

  function setIntensity(intensity: Intensity) {
    setGame((state) => ({
      ...state,
      intensity,
      lastEvent: `${intensity} intensity selected.`,
    }));
  }

  function setTrainingSpecialist(specialist: TrainingSpecialistId) {
    setGame((state) => ({
      ...state,
      trainingSpecialist: specialist,
      lastEvent: `${trainingSpecialistMap[specialist].name} assigned to this week's training.`,
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

    if (activeScreen === "week-summary") {
      closeWeekSummary();
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

    if (activeScreen === "season-review") {
      startNextSeason();
      return;
    }

    if (activeScreen === "contract-offer") {
      acceptContractOffer();
      return;
    }

    if (activeScreen === "training" && needsTraining) {
      startTraining();
      return;
    }

    if (seasonComplete) {
      setActiveScreen("season-review");
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

      const currentEvent = state.activeMatch.events[state.activeMatch.currentEventIndex];
      const followUpEvent =
        state.activeMatch.currentResult && currentEvent?.type === "player_moment"
          ? createFollowUpMoment(state.activeMatch, currentEvent, state.activeMatch.currentResult)
          : undefined;
      const results = state.activeMatch.currentResult
        ? [...state.activeMatch.results, state.activeMatch.currentResult]
        : state.activeMatch.results;
      const nextIndex = state.activeMatch.currentEventIndex + 1;

      if (followUpEvent) {
        const events = [
          ...state.activeMatch.events.slice(0, nextIndex),
          followUpEvent,
          ...state.activeMatch.events.slice(nextIndex),
        ];

        return {
          ...state,
          activeMatch: {
            ...state.activeMatch,
            events,
            currentEventIndex: nextIndex,
            liveMinute: followUpEvent.minute,
            results,
            currentResult: undefined,
          },
        };
      }

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
    setActiveScreen("week-summary");
  }

  function closeWeekSummary() {
    setActiveScreen(game.contractOffer ? "contract-offer" : isSeasonComplete(game.season) ? "season-review" : "player");
  }

  function closeTrainingSummary() {
    setActiveScreen("player");
  }

  function startNextSeason() {
    setGame((state) => startNextSeasonState(state));
    setActiveScreen("player");
  }

  function acceptContractOffer() {
    setGame((state) => acceptContractOfferState(state));
    setActiveScreen(isSeasonComplete(game.season) ? "season-review" : "player");
  }

  function declineContractOffer() {
    setGame((state) => ({
      ...state,
      contractOffer: undefined,
      lastEvent: "Contract offer declined. The club may return with terms later.",
    }));
    setActiveScreen(isSeasonComplete(game.season) ? "season-review" : "player");
  }

  function buySupportUpgrade(upgradeId: SupportUpgradeId) {
    setGame((state) => buySupportUpgradeState(state, upgradeId));
  }

  function navigate(nav: NavKey) {
    setActiveScreen(nav);
  }

  function resetCareer() {
    const confirmed = window.confirm("Start a new career? This will delete the current local save.");
    if (!confirmed) {
      return;
    }

    clearSavedGame();
    setGame(createInitialState());
    setActiveScreen("player");
    setSaveStatus("saved");
  }

  return (
    <main className="app-shell">
      <section className="app-frame" aria-label="Football Dynasty">
        <div className="screen-scroll">
          {activeScreen === "player" && <PlayerScreen game={game} />}
          {activeScreen === "training" && (
            <TrainingScreen
              game={game}
              onIntensityChange={setIntensity}
              onFocusChange={setTrainingFocus}
              onSpecialistChange={setTrainingSpecialist}
            />
          )}
          {activeScreen === "club" && <ClubScreen game={game} />}
          {activeScreen === "home" && (
            <HomeScreen
              game={game}
              saveStatus={saveStatus}
              onBuySupportUpgrade={buySupportUpgrade}
              onResetCareer={resetCareer}
            />
          )}
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
          {activeScreen === "week-summary" && <WeekSummaryScreen game={game} />}
          {activeScreen === "contract-offer" && game.contractOffer && (
            <ContractOfferScreen
              current={game.contract}
              offer={game.contractOffer}
              onDecline={declineContractOffer}
            />
          )}
          {activeScreen === "season-review" && <SeasonReviewScreen game={game} />}
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
  if (isSeasonComplete(game.season)) {
    const review = getSeasonReview(game);

    return (
      <section className="card selection-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Selection briefing</span>
            <h2>Season complete</h2>
          </div>
          <ShieldCheck size={19} />
        </div>
        <div className="selection-score-hero">
          <div>
            <span>Manager score</span>
            <strong>{review.selection.score}</strong>
          </div>
          <div className="selection-score-copy">
            <b>{review.verdict.title}</b>
            <ProgressBar value={review.selection.score} />
            <small>Review the season before moving on</small>
          </div>
        </div>
      </section>
    );
  }

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
  const seasonComplete = isSeasonComplete(game.season);
  const displayMatch = seasonComplete ? game.season.fixtures.length : game.season.fixtureIndex + 1;
  const progress = (game.season.results.length / game.season.fixtures.length) * 100;

  return (
    <section className="card season-context-card">
      <div className="section-heading">
        <div>
          <span className="metric-label">Season context</span>
          <h2>
            {seasonComplete ? "Season complete" : `Match ${displayMatch}/${game.season.fixtures.length}`}
          </h2>
        </div>
        <BarChart3 size={19} />
      </div>
      <ProgressBar value={progress} />
      <div className="next-grid">
        <InfoTile label="Record" value={`${record.wins}-${record.draws}-${record.losses}`} tone={record.wins > record.losses ? "good" : undefined} />
        <InfoTile label="Form" value={getRecentFormText(game.season.results)} />
        <InfoTile
          label={seasonComplete ? "Status" : "Next"}
          value={seasonComplete ? "Review" : currentFixture.opponentShort}
          tone={seasonComplete || currentFixture.competition.includes("Cup") ? "gold" : undefined}
        />
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
        <div className="eyebrow">Week {game.week} - Season {game.season.season}</div>
        <h1>Jonas Vale</h1>
        <div className="identity-row">
          <span>17 yrs</span>
          <span>{game.positionCode}</span>
          <span>{game.archetype}</span>
        </div>
        <div className="club-chip">
          <span className="club-dot" />
          {game.club.name}
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
  const [showOvrDetails, setShowOvrDetails] = useState(false);
  const positionModule = getPositionModule(game.positionGroup);
  const ovr = calculateOvr(game.attributes, positionModule.ovrWeights);
  const potentialOvr = calculatePotentialOvr(game.attributes, positionModule.ovrWeights);
  const ovrBreakdown = getOvrBreakdown(game.attributes, positionModule);
  const seasonComplete = isSeasonComplete(game.season);
  const upcomingMatch = seasonComplete ? undefined : getUpcomingMatch(game);
  const review = seasonComplete ? getSeasonReview(game) : undefined;
  const selection = upcomingMatch?.selection ?? review?.selection;
  const status = seasonComplete
    ? "Season Review"
    : upcomingMatch?.selection.role === "Bench"
      ? "Prospect"
      : upcomingMatch?.selection.role ?? "Prospect";
  const nextRoleText = selection?.nextRole
    ? `${selection.pointsToNextRole} pts to ${selection.nextRole}`
    : "Starter secured";

  return (
    <section className="card career-card">
      <button className="career-score" type="button" aria-label="Open OVR details" onClick={() => setShowOvrDetails(true)}>
        <div>
          <span className="metric-label">OVR</span>
          <strong>{ovr}</strong>
        </div>
      </button>

      <div className="career-details">
        <InfoRow label="Squad status" value={status} />
        <InfoRow label="Expected minutes" value={upcomingMatch?.expectedMinutes ?? "Off-season"} />
        <ProgressRow label="Manager trust" value={game.trust} accent="lime" />
        <ProgressRow label="Selection score" value={selection?.score ?? 0} display={`${selection?.score ?? 0}/100`} accent="gold" />
        <InfoRow label="Next role" value={nextRoleText} />
      </div>

      {showOvrDetails && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowOvrDetails(false)}>
          <div className="attribute-modal ovr-modal" role="dialog" aria-modal="true" aria-label="OVR details" onClick={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <div>
                <span className="metric-label">{positionModule.displayName} rating</span>
                <h2>OVR {ovr}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close OVR details" onClick={() => setShowOvrDetails(false)}>
                x
              </button>
            </div>
            <p>
              OVR is your role-based current ability. For {positionModule.shortCode}, only the weighted attributes below count, so a single
              specialist stat will not inflate your full position rating.
            </p>
            <div className="readiness-modal-score">
              <strong>{potentialOvr}</strong>
              <span>Current growth profile marker</span>
              <ProgressBar value={potentialOvr} />
            </div>
            <p>
              This is not a hard cap. Progress above the marker is possible, but each level becomes more expensive unless better facilities,
              support, performance or future dynasty advantages improve the growth curve.
            </p>
            <div className="ovr-weight-list" aria-label="OVR weighted attributes">
              {ovrBreakdown.map((item) => (
                <div className="ovr-weight-row" key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.share}% weight</span>
                  </div>
                  <b>{item.value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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

function sumXp(xp: Partial<Record<AttributeKey, number>>) {
  return Object.values(xp).reduce((sum, value) => sum + (value ?? 0), 0);
}

function getTopXpEntry(xp: Partial<Record<AttributeKey, number>>) {
  const [attribute, value] = Object.entries(xp)
    .filter(([, xpValue]) => (xpValue ?? 0) > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0] ?? [];

  return attribute && value ? { attribute: attribute as AttributeKey, value } : undefined;
}

function getMoraleLabel(morale: number) {
  if (morale >= 75) {
    return "Happy";
  }
  if (morale >= 55) {
    return "Stable";
  }
  if (morale >= 40) {
    return "Low";
  }
  return "Frustrated";
}

function getPressureLabel(pressure: number) {
  if (pressure > 70) {
    return "High";
  }
  if (pressure > 40) {
    return "Rising";
  }
  return "Low";
}

function NextActionCard({ game }: { game: GameState }) {
  const seasonComplete = isSeasonComplete(game.season);
  const isMatchDay = hasPlayableFixture(game.season);
  const needsTraining = game.trainingCompletedWeek !== game.week && !seasonComplete;
  const focus = getCurrentTrainingFocuses(game)[0];
  const projection = getTrainingProjection(game);
  const upcomingMatch = seasonComplete ? undefined : getUpcomingMatch(game);
  const focusRange = projection.ranges[focus];

  return (
    <section className="card next-card">
      <div className="section-heading">
        <div>
          <span className="metric-label">{seasonComplete ? "Season complete" : !needsTraining && isMatchDay ? "Match Day" : "Next Action"}</span>
          <h2>
            {seasonComplete
              ? "Review season"
              : !needsTraining && isMatchDay && upcomingMatch
              ? formatFixtureTitle(upcomingMatch.venue, upcomingMatch.opponentShort, game.club.shortName)
              : needsTraining
                ? "Complete weekly training"
                : "Ready for next week"}
          </h2>
        </div>
        <CalendarDays size={19} />
      </div>

      <div className="next-grid">
        <InfoTile label="Role" value={!needsTraining && isMatchDay && upcomingMatch ? upcomingMatch.playerRole : seasonComplete ? "Review" : "Prospect"} />
        <InfoTile label="Focus" value={!needsTraining && isMatchDay && upcomingMatch ? upcomingMatch.tacticalFocus : seasonComplete ? "Season" : focus} />
        <InfoTile
          label={needsTraining ? "XP Range" : seasonComplete ? "Reward" : "Status"}
          value={
            needsTraining && focusRange
              ? `${focusRange.min}-${focusRange.max}`
              : seasonComplete
                ? `+$${getSeasonReview(game).cashReward}`
                : !needsTraining && isMatchDay && upcomingMatch
                  ? upcomingMatch.matchImportance
                  : "Trained"
          }
          tone={needsTraining ? "good" : undefined}
        />
      </div>

      <div className="match-hint">
        <Activity size={16} />
        <span>
          {seasonComplete
            ? "Season is complete. Review the campaign and start the next one."
            : !needsTraining && isMatchDay && upcomingMatch
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
          const xpRequirement = getAttributeXpRequirement(attribute);
          const growthPressure = getAttributeGrowthPressure(attribute);
          const progressPercent = getAttributeProgressPercent(attribute);
          const xpToLevel = Math.max(0, xpRequirement - attribute.xp);
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
              <div className="attribute-growth-line">
                <span className={`growth-pill tone-${growthPressure.tone}`}>{growthPressure.label}</span>
                <em>{growthPressure.copy}</em>
              </div>
              <div className="attribute-track" aria-label={`${attribute.label} ${attribute.xp}/${xpRequirement} XP to next level`}>
                <span style={{ width: `${progressPercent}%` }} />
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
  const contract = game.contract;
  const status = getContractStatusLabel(game);

  return (
    <section className="card contract-card">
      <div className="section-heading">
        <div>
          <span className="metric-label">Contract</span>
          <h2>{contract.label}</h2>
        </div>
        <BadgeDollarSign size={19} />
      </div>
      <div className="contract-hero">
        <div>
          <span>Weekly wage</span>
          <strong>${contract.weeklyWage}</strong>
        </div>
        <div>
          <span>Role promise</span>
          <strong>{contract.rolePromise}</strong>
        </div>
      </div>
      <div className="next-grid">
        <InfoTile label="Left" value={`${contract.weeksRemaining} wks`} />
        <InfoTile label="Goal bonus" value={`+$${contract.goalBonus}`} tone="gold" />
        <InfoTile label="Status" value={status} tone={game.contractOffer ? "good" : contract.weeksRemaining <= 1 ? "warn" : undefined} />
      </div>
      <div className="next-grid">
        <InfoTile label="Appearance" value={`+$${contract.appearanceBonus}`} />
        <InfoTile label="Assist" value={`+$${contract.assistBonus}`} />
        <InfoTile label="Market" value={`$${marketValue}k`} />
      </div>
      <div className="match-hint">
        <Activity size={16} />
        <span>
          {game.contractOffer
            ? game.contractOffer.source === "external-club"
              ? `${game.contractOffer.club} has made an offer.`
              : "The club has new terms ready for you."
            : game.prestige > 20
              ? "Regional interest is building."
              : "Local interest. Strong output can improve the next package."}
        </span>
      </div>
    </section>
  );
}

function ContractOfferScreen({
  current,
  offer,
  onDecline,
}: {
  current: Contract;
  offer: ContractOffer;
  onDecline: () => void;
}) {
  return (
    <section className="simple-screen contract-offer-screen">
      <ScreenTitle label={offer.source === "external-club" ? "Contract market" : "Club offer"} title={offer.title} />

      <div className="card contract-offer-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">{offer.club}</span>
            <h2>{offer.label}</h2>
          </div>
          <BadgeDollarSign size={19} />
        </div>
        <div className="contract-hero">
          <div>
            <span>Weekly wage</span>
            <strong>${current.weeklyWage} &rarr; ${offer.weeklyWage}</strong>
          </div>
          <div>
            <span>Role promise</span>
            <strong>{offer.rolePromise}</strong>
          </div>
        </div>
        <div className="stat-grid">
          <InfoTile label="Length" value={`${offer.weeks} wks`} />
          <InfoTile label="Signing" value={`+$${offer.signingBonus}`} tone="good" />
          <InfoTile label="Appearance" value={`+$${offer.appearanceBonus}`} />
          <InfoTile label="Goal" value={`+$${offer.goalBonus}`} tone="gold" />
          <InfoTile label="Assist" value={`+$${offer.assistBonus}`} />
          <InfoTile label="Pressure" value={formatSigned(offer.pressureModifier)} tone={offer.pressureModifier > current.pressureModifier ? "warn" : undefined} />
        </div>
        <p>{offer.summary}</p>
      </div>

      <div className="card">
        <span className="metric-label">Current deal</span>
        <div className="next-grid">
          <InfoTile label="Wage" value={`$${current.weeklyWage}`} />
          <InfoTile label="Left" value={`${current.weeksRemaining} wks`} />
          <InfoTile label="Role" value={current.rolePromise} />
        </div>
      </div>

      <button className="secondary-action" type="button" onClick={onDecline}>
        Decline for now
      </button>
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
  onSpecialistChange,
}: {
  game: GameState;
  onIntensityChange: (intensity: Intensity) => void;
  onFocusChange: (focus: AttributeKey) => void;
  onSpecialistChange: (specialist: TrainingSpecialistId) => void;
}) {
  const [detailAttribute, setDetailAttribute] = useState<AttributeKey | undefined>(undefined);
  const projected = getTrainingProjection(game);
  const focuses = getCurrentTrainingFocuses(game);
  const focus = focuses[0];
  const focusRange = projected.ranges[focus];
  const activeSpecialist = trainingSpecialistMap[game.trainingSpecialist] ?? trainingSpecialistMap.finishing;
  const specialistBonusTotal = sumXp(projected.specialistXp);
  const detailInfo = detailAttribute ? attributeInfo[detailAttribute] : undefined;
  const detailStat = detailAttribute ? game.attributes.find((attribute) => attribute.label === detailAttribute) : undefined;
  const detailGrowth = detailStat ? getAttributeGrowthDetail(game, detailStat) : undefined;
  const positionModule = getPositionModule(game.positionGroup);
  const environment = getDevelopmentEnvironment(getClubLeagueTier(game.club));
  const focusCapacity = getTrainingFocusCapacity(game);

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
        <InfoRow label="Facilities" value={`Lv ${environment.facilityLevel} - ${Math.round(environment.xpMultiplier * 100)}% XP`} />
        <InfoRow label="Focus slots" value={`${focuses.length}/${focusCapacity} active`} />
        <InfoRow label="Session quality" value={projected.qualityLabel} />
        <InfoRow label="Specialist" value={specialistBonusTotal > 0 ? `+${specialistBonusTotal} XP` : activeSpecialist.name} />
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
        <span className="metric-label">Specialist program</span>
        <div className="specialist-grid">
          {trainingSpecialists.map((specialist) => {
            const isActive = game.trainingSpecialist === specialist.id;
            const isRelevant = specialist.attributes.includes(focus);
            return (
              <button
                className={`specialist-button ${isActive ? "is-active" : ""}`}
                key={specialist.id}
                type="button"
                onClick={() => onSpecialistChange(specialist.id)}
              >
                <span>{specialist.name}</span>
                <strong>{isRelevant ? "Bonus active" : specialist.category}</strong>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card training-slot-card">
        <div className="training-focus-heading">
          <span className="metric-label">Stat focus</span>
          <strong>{getTrainingFocusUnlockLabel(game)}</strong>
        </div>
        <div className="training-stat-grid">
          {game.attributes.map((attribute) => {
            const info = attributeInfo[attribute.label];
            const isKeyAttribute = positionModule.keyAttributes.includes(attribute.label);
            const focusIndex = focuses.indexOf(attribute.label);
            const isFocused = focusIndex >= 0;
            return (
              <div
                className={`stat-focus-button ${isFocused ? "is-active" : ""} ${isKeyAttribute ? "is-key" : ""}`}
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
                {isFocused && <em className="focus-slot-pill">{focusIndex === 0 ? "Main" : `Slot ${focusIndex + 1}`}</em>}
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

      {detailAttribute && detailInfo && detailStat && detailGrowth && (
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
            <div className="attribute-detail-hero">
              <div>
                <span>Current level</span>
                <strong>{detailStat.value}</strong>
              </div>
              <div>
                <span>XP to next</span>
                <strong>{detailGrowth.xpToNext}</strong>
              </div>
              <div>
                <span>Growth</span>
                <b className={`growth-pill tone-${detailGrowth.pressure.tone}`}>{detailGrowth.pressure.label}</b>
              </div>
            </div>
            <p>{detailInfo.description}</p>
            <div className="attribute-detail-meter">
              <div className="xp-meter-labels">
                <span>{detailStat.xp}/{detailGrowth.requirement} XP</span>
                <strong>{Math.round(detailGrowth.progress)}%</strong>
              </div>
              <div className="xp-meter-track" aria-label={`${detailAttribute} XP to next level`}>
                <span className="xp-meter-fill" style={{ "--xp-to": `${detailGrowth.progress}%`, "--xp-from": "0%", "--xp-gain": "0%", "--xp-split": "100%" } as CSSProperties} />
              </div>
            </div>
            <div className="attribute-breakdown-grid">
              <InfoTile label="Base requirement" value={`${detailGrowth.baseRequirement} XP`} />
              <InfoTile label="Growth pressure" value={`x${detailGrowth.pressure.multiplier.toFixed(2)}`} tone={detailGrowth.pressure.tone === "fast" ? "good" : detailGrowth.pressure.tone === "normal" ? undefined : "gold"} />
              <InfoTile label="Profile marker" value={`${detailStat.potential}`} />
              <InfoTile label="Selected range" value={detailGrowth.trainingRange} tone={detailGrowth.isSelected ? "good" : undefined} />
            </div>
            <div className="attribute-modal-impact">
              <span>Affects</span>
              <strong>{detailInfo.affects}</strong>
            </div>
            <div className="attribute-modal-impact">
              <span>Active modifiers</span>
              <strong>{detailGrowth.modifiers.join(" / ")}</strong>
            </div>
            <div className="attribute-modal-impact">
              <span>How to improve growth</span>
              <strong>{detailGrowth.improvementTips.join(" / ")}</strong>
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
  const homeName = match.venue === "Home" ? match.teamShortName : match.opponent;
  const awayName = match.venue === "Home" ? match.opponent : match.teamShortName;
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
  const homeName = summary.venue === "Home" ? summary.clubShortName : summary.opponent;
  const awayName = summary.venue === "Home" ? summary.opponent : summary.clubShortName;
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
  if (match.isInSquad === false || match.fitnessAvailability === "Out") {
    return "Likely rested";
  }

  if (match.fitnessAvailability === "Critical") {
    return "Emergency only";
  }

  if (match.playerRole === "Starter") {
    return match.fitnessAvailability === "Heavy" || match.fitnessAvailability === "Tired"
      ? "Start, managed load"
      : "Start XI";
  }

  if (match.playerRole === "Rotation Starter") {
    return match.fitnessAvailability === "Heavy" ? "Limited start" : "Start or early rotation";
  }

  if (match.playerRole === "Impact Sub") {
    return match.fitnessAvailability === "Heavy" ? "If chasing late" : "Second-half option";
  }

  return "Late bench cover";
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
  const rawTotals = summarizeMatchResults(completedResults, simTotals);
  const totals = { ...rawTotals, fitnessDelta: getMatchFitnessDelta(match, completedResults) };
  const visibleScore = getTimelineScore(match, completedResults, processedEventIndex);
  const recentEvents = getRecentTimelineItems(match, completedResults);
  const nextEventMinute = event ? `${event.minute}'` : "FT";
  const pitchStatus = getPitchStatus(match);
  const followUpQueued =
    event?.type === "player_moment" && match.currentResult
      ? Boolean(createFollowUpMoment(match, event, match.currentResult))
      : false;

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
          {isPlayerMoment
            ? event.chainDepth
              ? "Follow-up moment"
              : "Player moment"
            : match.isComplete
              ? "Full time"
              : `Live - next ${nextEventMinute}`}
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
                <span>Kickoff. {match.teamShortName} settle into shape.</span>
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
          <div className={`card result-card result-popup ${getResultPopupTone(match.currentResult)}`}>
            <span className="metric-label">{getResultPopupLabel(match.currentResult)}</span>
            <div className="result-verdict">
              <strong>{getResultVerdictText(match.currentResult)}</strong>
              <span>{match.currentResult.chanceQuality}</span>
            </div>
            <h2>{match.currentResult.title}</h2>
            <p>{match.currentResult.detail}</p>
            {followUpQueued && <p className="result-follow-up-note">The action opens a follow-up decision.</p>}
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
              {followUpQueued ? "Continue Move" : "Resume Match"}
            </button>
          </div>
        </div>
      )}

      <div className="card match-summary-card">
        <span className="metric-label">Match so far</span>
        <div className="stat-grid">
          <InfoTile label="Goals" value={`${totals.goals}`} tone={totals.goals > 0 ? "gold" : undefined} />
          <InfoTile label="Assists" value={`${totals.assists}`} />
          <InfoTile label="Chances" value={`${totals.chancesCreated}`} tone={totals.chancesCreated > 0 ? "good" : undefined} />
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
    const currentLevel = currentAttribute?.value ?? 1;
    const completedLevel = gain > currentXp && currentLevel > 1;
    const previousLevel = completedLevel ? currentLevel - 1 : currentLevel;
    const previousRequirementAttribute: Attribute = currentAttribute
      ? { ...currentAttribute, value: previousLevel }
      : { label: key, value: previousLevel, potential: previousLevel + 8, xp: 0 };
    const currentRequirementAttribute: Attribute = currentAttribute
      ? { ...currentAttribute, value: currentLevel }
      : { label: key, value: currentLevel, potential: currentLevel + 8, xp: 0 };
    const xpRequirement = getAttributeXpRequirement(previousRequirementAttribute);
    const currentRequirement = getAttributeXpRequirement(currentRequirementAttribute);
    const previousXp = completedLevel
      ? clamp(xpRequirement - Math.max(0, gain - currentXp), 0, xpRequirement)
      : clamp(currentXp - gain, 0, xpRequirement);
    const meterEndXp = completedLevel ? xpRequirement : currentXp;
    const previousPercent = getXpPercent(previousXp, xpRequirement);
    const meterEndPercent = getXpPercent(meterEndXp, xpRequirement);
    const gainedMeterWidth = clamp(meterEndPercent - previousPercent, 0, 100 - previousPercent);
    const meterSplit = meterEndPercent > 0 ? clamp((previousPercent / meterEndPercent) * 100, 0, 100) : 0;
    const meterStyle = {
      "--xp-from": `${previousPercent}%`,
      "--xp-to": `${meterEndPercent}%`,
      "--xp-gain": `${gainedMeterWidth}%`,
      "--xp-split": `${meterSplit}%`,
    } as CSSProperties;

    return {
      attribute,
      currentXp,
      currentRequirement,
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
          <InfoTile label="Chances" value={`${summary.chancesCreated}`} tone={summary.chancesCreated > 0 ? "good" : undefined} />
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
                    {entry.currentXp}/{entry.currentRequirement} XP
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

function WeekSummaryScreen({ game }: { game: GameState }) {
  const match = game.lastMatch;
  const training = game.lastTraining;
  const record = getSeasonRecord(game.season.results);
  const seasonComplete = isSeasonComplete(game.season);
  const nextFixture = seasonComplete ? undefined : getCurrentFixture(game.season);
  const trainingXp = training ? sumXp(training.xp) : 0;
  const matchXp = match ? sumXp(match.xp) : 0;
  const topTraining = training ? getTopXpEntry(training.xp) : undefined;
  const topMatch = match ? getTopXpEntry(match.xp) : undefined;
  const weekNumber = training?.week ?? Math.max(1, game.week - 1);

  return (
    <section className="simple-screen week-summary-screen">
      <ScreenTitle label={`Week ${weekNumber} complete`} title="Week Summary" />

      <div className="card week-summary-hero">
        <div>
          <span className="metric-label">Net cash</span>
          <h2>+${match?.cashDelta ?? 0}</h2>
          <p>
            Wage ${match?.weeklyWage ?? game.contract.weeklyWage}
            {match ? ` + bonuses $${match.cashDelta - match.weeklyWage}` : ""}
          </p>
        </div>
        <div>
          <span className="metric-label">Balance</span>
          <strong>${game.cash}</strong>
          <small>{game.contract.label}</small>
        </div>
      </div>

      <div className="card">
        <span className="metric-label">Economy</span>
        <div className="stat-grid">
          <InfoTile label="Wage" value={`+$${match?.weeklyWage ?? 0}`} tone="good" />
          <InfoTile label="Appearance" value={`+$${match?.appearanceBonus ?? 0}`} />
          <InfoTile label="Goals" value={`+$${match?.goalBonus ?? 0}`} tone={(match?.goalBonus ?? 0) > 0 ? "gold" : undefined} />
          <InfoTile label="Assists" value={`+$${match?.assistBonus ?? 0}`} />
        </div>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Development</span>
            <h2>{trainingXp + matchXp} XP gained</h2>
          </div>
          <Dumbbell size={19} />
        </div>
        <div className="next-grid">
          <InfoTile label="Training XP" value={`+${trainingXp}`} tone={trainingXp > 0 ? "good" : undefined} />
          <InfoTile label="Match XP" value={`+${matchXp}`} tone={matchXp > 0 ? "good" : undefined} />
          <InfoTile label="Level-ups" value={`${training?.levelUps.length ?? 0}`} tone={(training?.levelUps.length ?? 0) > 0 ? "gold" : undefined} />
        </div>
        <div className="week-note-list">
          {topTraining && <WeekNote icon={<Dumbbell size={14} />} text={`Training focus: ${topTraining.attribute} +${topTraining.value} XP`} />}
          {topMatch && <WeekNote icon={<Activity size={14} />} text={`Match development: ${topMatch.attribute} +${topMatch.value} XP`} />}
          {!topTraining && !topMatch && <WeekNote icon={<Activity size={14} />} text="No major development gains this week." />}
        </div>
      </div>

      <div className="card">
        <span className="metric-label">Career movement</span>
        <div className="stat-grid">
          <InfoTile label="Rating" value={match ? match.rating.toFixed(1) : "-"} tone={match && match.rating >= 7 ? "gold" : undefined} />
          <InfoTile label="Selection" value={match ? `${match.selectionBefore} -> ${match.selectionAfter}` : "-"} tone={match && match.selectionAfter > match.selectionBefore ? "good" : undefined} />
          <InfoTile label="Trust" value={match ? formatSigned(match.trustDelta) : "0"} />
          <InfoTile label="Prestige" value={match ? `+${match.prestigeDelta}` : "0"} tone="gold" />
        </div>
      </div>

      <div className="card">
        <span className="metric-label">Condition</span>
        <div className="stat-grid">
          <InfoTile label="Fitness" value={`${Math.round(game.fitness)}%`} tone={game.fitness < 58 ? "warn" : game.fitness >= 75 ? "good" : undefined} />
          <InfoTile label="Training" value={training ? formatSigned(training.fitnessDelta) : "0"} tone={(training?.fitnessDelta ?? 0) < 0 ? "warn" : "good"} />
          <InfoTile label="Match" value={match ? formatSigned(match.fitnessDelta) : "0"} tone={(match?.fitnessDelta ?? 0) < 0 ? "warn" : "good"} />
          <InfoTile label="Morale" value={getMoraleLabel(game.morale)} tone={game.morale >= 70 ? "good" : game.morale < 45 ? "warn" : undefined} />
        </div>
      </div>

      <div className="card">
        <span className="metric-label">Season</span>
        <div className="next-grid">
          <InfoTile label="Result" value={match ? `${match.teamGoals}-${match.opponentGoals}` : "-"} tone={match && match.teamGoals > match.opponentGoals ? "good" : undefined} />
          <InfoTile label="Record" value={`${record.wins}-${record.draws}-${record.losses}`} />
          <InfoTile label={seasonComplete ? "Status" : "Next"} value={seasonComplete ? "Review" : nextFixture?.opponentShort ?? "-"} tone={seasonComplete ? "gold" : undefined} />
        </div>
      </div>
    </section>
  );
}

function WeekNote({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="week-note">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function SeasonReviewScreen({ game }: { game: GameState }) {
  const review = getSeasonReview(game);
  const contractOffer = getSeasonContractOffer(game, review);
  const stats = game.seasonStats;
  const goals = getSeasonGoals(game.season.results);
  const goalDifference = goals.for - goals.against;

  return (
    <section className="simple-screen season-review-screen">
      <ScreenTitle label={`Season ${game.season.season} complete`} title="Season Review" />

      <div className="card season-review-hero">
        <div>
          <span className="metric-label">{game.contract.club}</span>
          <h2>{review.tablePosition}. place</h2>
          <p>
            {review.record.wins}-{review.record.draws}-{review.record.losses}, {review.record.points} pts
          </p>
        </div>
        <div className="season-review-badge">
          <Trophy size={20} />
          <strong>{review.verdict.grade}</strong>
          <span>{review.verdict.title}</span>
        </div>
      </div>

      <div className="card">
        <span className="metric-label">Club campaign</span>
        <div className="stat-grid">
          <InfoTile label="Played" value={`${game.season.results.length}/${game.season.fixtures.length}`} />
          <InfoTile label="Goals" value={`${goals.for}-${goals.against}`} tone={goalDifference >= 0 ? "good" : "warn"} />
          <InfoTile label="GD" value={`${goalDifference > 0 ? "+" : ""}${goalDifference}`} />
          <InfoTile label="Form" value={getRecentFormText(game.season.results)} tone={review.record.wins >= review.record.losses ? "good" : undefined} />
        </div>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Player season</span>
            <h2>{stats.apps} appearances</h2>
          </div>
          <UserRound size={19} />
        </div>
        <div className="stat-grid">
          <InfoTile label="Starts" value={`${stats.starts}`} />
          <InfoTile label="Goals" value={`${stats.goals}`} tone={stats.goals > 0 ? "gold" : undefined} />
          <InfoTile label="Assists" value={`${stats.assists}`} />
          <InfoTile label="Avg rating" value={review.averageRating.toFixed(1)} tone={review.averageRating >= 6.8 ? "good" : undefined} />
        </div>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Manager verdict</span>
            <h2>{review.verdict.title}</h2>
          </div>
          <ShieldCheck size={19} />
        </div>
        <p>{review.verdict.copy}</p>
        <div className="next-grid">
          <InfoTile label="Role" value={review.selection.role} />
          <InfoTile label="Selection" value={`${review.selection.score}/100`} tone={review.selection.score >= 55 ? "good" : undefined} />
          <InfoTile label="Next role" value={review.selection.nextRole ? `${review.selection.pointsToNextRole} pts` : "Secured"} />
        </div>
      </div>

      <div className="card">
        <span className="metric-label">Season rewards</span>
        <div className="next-grid">
          <InfoTile label="Cash" value={`+$${review.cashReward}`} tone="good" />
          <InfoTile label="Prestige" value={`+${review.prestigeReward}`} tone="gold" />
          <InfoTile label="Interest" value={review.marketInterest} />
        </div>
        <div className="match-hint">
          <Sparkles size={16} />
          <span>{review.contractOutlook}</span>
        </div>
      </div>

      <div className="card contract-offer-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Contract package</span>
            <h2>{contractOffer.title}</h2>
          </div>
          <BadgeDollarSign size={19} />
        </div>
        <div className="contract-hero">
          <div>
            <span>Weekly wage</span>
            <strong>${contractOffer.weeklyWage}</strong>
          </div>
          <div>
            <span>Role promise</span>
            <strong>{contractOffer.rolePromise}</strong>
          </div>
        </div>
        <div className="stat-grid">
          <InfoTile label="Length" value={`${contractOffer.weeks} wks`} />
          <InfoTile label="Signing" value={`+$${contractOffer.signingBonus}`} tone="good" />
          <InfoTile label="Goal" value={`+$${contractOffer.goalBonus}`} tone="gold" />
          <InfoTile label="Assist" value={`+$${contractOffer.assistBonus}`} />
        </div>
        <p>{contractOffer.summary}</p>
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
  const currentLevel = primaryAttribute?.value ?? levelUp?.after ?? 0;
  const previousLevel = levelUp?.before ?? currentLevel;
  const previousRequirementAttribute: Attribute = primaryAttribute
    ? { ...primaryAttribute, value: previousLevel }
    : { label: primaryFocus, value: previousLevel, potential: previousLevel + 8, xp: 0 };
  const currentRequirementAttribute: Attribute = primaryAttribute
    ? { ...primaryAttribute, value: currentLevel }
    : { label: primaryFocus, value: currentLevel, potential: currentLevel + 8, xp: 0 };
  const xpRequirement = getAttributeXpRequirement(previousRequirementAttribute);
  const currentRequirement = getAttributeXpRequirement(currentRequirementAttribute);
  const previousXp = levelUp
    ? clamp(xpRequirement - Math.max(0, primaryGain - currentXp), 0, xpRequirement)
    : clamp(currentXp - primaryGain, 0, xpRequirement);
  const meterEndXp = levelUp ? xpRequirement : currentXp;
  const previousPercent = getXpPercent(previousXp, xpRequirement);
  const meterEndPercent = getXpPercent(meterEndXp, xpRequirement);
  const gainedMeterWidth = clamp(meterEndPercent - previousPercent, 0, 100 - previousPercent);
  const meterSplit = meterEndPercent > 0 ? clamp((previousPercent / meterEndPercent) * 100, 0, 100) : 0;
  const meterStyle = {
    "--xp-from": `${previousPercent}%`,
    "--xp-to": `${meterEndPercent}%`,
    "--xp-gain": `${gainedMeterWidth}%`,
    "--xp-split": `${meterSplit}%`,
  } as CSSProperties;
  return (
    <section className="simple-screen summary-screen">
      <ScreenTitle label={`Week ${summary.week} training`} title="Development Summary" />

      <div className={`card training-progress-hero${levelUp ? " has-level-up" : ""}`}>
        <div className="section-heading">
          <div>
            <span className="metric-label">{levelUp ? "Attribute level-up" : "Attribute progress"}</span>
            <h2>{primaryFocus}</h2>
            {levelUp ? (
              <div className="level-up-showcase" aria-label={`${primaryFocus} level increased from ${previousLevel} to ${levelUp.after}`}>
                <span>{previousLevel}</span>
                <strong>{levelUp.after}</strong>
                <em>+{primaryGain} XP</em>
              </div>
            ) : (
              <p>Level {previousLevel} - +{primaryGain} XP</p>
            )}
          </div>
          {levelUp ? <Sparkles size={20} /> : <Dumbbell size={19} />}
        </div>
        <div className="training-xp-meter">
          <div className="xp-meter-labels">
            <span />
            <strong>{currentXp}/{currentRequirement} XP</strong>
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
          <span className="soft-chip">{summary.qualityLabel}</span>
          <span className="soft-chip">{trainingSpecialistMap[summary.specialist]?.name ?? "Specialist program"}</span>
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

      {sumXp(summary.specialistXp) > 0 && (
        <div className="card">
          <div className="section-heading">
            <div>
              <span className="metric-label">Specialist bonus</span>
              <h2>{trainingSpecialistMap[summary.specialist]?.name ?? "Program impact"}</h2>
            </div>
            <Sparkles size={19} />
          </div>
          <div className="xp-list">
            {Object.entries(summary.specialistXp)
              .filter(([, value]) => (value ?? 0) > 0)
              .map(([attribute, value]) => (
                <div className="xp-item" key={`${attribute}-specialist`}>
                  <span>{attribute}</span>
                  <strong>+{value}</strong>
                </div>
              ))}
          </div>
        </div>
      )}

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

    </section>
  );
}

function ClubScreen({ game }: { game: GameState }) {
  const [clubView, setClubView] = useState<ClubView>("overview");
  const seasonComplete = isSeasonComplete(game.season);
  const upcomingMatch = seasonComplete ? undefined : getUpcomingMatch(game);
  const strengthGap = upcomingMatch ? upcomingMatch.teamStrength - upcomingMatch.opponentStrength : 0;
  const outlook = strengthGap >= 4 ? "Favorable" : strengthGap <= -4 ? "Difficult" : "Balanced";
  const record = getSeasonRecord(game.season.results);
  const goals = getSeasonGoals(game.season.results);
  const table = getLeagueTable(game);
  const leagueTier = getClubLeagueTier(game.club);

  if (clubView === "fixtures") {
    return <ClubFixturesView game={game} onBack={() => setClubView("overview")} />;
  }

  if (clubView === "table") {
    return <ClubTableView game={game} onBack={() => setClubView("overview")} />;
  }

  return (
    <section className="simple-screen">
      <ScreenTitle label="Club" title={game.club.name} />
      <div className="card">
        <InfoRow label="League tier" value={leagueTier.name} />
        <InfoRow label="Squad role" value={upcomingMatch?.playerRole ?? "Season Review"} />
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
            <h2>{leagueTier.name}</h2>
          </div>
          <Trophy size={19} />
        </div>
        <LeagueTablePreview table={table} playerClubShort={game.club.shortCode} />
      </button>
      <div className="card split-card">
        <div>
          <span className="metric-label">{seasonComplete ? "Status" : "Next match"}</span>
          <h2>{upcomingMatch?.opponentShort ?? "Season complete"}</h2>
          <p>{upcomingMatch ? `${upcomingMatch.venue} - ${upcomingMatch.competition}` : "Review and start next season"}</p>
        </div>
        <div>
          <span className="metric-label">Role</span>
          <h2>{upcomingMatch?.playerRole ?? "Off-season"}</h2>
          <p>{upcomingMatch?.expectedMinutes ?? "No match plan"}</p>
        </div>
      </div>
      {upcomingMatch && (
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
      )}
      {upcomingMatch && (
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
      )}
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

function LeagueTablePreview({ table, playerClubShort }: { table: LeagueTableRow[]; playerClubShort: string }) {
  const playerClubIndex = table.findIndex((row) => row.short === playerClubShort);
  const start = clamp(playerClubIndex - 1, 0, Math.max(0, table.length - 4));
  const rows = table.slice(start, start + 4);

  return (
    <div className="league-table mini-table">
      {rows.map((row) => (
        <LeagueTableRowView compact key={row.short} row={row} playerClubShort={playerClubShort} />
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

function ClubTableView({ game, onBack }: { game: GameState; onBack: () => void }) {
  const table = getLeagueTable(game);

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
            <LeagueTableRowView key={row.short} row={row} playerClubShort={game.club.shortCode} />
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

function LeagueTableRowView({ row, compact = false, playerClubShort = initialClub.shortCode }: { row: LeagueTableRow; compact?: boolean; playerClubShort?: string }) {
  return (
    <div className={`table-row ${row.short === playerClubShort ? "is-player-club" : ""} ${compact ? "compact" : ""}`}>
      <span>{row.position}</span>
      <strong>{compact ? row.short : row.name}</strong>
      {!compact && <em>{row.played}</em>}
      <em>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</em>
      <b>{row.points}</b>
    </div>
  );
}

function HomeScreen({
  game,
  saveStatus,
  onBuySupportUpgrade,
  onResetCareer,
}: {
  game: GameState;
  saveStatus: "saved" | "unsaved";
  onBuySupportUpgrade: (upgradeId: SupportUpgradeId) => void;
  onResetCareer: () => void;
}) {
  const [homeView, setHomeView] = useState<HomeView>("base");
  const currentSnapshot = createDynastySeasonSnapshot(game);
  const careerTotals = getDynastyTotals([...game.dynastyHistory, currentSnapshot]);
  const positionModule = getPositionModule(game.positionGroup);
  const potentialOvr = calculatePotentialOvr(game.attributes, positionModule.ovrWeights);

  return (
    <section className="simple-screen">
      <ScreenTitle label="Home" title="Private base" />

      <div className="subtab-control" role="tablist" aria-label="Home sections">
        <button className={homeView === "base" ? "is-active" : ""} type="button" onClick={() => setHomeView("base")}>
          Base
        </button>
        <button className={homeView === "support" ? "is-active" : ""} type="button" onClick={() => setHomeView("support")}>
          Support
        </button>
        <button className={homeView === "dynasty" ? "is-active" : ""} type="button" onClick={() => setHomeView("dynasty")}>
          Dynasty
        </button>
      </div>

      {homeView === "base" ? (
        <>
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
              <h2>Gen {game.dynasty.generation}</h2>
              <p>{game.dynasty.potentialTier}</p>
            </div>
            <div>
              <span className="metric-label">Growth profile</span>
              <h2>{potentialOvr}</h2>
              <p>{positionModule.shortCode} marker</p>
            </div>
          </div>
          <div className="card save-card">
            <div className="section-heading">
              <div>
                <span className="metric-label">Career save</span>
                <h2>{saveStatus === "saved" ? "Saved locally" : "Match in progress"}</h2>
              </div>
              <ShieldCheck size={19} />
            </div>
            <p>
              {saveStatus === "saved"
                ? "Career progress is stored on this device."
                : "Finish the current match to save the latest result."}
            </p>
            <button className="danger-action" type="button" onClick={onResetCareer}>
              New Career
            </button>
          </div>
        </>
      ) : homeView === "support" ? (
        <SupportShopView game={game} onBuySupportUpgrade={onBuySupportUpgrade} />
      ) : (
        <>
          <div className="card">
            <div className="section-heading">
              <div>
                <span className="metric-label">Dynasty record</span>
                <h2>{game.dynastyHistory.length} completed seasons</h2>
              </div>
              <Trophy size={19} />
            </div>
            <div className="stat-grid">
              <InfoTile label="Apps" value={`${careerTotals.apps}`} />
              <InfoTile label="Goals" value={`${careerTotals.goals}`} tone={careerTotals.goals > 0 ? "gold" : undefined} />
              <InfoTile label="Assists" value={`${careerTotals.assists}`} />
              <InfoTile label="Avg rating" value={careerTotals.averageRating.toFixed(1)} tone={careerTotals.averageRating >= 6.8 ? "good" : undefined} />
            </div>
          </div>

          <div className="card dynasty-card">
            <div className="section-heading">
              <div>
                <span className="metric-label">Season history</span>
                <h2>Jonas Vale</h2>
              </div>
              <BarChart3 size={19} />
            </div>
            <div className="dynasty-list">
              {[...game.dynastyHistory].reverse().map((season) => (
                <DynastySeasonRow key={season.season} season={season} />
              ))}
              <DynastySeasonRow current season={currentSnapshot} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function SupportShopView({
  game,
  onBuySupportUpgrade,
}: {
  game: GameState;
  onBuySupportUpgrade: (upgradeId: SupportUpgradeId) => void;
}) {
  const totalLevels = getSupportUpgradeTotal(game);

  return (
    <>
      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">In-run economy</span>
            <h2>Player support</h2>
          </div>
          <BadgeDollarSign size={19} />
        </div>
        <div className="next-grid">
          <InfoTile label="Cash" value={`$${game.cash}`} tone="good" />
          <InfoTile label="Owned levels" value={`${totalLevels}`} />
          <InfoTile label="Scope" value="Current run" />
        </div>
        <div className="match-hint">
          <Activity size={16} />
          <span>Cash upgrades help this player now and do not become permanent dynasty power.</span>
        </div>
      </div>

      <div className="support-shop-list">
        {supportTrackDefinitions.map((track) => (
          <SupportTrackCard
            key={track.id}
            cash={game.cash}
            game={game}
            track={track}
            onBuySupportUpgrade={onBuySupportUpgrade}
          />
        ))}
      </div>
    </>
  );
}

function SupportTrackCard({
  cash,
  game,
  track,
  onBuySupportUpgrade,
}: {
  cash: number;
  game: GameState;
  track: SupportTrackDefinition;
  onBuySupportUpgrade: (upgradeId: SupportUpgradeId) => void;
}) {
  const progress = getSupportTrackProgress(game, track);
  const nextPurchase = getNextSupportTrackPurchase(game, track);
  const canBuy = Boolean(nextPurchase && cash >= nextPurchase.cost);
  const impactLine = nextPurchase ? getSupportInvestmentImpactLine(game, track, nextPurchase.upgrade.id) : "All effects unlocked";
  const currentBonuses = getSupportTrackCurrentBonusLines(game, track);

  return (
    <div className={`card support-upgrade-card support-track-card ${progress.maxed ? "is-maxed" : ""}`}>
      <div className="support-upgrade-top">
        <div>
          <span className="metric-label">{track.category}</span>
          <h2>{track.name}</h2>
        </div>
        <div className="support-level-pill">
          {progress.total}/{progress.maxTotal}
        </div>
      </div>
      <p>{track.effect}</p>
      <div className="support-impact-line">
        <span>Next investment</span>
        <strong>{impactLine}</strong>
      </div>
      <div className="support-current-bonuses">
        <span>Current bonuses</span>
        <div>
          {currentBonuses.map((bonus) => (
            <strong key={bonus}>{bonus}</strong>
          ))}
        </div>
      </div>
      <div className="support-breakthrough-row">
        <span>{progress.nextName}</span>
        <strong>{progress.maxed ? "Complete" : `${progress.current}/${progress.required}`}</strong>
      </div>
      <ProgressBar value={progress.percent} />
      <div className="support-upgrade-footer">
        <span>{progress.maxed ? "Track complete" : nextPurchase ? `$${nextPurchase.cost}` : "Locked"}</span>
        <button
          type="button"
          disabled={!canBuy || !nextPurchase}
          onClick={() => nextPurchase && onBuySupportUpgrade(nextPurchase.upgrade.id)}
        >
          {progress.maxed ? "Complete" : canBuy ? "Invest" : "Need cash"}
        </button>
      </div>
    </div>
  );
}

function DynastySeasonRow({ season, current = false }: { season: DynastySeason; current?: boolean }) {
  return (
    <div className={`dynasty-row ${current ? "is-current" : ""}`}>
      <div className="dynasty-season-main">
        <span>S{season.season}</span>
        <div>
          <strong>{season.club}</strong>
          <small>{current ? "Current season" : `${season.leaguePosition}. place - ${season.record}`}</small>
        </div>
      </div>
      <div className="dynasty-stats">
        <span>
          <small>Apps</small>
          <b>{season.apps}</b>
        </span>
        <span>
          <small>G</small>
          <b>{season.goals}</b>
        </span>
        <span>
          <small>A</small>
          <b>{season.assists}</b>
        </span>
        <span>
          <small>AvR</small>
          <b>{season.averageRating.toFixed(1)}</b>
        </span>
      </div>
    </div>
  );
}

function getDynastyTotals(seasons: DynastySeason[]) {
  const totals = seasons.reduce(
    (sum, season) => ({
      apps: sum.apps + season.apps,
      goals: sum.goals + season.goals,
      assists: sum.assists + season.assists,
      ratingWeightedSum: sum.ratingWeightedSum + season.averageRating * season.apps,
    }),
    { apps: 0, goals: 0, assists: 0, ratingWeightedSum: 0 },
  );

  return {
    apps: totals.apps,
    goals: totals.goals,
    assists: totals.assists,
    averageRating: totals.apps > 0 ? totals.ratingWeightedSum / totals.apps : 6.4,
  };
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

function buySupportUpgradeState(state: GameState, upgradeId: SupportUpgradeId): GameState {
  const upgrade = supportUpgradeDefinitions.find((item) => item.id === upgradeId);
  if (!upgrade) {
    return state;
  }

  const currentLevel = state.supportUpgrades[upgradeId] ?? 0;
  if (currentLevel >= upgrade.maxLevel) {
    return state;
  }

  const cost = getSupportUpgradeCost(upgrade, currentLevel);
  if (state.cash < cost) {
    return state;
  }

  const track = getSupportTrackForUpgrade(upgradeId);
  const beforeBreakthroughs = track ? getSupportTrackBreakthroughCount(state, track.id) : 0;
  const nextLevel = currentLevel + 1;
  const nextSupportUpgrades = {
    ...state.supportUpgrades,
    [upgradeId]: nextLevel,
  };
  const nextState = {
    ...state,
    supportUpgrades: nextSupportUpgrades,
  };
  const afterBreakthroughs = track ? getSupportTrackBreakthroughCount(nextState, track.id) : beforeBreakthroughs;
  const breakthroughName =
    track && afterBreakthroughs > beforeBreakthroughs
      ? track.breakthroughs[Math.min(afterBreakthroughs - 1, track.breakthroughs.length - 1)]
      : undefined;

  return {
    ...state,
    cash: state.cash - cost,
    supportUpgrades: nextSupportUpgrades,
    lastEvent: breakthroughName
      ? `${track?.name} breakthrough unlocked: ${breakthroughName}.`
      : `${track?.name ?? upgrade.name} investment added. ${upgrade.name} is now level ${nextLevel}.`,
  };
}

function getSupportUpgradeCost(upgrade: SupportUpgradeDefinition, currentLevel: number) {
  return Math.round(upgrade.baseCost * (1 + currentLevel * 0.62 + Math.pow(currentLevel, 2) * 0.16));
}

function getSupportTrackProgress(state: GameState, track: SupportTrackDefinition) {
  const levels = track.upgradeIds.map((upgradeId) => state.supportUpgrades[upgradeId] ?? 0);
  const total = levels.reduce((sum, level) => sum + level, 0);
  const maxTotal = track.upgradeIds.reduce((sum, upgradeId) => sum + supportUpgradeMap[upgradeId].maxLevel, 0);
  const nextBreakpoint = track.breakpoints.find((breakpoint) => total < breakpoint);
  const previousBreakpoint = [...track.breakpoints].reverse().find((breakpoint) => total >= breakpoint) ?? 0;
  const nextIndex = nextBreakpoint ? track.breakpoints.indexOf(nextBreakpoint) : track.breakpoints.length - 1;
  const required = nextBreakpoint ? nextBreakpoint - previousBreakpoint : 0;
  const current = nextBreakpoint ? total - previousBreakpoint : required;

  return {
    total,
    maxTotal,
    current,
    required,
    percent: nextBreakpoint ? (current / required) * 100 : 100,
    nextName: nextBreakpoint ? track.breakthroughs[nextIndex] : track.breakthroughs[track.breakthroughs.length - 1],
    maxed: total >= maxTotal,
  };
}

function getSupportTrackForUpgrade(upgradeId: SupportUpgradeId) {
  return supportTrackDefinitions.find((track) => track.upgradeIds.includes(upgradeId));
}

function getSupportTrackById(trackId: SupportTrackId) {
  return supportTrackDefinitions.find((track) => track.id === trackId);
}

function getSupportTrackTotal(state: Pick<GameState, "supportUpgrades">, track: SupportTrackDefinition) {
  return track.upgradeIds.reduce((sum, upgradeId) => sum + (state.supportUpgrades[upgradeId] ?? 0), 0);
}

function getSupportTrackBreakthroughCount(state: Pick<GameState, "supportUpgrades">, trackId: SupportTrackId) {
  const track = getSupportTrackById(trackId);
  if (!track) {
    return 0;
  }

  const total = getSupportTrackTotal(state, track);
  return track.breakpoints.filter((breakpoint) => total >= breakpoint).length;
}

function getRecoveryBreakthroughRelief(breakthroughs: number) {
  return Math.floor(breakthroughs / 2);
}

function getNextSupportTrackPurchase(state: GameState, track: SupportTrackDefinition) {
  const options = track.upgradeIds
    .map((upgradeId) => {
      const upgrade = supportUpgradeMap[upgradeId];
      const level = state.supportUpgrades[upgradeId] ?? 0;
      return {
        upgrade,
        level,
        cost: getSupportUpgradeCost(upgrade, level),
      };
    })
    .filter((option) => option.level < option.upgrade.maxLevel)
    .sort((a, b) => a.cost - b.cost || a.level - b.level);

  return options[0];
}

function getSupportInvestmentImpactLine(state: GameState, track: SupportTrackDefinition, upgradeId: SupportUpgradeId) {
  const currentLevel = getSupportLevel(state, upgradeId);
  const nextState = {
    ...state,
    supportUpgrades: {
      ...state.supportUpgrades,
      [upgradeId]: currentLevel + 1,
    },
  };
  const beforeBreakthroughs = getSupportTrackBreakthroughCount(state, track.id);
  const afterBreakthroughs = getSupportTrackBreakthroughCount(nextState, track.id);
  const breakthroughDelta = afterBreakthroughs - beforeBreakthroughs;

  if (upgradeId === "coach") {
    const beforeCapacity = getTrainingFocusCapacity(state);
    const afterCapacity = getTrainingFocusCapacity(nextState);
    if (afterCapacity > beforeCapacity) {
      return `Unlock ${afterCapacity} training focus slots`;
    }
    const beforeFloor = getTrainingXpFloorBonus(currentLevel) + beforeBreakthroughs * 8;
    const afterFloor = getTrainingXpFloorBonus(currentLevel + 1) + afterBreakthroughs * 8;
    const beforeCeiling = getTrainingXpCeilingBonus(currentLevel) + beforeBreakthroughs * 12;
    const afterCeiling = getTrainingXpCeilingBonus(currentLevel + 1) + afterBreakthroughs * 12;
    return `+${afterFloor - beforeFloor} XP floor, +${afterCeiling - beforeCeiling} XP ceiling`;
  }

  if (upgradeId === "nutrition") {
    const delta = getTrainingFatigueRelief(currentLevel + 1) - getTrainingFatigueRelief(currentLevel);
    return delta > 0 ? `+${delta} training fatigue relief` : "Progress toward +1 training fatigue relief";
  }

  if (upgradeId === "recovery") {
    const before = getMatchActionRecoveryRelief(currentLevel) + getRecoveryBreakthroughRelief(beforeBreakthroughs);
    const after = getMatchActionRecoveryRelief(currentLevel + 1) + getRecoveryBreakthroughRelief(afterBreakthroughs);
    return after > before ? `+${after - before} match fatigue relief` : "Progress toward +1 match fatigue relief";
  }

  if (upgradeId === "boots") {
    const before = getBootsActionBoost(currentLevel);
    const after = getBootsActionBoost(currentLevel + 1);
    return after > before ? `+${after - before} action attribute boost` : "Progress toward +1 action attribute boost";
  }

  if (upgradeId === "analyst") {
    const selectionDelta = 2 + breakthroughDelta * 2;
    return `+${selectionDelta} selection score support`;
  }

  if (upgradeId === "agent") {
    const wageDelta = 4 + breakthroughDelta * 3.5;
    const signingDelta = 8 + breakthroughDelta * 6;
    return `+${formatPercentDelta(wageDelta)} wage, +${formatPercentDelta(signingDelta)} signing bonus`;
  }

  if (upgradeId === "lifestyle") {
    const before = getLifestylePressureRelief(currentLevel, beforeBreakthroughs);
    const after = getLifestylePressureRelief(currentLevel + 1, afterBreakthroughs);
    return after > before ? `-${after - before} weekly pressure` : "Progress toward -1 weekly pressure";
  }

  return "Small support improvement";
}

function getSupportTrackCurrentBonusLines(state: GameState, track: SupportTrackDefinition) {
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const breakthroughs = getSupportTrackBreakthroughCount(state, track.id);

  if (track.id === "training") {
    const coachLevel = getSupportLevel(state, "coach") * environment.supportEfficiency;
    const floor = getTrainingXpFloorBonus(coachLevel) + breakthroughs * 8;
    const ceiling = getTrainingXpCeilingBonus(coachLevel) + breakthroughs * 12;
    const specialist = getSpecialistBaseXpBonus(state, environment);
    return [`${getTrainingFocusCapacity(state)} focus slot${getTrainingFocusCapacity(state) > 1 ? "s" : ""}`, `+${floor} XP floor`, `+${ceiling} XP ceiling`, `+${specialist} specialist XP`];
  }

  if (track.id === "recovery") {
    const recoveryLevel = getSupportLevel(state, "recovery") * environment.supportEfficiency;
    const nutritionLevel = getSupportLevel(state, "nutrition") * environment.supportEfficiency;
    return [
      `+${getWeeklySupportRecoveryBonus(recoveryLevel, nutritionLevel)} weekly recovery`,
      `+${getTrainingFatigueRelief(nutritionLevel)} training relief`,
      `+${getMatchActionRecoveryRelief(recoveryLevel) + getRecoveryBreakthroughRelief(breakthroughs)} match relief`,
    ];
  }

  if (track.id === "performance") {
    const analystSupport = getSupportLevel(state, "analyst") * 2 + breakthroughs * 2;
    return [`+${getBootsActionBoost(getSupportLevel(state, "boots"))} action attributes`, `+${analystSupport} selection score`];
  }

  if (track.id === "career") {
    const agentLevel = getSupportLevel(state, "agent");
    return [`+${formatPercentDelta(agentLevel * 4 + breakthroughs * 3.5)} wage`, `+${formatPercentDelta(agentLevel * 8 + breakthroughs * 6)} signing bonus`];
  }

  if (track.id === "lifestyle") {
    return [`-${getLifestylePressureRelief(getSupportLevel(state, "lifestyle"), breakthroughs)} weekly pressure`, "Sponsor-ready later"];
  }

  return ["No active bonus yet"];
}

function formatPercentDelta(value: number) {
  return `${Number(value.toFixed(1))}%`;
}

function getSupportUpgradeTotal(state: GameState) {
  return Object.values(state.supportUpgrades).reduce((sum, level) => sum + level, 0);
}

function getSupportLevel(state: GameState, upgradeId: SupportUpgradeId) {
  return state.supportUpgrades[upgradeId] ?? 0;
}

function getTrainingXpFloorBonus(level: number) {
  return Math.round(level * 10);
}

function getTrainingXpCeilingBonus(level: number) {
  return Math.round(level * 9);
}

function getTrainingFatigueRelief(level: number) {
  return Math.min(10, Math.round(level * 0.78));
}

function getRecoverySessionBonus(recoveryLevel: number, nutritionLevel: number) {
  return Math.min(26, Math.round(recoveryLevel * 2.2 + nutritionLevel * 0.9));
}

function getWeeklySupportRecoveryBonus(recoveryLevel: number, nutritionLevel: number) {
  return Math.min(9, Math.round(recoveryLevel * 0.55 + nutritionLevel * 0.75));
}

function getMatchActionRecoveryRelief(level: number) {
  return Math.min(7, Math.round(level * 0.5));
}

function getBootsActionBoost(bootsLevel: number) {
  return Math.min(7, Math.floor(bootsLevel / 2));
}

function getLifestylePressureRelief(lifestyleLevel: number, breakthroughs = 0) {
  return Math.min(6, Math.floor(lifestyleLevel / 3) + breakthroughs);
}

function applyBootsActionBoost(attributeValues: Record<AttributeKey, number>, bootsLevel: number) {
  const boost = getBootsActionBoost(bootsLevel);
  if (boost <= 0) {
    return attributeValues;
  }

  return {
    ...attributeValues,
    ...Object.fromEntries(
      bootsActionAttributes.map((attribute) => [attribute, clamp((attributeValues[attribute] ?? 50) + boost, 1, 100)]),
    ),
  };
}

function applyTrainingWeek(state: GameState): GameState {
  const projection = getTrainingProjection(state);
  const rolledXp = rollTrainingXp(state, projection.ranges, createTrainingSeed(state));
  const combinedXp = mergeAttributeXp(rolledXp, projection.specialistXp);
  const selectionBefore = getSelectionReport(state, getCurrentFixture(state.season)).score;
  const attributeResult = addAttributeXpDetailed(state.attributes, combinedXp);
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
    specialist: state.trainingSpecialist,
    quality: projection.quality,
    qualityLabel: projection.qualityLabel,
    specialistXp: projection.specialistXp,
    ranges: projection.ranges,
    xp: combinedXp,
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
  if (!topXp) {
    return `Recovery session complete: fitness ${formatSigned(summary.fitnessDelta)}.`;
  }

  const levelText = summary.levelUps.length > 0 ? `${summary.levelUps.length} level-up.` : "No level-up yet.";
  return `Training complete: ${topXp?.[0] ?? "Attributes"} +${topXp?.[1] ?? 0} XP. ${levelText}`;
}

function mergeAttributeXp(...xpSources: Partial<Record<AttributeKey, number>>[]) {
  return xpSources.reduce<Partial<Record<AttributeKey, number>>>((merged, source) => {
    Object.entries(source).forEach(([key, value]) => {
      const attribute = key as AttributeKey;
      merged[attribute] = (merged[attribute] ?? 0) + (value ?? 0);
    });
    return merged;
  }, {});
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
    if (gain <= 0 || attribute.value >= 100) {
      return attribute;
    }

    let nextValue = attribute.value;
    let remainingXp = attribute.xp + gain;

    while (nextValue < 100) {
      const xpRequirement = getAttributeXpRequirement({ ...attribute, value: nextValue });
      if (remainingXp < xpRequirement) {
        break;
      }

      remainingXp -= xpRequirement;
      nextValue += 1;
    }

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
      xp: nextValue >= 100 ? 0 : remainingXp,
    };
  });

  return { attributes: nextAttributes, levelUps };
}

function finishMatchState(state: GameState, results: MatchResult[]): GameState {
  const match = state.activeMatch;
  const simTotals = match ? summarizeSimEvents(match.events, match.events.length - 1) : undefined;
  const rawTotals = summarizeMatchResults(results, simTotals);
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const weeklyRecoveryBonus =
    environment.recoveryBonus +
    getRecoveryBreakthroughRelief(getSupportTrackBreakthroughCount(state, "recovery")) +
    getWeeklySupportRecoveryBonus(
      getSupportLevel(state, "recovery") * environment.supportEfficiency,
      getSupportLevel(state, "nutrition") * environment.supportEfficiency,
    );
  const totals = match
    ? { ...rawTotals, fitnessDelta: getMatchFitnessDelta(match, results) + weeklyRecoveryBonus }
    : { ...rawTotals, fitnessDelta: rawTotals.fitnessDelta + weeklyRecoveryBonus };
  const trustAfter = clamp(state.trust + totals.trustDelta, 0, 100);
  const playerAppeared = didPlayerAppear(match);
  const moraleDelta = playerAppeared ? (totals.rating >= 7 ? 3 : -2) : 0;
  const contractEarnings = getMatchContractEarnings(state.contract, totals, playerAppeared);
  const cashDelta = contractEarnings.total;
  const prestigeDelta = Math.max(0, Math.round((totals.rating - 6) * 2));
  const pressureDelta = totals.goals * 2 - getLifestylePressureRelief(getSupportLevel(state, "lifestyle"), getSupportTrackBreakthroughCount(state, "lifestyle"));
  const selectionBefore = getSelectionReport(state, getCurrentFixture(state.season));
  const postMatchState = {
    ...state,
    trust: trustAfter,
    fitness: clamp(state.fitness + totals.fitnessDelta, 0, 100),
    morale: clamp(state.morale + moraleDelta, 0, 100),
    seasonStats: {
      ...state.seasonStats,
      ratings: playerAppeared ? [...state.seasonStats.ratings.slice(-4), totals.rating] : state.seasonStats.ratings,
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
        weeklyWage: contractEarnings.weeklyWage,
        appearanceBonus: contractEarnings.appearanceBonus,
        goalBonus: contractEarnings.goalBonus,
        assistBonus: contractEarnings.assistBonus,
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
  const updatedSeasonStats = {
    apps: state.seasonStats.apps + (playerAppeared ? 1 : 0),
    starts: state.seasonStats.starts + (playerAppeared && match && isStartingRole(match.playerRole) ? 1 : 0),
    goals: state.seasonStats.goals + totals.goals,
    assists: state.seasonStats.assists + totals.assists,
    ratings: postMatchState.seasonStats.ratings,
  };
  const nextContract = advanceContractWeek(state.contract);
  const updatedSeason = fixtureResult
    ? advanceSeasonFixture(state.season, fixtureResult)
    : state.season;
  const stateForOffer: GameState = {
    ...state,
    week: state.week + 1,
    fitness: clamp(state.fitness + totals.fitnessDelta, 0, 100),
    trust: trustAfter,
    morale: clamp(state.morale + moraleDelta, 0, 100),
    pressure: clamp(state.pressure + pressureDelta, 0, 100),
    cash: state.cash + cashDelta,
    prestige: state.prestige + prestigeDelta,
    contract: nextContract,
    attributes: addAttributeXp(state.attributes, totals.xp),
    seasonStats: updatedSeasonStats,
    season: updatedSeason,
  };
  const contractOffer = isSeasonComplete(updatedSeason)
    ? state.contractOffer
    : state.contractOffer ?? getClubContractOffer(stateForOffer, lastMatch);

  return {
    ...stateForOffer,
    contractOffer,
    lastEvent: getMatchSummaryText(results, totals),
    lastMatch,
    activeMatch: undefined,
  };
}

function didPlayerAppear(match?: MatchState) {
  if (!match || match.isInSquad === false || match.fitnessAvailability === "Out") {
    return false;
  }

  return match.entryMinute <= 90 && (!match.exitMinute || match.exitMinute > match.entryMinute);
}

function getPlayerMinutesPlayed(match?: MatchState) {
  if (!didPlayerAppear(match) || !match) {
    return 0;
  }

  const startMinute = clamp(match.entryMinute, 0, 90);
  const endMinute = clamp(match.exitMinute ?? 90, startMinute, 90);
  return Math.max(0, endMinute - startMinute);
}

function getMatchFitnessDelta(match: MatchState, results: MatchResult[]) {
  const minutes = getPlayerMinutesPlayed(match);
  if (minutes <= 0) {
    return 0;
  }

  const minuteLoad = -Math.max(1, Math.round(minutes / 18));
  const actionLoad = results.reduce((sum, result) => sum + Math.min(0, result.fitnessDelta), 0);
  const scaledActionLoad = Math.round(actionLoad * Math.min(1, minutes / 60) * 0.35);

  return clamp(minuteLoad + scaledActionLoad, -12, 0);
}

function startNextSeasonState(state: GameState): GameState {
  const review = getSeasonReview(state);
  const contractOffer = getSeasonContractOffer(state, review);
  const dynastySeason = createDynastySeasonSnapshot(state, review);
  const nextWeek = state.week + 1;
  const nextSeason = state.season.season + 1;

  return {
    ...state,
    week: nextWeek,
    cash: state.cash + review.cashReward + contractOffer.signingBonus,
    prestige: state.prestige + review.prestigeReward,
    contract: contractFromOffer(contractOffer),
    trainingCompletedWeek: nextWeek - 1,
    seasonStats: {
      apps: 0,
      starts: 0,
      goals: 0,
      assists: 0,
      ratings: [],
    },
    season: {
      season: nextSeason,
      fixtureIndex: 0,
      fixtures: createSeasonFixtures(state.club),
      results: [],
    },
    dynastyHistory: [...state.dynastyHistory, dynastySeason],
    lastTraining: undefined,
    contractOffer: undefined,
    activeMatch: undefined,
    lastEvent: `Season ${nextSeason} begins. ${contractOffer.title}: $${contractOffer.weeklyWage}/wk.`,
  };
}

function createDynastySeasonSnapshot(state: GameState, review = getSeasonReview(state)): DynastySeason {
  return {
    season: state.season.season,
    club: state.contract.club,
    leaguePosition: review.tablePosition,
    record: `${review.record.wins}-${review.record.draws}-${review.record.losses}`,
    apps: state.seasonStats.apps,
    starts: state.seasonStats.starts,
    goals: state.seasonStats.goals,
    assists: state.seasonStats.assists,
    averageRating: Number(review.averageRating.toFixed(1)),
  };
}

function getMatchContractEarnings(contract: Contract, totals: Pick<MatchTotals, "goals" | "assists">, madeSquad: boolean) {
  const appearanceBonus = madeSquad ? contract.appearanceBonus : 0;
  const goalBonus = totals.goals * contract.goalBonus;
  const assistBonus = totals.assists * contract.assistBonus;
  const weeklyWage = contract.weeklyWage;

  return {
    weeklyWage,
    appearanceBonus,
    goalBonus,
    assistBonus,
    total: weeklyWage + appearanceBonus + goalBonus + assistBonus,
  };
}

function advanceContractWeek(contract: Contract): Contract {
  return {
    ...contract,
    weeksRemaining: Math.max(0, contract.weeksRemaining - 1),
  };
}

function contractFromOffer(offer: ContractOffer): Contract {
  return {
    club: offer.club,
    tierId: offer.tierId,
    label: offer.label,
    weeklyWage: offer.weeklyWage,
    weeksRemaining: offer.weeks,
    rolePromise: offer.rolePromise,
    appearanceBonus: offer.appearanceBonus,
    goalBonus: offer.goalBonus,
    assistBonus: offer.assistBonus,
    pressureModifier: offer.pressureModifier,
  };
}

function acceptContractOfferState(state: GameState): GameState {
  const offer = state.contractOffer;
  if (!offer) {
    return state;
  }
  const nextClub = offer.source === "external-club" ? createClubStateFromOffer(offer, state.club) : state.club;

  return {
    ...state,
    cash: state.cash + offer.signingBonus,
    club: nextClub,
    season: offer.source === "external-club" ? rebuildSeasonForClub(state.season, nextClub) : state.season,
    contract: contractFromOffer(offer),
    contractOffer: undefined,
    lastEvent: `${offer.title} accepted. ${offer.club} now pays $${offer.weeklyWage}/wk.`,
  };
}

function getClubContractOffer(game: GameState, lastMatch?: LastMatchSummary): ContractOffer | undefined {
  const current = game.contract;
  if (current.weeksRemaining <= 0) {
    return getExpiredContractMarketOffer(game, lastMatch);
  }

  const selection = getSelectionReport(game, getCurrentFixture(game.season));
  const averageRating = getAverageRating(game.seasonStats.ratings);
  const ovr = calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights);
  const agentLevel = getSupportLevel(game, "agent");
  const careerBreakthroughs = getSupportTrackBreakthroughCount(game, "career");
  const rolePromise = getPromisedRole(selection.score, current.rolePromise);
  const expiringSoon = current.weeksRemaining <= 1;
  const performanceSpike = Boolean(
    lastMatch &&
      lastMatch.rating >= 7.4 &&
      (lastMatch.goals > 0 || lastMatch.assists > 0 || lastMatch.selectionAfter >= lastMatch.selectionBefore + 6),
  );
  const roleBase: Record<MatchRole, number> = {
    Bench: 45,
    "Impact Sub": 75,
    "Rotation Starter": 130,
    Starter: 220,
  };
  const formBonus = Math.max(0, averageRating - 6.2) * 55;
  const outputBonus = game.seasonStats.goals * 8 + game.seasonStats.assists * 6;
  const selectionWage = 40 + selection.score * 0.9 + ovr * 0.85 + formBonus + outputBonus;
  const rawWage = Math.max(current.weeklyWage + (expiringSoon ? 20 : 0), roleBase[rolePromise], selectionWage);
  const weeklyWage = roundToNearest(rawWage * (1 + agentLevel * 0.04 + careerBreakthroughs * 0.035), 5);
  const meaningfulUpgrade = weeklyWage >= current.weeklyWage + 15 || rolePromise !== current.rolePromise;

  if (!expiringSoon && (!performanceSpike || !meaningfulUpgrade)) {
    return undefined;
  }

  const pressureModifier = rolePromise === "Starter" ? 8 : rolePromise === "Rotation Starter" ? 5 : rolePromise === "Impact Sub" ? 2 : 0;
  const title = current.weeksRemaining <= 0 ? "New club terms" : meaningfulUpgrade ? "Improved club offer" : "Extension offer";
  const weeks = rolePromise === "Starter" ? 12 : rolePromise === "Rotation Starter" ? 10 : 8;
  const contractTier = getContractLeagueTier(current);

  return {
    club: current.club,
    label: rolePromise === "Starter" ? "First team deal" : rolePromise === "Rotation Starter" ? "Rotation deal" : "Development deal",
    title,
    weeklyWage,
    weeks,
    rolePromise,
    appearanceBonus: roundToNearest(10 + weeklyWage * 0.14, 5),
    goalBonus: roundToNearest(18 + weeklyWage * 0.26, 5),
    assistBonus: roundToNearest(14 + weeklyWage * 0.2, 5),
    signingBonus: roundToNearest(weeklyWage * (expiringSoon ? 1.1 : 0.7) * (1 + agentLevel * 0.08 + careerBreakthroughs * 0.06), 10),
    pressureModifier,
    summary: getContractOfferSummary(rolePromise, weeklyWage, current.weeklyWage),
    source: "current-club",
    tierId: contractTier.id,
  };
}

function getExpiredContractMarketOffer(game: GameState, lastMatch?: LastMatchSummary): ContractOffer | undefined {
  const currentTier = getContractLeagueTier(game.contract);
  const currentTierIndex = getLeagueTierIndex(currentTier.id);
  const selection = getSelectionReport(game, getCurrentFixture(game.season));
  const averageRating = getAverageRating(game.seasonStats.ratings);
  const ovr = calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights);
  const agentLevel = getSupportLevel(game, "agent");
  const careerBreakthroughs = getSupportTrackBreakthroughCount(game, "career");
  const formSignal = Math.max(0, averageRating - 6.4) * 8 + game.seasonStats.goals * 1.6 + game.seasonStats.assists * 1.2 + (lastMatch?.rating ?? 6.5) - 6.5;
  const maxReachableTierIndex = clamp(
    currentTierIndex + (ovr >= currentTier.averageOvr + 8 || formSignal >= 12 ? 1 : 0),
    0,
    Object.keys(leagueTiers).length - 1,
  );
  const seed = `${game.week}-${game.season.season}-${game.contract.club}-${selection.score}-${game.prestige}-expired-market`;
  const candidates = contractMarketClubs
    .filter((club) => club.club !== game.contract.club)
    .filter((club) => getLeagueTierIndex(club.tierId) <= maxReachableTierIndex)
    .map((club) => {
      const tierIndex = getLeagueTierIndex(club.tierId);
      const tierGap = tierIndex - currentTierIndex;
      const lowerTierBias = tierGap < 0 ? 16 : tierGap === 0 ? 9 : -10;
      const interest =
        selection.score * 0.42 +
        ovr * 0.4 +
        game.prestige * 0.24 +
        formSignal +
        club.roleBias +
        lowerTierBias +
        seededNoise(`${seed}-${club.short}`) * 18;
      return { ...club, interest };
    })
    .filter((club) => club.interest >= 28)
    .sort((a, b) => b.interest - a.interest);

  const club = candidates[0] ?? contractMarketClubs.find((candidate) => candidate.tierId === "grassroots-dev" && candidate.club !== game.contract.club);
  if (!club) {
    return undefined;
  }

  const tier = leagueTiers[club.tierId];
  const rolePromise = getPromisedRole(selection.score + club.roleBias + (getLeagueTierIndex(club.tierId) < currentTierIndex ? 8 : 0), "Bench");
  const leverage = 1 + agentLevel * 0.04 + careerBreakthroughs * 0.035;
  const roleWage: Record<MatchRole, number> = {
    Bench: tier.wageRange[0],
    "Impact Sub": tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * 0.28,
    "Rotation Starter": tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * 0.52,
    Starter: tier.wageRange[0] + (tier.wageRange[1] - tier.wageRange[0]) * 0.78,
  };
  const rawWage = roleWage[rolePromise] + Math.max(0, ovr - tier.averageOvr) * 5 + formSignal * 3;
  const weeklyWage = roundToNearest(clamp(rawWage * club.wageFactor * leverage, tier.wageRange[0], tier.wageRange[1]), 5);
  const pressureModifier = rolePromise === "Starter" ? 7 : rolePromise === "Rotation Starter" ? 4 : rolePromise === "Impact Sub" ? 1 : -1;

  return {
    club: club.club,
    label: rolePromise === "Starter" ? "First team deal" : rolePromise === "Rotation Starter" ? "Rotation deal" : "Fresh start deal",
    title: "Free agent offer",
    weeklyWage,
    weeks: rolePromise === "Starter" ? 12 : 8,
    rolePromise,
    appearanceBonus: roundToNearest(8 + weeklyWage * 0.12, 5),
    goalBonus: roundToNearest(14 + weeklyWage * 0.24, 5),
    assistBonus: roundToNearest(10 + weeklyWage * 0.18, 5),
    signingBonus: roundToNearest(weeklyWage * 0.45 * (1 + agentLevel * 0.08 + careerBreakthroughs * 0.06), 10),
    pressureModifier,
    summary: getExternalContractOfferSummary(club.club, tier, currentTier, rolePromise, weeklyWage, game.contract.weeklyWage),
    source: "external-club",
    tierId: club.tierId,
  };
}

function getLeagueTierIndex(tierId: LeagueTierId) {
  return Object.keys(leagueTiers).indexOf(tierId);
}

function getContractLeagueTier(contract: Pick<Contract, "tierId">) {
  return contract.tierId ? leagueTiers[contract.tierId] : currentLeagueTier;
}

function getClubLeagueTier(club: Pick<ClubState, "tierId">) {
  return leagueTiers[club.tierId] ?? currentLeagueTier;
}

function getExternalContractOfferSummary(club: string, tier: LeagueTier, currentTier: LeagueTier, rolePromise: MatchRole, weeklyWage: number, currentWage: number) {
  const wageText =
    weeklyWage > currentWage
      ? `The wage improves to $${weeklyWage}/wk`
      : weeklyWage === currentWage
        ? `The wage matches your old $${currentWage}/wk`
        : `The wage drops to $${weeklyWage}/wk`;
  const tierText = tier.id === currentTier.id ? "at your current level" : `in ${tier.name}`;
  return `${club} offers a ${rolePromise} path ${tierText}. ${wageText}, but this is a fresh start after letting the deal run down.`;
}

function getSeasonContractOffer(game: GameState, review = getSeasonReview(game)): ContractOffer {
  const current = game.contract;
  const agentLevel = getSupportLevel(game, "agent");
  const careerBreakthroughs = getSupportTrackBreakthroughCount(game, "career");
  const rolePromise = getPromisedRole(review.selection.score, current.rolePromise);
  const performanceWage = 90 + review.selection.score * 3 + Math.max(0, review.averageRating - 6.2) * 90 + game.seasonStats.goals * 14 + game.seasonStats.assists * 9;
  const weeklyWage = roundToNearest(Math.max(current.weeklyWage, performanceWage) * (1 + agentLevel * 0.04 + careerBreakthroughs * 0.035), 10);
  const pressureModifier = rolePromise === "Starter" ? 8 : rolePromise === "Rotation Starter" ? 5 : rolePromise === "Impact Sub" ? 2 : 0;
  const title = weeklyWage > current.weeklyWage || rolePromise !== current.rolePromise ? "Improved terms" : "Contract extended";

  return {
    club: current.club,
    label: rolePromise === "Starter" ? "First team deal" : rolePromise === "Rotation Starter" ? "Rotation deal" : "Development deal",
    title,
    weeklyWage,
    weeks: 12,
    rolePromise,
    appearanceBonus: roundToNearest(18 + weeklyWage * 0.16, 5),
    goalBonus: roundToNearest(30 + weeklyWage * 0.28, 5),
    assistBonus: roundToNearest(22 + weeklyWage * 0.22, 5),
    signingBonus: roundToNearest(
      weeklyWage * (review.verdict.grade === "A" ? 2.2 : review.verdict.grade === "B" ? 1.5 : 0.8) * (1 + agentLevel * 0.08 + careerBreakthroughs * 0.06),
      10,
    ),
    pressureModifier,
    summary: getContractOfferSummary(rolePromise, weeklyWage, current.weeklyWage),
    source: "current-club",
    tierId: getContractLeagueTier(current).id,
  };
}

function getContractStatusLabel(game: GameState) {
  if (game.contractOffer) {
    return "Offer ready";
  }
  if (game.contract.weeksRemaining <= 0) {
    return "Expired";
  }
  if (game.contract.weeksRemaining <= 1) {
    return "Expiring";
  }
  if (game.contract.weeksRemaining <= 3) {
    return "Review soon";
  }
  return "Secure";
}

function getPromisedRole(selectionScore: number, currentRole: MatchRole): MatchRole {
  const earnedRole = getPlayerMatchRole(selectionScore);
  return getRoleThreshold(earnedRole) >= getRoleThreshold(currentRole) ? earnedRole : currentRole;
}

function getContractOfferSummary(rolePromise: MatchRole, weeklyWage: number, currentWage: number) {
  if (weeklyWage > currentWage && rolePromise === "Starter") {
    return "The club is ready to treat you as a first-team player, with pressure to match.";
  }
  if (weeklyWage > currentWage) {
    return "Your season earned a better weekly wage and stronger match bonuses.";
  }
  return "The club keeps you on the pathway, but wants another season before a bigger promise.";
}

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
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

function isSeasonComplete(season: SeasonState) {
  return season.fixtures.length > 0 && season.results.length >= season.fixtures.length;
}

function buildLastMatchSummary({
  match,
  results,
  totals,
  cashDelta,
  weeklyWage,
  appearanceBonus,
  goalBonus,
  assistBonus,
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
  weeklyWage: number;
  appearanceBonus: number;
  goalBonus: number;
  assistBonus: number;
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
    clubName: match.teamName,
    clubShortName: match.teamShortName,
    opponent: match.opponent,
    venue: match.venue,
    competition: match.competition,
    playerRole: match.playerRole,
    expectedMinutes: match.expectedMinutes,
    autoSimulated: results.filter((result) => result.source === "auto").length,
    manualHighlights: results.filter((result) => result.source !== "auto").length,
    cashDelta,
    weeklyWage,
    appearanceBonus,
    goalBonus,
    assistBonus,
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
    chancesCreated: 0,
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
        chancesCreated: summary.chancesCreated + result.chancesCreated,
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
    teamGoals: totals.teamGoals + getPlayerTeamGoalContributions(totals),
    rating: Number(clamp(totals.rating / results.length, 5.4, 9.6).toFixed(1)),
  };
}

function getPlayerTeamGoalContributions(totals: Pick<MatchTotals, "goals" | "assists">) {
  return totals.goals + totals.assists;
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

function getResultPopupTone(result: MatchResult) {
  if (result.goals > 0 || result.assists > 0) {
    return "is-goal-involvement";
  }
  if (result.chancesCreated > 0) {
    return "is-success";
  }
  if (result.outcomeTier === "Poor") {
    return "is-failure";
  }
  if (result.outcomeTier === "Okay") {
    return "is-okay";
  }
  return "is-success";
}

function getResultPopupLabel(result: MatchResult) {
  if (result.goals > 0) {
    return "Goal";
  }
  if (result.assists > 0) {
    return "Goal involvement";
  }
  if (result.chancesCreated > 0) {
    return "Chance created";
  }
  return "Result";
}

function getResultVerdictText(result: MatchResult) {
  if (result.goals > 0) {
    return "GOAL";
  }
  if (result.assists > 0) {
    return "ASSIST";
  }
  if (result.chancesCreated > 0) {
    return "CHANCE CREATED";
  }
  return result.outcomeTier;
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
  const appliedPlayerGoals = results
    .slice(0, playerGoalsBeforeOrAtEvent)
    .reduce((sum, result) => sum + result.goals + result.assists, 0);

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
          ? ` Goal for ${match.teamShortName}.`
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

function formatFixtureTitle(venue: Venue, opponent: string, clubShortName = currentClubShortName) {
  return venue === "Home" ? `${clubShortName} - ${opponent}` : `${opponent} - ${clubShortName}`;
}

function getAppearanceText(match: MatchState) {
  if (match.isInSquad === false || match.fitnessAvailability === "Out" || match.entryMinute > 90) {
    return "Not selected";
  }
  if (match.entryMinute === 0 && !match.exitMinute) {
    return "Full match";
  }
  if (match.entryMinute === 0 && match.exitMinute) {
    return "Managed start";
  }
  if (match.exitMinute) {
    return match.isComplete ? `${match.entryMinute}'-${match.exitMinute}'` : "Bench shift";
  }
  return match.isComplete ? `On ${match.entryMinute}'` : match.expectedMinutes;
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
      label: match.isInSquad === false ? "Not selected" : "On the bench",
      detail:
        match.isInSquad === false
          ? "Recovery comes first today."
          : `Plan: ${match.expectedMinutes.toLowerCase()}. Match state can change it.`,
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
  const club = state.club;
  const opponentProfile = buildOpponentProfile({
    opponentStrength: fixture.opponentStrength,
    opponentForm: fixture.opponentForm,
    serviceLevel: fixture.serviceLevel,
    seed: fixture.id,
  });
  const teamStrength = club.strength + Math.round((getFormScore(state.seasonStats.ratings) - 50) / 18);
  const matchImportance = fixture.competition.includes("Cup")
    ? "High"
    : Math.abs(teamStrength - fixture.opponentStrength) <= 3
      ? "Normal"
      : "Low";
  const selection = getSelectionReport(state, fixture, matchImportance);
  const fitnessAvailability = getFitnessAvailability(state.fitness);
  const isInSquad = isAvailableForSquad(state.fitness, `squad-${state.week}-${fixture.id}-${state.fitness}`);

  return {
    ...fixture,
    kickoff: `Match ${state.season.fixtureIndex + 1}/${state.season.fixtures.length}`,
    teamStrength,
    opponentProfile,
    matchImportance,
    positionGroup: state.positionGroup,
    playerRole: isInSquad ? selection.role : "Bench",
    selection,
    expectedMinutes: getExpectedMinutes(isInSquad ? selection.role : "Bench", fitnessAvailability, isInSquad),
    fitnessAvailability,
    isInSquad,
    tacticalFocus: getTacticalFocus(state, fixture.serviceLevel, positionModule),
    managerInstruction: isInSquad
      ? getManagerInstruction(selection.role, fixture.serviceLevel, positionModule)
      : "Recovery first. The staff are unlikely to risk you unless the situation changes.",
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

function getLeagueTable(game: GameState): LeagueTableRow[] {
  const season = game.season;
  const clubRecord = getSeasonRecord(season.results);
  const clubGoals = getSeasonGoals(season.results);
  const played = season.results.length;
  const tier = getClubLeagueTier(game.club);
  const table = createLeagueTeams(game.club).map((team) => {
    if (team.short === game.club.shortCode) {
      return {
        name: team.name,
        short: team.short,
        position: 0,
        played,
        wins: clubRecord.wins,
        draws: clubRecord.draws,
        losses: clubRecord.losses,
        goalDifference: clubGoals.for - clubGoals.against,
        points: clubRecord.points,
      };
    }

    const teamPlayed = played;
    const strengthGap = team.strength - tier.averageOvr;
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

function getSeasonReview(game: GameState) {
  const record = getSeasonRecord(game.season.results);
  const goals = getSeasonGoals(game.season.results);
  const table = getLeagueTable(game);
  const clubRow = table.find((row) => row.short === game.club.shortCode);
  const averageRating = getAverageRating(game.seasonStats.ratings);
  const selection = getSelectionReport(game, getCurrentFixture(game.season));
  const goalDifference = goals.for - goals.against;
  const outputBonus = game.seasonStats.goals * 45 + game.seasonStats.assists * 30;
  const ratingBonus = Math.max(0, Math.round((averageRating - 6.3) * 120));
  const tableBonus = Math.max(0, 9 - (clubRow?.position ?? 8)) * 15;
  const cashReward = 180 + game.seasonStats.apps * 25 + outputBonus + ratingBonus + tableBonus;
  const prestigeReward = Math.max(
    1,
    Math.round(
      game.seasonStats.goals * 0.8 +
        game.seasonStats.assists * 0.6 +
        Math.max(0, averageRating - 6.2) * 4 +
        Math.max(0, goalDifference) * 0.15 +
        Math.max(0, 8 - (clubRow?.position ?? 8)) * 0.7,
    ),
  );
  const verdict = getSeasonVerdict(game, clubRow?.position ?? table.length, averageRating);

  return {
    record,
    goals,
    tablePosition: clubRow?.position ?? table.length,
    averageRating,
    selection,
    cashReward,
    prestigeReward,
    verdict,
    marketInterest: getMarketInterest(selection.score, averageRating, game.prestige + prestigeReward),
    contractOutlook: getContractOutlook(selection.score, averageRating, game.seasonStats.apps),
  };
}

function getSeasonVerdict(game: GameState, tablePosition: number, averageRating: number) {
  const goalInvolvements = game.seasonStats.goals + game.seasonStats.assists;

  if (averageRating >= 7.1 || goalInvolvements >= 8 || tablePosition <= 2) {
    return {
      grade: "A",
      title: "Breakout campaign",
      copy: "The staff see real momentum. You are starting to look like a player who can force a bigger role next season.",
    };
  }

  if (averageRating >= 6.7 || goalInvolvements >= 4 || game.trust >= 52) {
    return {
      grade: "B",
      title: "Clear progress",
      copy: "A solid year with enough good moments to keep the pathway open. More consistency will decide the next jump.",
    };
  }

  if (averageRating >= 6.2 || game.seasonStats.apps >= 6) {
    return {
      grade: "C",
      title: "Useful minutes",
      copy: "You stayed involved and learned the level. The next season needs sharper output to change your status.",
    };
  }

  return {
    grade: "D",
    title: "Development year",
    copy: "The club still sees potential, but you need stronger training weeks and cleaner match moments to climb.",
  };
}

function getMarketInterest(selectionScore: number, averageRating: number, prestige: number) {
  if (selectionScore >= 70 || averageRating >= 7.2 || prestige >= 35) {
    return "Regional clubs";
  }
  if (selectionScore >= 55 || averageRating >= 6.8 || prestige >= 20) {
    return "Local attention";
  }
  return "Club pathway";
}

function getContractOutlook(selectionScore: number, averageRating: number, apps: number) {
  if (selectionScore >= 68 || averageRating >= 7.1) {
    return "Your agent expects a stronger squad promise if this form carries into pre-season.";
  }
  if (selectionScore >= 50 || apps >= 8) {
    return "The club wants another season of steady minutes before making a bigger commitment.";
  }
  return "The staff still view you as a project, so training output matters immediately next season.";
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
  const availability = getFitnessAvailability(state.fitness);
  const leagueTier = getClubLeagueTier(state.club);
  const trustImpact = Math.round(state.trust * 0.45);
  const fitnessImpact = getFitnessSelectionImpact(state.fitness);
  const formImpact = Math.round((form - 50) * 0.18);
  const ratingImpact = Math.round((lastRating - 6.4) * 6);
  const importanceImpact = importance === "High" ? -3 : importance === "Low" ? 1 : 0;
  const playerOvr = calculateOvr(state.attributes, getPositionModule(state.positionGroup).ovrWeights);
  const abilityImpact = clamp(Math.round((playerOvr - leagueTier.averageOvr) * 0.8), -8, 10);
  const fixtureGap = fixture.opponentStrength - state.club.strength;
  const fixtureImpact = fixtureGap >= 6 ? -2 : fixtureGap <= -4 ? 1 : 0;
  const promiseImpact = Math.round(getRoleThreshold(state.contract.rolePromise) * 0.12);
  const analystImpact = getSupportLevel(state, "analyst") * 2 + getSupportTrackBreakthroughCount(state, "performance") * 2;
  const pressureImpact = -Math.round(state.pressure * 0.08);
  const score = clamp(
    22 + trustImpact + fitnessImpact + formImpact + ratingImpact + importanceImpact + fixtureImpact + promiseImpact + analystImpact + abilityImpact + pressureImpact,
    0,
    100,
  );
  const role = availability === "Out" ? "Bench" : getPlayerMatchRole(score);
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
        value: availability,
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
        tone: importance === "High" || fixtureGap >= 6 ? "warn" : "neutral",
      },
      {
        label: "Level fit",
        value: `${playerOvr}/${leagueTier.averageOvr}`,
        impact: abilityImpact,
        tone: abilityImpact >= 2 ? "good" : abilityImpact < -2 ? "warn" : "neutral",
      },
      {
        label: "Contract",
        value: state.contract.rolePromise,
        impact: promiseImpact,
        tone: promiseImpact >= 7 ? "good" : "neutral",
      },
      {
        label: "Analyst",
        value: `Lv ${getSupportLevel(state, "analyst")}`,
        impact: analystImpact,
        tone: analystImpact > 0 ? "good" : "neutral",
      },
      {
        label: "Pressure",
        value: getPressureLabel(state.pressure),
        impact: pressureImpact,
        tone: pressureImpact < -4 ? "warn" : "neutral",
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

function getFitnessAvailability(fitness: number): FitnessAvailability {
  if (fitness < 12) {
    return "Out";
  }
  if (fitness < 25) {
    return "Critical";
  }
  if (fitness < 45) {
    return "Heavy";
  }
  if (fitness < 62) {
    return "Tired";
  }
  if (fitness < 78) {
    return "Playable";
  }
  return "Ready";
}

function getFitnessSelectionImpact(fitness: number) {
  if (fitness < 12) {
    return -45;
  }
  if (fitness < 25) {
    return -30;
  }
  if (fitness < 45) {
    return -18;
  }
  if (fitness < 62) {
    return -9;
  }
  if (fitness < 78) {
    return -2;
  }
  return Math.round((fitness - 78) * 0.12);
}

function isAvailableForSquad(fitness: number, matchSeed: string) {
  if (fitness < 8) {
    return false;
  }
  if (fitness < 18) {
    return seededNoise(`${matchSeed}-fitness-selection`) > 0.7;
  }
  if (fitness < 28) {
    return seededNoise(`${matchSeed}-fitness-selection`) > 0.28;
  }
  return true;
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

function getExpectedMinutes(role: UpcomingMatch["playerRole"], availability: FitnessAvailability = "Ready", isInSquad = true) {
  if (!isInSquad || availability === "Out") {
    return "Not selected";
  }
  if (availability === "Critical") {
    return "Emergency only";
  }
  const minutes: Record<UpcomingMatch["playerRole"], string> = {
    Bench: "Bench cover",
    "Impact Sub": "Second half",
    "Rotation Starter": availability === "Heavy" ? "Limited start" : "Around an hour",
    Starter: availability === "Heavy" || availability === "Tired" ? "Managed start" : "Full match",
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

function getPlayerMomentCount(role: UpcomingMatch["playerRole"], involvementScore: number, minutes: number, matchSeed: string) {
  if (role === "Bench" || minutes <= 0) {
    return 0;
  }

  const roleRatesPer90: Record<UpcomingMatch["playerRole"], number> = {
    Bench: 0,
    "Impact Sub": 3.0,
    "Rotation Starter": 3.6,
    Starter: 4.0,
  };
  const involvementModifier = clamp((involvementScore - 50) / 38, -0.55, 0.8);
  const expectedMoments = Math.max(0, (minutes / 90) * roleRatesPer90[role] * (1 + involvementModifier));
  const baseMoments = Math.floor(expectedMoments);
  const extraMoment = seededNoise(`${matchSeed}-${role}-${minutes}-moment-volume`) < expectedMoments - baseMoments ? 1 : 0;
  const lateSubCeiling = minutes < 18 ? 1 : minutes < 32 ? 2 : 3;
  const roleCeiling = role === "Starter" ? 5 : role === "Rotation Starter" ? 4 : lateSubCeiling;

  return clamp(baseMoments + extraMoment, 0, roleCeiling);
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
  if (!context.isInSquad || context.fitnessAvailability === "Out") {
    return { entryMinute: 91 };
  }

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
    if (context.fitnessAvailability === "Critical") {
      return { entryMinute: clamp(window.start + variation + earlyEvent + (teamGoalDiff < 0 ? -4 : 0), 80, 89) };
    }

    return { entryMinute: clamp(window.start + variation + earlyEvent + (teamGoalDiff < 0 ? -6 : 0), 60, 89) };
  }

  if (role === "Impact Sub") {
    const fitnessDelay =
      context.fitnessAvailability === "Critical" ? 12 : context.fitnessAvailability === "Heavy" ? 6 : 0;
    return { entryMinute: clamp(66 + variation + earlyEvent + matchStateAdjustment + fitnessDelay, 48, 86) };
  }

  if (role === "Rotation Starter") {
    const fatigueExit =
      context.fitnessAvailability === "Heavy" ? -14 : context.fitnessAvailability === "Tired" ? -8 : 0;
    const exitAdjustment = fatigueExit + (teamGoalDiff >= 2 ? -5 : teamGoalDiff < 0 ? 6 : 0);
    return { entryMinute: 0, exitMinute: clamp(window.end + variation + exitAdjustment, 55, 86) };
  }

  if (role === "Starter" && ["Critical", "Heavy", "Tired"].includes(context.fitnessAvailability)) {
    const exitBase = context.fitnessAvailability === "Critical" ? 58 : context.fitnessAvailability === "Heavy" ? 66 : 76;
    return { entryMinute: 0, exitMinute: clamp(exitBase + variation, 50, 88) };
  }

  return { entryMinute: 0 };
}

function getEventLabel(type: MatchEvent["type"], teamShortName = currentClubShortName) {
  const labels: Record<MatchEvent["type"], string> = {
    player_moment: "Your moment",
    team_goal: teamShortName,
    opponent_goal: "Opponent",
    team_chance: `${teamShortName} chance`,
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
  const leagueTier = getClubLeagueTier(state.club);
  const matchAttributeValues = getLeagueAdjustedAttributeValueMap(state.attributes, leagueTier);
  const matchOpponentProfile = getLeagueAdjustedOpponentProfile(context.opponentProfile, leagueTier);
  const contextualOvr = getContextualAbilityScore(calculateOvr(state.attributes, positionModule.ovrWeights), leagueTier);
  const matchPool = createPositionMatchPool({
    opponentShort: context.opponentShort,
    managerInstruction: context.managerInstruction,
    tacticalFocus: context.tacticalFocus,
    fitness: state.fitness,
    momentPools: positionModule.momentPools,
  }) as MatchMoment[];
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
  const appearanceMinutes =
    context.isInSquad && context.fitnessAvailability !== "Out" && appearanceWindow.entryMinute <= 90
      ? Math.max(0, clamp(appearanceWindow.exitMinute ?? 90, appearanceWindow.entryMinute, 90) - clamp(appearanceWindow.entryMinute, 0, 90))
      : 0;
  const involvementScore =
    state.trust * 0.35 +
    state.fitness * 0.25 +
    getFormScore(state.seasonStats.ratings) * 0.2 +
    contextualOvr * 0.2 +
    positionModule.matchTendencies.involvementBias[context.playerRole] * 10;
  const playerMomentCount = context.isInSquad ? getPlayerMomentCount(context.playerRole, involvementScore, appearanceMinutes, matchSeed) : 0;
  const selectedMoments = selectPlayerHighlights({
    moments: matchPool,
    matchSeed,
    count: playerMomentCount,
    simEvents,
    playerWindowStart,
    playerWindowEnd,
    role: context.playerRole,
    serviceLevel: context.serviceLevel,
    opponentProfile: matchOpponentProfile,
    attributeValues: matchAttributeValues,
    preferredCategories: positionModule.matchTendencies.preferredForwardCategories,
  });
  const playerEvents: PlayerMatchEvent[] = playerMomentCount <= 0 || selectedMoments.length === 0 ? [] : Array.from({ length: playerMomentCount }, (_, index) => {
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
    teamName: state.club.name,
    teamShortName: state.club.shortName,
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
    fitnessAvailability: context.fitnessAvailability,
    isInSquad: context.isInSquad,
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
  const leagueTier = getClubLeagueTier(state.club);
  const matchAttributeValues = applyBootsActionBoost(getLeagueAdjustedAttributeValueMap(state.attributes, leagueTier), getSupportLevel(state, "boots"));
  const matchOpponentProfile = state.activeMatch
    ? getLeagueAdjustedOpponentProfile(state.activeMatch.opponentProfile, leagueTier)
    : undefined;
  const coreResult = resolvePlayerChoice({
    moment,
    choice,
    attributeValues: matchAttributeValues,
    fitness: state.fitness,
    trust: state.trust,
    playerRole: state.activeMatch?.playerRole,
    opponentProfile: matchOpponentProfile,
    resultSeed,
  });
  const positionAdjustedResult = {
    ...coreResult,
    rating: getPositionAdjustedRating(coreResult.rating, coreResult.outcomeTier, coreResult.decisiveOutcome, moment, choice, positionModule),
  };
  const supportAdjustedResult = applyMatchSupportEffects(state, positionAdjustedResult);
  const xp = buildChoiceXp(choice, supportAdjustedResult.outcomeTier, positionModule, moment);
  const positionLabel = positionModule.displayName.toLowerCase();
  const performanceReasons = buildPerformanceReasons(moment, choice, supportAdjustedResult, positionModule, xp);
  const choiceMeta = {
    choiceId: choice.id,
    choiceLabel: choice.label,
    choiceOutcome: choice.outcome,
  };

  if (choice.outcome === "goal") {
    return {
      title: supportAdjustedResult.decisiveOutcome ? "Clinical action" : supportAdjustedResult.success ? `Useful ${positionLabel} action` : "Chance slips away",
      detail: supportAdjustedResult.decisiveOutcome
        ? `${moment.minute}': ${choice.label} works. You turn the moment into a goal and your match rating jumps.`
        : supportAdjustedResult.success
          ? `${moment.minute}': ${choice.label} is the right idea and keeps the attack alive, but it does not become a clear finish.`
          : `${moment.minute}': ${choice.label} is the right idea, but the execution is not clean enough this time.`,
      ...supportAdjustedResult,
      ...choiceMeta,
      performanceReasons,
      xp,
    };
  }

  if (choice.outcome === "assist") {
    return {
      title: supportAdjustedResult.assists > 0 ? "Assist" : supportAdjustedResult.chancesCreated > 0 ? "Chance created" : supportAdjustedResult.success ? "Attack connected" : "Move breaks down",
      detail: supportAdjustedResult.assists > 0
        ? `${moment.minute}': ${choice.label} opens the defense and gives a teammate the clean finish.`
        : supportAdjustedResult.chancesCreated > 0
          ? `${moment.minute}': ${choice.label} opens the defense, but the finish does not come.`
        : supportAdjustedResult.success
          ? `${moment.minute}': ${choice.label} helps the move, but the final chance never fully opens.`
          : `${moment.minute}': ${choice.label} nearly unlocks them, but the final connection is missing.`,
      ...supportAdjustedResult,
      ...choiceMeta,
      performanceReasons,
      xp,
    };
  }

  return {
    title: supportAdjustedResult.outcomeTier === "Great" ? "Manager will remember that" : supportAdjustedResult.success ? "Useful shift" : "Useful but imperfect",
    detail: supportAdjustedResult.outcomeTier === "Great"
      ? `${moment.minute}': ${choice.label} is not flashy, but it is exactly the kind of ${positionLabel} work that earns minutes.`
      : supportAdjustedResult.success
        ? `${moment.minute}': ${choice.label} helps the team shape and keeps you in the manager's thoughts.`
        : `${moment.minute}': ${choice.label} helps the team shape, though the action lacks sharpness.`,
    ...supportAdjustedResult,
    ...choiceMeta,
    performanceReasons,
    xp,
  };
}

function createFollowUpMoment(match: MatchState, moment: PlayerMatchEvent, result: MatchResult): PlayerMatchEvent | undefined {
  if (moment.chainDepth && moment.chainDepth >= 1) {
    return undefined;
  }
  if (!result.success || result.goals > 0 || result.assists > 0) {
    return undefined;
  }

  const tierChance: Record<OutcomeTier, number> = {
    Poor: 0,
    Okay: 0.12,
    Good: 0.42,
    Great: 0.78,
  };
  const roll = seededNoise(`${match.matchSeed}-${moment.id}-${result.choiceId}-${result.outcomeTier}-follow-up`);
  if (roll > tierChance[result.outcomeTier]) {
    return undefined;
  }

  const template = getFollowUpTemplate(moment, result);
  if (!template) {
    return undefined;
  }

  const followUpMinute = clamp(moment.minute + 1, moment.minute, Math.min(match.exitMinute ?? 90, 90));
  return {
    ...template,
    id: `${moment.id}-${result.choiceId}-follow-up`,
    type: "player_moment",
    minute: followUpMinute,
    opponent: moment.opponent,
    chainDepth: (moment.chainDepth ?? 0) + 1,
  };
}

function getFollowUpTemplate(moment: MatchMoment, result: MatchResult): Omit<PlayerMatchEvent, "id" | "type" | "minute" | "opponent"> | undefined {
  if (result.choiceOutcome === "defense") {
    return undefined;
  }

  if (moment.category === "counter" || result.choiceId.includes("drive") || result.choiceId.includes("carry")) {
    return {
      category: "shot",
      situation: "The defender is beaten and the box opens",
      context: "Your first action created separation. Now the final decision matters before the cover arrives.",
      choices: [
        { id: "chain-low-shot", label: "Low shot", uses: ["Finishing", "Composure"], risk: "Medium", reward: "Goal chance", manager: "Neutral", outcome: "goal" },
        { id: "chain-cutback", label: "Cutback", uses: ["Vision", "Passing"], risk: "Low", reward: "Assist chance", manager: "Likes", outcome: "assist" },
        { id: "chain-draw-contact", label: "Draw contact", uses: ["Strength", "Composure"], risk: "Low", reward: "Keep pressure", manager: "Likes", outcome: "trust" },
      ],
    };
  }

  if (moment.category === "run_behind" || result.choiceId.includes("round") || result.choiceId.includes("behind")) {
    return {
      category: "first_time_finish",
      situation: "You arrive at the angle before the defender recovers",
      context: "The run worked, but the angle is tightening. You can force the finish or use the runner arriving centrally.",
      choices: [
        { id: "chain-tight-finish", label: "Tight-angle finish", uses: ["Finishing", "Composure"], risk: "High", reward: "Big goal", manager: "Risky", outcome: "goal" },
        { id: "chain-square-ball", label: "Square ball", uses: ["Composure", "Vision"], risk: "Medium", reward: "Tap-in assist", manager: "Likes", outcome: "assist" },
        { id: "chain-protect-ball", label: "Protect ball", uses: ["Strength", "First Touch"], risk: "Low", reward: "Retain attack", manager: "Neutral", outcome: "trust" },
      ],
    };
  }

  if (moment.category === "press" || result.choiceId.includes("press") || result.choiceId.includes("tackle")) {
    return {
      category: "late_pressure",
      situation: "The press forces a loose ball near the area",
      context: "You have turned effort into a dangerous second ball. The opponent is scrambling.",
      choices: [
        { id: "chain-snap-shot", label: "Snap shot", uses: ["Finishing", "Acceleration"], risk: "High", reward: "Sudden goal", manager: "Neutral", outcome: "goal" },
        { id: "chain-slip-teammate", label: "Slip teammate", uses: ["Vision", "Passing"], risk: "Medium", reward: "Assist chance", manager: "Likes", outcome: "assist" },
        { id: "chain-lock-in", label: "Lock them in", uses: ["Work Rate", "Positioning"], risk: "Low", reward: "Manager trust", manager: "Likes", outcome: "trust" },
      ],
    };
  }

  if (moment.category === "hold_up" || moment.category === "link_up" || result.choiceId.includes("layoff") || result.choiceId.includes("shield")) {
    return {
      category: "link_up",
      situation: "The layoff comes back as the defense steps out",
      context: "Your first action kept the attack alive. A quick second decision can turn possession into danger.",
      choices: [
        { id: "chain-spin-shot", label: "Spin and shoot", uses: ["First Touch", "Finishing"], risk: "High", reward: "Surprise finish", manager: "Risky", outcome: "goal" },
        { id: "chain-release-runner", label: "Release runner", uses: ["Vision", "Passing"], risk: "Medium", reward: "Chance created", manager: "Likes", outcome: "assist" },
        { id: "chain-set-tempo", label: "Set tempo", uses: ["Composure", "Passing"], risk: "Low", reward: "Sustain move", manager: "Likes", outcome: "trust" },
      ],
    };
  }

  if (result.choiceOutcome === "goal" || result.choiceOutcome === "assist") {
    return {
      category: result.choiceOutcome === "goal" ? "shot" : "link_up",
      situation: result.choiceOutcome === "goal" ? "The ball sits up for one more action" : "A teammate returns the ball into your path",
      context: "The first idea worked well enough to keep the move alive. You have one more decision before the defense resets.",
      choices: [
        { id: "chain-compose-finish", label: "Compose finish", uses: ["Finishing", "Composure"], risk: "Medium", reward: "Goal chance", manager: "Neutral", outcome: "goal" },
        { id: "chain-final-pass", label: "Final pass", uses: ["Vision", "Passing"], risk: "Medium", reward: "Assist chance", manager: "Likes", outcome: "assist" },
        { id: "chain-safe-touch", label: "Safe touch", uses: ["First Touch", "Composure"], risk: "Low", reward: "Good action", manager: "Likes", outcome: "trust" },
      ],
    };
  }

  return undefined;
}

function applyMatchSupportEffects<T extends { rating: number; fitnessDelta: number }>(state: GameState, result: T): T {
  const recoveryLevel = getSupportLevel(state, "recovery");
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");

  return {
    ...result,
    fitnessDelta: Math.min(0, result.fitnessDelta + getMatchActionRecoveryRelief(recoveryLevel) + getRecoveryBreakthroughRelief(recoveryBreakthroughs)),
  };
}

function simulateRemainingPlayerMoments(state: GameState, match: MatchState): MatchResult[] {
  const matchAttributeValues = applyBootsActionBoost(getLeagueAdjustedAttributeValueMap(state.attributes, getClubLeagueTier(state.club)), getSupportLevel(state, "boots"));
  return match.events
    .slice(match.currentEventIndex)
    .filter((event): event is PlayerMatchEvent => event.type === "player_moment")
    .flatMap((moment) => {
      const choice = chooseAutoSimChoice({
        moment,
        attributeValues: matchAttributeValues,
        fitness: state.fitness,
        trust: state.trust,
        matchSeed: match.matchSeed,
      });
      const result = { ...createMatchResult(state, moment, choice), source: "auto" as const };
      const followUp = createFollowUpMoment(match, moment, result);
      if (!followUp) {
        return [result];
      }

      const followUpChoice = chooseAutoSimChoice({
        moment: followUp,
        attributeValues: matchAttributeValues,
        fitness: state.fitness,
        trust: state.trust,
        matchSeed: `${match.matchSeed}-follow-up`,
      });

      return [result, { ...createMatchResult(state, followUp, followUpChoice), source: "auto" as const }];
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
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const qualityProfile = getTrainingQualityProfile(state, createTrainingSeed(state), environment);
  const coachLevel = getSupportLevel(state, "coach");
  const nutritionLevel = getSupportLevel(state, "nutrition");
  const recoveryLevel = getSupportLevel(state, "recovery");
  const trainingBreakthroughs = getSupportTrackBreakthroughCount(state, "training");
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
  const effectiveCoachLevel = coachLevel * environment.supportEfficiency;
  const effectiveNutritionLevel = nutritionLevel * environment.supportEfficiency;
  const effectiveRecoveryLevel = recoveryLevel * environment.supportEfficiency;
  const ranges: Partial<Record<AttributeKey, { min: number; max: number }>> = {};

  if (state.fitness < 12) {
    return {
      ranges,
      quality: "Poor" as TrainingQuality,
      qualityLabel: "Recovery session",
      qualityProfile: getTrainingQualityProfileByQuality("Poor"),
      specialistXp: {} as Partial<Record<AttributeKey, number>>,
      fitnessDelta: 14 + environment.recoveryBonus + getRecoverySessionBonus(effectiveRecoveryLevel, effectiveNutritionLevel),
      moraleDelta: 1,
      trustDelta: -1,
    };
  }

  getCurrentTrainingFocuses(state).forEach((focus, index) => {
    const baseRange = getBaseTrainingRange(state, focus);
    const focusWeight = getTrainingFocusWeight(index);
    ranges[focus] = {
      min: Math.max(
        1,
        Math.round(
          (baseRange.min * intensity.xpFloor + environment.xpFloorBonus + getTrainingXpFloorBonus(effectiveCoachLevel) + trainingBreakthroughs * 8) *
            focusWeight *
            environment.xpMultiplier *
            qualityProfile.xpMultiplier,
        ),
      ),
      max: Math.max(
        1,
        Math.round(
          (baseRange.max * intensity.xpCeiling + environment.xpFloorBonus + getTrainingXpCeilingBonus(effectiveCoachLevel) + trainingBreakthroughs * 12) *
            focusWeight *
            environment.xpMultiplier *
            qualityProfile.xpMultiplier,
        ),
      ),
    };
  });
  getCoachSupportFocuses(state).forEach((focus) => {
    ranges[focus] = {
      min: Math.max(1, Math.round(effectiveCoachLevel * 2.5 * environment.xpMultiplier * qualityProfile.xpMultiplier)),
      max: Math.max(1, Math.round(effectiveCoachLevel * 6 * environment.xpMultiplier * qualityProfile.xpMultiplier)),
    };
  });

  return {
    ranges,
    quality: qualityProfile.quality,
    qualityLabel: qualityProfile.label,
    qualityProfile,
    specialistXp: getProjectedSpecialistXp(state, environment, qualityProfile),
    fitnessDelta:
      intensity.fitnessDelta < 0
        ? Math.min(0, intensity.fitnessDelta + environment.recoveryBonus + getTrainingFatigueRelief(effectiveNutritionLevel) + getRecoveryBreakthroughRelief(recoveryBreakthroughs))
        : intensity.fitnessDelta + environment.recoveryBonus + getRecoveryBreakthroughRelief(recoveryBreakthroughs),
    moraleDelta: intensity.moraleDelta,
    trustDelta: intensity.trustDelta,
  };
}

function getDevelopmentEnvironment(tier: LeagueTier): DevelopmentEnvironment {
  const level = tier.facilityLevel;
  return {
    label: tier.name,
    facilityLevel: level,
    xpMultiplier: 1 + (level - 1) * 0.18,
    xpFloorBonus: (level - 1) * 4,
    recoveryBonus: Math.floor((level - 1) / 3),
    supportEfficiency: 1 + (level - 1) * 0.1,
  };
}

function getTrainingQualityProfile(state: GameState, seed: string, environment = getDevelopmentEnvironment(currentLeagueTier)): TrainingQualityProfile {
  const nutritionLevel = getSupportLevel(state, "nutrition");
  const recoveryLevel = getSupportLevel(state, "recovery");
  const trainingBreakthroughs = getSupportTrackBreakthroughCount(state, "training");
  const recoveryBreakthroughs = getSupportTrackBreakthroughCount(state, "recovery");
  const readinessScore =
    state.fitness * 0.42 +
    state.morale * 0.18 +
    (100 - state.pressure) * 0.12 +
    environment.facilityLevel * 5 +
    nutritionLevel * 1.7 +
    recoveryLevel * 1.1 +
    trainingBreakthroughs * 7 +
    recoveryBreakthroughs * 4 +
    (state.intensity === "Hard" ? -6 : state.intensity === "Light" ? 4 : 0);
  const roll = seededNoise(`${seed}-quality`);
  const qualityScore = readinessScore + Math.round(roll * 34) - 17;

  if (qualityScore >= 88) {
    return getTrainingQualityProfileByQuality("Breakthrough");
  }
  if (qualityScore >= 68) {
    return getTrainingQualityProfileByQuality("Sharp");
  }
  if (qualityScore >= 42) {
    return getTrainingQualityProfileByQuality("Solid");
  }
  return getTrainingQualityProfileByQuality("Poor");
}

function getTrainingQualityProfileByQuality(quality: TrainingQuality): TrainingQualityProfile {
  const profiles: Record<TrainingQuality, TrainingQualityProfile> = {
    Poor: {
      quality: "Poor",
      xpMultiplier: 0.72,
      label: "Poor session",
      description: "Low readiness limited the work.",
    },
    Solid: {
      quality: "Solid",
      xpMultiplier: 1,
      label: "Solid session",
      description: "A normal development week.",
    },
    Sharp: {
      quality: "Sharp",
      xpMultiplier: 1.18,
      label: "Sharp session",
      description: "Good readiness lifted the session.",
    },
    Breakthrough: {
      quality: "Breakthrough",
      xpMultiplier: 1.42,
      label: "Breakthrough session",
      description: "Everything clicked in training.",
    },
  };

  return profiles[quality];
}

function getProjectedSpecialistXp(
  state: GameState,
  environment = getDevelopmentEnvironment(currentLeagueTier),
  qualityProfile = getTrainingQualityProfile(state, createTrainingSeed(state), environment),
): Partial<Record<AttributeKey, number>> {
  const specialist = trainingSpecialistMap[state.trainingSpecialist] ?? trainingSpecialistMap.finishing;
  const focuses = getCurrentTrainingFocuses(state);
  const matchingFocuses = focuses.filter((focus) => specialist.attributes.includes(focus));
  if (matchingFocuses.length === 0) {
    return {};
  }

  const coachLevel = getSupportLevel(state, "coach");
  const trainingBreakthroughs = getSupportTrackBreakthroughCount(state, "training");
  const baseBonus = getSpecialistBaseXpBonus(state, environment);
  const bonus = Math.max(2, Math.round(baseBonus * environment.supportEfficiency * qualityProfile.xpMultiplier));
  return Object.fromEntries(matchingFocuses.map((focus) => [focus, bonus])) as Partial<Record<AttributeKey, number>>;
}

function getSpecialistBaseXpBonus(state: GameState, environment = getDevelopmentEnvironment(currentLeagueTier)) {
  const coachLevel = getSupportLevel(state, "coach");
  const trainingBreakthroughs = getSupportTrackBreakthroughCount(state, "training");
  return Math.round(10 + environment.facilityLevel * 3 + coachLevel * 2.8 + trainingBreakthroughs * 7);
}

function getCurrentTrainingFocuses(state: GameState): AttributeKey[] {
  const capacity = getTrainingFocusCapacity(state);
  const uniqueFocuses = Array.from(new Set(state.trainingFocuses.length > 0 ? state.trainingFocuses : ["Finishing"]));
  return uniqueFocuses.slice(0, capacity) as AttributeKey[];
}

function getTrainingFocusCapacity(state: Pick<GameState, "supportUpgrades">) {
  const breakthroughs = getSupportTrackBreakthroughCount(state, "training");
  if (breakthroughs >= 3) {
    return 3;
  }
  if (breakthroughs >= 1) {
    return 2;
  }
  return 1;
}

function getTrainingFocusWeight(index: number) {
  if (index === 0) {
    return 1;
  }
  if (index === 1) {
    return 0.62;
  }
  return 0.42;
}

function getTrainingFocusUnlockLabel(state: Pick<GameState, "supportUpgrades">) {
  const capacity = getTrainingFocusCapacity(state);
  if (capacity >= 3) {
    return "3 focus slots";
  }
  if (capacity >= 2) {
    return "2 focus slots";
  }
  return "1 focus slot";
}

function getCoachSupportFocuses(state: GameState): AttributeKey[] {
  const coachLevel = getSupportLevel(state, "coach");
  if (coachLevel <= 0) {
    return [];
  }

  const activeFocuses = new Set(getCurrentTrainingFocuses(state));
  const positionModule = getPositionModule(state.positionGroup);
  const focusCount = coachLevel >= 8 ? 2 : 1;
  return positionModule.keyAttributes
    .filter((attribute) => !activeFocuses.has(attribute))
    .map((attribute) => ({ attribute, value: getAttributeValue(state.attributes, attribute) }))
    .sort((a, b) => a.value - b.value)
    .slice(0, focusCount)
    .map((item) => item.attribute);
}

function getBaseTrainingRange(_state: GameState, _focus: AttributeKey) {
  return { min: 12, max: 55 };
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
  trainingSeed: string,
): Partial<Record<AttributeKey, number>> {
  const xp: Partial<Record<AttributeKey, number>> = {};

  Object.entries(ranges).forEach(([focus, range]) => {
    const roll = seededNoise(`${trainingSeed}-${focus}`);
    xp[focus as AttributeKey] = Math.round(range.min + roll * (range.max - range.min));
  });

  return xp;
}

function createTrainingSeed(state: GameState) {
  return [
    "training",
    state.week,
    state.trainingCompletedWeek,
    state.trainingFocuses.join(","),
    state.intensity,
    state.fitness,
    state.trust,
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 8),
  ].join("-");
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
      const weight = weights[attribute.label] ?? 0;
      return {
        value: sum.value + attribute.value * weight,
        weight: sum.weight + weight,
      };
    },
    { value: 0, weight: 0 },
  );

  if (weighted.weight <= 0) {
    return Math.round(attributes.reduce((sum, attribute) => sum + attribute.value, 0) / Math.max(1, attributes.length));
  }

  return Math.round(weighted.value / weighted.weight);
}

function calculatePotentialOvr(attributes: Attribute[], weights: Partial<Record<AttributeKey, number>> = positionModules.Forward.ovrWeights) {
  return calculateOvr(
    attributes.map((attribute) => ({ ...attribute, value: attribute.potential })),
    weights,
  );
}

function getOvrBreakdown(attributes: Attribute[], positionModule: PositionModule) {
  const entries = Object.entries(positionModule.ovrWeights)
    .filter((entry): entry is [AttributeKey, number] => typeof entry[1] === "number" && entry[1] > 0)
    .sort((a, b) => b[1] - a[1]);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);

  return entries.map(([label, weight]) => ({
    label,
    value: getAttributeValue(attributes, label),
    share: totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0,
  }));
}

function getAttributeValue(attributes: Attribute[], key: AttributeKey) {
  return attributes.find((attribute) => attribute.label === key)?.value ?? 0;
}

function getAttributeValueMap(attributes: Attribute[]): Record<AttributeKey, number> {
  return Object.fromEntries(attributes.map((attribute) => [attribute.label, attribute.value])) as Record<AttributeKey, number>;
}


function getAttributeProgressPercent(attribute: Attribute) {
  return getXpPercent(attribute.xp, getAttributeXpRequirement(attribute));
}

function getAttributeGrowthDetail(state: GameState, attribute: Attribute) {
  const projection = getTrainingProjection(state);
  const range = projection.ranges[attribute.label];
  const environment = getDevelopmentEnvironment(getClubLeagueTier(state.club));
  const pressure = getAttributeGrowthPressure(attribute);
  const baseRequirement = getBaseAttributeXpRequirement(attribute.value);
  const requirement = getAttributeXpRequirement(attribute);
  const isSelected = getCurrentTrainingFocuses(state).includes(attribute.label);
  const isCoachSupported = getCoachSupportFocuses(state).includes(attribute.label);
  const modifiers = [
    `Facilities x${environment.xpMultiplier.toFixed(2)}`,
    `Facility floor +${environment.xpFloorBonus}`,
    `Coach Lv ${getSupportLevel(state, "coach")}`,
  ];

  if (isCoachSupported) {
    modifiers.push("Coach support XP");
  }

  if (getSupportTrackBreakthroughCount(state, "training") > 0) {
    modifiers.push(`Training breakthroughs +${getSupportTrackBreakthroughCount(state, "training")}`);
  }

  return {
    pressure,
    baseRequirement,
    requirement,
    progress: getXpPercent(attribute.xp, requirement),
    xpToNext: Math.max(0, requirement - attribute.xp),
    isSelected,
    trainingRange: range ? `${range.min}-${range.max} XP` : isCoachSupported ? "Support XP" : "Not focused",
    modifiers,
    improvementTips: [
      "Train this stat",
      "Improve Training setup",
      "Move to better facilities",
      "Build dynasty growth upgrades",
    ],
  };
}

function getXpPercent(xp: number, requirement: number) {
  return requirement > 0 ? clamp((xp / requirement) * 100, 0, 100) : 0;
}

function getLeagueAdjustedAttributeValueMap(attributes: Attribute[], tier = currentLeagueTier): Record<AttributeKey, number> {
  return Object.fromEntries(
    attributes.map((attribute) => [attribute.label, getContextualAbilityScore(attribute.value, tier)]),
  ) as Record<AttributeKey, number>;
}

function getLeagueAdjustedOpponentProfile(profile: OpponentProfile, tier = currentLeagueTier): OpponentProfile {
  return {
    ...profile,
    overall: getContextualAbilityScore(profile.overall, tier),
    attack: getContextualAbilityScore(profile.attack, tier),
    midfield: getContextualAbilityScore(profile.midfield, tier),
    defense: getContextualAbilityScore(profile.defense, tier),
    keeper: getContextualAbilityScore(profile.keeper, tier),
    centerBackPace: getContextualAbilityScore(profile.centerBackPace, tier),
    aerialDefense: getContextualAbilityScore(profile.aerialDefense, tier),
    discipline: getContextualAbilityScore(profile.discipline, tier),
    fatigueResistance: getContextualAbilityScore(profile.fatigueResistance, tier),
  };
}

function getContextualAbilityScore(value: number, tier = currentLeagueTier) {
  return clamp(Math.round(50 + (value - tier.averageOvr) * 1.15), 1, 99);
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

export default App;
