import { positionModules } from "../positionRoles";
import type { Attribute } from "../types";
import { generationProfiles, initialAttributes } from "../data/attributes";
import { getAttributeXpRequirement } from "./attributeXp";
import { getDynastyGeneralStartBonus, getDynastyKeyStartBonus } from "./dynastyUpgrades";
import { clamp } from "../utils";
import type { DynastyState } from "../types";

export function getGenerationProfile(generation: number) {
  return generationProfiles.find((profile) => profile.generation === generation) ?? generationProfiles[generationProfiles.length - 1];
}

export function createGenerationAttributes(generation: number, positionModule = positionModules.Forward, dynasty?: DynastyState): Attribute[] {
  const profile = getGenerationProfile(generation);
  const keyDynastyBonus = dynasty ? getDynastyKeyStartBonus(dynasty) : 0;
  const generalDynastyBonus = dynasty ? getDynastyGeneralStartBonus(dynasty) : 0;
  return initialAttributes.map((attribute) => {
    const isKey = positionModule.keyAttributes.includes(attribute.label);
    const value = clamp(attribute.value + (isKey ? profile.startKeyBonus + keyDynastyBonus : profile.startGeneralBonus + generalDynastyBonus), 1, 99);
    const potential = clamp(
      Math.max(value + 8, attribute.potential + (isKey ? profile.potentialKeyBonus : profile.potentialGeneralBonus)),
      1,
      99,
    );
    return {
      ...attribute,
      value,
      potential,
      xp: Math.min(attribute.xp, getAttributeXpRequirement({ ...attribute, value, potential }) - 1),
    };
  });
}
