import { positionModules } from "../positionRoles";
import type { Attribute } from "../types";
import { generationProfiles, initialAttributes } from "../data/attributes";
import { getAttributeXpRequirement } from "./attributeXp";
import { clamp } from "../utils";

export function getGenerationProfile(generation: number) {
  return generationProfiles.find((profile) => profile.generation === generation) ?? generationProfiles[generationProfiles.length - 1];
}

export function createGenerationAttributes(generation: number, positionModule = positionModules.Forward): Attribute[] {
  const profile = getGenerationProfile(generation);
  return initialAttributes.map((attribute) => {
    const isKey = positionModule.keyAttributes.includes(attribute.label);
    const value = clamp(attribute.value + (isKey ? profile.startKeyBonus : profile.startGeneralBonus), 1, 99);
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
