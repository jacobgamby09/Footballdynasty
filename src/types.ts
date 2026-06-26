import type { EngineSimEvent } from "./engine/matchEngineCore";
import type {
  ForwardHighlightCategory,
  OpponentForm,
  OpponentProfile,
  ServiceLevel,
} from "./matchEngine";
import type { MatchDirectorState, MatchPhase } from "./engine/matchDirector";
import type { AttributeKey, MatchRole, PositionGroup } from "./positionRoles";

export type NavKey = "player" | "training" | "club" | "home";
export type ScreenKey = NavKey | "club-profile" | "dynasty-create" | "country-select" | "pre-match" | "match" | "summary" | "training-reveal" | "training-summary" | "week-summary" | "news-feed" | "contract-offer" | "free-agent" | "transfer-window" | "season-review" | "retirement";
export type Intensity = "Light" | "Balanced" | "Hard";
export type MatchSpeed = 1 | 2 | 4;
export type Venue = "Home" | "Away";
export type ClubView = "overview" | "fixtures" | "table";
export type HomeView = "base" | "support" | "feed" | "deals" | "dynasty";
export type SupportUpgradeId =
  | "xpFloor"
  | "xpCeiling"
  | "focusSlot2Unlock"
  | "focusSlot2Efficiency"
  | "focusSlot3Unlock"
  | "focusSlot3Efficiency"
  | "trainingLoad"
  | "matchRecovery"
  | "recoveryBaseline"
  | "agentNegotiation"
  | "sponsorshipAppeal"
  | "longevity"
  | "potential"
  | "consistency"
  | "eliteConditioning"
  | "marquee";
export type SupportTrackId = "training" | "recovery" | "career" | "longevity" | "talent" | "elite";
export type DynastyUpgradeId =
  | "academyKeyStart"
  | "academyGeneralStart"
  | "bloodlineXpFloor"
  | "bloodlineXpCeiling"
  | "networkReach";
export type DynastyTrackId = "homeAcademy" | "bloodlineTraining" | "familyNetwork";
export type FitnessAvailability = "Sharp" | "Ready" | "Tired" | "Risky" | "Not match fit";
export type LeagueTierId = "grassroots-dev" | "local-semi-pro" | "regional-pro" | "national-pro" | "top-flight" | "elite";

export type Attribute = {
  label: AttributeKey;
  value: number;
  potential: number;
  xp: number;
};

export type GrowthPressureTone = "fast" | "normal" | "hard" | "elite";

export type SeasonStats = {
  apps: number;
  starts: number;
  goals: number;
  assists: number;
  ratings: number[];
};

export type DynastySeason = {
  season: number;
  generation?: number;
  club: string;
  tierId?: LeagueTierId;
  leaguePosition: number;
  record: string;
  apps: number;
  starts: number;
  goals: number;
  assists: number;
  averageRating: number;
  endOvr?: number;
  prestige?: number;
};

export type Fixture = {
  id: string;
  opponent: string;
  opponentShort: string;
  venue: Venue;
  competition: string;
  opponentStrength: number;
  opponentForm: OpponentForm;
  serviceLevel: ServiceLevel;
};

export type FixtureResult = {
  fixtureId: string;
  opponent: string;
  venue: Venue;
  competition: string;
  teamGoals: number;
  opponentGoals: number;
  outcome: "W" | "D" | "L";
  rating: number;
};

export type LeagueTeam = {
  name: string;
  short: string;
  strength: number;
};

export type ClubState = {
  clubId?: ClubId; // links the player's club to its world entity (Stage C)
  name: string;
  shortName: string;
  shortCode: string;
  tierId: LeagueTierId;
  strength: number;
};

export type LeagueTier = {
  id: LeagueTierId;
  name: string;
  averageOvr: number;
  teamRange: [number, number];
  wageRange: [number, number];
  facilityLevel: number;
  prestigeMultiplier: number;
  description: string;
};

// --- Persistent world model (see WORLD_MODEL.md) ---
export type ClubId = string;
export type LeagueId = string;

export type WorldClub = {
  id: ClubId;
  name: string;
  shortName: string;
  shortCode: string;
  leagueId: LeagueId;
  tierId: LeagueTierId;
  strength: number;
  reputation: number;
};

export type CountryId = "england" | "spain" | "italy" | "germany" | "france" | "holland" | "denmark";

export type Country = {
  id: CountryId;
  name: string;
  flag: string;
  tiers: LeagueTierId[]; // top -> bottom: the global tiers this country's divisions occupy
};

export type WorldLeague = {
  id: LeagueId;
  name: string;
  countryId: CountryId;
  level: number; // 1 = top division of that country
  tierId: LeagueTierId;
  clubIds: ClubId[];
  promotionSlots: number;
  relegationSlots: number;
};

export type ClubSeasonRecord = {
  clubId: ClubId;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  cleanSheets: number;
  recentForm: Array<"W" | "D" | "L">;
};

export type LeagueSeason = {
  leagueId: LeagueId;
  records: Record<ClubId, ClubSeasonRecord>;
};

export type World = {
  seasonNumber: number;
  countries: Record<CountryId, Country>;
  clubs: Record<ClubId, WorldClub>;
  leagues: Record<LeagueId, WorldLeague>;
  leagueSeasons: Record<LeagueId, LeagueSeason>;
  tierOrder: LeagueTierId[];
};

export type DevelopmentEnvironment = {
  label: string;
  facilityLevel: number;
  xpMultiplier: number;
  xpFloorBonus: number;
  recoveryBonus: number;
  supportEfficiency: number;
};

export type TrainingQuality = "Poor" | "Solid" | "Sharp" | "Breakthrough";

export type TrainingQualityProfile = {
  quality: TrainingQuality;
  xpMultiplier: number;
  label: string;
  description: string;
};

export type LeagueTableRow = {
  clubId?: ClubId;
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

export type SeasonState = {
  season: number;
  fixtureIndex: number;
  fixtures: Fixture[];
  results: FixtureResult[];
};

export type DynastyState = {
  generation: number;
  legacyLevel: number;
  legacyPoints: number;
  potentialTier: string;
  familyName: string;
  nationality: CountryId;
  // Carried family standing: the starting prestige floor the NEXT generation
  // inherits, grown from each heir's peak career prestige. Never decreases, so a
  // strong bloodline compounds toward sponsor access over generations.
  reputation: number;
  // Family trust fund (Stage 3): a cash-funded estate level, bought with surplus cash.
  // Persists across generations and gives each heir a sqrt-scaled, capped starting-cash
  // head start — the late-career "spend on yourself vs. set up your child" choice.
  estate: number;
  upgrades: Record<DynastyUpgradeId, number>;
  // Dynasty-wide trophy/award cabinet — persists across generations (carried via the heir spread).
  cabinet: DynastyCabinet;
};

// --- Honours & Legacy (see GDD -> Honours & Legacy System + HONOURS_LEGACY_PLAN.md) ---
// Status/presentation layer only: it grants Prestige, Club Legacy status and (at retirement) Legacy
// Points, but never alters goals/assists/XP, so the OVR development curve is unchanged.

export type ClubLegacyStatus =
  | "New Arrival"
  | "First-Team Regular"
  | "Fan Favourite"
  | "Club Hero"
  | "Club Icon"
  | "Club Legend";

// The current player's standing at one club. Frozen (kept, never deleted) once the player leaves.
export type ClubLegacyRecord = {
  clubId: ClubId;
  clubName: string;
  seasons: number;
  appearances: number;
  starts: number;
  goals: number;
  assists: number;
  ratingTotal: number;
  ratingCount: number;
  promotions: number;
  honours: string[]; // CabinetEntry ids won at this club
  recordsHeld: ClubRecordKey[]; // club records the player currently holds here
  legacyScore: number;
  status: ClubLegacyStatus;
  frozen: boolean;
};

export type ClubRecordKey = "appearances" | "goalsAllTime" | "assistsAllTime" | "goalsInSeason" | "bestSeasonRating";
export type ClubRecordEntry = { value: number; holder: "club-legend" | "you" };
export type ClubRecordSet = Record<ClubRecordKey, ClubRecordEntry>;

export type CabinetEntry = {
  id: string;
  kind: "team" | "individual";
  label: string;
  season: number;
  generation: number;
  clubId?: ClubId;
  detail?: string;
};

export type DynastyCabinet = {
  entries: CabinetEntry[]; // all generations; the UI filters by current / generation / dynasty
};

// EPHEMERAL mid-season working buffer for the player's active league. Never permanent history:
// holds at most one season, rebuilt as the season plays, wiped at every rollover. See the
// persistence contract in HONOURS_LEGACY_PLAN.md.
export type LeaguePlayerSeasonStats = {
  playerId: string;
  clubId: ClubId;
  apps: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  ratingTotal: number;
  ratingCount: number;
};

// Current-career honours state. clubLegacy/clubRecords reset with each generation; the dynasty-wide
// cabinet lives on DynastyState. leagueSeasonStats is the ephemeral per-season buffer.
export type HonoursState = {
  clubLegacy: ClubLegacyRecord[];
  clubRecords: Record<ClubId, ClubRecordSet>;
  leagueSeasonStats: LeaguePlayerSeasonStats[];
};

export type ClubProfile = {
  club: WorldClub;
  country: Country;
  league: WorldLeague;
  tier: LeagueTier;
  table: LeagueTableRow;
  unitOvr: {
    keeper: number;
    defense: number;
    midfield: number;
    attack: number;
  };
  averageRating: number;
  form: string;
  recentForm: Array<"W" | "D" | "L">;
  style: string;
  styleDetail: string;
  strength: string;
  weakness: string;
  cleanSheets: number;
  goalsPerMatch: number;
  concededPerMatch: number;
  facilityLabel: string;
  careerFit: {
    label: string;
    detail: string;
    projectedRole: MatchRole;
  };
};

export type PlayerIdentity = {
  firstName: string;
  lastName: string;
  nationality: CountryId;
};

export type NewCareerSetup = {
  firstName: string;
  lastName: string;
  nationality: CountryId;
  positionGroup: PositionGroup;
};

export type Contract = {
  club: string;
  tierId?: LeagueTierId;
  label: string;
  weeklyWage: number;
  weeksRemaining: number;
  rolePromise: MatchRole;
  appearanceBonus: number;
  goalBonus: number;
  assistBonus: number;
  pressureModifier: number;
};

export type ContractOffer = Omit<Contract, "weeksRemaining"> & {
  title: string;
  weeks: number;
  signingBonus: number;
  summary: string;
  source?: "current-club" | "external-club";
  tierId?: LeagueTierId;
  clubId?: ClubId;
};

export type TransferWindowKind = "mid-season" | "end-season";

export type ClubFitStatus = "Under level" | "Developing" | "Good fit" | "Outgrown";

export type TransferWindowState = {
  id: string;
  kind: TransferWindowKind;
  title: string;
  week: number;
  clubFit: ClubFitStatus;
  clubFitSummary: string;
  interestLevel: "Quiet" | "Watched" | "Interested" | "Offers";
  currentClubOffer?: ContractOffer;
  offers: ContractOffer[];
};

export type FreeAgentState = {
  weeks: number;
  declinedOfferKeys: string[];
};

export type SponsorObjective = {
  type: "appearance" | "goal" | "assist" | "rating";
  target: number;
  label: string;
};

export type SponsorDeal = {
  id: string;
  name: string;
  tierLabel: string;
  prestigeRequired: number;
  weeklyRetainer: number;
  objectiveBonus: number;
  objective: SponsorObjective;
  pressureModifier: number;
  weeksRemaining: number;
  summary: string;
};

export type SponsorPayout = {
  retainer: number;
  objectiveBonus: number;
  total: number;
  objectiveCompleted: boolean;
  sponsorName?: string;
};

export type FeedCategory =
  | "player"
  | "result"
  | "upset"
  | "form"
  | "table"
  | "milestone"
  | "contract"
  | "transfer";

export type FeedTone = "positive" | "negative" | "neutral" | "breaking";

export type FeedTextPart =
  | { type: "text"; text: string }
  | { type: "club"; clubId: ClubId; text: string };

export type FeedStory = {
  id: string;
  week: number;
  season: number;
  category: FeedCategory;
  source: string;
  tone: FeedTone;
  importance: number;
  headline: FeedTextPart[];
  body: FeedTextPart[];
  clubIds: ClubId[];
  playerRelated: boolean;
};

export type SupportUpgradeDefinition = {
  id: SupportUpgradeId;
  name: string;
  category: string;
  maxLevel: number;
  baseCost: number;
  effect: string;
  requires?: Partial<Record<SupportUpgradeId, number>>;
  // Prestige gate: the upgrade only unlocks once the player reaches this prestige. Used for the
  // tier-gated "Elite" perks so mid-late cash buys fresh, meaningful (non-OVR) upgrades.
  requiresPrestige?: number;
};

export type SupportTrackDefinition = {
  id: SupportTrackId;
  name: string;
  category: string;
  upgradeIds: SupportUpgradeId[];
  breakpoints: number[];
  breakthroughs: string[];
  effect: string;
};

export type DynastyUpgradeDefinition = {
  id: DynastyUpgradeId;
  name: string;
  category: string;
  maxLevel: number;
  baseCost: number;
  effect: string;
  requires?: Partial<Record<DynastyUpgradeId, number>>;
};

export type DynastyTrackDefinition = {
  id: DynastyTrackId;
  name: string;
  category: string;
  upgradeIds: DynastyUpgradeId[];
  breakpoints: number[];
  breakthroughs: string[];
  effect: string;
};

export type GameState = {
  week: number;
  player: PlayerIdentity;
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
  // Per-career entropy, set once at creation and persisted. Gives each fresh career a different
  // starting club (among the weakest few) and different match-moment selection, while keeping
  // replay and the balance labs deterministic (they read the stored seed / omit it for a fixed one).
  careerSeed: string;
  attributes: Attribute[];
  seasonStats: SeasonStats;
  season: SeasonState;
  club: ClubState;
  world: World;
  dynasty: DynastyState;
  dynastyHistory: DynastySeason[];
  honours: HonoursState;
  contract: Contract;
  sponsor?: SponsorDeal;
  supportUpgrades: Record<SupportUpgradeId, number>;
  worldFeed: FeedStory[];
  lastEvent: string;
  activeMatch?: MatchState;
  lastMatch?: LastMatchSummary;
  lastTraining?: TrainingSummary;
  contractOffer?: ContractOffer;
  contractOffers?: ContractOffer[];
  transferWindow?: TransferWindowState;
  freeAgent?: FreeAgentState;
};

export type SavePayload = {
  version: 25;
  game: GameState;
};

export type AttributeLevelUp = {
  attribute: AttributeKey;
  before: number;
  after: number;
};

export type TrainingSummary = {
  week: number;
  focuses: AttributeKey[];
  intensity: Intensity;
  quality: TrainingQuality;
  qualityLabel: string;
  ranges: Partial<Record<AttributeKey, { min: number; max: number }>>;
  xp: Partial<Record<AttributeKey, number>>;
  fitnessDelta: number;
  moraleDelta: number;
  trustDelta: number;
  selectionBefore: number;
  selectionAfter: number;
  levelUps: AttributeLevelUp[];
};

export type UpcomingMatch = {
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
  fitnessAvailability: FitnessAvailability;
  isInSquad: boolean;
  managerInstruction: string;
  tacticalFocus: string;
  serviceLevel: ServiceLevel;
};

export type SelectionReport = {
  score: number;
  role: MatchRole;
  nextRole?: "Impact Sub" | "Rotation Starter" | "Starter";
  pointsToNextRole: number;
  factors: SelectionFactor[];
  summary: string;
};

export type SelectionFactor = {
  label: string;
  value: string;
  impact: number;
  tone: "good" | "neutral" | "warn";
};

// A personal stake attached to a single match (Step 4): the player-facing presentation of the
// current sponsor's matchday objective. Only present while a sponsor deal is active. The bonus is
// paid by the sponsor system (getSponsorPayout) — this is purely how that stake is surfaced before
// and after the match, so it never touches attributes or the OVR curve.
export type MatchObjectiveType = "goal" | "assist" | "rating" | "appearance";
export type MatchObjectiveSource = "sponsor";

export type MatchObjective = {
  id: string;
  type: MatchObjectiveType;
  target: number;
  label: string;
  detail: string;
  reward: { cash?: number; prestige?: number; trust?: number };
  source: MatchObjectiveSource;
};

export type MatchObjectiveResult = {
  objective: MatchObjective;
  completed: boolean;
  progress: number;
};

export type MatchState = {
  matchSeed: string;
  fixtureId: string;
  matchNumber: number;
  seasonLength: number;
  teamName: string;
  teamShortName: string;
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
  fitnessAvailability: FitnessAvailability;
  isInSquad: boolean;
  startFitness: number;
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
  heat?: number;
  director?: MatchDirectorState;
  objective?: MatchObjective;
  isComplete?: boolean;
};

export type MatchEvent = SimMatchEvent | PlayerMatchEvent;

export type SimMatchEvent = EngineSimEvent;

export type PlayerMatchEvent = MatchMoment & {
  type: "player_moment";
};

export type MatchMoment = {
  id: string;
  category: ForwardHighlightCategory;
  minute: number;
  opponent: string;
  situation: string;
  context: string;
  choices: MatchChoice[];
  result?: MatchResult;
  chainDepth?: number;
  chainRoutes?: string[];
  directorPhase?: MatchPhase;
  narrativeTags?: string[];
};

export type MatchChoice = {
  id: string;
  label: string;
  uses: AttributeKey[];
  risk: "Low" | "Medium" | "High";
  reward: string;
  manager: "Likes" | "Neutral" | "Risky";
  outcome: "goal" | "assist" | "trust" | "defense";
};

export type ChoiceOutcomeProbability = {
  label: string;
  percentage: number;
  tone: "negative" | "neutral" | "decisive";
};
export type ChoiceOutcomePreview = { outcomes: ChoiceOutcomeProbability[] };

export type ChanceQuality = "Clear chance" | "Good chance" | "Half chance" | "Difficult chance";
export type OutcomeTier = "Poor" | "Okay" | "Good" | "Great";
export type HeatTier = "Cold" | "Warm" | "Hot" | "On Fire";

export type MatchResult = {
  title: string;
  detail: string;
  choiceId: string;
  choiceLabel: string;
  choiceOutcome: MatchChoice["outcome"];
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
  chancesCreated: number;
  xp: Partial<Record<AttributeKey, number>>;
  source?: "manual" | "auto";
  // Dopamine layer (presentation/reward only — never affects goals/assists/XP, so OVR is unchanged):
  screamer?: boolean;
  definingMoment?: boolean;
  heatDelta?: number;
  heatTier?: HeatTier;
};

export type MatchTotals = {
  rating: number;
  trustDelta: number;
  fitnessDelta: number;
  goals: number;
  assists: number;
  chancesCreated: number;
  teamGoals: number;
  opponentGoals: number;
  chanceQualities: ChanceQuality[];
  explanationTags: string[];
  performanceReasons: string[];
  xp: Partial<Record<AttributeKey, number>>;
};

export type LastMatchSummary = MatchTotals & {
  fixtureId: string;
  matchNumber: number;
  seasonLength: number;
  clubName: string;
  clubShortName: string;
  opponent: string;
  venue: Venue;
  competition: string;
  playerRole: MatchRole;
  expectedMinutes: string;
  autoSimulated: number;
  manualHighlights: number;
  cashDelta: number;
  weeklyWage: number;
  appearanceBonus: number;
  goalBonus: number;
  assistBonus: number;
  sponsorRetainer: number;
  sponsorObjectiveBonus: number;
  sponsorCashDelta: number;
  sponsorObjectiveCompleted: boolean;
  sponsorName?: string;
  prestigeDelta: number;
  moraleDelta: number;
  roleBefore: MatchRole;
  roleAfter: MatchRole;
  selectionBefore: number;
  selectionAfter: number;
  pointsToNextRole: number;
  careerImpact: string[];
  objective?: MatchObjectiveResult;
};

export type GenerationProfile = {
  generation: number;
  label: string;
  startKeyBonus: number;
  startGeneralBonus: number;
  potentialKeyBonus: number;
  potentialGeneralBonus: number;
};
