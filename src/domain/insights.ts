import { EXERCISE_BY_ID } from '../data/exercises.ts';
import type { PerceivedDifficulty, RepType, WorkoutHistoryEntry } from './types.ts';

export interface ExerciseSample {
  id: string;
  workoutId: string;
  dateKey: string;
  target: number;
  sets: number;
  volume: number;
  difficulty: PerceivedDifficulty;
}

export interface ExerciseInsight {
  exerciseId: string;
  name: string;
  repType: RepType | null;
  sessions: number;
  firstTarget: number;
  latestTarget: number;
  bestTarget: number;
  totalVolume: number;
  samples: ExerciseSample[];
}

export function buildExerciseInsights(history: readonly WorkoutHistoryEntry[]): ExerciseInsight[] {
  const insights = new Map<string, ExerciseInsight>();
  const chronological = [...history]
    .filter((workout) => workout.completed)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const workout of chronological) {
    for (const [index, result] of workout.results.entries()) {
      const exercise = EXERCISE_BY_ID.get(result.exerciseId);
      if (result.completedSets <= 0) continue;
      const sample: ExerciseSample = {
        id: `${workout.id}-${index}`, workoutId: workout.id, dateKey: workout.dateKey,
        target: result.targetPerSet, sets: result.completedSets, volume: result.completedVolume,
        difficulty: workout.perceivedDifficulty,
      };
      const current = insights.get(result.exerciseId);
      if (!current) {
        insights.set(result.exerciseId, {
          exerciseId: result.exerciseId,
          name: exercise?.name ?? result.exerciseId,
          repType: exercise?.repType ?? null,
          sessions: 1,
          firstTarget: result.targetPerSet,
          latestTarget: result.targetPerSet,
          bestTarget: result.targetPerSet,
          totalVolume: result.completedVolume,
          samples: [sample],
        });
        continue;
      }
      if (!current.samples.some((item) => item.workoutId === workout.id)) current.sessions += 1;
      current.samples.push(sample);
      current.latestTarget = result.targetPerSet;
      current.bestTarget = Math.max(current.bestTarget, result.targetPerSet);
      current.totalVolume += result.completedVolume;
    }
  }

  return [...insights.values()].sort((a, b) =>
    b.sessions - a.sessions
    || a.name.localeCompare(b.name),
  );
}

export interface ActivityWeek {
  startDateKey: string;
  sessions: number;
  activeDays: number;
  sets: number;
  seconds: number;
  repetitions: number;
  timedVolume: number;
}

// Calendar arithmetic uses date keys, so daylight-saving transitions cannot shift buckets.
export function buildActivityWeeks(history: readonly WorkoutHistoryEntry[], today: string, count = 8): ActivityWeek[] {
  const monday = new Date(`${today}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const weeks = Array.from({ length: count }, (_, index): ActivityWeek => {
    const date = new Date(monday);
    date.setUTCDate(date.getUTCDate() - (count - 1 - index) * 7);
    return { startDateKey: date.toISOString().slice(0, 10), sessions: 0, activeDays: 0, sets: 0, seconds: 0, repetitions: 0, timedVolume: 0 };
  });
  const days = weeks.map(() => new Set<string>());
  for (const entry of history) {
    if (!entry.completed || entry.dateKey > today) continue;
    const index = weeks.findIndex((week, i) => entry.dateKey >= week.startDateKey && (i === weeks.length - 1 || entry.dateKey < weeks[i + 1]!.startDateKey));
    if (index < 0) continue;
    const week = weeks[index]!;
    week.sessions += 1;
    days[index]!.add(entry.dateKey);
    week.activeDays = days[index]!.size;
    week.seconds += entry.durationSeconds;
    for (const result of entry.results) {
      if (result.completedSets <= 0) continue;
      week.sets += result.completedSets;
      const unit = EXERCISE_BY_ID.get(result.exerciseId)?.repType;
      if (unit === 'reps') week.repetitions += result.completedVolume;
      else if (unit === 'seconds') week.timedVolume += result.completedVolume;
    }
  }
  return weeks;
}
