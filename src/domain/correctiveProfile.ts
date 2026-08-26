import { latestMovementAssessment } from './calibration.ts';
import type {
  CorrectiveEvidenceSource,
  CorrectiveGoal,
  CorrectiveProfile,
  CorrectiveTarget,
  Exercise,
  ExerciseSelectionReason,
  MovementCheck,
  PosturePriority,
  UserProfile,
} from './types.ts';

export const CORRECTIVE_GOAL_DETAILS: Record<CorrectiveGoal, { label: string; detail: string }> = {
  'pelvic-control': { label: 'Pelvic Control', detail: 'Build repeatable trunk and hip control without chasing a visual diagnosis.' },
  'upper-back-capacity': { label: 'Upper-back Capacity', detail: 'Develop controlled upper-back and shoulder-blade work.' },
  'shoulder-position': { label: 'Shoulder Position', detail: 'Train shoulder-blade control and comfortable opening.' },
  'head-neck-control': { label: 'Head & Neck Control', detail: 'Practice low-load head and neck alignment control.' },
  'hip-mobility': { label: 'Hip Mobility', detail: 'Restore comfortable hip range while keeping the pelvis controlled.' },
  'shoulder-mobility': { label: 'Shoulder Mobility', detail: 'Improve comfortable overhead and rotational range.' },
  'left-right-control': { label: 'Left / Right Control', detail: 'Develop stable unilateral and cross-body movement.' },
};

export const CORRECTIVE_EXERCISES: Record<CorrectiveGoal, readonly string[]> = {
  'pelvic-control': ['supine-pelvic-tilt', 'dead-bug', 'bird-dog', 'glute-bridge', 'bridge-march', 'side-plank-knees', 'hip-flexor-stretch'],
  'upper-back-capacity': ['prone-y-raise', 'reverse-snow-angel', 'wall-slide', 'thoracic-rotation', 'cat-cow'],
  'shoulder-position': ['wall-slide', 'scapular-pushup', 'prone-y-raise', 'reverse-snow-angel', 'thoracic-rotation', 'arm-circles'],
  'head-neck-control': ['chin-tuck', 'wall-slide', 'prone-y-raise', 'thoracic-rotation'],
  'hip-mobility': ['ninety-ninety-hip-switch', 'hip-flexor-stretch', 'hip-circles', 'figure-four-stretch', 'world-greatest-stretch'],
  'shoulder-mobility': ['wall-slide', 'arm-circles', 'thoracic-rotation', 'child-pose-reach'],
  'left-right-control': ['bird-dog', 'bridge-march', 'side-plank-knees', 'fire-hydrant', 'march-place'],
};

const POSTURE_GOALS: Record<PosturePriority, CorrectiveGoal> = {
  'pelvic-control': 'pelvic-control',
  'rounded-upper-back': 'upper-back-capacity',
  'forward-shoulders': 'shoulder-position',
  'hip-mobility': 'hip-mobility',
  'shoulder-mobility': 'shoulder-mobility',
};

const MOVEMENT_GOALS: Record<MovementCheck, readonly CorrectiveGoal[]> = {
  'squat-control': ['hip-mobility', 'left-right-control'],
  'overhead-reach': ['shoulder-mobility', 'upper-back-capacity'],
  'hip-hinge': ['pelvic-control', 'hip-mobility'],
  'single-leg-balance': ['left-right-control'],
  'plank-control': ['pelvic-control'],
};

function addSource(targets: Map<CorrectiveGoal, Set<CorrectiveEvidenceSource>>, goal: CorrectiveGoal, source: CorrectiveEvidenceSource): void {
  const sources = targets.get(goal) ?? new Set<CorrectiveEvidenceSource>();
  sources.add(source);
  targets.set(goal, sources);
}

export function suggestCorrectiveTargets(profile: UserProfile): CorrectiveTarget[] {
  const suggestions = new Map<CorrectiveGoal, Set<CorrectiveEvidenceSource>>();
  for (const priority of profile.healthProfile.posturePriorities) addSource(suggestions, POSTURE_GOALS[priority], 'player-scan');

  const assessment = latestMovementAssessment(profile);
  if (assessment) {
    for (const [check, rating] of Object.entries(assessment.results) as [MovementCheck, typeof assessment.results[MovementCheck]][]) {
      if (rating !== 'limited') continue;
      for (const goal of MOVEMENT_GOALS[check]) addSource(suggestions, goal, 'movement-analysis');
    }
  }

  return [...suggestions.entries()].map(([goal, sources]) => ({
    goal,
    priority: 'support',
    sources: [...sources],
  }));
}

export function buildCorrectiveProfile(profile: UserProfile, goals: readonly CorrectiveGoal[], primaryGoal: CorrectiveGoal | null): CorrectiveProfile {
  const suggestions = new Map(suggestCorrectiveTargets(profile).map((target) => [target.goal, target.sources]));
  return {
    configured: true,
    targets: goals.map((goal) => ({
      goal,
      priority: goal === primaryGoal ? 'primary' : 'support',
      sources: [...new Set<CorrectiveEvidenceSource>(['self-observation', ...(suggestions.get(goal) ?? [])])],
    })),
    updatedAt: new Date().toISOString(),
  };
}

export function effectiveCorrectiveTargets(profile: UserProfile): CorrectiveTarget[] {
  return profile.correctiveProfile.configured ? profile.correctiveProfile.targets : [];
}

export function primaryCorrectiveTarget(profile: UserProfile): CorrectiveTarget | null {
  const targets = effectiveCorrectiveTargets(profile);
  return targets.find((target) => target.priority === 'primary') ?? targets[0] ?? null;
}

export function matchingCorrectiveTargets(exercise: Exercise, profile: UserProfile): CorrectiveTarget[] {
  return effectiveCorrectiveTargets(profile).filter((target) => CORRECTIVE_EXERCISES[target.goal].includes(exercise.id));
}

export function correctivePriorityScore(exercise: Exercise, profile: UserProfile): number {
  return matchingCorrectiveTargets(exercise, profile).reduce((score, target) => score + (target.priority === 'primary' ? 52 : 30), 0);
}

export function preferredCorrectiveExercises(profile: UserProfile, exercises: readonly Exercise[]): Exercise[] {
  const eligible = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const orderedTargets = [...effectiveCorrectiveTargets(profile)].sort((a, b) => (a.priority === 'primary' ? -1 : 0) - (b.priority === 'primary' ? -1 : 0));
  const selected: Exercise[] = [];
  for (const target of orderedTargets) {
    const exercise = CORRECTIVE_EXERCISES[target.goal].map((id) => eligible.get(id)).find(Boolean);
    if (exercise && !selected.some((item) => item.id === exercise.id)) selected.push(exercise);
  }
  for (const target of orderedTargets) {
    for (const id of CORRECTIVE_EXERCISES[target.goal]) {
      const exercise = eligible.get(id);
      if (exercise && !selected.some((item) => item.id === exercise.id)) selected.push(exercise);
    }
  }
  return selected;
}

export function correctiveSelectionReasons(exercise: Exercise, profile: UserProfile): ExerciseSelectionReason[] {
  return matchingCorrectiveTargets(exercise, profile).map((target) => ({
    code: 'corrective',
    label: `${target.priority === 'primary' ? 'PRIMARY' : 'SUPPORT'} // ${CORRECTIVE_GOAL_DETAILS[target.goal].label.toUpperCase()}`,
  }));
}
