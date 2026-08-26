import { dayDifference } from './date.ts';
import { STAT_KEYS, type CompletionSummary, type Rank, type StatBlock, type UserProfile, type WorkoutHistoryEntry, type WorkoutPlan } from './types.ts';

export function xpRequiredForLevel(level: number): number {
  return 120 + level * 80;
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let current = 1; current < level; current += 1) total += xpRequiredForLevel(current);
  return total;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < 100 && xp >= totalXpForLevel(level + 1)) level += 1;
  return level;
}

export function levelProgress(profile: UserProfile): { current: number; required: number; ratio: number } {
  const floor = totalXpForLevel(profile.level);
  const required = xpRequiredForLevel(profile.level);
  const current = Math.max(0, profile.xp - floor);
  return { current, required, ratio: Math.min(1, current / required) };
}

const EMPTY_STATS: StatBlock = { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 };

export function calculateAttributeXp(plan: WorkoutPlan): StatBlock {
  const totals: StatBlock = { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 };
  for (const item of plan.exercises) {
    for (const key of STAT_KEYS) totals[key] += (item.exercise.statImpact[key] ?? 0) * item.sets;
  }
  for (const key of STAT_KEYS) totals[key] = Math.round(totals[key] * 3);
  return totals;
}

export function attributeXpRequiredForValue(value: number): number {
  return 100 + Math.max(0, value - 1) * 35;
}

export function totalAttributeXpForValue(value: number): number {
  let total = 0;
  for (let current = 1; current < value; current += 1) total += attributeXpRequiredForValue(current);
  return total;
}

export function attributeValueFromXp(xp: number): number {
  let value = 1;
  while (value < 100 && xp >= totalAttributeXpForValue(value + 1)) value += 1;
  return value;
}

export function attributeProgress(profile: UserProfile, key: (typeof STAT_KEYS)[number]): { current: number; required: number; ratio: number } {
  const floor = totalAttributeXpForValue(profile[key]);
  const required = attributeXpRequiredForValue(profile[key]);
  const current = Math.max(0, profile.attributeXp[key] - floor);
  return { current, required, ratio: Math.min(1, current / required) };
}

export function calculateAttributeDevelopment(profile: UserProfile, plan: WorkoutPlan): { attributeXpEarned: StatBlock; statGains: StatBlock } {
  const attributeXpEarned = calculateAttributeXp(plan);
  const statGains = { ...EMPTY_STATS };
  for (const key of STAT_KEYS) {
    const nextXp = profile.attributeXp[key] + attributeXpEarned[key];
    statGains[key] = attributeValueFromXp(nextXp) - profile[key];
  }
  return { attributeXpEarned, statGains };
}

export function trainingWeekKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function applyCompletedWorkout(profile: UserProfile, workout: WorkoutHistoryEntry): UserProfile {
  const xp = profile.xp + workout.xpEarned;
  const gap = profile.lastWorkoutDateKey ? dayDifference(profile.lastWorkoutDateKey, workout.dateKey) : 1;
  const plannedRecoveryAllowance = Math.max(1, Math.ceil(7 / profile.workoutsPerWeek));
  const streak = gap <= 0 ? profile.streak : gap <= plannedRecoveryAllowance ? profile.streak + 1 : 1;
  const attributeXp = { ...profile.attributeXp };
  for (const key of STAT_KEYS) attributeXp[key] += workout.attributeXpEarned[key];
  const weekKey = trainingWeekKey(workout.dateKey);
  const activeTrainingWeeks = profile.activeTrainingWeeks.includes(weekKey)
    ? profile.activeTrainingWeeks
    : [...profile.activeTrainingWeeks, weekKey];

  return {
    ...profile,
    xp,
    level: levelFromXp(xp),
    attributeXp,
    strength: attributeValueFromXp(attributeXp.strength),
    endurance: attributeValueFromXp(attributeXp.endurance),
    agility: attributeValueFromXp(attributeXp.agility),
    vitality: attributeValueFromXp(attributeXp.vitality),
    mobility: attributeValueFromXp(attributeXp.mobility),
    streak,
    longestStreak: Math.max(profile.longestStreak, streak),
    totalWorkouts: profile.totalWorkouts + 1,
    lastWorkoutDateKey: workout.dateKey,
    activeTrainingWeeks,
  };
}

const RANK_ORDER: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
const RANK_REQUIREMENTS: Record<Exclude<Rank, 'E'>, { level: number; workouts: number; streak: number; activeWeeks: number }> = {
  D: { level: 5, workouts: 12, streak: 3, activeWeeks: 4 },
  C: { level: 12, workouts: 36, streak: 5, activeWeeks: 12 },
  B: { level: 24, workouts: 90, streak: 7, activeWeeks: 28 },
  A: { level: 40, workouts: 180, streak: 10, activeWeeks: 52 },
  S: { level: 65, workouts: 400, streak: 14, activeWeeks: 104 },
};

export function nextRank(rank: Rank): Rank | null {
  return RANK_ORDER[RANK_ORDER.indexOf(rank) + 1] ?? null;
}

export function rankTrialEligibility(profile: UserProfile): { eligible: boolean; target: Rank | null; reasons: string[] } {
  const target = nextRank(profile.rank);
  if (!target || target === 'E') return { eligible: false, target: null, reasons: ['Maximum rank reached'] };
  const requirement = RANK_REQUIREMENTS[target];
  const reasons: string[] = [];
  if (profile.level < requirement.level) reasons.push(`Reach level ${requirement.level}`);
  if (profile.totalWorkouts < requirement.workouts) reasons.push(`Complete ${requirement.workouts} workouts`);
  if (profile.streak < requirement.streak) reasons.push(`Build a ${requirement.streak}-workout streak`);
  if (profile.activeTrainingWeeks.length < requirement.activeWeeks) reasons.push(`Train across ${requirement.activeWeeks} active weeks`);
  if (profile.healthProfile.safetySignals.length > 0) reasons.push('Resolve the Player Scan safety hold');
  return { eligible: reasons.length === 0, target, reasons };
}

export function completeRankTrial(profile: UserProfile): UserProfile {
  const eligibility = rankTrialEligibility(profile);
  if (!eligibility.eligible || !eligibility.target) return profile;
  return {
    ...profile,
    rank: eligibility.target,
    rankTrialCompleted: [...profile.rankTrialCompleted, eligibility.target],
  };
}

export function createCompletionSummary(before: UserProfile, after: UserProfile, workout: WorkoutHistoryEntry, rankTrial: boolean): CompletionSummary {
  return {
    id: `report-${workout.id}`,
    planTitle: workout.title,
    xpEarned: workout.xpEarned,
    attributeXpEarned: workout.attributeXpEarned,
    statGains: workout.statGains,
    levelBefore: before.level,
    levelAfter: after.level,
    rankBefore: before.rank,
    rankAfter: after.rank,
    rankTrial,
  };
}
