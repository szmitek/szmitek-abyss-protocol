import assert from 'node:assert/strict';
import test from 'node:test';
import { EXERCISE_BY_ID } from '../src/data/exercises.ts';
import { configureLoadouts, draftLoadouts, setupsForExercise, validateLoadouts } from '../src/domain/loadouts.ts';
import { INITIAL_SNAPSHOT, createProfile, recordMovementAssessment, updateProfileSettings } from '../src/domain/profile.ts';
import { updateTrainingLoadouts, beginDailyWorkout, refreshDailyQuest } from '../src/domain/questState.ts';
import { createDailyReadiness, recordDailyReadiness } from '../src/domain/readiness.ts';
import { generateWorkout, isEquipmentCompatible, replaceExerciseInPlan } from '../src/domain/generator.ts';
import { weeklyProtocolFingerprint } from '../src/domain/weeklyProtocol.ts';
import { completeWorkoutSet, workoutStepKey } from '../src/domain/workoutLifecycle.ts';
import { buildWorkoutResults, formatRecordedSet, isValidSetPerformance } from '../src/domain/setPerformance.ts';
import { loadGuidance } from '../src/domain/loadGuidance.ts';
import { masteredTwice } from '../src/domain/arcDirective.ts';
import { decodeSnapshot } from '../src/domain/persistence.ts';
import { assertValidSnapshot } from '../src/domain/snapshotValidation.ts';
import { backupChecksum, createBackup, parseBackup } from '../src/domain/backup.ts';
import type { AppSnapshot, MachineSetup, SetPerformance, TrainingLoadouts, UserProfile, WorkoutHistoryEntry } from '../src/domain/types.ts';

const day = '2026-09-14', now = new Date(`${day}T12:00:00`);
const machine = EXERCISE_BY_ID.get('machine-chest-press')!;
const setup: MachineSetup = { id: 'machine-a', exerciseId: machine.id, location: 'gym', label: 'Gym A / seat 3' };
const other: MachineSetup = { ...setup, id: 'machine-b', label: 'Gym B / seat 4' };
const loadouts: TrainingLoadouts = { active: 'gym', home: ['none'], gym: ['none', 'chest-press-machine', 'dumbbells'] };
function player(): UserProfile {
  let p = createProfile({ goal: 'strength', experienceLevel: 'intermediate', workoutDuration: 30, workoutsPerWeek: 7, availableEquipment: ['dumbbells'] });
  p = recordMovementAssessment(p, { 'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear' }, 'baseline', [], new Date('2026-08-31T12:00:00'));
  return recordDailyReadiness(p, createDailyReadiness({ energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }, now));
}
function snapshot(): AppSnapshot { return { ...INITIAL_SNAPSHOT, profile: player(), onboardingComplete: true }; }
function record(dateKey: string, selected: MachineSetup | undefined = setup, kg = 30): WorkoutHistoryEntry {
  const set: SetPerformance = { actual: 12, loadKg: kg, effort: 'perfect', ...(selected ? { machineSetup: selected } : {}) };
  return { id: dateKey, dateKey, date: `${dateKey}T12:00:00`, location: 'gym', planId: `daily-${dateKey}`, title: 'Gym', completed: true, durationSeconds: 100, difficulty: 1, perceivedDifficulty: 'perfect', xpEarned: 0, attributeXpEarned: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 }, statGains: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 }, results: [{ exerciseId: machine.id, completedSets: 2, targetPerSet: 12, completedVolume: 24, recordedSets: [set, { ...set }] }] };
}

test('legacy equipment is preserved until loadouts are explicitly configured', () => {
  const original = snapshot();
  const loaded = decodeSnapshot(JSON.stringify({ ...original, schemaVersion: 12 }));
  assert.deepEqual(loaded.profile!.availableEquipment, ['none', 'dumbbells']);
  assert.equal(loaded.profile!.loadouts, undefined);
  assert.deepEqual(draftLoadouts(loaded.profile!), { active: 'home', home: ['none', 'dumbbells'], gym: ['none'] });
  assert.equal(loaded.schemaVersion, 16);
});

test('switching HOME/GYM rebuilds the contract and maintains strict gear filters including replacements', () => {
  let s = updateTrainingLoadouts(snapshot(), loadouts, [setup], now);
  const gymFingerprint = s.weeklyProtocol!.profileFingerprint;
  assert.equal(s.dailyQuest!.plan.location, 'gym');
  s = updateTrainingLoadouts(s, { ...loadouts, active: 'home' }, [setup], now);
  assert.notEqual(s.weeklyProtocol!.profileFingerprint, gymFingerprint);
  assert.deepEqual(s.profile!.availableEquipment, ['none']);
  assert.equal(s.dailyQuest!.plan.location, 'home');
  for (const session of s.weeklyProtocol!.sessions) {
    assert.ok(session.plan.exercises.every((p) => isEquipmentCompatible(p.exercise, ['none'])));
    const replacement = replaceExerciseInPlan(session.plan, 1, s.profile!);
    if (replacement) assert.ok(replacement.exercises.every((p) => isEquipmentCompatible(p.exercise, ['none'])));
  }
  assert.deepEqual(s.profile!.loadouts!.gym, loadouts.gym);
});

test('loadout changes preserve completed days, history and active workout boundaries', () => {
  let s = updateTrainingLoadouts(snapshot(), loadouts, [setup], now);
  const active = beginDailyWorkout(s, now);
  assert.ok(active.activeWorkout);
  assert.throws(() => updateTrainingLoadouts(active, { ...loadouts, active: 'home' }, [], now), /Finish or exit/);
  const quest = { ...s.dailyQuest!, status: 'complete' as const };
  const history = [record(day)]; s = { ...s, dailyQuest: quest, history };
  const changed = updateTrainingLoadouts(s, { ...loadouts, active: 'home' }, [setup], now);
  assert.equal(changed.dailyQuest, quest); assert.equal(changed.history, history);
  assert.equal(beginDailyWorkout(changed, now).activeWorkout, null);
});

test('same gear at another location still changes the protocol fingerprint; profile edits change only active gear', () => {
  const p = configureLoadouts(player(), { ...loadouts, home: [...loadouts.gym] }, [setup]);
  const home = configureLoadouts(p, { ...p.loadouts!, active: 'home' }, [setup]);
  assert.notEqual(weeklyProtocolFingerprint(p, day), weeklyProtocolFingerprint(home, day));
  const edited = updateProfileSettings(home, { ...home, availableEquipment: ['bands'] });
  assert.deepEqual(edited.loadouts!.home, ['none', 'bands']);
  assert.deepEqual(edited.loadouts!.gym, loadouts.gym);
  assert.deepEqual(edited.availableEquipment, edited.loadouts!.home);
});

test('setup identities are immutable, bounded and do not grant equipment', () => {
  const p = configureLoadouts(player(), loadouts, [setup]);
  assert.throws(() => configureLoadouts(p, loadouts, [{ ...setup, label: 'Changed machine' }]), /new setup/);
  assert.throws(() => validateLoadouts(loadouts, [setup, { ...setup, id: 'other' }]), /different names/);
  assert.throws(() => validateLoadouts(loadouts, [{ ...setup, label: 'x'.repeat(61) }]));
  assert.throws(() => validateLoadouts(loadouts, [{ ...setup, exerciseId: 'dumbbell-curl' }]));
  const home = configureLoadouts(p, { ...loadouts, active: 'home' }, [setup]);
  assert.deepEqual(setupsForExercise(home, machine.id), []);
  assert.deepEqual(home.availableEquipment, ['none']);
});

test('set confirmation rejects mismatched setup IDs and preserves selected setup through resume/history', () => {
  let s = updateTrainingLoadouts(snapshot(), loadouts, [setup], now);
  const plan = { ...s.dailyQuest!.plan, exercises: [{ exercise: machine, sets: 2, target: 8, restSeconds: 90 }] };
  s = { ...s, activeWorkout: { questId: 'test', plan, completedSets: [0], exerciseIndex: 0, startedAt: now.toISOString() } };
  const set: SetPerformance = { actual: 8, loadKg: 30, effort: 'perfect', machineSetup: setup };
  assert.equal(completeWorkoutSet(s, workoutStepKey(s.activeWorkout!), now, { ...set, machineSetup: other }), s);
  assert.equal(isValidSetPerformance({ ...set, machineSetup: { ...setup, exerciseId: 'machine-leg-press' } }, machine), false);
  const logged = completeWorkoutSet(s, workoutStepKey(s.activeWorkout!), now, set);
  const resumed = decodeSnapshot(JSON.stringify(logged)); assertValidSnapshot(resumed);
  assert.deepEqual(buildWorkoutResults(resumed.activeWorkout!)[0]!.recordedSets![0]!.machineSetup, setup);
  assert.match(formatRecordedSet(set, 0, 'reps', 'stack'), /GYM \/ Gym A \/ seat 3/);
});

test('machine guidance compares only identified, uniform sessions on the selected setup', () => {
  const p = configureLoadouts(player(), loadouts, [setup, other]);
  const history = [record('2026-09-13', other, 60), record('2026-09-12', setup, 30), record('2026-09-10', setup, 30)];
  assert.equal(loadGuidance(machine, p, history, day, false, setup).previousKg, 30);
  assert.equal(loadGuidance(machine, p, history, day, false, other).previousKg, 60);
  assert.equal(loadGuidance(machine, p, history, day).previousKg, null);
  assert.equal(loadGuidance(machine, p, history, day, true, setup).previousKg, null);
  const unknown = record('2026-09-12'); delete unknown.results[0]!.recordedSets![0]!.machineSetup; delete unknown.results[0]!.recordedSets![1]!.machineSetup;
  assert.equal(loadGuidance(machine, p, [unknown], day, false, setup).previousKg, null);
  assert.equal(loadGuidance(machine, p, history, day, false, { ...setup, location: 'home' }).previousKg, null);
  const mixed = record('2026-09-11'); mixed.results[0]!.recordedSets![1]!.machineSetup = other;
  assert.equal(loadGuidance(machine, p, [mixed], day, false, setup).previousKg, null);
  assert.equal(masteredTwice(history, machine.id, null), false);
  assert.equal(masteredTwice(history.slice(1), machine.id, null), true);
  assert.doesNotMatch(loadGuidance(machine, p, history.slice(1), day, false, setup).message, /LOAD REVIEW AVAILABLE/);
});

test('machine history does not carry a rep target from an unidentified setup into a new plan', () => {
  const p = configureLoadouts(player(), loadouts, [setup]);
  p.excludedExercises = [...EXERCISE_BY_ID.values()].filter((e) => e.loading && e.id !== machine.id).map((e) => e.id);
  const empty = generateWorkout(p, [], day);
  assert.ok(empty.exercises.some((item) => item.exercise.id === machine.id));
  const withHistory = generateWorkout(p, [record('2026-09-12', other)], day);
  for (const item of withHistory.exercises.filter((item) => item.exercise.loading === 'stack')) {
    const original = empty.exercises.find((x) => x.exercise.id === item.exercise.id);
    if (original) assert.equal(item.target, original.target);
  }
  assert.equal(refreshDailyQuest({ ...snapshot(), profile: { ...p, healthProfile: { ...p.healthProfile, safetySignals: ['acute-injury'] } } }, day).dailyQuest!.plan.kind, 'safety-hold');
});

test('Vault round-trips loadouts and retired machine history, imports v12, rejects mismatched active equipment', async () => {
  const p = configureLoadouts(player(), loadouts, [setup]);
  const retired = configureLoadouts(p, loadouts, []);
  const s = { ...snapshot(), profile: retired, history: [record('2026-09-12')] };
  const backup = await createBackup(s, false, async () => '', now);
  const restored = parseBackup(JSON.stringify(backup));
  assert.deepEqual(restored.payload.snapshot.profile!.loadouts, loadouts);
  assert.equal(restored.payload.snapshot.history[0]!.results[0]!.recordedSets![0]!.machineSetup!.id, setup.id);
  const old = await createBackup(snapshot(), false, async () => '', now);
  const v12 = JSON.parse(JSON.stringify(old)); v12.payload.snapshot.schemaVersion = 12; v12.checksum = backupChecksum(JSON.stringify(v12.payload));
  assert.equal(parseBackup(JSON.stringify(v12)).payload.snapshot.schemaVersion, 16);
  assert.throws(() => assertValidSnapshot({ ...s, profile: { ...retired, availableEquipment: ['none'] } }), /loadout/);
});
