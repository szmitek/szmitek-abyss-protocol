import assert from 'node:assert/strict';
import test from 'node:test';

import { CORRECTIVE_EXERCISES, buildCorrectiveProfile, suggestCorrectiveTargets } from '../src/domain/correctiveProfile.ts';
import { generateWorkout, isEquipmentCompatible } from '../src/domain/generator.ts';
import { isHealthCompatible } from '../src/domain/health.ts';
import { createProfile, updateCorrectiveProfile, updateHealthProfile } from '../src/domain/profile.ts';
import { EQUIPMENT, GOALS, type MovementAssessment, type UserProfile } from '../src/domain/types.ts';

const CLEAR_RESULTS = {
  'squat-control': 'clear',
  'overhead-reach': 'clear',
  'hip-hinge': 'clear',
  'single-leg-balance': 'clear',
  'plank-control': 'clear',
} as const;

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    ...createProfile({
      goal: GOALS.GENERAL,
      experienceLevel: 'beginner',
      workoutDuration: 30,
      workoutsPerWeek: 7,
      availableEquipment: [EQUIPMENT.NONE],
    }),
    id: 'corrective-player',
    ...overrides,
  };
}

function movementAssessment(): MovementAssessment {
  return {
    id: 'movement-corrective',
    kind: 'baseline',
    date: '2026-09-01T10:00:00.000Z',
    dateKey: '2026-09-01',
    results: { ...CLEAR_RESULTS, 'overhead-reach': 'limited', 'single-leg-balance': 'limited' },
  };
}

test('corrective suggestions combine Player Scan and limited movement evidence without diagnosing photos', () => {
  const scanned = updateHealthProfile(profile({ movementAssessments: [movementAssessment()] }), {
    ...profile().healthProfile,
    scanCompleted: true,
    posturePriorities: ['forward-shoulders'],
  });
  const suggestions = suggestCorrectiveTargets(scanned);
  const shoulder = suggestions.find((target) => target.goal === 'shoulder-position');
  const upperBack = suggestions.find((target) => target.goal === 'upper-back-capacity');
  const balance = suggestions.find((target) => target.goal === 'left-right-control');
  assert.ok(shoulder?.sources.includes('player-scan'));
  assert.ok(upperBack?.sources.includes('movement-analysis'));
  assert.ok(balance?.sources.includes('movement-analysis'));
  assert.ok(suggestions.every((target) => !target.sources.includes('posture-archive')));
});

test('confirmed primary directive reserves compatible corrective work and explains why it was selected', () => {
  const user = profile();
  const corrective = buildCorrectiveProfile(user, ['pelvic-control', 'upper-back-capacity'], 'pelvic-control');
  const configured = updateCorrectiveProfile(user, corrective);
  const plan = generateWorkout(configured, [], '2026-09-02');
  const pelvic = plan.exercises.find(({ exercise }) => CORRECTIVE_EXERCISES['pelvic-control'].includes(exercise.id));
  const upperBack = plan.exercises.find(({ exercise }) => CORRECTIVE_EXERCISES['upper-back-capacity'].includes(exercise.id));
  assert.ok(pelvic, 'Expected the primary corrective target in a 30-minute plan.');
  assert.ok(upperBack, 'Expected a support corrective target in a 30-minute plan.');
  assert.ok(pelvic.selectionReasons?.some((reason) => reason.code === 'corrective' && reason.label.startsWith('PRIMARY')));
  assert.ok(plan.exercises.every((item) => (item.selectionReasons?.length ?? 0) > 0));
  assert.equal(plan.correctiveFocus, 'pelvic-control');
});

test('corrective preferences never weaken equipment, pain, or movement constraints', () => {
  const base = profile({ movementAssessments: [movementAssessment()] });
  const scanned = updateHealthProfile(base, {
    ...base.healthProfile,
    scanCompleted: true,
    painAreas: ['wrists', 'shoulders'],
  });
  const configured = updateCorrectiveProfile(scanned, buildCorrectiveProfile(scanned, ['shoulder-position', 'left-right-control'], 'shoulder-position'));
  for (let day = 1; day <= 60; day += 1) {
    const dateKey = `2026-10-${`${((day - 1) % 28) + 1}`.padStart(2, '0')}`;
    const plan = generateWorkout({ ...configured, totalWorkouts: day - 1 }, [], dateKey);
    assert.ok(plan.exercises.every(({ exercise }) => isEquipmentCompatible(exercise, configured.availableEquipment)));
    assert.ok(plan.exercises.every(({ exercise }) => isHealthCompatible(exercise, configured)));
    assert.ok(plan.exercises.every(({ exercise }) => exercise.requiredEquipment.length === 1 && exercise.requiredEquipment[0] === EQUIPMENT.NONE));
  }
});

test('a confirmed general profile disables corrective bias without disabling safety', () => {
  const user = profile();
  const configured = updateCorrectiveProfile(user, buildCorrectiveProfile(user, [], null));
  const plan = generateWorkout(configured, [], '2026-09-03');
  assert.equal(configured.correctiveProfile.configured, true);
  assert.deepEqual(configured.correctiveProfile.targets, []);
  assert.equal(plan.correctiveFocus, undefined);
  assert.ok(plan.exercises.every((item) => !item.selectionReasons?.some((reason) => reason.code === 'corrective')));
});
