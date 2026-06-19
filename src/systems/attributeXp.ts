import type { Attribute, GrowthPressureTone } from "../types";

export function getAttributeXpRequirement(attribute: Attribute | number) {
  const attributeValue = typeof attribute === "number" ? attribute : attribute.value;
  const growthMultiplier = typeof attribute === "number" ? 1 : getAttributeGrowthPressure(attribute).multiplier;
  return Math.round(getBaseAttributeXpRequirement(attributeValue) * growthMultiplier);
}

export function getBaseAttributeXpRequirement(attributeValue: number) {
  if (attributeValue < 30) {
    return Math.round(24 + attributeValue * 1.25);
  }
  if (attributeValue < 50) {
    return Math.round(60 + (attributeValue - 30) * 3.5);
  }
  if (attributeValue < 70) {
    return Math.round(130 + (attributeValue - 50) * 6);
  }
  return Math.round(250 + (attributeValue - 70) * 10 + Math.pow(attributeValue - 70, 1.25) * 8);
}

export function getAttributeGrowthPressure(attribute: Attribute): { label: string; copy: string; tone: GrowthPressureTone; multiplier: number } {
  const distance = attribute.potential - attribute.value;
  if (distance >= 10) {
    return {
      label: "Fast growth",
      copy: "Below natural curve",
      tone: "fast",
      multiplier: 0.85,
    };
  }
  if (distance >= 0) {
    return {
      label: "Normal growth",
      copy: "Inside natural curve",
      tone: "normal",
      multiplier: 1,
    };
  }

  const overProfile = Math.abs(distance);
  const multiplier = 1 + overProfile * 0.18 + Math.pow(overProfile, 1.22) * 0.035;
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
