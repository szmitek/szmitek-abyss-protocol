import { hasSafetyHold } from './health.ts';
import { activeTrainingArc, compareAssessments, getTrainingArcState } from './trainingArc.ts';
import type { MovementAssessment, TrainingArcDecision, TrainingArcReview, UserProfile, WorkoutHistoryEntry } from './types.ts';

function inArc(dateKey: string, startDateKey: string, completionDateKey: string): boolean {
  return dateKey >= startDateKey && dateKey <= completionDateKey;
}

function chooseDecision(
  profile: UserProfile,
  reassessment: MovementAssessment,
  adherenceRate: number,
  completedSessions: number,
  movement: TrainingArcReview['movement'],
  difficulty: TrainingArcReview['difficulty'],
  readiness: TrainingArcReview['readiness'],
): TrainingArcDecision {
  if (Object.values(reassessment.results).includes('pain') || hasSafetyHold(profile.healthProfile)) return 'hold';
  if ((completedSessions >= 2 && difficulty.tooHard * 2 >= completedSessions) || readiness.recovery + readiness.hold >= 3) return 'recovery';
  if (movement.declined > movement.improved || adherenceRate < 0.5) return 'recalibrate';
  if (movement.improved > movement.declined && adherenceRate >= 0.75 && difficulty.tooHard * 3 < Math.max(1, completedSessions)) return 'advance';
  return 'continue';
}

function decisionReasons(
  decision: TrainingArcDecision,
  review: Pick<TrainingArcReview, 'adherence' | 'movement' | 'difficulty' | 'readiness' | 'baselinePostureScanId' | 'completionPostureScanId'>,
): string[] {
  const reasons = [
    `${review.adherence.completedSessions} of ${review.adherence.scheduledSessions} planned sessions cleared (${Math.round(review.adherence.rate * 100)}%).`,
    `${review.movement.improved} movement signals improved, ${review.movement.declined} declined and ${review.movement.unchanged} remained stable.`,
  ];

  if (decision === 'hold') reasons.push('Pain or an unresolved warning signal keeps unsupervised training sealed.');
  else if (decision === 'recovery') reasons.push('Repeated high-load or readiness signals require a protected entry into the next cycle.');
  else if (decision === 'recalibrate') reasons.push('Movement or adherence evidence is not yet stable enough for progression; the directive should be reviewed.');
  else if (decision === 'advance') reasons.push('Consistent execution and improved movement signals support controlled progression.');
  else reasons.push('The evidence supports another cycle at the current progression level.');

  reasons.push(
    review.baselinePostureScanId && review.completionPostureScanId
      ? 'Two visual checkpoints are linked for manual comparison; photos were not analyzed or scored.'
      : 'A two-checkpoint visual comparison is unavailable; photos do not affect this decision.',
  );
  return reasons;
}

export function createTrainingArcReview(
  profile: UserProfile,
  reassessment: MovementAssessment,
  history: readonly WorkoutHistoryEntry[],
): TrainingArcReview | null {
  const arc = activeTrainingArc(profile.trainingArcs);
  const state = arc ? getTrainingArcState(profile.trainingArcs, reassessment.dateKey) : null;
  if (!arc || reassessment.kind !== 'reassessment' || !state?.reassessmentDue) return null;

  const baseline = profile.movementAssessments.find((item) => item.id === arc.baselineAssessmentId);
  if (!baseline) return null;

  const completedWorkouts = history.filter((entry) => (
    entry.completed
    && !entry.planId.startsWith('rank-trial-')
    && inArc(entry.dateKey, arc.startDateKey, reassessment.dateKey)
  ));
  const scheduledSessions = profile.workoutsPerWeek * arc.durationWeeks;
  const completedSessions = Math.min(scheduledSessions, completedWorkouts.length);
  const adherenceRate = scheduledSessions === 0 ? 0 : completedSessions / scheduledSessions;
  const movement = compareAssessments(reassessment, baseline);
  const difficulty = completedWorkouts.reduce<TrainingArcReview['difficulty']>((summary, entry) => {
    if (entry.perceivedDifficulty === 'too-easy') summary.tooEasy += 1;
    else if (entry.perceivedDifficulty === 'too-hard') summary.tooHard += 1;
    else summary.perfect += 1;
    return summary;
  }, { tooEasy: 0, perfect: 0, tooHard: 0 });
  const readiness = profile.readinessLog
    .filter((entry) => inArc(entry.dateKey, arc.startDateKey, reassessment.dateKey))
    .reduce<TrainingArcReview['readiness']>((summary, entry) => {
      summary[entry.band] += 1;
      return summary;
    }, { normal: 0, reduced: 0, recovery: 0, hold: 0 });
  const scans = profile.postureScans
    .filter((scan) => scan.trainingArcId === arc.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const baselinePostureScanId = scans.length >= 2 ? scans[0]!.id : null;
  const completionPostureScanId = scans[scans.length - 1]?.id ?? null;
  const decision = chooseDecision(profile, reassessment, adherenceRate, completedSessions, movement, difficulty, readiness);
  const partial = {
    adherence: { scheduledSessions, completedSessions, rate: adherenceRate },
    movement,
    difficulty,
    readiness,
    baselinePostureScanId,
    completionPostureScanId,
  };

  return {
    id: `arc-review-${arc.cycleNumber}-${reassessment.dateKey}`,
    trainingArcId: arc.id,
    cycleNumber: arc.cycleNumber,
    date: reassessment.date,
    dateKey: reassessment.dateKey,
    baselineAssessmentId: baseline.id,
    completionAssessmentId: reassessment.id,
    ...partial,
    decision,
    reasons: decisionReasons(decision, partial),
  };
}
