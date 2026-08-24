import assert from 'node:assert/strict';
import test from 'node:test';

import { EXERCISES } from '../src/data/exercises.ts';
import { generateWorkout, isEquipmentCompatible } from '../src/domain/generator.ts';
import { createProfile } from '../src/domain/profile.ts';
import { EQUIPMENT, GOALS, type UserProfile, type WorkoutHistoryEntry } from '../src/domain/types.ts';

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    ...createProfile({
      goal: GOALS.GENERAL,
      experienceLevel: 'beginner',
      workoutDuration: 20,
      workoutsPerWeek: 4,
      availableEquipment: [EQUIPMENT.NONE],
    }),
    id: 'test-hunter',
    ...overrides,
  };
}

test('catalog contains at least 50 equipment-free exercises', () => {
  assert.ok(EXERCISES.filter((exercise) => exercise.requiredEquipment.length === 1 && exercise.requiredEquipment[0] === EQUIPMENT.NONE).length >= 50);
});

test('CRITICAL: NONE profile never receives equipment exercises', () => {
  const user = profile();
  for (let day = 1; day <= 100; day += 1) {
    const dateKey = `2026-09-${`${((day - 1) % 28) + 1}`.padStart(2, '0')}`;
    const plan = generateWorkout({ ...user, totalWorkouts: day - 1 }, [], dateKey);
    assert.ok(plan.exercises.length >= 4);
    for (const item of plan.exercises) {
      assert.deepEqual(item.exercise.requiredEquipment, [EQUIPMENT.NONE]);
      assert.equal(isEquipmentCompatible(item.exercise, user.availableEquipment), true);
    }
  }
});

test('beginner plan does not contain difficulty 3 exercises', () => {
  const plan = generateWorkout(profile(), [], '2026-09-01');
  assert.ok(plan.exercises.every(({ exercise }) => exercise.difficulty === 1));
});

test('progressive overload requires repeated successful exposures', () => {
  const user = profile({ goal: GOALS.STRENGTH });
  const first = generateWorkout(user, [], '2026-09-01');
  const push = first.exercises.find(({ exercise }) => exercise.progressionGroup === 'pushup');
  if (!push) throw new Error('Expected a push-up progression in the strength plan.');

  const makeHistory = (dateKey: string): WorkoutHistoryEntry => ({
    id: `history-${dateKey}`,
    date: `${dateKey}T18:00:00.000Z`,
    dateKey,
    planId: first.id,
    title: first.title,
    completed: true,
    durationSeconds: 900,
    difficulty: first.difficulty,
    perceivedDifficulty: 'perfect',
    results: [{
      exerciseId: push.exercise.id,
      completedSets: push.sets,
      targetPerSet: push.target,
      completedVolume: push.sets * push.target,
    }],
    xpEarned: first.rewardXp,
    statGains: { strength: 1, endurance: 1, agility: 0, vitality: 0, mobility: 0 },
  });

  const varietyEntry: WorkoutHistoryEntry = {
    ...makeHistory('2026-09-07'),
    id: 'history-variety',
    results: [{ exerciseId: 'calf-raise', completedSets: 2, targetPerSet: 12, completedVolume: 24 }],
  };
  const history = [makeHistory('2026-09-01'), makeHistory('2026-09-04'), varietyEntry];
  const next = generateWorkout({ ...user, totalWorkouts: 2 }, history, '2026-09-08');
  const progressed = next.exercises.find(({ exercise }) => exercise.progressionGroup === 'pushup');
  if (!progressed) throw new Error('Expected the push-up progression to return after rotation.');
  assert.ok(progressed.exercise.progressionLevel > push.exercise.progressionLevel || progressed.target > push.target);
});
