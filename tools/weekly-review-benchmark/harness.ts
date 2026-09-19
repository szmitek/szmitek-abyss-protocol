import { completenessRequest, completenessPromptVersion } from './completeness-v2.ts';
import { reserveActionsSession } from './actionsBudget.ts';
import { requireEnvironmentKey } from './security.ts';
import { mkdirSync, writeFileSync, readFileSync, existsSync, openSync, closeSync, unlinkSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { weeklyCases } from './fixtures.ts';
import { makeRequest, dryResponse, evaluateResponse, openAIRequest, model, type Effort } from './adapter.ts';
import { estimateMaximum, pilot, positive, price, solPrice, reserveCost, usageCost } from './budget.ts';
import { promptVersion } from './contract.ts';
import { scoreTemplate } from './scoring.ts';

const defaultRoot = fileURLToPath(new URL('../../.benchmark-results/', import.meta.url));
const save = (path: string, data: unknown) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export interface Options { v2Model?: 'sol' | 'astra'; solW01?: boolean; cases?: 'all' | 'remaining'; payload?: 'full' | 'compact'; effort?: 'medium' | 'matrix'; dryRun: boolean; repeats: number; outputRoot: string; fx: number; perRunPln: number; sessionPln: number; maxOutputTokens: number; env: Readonly<Record<string, string | undefined>> }
export async function runBenchmark(options: Options) {
  const { dryRun, repeats, fx, perRunPln, sessionPln, maxOutputTokens, env } = options;
  const selectedModel = options.v2Model === 'sol' || options.solW01 ? 'gpt-5.6-sol' : model;
  const rates = options.v2Model === 'sol' || options.solW01 ? solPrice : price;
  if (options.solW01 && (repeats !== 1 || options.effort !== 'medium' || fx !== 4 || maxOutputTokens !== 4096 || perRunPln > 2.1 || sessionPln > 2.1)) throw new Error('Sol W01 limits are fixed; no widening permitted.');
  const activePromptVersion = options.v2Model ? completenessPromptVersion : promptVersion;
  if (options.v2Model && (!['sol', 'astra'].includes(options.v2Model) || options.solW01 || repeats !== 1 || options.effort !== 'medium' || fx !== 4 || maxOutputTokens !== 4096 || perRunPln > (options.v2Model === 'sol' ? 1.8 : 4.4) || sessionPln > (options.v2Model === 'sol' ? 1.8 : 4.4))) throw new Error('Fixed v2 single-request limits exceeded.');
  const requestFor = (test: ReturnType<typeof weeklyCases>[number], effort: Effort) => {
    if (options.v2Model) return completenessRequest(test, selectedModel as 'gpt-5.6-sol' | 'gpt-6-astra', effort);
    const body = makeRequest(test, effort, maxOutputTokens, options.solW01 ? 'full' : options.payload ?? 'full');
    if (!options.solW01) return body;
    // Exact historical request: do not add service_tier or alter prompt/schema.
    const { service_tier: _tier, ...historical } = body;
    void _tier;
    if (hash(JSON.stringify(historical)) !== '1a07e0113ba4a23875de647aa1544a2ea2a5b3c4e91141ff013ef627a19422c2') throw new Error('W01 baseline changed; comparison blocked.');
    return { ...historical, model: selectedModel };
  };
  if (!Number.isSafeInteger(repeats) || repeats < 1 || repeats > 5) throw new Error('Repeats must be 1–5.');
  positive(fx, 'FX'); positive(perRunPln, 'per-run limit'); positive(sessionPln, 'session limit');
  if (!dryRun && (env.BENCH_ALLOW_PAID !== 'YES' || !env.OPENAI_API_KEY?.trim())) throw new Error('Live mode is not authorized/configured.');
  if (!dryRun) requireEnvironmentKey(env);
  // One fixed ledger for all live invocations on this checkout, irrespective of output path.
  mkdirSync(defaultRoot, { recursive: true, mode: 0o700 });
  let lock: number | undefined;
  const lockPath = resolve(defaultRoot, 'live.lock'), ledgerPath = resolve(defaultRoot, 'monthly-budget.json');
  const month = new Date().toISOString().slice(0, 7);
  let monthlySpent = 0, sessionSpent = 0;
  let actionsMonthlyReservedPln: number | null = null;
  if (!dryRun) {
    lock = openSync(lockPath, 'wx', 0o600);
  }
  const writeLedger = () => {
    const temp = `${ledgerPath}.tmp`;
    writeFileSync(temp, JSON.stringify({ month, reservedOrSpentPln: monthlySpent, scope: 'this-checkout-only', pilot }) + '\n', { mode: 0o600 });
    renameSync(temp, ledgerPath);
  };
  try {
    if (!dryRun && existsSync(ledgerPath)) {
      const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
      if (!/^\d{4}-\d{2}$/.test(ledger.month) || !Number.isFinite(ledger.reservedOrSpentPln) || ledger.reservedOrSpentPln < 0 || ledger.month > month) throw new Error('Invalid local monthly ledger; manual reconciliation required.');
      monthlySpent = ledger.month === month ? ledger.reservedOrSpentPln : 0;
    }
    if (!dryRun && env.GITHUB_ACTIONS === 'true') {
      actionsMonthlyReservedPln = await reserveActionsSession(env, sessionPln, month);
    }
    const directory = resolve(options.outputRoot, `${dryRun ? 'dry-run' : 'live'}-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const selected = weeklyCases().filter((c) => options.solW01 || options.v2Model ? c.id === 'W01' : options.cases !== 'remaining' || c.id !== 'W01');
    const preflight = selected.flatMap((test) => (test.high && options.effort !== 'medium' ? ['medium', 'high'] as Effort[] : ['medium'] as Effort[]).map((effort) => ({ testcaseId: test.id, effort, repeats, estimate: estimateMaximum(requestFor(test, effort), maxOutputTokens, fx, rates) })));
    const plannedMaximumPln = preflight.reduce((sum, row) => sum + row.estimate.maximumPln * repeats, 0);
    save(resolve(directory, 'preflight.json'), { cases: preflight, plannedMaximumPln, sessionPln, fullPlanFitsMaximum: plannedMaximumPln <= sessionPln, note: 'No assumed cache hits. Partial execution may stop at the session limit; dry-run makes no model calls.' });
    const results: { testcaseId: string; effort: Effort; repeat: number; valid: boolean; dryRun: boolean; chargedPln: number; budgetWouldBlock: boolean }[] = [];
    const assessments: ReturnType<typeof scoreTemplate>[] = [];
    let stopped: string | null = null;
    for (const test of selected) {
      const efforts: Effort[] = test.high && options.effort !== 'medium' ? ['medium', 'high'] : ['medium'];
      for (const effort of efforts) for (let repeat = 1; repeat <= repeats; repeat++) {
        if (stopped) break;
        const body = requestFor(test, effort);
        const serialized = JSON.stringify(body);
        const estimate = estimateMaximum(body, maxOutputTokens, fx, rates);
        let budgetWouldBlock = false;
        try { reserveCost(estimate.maximumPln, sessionSpent, monthlySpent, perRunPln, sessionPln); } catch {
          budgetWouldBlock = true;
          if (!dryRun) {
            save(resolve(directory, 'budget-stop.json'), { testcaseId: test.id, effort, repeat, estimate, sessionSpent, remainingSessionPln: sessionPln - sessionSpent, perRunPln, sessionPln, reason: 'budget_stop_before_request' });
            stopped = 'budget_stop_before_request'; break;
          }
        }
        if (!dryRun && new Date().toISOString().slice(0, 7) !== month) { stopped = 'month_changed_restart_session'; break; }
        const key = `${test.id}-${effort}-${repeat}`;
        // Safe body only. Authorization/key/environment are never serialized.
        save(resolve(directory, `${key}.request.json`), body);
        if (!dryRun) { monthlySpent += estimate.maximumPln; sessionSpent += estimate.maximumPln; writeLedger(); }
        const timestamp = new Date().toISOString(), started = performance.now();
        const raw = dryRun ? await dryResponse(test) : await openAIRequest(body, env);
        const latencyMs = performance.now() - started;
        // Preserve bytes verbatim before parsing; malformed JSON and HTTP errors remain auditable.
        writeFileSync(resolve(directory, `${key}.raw.txt`), raw.rawBody, { mode: 0o600, flag: 'wx' });
        const evaluated = evaluateResponse(raw, test, dryRun);
        const pricingSupported = evaluated.returnedModel === selectedModel && 'serviceTier' in evaluated && evaluated.serviceTier === 'default';
        const measured = dryRun || !pricingSupported ? null : usageCost(evaluated.usage, fx, rates);
        const chargedPln = dryRun ? 0 : measured?.pln ?? estimate.maximumPln;
        if (!dryRun) { monthlySpent += chargedPln - estimate.maximumPln; sessionSpent += chargedPln - estimate.maximumPln; writeLedger(); }
        const row = { testcaseId: test.id, effort, repeat, valid: evaluated.valid, dryRun, chargedPln, budgetWouldBlock };
        results.push(row); assessments.push(scoreTemplate(test.id, effort, repeat));
        save(resolve(directory, `${key}.result.json`), { ...row, modelRequested: selectedModel, modelReturned: dryRun ? null : evaluated.returnedModel, promptVersion: activePromptVersion, contractVersion: 'progress-review.v1', requestTimestamp: timestamp, latencyMs, latencyMeaning: dryRun ? 'local pipeline only, not inference latency' : 'request to complete response body', finishStatus: evaluated.status, httpStatus: raw.httpStatus, transportError: raw.transportError, usage: evaluated.usage, cost: { actualApiCostPln: dryRun ? 0 : measured?.pln ?? null, measured, reservedOrAccountedPln: chargedPln, estimate, price: rates, plnPerUsd: fx }, validation: { passed: evaluated.valid, error: evaluated.error }, criticalViolations: { automatedSemanticAssessment: 'not_performed', human: null }, requestSha256: hash(serialized), inputSha256: hash(JSON.stringify(test.input)), rawResponseFile: `${key}.raw.txt`, responseData: evaluated.data, fixtureMutation: test.mutation, label: dryRun ? 'DRY RUN / NOT MODEL OUTPUT / NO HTTP / COST 0' : 'BENCHMARK ONLY / HUMAN REVIEW PENDING' });
        if (!dryRun && (!measured || chargedPln > estimate.maximumPln || raw.transportError || raw.httpStatus !== 200)) { stopped = 'accounting_or_transport_stop_no_retry'; break; }
      }
    }
    save(resolve(directory, 'scores.json'), assessments);
    const summary = { plannedMaximumPln, fullPlanFitsMaximum: plannedMaximumPln <= sessionPln, payloadVersion: options.v2Model || options.payload === 'compact' ? 'evidence-index.v2' : 'full.v1', selectedCases: options.solW01 || options.v2Model ? 'W01-only' : options.cases ?? 'all', dryRun, model: selectedModel, promptVersion: activePromptVersion, results, stopped, runs: results.length, actualApiCostPln: dryRun ? 0 : results.some((r) => r.chargedPln > 0) ? 'see per-run measured costs; unknown usage retains reservation' : 0, sessionAccountedPln: sessionSpent, monthlyAccountedPln: dryRun ? null : monthlySpent, actionsMonthlyReservedPln, softBudgetReached: !dryRun && Math.max(monthlySpent, actionsMonthlyReservedPln ?? 0) >= pilot.astraSoftMonthlyPln, hardCapScope: env.GITHUB_ACTIONS === 'true' && !dryRun ? 'durable Actions session reservations plus local per-request accounting; not billing control' : 'local checkout, not OpenAI billing control', qualityVerdict: 'not_evaluated', noAutomaticRetries: true };
    save(resolve(directory, 'summary.json'), summary);
    return { directory, summary };
  } finally {
    if (lock !== undefined) { closeSync(lock); unlinkSync(lockPath); }
  }
}
export function cliOptions(args: string[], env: Readonly<Record<string, string | undefined>>): Options {
  const modes = args.filter((a) => a === '--dry-run' || a === '--live');
  if (modes.length !== 1) throw new Error('Specify exactly one of --dry-run or --live.');
  if (args.some((a) => !['--dry-run', '--live'].includes(a) && !/^--repeats=[1-5]$/.test(a) && !/^--effort=(medium|matrix)$/.test(a) && !/^--cases=(all|remaining)$/.test(a) && !/^--payload=(full|compact)$/.test(a))) throw new Error('Unknown argument.');
  const dryRun = modes[0] === '--dry-run';
  if (!dryRun && (!env.BENCH_MAX_RUN_PLN || !env.BENCH_MAX_SESSION_PLN || !env.BENCH_PLN_PER_USD)) throw new Error('Live mode requires explicit run/session limits and FX.');
  return { cases: args.includes('--cases=remaining') ? 'remaining' : 'all', payload: args.includes('--payload=compact') ? 'compact' : 'full', effort: args.includes('--effort=medium') ? 'medium' : 'matrix', dryRun, repeats: Number(args.find((a) => a.startsWith('--repeats='))?.split('=')[1] ?? 1), outputRoot: defaultRoot, fx: positive(env.BENCH_PLN_PER_USD ?? 4, 'FX'), perRunPln: positive(env.BENCH_MAX_RUN_PLN ?? 5, 'run cap'), sessionPln: positive(env.BENCH_MAX_SESSION_PLN ?? 10, 'session cap'), maxOutputTokens: Number(env.BENCH_MAX_OUTPUT_TOKENS ?? 4096), env };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBenchmark(cliOptions(process.argv.slice(2), process.env)).then(({ directory, summary }) => {
    console.log(JSON.stringify({ directory, dryRun: summary.dryRun, runs: summary.runs, valid: summary.results.filter((r) => r.valid).length, stopped: summary.stopped, actualApiCostPln: summary.actualApiCostPln }, null, 2));
    if (summary.stopped || summary.results.some((r) => !r.valid)) process.exitCode = 1;
  }).catch(() => { console.error('Benchmark failed safely. Check explicit mode, configuration and local ledger. No automatic retry.'); process.exitCode = 1; });
}
