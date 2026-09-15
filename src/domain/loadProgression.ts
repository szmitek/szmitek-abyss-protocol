import { getArcDirective, trainingHistoryBefore } from './arcDirective.ts';
import { isCalibrationCompatible } from './calibration.ts';
import { hasSafetyHold, isHealthCompatible } from './health.ts';
import { sameMachine, setupsForExercise } from './loadouts.ts';
import { readinessForDate } from './readiness.ts';
import { resultMeetsTarget, uniformRecordedLoad } from './setPerformance.ts';
import type { Exercise, LoadDecision, MachineSetup, UserProfile, WorkoutHistoryEntry } from './types.ts';

export interface LoadOffer {
  previousKg: number;
  evidenceDateKeys: [string, string];
}

// This is an app guardrail for optional suggestions, not a prescribed starting load.
export const MAX_LOAD_INCREASE_RATIO = 0.1;

export function loadProgressionOffer(exercise: Exercise, profile: UserProfile, history: WorkoutHistoryEntry[], dateKey: string, reduced = false, setup?: MachineSetup): LoadOffer | null {
  const directive = getArcDirective(profile, dateKey);
  if (!exercise.loading || exercise.repType !== 'reps' || reduced || !directive.progressionAllowed
    || readinessForDate(profile, dateKey)?.band !== 'normal' || hasSafetyHold(profile.healthProfile)
    || !isHealthCompatible(exercise, profile) || !isCalibrationCompatible(exercise, profile)
    || profile.excludedExercises.includes(exercise.id)
    || !exercise.requiredEquipment.every((gear) => profile.availableEquipment.includes(gear))) return null;
  if (exercise.loading === 'stack' && (!setup || !setupsForExercise(profile, exercise.id).some((s) => s.id === setup.id && s.exerciseId === setup.exerciseId && s.location === setup.location && s.label === setup.label))) return null;

  // Inspect the latest two exposures; never skip a failed or mixed-machine exposure to cherry-pick success.
  const samples = trainingHistoryBefore(history, dateKey, directive.evidenceStart).flatMap((workout) => {
    const result = workout.results.find((r) => r.exerciseId === exercise.id);
    return result ? [{ workout, result }] : [];
  }).slice(0, 2);
  const previousKg = samples[0] ? uniformRecordedLoad(samples[0].result) : null;
  if (samples.length !== 2 || previousKg === null || previousKg <= 0
    || samples[0]!.workout.dateKey === samples[1]!.workout.dateKey
    || samples.some(({ workout, result }) => workout.perceivedDifficulty === 'too-hard' || !resultMeetsTarget(result)
      || uniformRecordedLoad(result) !== previousKg
      || !result.recordedSets?.every((set) => set && set.actual >= exercise.maxReps && set.effort !== null
        && (exercise.loading !== 'stack' || sameMachine(set, setup!))))) return null;
  return { previousKg, evidenceDateKeys: [samples[0]!.workout.dateKey, samples[1]!.workout.dateKey] };
}

export function chooseLoadIncrease(offer: LoadOffer, incrementKg: number): { loadKg: number; decision: LoadDecision } | null {
  const cents = Math.round(incrementKg * 100);
  if (!Number.isFinite(incrementKg) || cents <= 0 || Math.abs(cents / 100 - incrementKg) > 1e-9
    || incrementKg > offer.previousKg * MAX_LOAD_INCREASE_RATIO + 1e-9) return null;
  const loadKg = Math.round((offer.previousKg + incrementKg) * 100) / 100;
  if (loadKg > 1000 || loadKg <= offer.previousKg) return null;
  return { loadKg, decision: { previousKg: offer.previousKg, incrementKg, evidenceDateKeys: [...offer.evidenceDateKeys] } };
}
