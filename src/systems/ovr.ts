import { currentLeagueTier, leagueTiers } from "../data/leagues";
import { positionModules } from "../positionRoles";
import { clamp } from "../utils";
import { getAttributeXpRequirement } from "./attributeXp";
import type { OpponentProfile } from "../matchEngine";
import type { AttributeKey, PositionModule } from "../positionRoles";
import type { Attribute, ClubState, Contract, LeagueTierId } from "../types";

export function getLeagueTierIndex(tierId: LeagueTierId) {
  return Object.keys(leagueTiers).indexOf(tierId);
}


export function getContractLeagueTier(contract: Pick<Contract, "tierId">) {
  return contract.tierId ? leagueTiers[contract.tierId] : currentLeagueTier;
}


export function getClubLeagueTier(club: Pick<ClubState, "tierId">) {
  return leagueTiers[club.tierId] ?? currentLeagueTier;
}


export function calculateOvr(attributes: Attribute[], weights: Partial<Record<AttributeKey, number>> = positionModules.Forward.ovrWeights) {
  const weighted = attributes.reduce(
    (sum, attribute) => {
      const weight = weights[attribute.label] ?? 0;
      return {
        value: sum.value + attribute.value * weight,
        weight: sum.weight + weight,
      };
    },
    { value: 0, weight: 0 },
  );

  if (weighted.weight <= 0) {
    return Math.round(attributes.reduce((sum, attribute) => sum + attribute.value, 0) / Math.max(1, attributes.length));
  }

  return Math.round(weighted.value / weighted.weight);
}


export function calculatePotentialOvr(attributes: Attribute[], weights: Partial<Record<AttributeKey, number>> = positionModules.Forward.ovrWeights) {
  return calculateOvr(
    attributes.map((attribute) => ({ ...attribute, value: attribute.potential })),
    weights,
  );
}


export function getOvrBreakdown(attributes: Attribute[], positionModule: PositionModule) {
  const entries = Object.entries(positionModule.ovrWeights)
    .filter((entry): entry is [AttributeKey, number] => typeof entry[1] === "number" && entry[1] > 0)
    .sort((a, b) => b[1] - a[1]);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);

  return entries.map(([label, weight]) => ({
    label,
    value: getAttributeValue(attributes, label),
    share: totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0,
  }));
}


export function getAttributeValue(attributes: Attribute[], key: AttributeKey) {
  return attributes.find((attribute) => attribute.label === key)?.value ?? 0;
}


export function getAttributeValueMap(attributes: Attribute[]): Record<AttributeKey, number> {
  return Object.fromEntries(attributes.map((attribute) => [attribute.label, attribute.value])) as Record<AttributeKey, number>;
}



export function getAttributeProgressPercent(attribute: Attribute) {
  return getXpPercent(attribute.xp, getAttributeXpRequirement(attribute));
}


export function getXpPercent(xp: number, requirement: number) {
  return requirement > 0 ? clamp((xp / requirement) * 100, 0, 100) : 0;
}


export function getLeagueAdjustedAttributeValueMap(attributes: Attribute[], tier = currentLeagueTier): Record<AttributeKey, number> {
  return Object.fromEntries(
    attributes.map((attribute) => [attribute.label, getContextualAbilityScore(attribute.value, tier)]),
  ) as Record<AttributeKey, number>;
}


export function getLeagueAdjustedOpponentProfile(profile: OpponentProfile, tier = currentLeagueTier): OpponentProfile {
  return {
    ...profile,
    overall: getContextualAbilityScore(profile.overall, tier),
    attack: getContextualAbilityScore(profile.attack, tier),
    midfield: getContextualAbilityScore(profile.midfield, tier),
    defense: getContextualAbilityScore(profile.defense, tier),
    keeper: getContextualAbilityScore(profile.keeper, tier),
    centerBackPace: getContextualAbilityScore(profile.centerBackPace, tier),
    aerialDefense: getContextualAbilityScore(profile.aerialDefense, tier),
    discipline: getContextualAbilityScore(profile.discipline, tier),
    fatigueResistance: getContextualAbilityScore(profile.fatigueResistance, tier),
  };
}


export function getContextualAbilityScore(value: number, tier = currentLeagueTier) {
  return clamp(Math.round(50 + (value - tier.averageOvr) * 1.15), 1, 99);
}

