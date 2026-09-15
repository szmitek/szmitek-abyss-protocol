import { sameMachine, setupsForExercise } from './loadouts.ts';
import { getArcDirective, trainingHistoryBefore } from './arcDirective.ts';
import { resultMeetsTarget, uniformRecordedLoad } from './setPerformance.ts';
import { readinessForDate } from './readiness.ts';
import { hasSafetyHold, isHealthCompatible } from './health.ts';
import { isCalibrationCompatible } from './calibration.ts';
import type { Exercise, MachineSetup, UserProfile, WorkoutHistoryEntry } from './types.ts';

export function loadGuidance(exercise: Exercise, profile: UserProfile, history: WorkoutHistoryEntry[], dateKey: string, reduced = false, setup?: MachineSetup) {
  if (!exercise.loading) return { previousKg: null, message: '' };
  const directive = getArcDirective(profile, dateKey);
  const samples = trainingHistoryBefore(history, dateKey, directive.historyStart).flatMap((workout) => {
    const result = workout.results.find((r) => r.exerciseId === exercise.id);
    return result && (exercise.loading !== 'stack' || (setup && result.recordedSets?.length && result.recordedSets.every((set) => sameMachine(set, setup)))) ? [{ workout, result }] : [];
  }).slice(0, 2);
  const latest = samples[0];
  const previousKg = latest ? uniformRecordedLoad(latest.result) : null;
  if (!exercise.requiredEquipment.every((item) => profile.availableEquipment.includes(item)) || hasSafetyHold(profile.healthProfile) || !isHealthCompatible(exercise, profile) || !isCalibrationCompatible(exercise, profile)) return { previousKg: null, message: 'PLAYER CHECKS // Review current limitations before selecting an external load.' };
  if (reduced || directive.rebuilding || readinessForDate(profile, dateKey)?.band !== 'normal') return { previousKg: null, message: 'LOAD HELD // Choose a manageable lighter load today. No load increase is suggested.' };
  if (exercise.loading === 'stack') {
    if (!setup || !setupsForExercise(profile, exercise.id).some((s) => s.id === setup.id && s.label === setup.label && s.location === setup.location && s.exerciseId === setup.exerciseId)) return { previousKg: null, message: 'MACHINE SETUP // Select a registered machine to compare its records. Unidentified sets remain separate.' };
    return { previousKg, message: previousKg === null ? 'MACHINE BASELINE // No comparable record for this setup. Choose a controllable starting weight.' : 'SAME MACHINE // Historical kg for this exact setup only. Keep the same settings and kg convention. No automatic weight increase.' };
  }
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
