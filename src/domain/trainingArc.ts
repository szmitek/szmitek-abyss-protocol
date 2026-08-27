import type { MovementAssessment, TrainingArc, TrainingArcContext, TrainingArcDecision, TrainingArcPhase } from './types.ts';

const DAY_MS = 86_400_000;
export const TRAINING_ARC_WEEKS = 4 as const;

export interface TrainingArcState extends TrainingArcContext {
  arc: TrainingArc;
  elapsedDays: number;
  daysRemaining: number;
  progress: number;
  reassessmentDue: boolean;
}

const PHASES: readonly TrainingArcPhase[] = ['calibration', 'foundation', 'overload', 'consolidation'];

function dateValue(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00.000Z`).getTime();
}

export function activeTrainingArc(arcs: readonly TrainingArc[]): TrainingArc | null {
  return [...arcs]
    .filter((arc) => arc.completionAssessmentId === null)
    .sort((a, b) => b.cycleNumber - a.cycleNumber)[0] ?? null;
}

export function getTrainingArcState(arcs: readonly TrainingArc[], dateKey: string): TrainingArcState | null {
  const arc = activeTrainingArc(arcs);
  if (!arc) return null;
  const elapsedDays = Math.max(0, Math.floor((dateValue(dateKey) - dateValue(arc.startDateKey)) / DAY_MS));
  const reassessmentDue = elapsedDays >= TRAINING_ARC_WEEKS * 7;
  const week = Math.min(TRAINING_ARC_WEEKS, Math.floor(elapsedDays / 7) + 1) as 1 | 2 | 3 | 4;
  return {
    arc,
    cycleNumber: arc.cycleNumber,
    week,
    phase: PHASES[week - 1]!,
    elapsedDays,
    daysRemaining: Math.max(0, TRAINING_ARC_WEEKS * 7 - elapsedDays),
    progress: Math.min(1, elapsedDays / (TRAINING_ARC_WEEKS * 7)),
    reassessmentDue,
  };
}

export function registerAssessmentWithTrainingArcs(
  arcs: readonly TrainingArc[],
  assessment: MovementAssessment,
  review?: { id: string; decision: TrainingArcDecision },
): TrainingArc[] {
  const current = activeTrainingArc(arcs);
  if (!current) {
    return [{
      id: `arc-1-${assessment.dateKey}`,
      cycleNumber: 1,
      startDateKey: assessment.dateKey,
      durationWeeks: TRAINING_ARC_WEEKS,
      baselineAssessmentId: assessment.id,
      completionAssessmentId: null,
      reviewId: null,
      entryDecision: null,
    }, ...arcs];
  }

  const state = getTrainingArcState(arcs, assessment.dateKey);
  if (assessment.kind !== 'reassessment' || !state?.reassessmentDue) return [...arcs];
  const completed = arcs.map((arc) => arc.id === current.id ? { ...arc, completionAssessmentId: assessment.id, reviewId: review?.id ?? null } : arc);
  return [{
    id: `arc-${current.cycleNumber + 1}-${assessment.dateKey}`,
    cycleNumber: current.cycleNumber + 1,
    startDateKey: assessment.dateKey,
    durationWeeks: TRAINING_ARC_WEEKS,
    baselineAssessmentId: assessment.id,
    completionAssessmentId: null,
    reviewId: null,
    entryDecision: review?.decision ?? null,
  }, ...completed];
}

export function compareAssessments(current: MovementAssessment, previous: MovementAssessment): { improved: number; declined: number; unchanged: number } {
  const score = { pain: 0, limited: 1, clear: 2 } as const;
  return Object.keys(current.results).reduce((summary, key) => {
    const check = key as keyof MovementAssessment['results'];
    const difference = score[current.results[check]] - score[previous.results[check]];
    if (difference > 0) summary.improved += 1;
    else if (difference < 0) summary.declined += 1;
    else summary.unchanged += 1;
    return summary;
  }, { improved: 0, declined: 0, unchanged: 0 });
}
