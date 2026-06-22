import type { Attribute, GrowthPressureTone } from "../types";

export function getAttributeXpRequirement(attribute: Attribute | number) {
  const attributeValue = typeof attribute === "number" ? attribute : attribute.value;
  const growthMultiplier = typeof attribute === "number" ? 1 : getAttributeGrowthPressure(attribute).multiplier;
  return Math.round(getBaseAttributeXpRequirement(attributeValue) * growthMultiplier);
}

export function getBaseAttributeXpRequirement(attributeValue: number) {
  if (attributeValue < 30) {
    return Math.round(22 + attributeValue * 1.1);
  }
  if (attributeValue < 50) {
    return Math.round(52 + (attributeValue - 30) * 2.8);
  }
  if (attributeValue < 70) {
    return Math.round(108 + (attributeValue - 50) * 4.7);
  }
  return Math.round(205 + (attributeValue - 70) * 7.5 + Math.pow(attributeValue - 70, 1.2) * 5);
}

export function getAttributeGrowthPressure(attribute: Attribute): { label: string; copy: string; tone: GrowthPressureTone; multiplier: number } {
  const distance = attribute.potential - attribute.value;
  if (distance >= 10) {
    return {
      label: "Fast growth",
      copy: "Below natural curve",
      tone: "fast",
      multiplier: 0.78,
    };
  }
  if (distance >= 0) {
    return {
      label: "Normal growth",
      copy: "Inside natural curve",
      tone: "normal",
      multiplier: 0.95,
    };
  }

  const overProfile = Math.abs(distance);
  const multiplier = 1 + overProfile * 0.22 + Math.pow(overProfile, 1.2) * 0.08;
  if (overProfile < 8) {
    return {
      label: "Hard push",
      copy: `+${overProfile} over curve`,
      tone: "hard",
      multiplier,
    };
  }

  return {
    label: "Elite push",
    copy: `+${overProfile} over curve`,
    tone: "elite",
    multiplier,
  };
}
