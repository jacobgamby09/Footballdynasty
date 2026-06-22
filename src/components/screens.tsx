import { attributeInfo } from "../data/attributes";
import { dynastyTrackDefinitions } from "../data/dynastyUpgrades";
import { supportTrackDefinitions } from "../data/support";
import { getPositionModule } from "../positionRoles";
import { getAttributeXpRequirement } from "../systems/attributeXp";
import { formatSigned, getMatchupText, getMoraleLabel, getTopXpEntry, getTrainingIntensityLabel, getUniqueItems, sumXp } from "../systems/formatting";
import { createFollowUpMoment, getAppearanceText, getChoiceAttributeAverage, getLiveMatchReadiness, getMatchFitnessDelta, getOutcomeTierSummary, getPitchStatus, getPreMatchEntryPlan, getPrimaryChanceQuality, getReadableExplanations, getRecentTimelineItems, getResultPopupLabel, getResultPopupTone, getResultVerdictText, getTimelineScore, summarizeMatchResults, summarizeSimEvents } from "../systems/match";
import { calculatePotentialOvr, getClubLeagueTier, getXpPercent } from "../systems/ovr";
import { getLegacyEstimate, getPlayerAge } from "../systems/legacy";
import { getPrestigeStatus } from "../systems/prestige";
import { createDynastySeasonSnapshot, getDynastyTotals, getLeagueTable, getSeasonContractOffer, getSeasonReview } from "../systems/season";
import { getCurrentFixture, getRecentFormText, getSeasonGoals, getSeasonRecord, getTeamFormScore, isSeasonComplete } from "../systems/seasonState";
import { getFitnessAvailability, getNextRole, getRoleThreshold, getUpcomingMatch } from "../systems/selection";
import { getAvailableSponsorDeals } from "../systems/sponsors";
import { getSupportUpgradeTotal } from "../systems/support";
import { getAttributeGrowthDetail, getCurrentTrainingFocuses, getDevelopmentEnvironment, getTrainingFocusCapacity, getTrainingFocusUnlockLabel, getTrainingProjection } from "../systems/training";
import { getCountryForClub } from "../systems/world";
import { clamp } from "../utils";
import { AttributesCard, CareerCard, ContractMarketCard, DynastySeasonRow, DynastyTrackCard, EquipmentFacilitiesCard, FixturePreviewList, LastMatchCard, LeagueTablePreview, NextActionCard, PrestigeStatusCard, ReadinessStrip, RelationshipsCard, SeasonContextCard, SeasonSnapshot, SelectionBriefingCard, SupportTrackCard } from "./cards";
import { DetailHeader, FixtureStatusBadge, Header, InfoRow, InfoTile, LeagueTableRowView, MatchScoreHeader, ProgressBar, ProgressRow, ScreenTitle, SummaryScoreHeader, WeekNote } from "./shared";
import { Activity, ArrowRightLeft, BadgeDollarSign, BarChart3, CalendarDays, Dumbbell, Home, ShieldCheck, Sparkles, Target, Trophy, UserRound } from "lucide-react";
import { useState } from "react";
import type { AttributeKey } from "../positionRoles";
import type { Attribute, ClubView, Contract, ContractOffer, Country, CountryId, DynastyUpgradeId, GameState, HomeView, Intensity, LastMatchSummary, MatchChoice, MatchSpeed, MatchState, SupportUpgradeId, TrainingSummary, TransferWindowState, Venue } from "../types";
import type { CSSProperties } from "react";

export function PlayerScreen({ game }: { game: GameState }) {
  return (
    <>
      <Header game={game} />
      <CareerCard game={game} />
      <ReadinessStrip game={game} />
      <PrestigeStatusCard game={game} />
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
      <EquipmentFacilitiesCard />
    </>
  );
}


export function ContractOfferScreen({
  game,
  current,
  offers,
  onAccept,
  onDecline,
}: {
  game: GameState;
  current: Contract;
  offers: ContractOffer[];
  onAccept: (offer: ContractOffer) => void;
  onDecline: () => void;
}) {
  const multiple = offers.length > 1;
  const primary = offers[0];

  return (
    <section className="simple-screen contract-offer-screen">
      <ScreenTitle
        label={multiple ? "Transfer interest" : primary.source === "external-club" ? "Contract market" : "Club offer"}
        title={multiple ? `${offers.length} clubs want you` : primary.title}
      />

      {offers.map((offer, index) => (
        <ContractOfferCard
          current={current}
          game={game}
          key={offer.clubId ?? offer.club ?? index}
          multiple={multiple}
          offer={offer}
          onAccept={onAccept}
        />
      ))}

      <div className="card">
        <span className="metric-label">Current deal</span>
        <div className="next-grid">
          <InfoTile label="Wage" value={`$${current.weeklyWage}`} />
          <InfoTile label="Left" value={`${current.weeksRemaining} wks`} />
          <InfoTile label="Role" value={current.rolePromise} />
        </div>
      </div>

      <button className="secondary-action" type="button" onClick={onDecline}>
        Decline {multiple ? "all" : "for now"}
      </button>
    </section>
  );
}

export function TransferWindowScreen({
  game,
  window,
  onAccept,
  onClose,
}: {
  game: GameState;
  window: TransferWindowState;
  onAccept: (offer: ContractOffer) => void;
  onClose: () => void;
}) {
  const country = getCountryForClub(game.world, game.club.clubId, game.club.shortCode);
  const tier = getClubLeagueTier(game.club);
  const currentOffer = window.currentClubOffer;
  const hasExternalOffers = window.offers.length > 0;
  const hasDecision = Boolean(currentOffer || hasExternalOffers);

  return (
    <section className="simple-screen transfer-window-screen">
      <ScreenTitle
        label={window.kind === "mid-season" ? `Season ${game.season.season} midpoint` : `Season ${game.season.season} complete`}
        title={window.title}
      />

      <div className="card transfer-window-hero">
        <div>
          <span className="metric-label country-label">{country && <span className="flag-icon" aria-label={country.name}>{country.flag}</span>}Career market</span>
          <h2>{window.clubFit}</h2>
          <p>{window.clubFitSummary}</p>
        </div>
        <div className="season-review-badge">
          <ArrowRightLeft size={20} />
          <strong>{window.interestLevel}</strong>
          <span>{window.kind === "mid-season" ? "Winter" : "Summer"}</span>
        </div>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Current club</span>
            <h2>{game.club.name}</h2>
          </div>
          <ShieldCheck size={19} />
        </div>
        <div className="stat-grid">
          <InfoTile label="League" value={tier.name} />
          <InfoTile label="Role" value={game.contract.rolePromise} />
          <InfoTile label="Wage" value={`$${game.contract.weeklyWage}/wk`} tone="good" />
          <InfoTile label="Left" value={`${game.contract.weeksRemaining} wks`} tone={game.contract.weeksRemaining <= 1 ? "warn" : undefined} />
        </div>
      </div>

      {currentOffer && (
        <div className="card contract-offer-card">
          <div className="section-heading">
            <div>
              <span className="metric-label">Extension available</span>
              <h2>{currentOffer.title}</h2>
            </div>
            <BadgeDollarSign size={19} />
          </div>
          <div className="contract-hero">
            <div>
              <span>Weekly wage</span>
              <strong>${game.contract.weeklyWage} &rarr; ${currentOffer.weeklyWage}</strong>
            </div>
            <div>
              <span>Role promise</span>
              <strong>{currentOffer.rolePromise}</strong>
            </div>
          </div>
          <div className="stat-grid">
            <InfoTile label="Length" value={`${currentOffer.weeks} wks`} />
            <InfoTile label="Signing" value={`+$${currentOffer.signingBonus}`} tone="good" />
            <InfoTile label="Goal" value={`+$${currentOffer.goalBonus}`} tone="gold" />
            <InfoTile label="Pressure" value={formatSigned(currentOffer.pressureModifier)} tone={currentOffer.pressureModifier > game.contract.pressureModifier ? "warn" : undefined} />
          </div>
          <p>{currentOffer.summary}</p>
          <button className="primary-action" type="button" onClick={() => onAccept(currentOffer)}>
            Accept Extension
          </button>
        </div>
      )}

      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">External interest</span>
            <h2>{window.offers.length > 0 ? `${window.offers.length} option${window.offers.length === 1 ? "" : "s"}` : "No formal offers"}</h2>
          </div>
          <ArrowRightLeft size={19} />
        </div>
        {!hasExternalOffers && (
          <div className="match-hint">
            <Activity size={16} />
            <span>Scouts are watching, but no club is ready to make a formal move yet.</span>
          </div>
        )}
      </div>

      {window.offers.map((offer, index) => (
        <ContractOfferCard
          current={game.contract}
          game={game}
          key={offer.clubId ?? offer.club ?? index}
          multiple
          offer={offer}
          onAccept={onAccept}
        />
      ))}

      <button className="secondary-action" type="button" onClick={onClose}>
        {hasDecision
          ? currentOffer && hasExternalOffers
            ? "Decline Offers"
            : currentOffer
              ? "Decline Extension"
              : "Reject Interest"
          : window.kind === "end-season"
            ? "Review Season"
            : "Stay Focused"}
      </button>
    </section>
  );
}


function ContractOfferCard({
  current,
  game,
  multiple,
  offer,
  onAccept,
}: {
  current: Contract;
  game: GameState;
  multiple: boolean;
  offer: ContractOffer;
  onAccept: (offer: ContractOffer) => void;
}) {
  const country = getCountryForClub(game.world, offer.clubId);

  return (
    <div className="card contract-offer-card">
      <div className="section-heading">
        <div>
          <span className="metric-label country-label">{country && <span className="flag-icon" aria-label={country.name}>{country.flag}</span>}{offer.club}</span>
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
      {multiple && (
        <button className="primary-action" type="button" onClick={() => onAccept(offer)}>
          Accept {offer.club}
        </button>
      )}
    </div>
  );
}


export function TrainingScreen({
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
  const focuses = getCurrentTrainingFocuses(game);
  const focus = focuses[0];
  const focusRange = projected.ranges[focus];
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


export function PreMatchScreen({ match }: { match: MatchState }) {
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


export function MatchMomentScreen({
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
  const liveReadiness = getLiveMatchReadiness(match, completedResults);
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
          <span>Readiness {liveReadiness}/100</span>
          <b>{getFitnessAvailability(liveReadiness)}</b>
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
          <InfoTile label="Readiness" value={`${liveReadiness}`} tone={liveReadiness < 40 ? "warn" : liveReadiness >= 60 ? "good" : undefined} />
          <InfoTile label="Rating" value={totals.rating.toFixed(1)} tone="gold" />
        </div>
      </div>
    </section>
  );
}


export function PostMatchSummaryScreen({ attributes, summary }: { attributes: Attribute[]; summary: LastMatchSummary }) {
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


export function WeekSummaryScreen({ game }: { game: GameState }) {
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
  const prestigeStatus = getPrestigeStatus(game.prestige);

  return (
    <section className="simple-screen week-summary-screen">
      <ScreenTitle label={`Week ${weekNumber} complete`} title="Week Summary" />

      <div className="card week-summary-hero">
        <div>
          <span className="metric-label">Net cash</span>
          <h2>+${match?.cashDelta ?? 0}</h2>
          <p>
            Wage ${match?.weeklyWage ?? game.contract.weeklyWage}
            {match ? ` + contract bonuses $${match.appearanceBonus + match.goalBonus + match.assistBonus}` : ""}
            {match && match.sponsorCashDelta > 0 ? ` + sponsor $${match.sponsorCashDelta}` : ""}
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
          <InfoTile label="Sponsor" value={`+$${match?.sponsorCashDelta ?? 0}`} tone={(match?.sponsorCashDelta ?? 0) > 0 ? "gold" : undefined} />
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
        <div className="match-hint">
          <Sparkles size={16} />
          <span>
            {prestigeStatus.next
              ? `${prestigeStatus.current.label}: ${prestigeStatus.pointsToNext} prestige to ${prestigeStatus.next.label}.`
              : `${prestigeStatus.current.label}: maximum prestige tier reached.`}
          </span>
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


export function SeasonReviewScreen({ game }: { game: GameState }) {
  const review = getSeasonReview(game);
  const contractOffer = getSeasonContractOffer(game, review);
  const stats = game.seasonStats;
  const goals = getSeasonGoals(game.season.results);
  const goalDifference = goals.for - goals.against;
  const prestigeAfterReward = getPrestigeStatus(game.prestige + review.prestigeReward);
  const country = getCountryForClub(game.world, game.club.clubId, game.club.shortCode);

  return (
    <section className="simple-screen season-review-screen">
      <ScreenTitle label={`Season ${game.season.season} complete`} title="Season Review" />

      <div className="card season-review-hero">
        <div>
          <span className="metric-label country-label">{country && <span className="flag-icon" aria-label={country.name}>{country.flag}</span>}{game.contract.club}</span>
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
          <InfoTile label="Status" value={prestigeAfterReward.current.label} tone="gold" />
          <InfoTile label="Interest" value={review.marketInterest} />
          <InfoTile label="Next tier" value={prestigeAfterReward.next ? `${prestigeAfterReward.pointsToNext} pts` : "Max"} />
          <InfoTile label="Sponsor" value={prestigeAfterReward.sponsorInterest} />
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


export function RetirementScreen({ game }: { game: GameState }) {
  const estimate = getLegacyEstimate(game);
  const nextGeneration = game.dynasty.generation + 1;

  return (
    <section className="simple-screen retirement-screen">
      <ScreenTitle label={`Age ${estimate.age}`} title="Retirement Decision" />

      <div className="card retirement-hero">
        <div>
          <span className="metric-label">Legacy estimate</span>
          <h2>{estimate.totalPoints}</h2>
          <p>{estimate.eligible ? `Bank points and begin Gen ${nextGeneration}.` : estimate.hint}</p>
        </div>
        <div className="season-review-badge">
          <Sparkles size={20} />
          <strong>Gen {game.dynasty.generation}</strong>
          <span>{estimate.momentum}</span>
        </div>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Multiplier</span>
            <h2>{estimate.multiplierLabel}</h2>
          </div>
          <Trophy size={19} />
        </div>
        <div className="selection-progress-card">
          <div>
            <strong>Base {estimate.basePoints}</strong>
            <span>x{estimate.multiplier.toFixed(2)}</span>
          </div>
          <ProgressBar value={Math.min(100, estimate.multiplier * 38)} />
        </div>
        <p>Higher divisions make the same career output worth more because the environment is harder.</p>
      </div>

      <div className="card">
        <span className="metric-label">Point sources</span>
        <div className="stat-grid">
          {estimate.components.map((component) => (
            <InfoTile key={component.label} label={component.label} value={`${component.value} / +${component.points}`} tone={component.points >= 25 ? "gold" : undefined} />
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Retirement advice</span>
            <h2>{estimate.momentum}</h2>
          </div>
          <ShieldCheck size={19} />
        </div>
        <p>{estimate.hint}</p>
        <div className="next-grid">
          <InfoTile label="Current LP" value={`${game.dynasty.legacyPoints}`} tone="gold" />
          <InfoTile label="After retire" value={`${game.dynasty.legacyPoints + estimate.totalPoints}`} tone="good" />
          <InfoTile label="Next gen" value={`Gen ${nextGeneration}`} />
        </div>
      </div>
    </section>
  );
}


export function TrainingSummaryScreen({
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

    </section>
  );
}


export function ClubScreen({ game }: { game: GameState }) {
  const [clubView, setClubView] = useState<ClubView>("overview");
  const seasonComplete = isSeasonComplete(game.season);
  const upcomingMatch = seasonComplete ? undefined : getUpcomingMatch(game);
  const strengthGap = upcomingMatch ? upcomingMatch.teamStrength - upcomingMatch.opponentStrength : 0;
  const outlook = strengthGap >= 4 ? "Favorable" : strengthGap <= -4 ? "Difficult" : "Balanced";
  const record = getSeasonRecord(game.season.results);
  const goals = getSeasonGoals(game.season.results);
  const table = getLeagueTable(game);
  const leagueTier = getClubLeagueTier(game.club);
  const country = getCountryForClub(game.world, game.club.clubId, game.club.shortCode);

  if (clubView === "fixtures") {
    return <ClubFixturesView game={game} onBack={() => setClubView("overview")} />;
  }

  if (clubView === "table") {
    return <ClubTableView game={game} onBack={() => setClubView("overview")} />;
  }

  return (
    <section className="simple-screen">
      <ScreenTitle label={country ? `${country.flag} ${country.name}` : "Club"} title={game.club.name} />
      <div className="card">
        <InfoRow label="League tier" value={leagueTier.name} />
        {country && <InfoRow label="Country" value={`${country.flag} ${country.name}`} />}
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


export function ClubFixturesView({ game, onBack }: { game: GameState; onBack: () => void }) {
  const country = getCountryForClub(game.world, game.club.clubId, game.club.shortCode);

  return (
    <section className="simple-screen club-detail-screen">
      <DetailHeader label={country ? `${country.flag} ${country.name}` : "Club"} title="Fixtures" onBack={onBack} />
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


export function ClubTableView({ game, onBack }: { game: GameState; onBack: () => void }) {
  const table = getLeagueTable(game);
  const country = getCountryForClub(game.world, game.club.clubId, game.club.shortCode);

  return (
    <section className="simple-screen club-detail-screen">
      <DetailHeader label={country ? `${country.flag} ${country.name}` : "Club"} title="League Table" onBack={onBack} />
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


export function HomeScreen({
  game,
  saveStatus,
  onBuySupportUpgrade,
  onBuyDynastyUpgrade,
  onAcceptSponsorDeal,
  onOpenRetirement,
  onResetCareer,
}: {
  game: GameState;
  saveStatus: "saved" | "unsaved";
  onBuySupportUpgrade: (upgradeId: SupportUpgradeId) => void;
  onBuyDynastyUpgrade: (upgradeId: DynastyUpgradeId) => void;
  onAcceptSponsorDeal: (dealId: string) => void;
  onOpenRetirement: () => void;
  onResetCareer: () => void;
}) {
  const [homeView, setHomeView] = useState<HomeView>("base");
  const currentSnapshot = createDynastySeasonSnapshot(game);
  const careerTotals = getDynastyTotals([...game.dynastyHistory, currentSnapshot]);
  const positionModule = getPositionModule(game.positionGroup);
  const potentialOvr = calculatePotentialOvr(game.attributes, positionModule.ovrWeights);
  const age = getPlayerAge(game);
  const legacyEstimate = getLegacyEstimate(game);

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
        <button className={homeView === "deals" ? "is-active" : ""} type="button" onClick={() => setHomeView("deals")}>
          Deals
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
      ) : homeView === "deals" ? (
        <DealsView game={game} onAcceptSponsorDeal={onAcceptSponsorDeal} />
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

          <div className="card retirement-card">
            <div className="section-heading">
              <div>
                <span className="metric-label">Legacy planning</span>
                <h2>{legacyEstimate.eligible ? `${legacyEstimate.totalPoints} points ready` : `Retire from age 30`}</h2>
              </div>
              <Sparkles size={19} />
            </div>
            <div className="next-grid">
              <InfoTile label="Age" value={`${age}`} />
              <InfoTile label="Current LP" value={`${game.dynasty.legacyPoints}`} tone="gold" />
              <InfoTile label="Estimate" value={`+${legacyEstimate.totalPoints}`} tone={legacyEstimate.eligible ? "good" : undefined} />
            </div>
            <p>{legacyEstimate.hint}</p>
            <button className="secondary-action" type="button" onClick={onOpenRetirement}>
              Review Retirement
            </button>
          </div>

          <div className="card">
            <div className="section-heading">
              <div>
                <span className="metric-label">Dynasty economy</span>
                <h2>Legacy upgrades</h2>
              </div>
              <Sparkles size={19} />
            </div>
            <div className="next-grid">
              <InfoTile label="Legacy Points" value={`${game.dynasty.legacyPoints}`} tone="gold" />
              <InfoTile label="Generation" value={`Gen ${game.dynasty.generation}`} />
              <InfoTile label="Scope" value="Permanent" />
            </div>
            <div className="match-hint">
              <Sparkles size={16} />
              <span>Legacy upgrades improve future generations and do not affect cash support in the current run.</span>
            </div>
          </div>

          <div className="support-shop-list">
            {dynastyTrackDefinitions.map((track) => (
              <DynastyTrackCard
                key={track.id}
                game={game}
                track={track}
                onBuyDynastyUpgrade={onBuyDynastyUpgrade}
              />
            ))}
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


export function DealsView({ game, onAcceptSponsorDeal }: { game: GameState; onAcceptSponsorDeal: (dealId: string) => void }) {
  const prestige = getPrestigeStatus(game.prestige);
  const sponsorOffers = getAvailableSponsorDeals(game);
  const sponsorUnlocked = prestige.tierIndex >= 1;
  const sponsorStatus = game.sponsor ? "Active" : sponsorUnlocked ? "Offers ready" : "Locked";
  const sponsorRequirement = game.sponsor
    ? `${game.sponsor.weeksRemaining} weeks left`
    : sponsorUnlocked
      ? prestige.sponsorInterest
      : `${prestige.pointsToNext} pts to Known Talent`;

  return (
    <>
      <div className="card deals-overview-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Career deals</span>
            <h2>Contract and sponsors</h2>
          </div>
          <BadgeDollarSign size={19} />
        </div>
        <div className="next-grid">
          <InfoTile label="Weekly wage" value={`$${game.contract.weeklyWage}`} tone="good" />
          <InfoTile label="Prestige" value={prestige.current.label} tone="gold" />
          <InfoTile label="Sponsor" value={sponsorStatus} tone={sponsorUnlocked ? "good" : undefined} />
        </div>
      </div>

      <ContractMarketCard game={game} />

      <div className="card sponsor-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Sponsor slot</span>
            <h2>{game.sponsor ? game.sponsor.name : sponsorUnlocked ? "Choose a deal" : "Build your name"}</h2>
          </div>
          <Sparkles size={19} />
        </div>
        {game.sponsor ? (
          <>
            <p>{game.sponsor.summary}</p>
            <div className="next-grid">
              <InfoTile label="Retainer" value={`$${game.sponsor.weeklyRetainer}/wk`} tone="good" />
              <InfoTile label="Objective" value={`+$${game.sponsor.objectiveBonus}`} tone="gold" />
              <InfoTile label="Pressure" value={formatSigned(game.sponsor.pressureModifier)} tone={game.sponsor.pressureModifier > 0 ? "warn" : "good"} />
            </div>
            <div className="match-hint">
              <Sparkles size={16} />
              <span>{game.sponsor.objective.label}. {game.sponsor.weeksRemaining} weeks remaining.</span>
            </div>
          </>
        ) : sponsorOffers.length ? (
          <div className="sponsor-offer-list">
            {sponsorOffers.map((offer) => (
              <div className="sponsor-offer-card" key={offer.id}>
                <div className="sponsor-offer-main">
                  <div>
                    <span className="metric-label">{offer.tierLabel}</span>
                    <h3>{offer.name}</h3>
                    <p>{offer.summary}</p>
                  </div>
                  <strong>${offer.weeklyRetainer}/wk</strong>
                </div>
                <div className="next-grid">
                  <InfoTile label="Objective" value={offer.objective.label} />
                  <InfoTile label="Bonus" value={`+$${offer.objectiveBonus}`} tone="gold" />
                  <InfoTile label="Pressure" value={formatSigned(offer.pressureModifier)} tone={offer.pressureModifier > 0 ? "warn" : "good"} />
                </div>
                <div className="sponsor-offer-footer">
                  <span>{offer.weeksRemaining} weeks</span>
                  <button type="button" onClick={() => onAcceptSponsorDeal(offer.id)}>
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="contract-hero">
              <div>
                <span>Status</span>
                <strong>{sponsorStatus}</strong>
              </div>
              <div>
                <span>Access</span>
                <strong>{sponsorRequirement}</strong>
              </div>
            </div>
            <div className="match-hint">
              <Sparkles size={16} />
              <span>Sponsors start paying attention once you reach Known Talent.</span>
            </div>
          </>
        )}
      </div>
    </>
  );
}


export function SupportShopView({
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



export function CountrySelectScreen({ countries, onPick }: { countries: Country[]; onPick: (id: CountryId) => void }) {
  return (
    <section className="simple-screen country-select-screen">
      <ScreenTitle label="New career" title="Choose your country" />

      {countries.map((country) => (
        <button key={country.id} className="card country-option" type="button" onClick={() => onPick(country.id)}>
          <span className="country-flag" aria-label={country.name}>{country.flag}</span>
          <div>
            <h2>{country.name}</h2>
            <span>{country.tiers.length} divisions</span>
          </div>
        </button>
      ))}
    </section>
  );
}
