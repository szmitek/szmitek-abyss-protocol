import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { arcA01Options } from '../tools/arc-review-benchmark/a01.ts';
import { arcPilot, arcPilotCase, arcPilotRequest } from '../tools/arc-review-benchmark/pilotConfig.ts';
import { runBenchmark } from '../tools/weekly-review-benchmark/harness.ts';
import { reserveSession } from '../tools/weekly-review-benchmark/actionsBudget.ts';
import { estimateMaximum } from '../tools/weekly-review-benchmark/budget.ts';
import { arcCases, withArc } from '../tools/arc-review-benchmark/fixtures.ts';
import { clarifyArcCase, boundaryText, arcV2Request, prepareArcV2 } from '../tools/arc-review-benchmark/prepare-v2.ts';
import { syntheticSnapshot } from '../tools/weekly-review-benchmark/fixtures.ts';
import { prepareArcReview } from '../src/domain/arcProgressReview.ts';
import { reviewEvidence } from '../src/domain/reviewEvidence.ts';
import { spawnSync } from 'node:child_process';

test('A01 request is frozen, stateless, text-only and fits the proposed reservation', () => {
  const request = arcPilotRequest(arcPilotCase());
  assert.equal(request.model, arcPilot.model); assert.equal(request.reasoning.effort, 'medium');
  assert.equal(request.store, false); assert.equal(request.service_tier, 'default');
  assert.equal(request.max_output_tokens, 4096);
  assert.deepEqual(Object.keys(request).sort(), ['model', 'service_tier', 'reasoning', 'store', 'stream', 'max_output_tokens', 'input', 'text'].sort());
  assert.equal(estimateMaximum(request, 4096, 4).maximumPln, 3.5963);
  const c = arcPilotCase(); c.input.requestId = 'changed';
  assert.throws(() => arcPilotRequest(c), /changed/);
  assert.throws(() => arcPilotRequest({ ...arcPilotCase(), id: 'A02' }), /Only A01/);
});

test('A01 rejects wider configuration, alternate cases, reruns and unapproved live before HTTP', async () => {
  for (const args of [[], ['--dry-run','--live'], ['--dry-run','--effort=high'], ['--dry-run','--model=sol']]) assert.throws(() => arcA01Options(args, {}));
  for (const env of [{ BENCH_MAX_RUN_PLN: '5' }, { BENCH_MAX_SESSION_PLN: '5' }, { BENCH_MAX_OUTPUT_TOKENS: '8192' }, { BENCH_PLN_PER_USD: '5' }]) assert.throws(() => arcA01Options(['--dry-run'], env));
  assert.throws(() => arcA01Options(['--live'], {}));
  assert.throws(() => arcA01Options(['--live'], { GITHUB_ACTIONS: 'true', GITHUB_RUN_ATTEMPT: '2' }));
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => { calls++; throw new Error('Network forbidden'); };
  try {
    await assert.rejects(runBenchmark(arcA01Options(['--live'], { GITHUB_ACTIONS: 'true', GITHUB_RUN_ATTEMPT: '1' })), /not authorized/);
    await assert.rejects(runBenchmark({ ...arcA01Options(['--dry-run'], {}), repeats: 2 }), /fixed/);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = previous; }
});

test('A01 dry-run exercises shared harness, raw capture and validator without a key or HTTP', async () => {
  const root = mkdtempSync(join(tmpdir(), 'arc-a01-'));
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => { calls++; throw new Error('Network forbidden'); };
  try {
    const { directory, summary } = await runBenchmark({ ...arcA01Options(['--dry-run'], {}), outputRoot: root });
    assert.equal(summary.runs, 1); assert.equal(summary.selectedCases, 'A01-only');
    assert.equal(summary.results[0]!.valid, true); assert.equal(summary.actualApiCostPln, 0);
    assert.equal(summary.actionsMonthlyReservedPln, null); assert.equal(summary.promptVersion, 'arc-review.offline.v1');
    const result = JSON.parse(readFileSync(join(directory, 'A01-medium-1.result.json'), 'utf8'));
    assert.equal(result.requestSha256, arcPilot.requestSha256);
    assert.equal(result.cost.actualApiCostPln, 0); assert.equal(result.usage, null);
    assert.match(result.label, /NOT MODEL OUTPUT/);
    assert.match(readFileSync(join(directory, 'A01-medium-1.raw.txt'), 'utf8'), /dry-run-not-model-output/);
    const score = JSON.parse(readFileSync(join(directory, 'scores.json'), 'utf8'))[0];
    assert.equal(score.practicalUsefulness, null); assert.equal(score.domainCompleteness, null);
    assert.equal(score.stabilityAcrossRepeats, null); assert.equal(calls, 0);
  } finally { globalThis.fetch = previous; rmSync(root, { recursive: true, force: true }); }
});

test('unreconciled September reservations block A01 without changing the journal or cap', () => {
  const journal = { version: 1, reservations: [1533720,607808,1800000,4400000].map((microPln,i) => ({ runId: String(i+1), month: '2026-09', microPln })) };
  const before = JSON.stringify(journal);
  assert.throws(() => reserveSession(journal, '5', '2026-09', arcPilot.capPln), /exhausted/);
  assert.equal(JSON.stringify(journal), before);
});

test('A01 workflow is manual, default-off, protected and shares budget concurrency', () => {
  const workflow = readFileSync(new URL('../.github/workflows/arc-review-a01.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:/); assert.match(workflow, /default: 'NO'/);
  assert.match(workflow, /environment: rpgfitness-benchmark/);
  assert.match(workflow, /group: rpgfitness-benchmark/);
  assert.match(workflow, /inputs.allow_paid == 'YES'/);
  assert.doesNotMatch(workflow, /schedule:|pull_request:|\n {2}push:|inputs.model|--effort=high/);
});

test('v2 changes only the boundary explanation, preserving adversarial data and evidence', () => {
  for (const original of arcCases()) {
    const before = JSON.stringify(original), updated = clarifyArcCase(original);
    assert.equal(JSON.stringify(original), before);
    assert(updated.input.arcContext!.limitations.includes(boundaryText));
    assert.deepEqual(reviewEvidence(updated.input), reviewEvidence(original.input));
    const restored = structuredClone(updated);
    restored.input.arcContext!.limitations = [...original.input.arcContext!.limitations];
    assert.deepEqual(restored, original);
  }
  const changed = arcPilotCase(); changed.input.arcContext!.limitations = [];
  assert.throws(() => clarifyArcCase(changed), /wording changed/);
  assert.equal(arcCases()[6]!.input.adherence.rate, 0.25);
  assert.match(JSON.stringify(clarifyArcCase(arcCases()[5]!).input), /SYSTEM OVERRIDE/);
});

test('v2 distinguishes unlinked reassessment from real completion without reassigning records', () => {
  const ongoing = clarifyArcCase(arcPilotCase()).input;
  assert.equal(ongoing.arcContext!.checkpoints.completion, null);
  assert(ongoing.tests.records.some(t => t.kind === 'reassessment' && t.dateKey === '2026-09-07'));
  assert(ongoing.training.some(t => t.dateKey === '2026-09-11'));
  const snapshot = withArc(syntheticSnapshot());
  snapshot.profile!.trainingArcs[0]!.completionAssessmentId = 'check-2026-09-07';
  const completed = clarifyArcCase({ ...arcPilotCase(), input: prepareArcReview(snapshot, 'synthetic-arc', '2026-09-13', 'UTC') }).input;
  assert.equal(completed.arcContext!.state, 'completed'); assert.equal(completed.period.to, '2026-09-06');
  assert(completed.training.every(t => t.dateKey < '2026-09-07'));
  assert(reviewEvidence(completed).has('check-2026-09-07'));
  assert(ongoing.exerciseExposures.every(e => e.prescribedVolume === 20));
  assert.equal(ongoing.exerciseExposures.at(-1)!.actualVolume, 30);
});

test('v2 full offline pipeline validates all cases and preserves the paid v1 request hash', async () => {
  const root = mkdtempSync(join(tmpdir(), 'arc-v2-')), previous = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Network forbidden'); };
  try {
    const manifest = await prepareArcV2(root);
    assert.equal(manifest.rows.length, 10); assert.equal(manifest.apiCalls, 0); assert.equal(manifest.costPln, 0);
    assert(manifest.rows.every(r => r.quality === 'NOT_EVALUATED'));
    const request = arcV2Request(clarifyArcCase(arcPilotCase()));
    assert.deepEqual(request.text, arcPilotRequest(arcPilotCase()).text);
    assert.match(request.input[0]!.content, /actualVolume against prescribedVolume/);
    assert.match(request.input[0]!.content, /missing actual or target means comparison unavailable/);
    assert.notEqual(manifest.rows[0]!.requestSha256, arcPilot.requestSha256);
    assert.doesNotThrow(() => arcPilotRequest(arcPilotCase()));
  } finally { globalThis.fetch = previous; rmSync(root, { recursive: true, force: true }); }
});

test('v2 CLI refuses a live switch and has no credential or transport dependency', () => {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', 'tools/arc-review-benchmark/prepare-v2.ts', '--live'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0); assert.match(result.stderr, /No live mode exists/);
  const source = readFileSync(new URL('../tools/arc-review-benchmark/prepare-v2.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /openAIRequest|OPENAI_API_KEY|process\.env|runBenchmark/);
});
