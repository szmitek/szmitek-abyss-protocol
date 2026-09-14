import { getArcDirective, trainingHistoryBefore } from './arcDirective.ts';
import { resultMeetsTarget, uniformRecordedLoad } from './setPerformance.ts';
import { readinessForDate } from './readiness.ts';
import { hasSafetyHold, isHealthCompatible } from './health.ts';
import { isCalibrationCompatible } from './calibration.ts';
import type { Exercise, UserProfile, WorkoutHistoryEntry } from './types.ts';

export function loadGuidance(exercise: Exercise, profile: UserProfile, history: WorkoutHistoryEntry[], dateKey: string, reduced = false) {
  const directive = getArcDirective(profile, dateKey);
  const samples = trainingHistoryBefore(history, dateKey, directive.historyStart).flatMap((workout) => {
    const result = workout.results.find((r) => r.exerciseId === exercise.id);
    return result ? [{ workout, result }] : [];
  }).slice(0, 2);
  const latest = samples[0];
  const previousKg = latest ? uniformRecordedLoad(latest.result) : null;
  if (!exercise.loading) return { previousKg: null, message: '' };
  if (!exercise.requiredEquipment.every((item) => profile.availableEquipment.includes(item)) || hasSafetyHold(profile.healthProfile) || !isHealthCompatible(exercise, profile) || !isCalibrationCompatible(exercise, profile)) return { previousKg: null, message: 'PLAYER CHECKS // Review current limitations before selecting an external load.' };
  if (reduced || directive.rebuilding || readinessForDate(profile, dateKey)?.band !== 'normal') return { previousKg: null, message: 'LOAD HELD // Choose a manageable lighter load today. No load increase is suggested.' };
  if (exercise.loading === 'stack') return { previousKg: null, message: 'MACHINE SETUP // Use the same machine and kg convention when comparing records. Stack markings are not comparable across machines.' };
  if (previousKg === null) return { previousKg: null, message: 'ESTABLISH LOAD // Choose a light, controllable starting weight. The System does not estimate a starting kg value.' };
  if (latest!.workout.perceivedDifficulty === 'too-hard' || !resultMeetsTarget(latest!.result)) return { previousKg, message: 'REVIEW LOAD // The last session missed a target or felt too hard. Consider a lighter load; no increase is suggested.' };
  const ready = directive.progressionAllowed && samples.length === 2
    && samples[0]!.workout.dateKey !== samples[1]!.workout.dateKey
    && samples.every(({ workout, result }) => (!directive.evidenceStart || workout.date >= directive.evidenceStart)
      && workout.perceivedDifficulty !== 'too-hard' && resultMeetsTarget(result) && uniformRecordedLoad(result) === previousKg
      && result.recordedSets!.every((set) => set!.actual >= exercise.maxReps));
  return { previousKg, message: ready
    ? 'LOAD REVIEW AVAILABLE // Two sessions reached the top of the rep range at the same weight. If technique stays controlled, consider the smallest available increase and restart at the bottom of the rep range. Confirm your own weight.'
    : 'BUILD CONTROL // Repeat a manageable load. A heavier weight is never selected automatically.' };
}
