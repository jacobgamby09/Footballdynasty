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
import { formatFixtureTitle, formatPercentDelta, formatSigned, getAverageRating, getFormLabel, getFormScore, getMatchupText, getMoraleLabel, getPressureLabel, getTopXpEntry, getTrainingIntensityLabel, getTrustStatus, getUniqueItems, roundToNearest, sumXp } from "./systems/formatting";
import { calculateOvr, calculatePotentialOvr, getAttributeProgressPercent, getAttributeValue, getClubLeagueTier, getContextualAbilityScore, getContractLeagueTier, getLeagueAdjustedAttributeValueMap, getLeagueAdjustedOpponentProfile, getLeagueTierIndex, getOvrBreakdown, getXpPercent } from "./systems/ovr";
import { applyBootsActionBoost, buySupportUpgradeState, getBootsActionBoost, getLifestylePressureRelief, getMatchActionRecoveryRelief, getNextSupportTrackPurchase, getRecoveryBreakthroughRelief, getRecoverySessionBonus, getSupportLevel, getSupportTrackBreakthroughCount, getSupportTrackProgress, getSupportUpgradeTotal, getTrainingFatigueRelief, getTrainingXpCeilingBonus, getTrainingXpFloorBonus, getWeeklySupportRecoveryBonus } from "./systems/support";
import { advanceSeasonFixture, createFixtureResult, getCurrentFixture, getNextFixtureAfterMatch, getRecentFormText, getSeasonGoals, getSeasonRecord, getTeamFormScore, getUpcomingFixtures, hasPlayableFixture, isSeasonComplete } from "./systems/seasonState";
import { getNextRole, getPlayerMatchRole, getPlayerMomentCount, getRoleThreshold, getSelectionReport, getUpcomingMatch } from "./systems/selection";
import { addAttributeXp, applyTrainingWeek, getAttributeGrowthDetail, getCurrentTrainingFocuses, getDevelopmentEnvironment, getSupportInvestmentImpactLine, getSupportTrackCurrentBonusLines, getTrainingFocusCapacity, getTrainingFocusUnlockLabel, getTrainingProjection } from "./systems/training";
import { acceptContractOfferState, advanceContractWeek, contractFromOffer, getClubContractOffer, getContractOfferSummary, getContractStatusLabel, getMatchContractEarnings, getPromisedRole } from "./systems/contracts";
import { createDynastySeasonSnapshot, getDynastyTotals, getLeagueTable, getSeasonContractOffer, getSeasonReview, startNextSeasonState } from "./systems/season";
import { createFollowUpMoment, createMatch, createMatchResult, finishMatchState, getAppearanceText, getChoiceAttributeAverage, getMatchFitnessDelta, getOutcomeTierSummary, getPitchStatus, getPreMatchEntryPlan, getPrimaryChanceQuality, getReadableExplanations, getRecentTimelineItems, getResultPopupLabel, getResultPopupTone, getResultVerdictText, getTimelineScore, simulateRemainingPlayerMoments, summarizeMatchResults, summarizeSimEvents } from "./systems/match";

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

export default App;
