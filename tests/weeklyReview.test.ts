import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { AIProvider, AIResult, ProgressReview } from '../src/domain/aiContracts.ts';
import { createBodyMeasurement } from '../src/domain/bodyMeasurements.ts';
import { createProfile, INITIAL_SNAPSHOT } from '../src/domain/profile.ts';
import { MockAIProvider } from '../src/domain/mockAIProvider.ts';
import { reviewEvidence } from '../src/domain/reviewEvidence.ts';
import { latestCompletedReviewWeek, prepareWeeklyReview, reviewRevision, runWeeklyReview, shiftReviewDay } from '../src/domain/reviewSession.ts';
import { validateProgressResponse } from '../src/domain/reviewValidation.ts';
import type { AppSnapshot } from '../src/domain/types.ts';

function snapshot(): AppSnapshot {
  const profile = createProfile({ goal: 'strength', experienceLevel: 'beginner', workoutDuration: 20, workoutsPerWeek: 3, availableEquipment: ['none'] });
  profile.bodyMeasurements = [createBodyMeasurement('old', '2026-08-24', { weight: 80 }, new Date('2026-09-17T12:00:00Z')), createBodyMeasurement('recent', '2026-09-08', { weight: 79, waist: 92 }, new Date('2026-09-17T12:00:00Z'))];
  return { ...INITIAL_SNAPSHOT, profile, onboardingComplete: true };
}
const input = () => prepareWeeklyReview(snapshot(), '2026-09-13', 'Europe/Warsaw');
async function response() {
  const r = await new MockAIProvider().analyzeProgress(input(), { allowNetwork: false });
  assert(r.ok); return r;
}
test('completed calendar weeks handle Sunday, Monday, year rollover and DST without shifting dates', () => {
  assert.equal(latestCompletedReviewWeek('2026-09-13'), '2026-09-06');
  assert.equal(latestCompletedReviewWeek('2026-09-14'), '2026-09-13');
  assert.equal(latestCompletedReviewWeek('2026-01-01'), '2025-12-28');
  assert.equal(shiftReviewDay('2026-03-30', -7), '2026-03-23');
  assert.equal(shiftReviewDay('2026-10-26', -7), '2026-10-19');
  assert.throws(() => latestCompletedReviewWeek('2026-02-30'));
  assert.throws(() => prepareWeeklyReview(snapshot(), '2026-09-12', 'UTC'));
});
test('review uses real weekly records and separately scoped four-week context without manufacturing missing data', () => {
  const r = input(); assert.equal(r.period.from, '2026-09-07'); assert.equal(r.dataCoverage.calendarDays, 7);
  assert.equal(r.body.records.length, 1); assert.equal(r.historyContext!.body.records.length, 2);
  assert.equal(r.historyContext!.period.from, '2026-08-17'); assert.equal(r.historyContext!.dataCoverage.calendarDays, 28);
  assert.equal(r.dataCoverage.missingWellbeingDays, 7); assert.equal(r.adherence.rate, null);
  assert.equal(r.body.statistics.metrics.weight.change, null); assert.equal(r.historyContext!.body.statistics.metrics.weight.change, -1);
  assert(r.historyContext!.facts.every((f) => f.id.startsWith('history:')));
});
test('evidence resolves facts through exact measurement records across both scopes, without duplication', () => {
  const r = input(), e = reviewEvidence(r);
  assert.deepEqual(e.get('body:weight:latest')!.sourceIds, ['recent']);
  assert.deepEqual(e.get('history:body:weight:change')!.sourceIds, ['old', 'recent']);
  assert.equal(e.get('body:weight:change')!.available, false);
  assert.match(e.get('recent')!.detail, /waist: 92/);
  assert.equal([...e.values()].filter((x) => x.id === 'recent').length, 1);
  for (const entry of e.values()) assert(entry.sourceIds.every((id) => e.has(id)));
});
test('missing references and ambiguous IDs fail closed', () => {
  const r = input(); r.facts[0]!.sourceIds = ['missing']; assert.throws(() => reviewEvidence(r), /Unresolved/);
  const collision = input(); collision.historyContext!.body.records[1]!.values.weight = 1; assert.throws(() => reviewEvidence(collision), /Ambiguous/);
});
test('valid mock response is accepted and returned independently of provider-owned objects', async () => {
  const r = await response(); const v = validateProgressResponse(r, input(), 'mock-v1', 'mock'); assert(v.ok && v.result.ok);
  r.data.summary = 'Changed by provider'; assert.notEqual(v.result.data.summary, r.data.summary);
});
test('validator rejects malformed structure, wrong version/request/provenance and oversized payload fields', async () => {
  const base = await response();
  const mutations = [
    (r: typeof base) => { r.data.contractVersion = 'bad' as never; },
    (r: typeof base) => { r.data.requestId = 'wrong-week'; },
    (r: typeof base) => { r.provenance.mode = 'cloud'; },
    (r: typeof base) => { r.provenance.providerId = 'someone-else'; },
    (r: typeof base) => { r.data.summary = 'x'.repeat(2001); },
    (r: typeof base) => { r.data.claims = Array.from({ length: 33 }, (_, i) => ({ ...r.data.claims[0]!, id: `claim-${i}` })); },
    (r: typeof base) => { Object.assign(r.data, { applyPlan: true }); },
  ];
  for (const mutate of mutations) { const r = structuredClone(base); mutate(r); assert.equal(validateProgressResponse(r, input(), 'mock-v1', 'mock').ok, false); }
  for (const bad of [null, [], {}, { ok: 'yes' }, { ok: true, data: null }]) assert.equal(validateProgressResponse(bad, input(), 'mock-v1', 'mock').ok, false);
});
test('validator rejects nonexistent, duplicate and unavailable evidence, duplicate claims and invented numbers', async () => {
  const base = await response();
  const mutations = [
    (r: typeof base) => { r.data.claims[0]!.evidenceIds = ['invented']; },
    (r: typeof base) => { r.data.claims[0]!.evidenceIds = ['body:weight:change']; },
    (r: typeof base) => { r.data.claims[0]!.evidenceIds = []; },
    (r: typeof base) => { r.data.claims[0]!.evidenceIds.push(r.data.claims[0]!.evidenceIds[0]!); },
    (r: typeof base) => { r.data.claims.push(structuredClone(r.data.claims[0]!)); },
    (r: typeof base) => { r.data.claims[0]!.text = 'Latest weight: 60 kg.'; },
    (r: typeof base) => { r.data.claims[0]!.topic = 'Muscle gained'; },
    (r: typeof base) => { r.data.claims[0]!.type = 'DIAGNOSIS' as never; },
    (r: typeof base) => { r.data.claims[0]!.evidenceIds = ['photo-001']; },
    (r: typeof base) => { r.data.claims[0]!.confidence.level = '87%' as never; },
    (r: typeof base) => { r.data.claims[0]!.limitations = null as never; },
  ];
  for (const mutate of mutations) { const r = structuredClone(base); mutate(r); assert.equal(validateProgressResponse(r, input(), 'mock-v1', 'mock').ok, false); }
});
test('all four claim types retain descriptive confidence, limitations and evidence', async () => {
  const r = await response(); const fact = r.data.claims[0]!;
  r.data.claims = ['FACT', 'OBSERVATION', 'HYPOTHESIS', 'RECOMMENDATION'].map((type) => ({ ...fact, id: type, type: type as typeof fact.type, limitations: ['Small sample'], alternatives: ['Measurement variation'] }));
  const v = validateProgressResponse(r, input(), 'mock-v1', 'mock'); assert(v.ok && v.result.ok);
  assert.deepEqual(v.result.data.claims.map((c) => c.type), ['FACT', 'OBSERVATION', 'HYPOTHESIS', 'RECOMMENDATION']);
});
test('any plan proposal is rejected in this package, including proposals requiring acceptance', async () => {
  const r = await response(); r.data.proposedChanges = [{ fromExerciseId: 'wall-pushup', toExerciseId: 'incline-pushup', reason: 'Example', evidenceIds: ['recent'], requiresUserAcceptance: true, startingLoadKg: null }];
  assert.equal(validateProgressResponse(r, input(), 'mock-v1', 'mock').ok, false);
});
test('insufficient evidence is valid but an empty complete report is invalid', async () => {
  const empty = prepareWeeklyReview(INITIAL_SNAPSHOT, '2026-09-13', 'UTC');
  const r = await new MockAIProvider().analyzeProgress(empty, { allowNetwork: false }); assert(r.ok);
  assert.equal(r.data.status, 'insufficient_evidence'); assert.equal(validateProgressResponse(r, empty, 'mock-v1', 'mock').ok, true);
  r.data.status = 'complete'; assert.equal(validateProgressResponse(r, empty, 'mock-v1', 'mock').ok, false);
});
test('execution rejects cloud/local providers before invocation; mock calls always forbid networking', async () => {
  let called = false; const base = new MockAIProvider();
  for (const mode of ['cloud', 'local'] as const) {
    const provider: AIProvider = { id: 'test', capabilities: () => ({ mode, progress: true, replacement: false, physique: false }), analyzeProgress: async () => { called = true; throw Error('Must not execute'); }, suggestExerciseReplacement: base.suggestExerciseReplacement };
    const r = await runWeeklyReview(provider, input()); assert(!r.ok && r.error.code === 'unsupported');
  }
  assert.equal(called, false);
  const provider: AIProvider = { id: base.id, capabilities: () => base.capabilities(), suggestExerciseReplacement: base.suggestExerciseReplacement,
    analyzeProgress: async (i, policy) => { assert.equal(policy.allowNetwork, false); return base.analyzeProgress(i, policy); } };
  const oldFetch = globalThis.fetch; globalThis.fetch = () => { throw Error('Network forbidden'); };
  try { assert.equal((await runWeeklyReview(provider, input())).ok, true); } finally { globalThis.fetch = oldFetch; }
});
test('execution rejects invalid output and contains provider exceptions without leaking their text', async () => {
  const base = new MockAIProvider();
  const provider: AIProvider = { id: base.id, capabilities: () => base.capabilities(), suggestExerciseReplacement: base.suggestExerciseReplacement, analyzeProgress: async () => ({ ok: true, data: {} }) as never };
  const invalid = await runWeeklyReview(provider, input()); assert(!invalid.ok && invalid.error.code === 'invalid_output');
  provider.analyzeProgress = async () => { throw Error('sensitive-provider-debug'); };
  const failed = await runWeeklyReview(provider, input()); assert(!failed.ok && failed.error.code === 'unavailable'); assert.doesNotMatch(JSON.stringify(failed), /sensitive/);
});
test('cancellation prevents execution and discards a late response from a provider ignoring abort', async () => {
  const base = new MockAIProvider(), c = new AbortController(); c.abort();
  assert.equal((await runWeeklyReview(base, input(), c.signal)).ok, false);
  let resolve!: (r: AIResult<ProgressReview>) => void;
  const provider: AIProvider = { id: base.id, capabilities: () => base.capabilities(), suggestExerciseReplacement: base.suggestExerciseReplacement, analyzeProgress: () => new Promise((r) => { resolve = r; }) };
  const active = new AbortController(); const pending = runWeeklyReview(provider, input(), active.signal); active.abort(); resolve(await response());
  const result = await pending; assert(!result.ok && result.error.code === 'cancelled');
});
test('provider mutation cannot alter input evidence, and revisions change when source data changes', async () => {
  const base = new MockAIProvider(), original = input(), before = structuredClone(original);
  const provider: AIProvider = { id: base.id, capabilities: () => base.capabilities(), suggestExerciseReplacement: base.suggestExerciseReplacement,
    analyzeProgress: async (i, p) => { i.facts.find((f) => f.id === 'body:weight:latest')!.value = 10; return base.analyzeProgress(i, p); } };
  const r = await runWeeklyReview(provider, original); assert(!r.ok && r.error.code === 'invalid_output'); assert.deepEqual(original, before);
  assert.equal(reviewRevision(original), reviewRevision(input()));
  original.body.records[0]!.values.weight = 78; assert.notEqual(reviewRevision(original), reviewRevision(before));
});
test('review modules have no transport or persistence side effects', () => {
  for (const file of ['domain/reviewSession.ts', 'domain/reviewValidation.ts', 'domain/reviewEvidence.ts', 'data/reviewProvider.ts', 'ui/screens/WeeklyReviewScreen.tsx']) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|https:\/\/|AsyncStorage|snapshotRepository|saveBodyMeasurement|replaceExerciseInPlan/);
  }
});
