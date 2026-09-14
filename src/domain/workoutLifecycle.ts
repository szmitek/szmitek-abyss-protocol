import { toDateKey } from './date.ts';
import { trainingGate } from './generator.ts';
import { readinessForDate } from './readiness.ts';
import type { ActiveWorkout, AppSnapshot, SetPerformance } from './types.ts';
import { isValidSetPerformance } from './setPerformance.ts';

export function workoutStepKey(active: ActiveWorkout): string {
  return `${active.startedAt}:${active.exerciseIndex}:${active.plan.exercises[active.exerciseIndex]?.exercise.id ?? 'complete'}:${active.completedSets[active.exerciseIndex] ?? 0}`;
}

export function workoutResumeBlock(snapshot: AppSnapshot, now = new Date()): string | null {
  const active = snapshot.activeWorkout;
  if (!active || !snapshot.profile) return 'No saved workout is available.';
  const consistent = active.plan.exercises.length > 0 && active.exerciseIndex <= active.plan.exercises.length
    && active.plan.exercises.every((item, index) => index < active.exerciseIndex
      ? active.completedSets[index] === item.sets
      : index > active.exerciseIndex ? active.completedSets[index] === 0 : (active.completedSets[index] ?? -1) >= 0 && active.completedSets[index]! < item.sets);
  if (!consistent) return 'The saved checkpoint is inconsistent. Close this session and start a fresh protocol; completed workout history will stay unchanged.';
  const dateKey = toDateKey(now);
  if (toDateKey(new Date(active.startedAt)) !== dateKey) return 'This session belongs to another day. Close it and sync today’s readiness before starting a new protocol.';
  if (snapshot.pendingArcReviewId || trainingGate(snapshot.profile, dateKey)) return 'Your Player checks need attention. Close this session and review the System dashboard.';
  const signal = readinessForDate(snapshot.profile, dateKey);
  if (!signal || (active.plan.kind === 'rank-trial' ? signal.band !== 'normal' : !['normal', 'reduced'].includes(signal.band))) return 'A current readiness signal is required. Close this session and review Daily Readiness.';
  return null;
}

export function completeWorkoutSet(snapshot: AppSnapshot, expectedStep: string, now = new Date(), performance?: SetPerformance): AppSnapshot {
  const active = snapshot.activeWorkout;
  if (!active || workoutResumeBlock(snapshot, now) || workoutStepKey(active) !== expectedStep) return snapshot;
  const prescription = active.plan.exercises[active.exerciseIndex];
  if (!prescription) return snapshot;
  if ((prescription.exercise.loading && !performance) || (performance && !isValidSetPerformance(performance, prescription.exercise))) return snapshot;
  const completedSets = [...active.completedSets];
  const count = Math.min((completedSets[active.exerciseIndex] ?? 0) + 1, prescription.sets);
  completedSets[active.exerciseIndex] = count;
  const recordedSets = active.plan.exercises.map((_, index) => [...(active.recordedSets?.[index] ?? Array.from({ length: active.completedSets[index] ?? 0 }, () => null))]);
  recordedSets[active.exerciseIndex]!.push(performance ?? null);
  return { ...snapshot, activeWorkout: { ...active, completedSets, recordedSets, exerciseIndex: count >= prescription.sets ? active.exerciseIndex + 1 : active.exerciseIndex } };
}

export function workoutReadyToFinish(snapshot: AppSnapshot, now = new Date()): boolean {
  const active = snapshot.activeWorkout;
  return Boolean(active && !workoutResumeBlock(snapshot, now) && active.plan.exercises.length > 0
    && active.exerciseIndex === active.plan.exercises.length
    && active.plan.exercises.every((item, index) => active.completedSets[index] === item.sets));
}

// Use a calendar boundary, not a fixed 24-hour delay (DST days vary in length).
export function millisecondsUntilNextDay(now = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(1, next.getTime() - now.getTime());
}

export function timerSecondsRemaining(deadline: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
