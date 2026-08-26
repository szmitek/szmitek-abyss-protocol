import assert from 'node:assert/strict';
import test from 'node:test';

import { generateDailyProtocol, generateWorkout } from '../src/domain/generator.ts';
import { createProfile } from '../src/domain/profile.ts';
import { compareAssessments, getTrainingArcState, registerAssessmentWithTrainingArcs } from '../src/domain/trainingArc.ts';
import { EQUIPMENT, GOALS, type MovementAssessment, type TrainingArc, type UserProfile } from '../src/domain/types.ts';

const CLEAR_RESULTS = {
  'squat-control': 'clear',
  'overhead-reach': 'clear',
  'hip-hinge': 'clear',
  'single-leg-balance': 'clear',
  'plank-control': 'clear',
} as const;

function assessment(dateKey: string, kind: MovementAssessment['kind'] = 'baseline', results: MovementAssessment['results'] = CLEAR_RESULTS): MovementAssessment {
  return { id: `assessment-${dateKey}`, kind, date: `${dateKey}T10:00:00.000Z`, dateKey, results };
}

function profile(trainingArcs: TrainingArc[]): UserProfile {
  return {
    ...createProfile({
      goal: GOALS.GENERAL,
      experienceLevel: 'advanced',
      workoutDuration: 30,
      workoutsPerWeek: 7,
      availableEquipment: [EQUIPMENT.NONE],
    }),
    id: 'training-arc-player',
    trainingArcs,
  };
}

test('baseline Movement Analysis opens a four-week Training Arc', () => {
  const arcs = registerAssessmentWithTrainingArcs([], assessment('2026-09-01'));
  assert.equal(arcs.length, 1);
  assert.equal(arcs[0]?.cycleNumber, 1);
  assert.equal(arcs[0]?.durationWeeks, 4);
  assert.equal(arcs[0]?.completionAssessmentId, null);
});

test('Training Arc exposes deterministic weekly phases', () => {
  const arcs = registerAssessmentWithTrainingArcs([], assessment('2026-09-01'));
  assert.deepEqual(
    ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22'].map((dateKey) => getTrainingArcState(arcs, dateKey)?.phase),
    ['calibration', 'foundation', 'overload', 'consolidation'],
  );
  assert.equal(getTrainingArcState(arcs, '2026-09-29')?.reassessmentDue, true);
});

test('calibration and consolidation weeks control volume without daily spikes', () => {
  const arcs = registerAssessmentWithTrainingArcs([], assessment('2026-09-01'));
  const user = profile(arcs);
  const weekOne = generateWorkout(user, [], '2026-09-01');
  const weekTwo = generateWorkout(user, [], '2026-09-08');
  const weekFour = generateWorkout(user, [], '2026-09-22');
  const workSets = (plan: ReturnType<typeof generateWorkout>) => plan.exercises.filter(({ exercise }) => !['warmup', 'mobility'].includes(exercise.exerciseType)).map(({ sets }) => sets);
  assert.ok(workSets(weekOne).every((sets) => sets <= 2));
  assert.ok(workSets(weekTwo).every((sets) => sets === 3));
  assert.ok(workSets(weekFour).every((sets) => sets === 2));
  assert.ok(weekOne.exercises.every(({ exercise }) => exercise.difficulty <= 2));
});

test('completed cycle becomes a re-scan quest instead of another workout', () => {
  const arcs = registerAssessmentWithTrainingArcs([], assessment('2026-09-01'));
  const plan = generateDailyProtocol(profile(arcs), [], '2026-09-29');
  assert.equal(plan.kind, 'reassessment');
  assert.deepEqual(plan.exercises, []);
  assert.equal(plan.rewardXp, 0);
});

test('due re-scan archives the cycle and opens the next one', () => {
  const firstAssessment = assessment('2026-09-01');
  const first = registerAssessmentWithTrainingArcs([], firstAssessment);
  const nextAssessment = assessment('2026-09-29', 'reassessment', { ...CLEAR_RESULTS, 'plank-control': 'limited' });
  const next = registerAssessmentWithTrainingArcs(first, nextAssessment);
  assert.equal(next.length, 2);
  assert.equal(next[0]?.cycleNumber, 2);
  assert.equal(next[0]?.baselineAssessmentId, nextAssessment.id);
  assert.equal(next[1]?.completionAssessmentId, nextAssessment.id);
  assert.equal(getTrainingArcState(next, '2026-09-29')?.week, 1);
});

test('re-scan comparison counts improved and declined movement signals', () => {
  const before = assessment('2026-09-01', 'baseline', { ...CLEAR_RESULTS, 'squat-control': 'limited', 'plank-control': 'clear' });
  const after = assessment('2026-09-29', 'reassessment', { ...CLEAR_RESULTS, 'squat-control': 'clear', 'plank-control': 'limited' });
  assert.deepEqual(compareAssessments(after, before), { improved: 1, declined: 1, unchanged: 3 });
});

test('CRITICAL: Training Arc never weakens the NONE equipment constraint', () => {
  const arcs = registerAssessmentWithTrainingArcs([], assessment('2026-09-01'));
  const user = profile(arcs);
  for (const dateKey of ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22']) {
    const plan = generateWorkout(user, [], dateKey);
    assert.ok(plan.exercises.every(({ exercise }) => exercise.requiredEquipment.length === 1 && exercise.requiredEquipment[0] === EQUIPMENT.NONE));
  }
});
