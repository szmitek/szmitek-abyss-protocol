import assert from 'node:assert/strict';
import test from 'node:test';

import { EXERCISES } from '../src/data/exercises.ts';
import { generateDailyProtocol, generateWorkout } from '../src/domain/generator.ts';
import { isHealthCompatible, preferredHealthExercises } from '../src/domain/health.ts';
import { createProfile, updateHealthProfile } from '../src/domain/profile.ts';
import { EQUIPMENT, GOALS } from '../src/domain/types.ts';

const base = createProfile({
  goal: GOALS.GENERAL,
  experienceLevel: 'beginner',
  workoutDuration: 20,
  workoutsPerWeek: 7,
  availableEquipment: [EQUIPMENT.NONE],
});

test('registered pain areas act as deterministic exercise constraints', () => {
  const profile = updateHealthProfile(base, {
    ...base.healthProfile,
    scanCompleted: true,
    painAreas: ['wrists', 'knees'],
  });
  const plan = generateWorkout(profile, [], '2026-09-01');
  assert.ok(plan.exercises.length > 0);
  assert.ok(plan.exercises.every(({ exercise }) => isHealthCompatible(exercise, profile)));
});

test('posture priority adds a matching calibration exercise to the protocol', () => {
  const profile = updateHealthProfile(base, {
    ...base.healthProfile,
    scanCompleted: true,
    posturePriorities: ['pelvic-control'],
  });
  const preferred = new Set(preferredHealthExercises(profile, EXERCISES).map((exercise) => exercise.id));
  const plan = generateWorkout(profile, [], '2026-09-01');
  assert.ok(plan.exercises.some(({ exercise }) => preferred.has(exercise.id)));
});

test('unresolved warning signal seals the daily protocol', () => {
  const profile = updateHealthProfile(base, {
    ...base.healthProfile,
    scanCompleted: true,
    safetySignals: ['fainting-dizziness'],
  });
  const plan = generateDailyProtocol(profile, [], '2026-09-01');
  assert.equal(plan.kind, 'safety-hold');
  assert.deepEqual(plan.exercises, []);
  assert.equal(plan.rewardXp, 0);
});
