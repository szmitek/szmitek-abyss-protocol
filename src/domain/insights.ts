import { EXERCISE_BY_ID } from '../data/exercises.ts';
import type { RepType, WorkoutHistoryEntry } from './types.ts';

export interface ExerciseInsight {
  exerciseId: string;
  name: string;
  repType: RepType;
  sessions: number;
  firstTarget: number;
  latestTarget: number;
  bestTarget: number;
  totalVolume: number;
}

export function buildExerciseInsights(history: WorkoutHistoryEntry[]): ExerciseInsight[] {
  const insights = new Map<string, ExerciseInsight>();
  const chronological = [...history]
    .filter((workout) => workout.completed)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const workout of chronological) {
    for (const result of workout.results) {
      const exercise = EXERCISE_BY_ID.get(result.exerciseId);
      if (!exercise) continue;
      const current = insights.get(result.exerciseId);
      if (!current) {
        insights.set(result.exerciseId, {
          exerciseId: result.exerciseId,
          name: exercise.name,
          repType: exercise.repType,
          sessions: 1,
          firstTarget: result.targetPerSet,
          latestTarget: result.targetPerSet,
          bestTarget: result.targetPerSet,
          totalVolume: result.completedVolume,
        });
        continue;
      }
      current.sessions += 1;
      current.latestTarget = result.targetPerSet;
      current.bestTarget = Math.max(current.bestTarget, result.targetPerSet);
      current.totalVolume += result.completedVolume;
    }
  }

  return [...insights.values()].sort((a, b) =>
    b.sessions - a.sessions
    || (b.latestTarget - b.firstTarget) - (a.latestTarget - a.firstTarget)
    || b.totalVolume - a.totalVolume
    || a.name.localeCompare(b.name),
  );
}
