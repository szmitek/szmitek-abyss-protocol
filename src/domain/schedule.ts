import { toDateKey } from './date.ts';
import type { UserProfile } from './types.ts';

const TRAINING_DAYS: Record<UserProfile['workoutsPerWeek'], readonly number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

function dateFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`);
}

function weekdayIsScheduled(workoutsPerWeek: UserProfile['workoutsPerWeek'], weekday: number): boolean {
  return TRAINING_DAYS[workoutsPerWeek].includes(weekday);
}

export function isScheduledTrainingDay(profile: UserProfile, dateKey: string): boolean {
  if (profile.totalWorkouts === 0) return true;
  return weekdayIsScheduled(profile.workoutsPerWeek, dateFromKey(dateKey).getDay());
}

export function nextScheduledTrainingDateKey(profile: UserProfile, dateKey: string): string {
  const date = dateFromKey(dateKey);
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = new Date(date.getTime());
    candidate.setDate(date.getDate() + offset);
    if (weekdayIsScheduled(profile.workoutsPerWeek, candidate.getDay())) return toDateKey(candidate);
  }
  return dateKey;
}
