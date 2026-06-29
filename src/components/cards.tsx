import { dynastyUpgradeMap } from "../data/dynastyUpgrades";
import { getPositionModule } from "../positionRoles";
import { getContractStatusLabel } from "../systems/contracts";
import { formatSigned, getAverageRating, getFormLabel, getFormScore, getTrustStatus } from "../systems/formatting";
import { calculateOvr, calculatePotentialOvr, getOvrBreakdown } from "../systems/ovr";
import { getPrestigeStatus, prestigeTiers } from "../systems/prestige";
import { getSeasonReview } from "../systems/season";
import { getCurrentFixture, getRecentFormText, getSeasonRecord, getUpcomingFixtures, hasPlayableFixture, isSeasonComplete } from "../systems/seasonState";
import { getFitnessAvailability, getUpcomingMatch } from "../systems/selection";
import { getDynastyInvestmentImpactLine, getDynastyTrackCurrentBonusLines, getDynastyTrackProgress, getDynastyUpgradeCost, getDynastyUpgradeLockReason } from "../systems/dynastyUpgrades";
import { getCurrentTrainingFocuses, getInvestTrackView, getTrainingProjection } from "../systems/training";
import { getCountryForClub } from "../systems/world";
import { getClubFitStatus, getNextTransferWindowLabel } from "../systems/transferWindow";
import { clamp } from "../utils";
import { ClubLink, CountryFlag, FixtureStatusBadge, InfoRow, InfoTile, LeagueTableRowView, ProgressBar, ProgressRow } from "./shared";
import { Activity, BadgeDollarSign, BarChart3, CalendarDays, Check, ChevronRight, Flame, Gauge, HeartPulse, ShieldCheck, Sparkles, Trophy, UsersRound } from "lucide-react";
import { useState } from "react";
import type { AttributeKey, PositionModule } from "../positionRoles";
import type { Attribute, Contract, DynastySeason, DynastyTrackDefinition, DynastyUpgradeId, GameState, LastMatchSummary, LeagueTableRow, SeasonState, SeasonStats, SupportTrackDefinition, SupportUpgradeId } from "../types";

export function SelectionBriefingCard({ game }: { game: GameState }) {
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


export function SeasonContextCard({ game, onOpenClub }: { game: GameState; onOpenClub?: (identity: string) => void }) {
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
          value={seasonComplete ? "Review" : (
            <ClubLink clubIdentity={currentFixture.opponent} onOpenClub={onOpenClub}>
              {currentFixture.opponentShort}
            </ClubLink>
          )}
          tone={seasonComplete || currentFixture.competition.includes("Cup") ? "gold" : undefined}
        />
      </div>
    </section>
  );
}


export function LastMatchCard({ summary, onOpenClub }: { summary: LastMatchSummary; onOpenClub?: (identity: string) => void }) {
  return (
    <section className="card last-match-card">
      <div className="section-heading">
        <div>
          <span className="metric-label">Last match</span>
          <h2>
            Match {summary.matchNumber}/{summary.seasonLength}
          </h2>
          <p>{summary.venue} vs <ClubLink clubIdentity={summary.opponent} onOpenClub={onOpenClub}>{summary.opponent}</ClubLink></p>
        </div>
        <Trophy size={19} />
      </div>
      {summary.wonMotm && <div className="motm-ribbon">⭐ Man of the Match</div>}
      <div className="next-grid">
        <InfoTile label="Score" value={`${summary.teamGoals}-${summary.opponentGoals}`} tone="gold" />
        <InfoTile label="Rating" value={summary.rating.toFixed(1)} tone="gold" />
        <InfoTile label="Trust" value={`${summary.trustDelta > 0 ? "+" : ""}${summary.trustDelta}`} />
      </div>
      <p>{summary.careerImpact[0]}</p>
    </section>
  );
}


export function CareerCard({ game }: { game: GameState }) {
  const [showOvrDetails, setShowOvrDetails] = useState(false);
  const positionModule = getPositionModule(game.positionGroup);
  const ovr = calculateOvr(game.attributes, positionModule.ovrWeights);
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
            <p>
              There is no visible hard cap. Higher levels become more expensive over time, and better facilities, support, performance and
              future dynasty advantages improve how efficiently you keep developing.
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


export function ReadinessStrip({ game }: { game: GameState }) {
  const [selectedReadiness, setSelectedReadiness] = useState<string | undefined>();
  const readiness = [
    {
      label: "Fitness",
      value: game.fitness,
      state: getFitnessAvailability(game.fitness),
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
    <section className="readiness-grid" aria-label="Fitness and form">
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
                <span className="metric-label">Fitness</span>
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


export function PrestigeStatusCard({ game }: { game: GameState }) {
  const [showDetails, setShowDetails] = useState(false);
  const prestige = getPrestigeStatus(game.prestige);
  const progressLabel = prestige.next
    ? `${prestige.points}/${prestige.next.threshold}`
    : `${prestige.points} prestige`;
  const nextCopy = prestige.next
    ? `${prestige.pointsToNext} prestige to ${prestige.next.label}`
    : "Maximum prestige tier reached";

  return (
    <section className="card prestige-card">
      <button className="prestige-header" type="button" aria-expanded={showDetails} aria-label="Toggle prestige details" onClick={() => setShowDetails((value) => !value)}>
        <div className="section-heading">
          <div>
            <span className="metric-label">Prestige</span>
            <h2>{prestige.current.label}</h2>
          </div>
          <Sparkles size={19} />
        </div>
      </button>

      <div className="prestige-hero">
        <strong>{prestige.points}</strong>
        <div>
          <span>{progressLabel}</span>
          <ProgressBar value={prestige.progressPercent} />
          <small>{nextCopy}</small>
        </div>
      </div>

      <div className="next-grid">
        <InfoTile label="Status" value={prestige.current.label} tone="gold" />
        <InfoTile label="Sponsor" value={prestige.sponsorInterest} />
        <InfoTile label="Next unlock" value={prestige.next?.sponsorUnlock ?? "Legacy brand"} />
      </div>

      {!showDetails ? (
        <button className="prestige-toggle" type="button" onClick={() => setShowDetails(true)}>
          What is prestige? — see all ranks
        </button>
      ) : (
        <div className="prestige-details">
          <p className="prestige-affects">
            Prestige is your fame across the football world. It sets which <strong>sponsors</strong> will
            deal with you and strengthens your <strong>contract leverage</strong> — you earn it from
            ratings, goals/assists, trophies and honours.
          </p>
          <div className="prestige-ladder">
            {prestigeTiers.map((tier) => {
              const reached = game.prestige >= tier.threshold;
              const state = tier.id === prestige.current.id ? "is-current" : reached ? "is-reached" : "is-locked";
              return (
                <div className={`prestige-tier ${state}`} key={tier.id}>
                  <span className="prestige-tier-label">{tier.label}</span>
                  <span className="prestige-tier-threshold">{tier.threshold.toLocaleString()}</span>
                  <span className="prestige-tier-unlock">{tier.sponsorUnlock}</span>
                </div>
              );
            })}
          </div>
          <button className="prestige-toggle" type="button" onClick={() => setShowDetails(false)}>
            Hide
          </button>
        </div>
      )}
    </section>
  );
}


export function getReadinessDetails(game: GameState, label: string) {
  const upcomingMatch = getUpcomingMatch(game);
  const averageRating = getAverageRating(game.seasonStats.ratings);
  const lastRating = game.seasonStats.ratings.at(-1);

  if (label === "Fitness") {
    return [
      { label: "Current level", value: `${game.fitness}/100` },
      { label: "Last training", value: game.lastTraining ? formatSigned(game.lastTraining.fitnessDelta) : "No session yet" },
      { label: "Last match", value: game.lastMatch ? formatSigned(game.lastMatch.fitnessDelta) : "No match yet" },
      { label: "Match band", value: getFitnessAvailability(game.fitness) },
      { label: "Selection impact", value: game.fitness >= 60 ? "Nearly full trust" : game.fitness >= 40 ? "Managed minutes" : "Selection risk" },
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


export function NextActionCard({ game, onOpenClub }: { game: GameState; onOpenClub?: (identity: string) => void }) {
  const seasonComplete = isSeasonComplete(game.season);
  const isFreeAgent = Boolean(game.freeAgent);
  const isMatchDay = !isFreeAgent && hasPlayableFixture(game.season);
  const needsTraining = !isFreeAgent && game.trainingCompletedWeek !== game.week && !seasonComplete;
  const focus = getCurrentTrainingFocuses(game)[0];
  const projection = getTrainingProjection(game);
  const upcomingMatch = seasonComplete ? undefined : getUpcomingMatch(game);
  const focusRange = projection.ranges[focus];

  return (
    <section className="card next-card">
      <div className="section-heading">
        <div>
          <span className="metric-label">{isFreeAgent ? "Contract market" : seasonComplete ? "Season complete" : !needsTraining && isMatchDay ? "Match Day" : "Next Action"}</span>
          <h2>
            {isFreeAgent
              ? "Find a club"
              : seasonComplete
              ? "Review season"
              : !needsTraining && isMatchDay && upcomingMatch
              ? (
                <>
                  {upcomingMatch.venue === "Home" ? game.club.shortName : (
                    <ClubLink clubIdentity={upcomingMatch.opponent} onOpenClub={onOpenClub}>{upcomingMatch.opponentShort}</ClubLink>
                  )}
                  {" - "}
                  {upcomingMatch.venue === "Home" ? (
                    <ClubLink clubIdentity={upcomingMatch.opponent} onOpenClub={onOpenClub}>{upcomingMatch.opponentShort}</ClubLink>
                  ) : game.club.shortName}
                </>
              )
              : needsTraining
                ? "Complete weekly training"
                : "Ready for next week"}
          </h2>
        </div>
        <CalendarDays size={19} />
      </div>

      <div className="next-grid">
        <InfoTile label="Role" value={isFreeAgent ? "Free Agent" : !needsTraining && isMatchDay && upcomingMatch ? upcomingMatch.playerRole : seasonComplete ? "Review" : "Prospect"} />
        <InfoTile label="Focus" value={isFreeAgent ? "Solo training" : !needsTraining && isMatchDay && upcomingMatch ? upcomingMatch.tacticalFocus : seasonComplete ? "Season" : focus} />
        <InfoTile
          label={isFreeAgent ? "Market" : needsTraining ? "XP Range" : seasonComplete ? "Reward" : "Status"}
          value={
            isFreeAgent
              ? `${game.freeAgent?.weeks ?? 0} wks`
              : needsTraining && focusRange
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
          {isFreeAgent
            ? "Sim weeks to keep solo training while waiting for trial offers."
            : seasonComplete
            ? "Season is complete. Review the campaign and start the next one."
            : !needsTraining && isMatchDay && upcomingMatch
            ? `${upcomingMatch.competition}. ${upcomingMatch.selection.summary}`
            : game.lastEvent}
        </span>
      </div>
    </section>
  );
}


export function SeasonSnapshot({ stats }: { stats: SeasonStats }) {
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
        {stats.manOfTheMatch > 0 && <InfoTile label="MotM" value={`${stats.manOfTheMatch}`} tone="gold" />}
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


export function RelationshipsCard({ game }: { game: GameState }) {
  const prestige = getPrestigeStatus(game.prestige);
  const relationships = [
    { label: "Manager", status: getTrustStatus(game.trust), value: game.trust },
    { label: "Teammates", status: "Neutral", value: 51 },
    { label: "Agent", status: "Basic", value: 34 },
    { label: "Fans", status: prestige.current.label, value: prestige.progressPercent },
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


export function ContractMarketCard({ game, onOpenClub }: { game: GameState; onOpenClub?: (identity: string) => void }) {
  const marketValue = 18 + Math.round((calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights) - 50) * 2.5) + game.seasonStats.goals * 2;
  const contract = game.contract;
  const status = game.freeAgent ? "Free Agent" : getContractStatusLabel(game);
  const prestige = getPrestigeStatus(game.prestige);
  const country = getCountryForClub(game.world, game.club.clubId, game.club.shortCode);
  const clubFit = getClubFitStatus(game);
  const nextWindow = getNextTransferWindowLabel(game);

  return (
    <section className="card contract-card">
      <div className="section-heading">
        <div>
          <span className="metric-label country-label">{country && <CountryFlag country={country} />}Contract</span>
          <h2>{game.freeAgent ? "No club contract" : contract.label}</h2>
        </div>
        <BadgeDollarSign size={19} />
      </div>
      <div className="contract-hero">
        <div>
          <span>Weekly wage</span>
          <strong>${game.freeAgent ? 0 : contract.weeklyWage}</strong>
        </div>
        <div>
          <span>Role promise</span>
          <strong>{contract.rolePromise}</strong>
        </div>
      </div>
      <div className="next-grid">
        <InfoTile label="Left" value={game.freeAgent ? "None" : `${contract.weeksRemaining} wks`} />
        <InfoTile label="Goal bonus" value={`+$${contract.goalBonus}`} tone="gold" />
        <InfoTile label="Status" value={status} tone={game.contractOffer ? "good" : game.freeAgent || contract.weeksRemaining <= 1 ? "warn" : undefined} />
      </div>
      <div className="next-grid">
        <InfoTile label="Appearance" value={`+$${contract.appearanceBonus}`} />
        <InfoTile label="Assist" value={`+$${contract.assistBonus}`} />
        <InfoTile label="Market" value={`$${marketValue}k`} />
      </div>
      <div className="next-grid">
        <InfoTile label="Club fit" value={clubFit} tone={clubFit === "Outgrown" ? "gold" : clubFit === "Under level" ? "warn" : undefined} />
        <InfoTile label="Next window" value={nextWindow} />
        <InfoTile label="Interest" value={game.transferWindow?.interestLevel ?? (clubFit === "Outgrown" ? "Watched" : "Quiet")} tone={game.transferWindow || clubFit === "Outgrown" ? "good" : undefined} />
      </div>
      <div className="match-hint">
        <Activity size={16} />
        <span>
          {game.contractOffer
            ? game.contractOffer.source === "external-club"
              ? <><ClubLink clubIdentity={game.contractOffer.clubId ?? game.contractOffer.club} onOpenClub={onOpenClub}>{game.contractOffer.club}</ClubLink> has made an offer.</>
              : "The club has new terms ready for you."
            : game.freeAgent
              ? "You are training away from a club while your agent looks for trial terms."
              : prestige.tierIndex >= 1
              ? `${prestige.current.label}. Your name is starting to matter in contract talks.`
              : "Local interest. Strong output can improve the next package."}
        </span>
      </div>
    </section>
  );
}


export function EquipmentFacilitiesCard() {
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


export function MatchStatsCard({
  stats,
}: {
  stats: {
    homeName: string;
    awayName: string;
    playerSide: "home" | "away";
    rows: { label: string; homeValue: string; awayValue: string; homeShare: number }[];
  };
}) {
  const homeIsPlayer = stats.playerSide === "home";
  return (
    <div className="card match-stats-card">
      <div className="match-stats-teams">
        <strong className={`match-stats-team ${homeIsPlayer ? "is-player" : ""}`}>{stats.homeName}</strong>
        <span className="metric-label">Match stats</span>
        <strong className={`match-stats-opp ${homeIsPlayer ? "" : "is-player"}`}>{stats.awayName}</strong>
      </div>
      <div className="match-stats-rows">
        {stats.rows.map((row) => (
          <div className="match-stat-row" key={row.label}>
            <div className="match-stat-values">
              <strong>{row.homeValue}</strong>
              <span>{row.label}</span>
              <strong>{row.awayValue}</strong>
            </div>
            <div
              className="match-stat-bar"
              aria-label={`${row.label}: ${stats.homeName} ${row.homeValue}, ${stats.awayName} ${row.awayValue}`}
            >
              <span className={`match-stat-bar-home ${homeIsPlayer ? "is-player" : ""}`} style={{ width: `${row.homeShare}%` }} />
              <span className={`match-stat-bar-away ${homeIsPlayer ? "" : "is-player"}`} style={{ width: `${100 - row.homeShare}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export function FixturePreviewList({ season, onOpenClub }: { season: SeasonState; onOpenClub?: (identity: string) => void }) {
  const upcoming = getUpcomingFixtures(season, 5);

  return (
    <div className="fixture-preview-list">
      {upcoming.map((fixture, index) => (
        <div className="fixture-row compact" key={fixture.id}>
          <span className="fixture-index">M{season.fixtureIndex + index + 1}</span>
          <div>
            <ClubLink clubIdentity={fixture.opponent} onOpenClub={onOpenClub}>{fixture.opponentShort}</ClubLink>
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


export function LeagueTablePreview({ table, playerClubShort, onOpenClub }: { table: LeagueTableRow[]; playerClubShort: string; onOpenClub?: (identity: string) => void }) {
  const playerClubIndex = table.findIndex((row) => row.short === playerClubShort);
  const start = clamp(playerClubIndex - 1, 0, Math.max(0, table.length - 4));
  const rows = table.slice(start, start + 4);

  return (
    <div className="league-table mini-table">
      {rows.map((row) => (
        <LeagueTableRowView compact key={row.short} row={row} playerClubShort={playerClubShort} onOpenClub={onOpenClub} />
      ))}
    </div>
  );
}


type UpgradeTrackItemView = {
  id: string;
  name: string;
  effect: string;
  level: number;
  maxLevel: number;
  cost: number;
  lockReason?: string;
  maxed: boolean;
  canBuy: boolean;
  nextEffect: string;
};

// Shared, scannable upgrade-track card used by both the support (cash) and dynasty (LP) shops.
// One clickable header carries a single colour-coded status chip — Complete / Invest <cost> /
// <cost> (can't afford yet) / Locked — so the list reads at a glance; details only on expand.
function UpgradeTrackCard({
  name,
  effect,
  progress,
  currentBonuses,
  items,
  formatCost,
  onBuy,
  className = "",
}: {
  name: string;
  effect: string;
  progress: { total: number; maxTotal: number; nextName: string; maxed: boolean; current: number; required: number; percent: number };
  currentBonuses: string[];
  items: UpgradeTrackItemView[];
  formatCost: (cost: number) => string;
  onBuy: (id: string) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const buyable = items.find((item) => item.canBuy);
  const affordableNext = buyable ?? items.find((item) => !item.maxed && !item.lockReason);
  const status = progress.maxed
    ? { tone: "done", label: "Complete" }
    : buyable
      ? { tone: "buy", label: `Invest ${formatCost(buyable.cost)}` }
      : affordableNext
        ? { tone: "wait", label: formatCost(affordableNext.cost) }
        : { tone: "locked", label: "Locked" };

  return (
    <div className={`card upgrade-track ${progress.maxed ? "is-complete" : ""} ${className}`}>
      <button type="button" className="upgrade-track-head" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <span className="upgrade-track-title">
          <strong>{name}</strong>
          <small>{progress.maxed ? "All breakthroughs unlocked" : `Next: ${progress.nextName} · ${progress.current}/${progress.required}`}</small>
        </span>
        <span className="upgrade-track-meta">
          <span className={`upgrade-chip chip-${status.tone}`}>{status.label}</span>
          <ChevronRight size={16} className="upgrade-track-chevron" />
        </span>
      </button>

      {expanded && (
        <div className="upgrade-track-body">
          <p className="upgrade-track-effect">{effect}</p>
          {currentBonuses.length > 0 && (
            <div className="upgrade-track-have">
              <span>You have</span>
              <div>
                {currentBonuses.map((bonus) => (
                  <em key={bonus}>{bonus}</em>
                ))}
              </div>
            </div>
          )}
          <div className="upgrade-item-list">
            {items.map((item) => (
              <div className={`upgrade-item ${item.maxed ? "is-done" : item.lockReason ? "is-locked" : item.canBuy ? "is-buyable" : ""}`} key={item.id}>
                <div className="upgrade-item-info">
                  <strong>{item.name} <span className="upgrade-item-lv">Lv {item.level}/{item.maxLevel}</span></strong>
                  <small>{item.maxed ? item.effect : item.nextEffect}</small>
                </div>
                {item.maxed ? (
                  <span className="upgrade-item-done"><Check size={14} /> Done</span>
                ) : (
                  <button type="button" disabled={!item.canBuy} onClick={() => onBuy(item.id)}>
                    {item.lockReason ? "Locked" : formatCost(item.cost)}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Beginner-friendly Invest card: leads with the problem + the player's current numbers (always visible),
// and on expand offers each upgrade as a plain before -> after with a "best if…" line — no system jargon.
export function SupportTrackCard({
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
  const [expanded, setExpanded] = useState(false);
  const view = getInvestTrackView(game, track);
  const allDone = view.upgrades.every((upgrade) => upgrade.maxed);
  const cheapest = view.upgrades.filter((upgrade) => !upgrade.maxed && !upgrade.lockReason).sort((a, b) => a.cost - b.cost)[0];
  const status = allDone
    ? { tone: "done", label: "Maxed" }
    : cheapest
      ? cash >= cheapest.cost
        ? { tone: "buy", label: `Invest $${cheapest.cost}` }
        : { tone: "wait", label: `$${cheapest.cost}` }
      : { tone: "locked", label: "Locked" };

  return (
    <div className={`card upgrade-track ${allDone ? "is-complete" : ""}`}>
      <button type="button" className="upgrade-track-head" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        <span className="upgrade-track-title">
          <strong>{track.name}</strong>
        </span>
        <span className="upgrade-track-meta">
          <span className={`upgrade-chip chip-${status.tone}`}>{status.label}</span>
          <ChevronRight size={16} className="upgrade-track-chevron" />
        </span>
      </button>

      <p className="invest-problem">{view.problem}</p>

      {view.nowLines.length > 0 && (
        <div className="invest-now">
          {view.nowLines.map((line) => (
            <div className="invest-now-line" key={line.label}>
              <span>{line.label}</span>
              <strong>{line.value}</strong>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div className="upgrade-track-body">
          <p className="invest-choose">Choose what to improve</p>
          <div className="upgrade-item-list">
            {view.upgrades.map((item) => {
              const canBuy = !item.lockReason && !item.maxed && cash >= item.cost;
              return (
                <div className={`upgrade-item ${item.maxed ? "is-done" : item.lockReason ? "is-locked" : canBuy ? "is-buyable" : ""}`} key={item.id}>
                  <div className="upgrade-item-info">
                    <strong>{item.name}</strong>
                    <span className="invest-ba">{item.changeLabel}</span>
                    <small>{item.whenUseful}</small>
                    {item.pendingNote && <small className="invest-pending">{item.pendingNote}</small>}
                  </div>
                  {item.maxed ? (
                    <span className="upgrade-item-done"><Check size={14} /> Done</span>
                  ) : (
                    <button type="button" disabled={!canBuy} onClick={() => onBuySupportUpgrade(item.id)}>
                      {item.lockReason ? "Locked" : `$${item.cost}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {view.milestone && (
            <div className="invest-milestone">
              <span className="invest-milestone-label">Next milestone</span>
              <strong>{view.milestone.name}</strong>
              <small>{view.milestone.current}/{view.milestone.required} upgrades · {view.milestone.reward}</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export function DynastyTrackCard({
  game,
  track,
  onBuyDynastyUpgrade,
}: {
  game: GameState;
  track: DynastyTrackDefinition;
  onBuyDynastyUpgrade: (upgradeId: DynastyUpgradeId) => void;
}) {
  const progress = getDynastyTrackProgress(game.dynasty, track);
  const items: UpgradeTrackItemView[] = track.upgradeIds.map((upgradeId) => {
    const upgrade = dynastyUpgradeMap[upgradeId];
    const level = game.dynasty.upgrades[upgradeId] ?? 0;
    const cost = getDynastyUpgradeCost(upgrade, level);
    const lockReason = getDynastyUpgradeLockReason(game.dynasty, upgrade);
    const maxed = level >= upgrade.maxLevel;
    return {
      id: upgrade.id,
      name: upgrade.name,
      effect: upgrade.effect,
      level,
      maxLevel: upgrade.maxLevel,
      cost,
      lockReason,
      maxed,
      canBuy: !lockReason && !maxed && game.dynasty.legacyPoints >= cost,
      nextEffect: maxed ? "Complete" : lockReason ? `Locked: ${lockReason}` : getDynastyInvestmentImpactLine(game.dynasty, track, upgradeId),
    };
  });

  return (
    <UpgradeTrackCard
      name={track.name}
      effect={track.effect}
      progress={progress}
      currentBonuses={getDynastyTrackCurrentBonusLines(game.dynasty, track)}
      items={items}
      formatCost={(cost) => `${cost} LP`}
      onBuy={(id) => onBuyDynastyUpgrade(id as DynastyUpgradeId)}
      className="dynasty-upgrade-card"
    />
  );
}


export function DynastySeasonRow({ season, current = false, onOpenClub }: { season: DynastySeason; current?: boolean; onOpenClub?: (identity: string) => void }) {
  return (
    <div className={`dynasty-row ${current ? "is-current" : ""}`}>
      <div className="dynasty-season-main">
        <span>S{season.season}</span>
        <div>
          <strong><ClubLink clubIdentity={season.club} onOpenClub={onOpenClub}>{season.club}</ClubLink></strong>
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

