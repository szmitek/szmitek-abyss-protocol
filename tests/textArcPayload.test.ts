import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareTextArcPayload } from '../tools/arc-review-benchmark/textPayload.ts';
import { prepareTextArcPreview } from '../src/domain/textArcPreview.ts';
import type { WeeklyReviewInput } from '../src/domain/aiContracts.ts';

function fixture(): WeeklyReviewInput {
  return {
    contractVersion: 'weekly-review.v1', requestId: 'arc:test:2026-10-31', locale: 'en',
    period: { from: '2026-10-01', to: '2026-10-31', timeZone: 'Europe/Warsaw', bounds: 'inclusive-local-dates' },
    facts: [], training: [], exerciseExposures: [],
    adherence: { completedTrainingSessions: 0, activeDays: 0, plannedSessions: null, rate: null, reason: 'No history' },
    archivedAdherence: [], wellbeing: [], tests: { method: 'self-report', records: [] },
    body: { records: [], statistics: { measuredDays: 0, metrics: {} } as WeeklyReviewInput['body']['statistics'] },
    dataCoverage: { calendarDays: 31, wellbeingDays: 0, missingWellbeingDays: 31, measurementDays: 0, missingActualSets: 0 },
    photos: { status: 'no_pixels_attached', localAnalysis: 'not_run', manifest: [{ id: 'private-photo', recordedOn: '2026-10-01', protocol: null, views: ['front'] }] },
    constraints: { mayModifyPlan: false, mayDiagnose: false, mayEstimateBodyComposition: false },
    arcContext: { contractVersion: 'arc-review-context.v1', arcId: 'a', cycleNumber: 1,
      state: 'completed', checkpoints: { baseline: null, completion: null },
      nominalEnd: '2026-10-28', actualEnd: '2026-10-31', plannedFrequency: null,
      profileContext: { scope: 'current-settings-not-historical-plan', goal: 'general-fitness', experienceLevel: 'beginner',
        workoutDuration: 20, availableEquipment: ['none'] }, limitations: [] } as NonNullable<WeeklyReviewInput['arcContext']>,
  };
}
test('detached text payload strips photo manifest and keeps local input unchanged', () => {
  const original = fixture();
  const payload = prepareTextArcPayload(original);
  assert.equal(payload.input.photos.manifest.length, 0);
  assert.equal(original.photos.manifest[0]?.id, 'private-photo');
  assert.equal(payload.canonicalJson.includes('private-photo'), false);
  payload.input.requestId = 'mutated';
  assert.equal(original.requestId, 'arc:test:2026-10-31');
});
test('canonical encoding and digest are independent of object key insertion order', () => {
  const a = fixture(), b = fixture();
  b.adherence = Object.fromEntries(Object.entries(b.adherence).reverse()) as typeof b.adherence;
  assert.equal(prepareTextArcPayload(a).sha256, prepareTextArcPayload(b).sha256);
  assert.equal(prepareTextArcPayload(a).canonicalJson, prepareTextArcPayload(b).canonicalJson);
});
test('changed source data changes the digest', () => {
  const a = fixture(), b = fixture();
  b.requestId = 'arc:other';
  assert.notEqual(prepareTextArcPayload(a).sha256, prepareTextArcPayload(b).sha256);
});
test('weekly-only, history contexts and unsafe constraints cannot enter arc transport', () => {
  const a = fixture(); delete a.arcContext;
  assert.throws(() => prepareTextArcPayload(a));
  const b = fixture(); b.historyContext = {} as NonNullable<WeeklyReviewInput['historyContext']>;
  assert.throws(() => prepareTextArcPayload(b));
  const c = fixture(); (c.constraints as { mayDiagnose: boolean }).mayDiagnose = true;
  assert.throws(() => prepareTextArcPayload(c));
});
test('local image paths and embedded image data fail closed', () => {
  const a = fixture(); a.arcContext!.limitations = ['file:///private/image.jpg'];
  assert.throws(() => prepareTextArcPayload(a));
  const b = fixture(); b.adherence.reason = 'data:image/png;base64,abc';
  assert.throws(() => prepareTextArcPayload(b));
});
test('unknown fields and excess text are rejected before any network call', () => {
  const a = fixture() as WeeklyReviewInput & { unexpected?: string };
  a.unexpected = 'secret';
  assert.throws(() => prepareTextArcPayload(a));
  const b = fixture(); b.adherence.reason = 'x'.repeat(270000);
  assert.throws(() => prepareTextArcPayload(b));
});

test('mobile offline preview is byte-identical to developer digest input', () => {
  const input = fixture();
  input.adherence.reason = 'Postęp: zażółć gęślą jaźń 💪';
  const mobile = prepareTextArcPreview(input);
  const developer = prepareTextArcPayload(input);
  assert.equal(mobile.canonicalJson, developer.canonicalJson);
  assert.equal(mobile.byteLength, Buffer.byteLength(developer.canonicalJson, 'utf8'));
  assert.equal(mobile.input.photos.manifest.length, 0);
  assert.equal(mobile.canonicalJson.includes('private-photo'), false);
});
test('mobile preview rejects extra photo fields even when original manifest would be stripped', () => {
  const input = fixture();
  (input.photos as typeof input.photos & { imageUri?: string }).imageUri = 'file:///private.jpg';
  assert.throws(() => prepareTextArcPreview(input));
});
test('nested image fields cannot enter the displayed canonical request', () => {
  const input = fixture();
  (input.body as typeof input.body & { pixels?: string }).pixels = 'some raw image bytes';
  assert.throws(() => prepareTextArcPreview(input));
});
test('editing existing source observations produces a different offline request', () => {
  const before = fixture();
  const after = fixture();
  after.adherence.reason = 'One additional local note';
  assert.notEqual(prepareTextArcPreview(before).canonicalJson, prepareTextArcPreview(after).canonicalJson);
});
