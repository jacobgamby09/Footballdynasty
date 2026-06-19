import type { AttributeKey } from "../positionRoles";
import type {
  SupportTrackDefinition,
  SupportUpgradeDefinition,
  SupportUpgradeId,
  TrainingSpecialist,
  TrainingSpecialistId,
} from "../types";

export const supportUpgradeDefinitions: SupportUpgradeDefinition[] = [
  {
    id: "boots",
    name: "Match boots",
    category: "Gear",
    maxLevel: 12,
    baseCost: 180,
    effect: "Boosts action attributes in relevant match moments.",
  },
  {
    id: "recovery",
    name: "Recovery kit",
    category: "Recovery",
    maxLevel: 15,
    baseCost: 160,
    effect: "Reduces match fatigue with diminishing returns across the run.",
  },
  {
    id: "coach",
    name: "Personal coach",
    category: "Training",
    maxLevel: 15,
    baseCost: 220,
    effect: "Raises weekly training XP floor and ceiling over many seasons.",
  },
  {
    id: "nutrition",
    name: "Nutrition plan",
    category: "Recovery",
    maxLevel: 15,
    baseCost: 140,
    effect: "Softens training fatigue and improves recovery consistency.",
  },
  {
    id: "analyst",
    name: "Video analyst",
    category: "Match prep",
    maxLevel: 10,
    baseCost: 260,
    effect: "Improves selection score, prep and match-read support.",
  },
  {
    id: "agent",
    name: "Better agent",
    category: "Career",
    maxLevel: 10,
    baseCost: 300,
    effect: "Improves contract packages and bonus negotiations over the run.",
  },
  {
    id: "lifestyle",
    name: "Lifestyle support",
    category: "Morale",
    maxLevel: 12,
    baseCost: 150,
    effect: "Reduces weekly pressure and prepares future sponsor appeal.",
  },
];

export const supportTrackDefinitions: SupportTrackDefinition[] = [
  {
    id: "training",
    name: "Training setup",
    category: "Development",
    upgradeIds: ["coach"],
    breakpoints: [3, 7, 12, 15],
    breakthroughs: ["Structured drills", "Specialist coach", "Elite sessions", "Master plan"],
    effect: "Raises training XP output and adds support XP to weak key attributes.",
  },
  {
    id: "recovery",
    name: "Recovery setup",
    category: "Availability",
    upgradeIds: ["nutrition", "recovery"],
    breakpoints: [4, 9, 15, 24, 30],
    breakthroughs: ["Stable routine", "Better match recovery", "Sports science", "Elite recovery room", "Peak conditioning"],
    effect: "Improves weekly recovery and reduces training and match fatigue.",
  },
  {
    id: "performance",
    name: "Performance setup",
    category: "Match day",
    upgradeIds: ["boots", "analyst"],
    breakpoints: [4, 9, 15, 22],
    breakthroughs: ["Match prep", "Better gear", "Tactical edge", "Elite execution"],
    effect: "Boosts match action attributes and selection-score prep.",
  },
  {
    id: "career",
    name: "Career setup",
    category: "Contracts",
    upgradeIds: ["agent"],
    breakpoints: [2, 5, 8, 10],
    breakthroughs: ["Agent retained", "Better bonuses", "Transfer network", "Power broker"],
    effect: "Improves contract packages, bonuses and long-run career leverage.",
  },
  {
    id: "lifestyle",
    name: "Lifestyle setup",
    category: "Stability",
    upgradeIds: ["lifestyle"],
    breakpoints: [3, 6, 9, 12],
    breakthroughs: ["Stable routine", "Pressure buffer", "Professional habits", "Balanced life"],
    effect: "Reduces weekly pressure and can later feed sponsor appeal.",
  },
];

export const supportUpgradeMap = Object.fromEntries(supportUpgradeDefinitions.map((upgrade) => [upgrade.id, upgrade])) as Record<
  SupportUpgradeId,
  SupportUpgradeDefinition
>;

export const bootsActionAttributes: AttributeKey[] = ["Finishing", "First Touch", "Dribbling", "Acceleration", "Pace"];

export const trainingSpecialists: TrainingSpecialist[] = [
  {
    id: "finishing",
    name: "Finishing coach",
    category: "Scoring",
    attributes: ["Finishing", "Composure"],
    description: "Extra finishing and calmness work for chances inside the box.",
  },
  {
    id: "movement",
    name: "Movement coach",
    category: "Separation",
    attributes: ["Off Ball", "Acceleration", "Pace"],
    description: "Builds timing, first steps and runs that create better attacking positions.",
  },
  {
    id: "technical",
    name: "Technical coach",
    category: "Touch",
    attributes: ["First Touch", "Dribbling", "Passing"],
    description: "Improves control, carrying and link play under pressure.",
  },
  {
    id: "strength",
    name: "Strength coach",
    category: "Duels",
    attributes: ["Strength", "Heading", "Stamina"],
    description: "Develops physical contests, aerial work and durability.",
  },
  {
    id: "mental",
    name: "Mental coach",
    category: "Decision",
    attributes: ["Work Rate", "Positioning", "Composure"],
    description: "Sharpens habits, defensive awareness and pressure decisions.",
  },
];

export const trainingSpecialistMap = Object.fromEntries(trainingSpecialists.map((specialist) => [specialist.id, specialist])) as Record<
  TrainingSpecialistId,
  TrainingSpecialist
>;

export const initialSupportUpgrades: Record<SupportUpgradeId, number> = {
  boots: 0,
  recovery: 0,
  coach: 0,
  nutrition: 0,
  analyst: 0,
  agent: 0,
  lifestyle: 0,
};
