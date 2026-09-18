import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { weeklyCases, syntheticSnapshot } from '../tools/weekly-review-benchmark/fixtures.ts';
import { responseSchema, systemPrompt } from '../tools/weekly-review-benchmark/contract.ts';
import { makeRequest, dryResponse, evaluateResponse, openAIRequest } from '../tools/weekly-review-benchmark/adapter.ts';
import { estimateMaximum, reserveCost, usageCost } from '../tools/weekly-review-benchmark/budget.ts';
import { runBenchmark, cliOptions } from '../tools/weekly-review-benchmark/harness.ts';
import { configurationVerdict, dimensions, scoreTemplate } from '../tools/weekly-review-benchmark/scoring.ts';
import { assertValidSnapshot } from '../src/domain/snapshotValidation.ts';
import { reviewEvidence } from '../src/domain/reviewEvidence.ts';
import { prepareWeeklyReview } from '../src/domain/reviewSession.ts';

const cases = weeklyCases();
test('benchmark snapshots use production builder, four-week context and resolvable evidence', () => {
  assertValidSnapshot(syntheticSnapshot());
  assert.equal(syntheticSnapshot().history.length, 17);
  const actual = prepareWeeklyReview(syntheticSnapshot(), '2026-09-13', 'Europe/Warsaw'); actual.requestId = cases[0]!.input.requestId;
  assert.deepEqual(cases[0]!.input, actual);
  assert.deepEqual(weeklyCases(), cases);
  for (const c of cases) { assert.equal(c.input.contractVersion, 'weekly-review.v1'); assert.equal(c.input.historyContext!.dataCoverage.calendarDays, 28); assert(reviewEvidence(c.input).size > 0); }
  assert.deepEqual(cases.filter((c) => c.high).map((c) => c.id), ['W01', 'W03', 'W07', 'W08']);
});
test('negative fixtures survive serialization without correction or false evidence registration', () => {
  const conflicting = cases.find((c) => c.id === 'W07')!;
  const body = JSON.parse(makeRequest(conflicting, 'medium', 4096).input[1]!.content);
  assert.equal(body.review.adherence.rate, 0.25); assert.equal(body.review.adherence.completedTrainingSessions, 3); assert.equal(body.review.adherence.plannedSessions, 3);
  assert.equal(body.review.facts.find((f: { id: string }) => f.id === 'negative:adherence-rate').value, 25);
  assert.match(makeRequest(cases[5]!, 'medium', 4096).input[1]!.content, /SYSTEM OVERRIDE/);
  assert.match(makeRequest(cases[4]!, 'medium', 4096).input[1]!.content, /old-ai-claim/);
  assert.equal(reviewEvidence(cases[4]!.input).has('old-ai-claim'), false);
  assert.equal(cases[1]!.input.body.statistics.metrics.weight.latest, null);
  assert(Math.abs(cases[3]!.input.body.statistics.metrics.upperArm.change! - 0.2) < 1e-8);
  const machine = cases[2]!.input.exerciseExposures.filter((e) => e.exerciseId === 'machine-leg-press');
  assert.notEqual(machine[0]!.comparisonKey, machine[1]!.comparisonKey);
});
test('request is stateless Astra-only, one case, no references, keys, metadata or model tools', () => {
  const c = { ...cases[0]!, referenceAnswers: 'SECRET_REFERENCE', title: 'HIDDEN_TITLE' };
  const request = makeRequest(c, 'medium', 4096);
  assert.equal(request.model, 'gpt-6-astra'); assert.equal(request.store, false); assert.equal(request.input.length, 2);
  assert.equal(request.input[0]!.content, systemPrompt); assert.deepEqual(request.text.format.schema, responseSchema);
  for (const forbidden of ['SECRET_REFERENCE', 'HIDDEN_TITLE', 'benchmark:W02', 'previous_response_id', 'OPENAI_API_KEY', 'conversation']) assert(!JSON.stringify(request).includes(forbidden));
  assert.throws(() => makeRequest(c, 'xhigh' as never, 4096));
  assert.throws(() => makeRequest(c, 'medium', 0));
});
test('response handling preserves raw bytes and rejects refusals, truncation, invented facts and references', async () => {
  const c = cases[0]!, raw = await dryResponse(c), original = raw.rawBody;
  assert.equal(evaluateResponse(raw, c, true).valid, true);
  for (const change of [
    (e: Record<string, unknown>) => { e.status = 'incomplete'; },
    (e: Record<string, unknown>) => { e.output = [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'No' }] }]; },
    (e: Record<string, unknown>) => { e.model = null; },
  ]) { const e = JSON.parse(original); change(e); assert.equal(evaluateResponse({ ...raw, rawBody: JSON.stringify(e) }, c, true).valid, false); }
  const e = JSON.parse(original), data = JSON.parse(e.output[0].content[0].text);
  data.claims[0].text = 'Invented number: 100 kg.'; e.output[0].content[0].text = JSON.stringify(data);
  assert.equal(evaluateResponse({ ...raw, rawBody: JSON.stringify(e) }, c, true).valid, false);
  data.claims[0].evidenceIds = ['invented']; e.output[0].content[0].text = JSON.stringify(data);
  assert.equal(evaluateResponse({ ...raw, rawBody: JSON.stringify(e) }, c, true).valid, false);
  assert.equal(evaluateResponse({ ...raw, rawBody: '{bad JSON' }, c, true).valid, false);
  assert.equal(evaluateResponse({ ...raw, httpStatus: 500 }, c, false).valid, false);
  assert.equal(raw.rawBody, original);
});
test('budget reserves worst-case input and output, respects run/session/month limits and validates numbers', () => {
  const r = makeRequest(cases[0]!, 'medium', 4096), estimate = estimateMaximum(r, 4096, 4);
  assert(estimate.inputTokenCeiling >= Buffer.byteLength(JSON.stringify(r)));
  assert.equal(reserveCost(1, 0, 0, 1, 1), 1);
  for (const args of [[2, 0, 0, 1, 10], [2, 9, 0, 3, 10], [2, 0, 9, 3, 10], [NaN, 0, 0, 3, 10], [1, -1, 0, 3, 10]]) assert.throws(() => reserveCost(...args as [number, number, number, number, number]));
  assert.throws(() => estimateMaximum('x'.repeat(280000), 4096, 4));
  assert.throws(() => estimateMaximum(r, 4096, NaN));
});
test('cost includes reasoning once; unknown and inconsistent usage are not free', () => {
  const cost = usageCost({ input_tokens: 1000, output_tokens: 2000, input_tokens_details: { cached_tokens: 500, cache_write_tokens: 0 }, output_tokens_details: { reasoning_tokens: 1500 } }, 4)!;
  assert.equal(cost.outputTokens, 2000); assert.equal(cost.reasoningTokens, 1500); assert(Math.abs(cost.usd - 0.1055) < 1e-8);
  assert.equal(usageCost(null, 4), null);
  assert.equal(usageCost({ input_tokens: 1, output_tokens: 1, output_tokens_details: { reasoning_tokens: 2 } }, 4), null);
});
test('adapter cannot execute without explicit opt-in and key; CLI never silently enables live', async () => {
  await assert.rejects(openAIRequest(makeRequest(cases[0]!, 'medium', 4096), {}));
  await assert.rejects(openAIRequest(makeRequest(cases[0]!, 'medium', 4096), { OPENAI_API_KEY: 'unused' }));
  assert.throws(() => cliOptions([], {})); assert.throws(() => cliOptions(['--live'], {}));
  assert.throws(() => cliOptions(['--dry-run', '--live'], {}));
  assert.throws(() => cliOptions(['--dry-run', '--model=luna'], {}));
});
test('entire dry-run serializes, validates and writes all repetitions with zero network and no key exposure', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'weekly-benchmark-')), originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('NETWORK FORBIDDEN IN TEST'); };
  try {
    const r = await runBenchmark({ ...cliOptions(['--dry-run', '--repeats=2'], {}), outputRoot: dir, env: { OPENAI_API_KEY: 'DO_NOT_LOG_THIS_SECRET', BENCH_ALLOW_PAID: 'YES' } });
    assert.equal(r.summary.runs, 24); assert.equal(r.summary.actualApiCostPln, 0); assert(r.summary.results.every((v) => v.valid));
    const names = readdirSync(r.directory); assert.equal(names.filter((n) => n.endsWith('.raw.txt')).length, 24);
    for (const name of names) assert(!readFileSync(join(r.directory, name), 'utf8').includes('DO_NOT_LOG_THIS_SECRET'));
    assert.equal(JSON.parse(readFileSync(join(r.directory, 'scores.json'), 'utf8'))[0].criticalViolations, null);
  } finally { globalThis.fetch = originalFetch; rmSync(dir, { recursive: true, force: true }); }
});
test('critical violations disqualify regardless of average; dry-run and unreviewed data never pass quality', () => {
  const assessment = { ...scoreTemplate('W01', 'medium', 1), reviewStatus: 'reviewed', scores: Object.fromEntries(dimensions.map((d) => [d, 4])), criticalViolations: [] as string[], stabilityAcrossRepeats: 4 };
  assert.equal(configurationVerdict([{ valid: true, dryRun: true, assessment }]), 'not_evaluated');
  assert.equal(configurationVerdict([{ valid: true, dryRun: false, assessment: { ...assessment, criticalViolations: ['diagnosis'] } }]), 'disqualified');
  assert.equal(configurationVerdict([{ valid: true, dryRun: false, assessment: { ...assessment, reviewStatus: 'pending' } }]), 'pending_human_review');
  assert.equal(configurationVerdict([{ valid: false, dryRun: false, assessment }]), 'failed_pilot_gate');
});

test('secret preflight fails closed and detects response echoes without revealing credentials', async () => {
  const { requireEnvironmentKey, containsCredential } = await import('../tools/weekly-review-benchmark/security.ts');
  for (const env of [{}, { OPENAI_API_KEY: '' }, { OPENAI_API_KEY: '  ' }, { OPENAI_API_KEY: 'line\nbreak' }, { OPENAI_API_KEY: 'synthetic-only', NODE_DEBUG: 'http' }, { OPENAI_API_KEY: 'synthetic-only', NODE_OPTIONS: '--inspect' }]) assert.throws(() => requireEnvironmentKey(env));
  assert.equal(requireEnvironmentKey({ OPENAI_API_KEY: 'synthetic-only' }), 'synthetic-only');
  assert(containsCredential('An error echoed synthetic-only', 'synthetic-only'));
  assert(containsCredential('{"Authorization":"Bearer anything"}', 'synthetic-only'));
  assert.equal(containsCredential('{"message":"Invalid authentication"}', 'synthetic-only'), false);
});

test('manual workflow exposes secret only to no-network preflight and cannot run live', () => {
  const workflow = readFileSync(new URL('../.github/workflows/weekly-review-secret-check.yml', import.meta.url), 'utf8');
  assert.equal(workflow.split('${{ secrets.OPENAI_API_KEY }}').length - 1, 1);
  assert.match(workflow, /environment: rpgfitness-benchmark/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /--live|BENCH_ALLOW_PAID: ['"]?YES|upload-artifact|pull_request_target/);
  assert.match(workflow, /BENCH_ALLOW_PAID: 'NO'/);
});

test('first authorized screening can select medium only without losing its eight cases', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'medium-only-'));
  try {
    const options = cliOptions(['--dry-run', '--effort=medium'], {});
    const result = await runBenchmark({ ...options, outputRoot: dir });
    assert.equal(result.summary.runs, 8);
    assert(result.summary.results.every((r) => r.effort === 'medium' && r.valid));
    assert.equal(result.summary.actualApiCostPln, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('durable journal retains full reservations, blocks reruns and enforces monthly cap across runners', async () => {
  const { reserveSession } = await import('../tools/weekly-review-benchmark/actionsBudget.ts');
  const empty = { version: 1, reservations: [] };
  const first = reserveSession(empty, '101', '2026-09', 5);
  const second = reserveSession(first, '102', '2026-09', 5);
  assert.equal(second.reservations.reduce((n, r) => n + r.microPln, 0), 10000000);
  assert.deepEqual(empty.reservations, []);
  assert.throws(() => reserveSession(second, '103', '2026-09', 0.01));
  assert.throws(() => reserveSession(first, '101', '2026-09', 5));
  assert.throws(() => reserveSession(first, '101', '2026-10', 5));
  assert.equal(reserveSession(second, '103', '2026-10', 5).reservations.length, 3);
  for (const bad of [null, {}, { version: 2, reservations: [] }, { version: 1, reservations: [{ runId: '1', month: '2026-09', microPln: -1 }] }, { version: 1, reservations: [{ runId: 101, month: '2026-09', microPln: 1 }] }, { version: 1, reservations: [...first.reservations, ...first.reservations] }]) assert.throws(() => reserveSession(bad, '103', '2026-09', 5));
  assert.throws(() => reserveSession(first, '103', '2026-08', 5));
  assert.throws(() => reserveSession(first, '103', '2026-09', NaN));
});

test('Actions reservation uses fixed GitHub endpoint, compare-and-set and no secret-bearing journal', async () => {
  const { reserveActionsSession } = await import('../tools/weekly-review-benchmark/actionsBudget.ts');
  const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'szmitek/szmitek-abyss-protocol', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', BENCH_ALLOW_PAID: 'YES', GITHUB_TOKEN: 'synthetic-github-token', GITHUB_RUN_ID: '101' };
  const original = globalThis.fetch;
  const calls: { url: string; body: string }[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: String(options?.body ?? '') });
    assert.equal(options?.redirect, 'error');
    return new Response(JSON.stringify(calls.length === 1 ? { sha: 'a'.repeat(40), encoding: 'base64', content: Buffer.from(JSON.stringify({ version: 1, reservations: [] })).toString('base64') } : {}), { status: 200 });
  };
  try {
    await reserveActionsSession(env, 5, '2026-09');
    assert.equal(calls.length, 2);
    assert(calls.every((c) => c.url.startsWith('https://api.github.com/repos/szmitek/szmitek-abyss-protocol/contents/budget.json')));
    const update = JSON.parse(calls[1]!.body);
    assert.equal(update.sha, 'a'.repeat(40)); assert.equal(update.branch, 'benchmark-budget');
    assert.deepEqual(JSON.parse(Buffer.from(update.content, 'base64').toString()), { version: 1, reservations: [{ runId: '101', month: '2026-09', microPln: 5000000 }] });
    assert(!calls[1]!.body.includes(env.GITHUB_TOKEN));
    for (const override of [{ GITHUB_TOKEN: '' }, { BENCH_ALLOW_PAID: 'NO' }, { GITHUB_REF: 'refs/heads/untrusted' }, { GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_REPOSITORY: 'other/repo' }]) await assert.rejects(reserveActionsSession({ ...env, ...override }, 5, '2026-09'));
    assert.equal(calls.length, 2);
  } finally { globalThis.fetch = original; }
});

test('missing/corrupt/conflicting durable journal never falls back or retries and errors are sanitized', async () => {
  const { reserveActionsSession } = await import('../tools/weekly-review-benchmark/actionsBudget.ts');
  const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'szmitek/szmitek-abyss-protocol', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', BENCH_ALLOW_PAID: 'YES', GITHUB_TOKEN: 'synthetic-only', GITHUB_RUN_ID: '101' };
  const original = globalThis.fetch;
  try {
    for (const mode of ['missing', 'corrupt', 'conflict', 'timeout']) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        if (mode === 'timeout') throw new Error('Authorization: Bearer synthetic-only');
        if (mode === 'missing') return new Response('private error', { status: 404 });
        if (mode === 'corrupt') return new Response('{bad');
        return calls === 1 ? new Response(JSON.stringify({ sha: 'a'.repeat(40), encoding: 'base64', content: Buffer.from('{"version":1,"reservations":[]}').toString('base64') })) : new Response('private conflict', { status: 409 });
      };
      await assert.rejects(reserveActionsSession(env, 5, '2026-09'), (error: Error) => error.message === 'Durable budget unavailable or exhausted; no model request permitted.');
      assert.equal(calls, mode === 'conflict' ? 2 : 1);
    }
  } finally { globalThis.fetch = original; }
});

test('live Actions harness refuses to reach the model without durable reservation', async () => {
  const original = globalThis.fetch, directory = mkdtempSync(join(tmpdir(), 'budget-guard-'));
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('Forbidden'); };
  try {
    await assert.rejects(runBenchmark({ ...cliOptions(['--dry-run', '--effort=medium'], {}), dryRun: false, outputRoot: directory, env: { GITHUB_ACTIONS: 'true', BENCH_ALLOW_PAID: 'YES', OPENAI_API_KEY: 'synthetic-only' } }));
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; rmSync(directory, { recursive: true, force: true }); }
});

test('pilot workflow defaults to offline, confines secret and fixes medium-only single repetition', () => {
  const workflow = readFileSync(new URL('../.github/workflows/weekly-review-benchmark.yml', import.meta.url), 'utf8');
  assert.match(workflow, /default: 'NO'/);
  assert.match(workflow, /inputs.allow_paid == 'YES'/);
  assert.match(workflow, /environment: rpgfitness-benchmark/);
  assert.match(workflow, /BENCH_ALLOW_PAID: \$\{\{ inputs.allow_paid \}\}/);
  assert.equal(workflow.split('${{ secrets.OPENAI_API_KEY }}').length - 1, 1);
  assert.match(workflow, /--live --effort=medium --repeats=1/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /pull_request_target|schedule:|--effort=matrix/);
});

test('usage pricing separates normal input, cache write/read and inclusive reasoning output', () => {
  const cost = (input: number, cached: number, written: number, output: number, reasoning?: number) => usageCost({ input_tokens: input, input_tokens_details: { cached_tokens: cached, cache_write_tokens: written }, output_tokens: output, output_tokens_details: reasoning === undefined ? {} : { reasoning_tokens: reasoning }, total_tokens: input + output }, 4)!;
  assert.equal(cost(1000, 0, 0, 0).usd, 0.01);
  assert.equal(cost(1000, 0, 1000, 0).usd, 0.0125);
  assert.equal(cost(1000, 1000, 0, 0).usd, 0.001);
  assert.equal(cost(0, 0, 0, 1000, 600).usd, 0.05);
  assert.equal(cost(0, 0, 0, 1000, 0).usd, 0.05);
  assert.equal(cost(0, 0, 0, 1000).visibleOutputTokens, null);
  const w01 = cost(21979, 0, 21976, 2174, 86);
  assert.equal(w01.usd, 0.38343); assert.equal(w01.pln, 1.53372);
  assert.equal(w01.ordinaryInputTokens, 3); assert.equal(w01.visibleOutputTokens, 2088);
  assert.equal(cost(1000, 300, 500, 100, 20).usd, 0.01355);
  for (const invalid of [{ input_tokens: 100, output_tokens: 10, input_tokens_details: { cached_tokens: 60, cache_write_tokens: 60 } }, { input_tokens: 1, output_tokens: 1, input_tokens_details: { cache_write_tokens: -1 } }, { input_tokens: 1, output_tokens: 1, total_tokens: 1 }, { input_tokens: 272001, output_tokens: 1 }]) assert.equal(usageCost(invalid, 4), null);
  assert.throws(() => usageCost({input_tokens: 1, output_tokens: 1}, NaN));
});

test('compact evidence transport preserves original snapshot, identifiers, availability and canonical facts', () => {
  for (const c of weeklyCases()) {
    const full = JSON.parse(makeRequest(c, 'medium', 4096).input[1]!.content);
    const compact = JSON.parse(makeRequest(c, 'medium', 4096, 'compact').input[1]!.content);
    assert.deepEqual(compact.review, full.review);
    assert.deepEqual(compact.evidence, full.evidence.map(({id,kind,sourceIds,available,canonicalFactText}: Record<string,unknown>) => ({id,kind,sourceIds,available,canonicalFactText})));
    assert(JSON.stringify(compact).length < JSON.stringify(full).length);
    const body = makeRequest(c, 'medium', 4096, 'compact');
    const reservation = estimateMaximum(body, 4096, 4);
    const worst = usageCost({input_tokens: reservation.inputTokenCeiling, input_tokens_details: {cached_tokens: 0, cache_write_tokens: reservation.inputTokenCeiling}, output_tokens: 4096}, 4)!;
    assert(Math.abs(reservation.maximumPln - worst.pln) < 1e-10);
  }
});

test('offline remaining-case selection never repeats W01 and never reaches transport', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'remaining-cases-')), original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('No network'); };
  try {
    const options = cliOptions(['--dry-run', '--effort=medium', '--cases=remaining', '--payload=compact'], {});
    const r = await runBenchmark({...options, outputRoot: directory});
    assert.deepEqual(r.summary.results.map((v) => v.testcaseId), ['W02','W03','W04','W05','W06','W07','W08']);
    assert.equal(r.summary.payloadVersion, 'evidence-index.v2');
    assert.equal(r.summary.actualApiCostPln, 0);
    assert(r.summary.results.every((v) => v.valid));
  } finally {globalThis.fetch = original; rmSync(directory, {recursive:true,force:true});}
});

test('missing cache accounting is not treated as zero-price writes; standard tier is explicit', () => {
  assert.equal(usageCost({input_tokens: 100, output_tokens: 10, input_tokens_details: {cached_tokens: 0}}, 4), null);
  assert.equal(usageCost({input_tokens: 100, output_tokens: 10, input_tokens_details: {cache_write_tokens: 0}}, 4), null);
  assert.equal(makeRequest(cases[0]!, 'medium', 4096).service_tier, 'default');
});

test('Sol W01 is one offline request with the historical payload and correct Sol costs', async () => {
  const { solOptions } = await import('../tools/weekly-review-benchmark/sol-w01.ts');
  const { solPrice, usageCost } = await import('../tools/weekly-review-benchmark/budget.ts');
  const original = globalThis.fetch, directory = mkdtempSync(join(tmpdir(), 'sol-w01-'));
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('Forbidden'); };
  try {
    const options = { ...solOptions(['--dry-run'], {}), outputRoot: directory };
    const { summary } = await runBenchmark(options);
    assert.equal(summary.model, 'gpt-5.6-sol');
    assert.equal(summary.runs, 1);
    assert.equal(summary.results[0]!.testcaseId, 'W01');
    assert.equal(summary.results[0]!.valid, true);
    assert.ok(Math.abs(summary.plannedMaximumPln - 2.06838) < 1e-9);
    assert.equal(calls, 0);
    assert.equal(usageCost({ input_tokens: 21979, input_tokens_details: { cache_write_tokens: 21976, cached_tokens: 0 }, output_tokens: 2174, output_tokens_details: { reasoning_tokens: 86 } }, 4, solPrice)!.pln, 0.613488);
    for (const change of [{ sessionPln: 5 }, { perRunPln: 5 }, { repeats: 2 }, { effort: 'matrix' as const }, { maxOutputTokens: 8192 }, { fx: 5 }]) await assert.rejects(runBenchmark({ ...options, ...change }));
    assert.throws(() => solOptions(['--live'], {}));
    assert.throws(() => solOptions(['--live'], { GITHUB_ACTIONS: 'true', GITHUB_RUN_ATTEMPT: '2' }));
    assert.throws(() => solOptions(['--dry-run', '--repeats=2'], {}));
    await assert.rejects(runBenchmark({ ...options, dryRun: false, env: {} }));
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; rmSync(directory, { recursive: true, force: true }); }
});

test('Sol workflow is manual, default-off, secret-scoped and capped at 2.10 PLN', () => {
  const workflow = readFileSync(new URL('../.github/workflows/weekly-review-sol-w01.yml', import.meta.url), 'utf8');
  assert.match(workflow, /default: 'NO'/);
  assert.match(workflow, /BENCH_MAX_RUN_PLN: '2.10'/);
  assert.match(workflow, /BENCH_MAX_SESSION_PLN: '2.10'/);
  assert.match(workflow, /environment: rpgfitness-benchmark/);
  assert.equal(workflow.split('${{ secrets.OPENAI_API_KEY }}').length - 1, 1);
  assert.match(workflow, /sol-w01.ts --live/);
  assert.doesNotMatch(workflow, /schedule:|pull_request_target|harness.ts --live/);
});
