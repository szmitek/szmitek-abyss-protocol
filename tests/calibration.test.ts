import assert from 'node:assert/strict';
import test from 'node:test';

import { EXERCISES } from '../src/data/exercises.ts';
import { hasMovementPain, isCalibrationCompatible, latestMovementAssessment, limitedMovementChecks, preferredCalibrationExercises } from '../src/domain/calibration.ts';
import { generateDailyProtocol, generateWorkout } from '../src/domain/generator.ts';
import { createProfile } from '../src/domain/profile.ts';
import { EQUIPMENT, GOALS, type MovementAssessment, type UserProfile } from '../src/domain/types.ts';

const CLEAR_RESULTS = {
  'squat-control': 'clear',
  'overhead-reach': 'clear',
  'hip-hinge': 'clear',
  'single-leg-balance': 'clear',
  'plank-control': 'clear',
} as const;

function assessment(overrides: Partial<MovementAssessment['results']>, date = '2026-09-01T10:00:00.000Z'): MovementAssessment {
  return {
    id: `assessment-${date}`,
    kind: 'baseline',
    date,
    dateKey: date.slice(0, 10),
    results: { ...CLEAR_RESULTS, ...overrides },
  };
}

function profile(movementAssessments: MovementAssessment[]): UserProfile {
  return {
    ...createProfile({
      goal: GOALS.GENERAL,
      experienceLevel: 'advanced',
      workoutDuration: 30,
      workoutsPerWeek: 7,
      availableEquipment: [EQUIPMENT.NONE],
    }),
    id: 'test-player',
    movementAssessments,
  };
}

test('latest Movement Analysis is the active calibration source', () => {
  const old = assessment({ 'plank-control': 'limited' }, '2026-09-01T10:00:00.000Z');
  const current = assessment({ 'squat-control': 'limited' }, '2026-09-08T10:00:00.000Z');
  const user = profile([old, current]);
  assert.equal(latestMovementAssessment(user)?.id, current.id);
  assert.deepEqual(limitedMovementChecks(user), ['squat-control']);
});

test('limited checks deterministically remove conflicting exercise demands', () => {
  const user = profile([assessment({
    'squat-control': 'limited',
    'overhead-reach': 'limited',
    'single-leg-balance': 'limited',
    'plank-control': 'limited',
  })]);
  const plan = generateWorkout(user, [], '2026-09-02');
  assert.ok(plan.exercises.length > 0);
  assert.ok(plan.exercises.every(({ exercise }) => isCalibrationCompatible(exercise, user)));
});

test('limited movement adds a matching foundation exercise', () => {
  const user = profile([assessment({ 'plank-control': 'limited' })]);
  const preferred = new Set(preferredCalibrationExercises(user, EXERCISES).map((exercise) => exercise.id));
  const plan = generateWorkout(user, [], '2026-09-02');
  assert.ok(plan.exercises.some(({ exercise }) => preferred.has(exercise.id)));
});

test('pain reported during Movement Analysis seals daily training', () => {
  const user = profile([assessment({ 'hip-hinge': 'pain' })]);
  assert.equal(hasMovementPain(user), true);
  const plan = generateDailyProtocol(user, [], '2026-09-02');
  assert.equal(plan.kind, 'safety-hold');
  assert.deepEqual(plan.exercises, []);
  assert.equal(plan.rewardXp, 0);
});
