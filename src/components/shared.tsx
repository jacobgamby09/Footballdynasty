import { initialClub } from "../data/leagues";
import { getPlayerAge } from "../systems/legacy";
import { getPlayerRoleLabel } from "../positionRoles";
import { getCountryForClub } from "../systems/world";
import { clamp } from "../utils";
import { BadgeDollarSign, Building2, ChevronRight, ChevronsRight, Dumbbell, Home, Shirt, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Country, FixtureResult, GameState, LastMatchSummary, LeagueTableRow, MatchState, NavKey } from "../types";
import type { ReactNode } from "react";

// Animate a number from `from` up to `target` (rAF, ease-out cubic). Powers match-reveal dopamine —
// rating sweeps, trust counts — reusing the same feel as the training XP reveal. Reduced-motion jumps
// straight to the target.
export function useCountUp(target: number, options?: { from?: number; durationMs?: number; decimals?: number }): number {
  const decimals = options?.decimals ?? 0;
  const from = options?.from ?? 0;
  const duration = options?.durationMs ?? 900;
  const [value, setValue] = useState(from);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || duration <= 0) {
      setValue(target);
      return;
    }
    let frame = 0;
    const startedAt = window.performance.now();
    const tick = (now: number) => {
      const progress = clamp((now - startedAt) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, from, duration]);

  return Number(value.toFixed(decimals));
}

export const navItems = [
  { key: "player" as const, label: "Player", icon: UserRound },
  { key: "training" as const, label: "Training", icon: Dumbbell },
  { key: "club" as const, label: "Club", icon: Building2 },
  { key: "home" as const, label: "Home", icon: Home },
];


export function Header({ game, onOpenClub }: { game: GameState; onOpenClub?: (identity: string) => void }) {
  const country = getCountryForClub(game.world, game.club.clubId, game.club.shortCode);

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
        <h1>{game.player.firstName} {game.player.lastName}</h1>
        <div className="identity-row">
          <span>{getPlayerAge(game)} yrs</span>
          <span>{getPlayerRoleLabel(game.positionGroup)}</span>
        </div>
        <ClubLink className="club-chip" clubIdentity={game.club.clubId ?? game.club.shortCode} onOpenClub={onOpenClub}>
          {country ? <CountryFlag country={country} /> : <span className="club-dot" />}
          {game.club.name}
        </ClubLink>
      </div>

      <div className="resource-stack" aria-label="Resources">
        <ResourcePill icon={<BadgeDollarSign size={14} />} value={`$${game.cash}`} />
      </div>
    </header>
  );
}

export function ClubLink({
  children,
  clubIdentity,
  onOpenClub,
  className = "",
}: {
  children: ReactNode;
  clubIdentity?: string;
  onOpenClub?: (identity: string) => void;
  className?: string;
}) {
  if (!clubIdentity || !onOpenClub) {
    return <span className={className}>{children}</span>;
  }
  return (
    <button className={`club-link ${className}`.trim()} type="button" onClick={() => onOpenClub(clubIdentity)}>
      {children}
    </button>
  );
}


export function ResourcePill({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="resource-pill">
      {icon}
      <span>{value}</span>
    </div>
  );
}


export function MatchScoreHeader({
  liveMinute,
  match,
  teamGoals,
  opponentGoals,
  onOpenClub,
}: {
  liveMinute: number;
  match: MatchState;
  teamGoals: number;
  opponentGoals: number;
  onOpenClub?: (identity: string) => void;
}) {
  const homeName = match.venue === "Home" ? match.teamShortName : match.opponent;
  const awayName = match.venue === "Home" ? match.opponent : match.teamShortName;
  const homeGoals = match.venue === "Home" ? teamGoals : opponentGoals;
  const awayGoals = match.venue === "Home" ? opponentGoals : teamGoals;

  return (
    <header className="match-score-header">
      <span className="metric-label">{liveMinute}'</span>
      <div className="scoreboard-row">
        <ClubLink className="score-team-name" clubIdentity={homeName} onOpenClub={onOpenClub}>{homeName}</ClubLink>
        <div className="score-pill">
          {homeGoals}-{awayGoals}
        </div>
        <ClubLink className="score-team-name" clubIdentity={awayName} onOpenClub={onOpenClub}>{awayName}</ClubLink>
      </div>
      <small>{match.competition}</small>
    </header>
  );
}


export function SummaryScoreHeader({ summary, onOpenClub }: { summary: LastMatchSummary; onOpenClub?: (identity: string) => void }) {
  const homeName = summary.venue === "Home" ? summary.clubShortName : summary.opponent;
  const awayName = summary.venue === "Home" ? summary.opponent : summary.clubShortName;
  const homeGoals = summary.venue === "Home" ? summary.teamGoals : summary.opponentGoals;
  const awayGoals = summary.venue === "Home" ? summary.opponentGoals : summary.teamGoals;

  return (
    <header className="match-score-header summary-score-header">
      <span className="metric-label">{summary.competition} - Match {summary.matchNumber}/{summary.seasonLength}</span>
      <div className="scoreboard-row">
        <ClubLink className="score-team-name" clubIdentity={homeName} onOpenClub={onOpenClub}>{homeName}</ClubLink>
        <div className="score-pill">
          {homeGoals}-{awayGoals}
        </div>
        <ClubLink className="score-team-name" clubIdentity={awayName} onOpenClub={onOpenClub}>{awayName}</ClubLink>
      </div>
      <small>Full time</small>
    </header>
  );
}


export function WeekNote({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="week-note">
      {icon}
      <span>{text}</span>
    </div>
  );
}


export function FixtureStatusBadge({
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


export function CountryFlag({ country, className = "" }: { country: Country; className?: string }) {
  return (
    <span className={`flag-icon ${className}`.trim()} title={country.name}>
      <img src={`/flags/${country.id}.svg`} alt={`${country.name} flag`} />
    </span>
  );
}


export function DetailHeader({ label, title, onBack }: { label: ReactNode; title: string; onBack: () => void }) {
  return (
    <div className="detail-header">
      <button className="icon-button" type="button" aria-label="Back to club overview" onClick={onBack}>
        <ChevronRight className="back-chevron" size={18} />
      </button>
      <ScreenTitle label={label} title={title} />
    </div>
  );
}


export function LeagueTableRowView({
  row,
  compact = false,
  playerClubShort = initialClub.shortCode,
  onOpenClub,
}: {
  row: LeagueTableRow;
  compact?: boolean;
  playerClubShort?: string;
  onOpenClub?: (identity: string) => void;
}) {
  return (
    <div className={`table-row ${row.short === playerClubShort ? "is-player-club" : ""} ${compact ? "compact" : ""}`}>
      <span>{row.position}</span>
      <ClubLink className="table-club-link" clubIdentity={row.clubId ?? row.short} onOpenClub={onOpenClub}>
        {compact ? row.short : row.name}
      </ClubLink>
      {!compact && <em>{row.played}</em>}
      <em>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</em>
      <b>{row.points}</b>
    </div>
  );
}


export function ScreenTitle({ label, title }: { label: ReactNode; title: ReactNode }) {
  return (
    <header className="screen-title">
      <span className="metric-label">{label}</span>
      <h1>{title}</h1>
    </header>
  );
}


export function ChoiceRow({
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


export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


export function InfoTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "good" | "warn" | "gold";
}) {
  return (
    <div className={`info-tile ${tone ? `tone-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


export function ProgressRow({
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


export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-track">
      <span style={{ width: `${clamp(value, 0, 100)}%` }} />
    </div>
  );
}


export function BottomNav({
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


export function NavButton({
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

