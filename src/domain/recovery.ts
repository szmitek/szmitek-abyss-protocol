import { EXERCISE_BY_ID } from '../data/exercises.ts';
import { MUSCLE_GROUPS, type RecoveryState, type WorkoutHistoryEntry } from './types.ts';

export function calculateRecovery(history: WorkoutHistoryEntry[], now: Date = new Date()): RecoveryState {
  const recovery = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, 100])) as RecoveryState;
  const load = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, 0])) as RecoveryState;

  for (const workout of history) {
    if (!workout.completed) continue;
    const ageHours = Math.max(0, (now.getTime() - new Date(workout.date).getTime()) / 3_600_000);
    if (ageHours >= 72) continue;
    const remainingFatigue = 1 - ageHours / 72;

    for (const result of workout.results) {
      const exercise = EXERCISE_BY_ID.get(result.exerciseId);
      if (!exercise) continue;
      for (const [group, groupLoad] of Object.entries(exercise.muscleLoad)) {
        load[group as keyof RecoveryState] += (groupLoad ?? 0) * result.completedSets * 4 * remainingFatigue;
      }
    }
  }

  for (const group of MUSCLE_GROUPS) {
    recovery[group] = Math.max(0, Math.round(100 - load[group]));
  }
  return recovery;
}
