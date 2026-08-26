import type { Exercise, MovementAssessment, MovementCheck, MovementRating, UserProfile } from './types.ts';

const HIGH_IMPACT = new Set(['run-place', 'jump-squat', 'jumping-jack', 'high-knees', 'burpee', 'skater-jump', 'fast-feet', 'lateral-shuffle']);
const BALANCE_DEMAND = new Set(['reverse-lunge', 'forward-lunge', 'split-squat', 'lateral-lunge', 'cossack-squat', 'single-calf-raise', 'bridge-march', 'single-leg-bridge', 'skater-step']);
const OVERHEAD_DEMAND = new Set(['pike-hold', 'pike-pushup', 'jumping-jack', 'step-jack', 'child-pose-reach', 'prone-y-raise']);
const PLANK_DEMAND = new Set(['high-plank', 'plank-shoulder-tap', 'plank-up-down', 'mountain-climber-slow', 'mountain-climber', 'cross-body-climber', 'squat-thrust', 'burpee', 'inchworm', 'walkout-shoulder-tap']);

const CALIBRATION_PRIORITIES: Record<MovementCheck, readonly string[]> = {
  'squat-control': ['ankle-rock', 'hip-flexor-stretch', 'glute-bridge', 'bodyweight-squat'],
  'overhead-reach': ['arm-circles', 'thoracic-rotation', 'reverse-snow-angel', 'cat-cow'],
  'hip-hinge': ['hip-circles', 'hamstring-sweep', 'glute-bridge', 'bird-dog'],
  'single-leg-balance': ['march-place', 'calf-raise', 'glute-bridge', 'ankle-rock'],
  'plank-control': ['dead-bug', 'bird-dog', 'forearm-plank', 'glute-bridge'],
};

export function latestMovementAssessment(profile: UserProfile): MovementAssessment | null {
  return [...profile.movementAssessments].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

export function hasMovementPain(profile: UserProfile): boolean {
  const assessment = latestMovementAssessment(profile);
  return assessment ? Object.values(assessment.results).includes('pain') : false;
}

export function limitedMovementChecks(profile: UserProfile): MovementCheck[] {
  const assessment = latestMovementAssessment(profile);
  if (!assessment) return [];
  return (Object.entries(assessment.results) as [MovementCheck, MovementRating][])
    .filter(([, rating]) => rating === 'limited')
    .map(([check]) => check);
}

function conflictsWithLimitation(exercise: Exercise, check: MovementCheck): boolean {
  switch (check) {
    case 'squat-control':
      return HIGH_IMPACT.has(exercise.id)
        || (['squat', 'lunge', 'lateral-lunge'].includes(exercise.progressionGroup) && exercise.progressionLevel > 1);
    case 'overhead-reach':
      return OVERHEAD_DEMAND.has(exercise.id) || (exercise.muscleLoad.shoulders ?? 0) >= 3;
    case 'hip-hinge':
      return (exercise.progressionGroup === 'hip-hinge' && exercise.progressionLevel > 1)
        || ['superman', 'swimmer'].includes(exercise.id);
    case 'single-leg-balance':
      return HIGH_IMPACT.has(exercise.id) || BALANCE_DEMAND.has(exercise.id);
    case 'plank-control':
      return PLANK_DEMAND.has(exercise.id) || (exercise.progressionGroup === 'plank' && exercise.progressionLevel > 1);
  }
}

export function isCalibrationCompatible(exercise: Exercise, profile: UserProfile): boolean {
  return limitedMovementChecks(profile).every((check) => !conflictsWithLimitation(exercise, check));
}

export function calibrationPriorityScore(exercise: Exercise, profile: UserProfile): number {
  return limitedMovementChecks(profile).reduce((score, check) => (
    score + (CALIBRATION_PRIORITIES[check].includes(exercise.id) ? 32 : 0)
  ), 0);
}

export function preferredCalibrationExercises(profile: UserProfile, exercises: readonly Exercise[]): Exercise[] {
  const preferredIds = new Set(limitedMovementChecks(profile).flatMap((check) => CALIBRATION_PRIORITIES[check]));
  return exercises
    .filter((exercise) => preferredIds.has(exercise.id))
    .sort((a, b) => calibrationPriorityScore(b, profile) - calibrationPriorityScore(a, profile) || a.difficulty - b.difficulty);
}
