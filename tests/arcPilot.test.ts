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
