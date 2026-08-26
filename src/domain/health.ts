import type { Exercise, PainArea, PlayerHealthProfile, PosturePriority, UserProfile } from './types.ts';

const WEIGHT_BEARING_HANDS = new Set([
  'scapular-pushup', 'wall-pushup', 'incline-pushup', 'knee-pushup', 'pushup', 'wide-pushup',
  'diamond-pushup', 'archer-pushup', 'pike-hold', 'pike-pushup', 'close-grip-pushup',
  'high-plank', 'plank-shoulder-tap', 'plank-up-down', 'mountain-climber-slow', 'mountain-climber',
  'cross-body-climber', 'squat-thrust', 'burpee', 'inchworm', 'walkout-shoulder-tap',
]);

const HIGH_IMPACT = new Set(['run-place', 'jump-squat', 'jumping-jack', 'high-knees', 'burpee', 'skater-jump', 'fast-feet', 'lateral-shuffle']);
const LOWER_BACK_EXTENSION = new Set(['superman', 'swimmer', 'cobra-to-child', 'leg-raise', 'hollow-hold']);

const PRIORITY_EXERCISES: Record<PosturePriority, readonly string[]> = {
  'pelvic-control': ['dead-bug', 'bird-dog', 'glute-bridge', 'bridge-march', 'hip-flexor-stretch'],
  'rounded-upper-back': ['prone-y-raise', 'reverse-snow-angel', 'thoracic-rotation', 'cat-cow'],
  'forward-shoulders': ['prone-y-raise', 'reverse-snow-angel', 'thoracic-rotation', 'arm-circles'],
  'hip-mobility': ['hip-flexor-stretch', 'world-greatest-stretch', 'figure-four-stretch', 'hip-circles'],
  'shoulder-mobility': ['arm-circles', 'thoracic-rotation', 'child-pose-reach', 'scapular-pushup'],
};

function conflictsWithPain(exercise: Exercise, painArea: PainArea): boolean {
  switch (painArea) {
    case 'wrists':
      return WEIGHT_BEARING_HANDS.has(exercise.id);
    case 'shoulders':
      return exercise.muscleLoad.shoulders !== undefined && exercise.muscleLoad.shoulders >= 2;
    case 'knees':
      return HIGH_IMPACT.has(exercise.id) || (exercise.muscleLoad.quads ?? 0) >= 2;
    case 'ankles':
      return HIGH_IMPACT.has(exercise.id) || (exercise.muscleLoad.calves ?? 0) >= 2;
    case 'hips':
      return exercise.exerciseType !== 'mobility' && ((exercise.muscleLoad.glutes ?? 0) >= 3 || (exercise.muscleLoad.hamstrings ?? 0) >= 3);
    case 'lower-back':
      return LOWER_BACK_EXTENSION.has(exercise.id);
    case 'upper-back-neck':
      return exercise.muscleGroups.includes('neck')
        || (exercise.exerciseType !== 'mobility' && ((exercise.muscleLoad.back ?? 0) >= 3 || (exercise.muscleLoad.shoulders ?? 0) >= 3));
  }
}

export function hasSafetyHold(healthProfile: PlayerHealthProfile): boolean {
  return healthProfile.safetySignals.length > 0;
}

export function isHealthCompatible(exercise: Exercise, profile: UserProfile): boolean {
  return profile.healthProfile.painAreas.every((painArea) => !conflictsWithPain(exercise, painArea));
}

export function healthPriorityScore(exercise: Exercise, profile: UserProfile): number {
  return profile.healthProfile.posturePriorities.reduce((score, priority) => (
    score + (PRIORITY_EXERCISES[priority].includes(exercise.id) ? 38 : 0)
  ), 0);
}

export function preferredHealthExercises(profile: UserProfile, exercises: readonly Exercise[]): Exercise[] {
  if (!profile.healthProfile.scanCompleted || profile.healthProfile.posturePriorities.length === 0) return [];
  const preferredIds = new Set(profile.healthProfile.posturePriorities.flatMap((priority) => PRIORITY_EXERCISES[priority]));
  return exercises
    .filter((exercise) => preferredIds.has(exercise.id))
    .sort((a, b) => healthPriorityScore(b, profile) - healthPriorityScore(a, profile) || a.difficulty - b.difficulty);
}
