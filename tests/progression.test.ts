import assert from 'node:assert/strict';
import test from 'node:test';

import { generateWorkout } from '../src/domain/generator.ts';
import { createProfile, restoreExcludedExercises, updateProfileSettings } from '../src/domain/profile.ts';
import { applyCompletedWorkout, attributeValueFromXp, calculateAttributeDevelopment, completeRankTrial, createCompletionSummary, levelFromXp, rankTrialEligibility, totalAttributeXpForValue, totalXpForLevel } from '../src/domain/progression.ts';
import { calculateRecovery } from '../src/domain/recovery.ts';
import { EQUIPMENT, GOALS, MUSCLE_GROUPS, type UserProfile, type WorkoutHistoryEntry } from '../src/domain/types.ts';

const base = createProfile({
  goal: GOALS.GENERAL,
  experienceLevel: 'beginner',
  workoutDuration: 15,
  workoutsPerWeek: 3,
  availableEquipment: [EQUIPMENT.NONE],
});

function completedEntry(overrides: Partial<WorkoutHistoryEntry> = {}): WorkoutHistoryEntry {
  const plan = generateWorkout(base, [], '2026-09-01');
  const development = calculateAttributeDevelopment(base, plan);
  return {
    id: 'workout-1',
    date: '2026-09-01T10:00:00.000Z',
    dateKey: '2026-09-01',
    planId: plan.id,
    title: plan.title,
    completed: true,
    durationSeconds: 800,
    difficulty: plan.difficulty,
    perceivedDifficulty: 'perfect',
    results: plan.exercises.map((item) => ({
      exerciseId: item.exercise.id,
      completedSets: item.sets,
      targetPerSet: item.target,
      completedVolume: item.sets * item.target,
    })),
    xpEarned: plan.rewardXp,
    attributeXpEarned: development.attributeXpEarned,
    statGains: development.statGains,
    ...overrides,
  };
}

test('XP produces deterministic level progression', () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(totalXpForLevel(5)), 5);
  assert.equal(levelFromXp(totalXpForLevel(5) - 1), 4);
});

test('completed exercises generate evidence-based attribute XP without instant stat inflation', () => {
  const entry = completedEntry();
  const total = Object.values(entry.attributeXpEarned).reduce((sum, gain) => sum + gain, 0);
  assert.ok(total > 0);
  assert.ok(Object.values(entry.statGains).every((gain) => gain === 0));
  const updated = applyCompletedWorkout(base, entry);
  assert.equal(updated.strength, 1);
  assert.equal(updated.endurance, 1);
});

test('attribute points unlock only after crossing accumulated XP thresholds', () => {
  assert.equal(attributeValueFromXp(totalAttributeXpForValue(2) - 1), 1);
  assert.equal(attributeValueFromXp(totalAttributeXpForValue(2)), 2);
  assert.equal(attributeValueFromXp(totalAttributeXpForValue(5)), 5);
});

test('planned recovery gap does not destroy streak', () => {
  const profile: UserProfile = { ...base, streak: 4, longestStreak: 4, lastWorkoutDateKey: '2026-09-01' };
  const updated = applyCompletedWorkout(profile, completedEntry({ dateKey: '2026-09-03', date: '2026-09-03T10:00:00.000Z' }));
  assert.equal(updated.streak, 5);
});

test('recovery decreases after load and returns after 72 hours', () => {
  const entry = completedEntry();
  const soon = calculateRecovery([entry], new Date('2026-09-01T12:00:00.000Z'));
  assert.ok(MUSCLE_GROUPS.some((group) => soon[group] < 100));
  const recovered = calculateRecovery([entry], new Date('2026-09-05T12:00:00.000Z'));
  assert.ok(MUSCLE_GROUPS.every((group) => recovered[group] === 100));
});

test('rank requires readiness and a completed trial', () => {
  const ready: UserProfile = { ...base, level: 5, totalWorkouts: 12, streak: 3, activeTrainingWeeks: ['w1', 'w2', 'w3', 'w4'] };
  assert.equal(rankTrialEligibility(ready).eligible, true);
  const promoted = completeRankTrial(ready);
  assert.equal(promoted.rank, 'D');
  assert.deepEqual(promoted.rankTrialCompleted, ['D']);
});

test('profile calibration preserves progression and normalizes equipment safely', () => {
  const progressed: UserProfile = {
    ...base,
    xp: 740,
    level: 4,
    rank: 'D',
    strength: 8,
    totalWorkouts: 9,
  };
  const updated = updateProfileSettings(progressed, {
    goal: GOALS.STRENGTH,
    experienceLevel: 'intermediate',
    workoutDuration: 30,
    workoutsPerWeek: 5,
    availableEquipment: [EQUIPMENT.DUMBBELLS],
  });

  assert.equal(updated.id, progressed.id);
  assert.equal(updated.xp, 740);
  assert.equal(updated.level, 4);
  assert.equal(updated.rank, 'D');
  assert.equal(updated.strength, 8);
  assert.equal(updated.totalWorkouts, 9);
  assert.deepEqual(updated.availableEquipment, [EQUIPMENT.NONE, EQUIPMENT.DUMBBELLS]);

  const bodyweightOnly = updateProfileSettings(updated, {
    goal: updated.goal,
    experienceLevel: updated.experienceLevel,
    workoutDuration: updated.workoutDuration,
    workoutsPerWeek: updated.workoutsPerWeek,
    availableEquipment: [EQUIPMENT.NONE, EQUIPMENT.DUMBBELLS],
  });
  assert.deepEqual(bodyweightOnly.availableEquipment, [EQUIPMENT.NONE]);
});

test('restoring excluded exercises changes no progression values', () => {
  const progressed: UserProfile = { ...base, xp: 420, level: 3, totalWorkouts: 5, excludedExercises: ['burpee', 'pushup'] };
  const restored = restoreExcludedExercises(progressed);
  assert.deepEqual(restored.excludedExercises, []);
  assert.equal(restored.xp, progressed.xp);
  assert.equal(restored.level, progressed.level);
  assert.equal(restored.totalWorkouts, progressed.totalWorkouts);
});

test('completion report captures level and rank transitions', () => {
  const before: UserProfile = { ...base, level: 3, rank: 'E' };
  const after: UserProfile = { ...before, level: 4, rank: 'D', xp: 800 };
  const workout = completedEntry({ xpEarned: 180 });
  const report = createCompletionSummary(before, after, workout, true);
  assert.equal(report.levelBefore, 3);
  assert.equal(report.levelAfter, 4);
  assert.equal(report.rankBefore, 'E');
  assert.equal(report.rankAfter, 'D');
  assert.equal(report.xpEarned, 180);
  assert.deepEqual(report.attributeXpEarned, workout.attributeXpEarned);
  assert.equal(report.rankTrial, true);
});

test('rank trial stays locked when workout count is reached too quickly', () => {
  const rushed: UserProfile = { ...base, level: 5, totalWorkouts: 12, streak: 12, activeTrainingWeeks: ['2026-W35', '2026-W36'] };
  const trial = rankTrialEligibility(rushed);
  assert.equal(trial.eligible, false);
  assert.ok(trial.reasons.includes('Train across 4 active weeks'));
});
