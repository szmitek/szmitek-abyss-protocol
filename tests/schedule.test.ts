import assert from 'node:assert/strict';
import test from 'node:test';

import { generateDailyProtocol } from '../src/domain/generator.ts';
import { createProfile } from '../src/domain/profile.ts';
import { isScheduledTrainingDay, nextScheduledTrainingDateKey } from '../src/domain/schedule.ts';
import { EQUIPMENT, GOALS, type UserProfile } from '../src/domain/types.ts';

function profile(workoutsPerWeek: UserProfile['workoutsPerWeek'], totalWorkouts = 1): UserProfile {
  return {
    ...createProfile({
      goal: GOALS.GENERAL,
      experienceLevel: 'beginner',
      workoutDuration: 20,
      workoutsPerWeek,
      availableEquipment: [EQUIPMENT.NONE],
    }),
    totalWorkouts,
  };
}

test('weekly schedule contains exactly the selected number of training days', () => {
  const dates = ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30'];
  for (const frequency of [2, 3, 4, 5, 6, 7] as const) {
    const user = profile(frequency);
    assert.equal(dates.filter((dateKey) => isScheduledTrainingDay(user, dateKey)).length, frequency);
  }
});

test('a new hunter always receives a first training protocol', () => {
  assert.equal(isScheduledTrainingDay(profile(2, 0), '2026-08-30'), true);
});

test('planned recovery is non-punitive and points to the next training day', () => {
  const user = profile(3);
  assert.equal(isScheduledTrainingDay(user, '2026-08-25'), false);
  assert.equal(nextScheduledTrainingDateKey(user, '2026-08-25'), '2026-08-26');
  const plan = generateDailyProtocol(user, [], '2026-08-25');
  assert.equal(plan.kind, 'recovery');
  assert.equal(plan.rewardXp, 0);
  assert.deepEqual(plan.exercises, []);
});
