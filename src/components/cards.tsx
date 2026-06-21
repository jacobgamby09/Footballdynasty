import { attributeInfo } from "../data/attributes";
import { getPositionModule } from "../positionRoles";
import { getAttributeGrowthPressure, getAttributeXpRequirement } from "../systems/attributeXp";
import { getContractStatusLabel } from "../systems/contracts";
import { formatFixtureTitle, formatSigned, getAverageRating, getFormLabel, getFormScore, getTrustStatus } from "../systems/formatting";
import { calculateOvr, calculatePotentialOvr, getAttributeProgressPercent, getOvrBreakdown } from "../systems/ovr";
import { getPrestigeStatus } from "../systems/prestige";
import { getSeasonReview } from "../systems/season";
import { getCurrentFixture, getRecentFormText, getSeasonRecord, getUpcomingFixtures, hasPlayableFixture, isSeasonComplete } from "../systems/seasonState";
import { getUpcomingMatch } from "../systems/selection";
import { getNextSupportTrackPurchase, getSupportTrackProgress } from "../systems/support";
import { getCurrentTrainingFocuses, getSupportInvestmentImpactLine, getSupportTrackCurrentBonusLines, getTrainingProjection } from "../systems/training";
import { getCountryForClub } from "../systems/world";
import { clamp } from "../utils";
import { FixtureStatusBadge, InfoRow, InfoTile, LeagueTableRowView, ProgressBar, ProgressRow } from "./shared";
import { Activity, BadgeDollarSign, BarChart3, CalendarDays, ChevronRight, Flame, Gauge, HeartPulse, ShieldCheck, Sparkles, Trophy, UsersRound } from "lucide-react";
import { useState } from "react";
import type { AttributeKey, PositionModule } from "../positionRoles";
import type { Attribute, Contract, DynastySeason, GameState, LastMatchSummary, LeagueTableRow, SeasonState, SeasonStats, SupportTrackDefinition, SupportUpgradeId } from "../types";

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


export function SeasonContextCard({ game }: { game: GameState }) {
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


export function LastMatchCard({ summary }: { summary: LastMatchSummary }) {
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


export function CareerCard({ game }: { game: GameState }) {
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


export function ReadinessStrip({ game }: { game: GameState }) {
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


export function PrestigeStatusCard({ game }: { game: GameState }) {
  const prestige = getPrestigeStatus(game.prestige);
  const progressLabel = prestige.next
    ? `${prestige.points}/${prestige.next.threshold}`
    : `${prestige.points} prestige`;
  const nextCopy = prestige.next
    ? `${prestige.pointsToNext} prestige to ${prestige.next.label}`
    : "Maximum prestige tier reached";

  return (
    <section className="card prestige-card">
      <div className="section-heading">
        <div>
          <span className="metric-label">Prestige</span>
          <h2>{prestige.current.label}</h2>
        </div>
        <Sparkles size={19} />
      </div>

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


export function NextActionCard({ game }: { game: GameState }) {
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


export function AttributesCard({
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


export function ContractMarketCard({ game }: { game: GameState }) {
  const marketValue = 18 + Math.round((calculateOvr(game.attributes, getPositionModule(game.positionGroup).ovrWeights) - 50) * 2.5) + game.seasonStats.goals * 2;
  const contract = game.contract;
  const status = getContractStatusLabel(game);
  const prestige = getPrestigeStatus(game.prestige);
  const country = getCountryForClub(game.world, game.club.clubId, game.club.shortCode);

  return (
    <section className="card contract-card">
      <div className="section-heading">
        <div>
          <span className="metric-label country-label">{country && <span className="flag-icon" aria-label={country.name}>{country.flag}</span>}Contract</span>
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


export function FixturePreviewList({ season }: { season: SeasonState }) {
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


export function LeagueTablePreview({ table, playerClubShort }: { table: LeagueTableRow[]; playerClubShort: string }) {
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


export function DynastySeasonRow({ season, current = false }: { season: DynastySeason; current?: boolean }) {
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

