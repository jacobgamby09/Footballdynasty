import type { DynastyTrackDefinition, DynastyUpgradeDefinition, DynastyUpgradeId } from "../types";

export const dynastyUpgradeDefinitions: DynastyUpgradeDefinition[] = [
  {
    id: "academyKeyStart",
    name: "Key attribute floor",
    category: "Home Academy",
    maxLevel: 24,
    baseCost: 90,
    effect: "Progress toward +1 starting key attributes.",
  },
  {
    id: "academyGeneralStart",
    name: "General foundation",
    category: "Home Academy",
    maxLevel: 18,
    baseCost: 110,
    effect: "Progress toward +1 starting support attributes.",
  },
  {
    id: "bloodlineXpFloor",
    name: "Training floor",
    category: "Bloodline Training",
    maxLevel: 30,
    baseCost: 85,
    effect: "Progress toward permanent +1 weekly XP floor.",
  },
  {
    id: "bloodlineXpCeiling",
    name: "Training ceiling",
    category: "Bloodline Training",
    maxLevel: 30,
    baseCost: 95,
    effect: "Progress toward permanent +1 weekly XP ceiling.",
  },
  {
    id: "familyNetwork",
    name: "Family network",
    category: "Family Network",
    maxLevel: 30,
    baseCost: 130,
    effect: "Progress toward better starting terms and visibility.",
  },
];

export const dynastyTrackDefinitions: DynastyTrackDefinition[] = [
  {
    id: "homeAcademy",
    name: "Home Academy",
    category: "Next-gen floor",
    upgradeIds: ["academyKeyStart", "academyGeneralStart"],
    breakpoints: [3, 7, 12, 18, 26, 36],
    breakthroughs: ["Backyard basics", "Better fundamentals", "Early academy habits", "Family routine", "Home setup", "Elite foundation"],
    effect: "Raises starting attributes for all future generations, especially key attributes.",
  },
  {
    id: "bloodlineTraining",
    name: "Bloodline Training",
    category: "Permanent development",
    upgradeIds: ["bloodlineXpFloor", "bloodlineXpCeiling"],
    breakpoints: [4, 9, 15, 23, 34, 48],
    breakthroughs: ["Reliable sessions", "Sharper weeks", "Training culture", "Quality habit", "Dynasty routine", "Inherited professionalism"],
    effect: "Adds small permanent XP floor and ceiling bonuses to every future training week.",
  },
  {
    id: "familyNetwork",
    name: "Family Network",
    category: "Career access",
    upgradeIds: ["familyNetwork"],
    breakpoints: [2, 5, 9, 14, 20, 28],
    breakthroughs: ["Local contact", "Known surname", "Better trial terms", "Scout visibility", "Agent pathway", "Family reputation"],
    effect: "Improves next generation starting contract, cash and early career access.",
  },
];

export const dynastyUpgradeMap = Object.fromEntries(dynastyUpgradeDefinitions.map((upgrade) => [upgrade.id, upgrade])) as Record<
  DynastyUpgradeId,
  DynastyUpgradeDefinition
>;

export const initialDynastyUpgrades: Record<DynastyUpgradeId, number> = {
  academyKeyStart: 0,
  academyGeneralStart: 0,
  bloodlineXpFloor: 0,
  bloodlineXpCeiling: 0,
  familyNetwork: 0,
};
