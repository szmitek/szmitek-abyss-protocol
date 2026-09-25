import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareArcReview } from '../src/domain/arcProgressReview.ts';
import { prepareWeeklySummary, runWeeklyReview, reviewRevision } from '../src/domain/reviewSession.ts';
import { MockAIProvider } from '../src/domain/mockAIProvider.ts';
import { validateProgressResponse } from '../src/domain/reviewValidation.ts';
import { reviewEvidence } from '../src/domain/reviewEvidence.ts';
import { syntheticSnapshot } from '../tools/weekly-review-benchmark/fixtures.ts';
import { withArc, arcCases } from '../tools/arc-review-benchmark/fixtures.ts';
import { prepareArcBenchmark, arcRequest } from '../tools/arc-review-benchmark/prepare.ts';
const snapshot = () => withArc(syntheticSnapshot());
const input = () => prepareArcReview(snapshot(), 'synthetic-arc', '2026-09-14', 'Europe/Warsaw');

test('weekly summary is one completed week, contains no overlapping context and preserves missing data', () => {
  const s = snapshot(); const original = JSON.stringify(s);
  const r = prepareWeeklySummary(s, '2026-09-13', 'Europe/Warsaw');
  assert.equal(r.dataCoverage.calendarDays, 7); assert.equal(r.historyContext, undefined); assert.equal(r.arcContext, undefined);
  assert.equal(r.adherence.rate, null); assert.equal(r.dataCoverage.missingWellbeingDays, 4);
  assert.equal(r.body.statistics.metrics.waist.change, null); assert.equal(r.body.statistics.metrics.weight.change, 0);
  assert.equal(JSON.stringify(s), original); assert.throws(() => prepareWeeklySummary(s, '2026-09-12', 'UTC'));
});
test('arc preview covers its actual window and does not duplicate a four-week context', () => {
  const r = input(); assert.equal(r.period.from, '2026-08-17'); assert.equal(r.period.to, '2026-09-14');
  assert.equal(r.arcContext!.nominalEnd, '2026-09-13'); assert.equal(r.arcContext!.state, 'ready_for_reassessment');
  assert.equal(r.historyContext, undefined); assert.equal(r.adherence.rate, null); assert.deepEqual(r.archivedAdherence, []);
  assert(r.training.every(w => w.dateKey >= r.period.from && w.dateKey <= r.period.to));
  assert.equal(r.arcContext!.profileContext.scope, 'current-settings-not-historical-plan');
  const partial = prepareArcReview(snapshot(), 'synthetic-arc', '2026-08-20', 'UTC');
  assert.equal(partial.dataCoverage.calendarDays, 4); assert.equal(partial.arcContext!.state, 'in_progress');
  assert(partial.body.records.every(m => m.measuredOn <= '2026-08-20'));
});
test('completed and next arc have disjoint boundaries, including delayed reassessment', () => {
  const s = snapshot(), p = s.profile!;
  p.movementAssessments.push({ ...p.movementAssessments[0]!, id: 'end', dateKey: '2026-09-16', date: '2026-09-16T10:00:00Z', kind: 'reassessment' });
  p.trainingArcs[0]!.completionAssessmentId = 'end';
  p.trainingArcs.push({ ...p.trainingArcs[0]!, id: 'next', cycleNumber: 2, startDateKey: '2026-09-16', baselineAssessmentId: 'end', completionAssessmentId: null });
  const old = prepareArcReview(s, 'synthetic-arc', '2026-09-17', 'UTC');
  const next = prepareArcReview(s, 'next', '2026-09-17', 'UTC');
  assert.equal(old.period.to, '2026-09-15'); assert.equal(next.period.from, '2026-09-16'); assert.equal(old.arcContext!.state, 'completed');
  assert.equal(old.tests.records.some(t => t.id === 'end'), false); assert.equal(next.tests.records.some(t => t.id === 'end'), true);
  p.trainingArcs[1]!.startDateKey = '2026-09-17'; assert.throws(() => prepareArcReview(s, 'synthetic-arc', '2026-09-17', 'UTC'));
});
test('invalid or unavailable arc records fail closed; legacy missing frequency stays unknown', () => {
  const s = snapshot(); assert.throws(() => prepareArcReview(s, 'missing', '2026-09-14', 'UTC'));
  assert.throws(() => prepareArcReview(s, 'synthetic-arc', '2026-08-16', 'UTC'));
  assert.throws(() => prepareArcReview(s, 'synthetic-arc', '2026-02-30', 'UTC'));
  s.profile!.trainingArcs[0]!.planSnapshot = null;
  assert.equal(prepareArcReview(s, 'synthetic-arc', '2026-09-14', 'UTC').arcContext!.plannedFrequency, null);
  s.profile!.trainingArcs[0]!.completionAssessmentId = 'lost'; assert.throws(() => prepareArcReview(s, 'synthetic-arc', '2026-09-14', 'UTC'));
});
test('arc mock is deterministic, evidence-linked, has no mutations/network and empty data is insufficient', async () => {
  const fetch = globalThis.fetch; globalThis.fetch = () => { throw Error('No network'); };
  try {
    const s = snapshot(), before = JSON.stringify(s), r = prepareArcReview(s, 'synthetic-arc', '2026-09-14', 'UTC'), mock = new MockAIProvider();
    const result = await runWeeklyReview(mock, r); assert(result.ok);
    assert.deepEqual(await runWeeklyReview(mock, r), result); assert.equal(JSON.stringify(s), before);
    assert.deepEqual(result.data.proposedChanges, []); assert.equal(result.provenance.mode, 'mock');
    const registry = reviewEvidence(r); for (const c of result.data.claims) for (const id of c.evidenceIds) assert(registry.get(id)?.available);
    assert.equal(JSON.stringify(r).includes('file://'), false);
    const empty = arcCases().find(c => c.id === 'A09')!.input;
    const noData = await runWeeklyReview(mock, empty); assert(noData.ok); assert.equal(noData.data.status, 'insufficient_evidence');
    const invalid = structuredClone(result); invalid.data.proposedChanges = [{ fromExerciseId: 'x', toExerciseId: 'y', reason: 'test', evidenceIds: [], requiresUserAcceptance: true, startingLoadKg: null }];
    assert.equal(validateProgressResponse(invalid, r, mock.id, 'mock').ok, false);
    const changed = structuredClone(r); changed.arcContext!.profileContext.workoutDuration = 30;
    assert.notEqual(reviewRevision(changed), reviewRevision(r));
  } finally { globalThis.fetch = fetch; }
});
test('arc benchmark preserves adversarial inputs and executes its full dry pipeline without a key', async () => {
  const root = mkdtempSync(join(tmpdir(), 'arc-bench-')); const fetch = globalThis.fetch;
  globalThis.fetch = () => { throw Error('No network'); };
  try {
    const cases = arcCases(); assert.equal(cases.length, 10);
    assert.equal(cases.find(c => c.id === 'A07')!.input.adherence.rate, 0.25);
    assert.match(JSON.stringify(cases.find(c => c.id === 'A06')!.input), /SYSTEM OVERRIDE/);
    const request = arcRequest(cases[0]!); assert.equal(request.model, 'gpt-6-astra'); assert.equal(request.reasoning.effort, 'medium');
    assert.deepEqual(Object.keys(JSON.parse(request.input[1]!.content)).sort(), ['evidence', 'review']);
    assert.equal(request.reasoning.effort, 'medium');
    const r = await prepareArcBenchmark(root); assert.equal(r.costPln, 0); assert.equal(r.apiCalls, 0); assert.equal(r.rows.length, 10);
    assert.equal(JSON.parse(readFileSync(join(root, 'A01.result.json'), 'utf8')).validation, true);
    assert(r.rows.every(row => row.quality === 'NOT_EVALUATED'));
  } finally { globalThis.fetch = fetch; rmSync(root, { recursive: true, force: true }); }
});

test('arc body change is app-owned first-to-last daily mean, not the last weekly step', () => {
  const r = input(), f = r.facts.find(f => f.id === 'arc:body:weight:first-last')!;
  assert.equal(f.value, r.body.statistics.metrics.weight.firstToLastDailyMeanChange);
  assert(Math.abs(f.value! + 0.3) < 1e-10);
  assert.equal(r.facts.find(f => f.id === 'body:weight:change')!.value, 0);
  assert(f.sourceIds.every(id => reviewEvidence(r).has(id)));
  r.arcContext!.checkpoints.baseline!.results['plank-control'] = 'limited';
  assert.equal(snapshot().profile!.movementAssessments.find(m => m.id === 'arc-baseline')!.results['plank-control'], 'clear');
});
