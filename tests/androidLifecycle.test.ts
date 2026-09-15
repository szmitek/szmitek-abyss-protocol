import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

import { parsePendingPosturePhoto } from '../src/domain/pendingPosturePhoto.ts';
import { decodeSnapshot } from '../src/domain/persistence.ts';
import { createProfile, INITIAL_SNAPSHOT, recordMovementAssessment } from '../src/domain/profile.ts';
import { beginDailyWorkout, closeActiveWorkout, refreshDailyQuest, updateDailyReadiness } from '../src/domain/questState.ts';
import { completeWorkoutSet, millisecondsUntilNextDay, timerSecondsRemaining, workoutReadyToFinish, workoutResumeBlock, workoutStepKey } from '../src/domain/workoutLifecycle.ts';
import type { AppSnapshot } from '../src/domain/types.ts';

const day = '2026-09-07';
const now = new Date(`${day}T12:00:00`);
const ready = { energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false } as const;
function session(): AppSnapshot {
  const profile = recordMovementAssessment(createProfile({ goal: 'general-fitness', experienceLevel: 'beginner', workoutDuration: 30, workoutsPerWeek: 7, availableEquipment: ['none'] }), {
    'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear',
  }, 'baseline', [], now);
  const scanned = updateDailyReadiness({ ...INITIAL_SNAPSHOT, onboardingComplete: true, profile }, { ...ready, soreMuscles: [] }, day, now);
  return beginDailyWorkout(scanned, now);
}

test('offline reload preserves confirmed sets and never starts a second active session', () => {
  const started = session();
  const checkpoint = completeWorkoutSet(started, workoutStepKey(started.activeWorkout!), now);
  const loaded = decodeSnapshot(JSON.stringify(checkpoint));
  assert.deepEqual(loaded, checkpoint);
  assert.equal(workoutResumeBlock(loaded, now), null);
  assert.equal(beginDailyWorkout(loaded, now), loaded);
  assert.equal(loaded.activeWorkout!.completedSets.reduce((a, b) => a + b, 0), 1);
  assert.deepEqual(loaded.history, []);
});

test('an older supported snapshot upgrades without resetting an active checkpoint or Player progress', () => {
  const started = session();
  const checkpoint = completeWorkoutSet(started, workoutStepKey(started.activeWorkout!), now);
  for (const schemaVersion of [1, 10, 11]) {
    const loaded = decodeSnapshot(JSON.stringify({ ...checkpoint, schemaVersion }));
    assert.equal(loaded.schemaVersion, 13);
    assert.deepEqual(loaded.activeWorkout, checkpoint.activeWorkout);
    assert.deepEqual(loaded.profile, checkpoint.profile);
  }
});

test('duplicate taps cannot advance a second set or skip across an exercise boundary', () => {
  let current = session();
  while (current.activeWorkout!.exerciseIndex < current.activeWorkout!.plan.exercises.length) {
    const key = workoutStepKey(current.activeWorkout!);
    const next = completeWorkoutSet(current, key, now);
    assert.notEqual(next, current);
    assert.equal(completeWorkoutSet(next, key, now), next);
    current = next;
  }
  assert.equal(completeWorkoutSet(current, workoutStepKey(current.activeWorkout!), now), current);
  assert.deepEqual(current.activeWorkout!.completedSets, current.activeWorkout!.plan.exercises.map((p) => p.sets));
  assert.deepEqual(current.history, []);
});

test('midnight refresh retains the old checkpoint but blocks stale execution until explicitly closed', () => {
  const started = session();
  const checkpoint = completeWorkoutSet(started, workoutStepKey(started.activeWorkout!), now);
  const tomorrow = new Date('2026-09-08T00:00:01');
  assert.match(workoutResumeBlock(checkpoint, tomorrow)!, /another day/);
  assert.equal(refreshDailyQuest(checkpoint, '2026-09-08'), checkpoint);
  assert.equal(completeWorkoutSet(checkpoint, workoutStepKey(checkpoint.activeWorkout!), tomorrow), checkpoint);
  const closed = closeActiveWorkout(checkpoint, tomorrow);
  assert.equal(closed.activeWorkout, null);
  assert.equal(closed.dailyQuest?.dateKey, '2026-09-08');
  assert.equal(beginDailyWorkout(closed, tomorrow).activeWorkout, null);
  assert.equal(closed.profile, checkpoint.profile);
  assert.equal(closed.history, checkpoint.history);
  assert.equal(checkpoint.activeWorkout!.completedSets[0], 1);
});

test('completion requires all confirmed sets, not just a restored end-of-plan cursor', () => {
  const current = session();
  const active = current.activeWorkout!;
  const atEnd = { ...current, activeWorkout: { ...active, exerciseIndex: active.plan.exercises.length } };
  assert.match(workoutResumeBlock(atEnd, now)!, /inconsistent/);
  assert.equal(workoutReadyToFinish(atEnd, now), false);
  const confirmed = { ...atEnd, activeWorkout: { ...atEnd.activeWorkout, completedSets: active.plan.exercises.map((item) => item.sets) } };
  assert.equal(workoutReadyToFinish(confirmed, now), true);
  assert.equal(workoutReadyToFinish(confirmed, new Date('2026-09-08T12:00:00')), false);
  assert.equal(workoutReadyToFinish({ ...confirmed, activeWorkout: null }, now), false);
});

test('foreground day refresh requires a new readiness signal and retains old history', () => {
  const closed = closeActiveWorkout(session(), now);
  const tomorrow = refreshDailyQuest(closed, '2026-09-08');
  assert.equal(tomorrow.dailyQuest?.dateKey, '2026-09-08');
  assert.equal(beginDailyWorkout(tomorrow, new Date('2026-09-08T12:00:00')).activeWorkout, null);
  assert.equal(tomorrow.history, closed.history);
  assert.deepEqual(tomorrow.profile?.readinessLog, closed.profile?.readinessLog);
});

test('resume requires current readiness and respects warnings and pending reviews', () => {
  const active = session();
  assert.equal(workoutResumeBlock(active, now), null);
  assert.match(workoutResumeBlock({ ...active, profile: { ...active.profile!, readinessLog: [] } }, now)!, /readiness/);
  assert.match(workoutResumeBlock({ ...active, pendingArcReviewId: 'review' }, now)!, /checks/);
  const warned = { ...active, profile: { ...active.profile!, readinessLog: active.profile!.readinessLog.map((r) => ({ ...r, band: 'hold' as const, painOrWarning: true })) } };
  assert.ok(workoutResumeBlock(warned, now));
  assert.equal(completeWorkoutSet(warned, workoutStepKey(warned.activeWorkout!), now), warned);
});

test('calendar scheduling handles local midnight and daylight-saving changes', () => {
  assert.equal(millisecondsUntilNextDay(new Date('2026-09-07T23:59:59.750')), 250);
  const source = "import { millisecondsUntilNextDay } from './src/domain/workoutLifecycle.ts'; console.log(JSON.stringify([millisecondsUntilNextDay(new Date('2026-03-29T00:00:00')),millisecondsUntilNextDay(new Date('2026-10-25T00:00:00'))]));";
  const result = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', source], { env: { ...process.env, TZ: 'Europe/Warsaw' }, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(result), [23 * 3600000, 25 * 3600000]);
});

test('timer deadlines tolerate delayed foreground ticks and never go negative', () => {
  assert.equal(timerSecondsRemaining(10000, 9001), 1);
  assert.equal(timerSecondsRemaining(10000, 15000), 0);
  assert.equal(timerSecondsRemaining(10000, 10000), 0);
});

test('interrupted photo recovery retains camera/library origin and rejects unrelated or stale requests', () => {
  for (const source of ['camera', 'library'] as const) {
    const request = { view: 'front', source, profileId: 'player-1', requestedAt: now.toISOString() };
    assert.deepEqual(parsePendingPosturePhoto(JSON.stringify(request), 'player-1', now), request);
    assert.equal(parsePendingPosturePhoto(JSON.stringify(request), 'player-2', now), null);
    assert.equal(parsePendingPosturePhoto(JSON.stringify(request), 'player-1', new Date(now.getTime() + 86400001)), null);
    assert.equal(parsePendingPosturePhoto(JSON.stringify(request), 'player-1', new Date(now.getTime() - 1)), null);
    assert.equal(parsePendingPosturePhoto(JSON.stringify({ ...request, view: 'unknown' }), 'player-1', now), null);
  }
  for (const value of [null, 'front', '{bad', 'null', '{}']) assert.equal(parsePendingPosturePhoto(value, 'player-1', now), null);
});
