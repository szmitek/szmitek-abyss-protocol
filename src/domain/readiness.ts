import { toDateKey } from './date.ts';
import type { DailyReadiness, DailyReadinessInput, ReadinessBand, UserProfile, WorkoutPlan } from './types.ts';

export function calculateReadinessBand(input: DailyReadinessInput): ReadinessBand {
  if (input.painOrWarning) return 'hold';
  if (input.soreness === 'high') return 'recovery';

  const energyScore = input.energy === 'low' ? -2 : input.energy === 'high' ? 1 : 0;
  const sleepScore = input.sleep === 'poor' ? -2 : input.sleep === 'fair' ? -1 : 0;
  const sorenessScore = input.soreness === 'mild' ? -1 : 0;
  const score = energyScore + sleepScore + sorenessScore;

  if (score <= -4) return 'recovery';
  if (score <= -2) return 'reduced';
  return 'normal';
}

export function createDailyReadiness(input: DailyReadinessInput, now = new Date()): DailyReadiness {
  return {
    id: `readiness-${now.getTime()}`,
    date: now.toISOString(),
    dateKey: toDateKey(now),
    ...input,
    soreMuscles: input.soreness === 'none' ? [] : [...new Set(input.soreMuscles)],
    band: calculateReadinessBand(input),
  };
}

export function recordDailyReadiness(profile: UserProfile, readiness: DailyReadiness): UserProfile {
  return {
    ...profile,
    readinessLog: [readiness, ...profile.readinessLog.filter((entry) => entry.dateKey !== readiness.dateKey)].slice(0, 90),
  };
}

export function readinessForDate(profile: UserProfile, dateKey: string): DailyReadiness | null {
  return profile.readinessLog.find((entry) => entry.dateKey === dateKey) ?? null;
}

export function latestReadiness(profile: UserProfile): DailyReadiness | null {
  return [...profile.readinessLog].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

export function planRequiresDailyReadiness(plan: WorkoutPlan): boolean {
  return plan.kind === 'training' || plan.kind === 'rank-trial';
}
