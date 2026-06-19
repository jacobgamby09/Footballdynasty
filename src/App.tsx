import { useEffect, useState } from "react";
import { type AttributeKey } from "./positionRoles";
import type { Contract, GameState, Intensity, MatchChoice, MatchSpeed, NavKey, ScreenKey, SupportUpgradeId, TrainingSpecialistId } from "./types";
import { trainingSpecialistMap } from "./data/support";
import { clearSavedGame, createInitialState, loadSavedGame, saveGameState } from "./state/save";
import { buySupportUpgradeState } from "./systems/support";
import { hasPlayableFixture, isSeasonComplete } from "./systems/seasonState";
import { getUpcomingMatch } from "./systems/selection";
import { applyTrainingWeek, getCurrentTrainingFocuses, getTrainingFocusCapacity } from "./systems/training";
import { acceptContractOfferState } from "./systems/contracts";
import { startNextSeasonState } from "./systems/season";
import { createFollowUpMoment, createMatch, createMatchResult, finishMatchState, simulateRemainingPlayerMoments } from "./systems/match";
import { BottomNav } from "./components/shared";
import { ClubScreen, ContractOfferScreen, HomeScreen, MatchMomentScreen, PlayerScreen, PostMatchSummaryScreen, PreMatchScreen, SeasonReviewScreen, TrainingScreen, TrainingSummaryScreen, WeekSummaryScreen } from "./components/screens";

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

export default App;
