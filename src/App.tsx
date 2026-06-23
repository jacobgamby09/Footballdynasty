import { useEffect, useState } from "react";
import { type AttributeKey } from "./positionRoles";
import type { Contract, ContractOffer, CountryId, DynastyUpgradeId, GameState, Intensity, MatchChoice, MatchSpeed, NavKey, NewCareerSetup, ScreenKey, SupportUpgradeId } from "./types";
import { clearSavedGame, hasSavedGame, loadSavedGame, saveGameState } from "./state/save";
import { createCareerForCountry } from "./state/initialState";
import { COUNTRIES } from "./data/world";
import { getGenerationProfile } from "./systems/generation";
import { getLegacyEstimate, getLegacySeasons } from "./systems/legacy";
import { buyDynastyUpgradeState } from "./systems/dynastyUpgrades";
import { investEstateState } from "./systems/estate";
import { buySupportUpgradeState } from "./systems/support";
import { hasPlayableFixture, isSeasonComplete } from "./systems/seasonState";
import { getUpcomingMatch } from "./systems/selection";
import { applyTrainingWeek, getCurrentTrainingFocuses, getTrainingFocusCapacity } from "./systems/training";
import { acceptContractOfferState, advanceFreeAgentMarketState, enterFreeAgentMarketState, getOfferKey } from "./systems/contracts";
import { acceptSponsorDealState } from "./systems/sponsors";
import { startNextSeasonState } from "./systems/season";
import { createFollowUpMoment, createMatch, createMatchResult, finishMatchState, simulateRemainingPlayerMoments } from "./systems/match";
import { getCountryForClub } from "./systems/world";
import { BottomNav } from "./components/shared";
import { ClubScreen, ContractOfferScreen, CountrySelectScreen, CreateDynastyScreen, FreeAgentMarketScreen, HomeScreen, MatchMomentScreen, PlayerScreen, PostMatchSummaryScreen, PreMatchScreen, RetirementScreen, SeasonReviewScreen, TrainingRevealScreen, TrainingScreen, TrainingSummaryScreen, TransferWindowScreen, WeekSummaryScreen } from "./components/screens";

const heirFirstNames = ["Noah", "Lucas", "Mikkel", "Oscar", "Elias", "Victor", "Oliver", "Felix"];

function App() {
  const [careerStarted, setCareerStarted] = useState<boolean>(() => hasSavedGame());
  const [activeScreen, setActiveScreen] = useState<ScreenKey>(() => (hasSavedGame() ? "player" : "dynasty-create"));
  const [game, setGame] = useState<GameState>(() => loadSavedGame());
  const [matchSpeed, setMatchSpeed] = useState<MatchSpeed>(2);
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved">("saved");
  const [newCareerSetup, setNewCareerSetup] = useState<NewCareerSetup | undefined>();

  const activeNav =
    activeScreen === "dynasty-create" ||
    activeScreen === "country-select" ||
    activeScreen === "pre-match" ||
    activeScreen === "match" ||
    activeScreen === "summary" ||
    activeScreen === "training-reveal" ||
    activeScreen === "training-summary" ||
    activeScreen === "free-agent" ||
    activeScreen === "week-summary" ||
    activeScreen === "contract-offer" ||
    activeScreen === "transfer-window" ||
    activeScreen === "season-review" ||
    activeScreen === "retirement"
      ? undefined
      : activeScreen;
  const seasonComplete = isSeasonComplete(game.season);
  const isFreeAgent = Boolean(game.freeAgent);
  const isMatchDay = !isFreeAgent && hasPlayableFixture(game.season);
  const needsTraining = !isFreeAgent && game.trainingCompletedWeek !== game.week && !seasonComplete;
  const requiresTransferDecision =
    activeScreen === "transfer-window" &&
    Boolean(game.transferWindow?.currentClubOffer || game.transferWindow?.offers.length);
  const advanceLabel =
    activeScreen === "pre-match"
      ? "Start Match"
      : activeScreen === "match"
      ? game.activeMatch?.isComplete
        ? "Finish Match"
        : "In Match"
      : activeScreen === "summary"
        ? "Week Summary"
      : activeScreen === "training-reveal"
        ? "Development Summary"
      : activeScreen === "training-summary"
        ? "Continue Career"
      : activeScreen === "free-agent"
        ? "Sim Week"
      : activeScreen === "week-summary"
        ? game.contractOffer || game.contractOffers?.length
          ? "Contract"
          : seasonComplete
            ? "Season Review"
            : "Next Week"
      : activeScreen === "contract-offer"
        ? "Decision Required"
      : activeScreen === "transfer-window"
        ? requiresTransferDecision
          ? "Decision Required"
          : game.transferWindow?.kind === "end-season"
          ? "Season Review"
          : "Continue"
      : activeScreen === "season-review"
        ? "Next Season"
        : activeScreen === "retirement"
          ? "End Run"
        : activeScreen === "training" && needsTraining
          ? "Start Training"
        : game.contractOffer || game.contractOffers?.length
          ? "Contract"
        : seasonComplete
          ? "Season Review"
        : needsTraining
          ? "Training"
        : isMatchDay
          ? "Match Day"
          : "Next Week";

  useEffect(() => {
    if (!careerStarted) {
      return; // no career chosen yet (country-select) — don't persist the placeholder
    }
    if (game.activeMatch) {
      setSaveStatus("unsaved");
      return;
    }

    saveGameState(game);
    setSaveStatus("saved");
  }, [game, careerStarted]);

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

    if (activeScreen === "training-reveal") {
      setActiveScreen("training-summary");
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

    if (activeScreen === "free-agent") {
      simulateFreeAgentWeek();
      return;
    }

    if (activeScreen === "season-review") {
      startNextSeason();
      return;
    }

    if (activeScreen === "retirement") {
      retireCareer();
      return;
    }

    if (activeScreen === "contract-offer") {
      return;
    }

    if (activeScreen === "transfer-window") {
      closeTransferWindow();
      return;
    }

    if (game.contractOffer || game.contractOffers?.length) {
      setActiveScreen("contract-offer");
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

    if (game.freeAgent) {
      setActiveScreen("free-agent");
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
    setActiveScreen("training-reveal");
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
    setActiveScreen(
      game.freeAgent && !game.contractOffer && !game.contractOffers?.length
        ? "free-agent"
        : game.transferWindow
        ? "transfer-window"
        : game.contractOffer || game.contractOffers?.length
          ? "contract-offer"
          : isSeasonComplete(game.season)
            ? "season-review"
            : "player",
    );
  }

  function closeTrainingSummary() {
    setActiveScreen("player");
  }

  function startNextSeason() {
    // At the hard age cap the body is done — retirement is forced rather than optional.
    if (getLegacyEstimate(game).forced) {
      setActiveScreen("retirement");
      return;
    }
    setGame((state) => startNextSeasonState(state));
    setActiveScreen("player");
  }

  function acceptContractOffer(offer?: ContractOffer) {
    setGame((state) => acceptContractOfferState(state, offer));
    setActiveScreen(isSeasonComplete(game.season) ? "season-review" : "player");
  }

  function acceptTransferOffer(offer: ContractOffer) {
    setGame((state) => ({
      ...acceptContractOfferState(state, offer),
      transferWindow: undefined,
    }));
    setActiveScreen(isSeasonComplete(game.season) ? "season-review" : "player");
  }

  function declineContractOffer(offer?: ContractOffer) {
    setGame((state) => {
      const availableOffers = state.contractOffers ?? (state.contractOffer ? [state.contractOffer] : []);
      const declined = offer ?? availableOffers[0];
      const remainingOffers = declined
        ? availableOffers.filter((item) => getOfferKey(item) !== getOfferKey(declined))
        : [];
      const isExpiredMarket = state.contract.weeksRemaining <= 0 || declined?.source === "external-club" || Boolean(state.freeAgent);

      if (remainingOffers.length > 0) {
        return {
          ...state,
          contractOffer: remainingOffers.length === 1 ? remainingOffers[0] : undefined,
          contractOffers: remainingOffers.length > 1 ? remainingOffers : undefined,
          freeAgent: state.freeAgent
            ? {
                ...state.freeAgent,
                declinedOfferKeys: declined
                  ? Array.from(new Set([...state.freeAgent.declinedOfferKeys, getOfferKey(declined)]))
                  : state.freeAgent.declinedOfferKeys,
              }
            : state.freeAgent,
          lastEvent: declined ? `${declined.club} offer declined.` : "Offer declined.",
        };
      }

      if (isExpiredMarket) {
        return enterFreeAgentMarketState(
          {
            ...state,
            contractOffer: undefined,
            contractOffers: undefined,
          },
          declined ? [declined] : [],
        );
      }

      return {
        ...state,
        contractOffer: undefined,
        contractOffers: undefined,
        lastEvent: "Contract offer declined. The club may return with terms later.",
      };
    });
    setActiveScreen(game.contract.weeksRemaining <= 0 || game.freeAgent ? "free-agent" : isSeasonComplete(game.season) ? "season-review" : "player");
  }

  function simulateFreeAgentWeek() {
    let nextScreen: ScreenKey = "free-agent";
    setGame((state) => {
      const nextState = advanceFreeAgentMarketState(applyTrainingWeek(state));
      if (nextState.contractOffer || nextState.contractOffers?.length) {
        nextScreen = "contract-offer";
      }
      return nextState;
    });
    setActiveScreen(nextScreen);
  }

  function closeTransferWindow() {
    setGame((state) => ({
      ...state,
      transferWindow: undefined,
      lastEvent: state.transferWindow?.kind === "end-season" ? "Season decisions closed. Review the season before moving on." : "Transfer window closed. Focus returns to the pitch.",
    }));
    setActiveScreen(isSeasonComplete(game.season) ? "season-review" : "player");
  }

  function openRetirement() {
    setActiveScreen("retirement");
  }

  function retireCareer() {
    const estimate = getLegacyEstimate(game);
    if (!estimate.eligible) {
      setActiveScreen("home");
      return;
    }

    const playerName = `${game.player.firstName} ${game.player.lastName}`;
    const confirmed = window.confirm(`Retire ${playerName} and bank ${estimate.totalPoints} Legacy Points? This will start Gen ${game.dynasty.generation + 1}.`);
    if (!confirmed) {
      return;
    }

    setGame((state) => {
      const latestEstimate = getLegacyEstimate(state);
      const country = getCountryForClub(state.world, state.club.clubId, state.club.shortCode);
      const nextGeneration = state.dynasty.generation + 1;
      // Family standing compounds: the heir inherits a prestige floor grown from this
      // career's peak. Diminishing (sqrt) so it never trivialises, and never drops.
      const inheritedReputation = Math.max(
        state.dynasty.reputation ?? 0,
        Math.round(Math.sqrt(Math.max(0, state.prestige)) * 3),
      );
      const nextDynasty = {
        ...state.dynasty,
        generation: nextGeneration,
        legacyPoints: state.dynasty.legacyPoints + latestEstimate.totalPoints,
        potentialTier: getGenerationProfile(nextGeneration).label,
        reputation: inheritedReputation,
      };
      const nextFirstName = heirFirstNames[(nextGeneration - 2) % heirFirstNames.length] ?? "Noah";
      const nextState = createCareerForCountry(country?.id ?? "denmark", {
        dynasty: nextDynasty,
        dynastyHistory: getLegacySeasons(state),
        firstName: nextFirstName,
      });

      return {
        ...nextState,
        lastEvent: `${state.player.firstName} ${state.player.lastName} retired with ${latestEstimate.totalPoints} Legacy Points banked. ${nextFirstName} ${state.player.lastName} begins Gen ${nextGeneration}.`,
      };
    });
    setActiveScreen("player");
  }

  function buySupportUpgrade(upgradeId: SupportUpgradeId) {
    setGame((state) => buySupportUpgradeState(state, upgradeId));
  }

  function buyDynastyUpgrade(upgradeId: DynastyUpgradeId) {
    setGame((state) => buyDynastyUpgradeState(state, upgradeId));
  }

  function investEstate() {
    setGame((state) => investEstateState(state));
  }

  function acceptSponsorDeal(dealId: string) {
    setGame((state) => acceptSponsorDealState(state, dealId));
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
    setCareerStarted(false);
    setNewCareerSetup(undefined);
    setActiveScreen("dynasty-create");
    setSaveStatus("saved");
  }

  function createDynasty(setup: NewCareerSetup) {
    setNewCareerSetup(setup);
    setActiveScreen("country-select");
  }

  function startCareerInCountry(countryId: CountryId) {
    setGame(createCareerForCountry(countryId, { setup: newCareerSetup }));
    setCareerStarted(true);
    setActiveScreen("player");
    setSaveStatus("saved");
  }

  return (
    <main className="app-shell">
      <section className="app-frame" aria-label="Football Dynasty">
        <div className="screen-scroll">
          {activeScreen === "dynasty-create" && <CreateDynastyScreen countries={COUNTRIES} onCreate={createDynasty} />}
          {activeScreen === "country-select" && <CountrySelectScreen countries={COUNTRIES} onPick={startCareerInCountry} />}
          {activeScreen === "player" && <PlayerScreen game={game} />}
          {activeScreen === "training" && (
            <TrainingScreen
              game={game}
              onIntensityChange={setIntensity}
              onFocusChange={setTrainingFocus}
            />
          )}
          {activeScreen === "club" && <ClubScreen game={game} />}
          {activeScreen === "home" && (
            <HomeScreen
              game={game}
              saveStatus={saveStatus}
              onBuySupportUpgrade={buySupportUpgrade}
              onBuyDynastyUpgrade={buyDynastyUpgrade}
              onInvestEstate={investEstate}
              onAcceptSponsorDeal={acceptSponsorDeal}
              onOpenRetirement={openRetirement}
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
          {activeScreen === "training-reveal" && game.lastTraining && (
            <TrainingRevealScreen summary={game.lastTraining} />
          )}
          {activeScreen === "training-summary" && game.lastTraining && (
            <TrainingSummaryScreen
              attributes={game.attributes}
              summary={game.lastTraining}
            />
          )}
          {activeScreen === "week-summary" && <WeekSummaryScreen game={game} />}
          {activeScreen === "contract-offer" && (game.contractOffers?.length || game.contractOffer) && (
            <ContractOfferScreen
              game={game}
              current={game.contract}
              offers={game.contractOffers ?? (game.contractOffer ? [game.contractOffer] : [])}
              onAccept={acceptContractOffer}
              onDecline={declineContractOffer}
            />
          )}
          {activeScreen === "free-agent" && <FreeAgentMarketScreen game={game} />}
          {activeScreen === "transfer-window" && game.transferWindow && (
            <TransferWindowScreen
              game={game}
              window={game.transferWindow}
              onAccept={acceptTransferOffer}
              onClose={closeTransferWindow}
            />
          )}
          {activeScreen === "season-review" && <SeasonReviewScreen game={game} />}
          {activeScreen === "retirement" && <RetirementScreen game={game} />}
        </div>

        {activeScreen !== "dynasty-create" && activeScreen !== "country-select" && (
          <BottomNav
            activeNav={activeNav}
            advanceLabel={advanceLabel}
            disabled={
              (activeScreen === "match" && (!game.activeMatch?.isComplete || Boolean(game.activeMatch.currentResult))) ||
              activeScreen === "contract-offer" ||
              requiresTransferDecision ||
              (activeScreen === "retirement" && !getLegacyEstimate(game).eligible)
            }
            onAdvance={handleAdvance}
            onNavigate={navigate}
          />
        )}
      </section>
    </main>
  );
}

export default App;
