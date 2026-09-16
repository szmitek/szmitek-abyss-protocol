import { toDateKey } from './date.ts';
import { EXERCISE_BY_ID } from '../data/exercises.ts';
import type { UserProfile, WorkoutHistoryEntry } from './types.ts';

export const RETURN_SESSIONS = 3;

export function returnPlanActive(profile: UserProfile): boolean {
  return Boolean(profile.returnPlan && profile.returnPlan.endedAt === null);
}

export function hasNormalWork(entry: WorkoutHistoryEntry): boolean {
  return entry.completed && !entry.planId.startsWith('rank-trial-') && entry.results.some((result) => {
    const exercise = EXERCISE_BY_ID.get(result.exerciseId);
    return result.completedSets > 0 && exercise && !['warmup', 'mobility'].includes(exercise.exerciseType);
  });
}

export function lastNormalWorkout(history: readonly WorkoutHistoryEntry[], now: Date): WorkoutHistoryEntry | null {
  return [...history].filter((entry) => hasNormalWork(entry) && entry.dateKey <= toDateKey(now) && Date.parse(entry.date) <= now.getTime())
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0] ?? null;
}

export function returnProgress(profile: UserProfile, history: readonly WorkoutHistoryEntry[], now: Date): number {
  const block = profile.returnPlan;
  if (!block) return 0;
  const end = block.endedAt ? Math.min(now.getTime(), Date.parse(block.endedAt)) : now.getTime();
  return Math.min(RETURN_SESSIONS, new Set(history.filter((entry) => entry.returnBlockId === block.id && hasNormalWork(entry)
    && entry.dateKey >= block.startDateKey && entry.dateKey <= toDateKey(now) && Date.parse(entry.date) >= Date.parse(block.startedAt) && Date.parse(entry.date) <= end)
    .map((entry) => entry.dateKey)).size);
}

export function laterEvidenceBoundary(a: string | null, b: string | null): string | null {
  return !a ? b : !b ? a : Date.parse(a) >= Date.parse(b) ? a : b;
}
