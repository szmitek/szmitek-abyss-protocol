import { isValidMachineSetup } from './loadouts.ts';
import type { ActiveWorkout, Exercise, ExerciseResult, SetPerformance } from './types.ts';

export function copySetPerformance(set: SetPerformance): SetPerformance {
  return { ...set, ...(set.machineSetup ? { machineSetup: { ...set.machineSetup } } : {}),
    ...(set.loadDecision ? { loadDecision: { ...set.loadDecision, evidenceDateKeys: [...set.loadDecision.evidenceDateKeys] } } : {}) };
}

export function isValidSetPerformance(set: SetPerformance, exercise: Exercise): boolean {
  const decision = set.loadDecision;
  const validDecision = decision === undefined || (decision !== null && typeof decision === 'object' && Boolean(exercise.loading) && exercise.repType === 'reps'
    && typeof decision.previousKg === 'number' && Number.isFinite(decision.previousKg) && decision.previousKg > 0
    && typeof decision.incrementKg === 'number' && Number.isFinite(decision.incrementKg) && decision.incrementKg > 0
    && decision.incrementKg <= decision.previousKg * 0.1 + 1e-9
    && Math.abs(Math.round(decision.incrementKg * 100) / 100 - decision.incrementKg) < 1e-9
    && set.loadKg === Math.round((decision.previousKg + decision.incrementKg) * 100) / 100
    && Array.isArray(decision.evidenceDateKeys) && decision.evidenceDateKeys.length === 2
    && decision.evidenceDateKeys.every((day) => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day)
    && decision.evidenceDateKeys[0] > decision.evidenceDateKeys[1]
    && (exercise.loading !== 'stack' || Boolean(set.machineSetup)));
  return validDecision && (set.machineSetup === undefined || (isValidMachineSetup(set.machineSetup) && set.machineSetup.exerciseId === exercise.id && exercise.loading === 'stack'))
    && Number.isInteger(set.actual) && set.actual >= 0 && set.actual <= (exercise.repType === 'seconds' ? 3600 : 500)
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
      ...(active.warmupSets?.[index]?.length ? { warmupSets: active.warmupSets[index] } : {}),
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

export function formatRecordedSet(set: SetPerformance | null, index: number, unit: string, loading?: Exercise['loading'], warmup = false): string {
  if (!set) return `Set ${index + 1}: legacy target only`;
  const load = set.loadKg === null ? '' : ` · ${set.loadKg} kg${loading === 'per-hand' ? ' each' : loading === 'stack' ? ' marked' : ' total'}`;
  return `${warmup ? 'Warm-up' : 'Set'} ${index + 1}: ${set.actual} ${unit}${load}${set.machineSetup ? ` · ${set.machineSetup.location.toUpperCase()} / ${set.machineSetup.label}` : loading === 'stack' ? ' · machine not identified' : ''}${set.effort ? ` · ${set.effort.replaceAll('-', ' ')}` : ''}${set.loadDecision ? ` · chosen increase +${set.loadDecision.incrementKg} kg from ${set.loadDecision.previousKg} kg (${set.loadDecision.evidenceDateKeys.join(', ')})` : ''}`;
}
