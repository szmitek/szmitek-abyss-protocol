import type { ActiveWorkout, Exercise, ExerciseResult, SetPerformance } from './types.ts';

export function isValidSetPerformance(set: SetPerformance, exercise: Exercise): boolean {
  return Number.isInteger(set.actual) && set.actual >= 0 && set.actual <= (exercise.repType === 'seconds' ? 3600 : 500)
    && (set.effort === null || ['too-easy', 'perfect', 'too-hard'].includes(set.effort))
    && (exercise.loading
      ? typeof set.loadKg === 'number' && Number.isFinite(set.loadKg) && set.loadKg >= 0 && set.loadKg <= 1000 && set.effort !== null
      : set.loadKg === null);
}

export function buildWorkoutResults(active: ActiveWorkout): ExerciseResult[] {
  return active.plan.exercises.map((item, index) => {
    const completedSets = active.completedSets[index] ?? 0;
    const recordedSets = active.recordedSets?.[index];
    return {
      exerciseId: item.exercise.id, completedSets, targetPerSet: item.target,
      // Null marks old checkpoints where actual performance was never recorded.
      completedVolume: recordedSets ? recordedSets.reduce((sum, set) => sum + (set?.actual ?? item.target), 0) : completedSets * item.target,
      ...(recordedSets ? { recordedSets } : {}),
    };
  });
}

export function resultMeetsTarget(result: ExerciseResult): boolean {
  if (result.completedSets <= 0 || result.targetPerSet <= 0) return false;
  return result.recordedSets
    ? result.recordedSets.length === result.completedSets && result.recordedSets.every((set) => set !== null && set.actual >= result.targetPerSet && set.effort !== 'too-hard')
    : result.completedVolume >= result.completedSets * result.targetPerSet;
}

export function uniformRecordedLoad(result: ExerciseResult): number | null {
  const sets = result.recordedSets;
  const load = sets?.[0]?.loadKg;
  return sets?.length === result.completedSets && typeof load === 'number' && sets.every((set) => set?.loadKg === load) ? load : null;
}

export function formatRecordedSet(set: SetPerformance | null, index: number, unit: string, loading?: Exercise['loading']): string {
  if (!set) return `Set ${index + 1}: legacy target only`;
  const load = set.loadKg === null ? '' : ` · ${set.loadKg} kg${loading === 'per-hand' ? ' each' : loading === 'stack' ? ' marked' : ' total'}`;
  return `Set ${index + 1}: ${set.actual} ${unit}${load}${set.effort ? ` · ${set.effort.replaceAll('-', ' ')}` : ''}`;
}
