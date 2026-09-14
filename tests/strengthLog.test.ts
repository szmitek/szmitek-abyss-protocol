import assert from 'node:assert/strict';
import test from 'node:test';
import { EXERCISE_BY_ID, EXERCISES } from '../src/data/exercises.ts';
import { STRENGTH_EXERCISES } from '../src/data/strengthExercises.ts';
import { createProfile, INITIAL_SNAPSHOT, recordMovementAssessment } from '../src/domain/profile.ts';
import { generateWorkout, isEquipmentCompatible, replaceExerciseInPlan } from '../src/domain/generator.ts';
import { isCalibrationCompatible } from '../src/domain/calibration.ts';
import { isHealthCompatible } from '../src/domain/health.ts';
import { completeWorkoutSet, workoutStepKey } from '../src/domain/workoutLifecycle.ts';
import { buildWorkoutResults, resultMeetsTarget } from '../src/domain/setPerformance.ts';
import { loadGuidance } from '../src/domain/loadGuidance.ts';
import { masteredTwice } from '../src/domain/arcDirective.ts';
import { decodeSnapshot } from '../src/domain/persistence.ts';
import { recordDailyReadiness, createDailyReadiness } from '../src/domain/readiness.ts';
import { backupChecksum, createBackup, parseBackup } from '../src/domain/backup.ts';
import { assertValidSnapshot } from '../src/domain/snapshotValidation.ts';
import { EQUIPMENT, type AppSnapshot, type SetPerformance, type UserProfile, type WorkoutHistoryEntry } from '../src/domain/types.ts';

const today = '2026-09-14';
const now = new Date(`${today}T12:00:00`);
const curl = EXERCISE_BY_ID.get('dumbbell-curl')!;
function player(): UserProfile {
  const baseline = recordMovementAssessment(createProfile({ goal: 'strength', experienceLevel: 'intermediate', workoutDuration: 30, workoutsPerWeek: 7, availableEquipment: Object.values(EQUIPMENT).filter((item) => item !== 'none') }), {
    'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear',
  }, 'baseline', [], new Date('2026-08-31T12:00:00'));
  return recordDailyReadiness(baseline, createDailyReadiness({ energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }, now));
}
function session(): AppSnapshot {
  const profile = player();
  const plan = { ...generateWorkout(profile, [], today), exercises: [{ exercise: curl, sets: 2, target: 12, restSeconds: 90 }] };
  return { ...INITIAL_SNAPSHOT, profile, onboardingComplete: true, activeWorkout: { questId: 'test', plan, startedAt: now.toISOString(), exerciseIndex: 0, completedSets: [0] } };
}
function historyEntry(day: string, kg = 10, actual = 12, effort: SetPerformance['effort'] = 'perfect'): WorkoutHistoryEntry {
  return {
    id: day, dateKey: day, date: `${day}T14:00:00`, planId: `daily-${day}`, title: 'Strength', completed: true,
    durationSeconds: 600, difficulty: 1, perceivedDifficulty: 'perfect', xpEarned: 100,
    attributeXpEarned: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 },
    statGains: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 },
    results: [{ exerciseId: curl.id, completedSets: 2, targetPerSet: 12, completedVolume: actual * 2, recordedSets: [{ actual, loadKg: kg, effort }, { actual, loadKg: kg, effort }] }],
  };
}

test('loaded catalog requires explicit gear and clear movement checks, including all bench-press components', () => {
  const p = player();
  for (const exercise of STRENGTH_EXERCISES) {
    assert.equal(isEquipmentCompatible(exercise, ['none']), false);
    assert.ok(exercise.requiredEquipment.length && exercise.loading && exercise.requiredClearChecks?.length);
    assert.equal(isCalibrationCompatible(exercise, p), true);
    for (const check of exercise.requiredClearChecks!) {
      const limited = structuredClone(p); limited.movementAssessments[0]!.results[check] = 'limited';
      assert.equal(isCalibrationCompatible(exercise, limited), false);
    }
    for (const pain of exercise.blockedPainAreas!) {
      assert.equal(isHealthCompatible(exercise, { ...p, healthProfile: { ...p.healthProfile, painAreas: [pain] } }), false);
    }
  }
  const bench = EXERCISE_BY_ID.get('barbell-bench-press')!;
  assert.equal(isEquipmentCompatible(bench, ['barbell', 'bench']), false);
  assert.equal(isEquipmentCompatible(bench, ['barbell', 'bench', 'rack-with-safeties']), true);
  assert.equal(isCalibrationCompatible(curl, { ...p, movementAssessments: [] }), false);
});

test('generator and replacements respect loadouts across a four-week arc', () => {
  let loadedCount = 0;
  for (const availableEquipment of [['none'], ['none', 'dumbbells'], Object.values(EQUIPMENT)] as UserProfile['availableEquipment'][]) {
    const p = { ...player(), availableEquipment };
    for (let day = 1; day <= 27; day++) {
      const plan = generateWorkout(p, [], `2026-09-${String(day).padStart(2, '0')}`);
      const loadedMuscles = plan.exercises.filter((item) => item.exercise.loading).map((item) => item.exercise.primaryMuscle);
      assert.equal(new Set(loadedMuscles).size, loadedMuscles.length);
      for (const [i, item] of plan.exercises.entries()) {
        assert.ok(isEquipmentCompatible(item.exercise, availableEquipment));
        loadedCount += Number(Boolean(item.exercise.loading));
        const replaced = replaceExerciseInPlan(plan, i, p);
        assert.ok(!replaced || replaced.exercises.every((entry) => isEquipmentCompatible(entry.exercise, availableEquipment)));
      }
    }
  }
  assert.ok(loadedCount > 0);
});

test('actual set logs survive reload and duplicate actions; missing or invalid loads are rejected', () => {
  const initial = session();
  const key = workoutStepKey(initial.activeWorkout!);
  for (const performance of [undefined, { actual: 8, loadKg: null, effort: 'perfect' }, { actual: 8, loadKg: -1, effort: 'perfect' }, { actual: 8.5, loadKg: 10, effort: 'perfect' }, { actual: 8, loadKg: 10, effort: null }] as (SetPerformance | undefined)[]) {
    assert.equal(completeWorkoutSet(initial, key, now, performance), initial);
  }
  const logged = completeWorkoutSet(initial, key, now, { actual: 8, loadKg: 7.5, effort: 'too-hard' });
  assert.equal(completeWorkoutSet(logged, key, now, { actual: 8, loadKg: 7.5, effort: 'too-hard' }), logged);
  assert.deepEqual(decodeSnapshot(JSON.stringify(logged)), logged);
  const result = buildWorkoutResults(logged.activeWorkout!)[0]!;
  assert.equal(result.completedVolume, 8);
  assert.equal(resultMeetsTarget(result), false);
  assert.equal(result.recordedSets![0]!.loadKg, 7.5);
});

test('a large first set cannot hide a failed second set or excessive set effort', () => {
  const result = historyEntry('2026-09-10').results[0]!;
  result.recordedSets![0]!.actual = 20;
  result.recordedSets![1]!.actual = 4;
  assert.equal(resultMeetsTarget(result), false);
  assert.equal(resultMeetsTarget(historyEntry('2026-09-10', 10, 12, 'too-hard').results[0]!), false);
});

test('load review needs two distinct successful days at the same weight and a progression-permitted arc', () => {
  const p = player();
  const good = [historyEntry('2026-09-12'), historyEntry('2026-09-10')];
  assert.match(loadGuidance(curl, p, good, today).message, /LOAD REVIEW AVAILABLE/);
  assert.ok(masteredTwice(good, curl.id, null));
  for (const samples of [[good[0]!], [good[0]!, historyEntry('2026-09-10', 12)], [good[0]!, historyEntry('2026-09-12')], [historyEntry('2026-09-12', 10, 6), good[1]!], [historyEntry('2026-09-12', 10, 12, 'too-hard'), good[1]!], [historyEntry('2026-09-15'), good[0]!]]) {
    assert.doesNotMatch(loadGuidance(curl, p, samples, today).message, /LOAD REVIEW AVAILABLE/);
  }
  assert.doesNotMatch(loadGuidance(curl, p, good, today, true).message, /LOAD REVIEW AVAILABLE/);
  assert.doesNotMatch(loadGuidance(curl, p, good, '2026-09-07').message, /LOAD REVIEW AVAILABLE/);
  assert.equal(loadGuidance(curl, p, [], today).previousKg, null);
  assert.equal(masteredTwice([good[0]!, historyEntry('2026-09-10', 12)], curl.id, null), false);
});

test('machine loads never become an automatic kg suggestion', () => {
  const machine = EXERCISE_BY_ID.get('machine-chest-press')!;
  const history = [historyEntry('2026-09-12'), historyEntry('2026-09-10')];
  history.forEach((h) => { h.results[0]!.exerciseId = machine.id; });
  assert.equal(loadGuidance(machine, player(), history, today).previousKg, null);
  assert.match(loadGuidance(machine, player(), history, today).message, /MACHINE SETUP/);
});

test('loaded rep progression holds during reduced readiness and resets after a user-selected weight change', () => {
  const p = player();
  p.excludedExercises = EXERCISES.filter((e) => e.id !== curl.id && e.exerciseType !== 'warmup' && e.exerciseType !== 'mobility').map((e) => e.id);
  const samples = [historyEntry('2026-09-12', 10, 8), historyEntry('2026-09-10', 10, 8)];
  samples.forEach((sample) => { sample.results[0]!.targetPerSet = 8; });
  const target = (profile: UserProfile, history: WorkoutHistoryEntry[]) => generateWorkout(profile, history, today).exercises.find((e) => e.exercise.id === curl.id)!.target;
  assert.equal(target(p, samples), 10);
  const reduced = recordDailyReadiness(p, createDailyReadiness({ energy: 'low', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }, now));
  assert.equal(target(reduced, samples), 8);
  const changed = [historyEntry('2026-09-12', 12, 8), historyEntry('2026-09-10', 10, 12)];
  assert.equal(target(p, changed), 8);
  assert.doesNotMatch(loadGuidance(curl, reduced, samples, today).message, /LOAD REVIEW AVAILABLE/);
});

test('a partial timed set records elapsed seconds rather than the whole prescription', () => {
  const initial = session();
  initial.activeWorkout!.plan.exercises = [{ exercise: EXERCISE_BY_ID.get('forearm-plank')!, sets: 1, target: 30, restSeconds: 45 }];
  const logged = completeWorkoutSet(initial, workoutStepKey(initial.activeWorkout!), now, { actual: 17, loadKg: null, effort: null });
  const result = buildWorkoutResults(logged.activeWorkout!)[0]!;
  assert.equal(result.completedVolume, 17);
  assert.equal(resultMeetsTarget(result), false);
  assertValidSnapshot(logged);
});

test('v11 active checkpoints retain unknown old sets instead of inventing measurements', () => {
  const old = session(); old.activeWorkout!.completedSets = [1];
  const loaded = decodeSnapshot(JSON.stringify({ ...old, schemaVersion: 11 }));
  assert.equal(loaded.activeWorkout!.recordedSets, undefined);
  const next = completeWorkoutSet(loaded, workoutStepKey(loaded.activeWorkout!), now, { actual: 9, loadKg: 5, effort: 'perfect' });
  assert.equal(next.activeWorkout!.recordedSets![0]![0], null);
  assert.equal(buildWorkoutResults(next.activeWorkout!)[0]!.completedVolume, 21);
  assertValidSnapshot(next);
});

test('Data Vault preserves measured loads, accepts v11 backups and rejects inconsistent set totals', async () => {
  const snapshot = { ...INITIAL_SNAPSHOT, profile: player(), onboardingComplete: true, history: [historyEntry('2026-09-12')] };
  const backup = await createBackup(snapshot, false, async () => { throw new Error('No photos expected'); }, now);
  assert.deepEqual(parseBackup(JSON.stringify(backup)).payload.snapshot.history, snapshot.history);
  const old = JSON.parse(JSON.stringify(backup)); old.payload.snapshot.schemaVersion = 11;
  delete old.payload.snapshot.history[0].results[0].recordedSets;
  old.checksum = backupChecksum(JSON.stringify(old.payload));
  const restored = parseBackup(JSON.stringify(old));
  assert.equal(restored.payload.snapshot.schemaVersion, 12);
  assert.doesNotThrow(() => parseBackup(JSON.stringify(restored)));
  const corrupt = structuredClone(snapshot); corrupt.history[0]!.results[0]!.completedVolume++;
  assert.throws(() => assertValidSnapshot(corrupt), /recorded workout/);
});
