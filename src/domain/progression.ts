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

export function calculateStatGains(plan: WorkoutPlan): StatBlock {
  const totals: StatBlock = { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 };
  for (const item of plan.exercises) {
    for (const key of STAT_KEYS) totals[key] += (item.exercise.statImpact[key] ?? 0) * item.sets;
  }
  for (const key of STAT_KEYS) totals[key] = totals[key] === 0 ? 0 : Math.max(1, Math.min(3, Math.round(totals[key] / 7)));
  return totals;
}

export function applyCompletedWorkout(profile: UserProfile, workout: WorkoutHistoryEntry): UserProfile {
  const xp = profile.xp + workout.xpEarned;
  const gap = profile.lastWorkoutDateKey ? dayDifference(profile.lastWorkoutDateKey, workout.dateKey) : 1;
  const plannedRecoveryAllowance = Math.max(1, Math.ceil(7 / profile.workoutsPerWeek));
  const streak = gap <= 0 ? profile.streak : gap <= plannedRecoveryAllowance ? profile.streak + 1 : 1;

  return {
    ...profile,
    xp,
    level: levelFromXp(xp),
    strength: profile.strength + workout.statGains.strength,
    endurance: profile.endurance + workout.statGains.endurance,
    agility: profile.agility + workout.statGains.agility,
    vitality: profile.vitality + workout.statGains.vitality,
    mobility: profile.mobility + workout.statGains.mobility,
    streak,
    longestStreak: Math.max(profile.longestStreak, streak),
    totalWorkouts: profile.totalWorkouts + 1,
    lastWorkoutDateKey: workout.dateKey,
  };
}

const RANK_ORDER: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
const RANK_REQUIREMENTS: Record<Exclude<Rank, 'E'>, { level: number; workouts: number; streak: number }> = {
  D: { level: 4, workouts: 8, streak: 3 },
  C: { level: 10, workouts: 25, streak: 5 },
  B: { level: 20, workouts: 60, streak: 7 },
  A: { level: 35, workouts: 120, streak: 10 },
  S: { level: 55, workouts: 250, streak: 14 },
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
    statGains: workout.statGains,
    levelBefore: before.level,
    levelAfter: after.level,
    rankBefore: before.rank,
    rankAfter: after.rank,
    rankTrial,
  };
}
