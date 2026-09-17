import assert from 'node:assert/strict';
import test from 'node:test';
import { CAPTURE_VIEWS, POSTURE_VIEWS, type AppSnapshot, type PosturePhotoMap, type PostureScan } from '../src/domain/types.ts';
import { createProfile, INITIAL_SNAPSHOT, recordMovementAssessment } from '../src/domain/profile.ts';
import { comparisonViews, createPostureScan, evidenceNotes, recordPostureScan, removePostureScan, scanPhotos } from '../src/domain/postureArchive.ts';
import { assertValidSnapshot } from '../src/domain/snapshotValidation.ts';
import { decodeSnapshot } from '../src/domain/persistence.ts';
import { backupChecksum, createBackup, parseBackup, prepareBackupRestore } from '../src/domain/backup.ts';
import { parsePendingPosturePhoto } from '../src/domain/pendingPosturePhoto.ts';

const base = createProfile({ goal: 'general-fitness', experienceLevel: 'beginner', workoutDuration: 20, workoutsPerWeek: 3, availableEquipment: ['none'] });
const clear = { 'squat-control': 'clear', 'overhead-reach': 'clear', 'hip-hinge': 'clear', 'single-leg-balance': 'clear', 'plank-control': 'clear' } as const;
const start = new Date('2026-09-01T10:00:00Z');
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
function scan(legacy = false, now = start, id = 'photo-1'): PostureScan {
  const photos = Object.fromEntries((legacy ? POSTURE_VIEWS : CAPTURE_VIEWS).map((view) => [view, {
    view, uri: `file:///${id}-${view}.png`, width: 1080, height: 1440, source: 'library', capturedAt: now.toISOString(),
    ...(!legacy ? { originalCapturedAt: null } : {}),
  }])) as PosturePhotoMap;
  return { ...createPostureScan(base, photos, now, id), ...(!legacy ? { protocol: 'four-view-v1' as const, setupConfirmedAt: now.toISOString() } : {}) };
}
const snapshot = (scans: PostureScan[]): AppSnapshot => ({ ...INITIAL_SNAPSHOT, onboardingComplete: true, profile: { ...base, postureScans: scans } });

test('legacy migration preserves unspecified side and never invents capture dates or links', () => {
  const before = snapshot([scan(true)]);
  const after = decodeSnapshot(JSON.stringify({ ...before, schemaVersion: 15 }));
  assert.deepEqual(after.profile!.postureScans, before.profile!.postureScans);
  assert.equal(after.schemaVersion, 17);
  assert.deepEqual(comparisonViews(scan(true), scan()), ['front', 'back']);
  assert.deepEqual(comparisonViews(scan(true), scan(true)), ['front', 'back']);
  assert.deepEqual(comparisonViews(scan(), scan()), ['front', 'left', 'right', 'back']);
  assert.ok(evidenceNotes(scan(true)).some((s) => s.includes('unknown')));
});

test('four-view validation rejects incomplete, mixed, mislabeled and unconfirmed evidence', () => {
  assert.doesNotThrow(() => assertValidSnapshot(snapshot([scan()])));
  const cases: ((s: PostureScan) => void)[] = [
    (s) => { delete s.photos.left; }, (s) => { s.photos.side = { ...s.photos.front, view: 'side' }; },
    (s) => { s.photos.left!.view = 'right'; }, (s) => { delete s.setupConfirmedAt; },
    (s) => { s.photos.front.originalCapturedAt = '2026-09-02T10:00:00Z'; },
    (s) => { delete s.photos.front.originalCapturedAt; }, (s) => { s.movementAssessmentId = 'missing'; },
    (s) => { s.photos.front.width = 0; },
  ];
  for (const change of cases) { const value = scan(); change(value); assert.throws(() => assertValidSnapshot(snapshot([value]))); }
});

test('legacy and four-view Vault photos round-trip together without losing side identity', async () => {
  const value = snapshot([scan(), scan(true, start, 'legacy')]);
  const backup = await createBackup(value, true, async () => png);
  assert.equal(backup.payload.photos.length, 7);
  const restored = await prepareBackupRestore(backup, 'safe', async (id, view) => `file:///${id}/${view}.png`);
  assertValidSnapshot(restored);
  assert.deepEqual(scanPhotos(restored.profile!.postureScans[0]!).map((p) => p.view), ['front', 'left', 'right', 'back']);
  assert.deepEqual(scanPhotos(restored.profile!.postureScans[1]!).map((p) => p.view), ['front', 'side', 'back']);
  assert.equal(restored.profile!.postureScans[0]!.photos.front.originalCapturedAt, null);
});

test('v11 through v15 Vault imports verify old checksums before migration', async () => {
  const backup = await createBackup(snapshot([scan(true)]), true, async () => png);
  for (const version of [11, 12, 13, 14, 15]) {
    const raw = JSON.parse(JSON.stringify(backup)); raw.payload.snapshot.schemaVersion = version;
    raw.checksum = backupChecksum(JSON.stringify(raw.payload));
    const restored = parseBackup(JSON.stringify(raw));
    assert.equal(restored.payload.snapshot.schemaVersion, 17);
    assert.equal(restored.payload.snapshot.profile!.postureScans[0]!.photos.side!.view, 'side');
    raw.payload.snapshot.profile.level = 99;
    assert.throws(() => parseBackup(JSON.stringify(raw)), /integrity/);
  }
});

test('only explicitly completed checks link evidence; stale and duplicate links fail', () => {
  const profile = recordPostureScan(base, scan());
  assert.equal(profile.postureScans[0]!.movementAssessmentId, undefined);
  const withoutLink = recordMovementAssessment(profile, clear, 'baseline', [], new Date('2026-09-01T10:10:00Z'));
  assert.equal(withoutLink.postureScans[0]!.movementAssessmentId, undefined);
  const linked = recordMovementAssessment(profile, clear, 'baseline', [], new Date('2026-09-01T10:10:00Z'), 'photo-1');
  assert.equal(linked.postureScans[0]!.movementAssessmentId, linked.movementAssessments[0]!.id);
  assertValidSnapshot({ ...snapshot([]), profile: linked });
  for (const date of ['2026-08-31T10:00:00Z', '2026-09-02T10:00:00Z']) assert.throws(() => recordMovementAssessment(profile, clear, 'baseline', [], new Date(date), 'photo-1'));
  assert.throws(() => recordMovementAssessment(linked, clear, 'reassessment', [], new Date('2026-09-01T10:11:00Z'), 'photo-1'));
  assert.throws(() => recordMovementAssessment(profile, clear, 'baseline', [], start, 'missing'));
});

test('cycle review uses actual baseline and final assessment links; deletion and data-only Vault clear references', async () => {
  let profile = recordPostureScan(base, scan());
  profile = recordMovementAssessment(profile, clear, 'baseline', [], new Date('2026-09-01T10:10:00Z'), 'photo-1');
  profile = recordPostureScan(profile, scan(false, new Date('2026-09-29T10:00:00Z'), 'photo-2'));
  profile = recordMovementAssessment(profile, clear, 'reassessment', [], new Date('2026-09-29T10:10:00Z'), 'photo-2');
  const review = profile.trainingArcReviews[0]!;
  assert.equal(review.baselinePostureScanId, 'photo-1'); assert.equal(review.completionPostureScanId, 'photo-2');
  const value = { ...snapshot([]), profile };
  assertValidSnapshot(value);
  const withPhotos = await createBackup(value, true, async () => png);
  const restored = await prepareBackupRestore(withPhotos, 'linked', async (id, view) => `file:///${id}/${view}.png`);
  assertValidSnapshot(restored);
  assert.equal(restored.profile!.postureScans[0]!.movementAssessmentId, profile.postureScans[0]!.movementAssessmentId);
  const removed = removePostureScan(profile, 'photo-1');
  assert.equal(removed.trainingArcReviews[0]!.baselinePostureScanId, null);
  const dataOnly = await createBackup(value, false, async () => { throw new Error('Do not read photos'); });
  assert.equal(dataOnly.payload.snapshot.profile!.postureScans.length, 0);
  assert.equal(dataOnly.payload.snapshot.profile!.trainingArcReviews[0]!.completionPostureScanId, null);
});

test('interrupted picker accepts both new sides while rejecting another profile and expired requests', () => {
  for (const view of ['left', 'right', 'side']) {
    const raw = JSON.stringify({ view, source: 'camera', profileId: base.id, requestedAt: start.toISOString() });
    assert.equal(parsePendingPosturePhoto(raw, base.id, start)?.view, view);
    assert.equal(parsePendingPosturePhoto(raw, 'other', start), null);
    assert.equal(parsePendingPosturePhoto(raw, base.id, new Date('2026-09-03T10:00:00Z')), null);
  }
});
