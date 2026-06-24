export function createTeamMatchModel(input) {
  const random = createSeededRandom(`${input.matchSeed}-team-model`);
  const teamBias = input.teamStrength + input.trust * 0.08 + input.formScore * 0.06;
  const opponentBias = input.opponentProfile.attack + input.opponentProfile.midfield * 0.25 + (input.venue === "Away" ? 2 : 0);
  const opponentDefensiveResistance = input.opponentProfile.defense * 0.65 + input.opponentProfile.keeper * 0.35;
  const serviceModifier = input.serviceLevel === "Good" ? 0.18 : input.serviceLevel === "Low" ? -0.14 : 0;
  const venueModifier = input.venue === "Home" ? 0.14 : -0.04;
  const opponentVenueModifier = input.venue === "Away" ? 0.12 : -0.03;
  const teamXg = clamp(1.02 + (teamBias - opponentDefensiveResistance) * 0.03 + serviceModifier + venueModifier, 0.3, 2.45);
  const opponentXg = clamp(0.98 + (opponentBias - input.teamStrength) * 0.028 + opponentVenueModifier, 0.3, 2.35);
  const teamGoals = clamp(samplePoisson(teamXg, random), 0, 5);
  const opponentGoals = clamp(samplePoisson(opponentXg, random), 0, 5);
  const teamAttackEvents = clamp(Math.max(teamGoals, Math.round(teamXg * 2.2 + random() * 2)), teamGoals, 8);
  const opponentAttackEvents = clamp(Math.max(opponentGoals, Math.round(opponentXg * 2.2 + random() * 2)), opponentGoals, 8);

  return {
    teamXg: Number(teamXg.toFixed(2)),
    opponentXg: Number(opponentXg.toFixed(2)),
    teamGoals,
    opponentGoals,
    teamAttackEvents,
    opponentAttackEvents,
  };
}

export function createSimEvents(input) {
  const random = createSeededRandom(`${input.matchSeed}-sim-events`);
  const events = [];
  const teamChanceCount = Math.max(0, input.model.teamAttackEvents - input.model.teamGoals);
  const opponentChanceCount = Math.max(0, input.model.opponentAttackEvents - input.model.opponentGoals);

  for (let index = 0; index < input.model.teamGoals; index += 1) {
    events.push(createSimEvent("team_goal", input, random, events.length));
  }
  for (let index = 0; index < input.model.opponentGoals; index += 1) {
    events.push(createSimEvent("opponent_goal", input, random, events.length));
  }
  for (let index = 0; index < teamChanceCount; index += 1) {
    events.push(createSimEvent("team_chance", input, random, events.length));
  }
  for (let index = 0; index < opponentChanceCount; index += 1) {
    events.push(createSimEvent("opponent_chance", input, random, events.length));
  }

  const fillerCount = clamp(8 - events.length, 1, 4);
  for (let index = 0; index < fillerCount; index += 1) {
    events.push(createSimEvent(index === 0 ? "substitution" : "tempo", input, random, events.length));
  }

  return events
    .map((event, index) => ({
      ...event,
      id: `sim-${index}-${event.type}`,
    }))
    .sort((a, b) => a.minute - b.minute);
}

export function getSimScoreAtMinute(events, minute) {
  return events.reduce(
    (score, event) => {
      if (event.minute > minute) {
        return score;
      }

      return {
        teamGoals: score.teamGoals + event.teamGoalDelta,
        opponentGoals: score.opponentGoals + event.opponentGoalDelta,
      };
    },
    { teamGoals: 0, opponentGoals: 0 },
  );
}

export function selectPlayerHighlights(input) {
  if (input.count <= 0) {
    return [];
  }

  const available = [...input.moments];
  const selected = [];

  for (let index = 0; index < input.count && available.length > 0; index += 1) {
    const spread = input.count === 1 ? 0.5 : index / (input.count - 1);
    const targetMinute = Math.round(input.playerWindowStart + (input.playerWindowEnd - input.playerWindowStart) * spread);
    const scoreAtMinute = getSimScoreAtMinute(input.simEvents, targetMinute);
    const weightedPool = available.map((moment) => ({
      moment,
      weight: getMomentGenerationScore({
        moment,
        attributeValues: input.attributeValues,
        role: input.role,
        serviceLevel: input.serviceLevel,
        opponentProfile: input.opponentProfile,
        matchSeed: input.matchSeed,
        targetMinute,
        scoreAtMinute,
        preferredCategories: input.preferredCategories,
      }),
    }));
    const picked = pickWeightedMoment(weightedPool, seededNoise(`${input.matchSeed}-highlight-pick-${index}`));
    selected.push(picked);
    available.splice(available.findIndex((moment) => moment.id === picked.id), 1);
  }

  return selected.length > 0 ? selected : input.moments.slice(0, Math.max(1, input.count));
}

export function chooseAutoSimChoice(input) {
  return [...input.moment.choices]
    .map((choice) => {
      const attributeScore = averageAttributes(input.attributeValues, choice.uses);
      const riskScore = choice.risk === "Low" ? 4 : choice.risk === "Medium" ? 3 : 0;
      const managerScore = choice.manager === "Likes" ? 4 : choice.manager === "Neutral" ? 2 : -2;
      const outputScore = choice.outcome === "goal" ? 12 : choice.outcome === "assist" ? 9 : 4;
      const decisiveCategory = ["shot", "first_time_finish", "run_behind", "aerial_duel", "late_pressure", "counter", "link_up"].includes(input.moment.category);
      const ambitionAdjustment = decisiveCategory && choice.outcome !== "trust" ? Math.max(0, (input.trust - 35) / 8) : 0;
      const fitnessAdjustment =
        input.fitness < 40 && choice.risk === "High"
          ? -8
          : input.fitness < 60 && choice.risk === "High"
            ? -3
            : input.fitness >= 80 && choice.risk === "High"
              ? 2
              : 0;
      const trustAdjustment = input.trust < 45 && choice.manager === "Likes" ? 3 : 0;
      const choiceVariance = Math.round(seededNoise(`${input.matchSeed}-${input.moment.id}-${choice.id}-auto-choice`) * 6) - 3;
      return { choice, score: attributeScore + riskScore + managerScore + outputScore + ambitionAdjustment + fitnessAdjustment + trustAdjustment + choiceVariance };
    })
    .sort((a, b) => b.score - a.score)[0].choice;
}

// Pre-choice odds estimate for the UI. Mirrors resolvePlayerChoice's deterministic resultScore
// EXACTLY but drops the seeded `variance` (±9), then buckets (score − threshold) into a
// qualitative band. Deliberately qualitative (no %), per the engine's design rule. Keep this in
// lockstep with resolvePlayerChoice's resultScore terms.
export function estimateChoiceOdds(input) {
  const score = averageAttributes(input.attributeValues, input.choice.uses);
  const fitnessModifier = getReadinessResolutionModifier(input.fitness);
  const riskPenalty = input.choice.risk === "High" ? 6 : input.choice.risk === "Medium" ? 2 : -2;
  const managerModifier = input.choice.manager === "Likes" ? 3 : input.choice.manager === "Risky" ? -2 : 0;
  const opponentModifier = getOpponentResolutionModifier(input.moment, input.opponentProfile);
  const chanceContext = getChanceQualityContext(input.moment, score, opponentModifier);
  const roleConfidenceModifier = getRoleConfidenceModifier(input.playerRole);
  const trustConfidenceModifier = clamp((input.trust - 45) * 0.08, -1, 3);
  const deterministicScore =
    score +
    fitnessModifier +
    managerModifier +
    roleConfidenceModifier +
    trustConfidenceModifier +
    chanceContext.modifier -
    riskPenalty -
    opponentModifier;
  const threshold = input.choice.risk === "High" ? 55 : input.choice.risk === "Medium" ? 50 : 45;
  const delta = deterministicScore - threshold;
  // variance is seeded ±9, so these boundaries reflect real likelihood without exposing a number.
  const band =
    delta >= 9 ? "Strong" : delta >= 2 ? "Favoured" : delta > -2 ? "Even" : delta > -9 ? "Against the odds" : "Long shot";
  return { band, delta: Math.round(delta) };
}

export function resolvePlayerChoice(input) {
  const score = averageAttributes(input.attributeValues, input.choice.uses);
  const fitnessModifier = getReadinessResolutionModifier(input.fitness);
  const riskPenalty = input.choice.risk === "High" ? 6 : input.choice.risk === "Medium" ? 2 : -2;
  const managerModifier = input.choice.manager === "Likes" ? 3 : input.choice.manager === "Risky" ? -2 : 0;
  const variance = Math.round(seededNoise(`${input.resultSeed}-outcome`) * 18) - 9;
  const ratingVariance = (seededNoise(`${input.resultSeed}-rating`) - 0.5) * 0.3;
  const opponentModifier = getOpponentResolutionModifier(input.moment, input.opponentProfile);
  const chanceContext = getChanceQualityContext(input.moment, score, opponentModifier);
  const roleConfidenceModifier = getRoleConfidenceModifier(input.playerRole);
  const trustConfidenceModifier = clamp((input.trust - 45) * 0.08, -1, 3);
  const resultScore =
    score +
    fitnessModifier +
    managerModifier +
    roleConfidenceModifier +
    trustConfidenceModifier +
    chanceContext.modifier -
    riskPenalty -
    opponentModifier +
    variance;
  const threshold = input.choice.risk === "High" ? 55 : input.choice.risk === "Medium" ? 50 : 45;
  const outcomeTier = getOutcomeTier(resultScore, threshold);
  const success = outcomeTier !== "Poor";
  const conversionModifier = input.moment.director?.conversionModifier ?? 1;
  const decisiveOutcome = isDecisiveOutcome(
    outcomeTier,
    chanceContext.quality,
    input.choice.outcome,
    input.resultSeed,
    conversionModifier,
  );
  const chancesCreated = input.choice.outcome === "assist" && success ? 1 : 0;
  const assistConverted = input.choice.outcome === "assist" && decisiveOutcome
    ? isAssistConverted(outcomeTier, chanceContext.quality, input.opponentProfile, input.resultSeed, conversionModifier)
    : false;
  const fatigueCost = input.choice.risk === "High" ? -8 : input.choice.risk === "Medium" ? -6 : -4;
  const explanationTags = buildResultExplanationTags(input.moment, input.choice, success, opponentModifier, chanceContext.quality, input.fitness);

  if (input.choice.outcome === "goal") {
    return {
      success,
      outcomeTier,
      chanceQuality: chanceContext.quality,
      explanationTags,
      rating: Number((decisiveOutcome ? 7.6 + (input.choice.risk === "High" ? 0.2 : 0) + ratingVariance : success ? 6.8 + ratingVariance : 6.4 + ratingVariance).toFixed(1)),
      trustDelta: decisiveOutcome ? 4 : success ? 2 : input.choice.manager === "Risky" ? -1 : 1,
      fitnessDelta: fatigueCost,
      goals: decisiveOutcome ? 1 : 0,
      assists: 0,
      chancesCreated: 0,
      decisiveOutcome,
    };
  }

  if (input.choice.outcome === "assist") {
    return {
      success,
      outcomeTier,
      chanceQuality: chanceContext.quality,
      explanationTags,
      rating: Number((assistConverted ? 7.3 + ratingVariance : chancesCreated ? 6.9 + ratingVariance : success ? 6.75 + ratingVariance : 6.6 + ratingVariance).toFixed(1)),
      trustDelta: assistConverted ? 5 : chancesCreated ? 4 : success ? 3 : 2,
      fitnessDelta: fatigueCost,
      goals: 0,
      assists: assistConverted ? 1 : 0,
      chancesCreated,
      decisiveOutcome: assistConverted,
    };
  }

  return {
    success,
    outcomeTier,
    chanceQuality: chanceContext.quality,
    explanationTags,
    rating: Number((outcomeTier === "Great" ? 7.0 + ratingVariance : success ? 6.7 + ratingVariance : 6.5 + ratingVariance).toFixed(1)),
    trustDelta: outcomeTier === "Great" ? 5 : success ? 3 : 2,
    fitnessDelta: fatigueCost,
    goals: 0,
    assists: 0,
    chancesCreated: 0,
    decisiveOutcome,
  };
}

function getReadinessResolutionModifier(fitness) {
  if (fitness >= 80) {
    return 1.5;
  }
  if (fitness >= 60) {
    return (fitness - 60) / 25;
  }
  if (fitness >= 40) {
    return -((60 - fitness) / 20) * 3;
  }
  if (fitness >= 20) {
    return -3 - ((40 - fitness) / 20) * 3;
  }
  return -8;
}

export function seededNoise(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

export function createSeededRandom(seed) {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const highlightConfig = {
  shot: {
    baseWeight: 1.45,
    primaryAttributes: ["Finishing", "Composure", "Off Ball"],
    opponentCounters: ["keeper", "defense"],
    preferredService: ["Mixed", "Good"],
    scoreStateTags: ["level", "trailing", "late"],
    categoryBonus: 4,
  },
  first_time_finish: {
    baseWeight: 1.25,
    primaryAttributes: ["Finishing", "First Touch", "Composure"],
    opponentCounters: ["keeper", "defense"],
    preferredService: ["Good"],
    scoreStateTags: ["level", "trailing"],
    categoryBonus: 4,
  },
  run_behind: {
    baseWeight: 1.18,
    primaryAttributes: ["Off Ball", "Acceleration", "Pace"],
    opponentCounters: ["centerBackPace", "defensiveLine"],
    scoreStateTags: ["level", "trailing", "counter"],
    preferredLine: ["Mid", "High"],
    categoryBonus: 2,
  },
  hold_up: {
    baseWeight: 0.85,
    primaryAttributes: ["Strength", "First Touch", "Composure"],
    opponentCounters: ["defense", "pressing"],
    preferredService: ["Low", "Mixed"],
    preferredLine: ["Low", "Mid"],
    scoreStateTags: ["leading", "low_service"],
    categoryBonus: 0,
  },
  aerial_duel: {
    baseWeight: 0.95,
    primaryAttributes: ["Heading", "Strength", "Off Ball"],
    opponentCounters: ["aerialDefense", "defense"],
    preferredService: ["Low", "Mixed"],
    scoreStateTags: ["trailing", "late", "set_piece"],
    categoryBonus: 1,
  },
  press: {
    baseWeight: 0.8,
    primaryAttributes: ["Work Rate", "Acceleration", "Stamina"],
    opponentCounters: ["midfield", "discipline"],
    preferredLine: ["Low", "Mid"],
    scoreStateTags: ["trailing", "level"],
    categoryBonus: 0,
  },
  link_up: {
    baseWeight: 0.8,
    primaryAttributes: ["Passing", "Vision", "Composure"],
    opponentCounters: ["midfield", "discipline"],
    preferredService: ["Mixed", "Good"],
    scoreStateTags: ["level", "leading"],
    categoryBonus: 1,
  },
  counter: {
    baseWeight: 0.75,
    primaryAttributes: ["Pace", "Dribbling", "Vision"],
    opponentCounters: ["centerBackPace", "defensiveLine"],
    preferredLine: ["High"],
    scoreStateTags: ["leading", "transition"],
    categoryBonus: 0,
  },
  defensive_set_piece: {
    baseWeight: 0.45,
    primaryAttributes: ["Marking", "Positioning", "Heading"],
    opponentCounters: ["aerialDefense", "attack"],
    scoreStateTags: ["pressure", "late"],
    categoryBonus: 0,
  },
  late_pressure: {
    baseWeight: 0.95,
    primaryAttributes: ["Composure", "Finishing", "First Touch"],
    opponentCounters: ["keeper", "fatigueResistance"],
    scoreStateTags: ["late", "trailing", "level"],
    categoryBonus: 2,
  },
};

export function getMomentGenerationScore(input) {
  const config = highlightConfig[input.moment.category];
  const attributeAverage = config ? averageAttributes(input.attributeValues, config.primaryAttributes) : 50;
  const serviceFit = config?.preferredService?.includes(input.serviceLevel) ? 0.25 : 0;
  const lineFit = config?.preferredLine?.includes(input.opponentProfile.defensiveLine) ? 0.2 : 0;
  const playerFit = (attributeAverage - 50) / 70;
  const counterAverage =
    config && config.opponentCounters.length > 0
      ? config.opponentCounters.reduce((sum, key) => {
          const value = input.opponentProfile[key];
          return sum + (typeof value === "number" ? value : 55);
        }, 0) / config.opponentCounters.length
      : 55;
  const counterDrag = (counterAverage - 55) / 90;
  const tacticalWeight = Math.max(0.15, (config?.baseWeight ?? 1) + serviceFit + lineFit + playerFit - counterDrag);
  const stateWeight = getScoreStateWeight(input.moment, input.serviceLevel, input.targetMinute, input.scoreAtMinute);
  const roleWeight = getRoleHighlightWeight(input.moment, input.role);
  const positionWeight = input.preferredCategories?.length
    ? input.preferredCategories.includes(input.moment.category)
      ? 1.35
      : 0.72
    : 1;
  const seededJitter = 0.65 + seededNoise(`${input.matchSeed}-${input.moment.id}-highlight-weight`) * 0.7;

  return Math.max(0.05, tacticalWeight * stateWeight * roleWeight * positionWeight * seededJitter);
}

function pickWeightedMoment(weightedPool, roll) {
  const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
  let cursor = roll * totalWeight;
  for (const item of weightedPool) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.moment;
    }
  }

  return weightedPool[weightedPool.length - 1].moment;
}

function getScoreStateWeight(moment, serviceLevel, targetMinute, scoreAtMinute) {
  const config = highlightConfig[moment.category];
  if (!config) {
    return 1;
  }

  const tags = new Set();
  const goalDiff = scoreAtMinute.teamGoals - scoreAtMinute.opponentGoals;
  if (goalDiff < 0) {
    tags.add("trailing");
  } else if (goalDiff > 0) {
    tags.add("leading");
  } else {
    tags.add("level");
  }
  if (targetMinute >= 75) {
    tags.add("late");
  }
  if (serviceLevel === "Low") {
    tags.add("low_service");
  }
  if (moment.category === "counter") {
    tags.add("transition");
  }
  if (moment.category === "defensive_set_piece") {
    tags.add("set_piece");
    tags.add("pressure");
  }

  const matches = config.scoreStateTags.filter((tag) => tags.has(tag)).length;
  return 0.82 + matches * 0.22;
}

function getRoleHighlightWeight(moment, role) {
  const roleWeights = {
    Bench: {
      late_pressure: 1.2,
      press: 1.05,
      defensive_set_piece: 0.85,
      hold_up: 0.9,
    },
    "Impact Sub": {
      shot: 1.18,
      first_time_finish: 1.16,
      run_behind: 1.2,
      link_up: 1,
      late_pressure: 1.2,
      counter: 1.08,
      press: 0.9,
      defensive_set_piece: 0.62,
      hold_up: 0.88,
    },
    "Rotation Starter": {
      shot: 1.08,
      first_time_finish: 1.08,
      run_behind: 1.02,
      aerial_duel: 1.04,
      link_up: 1.05,
      hold_up: 0.98,
      press: 0.9,
      defensive_set_piece: 0.7,
    },
    Starter: {
      shot: 1.02,
      first_time_finish: 1.02,
      run_behind: 1,
      link_up: 1.08,
      hold_up: 1.04,
      press: 0.96,
      defensive_set_piece: 0.78,
    },
  };

  return roleWeights[role]?.[moment.category] ?? 1;
}

function getOpponentResolutionModifier(moment, opponentProfile) {
  if (!opponentProfile) {
    return 0;
  }
  const config = highlightConfig[moment.category];
  if (!config) {
    return 0;
  }
  const counterAverage =
    config.opponentCounters.reduce((sum, key) => {
      const value = opponentProfile[key];
      return sum + (typeof value === "number" ? value : 55);
    }, 0) / config.opponentCounters.length;

  return clamp((counterAverage - 52) * 0.16, -3, 7);
}

function getChanceQualityContext(moment, playerScore, opponentModifier) {
  const rawQuality = playerScore - opponentModifier;
  const qualityScore = rawQuality + (highlightConfig[moment.category]?.categoryBonus ?? 0);

  if (qualityScore >= 64) {
    return { quality: "Clear chance", modifier: 3 };
  }
  if (qualityScore >= 54) {
    return { quality: "Good chance", modifier: 1 };
  }
  if (qualityScore >= 42) {
    return { quality: "Half chance", modifier: -1 };
  }
  return { quality: "Difficult chance", modifier: -4 };
}

function buildResultExplanationTags(moment, choice, success, opponentModifier, chanceQuality, fitness) {
  const tags = [success ? "execution_helped" : "execution_lacked", `quality_${chanceQuality.toLowerCase().replace(/\s+/g, "_")}`];
  if (highlightConfig[moment.category]) {
    tags.push(`highlight_${moment.category}`);
  }
  if (opponentModifier >= 4) {
    tags.push("opponent_countered_action");
  }
  if (fitness < 62) {
    tags.push("fatigue_limited_action");
  }
  if (choice.risk === "High") {
    tags.push("high_risk_choice");
  }

  return tags;
}

function getOutcomeTier(resultScore, threshold) {
  const margin = resultScore - threshold;
  if (margin >= 16) {
    return "Great";
  }
  if (margin >= 2) {
    return "Good";
  }
  if (margin >= -8) {
    return "Okay";
  }
  return "Poor";
}

function isDecisiveOutcome(tier, chanceQuality, outcome, resultSeed = "result", conversionModifier = 1) {
  if (outcome !== "goal" && outcome !== "assist") {
    return false;
  }

  const goalRates = {
    Great: {
      "Clear chance": 0.9,
      "Good chance": 0.74,
      "Half chance": 0.52,
      "Difficult chance": 0.22,
    },
    Good: {
      "Clear chance": 0.72,
      "Good chance": 0.52,
      "Half chance": 0.32,
      "Difficult chance": 0.1,
    },
    Okay: {
      "Clear chance": 0.32,
      "Good chance": 0.18,
      "Half chance": 0.08,
      "Difficult chance": 0.015,
    },
    Poor: {
      "Clear chance": 0,
      "Good chance": 0,
      "Half chance": 0,
      "Difficult chance": 0,
    },
  };
  const assistChanceRates = {
    Great: {
      "Clear chance": 0.82,
      "Good chance": 0.66,
      "Half chance": 0.42,
      "Difficult chance": 0.16,
    },
    Good: {
      "Clear chance": 0.62,
      "Good chance": 0.46,
      "Half chance": 0.24,
      "Difficult chance": 0.08,
    },
    Okay: {
      "Clear chance": 0.24,
      "Good chance": 0.14,
      "Half chance": 0.06,
      "Difficult chance": 0.01,
    },
    Poor: {
      "Clear chance": 0,
      "Good chance": 0,
      "Half chance": 0,
      "Difficult chance": 0,
    },
  };
  const rates = outcome === "assist" ? assistChanceRates : goalRates;
  const rate = (rates[tier]?.[chanceQuality] ?? 0) * conversionModifier;
  return seededNoise(`${resultSeed}-decisive`) < rate;
}

function isAssistConverted(tier, chanceQuality, opponentProfile = {}, resultSeed = "result", conversionModifier = 1) {
  const keeper = opponentProfile.keeper ?? 50;
  const defense = opponentProfile.defense ?? 50;
  const resistance = (keeper * 0.65 + defense * 0.35 - 50) * 0.005;
  const tierBonus = tier === "Great" ? 0.1 : tier === "Good" ? 0.02 : tier === "Okay" ? -0.08 : -0.22;
  const qualityBase = {
    "Clear chance": 0.36,
    "Good chance": 0.24,
    "Half chance": 0.09,
    "Difficult chance": 0.025,
  }[chanceQuality] ?? 0.2;
  const conversionRate = clamp((qualityBase + tierBonus - resistance) * conversionModifier, 0.02, 0.52);
  return seededNoise(`${resultSeed}-teammate-finish`) < conversionRate;
}

function getRoleConfidenceModifier(role) {
  if (role === "Starter") {
    return 3;
  }
  if (role === "Rotation Starter") {
    return 2;
  }
  if (role === "Impact Sub") {
    return 0.5;
  }
  return 0;
}

function averageAttributes(attributeValues, keys) {
  if (!keys || keys.length === 0) {
    return 50;
  }
  return keys.reduce((sum, key) => sum + (attributeValues[key] ?? 50), 0) / keys.length;
}

function createSimEvent(type, input, random, index) {
  const minuteAnchors = [7, 15, 24, 33, 42, 51, 61, 70, 79, 86];
  const minute = clamp(minuteAnchors[index % minuteAnchors.length] + Math.round(random() * 8) - 4, 3, 89);
  const base = {
    id: "",
    type,
    minute,
    teamGoalDelta: type === "team_goal" ? 1 : 0,
    opponentGoalDelta: type === "opponent_goal" ? 1 : 0,
    ratingDelta: type === "team_goal" ? 0.15 : type === "opponent_goal" ? -0.15 : type === "team_chance" ? 0.05 : type === "opponent_chance" ? -0.05 : 0,
    trustDelta: type === "substitution" ? 1 : 0,
    fitnessDelta: type === "team_chance" || type === "tempo" ? -1 : 0,
  };

  const teamShort = input.teamShort || "Your side";

  if (type === "team_goal") {
    return pickEventCopy(base, [
      [`${teamShort} goal`, `${teamShort} turn a sustained spell into the opening.`],
      [`${teamShort} strike`, `${teamShort} break through after moving the defense side to side.`],
      [`Goal for ${teamShort}`, `${teamShort} attack the second ball and find the finish.`],
    ], random);
  }
  if (type === "opponent_goal") {
    return pickEventCopy(base, [
      [`${input.opponentShort} goal`, `${input.opponentShort} find the finish after a dangerous spell.`],
      [`${input.opponentShort} strike`, `${input.opponentShort} exploit the space before the shape can recover.`],
      [`Goal for ${input.opponentShort}`, `${input.opponentShort} punish a loose phase around the box.`],
    ], random);
  }
  if (type === "team_chance") {
    return pickEventCopy(base, [
      [`${teamShort} chance`, `${teamShort} work an opening, but the finish flashes wide.`],
      [`${teamShort} threaten`, `${teamShort} break the line before the keeper gathers the final effort.`],
      [`Pressure from ${teamShort}`, `${teamShort} force the defense deep, but the last touch is blocked.`],
    ], random);
  }
  if (type === "opponent_chance") {
    return pickEventCopy(base, [
      [`${input.opponentShort} chance`, `${input.opponentShort} threaten, but ${teamShort} survive.`],
      [`Warning for ${teamShort}`, `${input.opponentShort} reach the box before the chance is smothered.`],
      [`${input.opponentShort} press`, `${input.opponentShort} create a shooting lane, but the effort misses.`],
    ], random);
  }
  if (type === "substitution") {
    return pickEventCopy(base, [
      ["Fresh legs", `${teamShort} change shape. ${input.managerInstruction}`],
      ["Tactical change", `${teamShort} adjust the press and introduce fresh movement.`],
      ["Shape adjusted", `${teamShort} shuffle the front line as the match enters a new phase.`],
    ], random);
  }

  return pickEventCopy(base, [
    ["Midfield battle", "Both sides trade possession without opening a clean lane forward."],
    ["Tempo settles", "The match compresses around midfield as both teams protect their shape."],
    ["Patient spell", `${teamShort} circulate the ball while ${input.opponentShort} hold their line.`],
    ["Second-ball phase", "Loose clearances and midfield duels interrupt the rhythm of the match."],
  ], random);
}

function pickEventCopy(base, variants, random) {
  const [title, detail] = variants[Math.min(variants.length - 1, Math.floor(random() * variants.length))];
  return { ...base, title, detail };
}

function samplePoisson(lambda, random) {
  const limit = Math.exp(-lambda);
  let product = 1;
  let count = 0;

  do {
    count += 1;
    product *= random();
  } while (product > limit);

  return count - 1;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
