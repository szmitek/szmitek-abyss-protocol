import { EXERCISE_BY_ID } from '../data/exercises.ts';
import { laterEvidenceBoundary, returnPlanActive } from './returnTraining.ts';
import { sameMachine } from './loadouts.ts';
import { latestMovementAssessment } from './calibration.ts';
import { dayDifference } from './date.ts';
import { hasSafetyHold } from './health.ts';
import { getTrainingArcState } from './trainingArc.ts';
import { resultMeetsTarget, uniformRecordedLoad } from './setPerformance.ts';
import type { TrainingArcDecision, UserProfile, WorkoutHistoryEntry } from './types.ts';

export const ARC_DIRECTIVE_COPY: Record<TrainingArcDecision, string> = {
  advance: 'Week 3 may increase a target or variant after two successful sessions in this cycle. Readiness and safety rules still apply.',
  continue: 'Keep current variants and targets through this cycle. Difficult sessions may reduce targets; automatic overload is paused until the next re-scan.',
  recalibrate: 'Confirm the Corrective Profile before training. Rebuild from entry variants and minimum targets, with difficulty at most 2 and at most two work sets. No automatic overload this cycle.',
  recovery: 'Start with seven days at difficulty 1, minimum targets and one work set. Then retain entry variants with at most two work sets and difficulty 2. No automatic overload this cycle.',
  hold: 'Resolve Player Scan warnings and record a new pain-free Movement Analysis before training resumes. Then enter a protected recovery block; no automatic overload this cycle.',
};

export function getArcDirective(profile: UserProfile, dateKey: string) {
  const state = getTrainingArcState(profile.trainingArcs, dateKey);
  const decision = state?.arc.entryDecision ?? null;
  const latest = latestMovementAssessment(profile);
  const baseline = profile.movementAssessments.find((assessment) => assessment.id === state?.arc.baselineAssessmentId);
  const clearance = decision === 'hold' && latest && baseline && latest.id !== baseline.id
    && latest.date > baseline.date && latest.dateKey <= dateKey && !Object.values(latest.results).includes('pain')
    && !hasSafetyHold(profile.healthProfile) ? latest : null;
  const needsSafetyCheck = decision === 'hold' && !clearance;
  const needsDirectiveReview = decision === 'recalibrate' && !state?.arc.directiveReviewedAt;
  const rebuilding = decision === 'recalibrate' || decision === 'recovery' || decision === 'hold';
  const entryDateKey = clearance?.dateKey ?? state?.arc.startDateKey;
  const protectedEntry = (decision === 'recovery' || decision === 'hold') && Boolean(entryDateKey && dayDifference(entryDateKey, dateKey) < 7);
  const returning = returnPlanActive(profile);
  const progressionAllowed = !returning && !needsSafetyCheck && !needsDirectiveReview && !state?.reassessmentDue
    && (decision === null || decision === 'advance') && (!state || state.phase === 'overload');
  return {
    state, decision, needsSafetyCheck, needsDirectiveReview, rebuilding, protectedEntry, progressionAllowed, returning,
    historyStart: laterEvidenceBoundary(rebuilding ? clearance?.date ?? baseline?.date ?? `${state!.arc.startDateKey}T00:00:00` : null, profile.returnPlan?.endedAt ?? null),
    evidenceStart: laterEvidenceBoundary(baseline?.date ?? (state ? `${state.arc.startDateKey}T00:00:00` : null), profile.returnPlan?.endedAt ?? profile.returnPlan?.startedAt ?? null),
    copy: decision ? ARC_DIRECTIVE_COPY[decision] : 'Week 3 may progress after two successful sessions in this cycle. Other weeks establish and consolidate the current level.',
    rankTrialAllowed: progressionAllowed,
  };
}

// Completed, distinct daily sessions are evidence. A trial, future record or zero-set result is not.
export function trainingHistoryBefore(history: readonly WorkoutHistoryEntry[], dateKey: string, start: string | null = null): WorkoutHistoryEntry[] {
  const seen = new Set<string>();
  return [...history].sort((a, b) => b.date.localeCompare(a.date)).filter((entry) => {
    if (!entry.completed || entry.returnBlockId || entry.planId.startsWith('rank-trial-') || entry.dateKey >= dateKey || (start && Date.parse(entry.date) < Date.parse(start)) || seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

export function masteredTwice(history: readonly WorkoutHistoryEntry[], exerciseId: string, evidenceStart: string | null): boolean {
  const samples = history.flatMap((workout) => {
    if (workout.returnBlockId || (evidenceStart && Date.parse(workout.date) < Date.parse(evidenceStart))) return [];
    const result = workout.results.find((item) => item.exerciseId === exerciseId);
    return result ? [{ workout, result }] : [];
  }).slice(0, 2);
  return samples.length === 2 && samples[0]!.workout.dateKey !== samples[1]!.workout.dateKey
    && samples.every(({ workout, result }) => workout.perceivedDifficulty !== 'too-hard'
      && resultMeetsTarget(result))
    && (EXERCISE_BY_ID.get(exerciseId)?.loading !== 'stack' || Boolean(samples[0]?.result.recordedSets?.[0]?.machineSetup
      && samples.every(({ result }) => result.recordedSets?.every((set) => sameMachine(set, samples[0]!.result.recordedSets![0]!.machineSetup!)))))
    && (!samples.some(({ result }) => result.recordedSets?.some((set) => set?.loadKg !== null && set?.loadKg !== undefined))
      || (uniformRecordedLoad(samples[0]!.result) !== null && uniformRecordedLoad(samples[0]!.result) === uniformRecordedLoad(samples[1]!.result)));
}

export function hasArcTrialEvidence(profile: UserProfile, history: readonly WorkoutHistoryEntry[], dateKey: string): boolean {
  const directive = getArcDirective(profile, dateKey);
  if (!directive.state && !profile.returnPlan) return true;
  const successful = trainingHistoryBefore(history, dateKey, directive.evidenceStart).filter((entry) =>
    entry.perceivedDifficulty !== 'too-hard' && entry.results.length > 0
    && entry.results.every(resultMeetsTarget),
  );
  return new Set(successful.map((entry) => entry.dateKey)).size >= 2;
}
