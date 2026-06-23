import type { EngineSimEvent } from "./engine/matchEngineCore";
import type {
  ForwardHighlightCategory,
  OpponentForm,
  OpponentProfile,
  ServiceLevel,
} from "./matchEngine";
import type { AttributeKey, MatchRole, PositionGroup } from "./positionRoles";

export type NavKey = "player" | "training" | "club" | "home";
export type ScreenKey = NavKey | "country-select" | "pre-match" | "match" | "summary" | "training-reveal" | "training-summary" | "week-summary" | "contract-offer" | "free-agent" | "transfer-window" | "season-review" | "retirement";
export type Intensity = "Light" | "Balanced" | "Hard";
export type MatchSpeed = 1 | 2 | 4;
export type Venue = "Home" | "Away";
export type ClubView = "overview" | "fixtures" | "table";
export type HomeView = "base" | "support" | "deals" | "dynasty";
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
  | "sponsorshipAppeal";
export type SupportTrackId = "training" | "recovery" | "career";
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
  // Carried family standing: the starting prestige floor the NEXT generation
  // inherits, grown from each heir's peak career prestige. Never decreases, so a
  // strong bloodline compounds toward sponsor access over generations.
  reputation: number;
  upgrades: Record<DynastyUpgradeId, number>;
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

export type SupportUpgradeDefinition = {
  id: SupportUpgradeId;
  name: string;
  category: string;
  maxLevel: number;
  baseCost: number;
  effect: string;
  requires?: Partial<Record<SupportUpgradeId, number>>;
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
  attributes: Attribute[];
  seasonStats: SeasonStats;
  season: SeasonState;
  club: ClubState;
  world: World;
  dynasty: DynastyState;
  dynastyHistory: DynastySeason[];
  contract: Contract;
  sponsor?: SponsorDeal;
  supportUpgrades: Record<SupportUpgradeId, number>;
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
  version: 15;
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

export type ChanceQuality = "Clear chance" | "Good chance" | "Half chance" | "Difficult chance";
export type OutcomeTier = "Poor" | "Okay" | "Good" | "Great";

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
};

export type GenerationProfile = {
  generation: number;
  label: string;
  startKeyBonus: number;
  startGeneralBonus: number;
  potentialKeyBonus: number;
  potentialGeneralBonus: number;
};
