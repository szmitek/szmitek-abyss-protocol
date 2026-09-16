import assert from 'node:assert/strict';
import test from 'node:test';
import { EXERCISE_BY_ID } from '../src/data/exercises.ts';
import { INITIAL_SNAPSHOT, createProfile, recordMovementAssessment } from '../src/domain/profile.ts';
import { createDailyReadiness, recordDailyReadiness } from '../src/domain/readiness.ts';
import { generateWorkout } from '../src/domain/generator.ts';
import { configureLoadouts } from '../src/domain/loadouts.ts';
import { chooseLoadIncrease, loadProgressionOffer } from '../src/domain/loadProgression.ts';
import { completeWorkoutSet, MAX_WARMUP_SETS, workoutReadyToFinish, workoutResumeBlock, workoutStepKey } from '../src/domain/workoutLifecycle.ts';
import { buildWorkoutResults, formatRecordedSet, resultMeetsTarget } from '../src/domain/setPerformance.ts';
import { buildActivityWeeks, buildExerciseInsights } from '../src/domain/insights.ts';
import { calculateAttributeDevelopment } from '../src/domain/progression.ts';
import { masteredTwice } from '../src/domain/arcDirective.ts';
import { decodeSnapshot } from '../src/domain/persistence.ts';
import { assertValidSnapshot } from '../src/domain/snapshotValidation.ts';
import { backupChecksum, createBackup, parseBackup } from '../src/domain/backup.ts';
import type { AppSnapshot, Exercise, MachineSetup, SetPerformance, WorkoutHistoryEntry } from '../src/domain/types.ts';

const day = '2026-09-15', now = new Date(`${day}T12:00:00`);
const curl = EXERCISE_BY_ID.get('dumbbell-curl')!;
const machine = EXERCISE_BY_ID.get('machine-chest-press')!;
const setup: MachineSetup = { id: 'machine-a', location: 'gym', exerciseId: machine.id, label: 'Chest press / seat 3' };
const other: MachineSetup = { ...setup, id: 'machine-b', label: 'Other chest press' };
const warmup: SetPerformance = { actual: 8, loadKg: 4, effort: 'perfect' };
const work: SetPerformance = { actual: 12, loadKg: 10, effort: 'perfect' };
function session(exercise: Exercise = curl): AppSnapshot {
  let profile = recordMovementAssessment(createProfile({ goal: 'strength', experienceLevel: 'intermediate', workoutDuration: 30, workoutsPerWeek: 7, availableEquipment: ['dumbbells', 'chest-press-machine'] }), {
    'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear',
  }, 'baseline', [], new Date('2026-09-01T12:00:00'));
  profile = recordDailyReadiness(profile, createDailyReadiness({ energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }, now));
  profile = configureLoadouts(profile, { active: 'gym', home: ['none'], gym: ['none', 'dumbbells', 'chest-press-machine'] }, [setup, other]);
  const plan = { ...generateWorkout(profile, [], day), exercises: [{ exercise, sets: 2, target: exercise.maxReps, restSeconds: 60 }] };
  return { ...INITIAL_SNAPSHOT, onboardingComplete: true, profile, activeWorkout: { questId: 'current', plan, startedAt: now.toISOString(), exerciseIndex: 0, completedSets: [0] } };
}
function record(dateKey: string, exercise = curl, selected?: MachineSetup): WorkoutHistoryEntry {
  const s: SetPerformance = { actual: exercise.maxReps, loadKg: 10, effort: 'perfect', ...(selected ? { machineSetup: selected } : {}) };
  return { id: dateKey, dateKey, date: `${dateKey}T14:00:00`, location: 'gym', planId: `daily-${dateKey}`, title: 'Training', completed: true, durationSeconds: 300, difficulty: 1, perceivedDifficulty: 'perfect', xpEarned: 50,
    attributeXpEarned: { strength: 1, endurance: 0, agility: 0, vitality: 0, mobility: 0 }, statGains: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 },
    results: [{ exerciseId: exercise.id, targetPerSet: exercise.maxReps, completedSets: 2, completedVolume: exercise.maxReps * 2, recordedSets: [s, { ...s }] }] };
}
function withEvidence(exercise = curl, selected?: MachineSetup) {
  return { ...session(exercise), history: [record('2026-09-14', exercise, selected), record('2026-09-12', exercise, selected)] };
}
function increased(s: AppSnapshot, exercise = curl, selected?: MachineSetup): SetPerformance {
  const offer = loadProgressionOffer(exercise, s.profile!, s.history, day, false, selected)!;
  assert.ok(offer);
  const choice = chooseLoadIncrease(offer, 0.5)!;
  assert.ok(choice);
  return { actual: exercise.minReps, loadKg: choice.loadKg, effort: 'perfect', loadDecision: choice.decision, ...(selected ? { machineSetup: selected } : {}) };
}

test('warm-up confirmation changes only preparation records, blocks stale taps and resumes intact', () => {
  const s = session(), step = workoutStepKey(s.activeWorkout!);
  const logged = completeWorkoutSet(s, step, now, warmup, 'warmup');
  assert.notEqual(logged, s);
  assert.deepEqual(logged.activeWorkout!.completedSets, [0]);
  assert.equal(logged.activeWorkout!.exerciseIndex, 0);
  assert.equal(logged.activeWorkout!.plan, s.activeWorkout!.plan);
  assert.equal(logged.profile, s.profile);
  assert.equal(logged.history, s.history);
  assert.equal(workoutReadyToFinish(logged, now), false);
  assert.equal(completeWorkoutSet(logged, step, now, warmup, 'warmup'), logged);
  const resumed = decodeSnapshot(JSON.stringify(logged));
  assert.equal(workoutResumeBlock(resumed, now), null);
  assert.deepEqual(resumed.activeWorkout!.warmupSets, [[warmup]]);
  assert.notEqual(workoutStepKey(resumed.activeWorkout!), step);
  assert.equal(s.activeWorkout!.warmupSets, undefined);
});

test('warm-ups remain separate from work volume, activity totals, mastery and RPG rewards', () => {
  let s = session();
  const development = calculateAttributeDevelopment(s.profile!, s.activeWorkout!.plan);
  const reward = s.activeWorkout!.plan.rewardXp;
  s = completeWorkoutSet(s, workoutStepKey(s.activeWorkout!), now, warmup, 'warmup');
  assert.equal(buildWorkoutResults(s.activeWorkout!)[0]!.completedVolume, 0);
  for (let i = 0; i < 2; i++) s = completeWorkoutSet(s, workoutStepKey(s.activeWorkout!), now, work);
  assert.equal(workoutReadyToFinish(s, now), true);
  assert.deepEqual(calculateAttributeDevelopment(s.profile!, s.activeWorkout!.plan), development);
  assert.equal(s.activeWorkout!.plan.rewardXp, reward);
  const results = buildWorkoutResults(s.activeWorkout!);
  assert.equal(results[0]!.completedSets, 2);
  assert.equal(results[0]!.completedVolume, 24);
  assert.deepEqual(results[0]!.warmupSets, [warmup]);
  const history = [{ ...record('2026-09-14'), results }];
  assert.equal(buildActivityWeeks(history, day).at(-1)!.repetitions, 24);
  const insight = buildExerciseInsights(history)[0]!;
  assert.equal(insight.totalVolume, 24);
  assert.deepEqual(insight.samples[0]!.warmupSets, [warmup]);
  const failed = { ...results[0]!, recordedSets: [{ ...work, actual: 0 }, { ...work, actual: 0 }], completedVolume: 0, warmupSets: [{ ...warmup, actual: 100, loadKg: 100 }] };
  assert.equal(resultMeetsTarget(failed), false);
  assert.equal(masteredTwice([{ ...record('2026-09-14'), results: [failed] }, { ...record('2026-09-12'), results: [failed] }], curl.id, null), false);
});

test('warm-up guardrails reject after work, after midnight, in trials and beyond five sets', () => {
  let s = session();
  for (let i = 0; i < MAX_WARMUP_SETS; i++) s = completeWorkoutSet(s, workoutStepKey(s.activeWorkout!), now, warmup, 'warmup');
  assert.equal(completeWorkoutSet(s, workoutStepKey(s.activeWorkout!), now, warmup, 'warmup'), s);
  s = completeWorkoutSet(s, workoutStepKey(s.activeWorkout!), now, work);
  assert.equal(completeWorkoutSet(s, workoutStepKey(s.activeWorkout!), now, warmup, 'warmup'), s);
  const fresh = session();
  assert.equal(completeWorkoutSet(fresh, workoutStepKey(fresh.activeWorkout!), new Date('2026-09-16T12:00:00'), warmup, 'warmup'), fresh);
  const trial = { ...fresh, activeWorkout: { ...fresh.activeWorkout!, plan: { ...fresh.activeWorkout!.plan, kind: 'rank-trial' as const } } };
  assert.equal(completeWorkoutSet(trial, workoutStepKey(trial.activeWorkout!), now, warmup, 'warmup'), trial);
  const bodyweight = session(EXERCISE_BY_ID.get('bodyweight-squat') ?? EXERCISE_BY_ID.get('squat')!);
  assert.equal(completeWorkoutSet(bodyweight, workoutStepKey(bodyweight.activeWorkout!), now, { ...warmup, loadKg: null }, 'warmup'), bodyweight);
});

test('load offer requires the latest two completed, distinct top-range exposures at one load', () => {
  const s = withEvidence();
  assert.deepEqual(loadProgressionOffer(curl, s.profile!, s.history, day), { previousKg: 10, evidenceDateKeys: ['2026-09-14', '2026-09-12'] });
  assert.equal(loadProgressionOffer(curl, s.profile!, [], day), null);
  assert.equal(loadProgressionOffer(curl, s.profile!, s.history.slice(0, 1), day), null);
  for (const mutate of [
    (h: WorkoutHistoryEntry[]) => { h[0]!.results[0]!.recordedSets![0]!.actual = 1; },
    (h: WorkoutHistoryEntry[]) => { h[0]!.results[0]!.recordedSets![0]!.effort = 'too-hard'; },
    (h: WorkoutHistoryEntry[]) => { h[0]!.results[0]!.recordedSets![0]!.effort = null; },
    (h: WorkoutHistoryEntry[]) => { h[0]!.results[0]!.recordedSets![0]!.loadKg = 11; },
    (h: WorkoutHistoryEntry[]) => { delete h[0]!.results[0]!.recordedSets; },
    (h: WorkoutHistoryEntry[]) => { h[0]!.perceivedDifficulty = 'too-hard'; },
    (h: WorkoutHistoryEntry[]) => { h[0]!.completed = false; },
    (h: WorkoutHistoryEntry[]) => { h[1]!.dateKey = h[0]!.dateKey; },
    (h: WorkoutHistoryEntry[]) => { h[0]!.dateKey = day; },
  ]) {
    const history = structuredClone(s.history); mutate(history);
    assert.equal(loadProgressionOffer(curl, s.profile!, history, day), null);
  }
  const failed = record('2026-09-14'); failed.perceivedDifficulty = 'too-hard';
  assert.equal(loadProgressionOffer(curl, s.profile!, [failed, record('2026-09-12'), record('2026-09-10')], day), null);
});

test('readiness, equipment, movement, pain and recovery decisions override load proposals', () => {
  const s = withEvidence();
  assert.equal(loadProgressionOffer(curl, s.profile!, s.history, day, true), null);
  for (const mutate of [
    (p: NonNullable<AppSnapshot['profile']>) => { p.availableEquipment = ['none']; },
    (p: NonNullable<AppSnapshot['profile']>) => { p.readinessLog = []; },
    (p: NonNullable<AppSnapshot['profile']>) => { p.healthProfile.safetySignals = ['acute-injury']; },
    (p: NonNullable<AppSnapshot['profile']>) => { p.healthProfile.painAreas = [...curl.blockedPainAreas!]; },
    (p: NonNullable<AppSnapshot['profile']>) => { p.movementAssessments[0]!.results[curl.requiredClearChecks![0]!] = 'limited'; },
    (p: NonNullable<AppSnapshot['profile']>) => { p.trainingArcs[0]!.entryDecision = 'recovery'; },
    (p: NonNullable<AppSnapshot['profile']>) => { p.excludedExercises = [curl.id]; },
  ]) {
    const profile = structuredClone(s.profile!); mutate(profile);
    assert.equal(loadProgressionOffer(curl, profile, s.history, day), null);
  }
});

test('machine offers require the registered setup on both latest exposures and never transfer kg', () => {
  const s = withEvidence(machine, setup);
  assert.ok(loadProgressionOffer(machine, s.profile!, s.history, day, false, setup));
  assert.equal(loadProgressionOffer(machine, s.profile!, s.history, day), null);
  assert.equal(loadProgressionOffer(machine, s.profile!, s.history, day, false, other), null);
  const history = [record('2026-09-14', machine, other), ...s.history.slice(1), record('2026-09-10', machine, setup)];
  assert.equal(loadProgressionOffer(machine, s.profile!, history, day, false, setup), null);
  history[0]!.results[0]!.recordedSets![1]!.machineSetup = setup;
  assert.equal(loadProgressionOffer(machine, s.profile!, history, day, false, setup), null);
  assert.equal(loadProgressionOffer(machine, { ...s.profile!, machineSetups: [] }, s.history, day, false, setup), null);
});

test('chosen increments respect decimal precision, the 10 percent cap and maximum load', () => {
  const offer = { previousKg: 10, evidenceDateKeys: ['2026-09-14', '2026-09-12'] as [string, string] };
  assert.equal(chooseLoadIncrease(offer, 0.5)!.loadKg, 10.5);
  assert.equal(chooseLoadIncrease(offer, 1)!.loadKg, 11);
  for (const increment of [0, -1, NaN, Infinity, 0.001, 1.01, 100]) assert.equal(chooseLoadIncrease(offer, increment), null);
  assert.equal(chooseLoadIncrease({ ...offer, previousKg: 1000 }, 0.5), null);
});

test('confirmation records an explicit load decision and resets the work target only then', () => {
  const s = withEvidence(), selected = increased(s);
  s.dailyQuest = { id: s.activeWorkout!.questId, dateKey: day, status: 'active', plan: s.activeWorkout!.plan };
  assert.equal(s.activeWorkout!.plan.exercises[0]!.target, curl.maxReps);
  let logged = completeWorkoutSet(s, workoutStepKey(s.activeWorkout!), now, selected);
  assert.equal(logged.activeWorkout!.plan.exercises[0]!.target, curl.minReps);
  assert.equal(logged.dailyQuest!.plan, logged.activeWorkout!.plan);
  assert.equal(logged.activeWorkout!.recordedSets![0]![0]!.loadKg, 10.5);
  assert.deepEqual(logged.activeWorkout!.recordedSets![0]![0]!.loadDecision, selected.loadDecision);
  selected.loadDecision!.evidenceDateKeys[0] = '2000-01-01';
  assert.equal(logged.activeWorkout!.recordedSets![0]![0]!.loadDecision!.evidenceDateKeys[0], '2026-09-14');
  logged = decodeSnapshot(JSON.stringify(logged));
  assert.equal(workoutResumeBlock(logged, now), null);
  const repeated = { ...increased(s), loadDecision: increased(s).loadDecision! };
  assert.equal(completeWorkoutSet(logged, workoutStepKey(logged.activeWorkout!), now, repeated), logged);
  logged = completeWorkoutSet(logged, workoutStepKey(logged.activeWorkout!), now, { actual: curl.minReps, loadKg: 10.5, effort: 'perfect' });
  const result = buildWorkoutResults(logged.activeWorkout!)[0]!;
  assert.equal(result.targetPerSet, curl.minReps);
  assert.equal(resultMeetsTarget(result), true);
  assert.match(formatRecordedSet(result.recordedSets![0]!, 0, 'reps', 'per-hand'), /chosen increase \+0.5 kg/);
});

test('stale, forged, machine-mismatched and hard-warmup load decisions cannot be confirmed', () => {
  const original = withEvidence(), selected = increased(original);
  const stale = { ...original, history: [] };
  assert.equal(completeWorkoutSet(stale, workoutStepKey(stale.activeWorkout!), now, selected), stale);
  assert.equal(completeWorkoutSet(original, workoutStepKey(original.activeWorkout!), now, { ...selected, loadKg: 100 }), original);
  assert.equal(completeWorkoutSet(original, workoutStepKey(original.activeWorkout!), now, selected, 'warmup'), original);
  const warmed = completeWorkoutSet(original, workoutStepKey(original.activeWorkout!), now, { ...warmup, effort: 'too-hard' }, 'warmup');
  assert.equal(completeWorkoutSet(warmed, workoutStepKey(warmed.activeWorkout!), now, selected), warmed);
  const m = withEvidence(machine, setup), chosen = increased(m, machine, setup);
  assert.equal(completeWorkoutSet(m, workoutStepKey(m.activeWorkout!), now, { ...chosen, machineSetup: other }), m);
  const accepted = completeWorkoutSet(m, workoutStepKey(m.activeWorkout!), now, chosen);
  assert.equal(accepted.activeWorkout!.recordedSets![0]![0]!.machineSetup!.id, setup.id);
});

test('v13 migration preserves old measurements and adds no invented preparation or decisions', async () => {
  const old = { ...withEvidence(), schemaVersion: 13 };
  const migrated = decodeSnapshot(JSON.stringify(old));
  assert.equal(migrated.schemaVersion, 15);
  assert.equal(migrated.activeWorkout!.warmupSets, undefined);
  assert.equal(migrated.history[0]!.results[0]!.recordedSets![0]!.loadDecision, undefined);
  assert.deepEqual(migrated.history, old.history);
  const backup = await createBackup({ ...withEvidence(), activeWorkout: null }, false, async () => '', now);
  const legacy = JSON.parse(JSON.stringify(backup)); legacy.payload.snapshot.schemaVersion = 13; legacy.checksum = backupChecksum(JSON.stringify(legacy.payload));
  assert.equal(parseBackup(JSON.stringify(legacy)).payload.snapshot.schemaVersion, 15);
});

test('Vault preserves warm-ups, accepted decisions and retired machine identity; malformed data is rejected', async () => {
  let s = withEvidence(machine, setup);
  s = completeWorkoutSet(s, workoutStepKey(s.activeWorkout!), now, { ...warmup, machineSetup: setup }, 'warmup');
  s = completeWorkoutSet(s, workoutStepKey(s.activeWorkout!), now, increased(s, machine, setup));
  await assert.rejects(() => createBackup(s, false, async () => '', now), /Finish or exit/);
  const restored = decodeSnapshot(JSON.stringify(s));
  assert.deepEqual(restored.activeWorkout, s.activeWorkout);
  assertValidSnapshot(restored);
  for (const mutate of [
    (bad: AppSnapshot) => { bad.activeWorkout!.warmupSets![0]![0]!.loadDecision = increased(withEvidence()).loadDecision!; },
    (bad: AppSnapshot) => { bad.activeWorkout!.warmupSets![0] = Array(6).fill(warmup); },
    (bad: AppSnapshot) => { bad.activeWorkout!.warmupSets!.push([]); },
    (bad: AppSnapshot) => { bad.activeWorkout!.recordedSets![0]![0]!.loadDecision!.evidenceDateKeys[0] = day; },
    (bad: AppSnapshot) => { bad.activeWorkout!.recordedSets![0]![0]!.loadDecision!.incrementKg = 50; },
  ]) {
    const bad = structuredClone(restored); mutate(bad); assert.throws(() => assertValidSnapshot(bad));
  }
  s = completeWorkoutSet(s, workoutStepKey(s.activeWorkout!), now, { actual: machine.minReps, loadKg: 10.5, effort: 'perfect', machineSetup: setup });
  const archived = { ...s, activeWorkout: null, profile: { ...s.profile!, machineSetups: [] }, history: [{ ...record(day, machine, setup), results: buildWorkoutResults(s.activeWorkout!) }, ...s.history] };
  const archiveBackup = await createBackup(archived, false, async () => '', now);
  assert.deepEqual(parseBackup(JSON.stringify(archiveBackup)).payload.snapshot.history[0]!.results[0]!.warmupSets, [{ ...warmup, machineSetup: setup }]);
});
