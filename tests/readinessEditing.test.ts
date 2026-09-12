import assert from 'node:assert/strict';
import test from 'node:test';

import { createProfile, INITIAL_SNAPSHOT, recordMovementAssessment } from '../src/domain/profile.ts';
import { beginDailyWorkout, updateDailyReadiness } from '../src/domain/questState.ts';
import { createDailyReadiness, readinessForDate } from '../src/domain/readiness.ts';
import { readinessDraft, readinessDraftChanged, readinessInput } from '../src/domain/readinessDraft.ts';
import type { AppSnapshot, DailyReadinessInput, WorkoutHistoryEntry } from '../src/domain/types.ts';

const day = '2026-09-07';
const now = new Date(`${day}T12:00:00`);
const ready: DailyReadinessInput = { energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false };

function snapshot(): AppSnapshot {
  const profile = recordMovementAssessment(createProfile({ goal: 'general-fitness', experienceLevel: 'beginner', workoutDuration: 30, workoutsPerWeek: 7, availableEquipment: ['none'] }), {
    'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear',
  }, 'baseline', [], now);
  return { ...INITIAL_SNAPSHOT, onboardingComplete: true, profile };
}

test('editing preserves every saved answer including warning and muscles without mutating the saved signal', () => {
  const signal = createDailyReadiness({ ...ready, energy: 'low', sleep: 'poor', soreness: 'mild', soreMuscles: ['neck', 'arms'], painOrWarning: true }, now);
  const draft = readinessDraft(signal, day);
  assert.deepEqual(readinessInput(draft), { energy: 'low', sleep: 'poor', soreness: 'mild', soreMuscles: ['neck', 'arms'], painOrWarning: true });
  draft.soreMuscles.push('back');
  assert.deepEqual(signal.soreMuscles, ['neck', 'arms']);
  assert.equal(readinessDraftChanged(readinessDraft(signal, day), draft), true);
});

test('a new day starts blank and unfinished drafts cannot become a signal', () => {
  const previous = createDailyReadiness(ready, now);
  const fresh = readinessDraft(previous, '2026-09-08');
  assert.deepEqual(fresh, readinessDraft(null, day));
  assert.equal(readinessInput(fresh), null);
  assert.equal(readinessInput({ ...ready, soreness: 'mild' }), null);
  assert.deepEqual(readinessInput({ ...ready, soreMuscles: ['quads'] })?.soreMuscles, []);
  const reordered = { ...ready, soreness: 'mild' as const, soreMuscles: ['neck', 'arms'] as const };
  assert.equal(readinessDraftChanged({ ...reordered, soreMuscles: [...reordered.soreMuscles] }, { ...reordered, soreMuscles: ['arms', 'neck'] }), false);
});

test('editing replaces only today and adapts the existing weekly plan without stacking reductions', () => {
  const base = snapshot();
  base.profile!.readinessLog = [createDailyReadiness(ready, new Date('2026-09-06T12:00:00'))];
  const initial = updateDailyReadiness(base, ready, day, now);
  assert.equal(initial.dailyQuest?.plan.kind, 'training');
  const reduced = updateDailyReadiness(initial, { ...ready, energy: 'low' }, day, now);
  const repeated = updateDailyReadiness(reduced, { ...ready, energy: 'low' }, day, now);
  const restored = updateDailyReadiness(repeated, ready, day, now);
  assert.equal(reduced.dailyQuest?.plan.readinessBand, 'reduced');
  assert.deepEqual(repeated.dailyQuest?.plan.exercises, reduced.dailyQuest?.plan.exercises);
  assert.deepEqual(restored.dailyQuest?.plan.exercises, initial.dailyQuest?.plan.exercises);
  assert.equal(reduced.weeklyProtocol, initial.weeklyProtocol);
  assert.equal(restored.profile?.readinessLog.length, 2);
  assert.deepEqual(readinessForDate(restored.profile!, '2026-09-06'), base.profile!.readinessLog[0]);
  assert.ok(restored.dailyQuest!.plan.exercises.every(({ exercise }) => exercise.requiredEquipment.every((equipment) => equipment === 'none')));
});

test('warning edits seal training and normal corrections retain independent health safeguards', () => {
  const initial = updateDailyReadiness(snapshot(), ready, day, now);
  const sealed = updateDailyReadiness(initial, { ...ready, painOrWarning: true }, day, now);
  assert.equal(sealed.dailyQuest?.plan.kind, 'safety-hold');
  assert.equal(beginDailyWorkout(sealed, now).activeWorkout, null);
  const corrected = updateDailyReadiness(sealed, ready, day, now);
  assert.equal(corrected.dailyQuest?.plan.kind, 'training');
  const limited = { ...sealed, profile: { ...sealed.profile!, movementAssessments: sealed.profile!.movementAssessments.map((assessment) => ({ ...assessment, results: { ...assessment.results, 'squat-control': 'pain' as const } })) } };
  assert.equal(updateDailyReadiness(limited, ready, day, now).dailyQuest?.plan.kind, 'safety-hold');
});

test('a corrected signal never reopens a completed day or changes earned progress', () => {
  const current = updateDailyReadiness(snapshot(), ready, day, now);
  const entry: WorkoutHistoryEntry = { id: 'cleared', dateKey: day, date: now.toISOString(), planId: current.dailyQuest!.plan.id, title: 'Cleared', completed: true, durationSeconds: 900, difficulty: 1, perceivedDifficulty: 'perfect', results: [], xpEarned: 100, attributeXpEarned: { strength: 10, endurance: 0, agility: 0, vitality: 0, mobility: 0 }, statGains: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 } };
  const completed = { ...current, history: [entry], profile: { ...current.profile!, totalWorkouts: 1 } };
  const edited = updateDailyReadiness(completed, { ...ready, energy: 'low' }, day, now);
  assert.equal(edited.history, completed.history);
  assert.equal(edited.profile?.totalWorkouts, 1);
  assert.equal(edited.dailyQuest?.status, 'complete');
  assert.equal(beginDailyWorkout(edited, now).activeWorkout, null);
});

test('midnight and active-workout guards reject stale edits before changing any data', () => {
  const current = updateDailyReadiness(snapshot(), ready, day, now);
  const original = JSON.stringify(current);
  assert.throws(() => updateDailyReadiness(current, { ...ready, energy: 'low' }, day, new Date('2026-09-08T00:00:01')), /new day/);
  assert.equal(JSON.stringify(current), original);
  const active = beginDailyWorkout(current, now);
  assert.ok(active.activeWorkout);
  assert.throws(() => updateDailyReadiness(active, ready, day, now), /workout/);
  assert.deepEqual(active.profile?.readinessLog, current.profile?.readinessLog);
});
