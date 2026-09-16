import { toDateKey } from './date.ts';
import { returnPlanActive } from './returnTraining.ts';
import { trainingGate } from './generator.ts';
import { readinessForDate } from './readiness.ts';
import type { ActiveWorkout, AppSnapshot, SetKind, SetPerformance } from './types.ts';
import { copySetPerformance, isValidSetPerformance } from './setPerformance.ts';
import { chooseLoadIncrease, loadProgressionOffer } from './loadProgression.ts';

export const MAX_WARMUP_SETS = 5;

export function workoutStepKey(active: ActiveWorkout): string {
  return `${active.startedAt}:${active.exerciseIndex}:${active.plan.exercises[active.exerciseIndex]?.exercise.id ?? 'complete'}:${active.completedSets[active.exerciseIndex] ?? 0}:${active.warmupSets?.[active.exerciseIndex]?.length ?? 0}`;
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
  const returning = returnPlanActive(snapshot.profile);
  if (returning ? active.plan.returnBlockId !== snapshot.profile.returnPlan!.id || active.plan.kind !== 'training'
    || active.plan.exercises.some(({ exercise, sets, target }) => exercise.difficulty > 2 || (!['warmup', 'mobility'].includes(exercise.exerciseType) && (sets > 2 || target !== exercise.minReps)))
    : Boolean(active.plan.returnBlockId)) return 'The saved session does not match your return plan. Close it and review today’s protocol.';
  const signal = readinessForDate(snapshot.profile, dateKey);
  if (!signal || (active.plan.kind === 'rank-trial' ? signal.band !== 'normal' : !['normal', 'reduced'].includes(signal.band))) return 'A current readiness signal is required. Close this session and review Daily Readiness.';
  return null;
}

export function completeWorkoutSet(snapshot: AppSnapshot, expectedStep: string, now = new Date(), performance?: SetPerformance, kind: SetKind = 'work'): AppSnapshot {
  const active = snapshot.activeWorkout;
  if (!active || workoutResumeBlock(snapshot, now) || workoutStepKey(active) !== expectedStep) return snapshot;
  const prescription = active.plan.exercises[active.exerciseIndex];
  if (!prescription || !['work', 'warmup'].includes(kind)) return snapshot;
  if ((prescription.exercise.loading && !performance) || (performance && !isValidSetPerformance(performance, prescription.exercise))) return snapshot;
  if (performance?.machineSetup && (!snapshot.profile?.loadouts
    || performance.machineSetup.location !== snapshot.profile.loadouts.active
    || !snapshot.profile.machineSetups?.some((setup) => setup.id === performance.machineSetup!.id && setup.exerciseId === prescription.exercise.id
      && setup.location === performance.machineSetup!.location && setup.label === performance.machineSetup!.label))) return snapshot;
  const warmups = active.warmupSets?.[active.exerciseIndex] ?? [];
  if (kind === 'warmup') {
    if (active.plan.kind !== 'training' || !prescription.exercise.loading || prescription.exercise.repType !== 'reps'
      || !performance || performance.loadDecision || active.completedSets[active.exerciseIndex] !== 0 || warmups.length >= MAX_WARMUP_SETS) return snapshot;
    const warmupSets = active.plan.exercises.map((_, index) => [...(active.warmupSets?.[index] ?? [])]);
    warmupSets[active.exerciseIndex]!.push(copySetPerformance(performance));
    return { ...snapshot, activeWorkout: { ...active, warmupSets } };
  }
  let plan = active.plan;
  if (performance?.loadDecision) {
    if (active.plan.kind !== 'training' || active.completedSets[active.exerciseIndex] !== 0 || warmups.some((s) => s.effort === 'too-hard')) return snapshot;
    const offer = loadProgressionOffer(prescription.exercise, snapshot.profile!, snapshot.history, toDateKey(now), active.plan.readinessBand === 'reduced', performance.machineSetup);
    const choice = offer && chooseLoadIncrease(offer, performance.loadDecision.incrementKg);
    if (!choice || choice.loadKg !== performance.loadKg || choice.decision.previousKg !== performance.loadDecision.previousKg
      || choice.decision.evidenceDateKeys.join('|') !== performance.loadDecision.evidenceDateKeys.join('|')) return snapshot;
    plan = { ...plan, exercises: plan.exercises.map((item, index) => index === active.exerciseIndex ? { ...item, target: item.exercise.minReps } : item) };
  }
  const completedSets = [...active.completedSets];
  const count = Math.min((completedSets[active.exerciseIndex] ?? 0) + 1, prescription.sets);
  completedSets[active.exerciseIndex] = count;
  const recordedSets = active.plan.exercises.map((_, index) => [...(active.recordedSets?.[index] ?? Array.from({ length: active.completedSets[index] ?? 0 }, () => null))]);
  recordedSets[active.exerciseIndex]!.push(performance ? copySetPerformance(performance) : null);
  const dailyQuest = plan !== active.plan && snapshot.dailyQuest?.id === active.questId ? { ...snapshot.dailyQuest, plan } : snapshot.dailyQuest;
  return { ...snapshot, dailyQuest, activeWorkout: { ...active, plan, completedSets, recordedSets, exerciseIndex: count >= prescription.sets ? active.exerciseIndex + 1 : active.exerciseIndex } };
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
