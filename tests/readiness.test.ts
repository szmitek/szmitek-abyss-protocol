import assert from 'node:assert/strict';
import test from 'node:test';

import { generateDailyProtocol, generateWorkout } from '../src/domain/generator.ts';
import { EXERCISES } from '../src/data/exercises.ts';
import { createProfile } from '../src/domain/profile.ts';
import { rankTrialEligibility } from '../src/domain/progression.ts';
import { calculateReadinessBand, createDailyReadiness, recordDailyReadiness } from '../src/domain/readiness.ts';
import { EQUIPMENT, GOALS, type DailyReadinessInput, type UserProfile, type WorkoutHistoryEntry } from '../src/domain/types.ts';

const dateKey = '2026-09-07';

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    ...createProfile({
      goal: GOALS.GENERAL,
      experienceLevel: 'intermediate',
      workoutDuration: 30,
      workoutsPerWeek: 7,
      availableEquipment: [EQUIPMENT.NONE],
    }),
    id: 'readiness-player',
    totalWorkouts: 16,
    ...overrides,
  };
}

function withReadiness(user: UserProfile, input: DailyReadinessInput): UserProfile {
  return recordDailyReadiness(user, createDailyReadiness(input, new Date(`${dateKey}T12:00:00.000Z`)));
}

test('readiness bands are deterministic and pain always seals training', () => {
  assert.equal(calculateReadinessBand({ energy: 'high', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }), 'normal');
  assert.equal(calculateReadinessBand({ energy: 'low', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }), 'reduced');
  assert.equal(calculateReadinessBand({ energy: 'low', sleep: 'poor', soreness: 'none', soreMuscles: [], painOrWarning: false }), 'recovery');
  assert.equal(calculateReadinessBand({ energy: 'high', sleep: 'good', soreness: 'high', soreMuscles: ['quads'], painOrWarning: false }), 'recovery');
  assert.equal(calculateReadinessBand({ energy: 'high', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: true }), 'hold');
});

test('high readiness never raises planned exercise load', () => {
  const user = profile();
  const baseline = generateWorkout(user, [], dateKey);
  const high = generateWorkout(withReadiness(user, { energy: 'high', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }), [], dateKey);

  assert.deepEqual(
    high.exercises.map(({ exercise, sets, target }) => ({ id: exercise.id, sets, target })),
    baseline.exercises.map(({ exercise, sets, target }) => ({ id: exercise.id, sets, target })),
  );
});

test('reduced readiness lowers work sets and never adds equipment', () => {
  const user = profile();
  const baseline = generateWorkout(user, [], dateKey);
  const reduced = generateWorkout(withReadiness(user, { energy: 'low', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }), [], dateKey);
  const baselineWorkSets = baseline.exercises.filter(({ exercise }) => !['warmup', 'mobility'].includes(exercise.exerciseType)).reduce((sum, item) => sum + item.sets, 0);
  const reducedWorkSets = reduced.exercises.filter(({ exercise }) => !['warmup', 'mobility'].includes(exercise.exerciseType)).reduce((sum, item) => sum + item.sets, 0);

  assert.equal(reduced.readinessBand, 'reduced');
  assert.ok(reducedWorkSets < baselineWorkSets);
  assert.ok(reduced.rewardXp < baseline.rewardXp);
  assert.ok(reduced.exercises.every(({ exercise }) => exercise.requiredEquipment.length === 1 && exercise.requiredEquipment[0] === EQUIPMENT.NONE));
});

test('reduced readiness blocks target progression after repeated mastery', () => {
  const user = withReadiness(profile(), { energy: 'low', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false });
  const results = EXERCISES.map((exercise) => ({
    exerciseId: exercise.id,
    completedSets: 3,
    targetPerSet: exercise.minReps,
    completedVolume: exercise.minReps * 3,
  }));
  const history: WorkoutHistoryEntry[] = ['2026-09-01', '2026-09-04'].map((historyDate) => ({
    id: `mastery-${historyDate}`,
    date: `${historyDate}T18:00:00.000Z`,
    dateKey: historyDate,
    planId: `plan-${historyDate}`,
    title: 'DAILY PROTOCOL',
    completed: true,
    durationSeconds: 1200,
    difficulty: 2,
    perceivedDifficulty: 'perfect',
    results,
    xpEarned: 160,
    attributeXpEarned: { strength: 10, endurance: 10, agility: 5, vitality: 5, mobility: 5 },
    statGains: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 },
  }));

  const reduced = generateWorkout(user, history, dateKey);
  assert.ok(reduced.exercises.every(({ exercise, target }) => target === exercise.minReps));
});

test('recovery and warning signals replace the training protocol', () => {
  const recovery = generateDailyProtocol(withReadiness(profile(), { energy: 'low', sleep: 'poor', soreness: 'none', soreMuscles: [], painOrWarning: false }), [], dateKey);
  const hold = generateDailyProtocol(withReadiness(profile(), { energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: true }), [], dateKey);

  assert.equal(recovery.kind, 'recovery');
  assert.equal(recovery.readinessBand, 'recovery');
  assert.deepEqual(recovery.exercises, []);
  assert.equal(hold.kind, 'safety-hold');
  assert.equal(hold.readinessBand, 'hold');
  assert.deepEqual(hold.exercises, []);
});

test('NONE equipment invariant survives every readiness outcome', () => {
  const inputs: DailyReadinessInput[] = [
    { energy: 'high', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false },
    { energy: 'low', sleep: 'good', soreness: 'mild', soreMuscles: ['quads'], painOrWarning: false },
    { energy: 'low', sleep: 'poor', soreness: 'none', soreMuscles: [], painOrWarning: false },
    { energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: true },
  ];

  for (const input of inputs) {
    const plan = generateDailyProtocol(withReadiness(profile(), input), [], dateKey);
    assert.ok(plan.exercises.every(({ exercise }) => exercise.requiredEquipment.length === 1 && exercise.requiredEquipment[0] === EQUIPMENT.NONE));
  }
});

test('Rank Trial requires a normal signal from the same day', () => {
  const rankReady = profile({ level: 5, totalWorkouts: 12, streak: 3, activeTrainingWeeks: ['w1', 'w2', 'w3', 'w4'] });
  const missing = rankTrialEligibility(rankReady, dateKey);
  assert.equal(missing.eligible, false);
  assert.ok(missing.reasons.includes("Complete today's Daily Readiness Scan"));

  const reduced = rankTrialEligibility(withReadiness(rankReady, { energy: 'low', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }), dateKey);
  assert.equal(reduced.eligible, false);
  assert.ok(reduced.reasons.includes('Return with normal Daily Readiness'));

  const normal = rankTrialEligibility(withReadiness(rankReady, { energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }), dateKey);
  assert.equal(normal.eligible, true);
});
