import { attributeInfo } from "../data/attributes";
import { dynastyTrackDefinitions } from "../data/dynastyUpgrades";
import { supportTrackDefinitions } from "../data/support";
import { getPlayerRoleLabel, getPositionModule } from "../positionRoles";
import { getAttributeXpRequirement } from "../systems/attributeXp";
import { formatSigned, getMatchupText, getMoraleLabel, getTopXpEntry, getTrainingIntensityLabel, sumXp } from "../systems/formatting";
import { createFollowUpMoment, getAppearanceText, getLiveCommentary, getLiveMatchReadiness, getLiveMatchStats, getLivePlayerStats, getManagerMatchBrief, getMatchFitnessDelta, getPitchStatus, getPreMatchEntryPlan, getRecentTimelineItems, getResultConsequence, getResultExecutionText, getResultPopupLabel, getResultPopupTone, getResultVerdictText, getTimelineScore, summarizeMatchResults, summarizeSimEvents } from "../systems/match";
import { calculateOvr, getClubLeagueTier, getXpPercent } from "../systems/ovr";
import { getLegacyEstimate, getPlayerAge } from "../systems/legacy";
import { getEstateCost, getEstateHeirCash } from "../systems/estate";
import { getPrestigeStatus } from "../systems/prestige";
import { createDynastySeasonSnapshot, getDynastyTotals, getLeagueTable, getSeasonContractOffer, getSeasonReview } from "../systems/season";
import { getCurrentFixture, getRecentFormText, getSeasonGoals, getSeasonRecord, getTeamFormScore, isSeasonComplete } from "../systems/seasonState";
import { getFitnessAvailability, getNextRole, getRoleThreshold, getUpcomingMatch } from "../systems/selection";
import { getAvailableSponsorDeals } from "../systems/sponsors";
import { getSupportUpgradeTotal } from "../systems/support";
import { getAttributeGrowthDetail, getCurrentTrainingFocuses, getTrainingFocusCapacity, getTrainingFocusUnlockLabel, getTrainingFocusWeight, getTrainingProjection } from "../systems/training";
import { getCountryForClub } from "../systems/world";
import { getClubProfile } from "../systems/clubProfile";
import { clamp } from "../utils";
import { CareerCard, ContractMarketCard, DynastySeasonRow, DynastyTrackCard, EquipmentFacilitiesCard, FixturePreviewList, LastMatchCard, LeagueTablePreview, MatchStatsCard, PrestigeStatusCard, ReadinessStrip, RelationshipsCard, SeasonContextCard, SeasonSnapshot, SelectionBriefingCard, SupportTrackCard } from "./cards";
import { ClubLink, CountryFlag, DetailHeader, FixtureStatusBadge, Header, InfoRow, InfoTile, LeagueTableRowView, MatchScoreHeader, ProgressBar, ProgressRow, ScreenTitle, SummaryScoreHeader, WeekNote } from "./shared";
import { Activity, ArrowRightLeft, BadgeDollarSign, BarChart3, CalendarDays, Check, Coins, Dumbbell, Home, Newspaper, ShieldCheck, Sparkles, Star, Target, Trophy, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AttributeKey } from "../positionRoles";
import type { Attribute, ChoiceOutcomePreview, ClubId, ClubView, Contract, ContractOffer, Country, CountryId, DynastyUpgradeId, FeedTextPart, GameState, HomeView, Intensity, LastMatchSummary, MatchChoice, MatchMentality, MatchMoment, MatchObjective, MatchSpeed, MatchState, NewCareerSetup, PlayerMatchEvent, SupportUpgradeId, TrainingSummary, TransferWindowState, Venue } from "../types";
import type { CSSProperties } from "react";

export function PlayerScreen({ game, onOpenClub }: { game: GameState; onOpenClub?: (identity: string) => void }) {
  return (
    <>
      <Header game={game} onOpenClub={onOpenClub} />
      <CareerCard game={game} />
      <ReadinessStrip game={game} />
      <PrestigeStatusCard game={game} />
      <SeasonContextCard game={game} onOpenClub={onOpenClub} />
      <SelectionBriefingCard game={game} />
      {game.lastMatch && <LastMatchCard summary={game.lastMatch} onOpenClub={onOpenClub} />}
      <SeasonSnapshot stats={game.seasonStats} />
      <RelationshipsCard game={game} />
    </>
  );
}


export function ContractOfferScreen({
  game,
  current,
  offers,
  onAccept,
  onDecline,
  onOpenClub,
}: {
  game: GameState;
  current: Contract;
  offers: ContractOffer[];
  onAccept: (offer: ContractOffer) => void;
  onDecline: (offer?: ContractOffer) => void;
  onOpenClub?: (identity: string) => void;
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
          onDecline={onDecline}
          onOpenClub={onOpenClub}
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
    </section>
  );
}


export function FreeAgentMarketScreen({ game }: { game: GameState }) {
  const weeks = game.freeAgent?.weeks ?? 0;
  const training = game.lastTraining;

  return (
    <section className="simple-screen contract-offer-screen">
      <ScreenTitle label="Contract market" title="Free Agent" />

      <div className="card free-agent-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Between clubs</span>
            <h2>{weeks === 0 ? "Waiting for calls" : `${weeks} week${weeks === 1 ? "" : "s"} out`}</h2>
          </div>
          <BadgeDollarSign size={19} />
        </div>
        <p>You are training away from a club setup. Your agent is looking for short trial terms, but weekly XP is reduced until you sign.</p>
        <div className="stat-grid">
          <InfoTile label="Club" value="None" tone="warn" />
          <InfoTile label="Wage" value="$0/wk" tone="warn" />
          <InfoTile label="Training XP" value="55%" />
          <InfoTile label="Market" value={weeks >= 2 ? "Active" : "Quiet"} tone={weeks >= 2 ? "good" : undefined} />
        </div>
      </div>

      <div className="card">
        <span className="metric-label">Latest solo work</span>
        <div className="next-grid">
          <InfoTile label="Focus" value={training?.focuses[0] ?? game.selectedFocus} />
          <InfoTile label="XP" value={training ? `+${sumXp(training.xp)}` : "None"} tone={training ? "good" : undefined} />
          <InfoTile label="Fitness" value={training ? formatSigned(training.fitnessDelta) : `${game.fitness}`} tone={(training?.fitnessDelta ?? 0) < 0 ? "warn" : "good"} />
        </div>
      </div>

      <WeekNote icon={<Activity size={16} />} text="Use Sim Week to keep training and wait for a new trial offer." />
    </section>
  );
}

export function TransferWindowScreen({
  game,
  window,
  onAccept,
  onDecline,
  onStay,
  onOpenClub,
}: {
  game: GameState;
  window: TransferWindowState;
  onAccept: (offer: ContractOffer) => void;
  onDecline: (offer: ContractOffer) => void;
  onStay: () => void;
  onOpenClub?: (identity: string) => void;
}) {
  const country = getCountryForClub(game.world, game.club.clubId, game.club.shortCode);
  const tier = getClubLeagueTier(game.club);
  const currentOffer = window.currentClubOffer;
  const hasExternalOffers = window.offers.length > 0;

  return (
    <section className="simple-screen transfer-window-screen">
      <ScreenTitle
        label={window.kind === "mid-season" ? `Season ${game.season.season} midpoint` : `Season ${game.season.season} complete`}
        title={window.title}
      />

      <div className="card transfer-window-hero">
        <div>
          <span className="metric-label country-label">{country && <CountryFlag country={country} />}Career market</span>
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
            <h2><ClubLink clubIdentity={game.club.clubId ?? game.club.shortCode} onOpenClub={onOpenClub}>{game.club.name}</ClubLink></h2>
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
          <div className="contract-action-row">
            <button className="secondary-action" type="button" onClick={() => onDecline(currentOffer)}>
              Decline
            </button>
            <button className="primary-action" type="button" onClick={() => onAccept(currentOffer)}>
              Accept Extension
            </button>
          </div>
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
          onDecline={onDecline}
          onOpenClub={onOpenClub}
        />
      ))}

      <button className="secondary-action transfer-stay-action" type="button" onClick={onStay}>
        <ShieldCheck size={17} />
        Stay at club
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
  onDecline,
  onOpenClub,
}: {
  current: Contract;
  game: GameState;
  multiple: boolean;
  offer: ContractOffer;
  onAccept: (offer: ContractOffer) => void;
  onDecline: (offer: ContractOffer) => void;
  onOpenClub?: (identity: string) => void;
}) {
  const country = getCountryForClub(game.world, offer.clubId);

  return (
    <div className="card contract-offer-card">
      <div className="section-heading">
        <div>
          <span className="metric-label country-label">
            {country && <CountryFlag country={country} />}
            <ClubLink clubIdentity={offer.clubId ?? offer.club} onOpenClub={onOpenClub}>{offer.club}</ClubLink>
          </span>
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
      <div className="contract-action-row">
        <button className="secondary-action" type="button" onClick={() => onDecline(offer)}>
          Decline
        </button>
        <button className="primary-action" type="button" onClick={() => onAccept(offer)}>
          Accept {multiple ? offer.club : "Offer"}
        </button>
      </div>
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
  const focusCapacity = getTrainingFocusCapacity(game);

  return (
    <section className="simple-screen">
      <ScreenTitle label="Training" title="Confirm session" />
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
      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Expected outcome</span>
            <h2>{getTrainingIntensityLabel(game.intensity)}</h2>
          </div>
          <Dumbbell size={19} />
        </div>
        <div className="training-outcome-grid">
          <InfoTile label="Fitness" value={`${game.fitness}`} tone={game.fitness >= 60 ? "good" : game.fitness < 40 ? "warn" : undefined} />
          <InfoTile label="Focus slots" value={`${focusCapacity}`} />
          <InfoTile label="XP range" value={focusRange ? `${focusRange.min}-${focusRange.max}` : "None"} tone="good" />
          <InfoTile label="Fitness impact" value={`${projected.fitnessDelta}`} tone={projected.fitnessDelta < 0 ? "warn" : "good"} />
        </div>
      </div>

      <div className="card training-slot-card">
        <div className="training-focus-heading">
          <span className="metric-label">Stat focus</span>
          <strong>{getTrainingFocusUnlockLabel(game)}</strong>
        </div>
        <div className="training-focus-slots" aria-label="Selected training focus slots">
          {Array.from({ length: focusCapacity }, (_, index) => {
            const selected = focuses[index];
            const efficiency = Math.round(getTrainingFocusWeight(game, index) * 100);
            return (
              <div className={`training-focus-slot ${selected ? "is-filled" : ""}`} key={`focus-slot-${index + 1}`}>
                <span>Slot {index + 1}</span>
                <strong>{selected ?? "Choose stat"}</strong>
                <small>{efficiency}% XP</small>
              </div>
            );
          })}
        </div>
        <div className="training-key-legend">
          <Star size={12} aria-hidden="true" />
          <span>Key attributes for a {getPlayerRoleLabel(game.positionGroup)}</span>
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
                <span className="stat-focus-name">
                  {attribute.label}
                  {isKeyAttribute && <Star className="stat-focus-key-mark" size={11} aria-label="Key attribute" />}
                </span>
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
    </section>
  );
}


const MENTALITY_OPTIONS: { id: MatchMentality; label: string; hint: string }[] = [
  { id: "hold", label: "Hold", hint: "See it out - control & safer plays" },
  { id: "balanced", label: "Balanced", hint: "Play it as it comes" },
  { id: "push", label: "Push", hint: "Chase it - attacking & bolder plays" },
];

function MentalityDial({
  mentality,
  onSetMentality,
  compact,
}: {
  mentality: MatchMentality;
  onSetMentality: (mentality: MatchMentality) => void;
  compact?: boolean;
}) {
  return (
    <div className={`mentality-dial${compact ? " mentality-dial-compact" : ""}`}>
      {!compact && <span className="metric-label">Match approach</span>}
      <div className="mentality-options" role="group" aria-label="Match approach">
        {MENTALITY_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`mentality-option mentality-${option.id}${mentality === option.id ? " is-active" : ""}`}
            aria-pressed={mentality === option.id}
            onClick={() => onSetMentality(option.id)}
          >
            <span className="mentality-option-label">{option.label}</span>
            {!compact && <span className="mentality-option-hint">{option.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function getObjectiveSourceLabel(_source: MatchObjective["source"]): string {
  return "Sponsor";
}

function formatObjectiveReward(reward: MatchObjective["reward"]): string {
  const bits = [
    reward.cash ? `+$${reward.cash}` : "",
    reward.prestige ? `+${reward.prestige} prestige` : "",
    reward.trust ? `+${reward.trust} trust` : "",
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "Pride";
}

export function PreMatchScreen({
  match,
  mentality,
  onSetMentality,
  onOpenClub,
}: {
  match: MatchState;
  mentality: MatchMentality;
  onSetMentality: (mentality: MatchMentality) => void;
  onOpenClub?: (identity: string) => void;
}) {
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
        onOpenClub={onOpenClub}
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

      {match.objective && (
        <div className="card pre-match-objective-card">
          <div className="objective-head">
            <span className="metric-label">Personal objective</span>
            <em className={`objective-tag objective-${match.objective.source}`}>{getObjectiveSourceLabel(match.objective.source)}</em>
          </div>
          <h2>{match.objective.label}</h2>
          <p>{match.objective.detail}</p>
          <span className="objective-reward">Reward: {formatObjectiveReward(match.objective.reward)}</span>
        </div>
      )}

      <div className="card pre-match-mentality-card">
        <span className="metric-label">Your approach</span>
        <p className="mentality-blurb">Set how you'll play it. You can change this live during the match.</p>
        <MentalityDial mentality={mentality} onSetMentality={onSetMentality} />
      </div>

      <div className="card">
        <span className="metric-label">Opponent context</span>
        <div className="next-grid">
          <InfoTile label="Opponent" value={<ClubLink clubIdentity={match.opponent} onOpenClub={onOpenClub}>{match.opponent}</ClubLink>} />
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


function getManagerLeanLabel(manager: MatchChoice["manager"]) {
  return manager === "Likes" ? "Coach likes" : manager === "Risky" ? "Coach wary" : "Coach neutral";
}

function getManagerLeanTone(manager: MatchChoice["manager"]) {
  return manager === "Likes" ? "like" : manager === "Risky" ? "wary" : "neutral";
}

export function MatchMomentScreen({
  match,
  matchSpeed,
  mentality,
  onSetMentality,
  getChoiceOutcomePreview,
  onChoose,
  onContinue,
  onSetMatchSpeed,
  onSkipToEvent,
  onSkipToHighlight,
  onSkipToFullTime,
  onOpenClub,
}: {
  match: MatchState;
  matchSpeed: MatchSpeed;
  mentality: MatchMentality;
  onSetMentality: (mentality: MatchMentality) => void;
  getChoiceOutcomePreview: (moment: MatchMoment, choice: MatchChoice) => ChoiceOutcomePreview;
  onChoose: (choice: MatchChoice) => void;
  onContinue: () => void;
  onSetMatchSpeed: (speed: MatchSpeed) => void;
  onSkipToEvent: () => void;
  onSkipToHighlight: () => void;
  onSkipToFullTime: () => void;
  onOpenClub?: (identity: string) => void;
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
  const matchStats = getLiveMatchStats(match, processedEventIndex);
  const liveCommentary = getLiveCommentary(match, completedResults, processedEventIndex);
  const livePlayerStats = getLivePlayerStats(completedResults, totals.rating);
  const nextEventMinute = event ? `${event.minute}'` : "FT";
  const pitchStatus = getPitchStatus(match);
  const followUpQueued =
    event?.type === "player_moment" && match.currentResult
      ? Boolean(createFollowUpMoment(match, event, match.currentResult))
      : false;
  const selectedChoice =
    event?.type === "player_moment" && match.currentResult
      ? event.choices.find((choice) => choice.id === match.currentResult?.choiceId)
      : undefined;
  const resultConsequence = match.currentResult
    ? getResultConsequence(match.currentResult, followUpQueued)
    : undefined;
  const directorPhase =
    event?.type === "player_moment" && event.directorPhase
      ? formatMatchPhase(event.directorPhase)
      : undefined;

  return (
    <section className="simple-screen match-screen">
      <MatchScoreHeader
        liveMinute={match.liveMinute}
        match={match}
        opponentGoals={visibleScore.opponentGoals}
        teamGoals={visibleScore.teamGoals}
        onOpenClub={onOpenClub}
      />

      {!isPlayerMoment && (
        <div className="match-progress-card">
          <span>
            {match.isComplete ? "Full time" : `Live - next ${nextEventMinute}`}
          </span>
          <ProgressBar value={(match.liveMinute / 90) * 100} />
        </div>
      )}

      {!isPlayerMoment && <MatchStatsCard stats={matchStats} />}

      {!match.isComplete && (
        <div className="match-mentality-bar">
          <span className="metric-label">Approach</span>
          <MentalityDial mentality={mentality} onSetMentality={onSetMentality} compact />
        </div>
      )}

      {!isPlayerMoment && (
        <div className={`match-role-card ${pitchStatus.tone}`}>
          <div>
            <span className="metric-label">Player status</span>
            <strong>{pitchStatus.label}</strong>
            <small>{pitchStatus.detail}</small>
          </div>
          <div className="match-role-meta">
            <span>Fitness {liveReadiness}/100</span>
            <b>{getFitnessAvailability(liveReadiness)}</b>
          </div>
        </div>
      )}

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
            <h2>{isPlayerMoment ? event.situation : match.isComplete ? "Final whistle" : liveCommentary.title}</h2>
          </div>
          {isPlayerMoment ? <Target size={19} /> : <Activity size={19} />}
        </div>
        <p>
          {isPlayerMoment
            ? event.context
            : match.isComplete
              ? "The match is over. Review the final output and return to your player dashboard."
              : liveCommentary.detail}
        </p>
      </div>

      {!isPlayerMoment && (
        <div className="card timeline-log-card">
          <span className="metric-label">Timeline</span>
          <div className="timeline-list">
            {recentEvents.length > 0 ? (
              recentEvents.map((item) => (
                <div className={`timeline-item tone-${item.tone}`} key={item.id}>
                  <span className="timeline-event-icon" aria-hidden="true">
                    {getTimelineEventIcon(item.kind)}
                  </span>
                  <strong>{item.minute}'</strong>
                  <span>{item.text}</span>
                </div>
              ))
          ) : (
              <div className="timeline-item">
                <span className="timeline-event-icon" aria-hidden="true"><Activity size={13} /></span>
                <strong>0'</strong>
                <span>Kickoff. {match.teamShortName} settle into shape.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {isPlayerMoment && !match.currentResult && (
        <div className="card choice-preview">
          {event.choices.map((choice) => {
            const preview = getChoiceOutcomePreview(event, choice);
            return (
              <button className="match-choice" key={choice.id} type="button" onClick={() => onChoose(choice)}>
                <span className="match-choice-heading">
                  <strong>{choice.label}</strong>
                  <small>Stats used: {choice.uses.join(" + ")}</small>
                </span>
                <span className="choice-outcome-preview">
                  <span className="choice-outcome-bar" aria-hidden="true">
                    {preview.outcomes.map((outcome) => (
                      <span
                        className={`choice-outcome-seg tone-${outcome.tone}`}
                        key={outcome.label}
                        style={{ width: `${outcome.percentage}%` }}
                      />
                    ))}
                  </span>
                  <span className="choice-outcome-legend">
                    {preview.outcomes.filter((outcome) => outcome.percentage > 0).map((outcome) => (
                      <span className={`tone-${outcome.tone}`} key={outcome.label}>
                        {outcome.label} <strong>{outcome.percentage}%</strong>
                      </span>
                    ))}
                  </span>
                </span>
                <span className="choice-tags choice-tags-minimal">
                  <em className={`choice-manager manager-${getManagerLeanTone(choice.manager)}`}>{getManagerLeanLabel(choice.manager)}</em>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isPlayerMoment && match.currentResult && (
        <div className="result-popup-backdrop">
          <div className={`card result-card result-popup ${getResultPopupTone(match.currentResult)}`}>
            <span className="metric-label">{getResultPopupLabel(match.currentResult)}</span>
            <div className="result-verdict">
              <div>
                <span>{match.currentResult.choiceLabel}</span>
                <strong>{getResultVerdictText(match.currentResult)}</strong>
              </div>
              <span>{match.currentResult.chanceQuality}</span>
            </div>
            <h2>{match.currentResult.title}</h2>
            <p>{match.currentResult.detail}</p>
            <div className="result-reason-grid">
              <div>
                <span>Attributes used</span>
                <strong>{selectedChoice ? selectedChoice.uses.join(" + ") : "Match attributes"}</strong>
              </div>
              <div>
                <span>Chance context</span>
                <strong>{match.currentResult.chanceQuality}</strong>
              </div>
              <div>
                <span>Execution</span>
                <strong>{getResultExecutionText(match.currentResult)}</strong>
              </div>
            </div>
            {resultConsequence && (
              <div className={`result-consequence tone-${resultConsequence.tone}`}>
                <span>{resultConsequence.label}</span>
                <strong>{resultConsequence.title}</strong>
                <small>{resultConsequence.detail}</small>
              </div>
            )}
            <div className="next-grid">
              <InfoTile label="Rating" value={match.currentResult.rating.toFixed(1)} tone="gold" />
              <InfoTile label="Trust" value={`${match.currentResult.trustDelta > 0 ? "+" : ""}${match.currentResult.trustDelta}`} />
              <InfoTile label="Fitness" value={`${match.currentResult.fitnessDelta}`} tone="warn" />
            </div>
            <button className="primary-action" type="button" onClick={onContinue}>
              {followUpQueued ? "Continue Move" : "Resume Match"}
            </button>
          </div>
        </div>
      )}

      {!isPlayerMoment && (
        <div className="card match-summary-card">
          <span className="metric-label">Live player stats</span>
          <div className="live-player-stat-grid">
            <div><span>Rating</span><strong className="gold">{livePlayerStats.rating.toFixed(1)}</strong></div>
            <div><span>Actions</span><strong>{livePlayerStats.successfulActions}/{livePlayerStats.actions}</strong></div>
            <div><span>Shots</span><strong>{livePlayerStats.shots}</strong></div>
            <div><span>On target</span><strong>{livePlayerStats.shotsOnTarget}</strong></div>
            <div><span>Key passes</span><strong>{livePlayerStats.keyPasses}</strong></div>
            <div><span>Fitness</span><strong className={liveReadiness < 40 ? "warn" : liveReadiness >= 60 ? "good" : ""}>{liveReadiness}</strong></div>
          </div>
        </div>
      )}
    </section>
  );
}


export function PostMatchSummaryScreen({ attributes, summary, onOpenClub }: { attributes: Attribute[]; summary: LastMatchSummary; onOpenClub?: (identity: string) => void }) {
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
  const managerBrief = getManagerMatchBrief(summary);

  return (
    <section className="simple-screen summary-screen">
      <SummaryScoreHeader summary={summary} onOpenClub={onOpenClub} />

      <div className="card summary-hero-card">
        <div className="summary-hero-rating">
          <strong>{summary.rating.toFixed(1)}</strong>
          <span>Rating</span>
        </div>
        <div className="summary-hero-meta">
          <span className="metric-label">{summary.venue} · {summary.playerRole}</span>
          <div className="summary-hero-stats">
            <span><b className={summary.goals > 0 ? "gold" : ""}>{summary.goals}</b> goals</span>
            <span><b>{summary.assists}</b> assists</span>
            <span><b className={summary.chancesCreated > 0 ? "good" : ""}>{summary.chancesCreated}</b> chances</span>
          </div>
        </div>
      </div>

      {summary.objective && (
        <div className={`card summary-objective-card ${summary.objective.completed ? "is-complete" : "is-missed"}`}>
          <div className="objective-head">
            <span className="metric-label">Personal objective</span>
            <em className={`objective-tag ${summary.objective.completed ? "objective-complete" : "objective-missed"}`}>
              {summary.objective.completed ? "Completed" : "Missed"}
            </em>
          </div>
          <h2>{summary.objective.objective.label}</h2>
          <p>
            {summary.objective.completed
              ? `Reward banked: ${formatObjectiveReward(summary.objective.objective.reward)}.`
              : summary.objective.objective.detail}
          </p>
        </div>
      )}

      <div className={`card manager-verdict-card tone-${managerBrief.tone}`}>
        <div className="section-heading">
          <div>
            <span className="metric-label">Manager's verdict</span>
            <h2>{managerBrief.tone === "happy" ? "Pleased" : managerBrief.tone === "unhappy" ? "Not good enough" : "Room to grow"}</h2>
          </div>
          <ShieldCheck size={19} />
        </div>
        <div className="verdict-list">
          {managerBrief.praise.map((point) => (
            <div className="verdict-item is-praise" key={point}>
              <Check size={15} />
              <span>{point}</span>
            </div>
          ))}
          {managerBrief.concerns.map((point) => (
            <div className="verdict-item is-concern" key={point}>
              <X size={15} />
              <span>{point}</span>
            </div>
          ))}
        </div>
      </div>

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


function getTrainingRevealTier(rollRatio: number) {
  if (rollRatio >= 0.92) {
    return { label: "Breakthrough roll", className: "is-breakthrough", copy: "Almost everything clicked." };
  }
  if (rollRatio >= 0.72) {
    return { label: "Sharp session", className: "is-sharp", copy: "A strong return from the work." };
  }
  if (rollRatio >= 0.42) {
    return { label: "Solid session", className: "is-solid", copy: "Useful progress banked." };
  }
  return { label: "Low roll", className: "is-low", copy: "The work counts, but the gains stayed modest." };
}


export function TrainingRevealScreen({ summary }: { summary: TrainingSummary }) {
  const xpEntries = summary.focuses
    .map((focus) => ({ focus, xp: summary.xp[focus] ?? 0, range: summary.ranges[focus] }))
    .filter((entry) => entry.xp > 0 || entry.range);
  const totalXp = xpEntries.reduce((sum, entry) => sum + entry.xp, 0);
  const totalMin = xpEntries.reduce((sum, entry) => sum + (entry.range?.min ?? 0), 0);
  const totalMax = xpEntries.reduce((sum, entry) => sum + (entry.range?.max ?? 0), 0);
  const rollRatio = totalMax > totalMin ? clamp((totalXp - totalMin) / (totalMax - totalMin), 0, 1) : totalXp > 0 ? 1 : 0;
  const meterValue = totalMax > 0 ? clamp((totalXp / totalMax) * 100, 0, 100) : 0;
  const tier = getTrainingRevealTier(rollRatio);
  const [displayXp, setDisplayXp] = useState(0);

  useEffect(() => {
    const duration = 1450 + Math.round(rollRatio * 550);
    let frame = 0;
    const startedAt = window.performance.now();

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const progress = clamp(elapsed / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayXp(Math.round(totalXp * eased));

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [rollRatio, totalXp]);

  const revealStyle = {
    "--training-reveal-progress": `${meterValue}%`,
    "--training-reveal-duration": `${1450 + Math.round(rollRatio * 550)}ms`,
  } as CSSProperties;

  return (
    <section className="simple-screen training-reveal-screen">
      <ScreenTitle label={`Week ${summary.week} training`} title="Training Result" />

      <div className={`card training-reveal-card ${tier.className}`} style={revealStyle}>
        <div className="training-reveal-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="training-reveal-topline">
          <span className="metric-label">{summary.intensity} intensity</span>
          <Dumbbell size={20} />
        </div>
        <div className="training-reveal-score" aria-live="polite">
          <strong>+{displayXp}</strong>
          <span>XP</span>
        </div>
        <div className="training-reveal-meter" aria-label={`${totalXp} XP gained out of ${totalMax} possible`}>
          <span />
        </div>
        <div className="training-reveal-result">
          <strong>{tier.label}</strong>
          <p>{tier.copy}</p>
        </div>
      </div>

      <div className="card training-reveal-details">
        <div className="section-heading">
          <div>
            <span className="metric-label">XP outcome</span>
            <h2>{summary.qualityLabel}</h2>
          </div>
          <Sparkles size={19} />
        </div>
        <div className="xp-list">
          {xpEntries.map((entry) => (
            <div className="xp-item" key={entry.focus}>
              <span>{entry.focus}</span>
              <strong>
                +{entry.xp} XP
                {entry.range ? <small>{entry.range.min}-{entry.range.max}</small> : null}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <WeekNote icon={<Activity size={16} />} text="Review the exact attribute and career impact on the summary screen." />
    </section>
  );
}


export function WeekSummaryScreen({ game, onOpenClub }: { game: GameState; onOpenClub?: (identity: string) => void }) {
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
          <InfoTile
            label={seasonComplete ? "Status" : "Next"}
            value={seasonComplete ? "Review" : nextFixture ? <ClubLink clubIdentity={nextFixture.opponent} onOpenClub={onOpenClub}>{nextFixture.opponentShort}</ClubLink> : "-"}
            tone={seasonComplete ? "gold" : undefined}
          />
        </div>
      </div>

      <div className="card week-summary-feed-hint">
        <Newspaper size={18} />
        <span>This week's headlines are next.</span>
      </div>
    </section>
  );
}


// Dedicated weekly News Feed beat: the week's 1-5 stories get their own screen between the week
// summary and ending the week, instead of a single teaser tucked into the summary.
export function NewsFeedScreen({ game, onOpenClub }: { game: GameState; onOpenClub?: (identity: string) => void }) {
  const stories = game.worldFeed.filter((story) => story.week === game.week && story.season === game.season.season);

  return (
    <section className="simple-screen news-feed-screen">
      <ScreenTitle label={`Week ${game.week} · Season ${game.season.season}`} title="The Feed" />

      <div className="card news-feed-intro">
        <div className="section-heading">
          <div>
            <span className="metric-label">Around the football world</span>
            <h2>{stories.length} {stories.length === 1 ? "story" : "stories"} this week</h2>
          </div>
          <Newspaper size={20} />
        </div>
      </div>

      {stories.length === 0 ? (
        <div className="card feed-empty">
          <Newspaper size={22} />
          <h2>A quiet week</h2>
          <p>No headlines broke this week — sometimes the football world simply moves on.</p>
        </div>
      ) : (
        <div className="feed-story-list">
          {stories.map((story) => (
            <article className={`feed-story tone-${story.tone}`} key={story.id}>
              <div className="feed-story-meta">
                <strong>{story.source}</strong>
                <span>{story.category}</span>
              </div>
              <h3><FeedText parts={story.headline} onOpenClub={onOpenClub} /></h3>
              <p><FeedText parts={story.body} onOpenClub={onOpenClub} /></p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


export function SeasonReviewScreen({ game, onOpenClub }: { game: GameState; onOpenClub?: (identity: string) => void }) {
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
          <span className="metric-label country-label">
            {country && <CountryFlag country={country} />}
            <ClubLink clubIdentity={game.club.clubId ?? game.club.shortCode} onOpenClub={onOpenClub}>{game.contract.club}</ClubLink>
          </span>
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
          {summary.focuses.map((focus) => (
            <span className="soft-chip" key={`${focus}-actual`}>
              {focus} +{summary.xp[focus] ?? 0} XP
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


export function ClubScreen({
  game,
  onOpenClub,
  view,
  onViewChange,
}: {
  game: GameState;
  onOpenClub?: (identity: string) => void;
  view: ClubView;
  onViewChange: (view: ClubView) => void;
}) {
  const seasonComplete = isSeasonComplete(game.season);
  const upcomingMatch = seasonComplete ? undefined : getUpcomingMatch(game);
  const strengthGap = upcomingMatch ? upcomingMatch.teamStrength - upcomingMatch.opponentStrength : 0;
  const outlook = strengthGap >= 4 ? "Favorable" : strengthGap <= -4 ? "Difficult" : "Balanced";
  const record = getSeasonRecord(game.season.results);
  const goals = getSeasonGoals(game.season.results);
  const table = getLeagueTable(game);
  const leagueTier = getClubLeagueTier(game.club);
  const country = getCountryForClub(game.world, game.club.clubId, game.club.shortCode);

  if (view === "fixtures") {
    return <ClubFixturesView game={game} onBack={() => onViewChange("overview")} onOpenClub={onOpenClub} />;
  }

  if (view === "table") {
    return <ClubTableView game={game} onBack={() => onViewChange("overview")} onOpenClub={onOpenClub} />;
  }

  return (
    <section className="simple-screen">
      <ScreenTitle
        label={country ? <span className="country-label"><CountryFlag country={country} />{country.name}</span> : "Club"}
        title={<ClubLink clubIdentity={game.club.clubId ?? game.club.shortCode} onOpenClub={onOpenClub}>{game.club.name}</ClubLink>}
      />
      <div className="card">
        <InfoRow label="League tier" value={leagueTier.name} />
        {country && <InfoRow label="Country" value={<span className="country-label"><CountryFlag country={country} />{country.name}</span>} />}
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
      <div className="card club-drill-card">
        <button className="club-drill-open" type="button" onClick={() => onViewChange("fixtures")}>
          <div>
            <span className="metric-label">Upcoming fixtures</span>
            <h2>Next 5 matches</h2>
          </div>
          <CalendarDays size={19} />
        </button>
        <FixturePreviewList season={game.season} onOpenClub={onOpenClub} />
      </div>
      <div className="card club-drill-card">
        <button className="club-drill-open" type="button" onClick={() => onViewChange("table")}>
          <div>
            <span className="metric-label">League table</span>
            <h2>{leagueTier.name}</h2>
          </div>
          <Trophy size={19} />
        </button>
        <LeagueTablePreview table={table} playerClubShort={game.club.shortCode} onOpenClub={onOpenClub} />
      </div>
      <div className="card split-card">
        <div>
          <span className="metric-label">{seasonComplete ? "Status" : "Next match"}</span>
          <h2>
            {upcomingMatch
              ? <ClubLink clubIdentity={upcomingMatch.opponent} onOpenClub={onOpenClub}>{upcomingMatch.opponentShort}</ClubLink>
              : "Season complete"}
          </h2>
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
      <EquipmentFacilitiesCard />
    </section>
  );
}


export function ClubFixturesView({ game, onBack, onOpenClub }: { game: GameState; onBack: () => void; onOpenClub?: (identity: string) => void }) {
  const country = getCountryForClub(game.world, game.club.clubId, game.club.shortCode);

  return (
    <section className="simple-screen club-detail-screen">
      <DetailHeader label={country ? <span className="country-label"><CountryFlag country={country} />{country.name}</span> : "Club"} title="Fixtures" onBack={onBack} />
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
                  <ClubLink clubIdentity={fixture.opponent} onOpenClub={onOpenClub}>{fixture.opponentShort}</ClubLink>
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


export function ClubTableView({ game, onBack, onOpenClub }: { game: GameState; onBack: () => void; onOpenClub?: (identity: string) => void }) {
  const table = getLeagueTable(game);
  const country = getCountryForClub(game.world, game.club.clubId, game.club.shortCode);

  return (
    <section className="simple-screen club-detail-screen">
      <DetailHeader label={country ? <span className="country-label"><CountryFlag country={country} />{country.name}</span> : "Club"} title="League Table" onBack={onBack} />
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
            <LeagueTableRowView key={row.short} row={row} playerClubShort={game.club.shortCode} onOpenClub={onOpenClub} />
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
  onInvestEstate,
  onAcceptSponsorDeal,
  onOpenRetirement,
  onResetCareer,
  onOpenClub,
  view,
  onViewChange,
}: {
  game: GameState;
  saveStatus: "saved" | "unsaved";
  onBuySupportUpgrade: (upgradeId: SupportUpgradeId) => void;
  onBuyDynastyUpgrade: (upgradeId: DynastyUpgradeId) => void;
  onInvestEstate: () => void;
  onAcceptSponsorDeal: (dealId: string) => void;
  onOpenRetirement: () => void;
  onResetCareer: () => void;
  onOpenClub?: (identity: string) => void;
  view: HomeView;
  onViewChange: (view: HomeView) => void;
}) {
  const currentSnapshot = createDynastySeasonSnapshot(game);
  const careerTotals = getDynastyTotals([...game.dynastyHistory, currentSnapshot]);
  const age = getPlayerAge(game);
  const legacyEstimate = getLegacyEstimate(game);

  return (
    <section className="simple-screen">
      <ScreenTitle label="Home" title="Private base" />

      <div className="subtab-control" role="tablist" aria-label="Home sections">
        <button className={view === "base" ? "is-active" : ""} type="button" onClick={() => onViewChange("base")}>
          Base
        </button>
        <button className={view === "support" ? "is-active" : ""} type="button" onClick={() => onViewChange("support")}>
          Support
        </button>
        <button className={view === "feed" ? "is-active" : ""} type="button" onClick={() => onViewChange("feed")}>
          Feed
        </button>
        <button className={view === "deals" ? "is-active" : ""} type="button" onClick={() => onViewChange("deals")}>
          Deals
        </button>
        <button className={view === "dynasty" ? "is-active" : ""} type="button" onClick={() => onViewChange("dynasty")}>
          Dynasty
        </button>
      </div>

      {view === "base" ? (
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
              <span className="metric-label">Career age</span>
              <h2>{age}</h2>
              <p>{legacyEstimate.eligible ? "Retirement eligible" : "Building career"}</p>
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
      ) : view === "support" ? (
        <SupportShopView game={game} onBuySupportUpgrade={onBuySupportUpgrade} />
      ) : view === "feed" ? (
        <FeedView game={game} onOpenClub={onOpenClub} />
      ) : view === "deals" ? (
        <DealsView game={game} onAcceptSponsorDeal={onAcceptSponsorDeal} onOpenClub={onOpenClub} />
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
            </div>
            <div className="match-hint">
              <Sparkles size={16} />
              <span>Legacy upgrades improve future generations and do not affect cash support in the current run.</span>
            </div>
          </div>

          <div className="card">
            <div className="section-heading">
              <div>
                <span className="metric-label">Family trust fund</span>
                <h2>Estate level {game.dynasty.estate}</h2>
              </div>
              <Coins size={19} />
            </div>
            <div className="next-grid">
              <InfoTile label="Cash" value={`$${game.cash.toLocaleString()}`} tone="gold" />
              <InfoTile label="Heir inherits" value={`$${getEstateHeirCash(game.dynasty).toLocaleString()}`} tone="good" />
              <InfoTile label="Next level" value={`+$${(getEstateHeirCash({ estate: game.dynasty.estate + 1 }) - getEstateHeirCash(game.dynasty)).toLocaleString()}`} />
            </div>
            <div className="match-hint">
              <Coins size={16} />
              <span>Bank surplus cash for your heir's starting capital — your money either improves you now or sets up your child.</span>
            </div>
            <button
              className="secondary-action"
              type="button"
              disabled={game.cash < getEstateCost(game.dynasty.estate)}
              onClick={onInvestEstate}
            >
              Invest ${getEstateCost(game.dynasty.estate).toLocaleString()}
            </button>
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
                <h2>{game.player.firstName} {game.player.lastName}</h2>
              </div>
              <BarChart3 size={19} />
            </div>
            <div className="dynasty-list">
              {[...game.dynastyHistory].reverse().map((season) => (
                <DynastySeasonRow key={season.season} season={season} onOpenClub={onOpenClub} />
              ))}
              <DynastySeasonRow current season={currentSnapshot} onOpenClub={onOpenClub} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}


export function FeedView({ game, onOpenClub }: { game: GameState; onOpenClub?: (identity: string) => void }) {
  const grouped = game.worldFeed.reduce<Record<string, typeof game.worldFeed>>((groups, story) => {
    const key = `Season ${story.season} · Week ${story.week}`;
    groups[key] = [...(groups[key] ?? []), story];
    return groups;
  }, {});

  return (
    <div className="feed-view">
      <div className="feed-header">
        <div>
          <span className="metric-label">Football world</span>
          <h2>The Feed</h2>
        </div>
        <Newspaper size={20} />
      </div>
      {game.worldFeed.length === 0 ? (
        <div className="card feed-empty">
          <Newspaper size={22} />
          <h2>The first stories are coming</h2>
          <p>Complete a matchweek to see results, form, milestones and market news from your football world.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([label, stories]) => (
          <section className="feed-week" key={label}>
            <span className="feed-week-label">{label}</span>
            <div className="feed-story-list">
              {stories.map((story) => (
                <article className={`feed-story tone-${story.tone}`} key={story.id}>
                  <div className="feed-story-meta">
                    <strong>{story.source}</strong>
                    <span>{story.category}</span>
                  </div>
                  <h3><FeedText parts={story.headline} onOpenClub={onOpenClub} /></h3>
                  <p><FeedText parts={story.body} onOpenClub={onOpenClub} /></p>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function FeedText({ parts, onOpenClub }: { parts: FeedTextPart[]; onOpenClub?: (identity: string) => void }) {
  return (
    <>
      {parts.map((part, index) =>
        part.type === "club"
          ? <ClubLink clubIdentity={part.clubId} key={`${part.clubId}-${index}`} onOpenClub={onOpenClub}>{part.text}</ClubLink>
          : <span key={`text-${index}`}>{part.text}</span>,
      )}
    </>
  );
}


export function DealsView({
  game,
  onAcceptSponsorDeal,
  onOpenClub,
}: {
  game: GameState;
  onAcceptSponsorDeal: (dealId: string) => void;
  onOpenClub?: (identity: string) => void;
}) {
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

      <ContractMarketCard game={game} onOpenClub={onOpenClub} />

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



export function CreateDynastyScreen({ countries, onCreate }: { countries: Country[]; onCreate: (setup: NewCareerSetup) => void }) {
  const [firstName, setFirstName] = useState("Jonas");
  const [lastName, setLastName] = useState("Vale");
  const [nationality, setNationality] = useState<CountryId>("denmark");
  const selectedCountry = countries.find((country) => country.id === nationality) ?? countries[0];

  function submit() {
    onCreate({
      firstName: firstName.trim() || "Jonas",
      lastName: lastName.trim() || "Vale",
      nationality,
      positionGroup: "Forward",
    });
  }

  return (
    <section className="simple-screen create-dynasty-screen">
      <ScreenTitle label="New dynasty" title="Create your player" />

      <div className="card dynasty-create-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Identity</span>
            <h2>Family name matters</h2>
          </div>
          <UserRound size={19} />
        </div>
        <div className="identity-form-grid">
          <label>
            <span>First name</span>
            <input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={18} />
          </label>
          <label>
            <span>Last name</span>
            <input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={18} />
          </label>
        </div>
        <div className="match-hint">
          <Sparkles size={16} />
          <span>{lastName.trim() || "Vale"} becomes the dynasty name for future generations.</span>
        </div>
      </div>

      <div className="card dynasty-create-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Nationality</span>
            <h2 className="country-heading">{selectedCountry && <CountryFlag country={selectedCountry} />}{selectedCountry?.name}</h2>
          </div>
          <ShieldCheck size={19} />
        </div>
        <div className="nationality-grid">
          {countries.map((country) => (
            <button
              key={country.id}
              className={`nationality-button ${country.id === nationality ? "is-active" : ""}`}
              type="button"
              onClick={() => setNationality(country.id)}
            >
              <CountryFlag country={country} />
              <strong>{country.name}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="card dynasty-create-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Position</span>
            <h2>Attack first</h2>
          </div>
          <Target size={19} />
        </div>
        <div className="position-choice-grid">
          <button className="position-choice is-active" type="button">
            <strong>Striker</strong>
            <span>Playable now</span>
          </button>
          <button className="position-choice" type="button" disabled>
            <strong>Winger</strong>
            <span>Coming later</span>
          </button>
          <button className="position-choice" type="button" disabled>
            <strong>Attacking mid</strong>
            <span>Coming later</span>
          </button>
        </div>
      </div>

      <button className="primary-action" type="button" onClick={submit}>
        Continue
      </button>
    </section>
  );
}

export function ClubProfileScreen({
  clubId,
  game,
  onBack,
}: {
  clubId: ClubId;
  game: GameState;
  onBack: () => void;
}) {
  const profile = getClubProfile(game, clubId);
  if (!profile) {
    return (
      <section className="simple-screen club-profile-screen">
        <DetailHeader label="Club" title="Profile unavailable" onBack={onBack} />
        <div className="card">
          <p>This club is not part of the current world model.</p>
        </div>
      </section>
    );
  }

  const isCurrentClub = profile.club.id === game.club.clubId || profile.club.shortCode === game.club.shortCode;

  return (
    <section className="simple-screen club-profile-screen">
      <DetailHeader
        label={<span className="country-label"><CountryFlag country={profile.country} />{profile.country.name}</span>}
        title={profile.club.name}
        onBack={onBack}
      />

      <div className="card club-profile-hero">
        <div className="club-profile-identity">
          <div className="club-profile-badge">{profile.club.shortCode.slice(0, 3)}</div>
          <div>
            <span className="metric-label">{profile.league.name}</span>
            <h2>{profile.table.position}. place</h2>
            <p>{profile.tier.name} · Reputation {profile.club.reputation}</p>
          </div>
        </div>
        <div className="club-profile-headline">
          <div><span>Club OVR</span><strong>{profile.club.strength}</strong></div>
          <div><span>Avg rating</span><strong>{profile.averageRating.toFixed(2)}</strong></div>
        </div>
      </div>

      <div className="card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Squad level</span>
            <h2>Unit averages</h2>
          </div>
          <BarChart3 size={19} />
        </div>
        <div className="club-unit-grid">
          <div><span>GK</span><small>Keeper</small><strong>{profile.unitOvr.keeper}</strong></div>
          <div><span>DEF</span><small>Defense</small><strong>{profile.unitOvr.defense}</strong></div>
          <div><span>MID</span><small>Midfield</small><strong>{profile.unitOvr.midfield}</strong></div>
          <div><span>ATT</span><small>Attack</small><strong>{profile.unitOvr.attack}</strong></div>
        </div>
      </div>

      <div className="card">
        <span className="metric-label">Season performance</span>
        <div className="club-form-strip" aria-label="Recent form">
          {profile.recentForm.length > 0
            ? profile.recentForm.map((result, index) => <span className={`result-${result.toLowerCase()}`} key={`${result}-${index}`}>{result}</span>)
            : <small>No matches played</small>}
        </div>
        <div className="stat-grid">
          <InfoTile label="Form" value={profile.form} tone={profile.form === "Hot" || profile.form === "Good" ? "good" : profile.form === "Poor" ? "warn" : undefined} />
          <InfoTile label="Record" value={`${profile.table.wins}-${profile.table.draws}-${profile.table.losses}`} />
          <InfoTile label="Goals / match" value={profile.goalsPerMatch.toFixed(2)} tone="gold" />
          <InfoTile label="Against / match" value={profile.concededPerMatch.toFixed(2)} />
          <InfoTile label="Clean sheets" value={`${profile.cleanSheets}`} />
          <InfoTile label="Facilities" value={profile.facilityLabel} />
        </div>
      </div>

      <div className="card club-style-card">
        <div className="section-heading">
          <div>
            <span className="metric-label">Football identity</span>
            <h2>{profile.style}</h2>
          </div>
          <Activity size={19} />
        </div>
        <p>{profile.styleDetail}</p>
        <div className="club-scout-lines">
          <div><span>Strength</span><strong>{profile.strength}</strong></div>
          <div><span>Weakness</span><strong>{profile.weakness}</strong></div>
        </div>
      </div>

      <div className={`card club-career-fit ${isCurrentClub ? "is-current" : ""}`}>
        <div className="section-heading">
          <div>
            <span className="metric-label">{isCurrentClub ? "Your club" : "Career fit"}</span>
            <h2>{isCurrentClub ? "Current environment" : profile.careerFit.label}</h2>
          </div>
          <ShieldCheck size={19} />
        </div>
        <p>{isCurrentClub ? "This is your current development and match environment." : profile.careerFit.detail}</p>
        <div className="next-grid">
          <InfoTile label="Your OVR" value={`${calculateCurrentPlayerOvr(game)}`} tone="good" />
          <InfoTile label="Club OVR" value={`${profile.club.strength}`} />
          <InfoTile label="Projected role" value={isCurrentClub ? game.contract.rolePromise : profile.careerFit.projectedRole} tone="gold" />
        </div>
      </div>

    </section>
  );
}

function calculateCurrentPlayerOvr(game: GameState) {
  return calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights);
}

function formatMatchPhase(phase: NonNullable<PlayerMatchEvent["directorPhase"]>) {
  return {
    cagey_opening: "Cagey opening",
    team_pressure: "Team pressure",
    opponent_pressure: "Under pressure",
    end_to_end: "End to end",
    protecting_lead: "Protecting lead",
    chasing_goal: "Chasing goal",
    late_siege: "Late siege",
    game_management: "Game management",
  }[phase];
}

function getTimelineEventIcon(kind: string) {
  if (kind === "goal" || kind === "goal_involvement") {
    return <Trophy size={13} />;
  }
  if (kind === "chance" || kind === "player") {
    return <Target size={13} />;
  }
  if (kind === "substitution") {
    return <ArrowRightLeft size={13} />;
  }
  return <Activity size={13} />;
}

export function CountrySelectScreen({ countries, onPick }: { countries: Country[]; onPick: (id: CountryId) => void }) {
  return (
    <section className="simple-screen country-select-screen">
      <ScreenTitle label="New career" title="Choose your country" />

      {countries.map((country) => (
        <button key={country.id} className="card country-option" type="button" onClick={() => onPick(country.id)}>
          <CountryFlag country={country} className="country-flag" />
          <div>
            <h2>{country.name}</h2>
            <span>{country.tiers.length} divisions</span>
          </div>
        </button>
      ))}
    </section>
  );
}
