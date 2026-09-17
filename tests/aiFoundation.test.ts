import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { appendBodyMeasurement, assertBodyMeasurement, bodyMeasurementStats, createBodyMeasurement } from '../src/domain/bodyMeasurements.ts';
import { createProfile, INITIAL_SNAPSHOT } from '../src/domain/profile.ts';
import { createSnapshotRepository, decodeSnapshot } from '../src/domain/persistence.ts';
import { assertValidSnapshot } from '../src/domain/snapshotValidation.ts';
import { backupChecksum, createBackup, parseBackup, prepareBackupRestore } from '../src/domain/backup.ts';
import { buildWeeklyReview } from '../src/domain/weeklyReview.ts';
import { MockAIProvider } from '../src/domain/mockAIProvider.ts';
import type { ReviewPeriod, AIProvider } from '../src/domain/aiContracts.ts';
import type { AppSnapshot } from '../src/domain/types.ts';

const now = new Date('2026-09-17T12:00:00Z');
const period: ReviewPeriod = { from: '2026-09-01', to: '2026-09-14', timeZone: 'Europe/Warsaw', bounds: 'inclusive-local-dates' };
const measurement = (id = 'm1', day = '2026-09-01', weight: number | null = 80, waist: number | null = null) => createBodyMeasurement(id, day, { weight, waist }, now);
function snapshot(): AppSnapshot { return { ...INITIAL_SNAPSHOT, onboardingComplete: true, profile: createProfile({ goal: 'strength', experienceLevel: 'beginner', workoutDuration: 20, workoutsPerWeek: 3, availableEquipment: ['none'] }) }; }
function workout(id: string, day: string, actual: number | null, overrides = {}): AppSnapshot['history'][number] {
  const stats = { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 };
  return { id, dateKey: day, date: `${day}T12:00:00Z`, planId: `daily-${day}`, title: 'Training', completed: true, durationSeconds: 600, difficulty: 1, perceivedDifficulty: 'perfect', xpEarned: 0, attributeXpEarned: stats, statGains: stats,
    results: [{ exerciseId: 'wall-pushup', completedSets: 1, targetPerSet: 10, completedVolume: actual ?? 10, recordedSets: [actual === null ? null : { actual, loadKg: null, effort: 'perfect' }] }], ...overrides };
}
test('first measurement stores explicit nulls and actual day, independently of entry timestamp', () => {
  const m = measurement(); assert.equal(m.measuredOn, '2026-09-01'); assert.equal(m.recordedAt, now.toISOString());
  assert.deepEqual(m.values, { weight: 80, waist: null, hips: null, chest: null, upperArm: null, thigh: null, calf: null });
  assert.equal(appendBodyMeasurement([], m).length, 1);
});
test('append preserves old records, stable IDs and detaches mutable values', () => {
  const first = measurement(); const old = [first]; const next = measurement('m2', '2026-09-10', null, 92);
  const history = appendBodyMeasurement(old, next); next.values.waist = 100;
  assert.equal(old.length, 1); assert.deepEqual(history[0], first); assert.equal(history[1]!.values.waist, 92);
  assert.throws(() => appendBodyMeasurement(history, first), /already/);
});
test('partial circumference-only data is allowed, zero/empty/nonfinite/negative are rejected', () => {
  assertBodyMeasurement(createBodyMeasurement('hips', '2026-09-01', { hips: 98 }, now));
  for (const value of [0, -1, NaN, Infinity, 1001]) assert.throws(() => measurement('bad', '2026-09-01', value));
  assert.throws(() => measurement('empty', '2026-09-01', null));
  assert.throws(() => assertBodyMeasurement({ ...measurement(), values: { weight: 80 } }));
});
test('invalid and future dates cannot create measurements', () => {
  for (const day of ['2026-02-30', '2026-9-1', 'invalid', '2026-09-18']) assert.throws(() => measurement('bad', day));
});
test('empty and single-point statistics do not invent deltas or measurements', () => {
  const empty = bodyMeasurementStats([]); assert.equal(empty.recordCount, 0); assert.equal(empty.metrics.weight.mean, null);
  const one = bodyMeasurementStats([measurement()]); assert.equal(one.metrics.weight.change, null); assert.equal(one.metrics.weight.firstToLastDailyMeanChange, null); assert.equal(one.metrics.waist.latest, null);
});
test('backdated and partially populated entries sort by actual measurement date', () => {
  const stats = bodyMeasurementStats([measurement('b', '2026-09-10', 79, 92), measurement(), measurement('c', '2026-09-12', null, 91)]);
  assert.equal(stats.metrics.weight.latest!.value, 79); assert.equal(stats.metrics.weight.change, -1);
  assert.equal(stats.metrics.waist.change, -1); assert.equal(stats.metrics.weight.mean, 79.5);
});
test('period bounds inclusive, daily means avoid overweighting repeated measurements', () => {
  const history = [measurement('a', '2026-09-01', 80), measurement('b', '2026-09-01', 82), measurement('c', '2026-09-14', 79), measurement('d', '2026-09-15', 100)];
  const s = bodyMeasurementStats(history, period); assert.equal(s.recordCount, 3); assert.equal(s.metrics.weight.mean, 80); assert.equal(s.metrics.weight.measuredDays, 2); assert.equal(s.metrics.weight.firstToLastDailyMeanChange, -2);
  assert.throws(() => bodyMeasurementStats(history, { from: period.to, to: period.from }));
});
test('different protocols are excluded from comparable means and changes', () => {
  const old = { ...measurement(), protocolId: 'evening-v1' }; const recent = measurement('b', '2026-09-10', 79);
  const s = bodyMeasurementStats([old, recent]).metrics.weight; assert.equal(s.change, null); assert.equal(s.mean, 79); assert.equal(s.excludedProtocolCount, 1);
});
test('APK18 migration preserves profile/history and only adds empty measurement history', () => {
  const s = snapshot(); s.history = [workout('old', '2026-09-02', null)];
  const raw = JSON.parse(JSON.stringify(s)); raw.schemaVersion = 16; delete raw.profile.bodyMeasurements;
  const migrated = decodeSnapshot(JSON.stringify(raw)); assert.equal(migrated.schemaVersion, 17); assert.deepEqual(migrated.history, s.history); assert.deepEqual(migrated.profile, { ...raw.profile, bodyMeasurements: [] });
});
test('current corrupt measurements and duplicate IDs fail instead of silently disappearing', () => {
  const s = snapshot(); s.profile!.bodyMeasurements = [measurement(), measurement()]; assert.throws(() => assertValidSnapshot(s));
  const raw = JSON.parse(JSON.stringify(snapshot())); delete raw.profile.bodyMeasurements;
  assert.throws(() => decodeSnapshot(JSON.stringify(raw)));
});
test('local save/reload and backup/restore preserve measurements exactly', async () => {
  const s = snapshot(); s.profile!.bodyMeasurements = [measurement(), measurement('b', '2026-09-10', null, 91)];
  const data = new Map<string, string>(); const repo = createSnapshotRepository({ getItem: async (key) => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } });
  await repo.save(s); assert.deepEqual(await repo.load(), s);
  const backup = await createBackup(s, false, async () => { throw new Error('No photos'); }, now);
  const restored = await prepareBackupRestore(parseBackup(JSON.stringify(backup)), 'test', async () => { throw new Error('No photos'); });
  assert.deepEqual(restored.profile!.bodyMeasurements, s.profile!.bodyMeasurements);
});
test('APK18 Vault backup verifies old checksum before migration', async () => {
  const backup = JSON.parse(JSON.stringify(await createBackup(snapshot(), false, async () => '', now)));
  backup.payload.snapshot.schemaVersion = 16; delete backup.payload.snapshot.profile.bodyMeasurements;
  backup.checksum = backupChecksum(JSON.stringify(backup.payload));
  assert.deepEqual(parseBackup(JSON.stringify(backup)).payload.snapshot.profile!.bodyMeasurements, []);
  backup.payload.snapshot.profile.xp += 1; assert.throws(() => parseBackup(JSON.stringify(backup)), /integrity/);
});
test('review with no data uses null targets and coverage rather than fabricated adherence', () => {
  const r = buildWeeklyReview(snapshot(), period, 'empty'); assert.equal(r.adherence.rate, null); assert.equal(r.dataCoverage.missingWellbeingDays, 14); assert.equal(r.body.statistics.metrics.weight.latest, null);
  assert.equal(r.photos.status, 'no_pixels_attached'); assert.equal(r.constraints.mayModifyPlan, false);
});
test('review separates actual/legacy data, trials and return exposures and computes facts locally', () => {
  const s = snapshot(); s.history = [workout('a', '2026-09-01', 8), workout('b', '2026-09-10', 12), workout('legacy', '2026-09-11', null), workout('trial', '2026-09-12', 20, { planId: 'rank-trial-E' }), workout('return', '2026-09-13', 6, { returnBlockId: 'return-1' })];
  const r = buildWeeklyReview(s, period, 'review'); assert.equal(r.adherence.completedTrainingSessions, 4); assert.equal(r.dataCoverage.missingActualSets, 1);
  assert.equal(r.exerciseExposures.find((e) => e.workoutId === 'legacy')!.actualVolume, null);
  assert.equal(r.exerciseExposures.find((e) => e.workoutId === 'return')!.comparisonKey, null);
  assert.equal(r.facts.find((f) => f.id.endsWith(':actual-change'))!.value, 4);
  r.exerciseExposures[0]!.recordedSets[0]!.actual = 99; assert.equal(s.history[0]!.results[0]!.recordedSets![0]!.actual, 8);
});
test('review rejects invalid periods and time zones', () => {
  assert.throws(() => buildWeeklyReview(snapshot(), { ...period, to: '2026-02-30' }, 'r'));
  assert.throws(() => buildWeeklyReview(snapshot(), { ...period, timeZone: 'bad-zone' }, 'r'));
});
test('machine identities, missing setup and warmups cannot inflate comparable work facts', () => {
  const s = snapshot();
  const loaded = (id: string, day: string, kg: number, machine: string | null) => workout(id, day, 10, {
    results: [{ exerciseId: 'machine-leg-press', completedSets: 1, targetPerSet: 10, completedVolume: 10,
      recordedSets: [{ actual: 10, loadKg: kg, effort: 'perfect', ...(machine ? { machineSetup: { id: machine, exerciseId: 'machine-leg-press', location: 'gym', label: machine } } : {}) }],
      warmupSets: [{ actual: 20, loadKg: 5, effort: 'perfect' }],
    }],
  });
  s.history = [loaded('a', '2026-09-01', 60, 'machine-A'), loaded('b', '2026-09-05', 65, 'machine-A'), loaded('c', '2026-09-10', 100, 'machine-B'), loaded('d', '2026-09-11', 150, null)];
  const r = buildWeeklyReview(s, period, 'machines');
  assert.notEqual(r.exerciseExposures[0]!.comparisonKey, null);
  assert.equal(r.exerciseExposures[0]!.comparisonKey, r.exerciseExposures[1]!.comparisonKey);
  assert.notEqual(r.exerciseExposures[1]!.comparisonKey, r.exerciseExposures[2]!.comparisonKey);
  assert.equal(r.exerciseExposures[3]!.comparisonKey, null);
  assert.deepEqual(r.facts.filter((f) => f.id.endsWith(':load-change')).map((f) => f.value), [5, null]);
  assert.equal(r.exerciseExposures[0]!.externalLoadVolume, 600);
  assert.equal(r.exerciseExposures[0]!.warmupSets.length, 1);
});
test('review retains categorical wellbeing/tests and sends only a photo manifest without paths or pixels', () => {
  const s = snapshot();
  s.profile!.readinessLog = [{ id: 'ready', date: '2026-09-02T12:00:00Z', dateKey: '2026-09-02', energy: 'low', sleep: 'poor', soreness: 'none', soreMuscles: [], painOrWarning: false, band: 'reduced' }];
  s.profile!.movementAssessments = [{ id: 'test', date: '2026-09-03T12:00:00Z', dateKey: '2026-09-03', kind: 'baseline', results: { 'squat-control': 'limited', 'hip-hinge': 'clear', 'overhead-reach': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear' } }];
  const photo = { uri: 'file:///private/sensitive.jpg', width: 100, height: 100, source: 'library' as const, capturedAt: '2026-09-03T12:00:00Z' };
  s.profile!.postureScans = [{ id: 'photo', date: photo.capturedAt, dateKey: '2026-09-03', trainingArcId: null, trainingArcCycle: null, photos: { front: { ...photo, view: 'front' }, side: { ...photo, view: 'side' }, back: { ...photo, view: 'back' } } }];
  const r = buildWeeklyReview(s, period, 'r');
  assert.equal(r.dataCoverage.wellbeingDays, 1); assert.equal(r.dataCoverage.missingWellbeingDays, 13);
  assert.equal(r.tests.records[0]!.results['squat-control'], 'limited');
  assert.equal(r.wellbeing[0]!.sleep, 'poor'); assert.equal(r.photos.manifest[0]!.id, 'photo');
  assert.doesNotMatch(JSON.stringify(r), /file:\/\/|sensitive.jpg|base64/);
});
test('mock implements provider contract, is deterministic, labelled and only cites supplied facts', async () => {
  const s = snapshot(); s.profile!.bodyMeasurements = [measurement()];
  const input = buildWeeklyReview(s, period, 'r'); const original = structuredClone(input); const provider: AIProvider = new MockAIProvider();
  const first = await provider.analyzeProgress(input, { allowNetwork: false });
  assert.deepEqual(await provider.analyzeProgress(input, { allowNetwork: true }), first); assert.deepEqual(input, original);
  assert.equal(first.ok, true); if (!first.ok) return;
  assert.equal(first.provenance.mode, 'mock'); assert.match(first.data.summary, /DEVELOPMENT MOCK/);
  assert(first.data.claims.every((c) => c.type === 'FACT' && c.evidenceIds.every((id) => input.facts.some((f) => f.id === id))));
  assert.deepEqual(first.data.proposedChanges, []);
});
test('mock handles empty data, cancellation and replacement without suggesting a plan change', async () => {
  const provider = new MockAIProvider(); const input = buildWeeklyReview(snapshot(), period, 'empty');
  const result = await provider.analyzeProgress(input, { allowNetwork: false }); assert(result.ok && result.data.status === 'insufficient_evidence');
  const c = new AbortController(); c.abort(); const cancelled = await provider.analyzeProgress(input, { allowNetwork: false, signal: c.signal }); assert(!cancelled.ok && cancelled.error.code === 'cancelled');
  const replacement = await provider.suggestExerciseReplacement({ contractVersion: 'exercise-replacement.v1', requestId: 'r', currentExerciseId: 'wall-pushup', eligibleExerciseIds: [], evidence: [], safetyHold: true }, { allowNetwork: false });
  assert(replacement.ok && replacement.data.proposedChanges.length === 0);
});
test('AI foundation has no network client, provider SDK, random output or clock-dependent mock', async () => {
  const oldFetch = globalThis.fetch; globalThis.fetch = () => { throw new Error('Network forbidden'); };
  try { const p = new MockAIProvider(); await p.analyzeProgress(buildWeeklyReview(snapshot(), period, 'r'), { allowNetwork: true }); }
  finally { globalThis.fetch = oldFetch; }
  for (const file of ['aiContracts.ts', 'weeklyReview.ts', 'mockAIProvider.ts']) {
    const source = readFileSync(new URL(`../src/domain/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|https:\/\/|from ['"](?:openai|@google|@anthropic|axios|node:https)/);
  }
  assert.doesNotMatch(readFileSync(new URL('../src/domain/mockAIProvider.ts', import.meta.url), 'utf8'), /Math.random|Date.now|new Date/);
  assert(!readdirSync(new URL('../src/domain', import.meta.url)).some((name) => /^(openai|deepseek|gemini|claude)Provider/i.test(name)));
});
