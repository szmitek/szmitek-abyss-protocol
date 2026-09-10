import assert from 'node:assert/strict';
import test from 'node:test';

import { backupChecksum, createBackup, MAX_BACKUP_BYTES, parseBackup, prepareBackupRestore, type BackupFile } from '../src/domain/backup.ts';
import { generateWorkout } from '../src/domain/generator.ts';
import { createSnapshotRepository, decodeSnapshot, RECOVERY_KEY, STORAGE_KEY, type SnapshotStorage } from '../src/domain/persistence.ts';
import { createPostureScan, recordPostureScan } from '../src/domain/postureArchive.ts';
import { createProfile, INITIAL_SNAPSHOT, recordMovementAssessment, updateCorrectiveProfile } from '../src/domain/profile.ts';
import { refreshDailyQuest } from '../src/domain/questState.ts';
import { createDailyReadiness, recordDailyReadiness } from '../src/domain/readiness.ts';
import { assertValidSnapshot } from '../src/domain/snapshotValidation.ts';
import { POSTURE_VIEWS, type AppSnapshot, type PosturePhotoMap } from '../src/domain/types.ts';

const clear = { 'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear' } as const;
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const noPhotos = async () => { throw new Error('Photos must not be read'); };
const resign = (file: BackupFile) => JSON.stringify({ ...file, checksum: backupChecksum(JSON.stringify(file.payload)) });

function richSnapshot(): AppSnapshot {
  let profile = recordMovementAssessment(createProfile({ goal: 'strength', experienceLevel: 'beginner', workoutDuration: 20, workoutsPerWeek: 3, availableEquipment: ['none'] }), clear, 'baseline', [], new Date('2026-08-01T12:00:00Z'));
  profile = updateCorrectiveProfile(profile, { configured: true, targets: [{ goal: 'pelvic-control', priority: 'primary', sources: ['self-observation'] }], updatedAt: null }, new Date('2026-08-02T12:00:00Z'));
  const photos = Object.fromEntries(POSTURE_VIEWS.map((view) => [view, { view, uri: `file:///private/posture-archive/old/${view}.png`, width: 1, height: 1, source: 'camera', capturedAt: '2026-08-01T12:00:00Z' }])) as PosturePhotoMap;
  profile = recordPostureScan(profile, createPostureScan(profile, photos, new Date('2026-08-01T12:00:00Z'), 'old-scan'));
  profile = recordMovementAssessment(profile, clear, 'reassessment', [], new Date('2026-08-29T12:00:00Z'));
  profile = recordDailyReadiness(profile, createDailyReadiness({ energy: 'stable', sleep: 'good', soreness: 'none', soreMuscles: [], painOrWarning: false }, new Date('2026-08-29T13:00:00Z')));
  profile.trainingArcReviews[0]!.baselinePostureScanId = 'old-scan';
  const stats = { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 };
  return { ...INITIAL_SNAPSHOT, onboardingComplete: true, profile, pendingArcReviewId: profile.trainingArcReviews[0]!.id, history: [{
    id: 'completed-1', date: '2026-08-10T10:00:00Z', dateKey: '2026-08-10', planId: 'daily-2026-08-10', title: 'EARLIER QUEST',
    completed: true, difficulty: 1, perceivedDifficulty: 'perfect', durationSeconds: 900, xpEarned: 100, attributeXpEarned: { ...stats, strength: 18 }, statGains: stats,
    results: [{ exerciseId: 'wall-pushup', completedSets: 2, targetPerSet: 10, completedVolume: 20 }],
  }] };
}

function memoryStorage(initial: string | null) {
  const values = new Map<string, string>(initial === null ? [] : [[STORAGE_KEY, initial]]);
  const writes: string[] = [];
  const storage: SnapshotStorage = { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { writes.push(key); values.set(key, value); } };
  return { values, writes, storage };
}

test('data-only backup round-trip preserves Player signals, reports and pending directives without reading or leaking photo paths', async () => {
  const snapshot = richSnapshot();
  const original = structuredClone(snapshot);
  const backup = await createBackup(snapshot, false, noPhotos, new Date('2026-08-29T14:00:00Z'));
  const encoded = JSON.stringify(backup);
  assert.equal(encoded.includes('file:///'), false);
  const restored = await prepareBackupRestore(parseBackup(encoded), 'first', async () => { throw new Error('No photo writes expected'); });
  assert.deepEqual(restored.profile?.healthProfile, snapshot.profile?.healthProfile);
  assert.deepEqual(restored.profile?.trainingArcs, snapshot.profile?.trainingArcs);
  assert.deepEqual(restored.profile?.correctiveHistory, snapshot.profile?.correctiveHistory);
  assert.deepEqual(restored.history, snapshot.history);
  assert.equal(restored.pendingArcReviewId, snapshot.pendingArcReviewId);
  assert.deepEqual(restored.profile?.postureScans, []);
  assert.equal(restored.profile?.trainingArcReviews[0]?.baselinePostureScanId, null);
  assert.equal(refreshDailyQuest(restored, '2026-08-29').dailyQuest?.plan.kind, 'directive-review');
  assert.deepEqual(snapshot, original);
});

test('photo backup remaps isolated files and archived references on every restore', async () => {
  const backup = await createBackup(richSnapshot(), true, async () => png);
  assert.equal(backup.payload.photos.length, 3);
  assert.equal(JSON.stringify(backup).includes('file:///'), false);
  const writes: string[] = [];
  const write = async (scan: string, view: string) => { const uri = `file:///private/${scan}/${view}.png`; writes.push(uri); return uri; };
  const first = await prepareBackupRestore(backup, 'one', write);
  const second = await prepareBackupRestore(backup, 'two', write);
  assert.equal(new Set(writes).size, 6);
  assert.notEqual(first.profile?.postureScans[0]?.id, second.profile?.postureScans[0]?.id);
  assert.equal(first.profile?.trainingArcReviews[0]?.baselinePostureScanId, first.profile?.postureScans[0]?.id);
  assert.ok(first.profile?.postureScans[0]?.photos.front.uri.includes('restore-one-0'));
  assert.equal(backup.payload.snapshot.profile?.postureScans[0]?.id, 'old-scan');
});

test('restored health warnings still seal training and invalidate an old cached protocol', async () => {
  const snapshot = richSnapshot();
  snapshot.profile!.healthProfile = { ...snapshot.profile!.healthProfile, painAreas: ['knees'], safetySignals: ['acute-injury'], knownConditions: 'Player-entered condition' };
  const backup = await createBackup(snapshot, false, noPhotos);
  const restored = await prepareBackupRestore(backup, 'held', async () => 'unused');
  const fresh = refreshDailyQuest(restored, '2026-08-29');
  assert.deepEqual(fresh.profile?.healthProfile, snapshot.profile?.healthProfile);
  assert.equal(fresh.dailyQuest?.plan.kind, 'safety-hold');
  assert.equal(fresh.weeklyProtocol, null);
});

test('invalid checksum, future versions, oversized files and unsafe JSON are rejected', async () => {
  const backup = await createBackup(richSnapshot(), false, noPhotos);
  const changed = structuredClone(backup); changed.payload.snapshot.profile!.level += 1;
  assert.throws(() => parseBackup(JSON.stringify(changed)), /integrity/);
  assert.throws(() => parseBackup(JSON.stringify({ ...backup, version: 99 })), /version/);
  assert.throws(() => parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1)), /24 MB/);
  assert.throws(() => parseBackup('{"__proto__":{}}'), /readable/);
  assert.throws(() => parseBackup('{bad json'), /readable/);
});

test('even a recomputed checksum cannot conceal malformed Player data or forged readiness', async () => {
  const base = await createBackup(richSnapshot(), false, noPhotos);
  const changes: Array<(file: BackupFile) => void> = [
    (b) => { b.payload.snapshot.profile!.workoutsPerWeek = 0 as 3; },
    (b) => { b.payload.snapshot.profile!.xp = -1; },
    (b) => { b.payload.snapshot.profile!.availableEquipment = ['imaginary' as 'none']; },
    (b) => { b.payload.snapshot.profile!.movementAssessments.push(b.payload.snapshot.profile!.movementAssessments[0]!); },
    (b) => { b.payload.snapshot.profile!.trainingArcs[0]!.baselineAssessmentId = 'missing'; },
    (b) => { b.payload.snapshot.profile!.readinessLog[0]!.painOrWarning = true; },
    (b) => { b.payload.snapshot.profile!.correctiveProfile.targets[0]!.sources = null as never; },
    (b) => { b.payload.snapshot.pendingArcReviewId = 'missing'; },
  ];
  for (const change of changes) { const file = structuredClone(base); change(file); assert.throws(() => parseBackup(resign(file)), /Invalid/); }
});

test('external paths, missing photos, duplicate blobs and unsupported image bytes cannot reach file writes', async () => {
  const base = await createBackup(richSnapshot(), true, async () => png);
  const changes: Array<(file: BackupFile) => void> = [
    (b) => { b.payload.snapshot.profile!.postureScans[0]!.photos.front.uri = 'file:///private/secret'; },
    (b) => { b.payload.snapshot.profile!.postureScans[0]!.photos.front.uri = 'https://example.com/photo'; },
    (b) => { b.payload.photos.pop(); },
    (b) => { b.payload.photos[1]!.key = b.payload.photos[0]!.key; },
    (b) => { b.payload.photos[0]!.base64 = Buffer.from('<svg>unsafe</svg>').toString('base64'); },
  ];
  for (const change of changes) {
    const file = structuredClone(base); change(file); file.checksum = backupChecksum(JSON.stringify(file.payload));
    let writes = 0;
    await assert.rejects(prepareBackupRestore(file, 'test', async () => { writes += 1; return 'unused'; }));
    assert.equal(writes, 0);
  }
});

test('active workout is preserved locally and cannot be silently discarded by export', async () => {
  const snapshot = richSnapshot();
  const plan = generateWorkout(createProfile({ goal: 'strength', experienceLevel: 'beginner', workoutDuration: 20, workoutsPerWeek: 3, availableEquipment: ['none'] }), [], '2026-08-29');
  snapshot.pendingArcReviewId = null;
  snapshot.activeWorkout = { questId: 'active', plan, exerciseIndex: 1, completedSets: plan.exercises.map((_, i) => i === 0 ? 1 : 0), startedAt: '2026-08-29T13:00:00Z' };
  assertValidSnapshot(snapshot);
  assert.deepEqual(decodeSnapshot(JSON.stringify(snapshot)).activeWorkout, snapshot.activeWorkout);
  await assert.rejects(createBackup(snapshot, false, noPhotos), /active workout/);
});

test('unreadable or unsupported local data throws without writing an empty Player', async () => {
  for (const raw of ['', '{bad json', '{"schemaVersion":99}', '{"schemaVersion":11,"profile":{}}']) {
    const memory = memoryStorage(raw);
    await assert.rejects(createSnapshotRepository(memory.storage).load());
    assert.deepEqual(memory.writes, []);
    assert.equal(memory.values.get(STORAGE_KEY), raw);
  }
  assert.deepEqual(await createSnapshotRepository(memoryStorage(null).storage).load(), INITIAL_SNAPSHOT);
});

test('legacy local records migrate without resetting progress or pending arc review', () => {
  const current = richSnapshot();
  const old = JSON.parse(JSON.stringify(current)); old.schemaVersion = 10;
  for (const arc of old.profile.trainingArcs) delete arc.directiveReviewedAt;
  const decoded = decodeSnapshot(JSON.stringify(old));
  assert.deepEqual(decoded, current);
  const first = JSON.parse(JSON.stringify(current)); first.schemaVersion = 1;
  for (const key of ['attributeXp', 'activeTrainingWeeks', 'healthProfile', 'correctiveProfile', 'correctiveHistory', 'movementAssessments', 'trainingArcs', 'trainingArcReviews', 'postureScans', 'readinessLog']) delete first.profile[key];
  first.pendingArcReviewId = null; first.profile.strength = 7;
  assert.equal(decodeSnapshot(JSON.stringify(first)).profile?.strength, 7);
});

test('queued saves cannot overwrite a later import and the recovery slot retains the latest saved Player', async () => {
  const before = richSnapshot(); const after = structuredClone(before); after.profile!.level = 9;
  const memory = memoryStorage(JSON.stringify(before));
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const nativeSet = memory.storage.setItem; let first = true;
  memory.storage.setItem = async (key, value) => { if (first) { first = false; await blocked; } await nativeSet(key, value); };
  const repo = createSnapshotRepository(memory.storage);
  const latest = structuredClone(before); latest.profile!.xp = 500;
  const save = repo.save(latest); const restore = repo.replace(after);
  release(); await Promise.all([save, restore]);
  assert.equal((await repo.load()).profile?.level, 9);
  assert.equal((await repo.loadRecovery()).profile?.xp, 500);
  assert.deepEqual(memory.writes, [STORAGE_KEY, RECOVERY_KEY, STORAGE_KEY]);
});

test('a failed save can be retried and does not poison the persistence queue', async () => {
  const before = richSnapshot(); const memory = memoryStorage(JSON.stringify(before));
  let fail = true; const nativeSet = memory.storage.setItem;
  memory.storage.setItem = async (key, value) => { if (fail) { fail = false; throw new Error('disk full'); } await nativeSet(key, value); };
  const repo = createSnapshotRepository(memory.storage); const next = structuredClone(before); next.profile!.xp = 600;
  await assert.rejects(repo.save(next), /disk full/);
  assert.deepEqual(await repo.load(), before);
  await repo.save(next); assert.deepEqual(await repo.load(), next);
});

test('restore cannot replace current data if preserving its recovery copy fails', async () => {
  const before = richSnapshot(); const memory = memoryStorage(JSON.stringify(before));
  const nativeSet = memory.storage.setItem;
  memory.storage.setItem = async (key, value) => { if (key === RECOVERY_KEY) throw new Error('recovery full'); await nativeSet(key, value); };
  const repo = createSnapshotRepository(memory.storage); const next = structuredClone(before); next.profile!.level = 10;
  await assert.rejects(repo.replace(next), /recovery full/);
  assert.deepEqual(await repo.load(), before);
  assert.deepEqual(memory.writes, []);
});

test('failed replacement retains the recovery save and local rollback restores it without consuming it', async () => {
  const before = richSnapshot(); const memory = memoryStorage(JSON.stringify(before));
  const nativeSet = memory.storage.setItem; let fail = true;
  memory.storage.setItem = async (key, value) => { if (key === STORAGE_KEY && fail) { fail = false; throw new Error('write failed'); } await nativeSet(key, value); };
  const repo = createSnapshotRepository(memory.storage); const next = structuredClone(before); next.profile!.level = 10;
  await assert.rejects(repo.replace(next));
  assert.deepEqual(await repo.loadRecovery(), before);
  await repo.save(next);
  assert.deepEqual(await repo.restoreRecovery(), before);
  assert.deepEqual(await repo.load(), before);
  assert.deepEqual(await repo.loadRecovery(), before);
});
