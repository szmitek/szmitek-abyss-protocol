// Offline only: deliberately no live switch, credentials or workflow.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { arcCases } from './fixtures.ts';
import { makeRequest, dryResponse, evaluateResponse } from '../weekly-review-benchmark/adapter.ts';
import { estimateMaximum } from '../weekly-review-benchmark/budget.ts';
import { systemPrompt } from '../weekly-review-benchmark/contract.ts';

export const arcPromptVersion = 'arc-review.offline.v1';
export const arcPrompt = systemPrompt
  .replace('Analyze the selected week and distinguish the separate four-week historyContext.', 'Analyze exactly the supplied arc period. arcContext labels partial/completed scope and current settings. No overlapping history is supplied.')
  .replace('This is Weekly Review only:', 'This is a text-only Arc Review preparation:')
  .replace('for the review week', 'for the selected arc period') + `
Consider all supplied domains and their coverage: comparable exercise exposures, effort, wellbeing, body measurements and self-reported movement checks. A changed current goal is not evidence of the original goal. A saved weekly frequency is not a complete historical attendance schedule. The original exercise-by-exercise arc plan is unavailable.
Explain what changed, what merits attention, at most two supported priorities to discuss for the next arc, and how to assess those priorities using existing logs or measurements. A priority may be gathering missing data; do not force a training intervention. No exercise replacements or new load prescriptions. Unchanged plans can be appropriate, but this contract cannot approve a plan. Keep claims concise and traceable. No photos have been seen. Previous AI interpretations are not facts.`;
export function arcRequest(test: ReturnType<typeof arcCases>[number]) {
  const body = makeRequest(test, 'medium', 4096, 'compact');
  return { ...body, input: [{ role: 'system', content: arcPrompt }, body.input[1]!] };
}
export async function prepareArcBenchmark(root: string) {
  mkdirSync(root, { recursive: true });
  const save = (name: string, data: unknown) => writeFileSync(resolve(root, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const rows = [];
  for (const test of arcCases()) {
    const request = arcRequest(test);
    const raw = await dryResponse(test);
    const result = evaluateResponse(raw, test, true);
    if (!result.valid) throw new Error('Offline mock validation failed.');
    save(`${test.id}.request.json`, request);
    save(`${test.id}.raw.json`, JSON.parse(raw.rawBody));
    save(`${test.id}.result.json`, { label: 'DRY RUN / NOT MODEL OUTPUT', validation: result.valid, actualCostPln: 0, usage: null });
    rows.push({ id: test.id, title: test.title, mutation: test.mutation, requestSha256: createHash('sha256').update(JSON.stringify(request)).digest('hex'), estimateAtRecordedTariffFx4: estimateMaximum(request, 4096, 4), fidelity: null, usefulness: null, coverage: null, confidence: null, criticalViolations: null, quality: 'NOT_EVALUATED' });
  }
  const manifest = { promptVersion: arcPromptVersion, contract: 'progress-review.v1', mode: 'offline-only', apiCalls: 0, costPln: 0, rows };
  save('manifest.json', manifest);
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3 || process.argv[2]!.startsWith('--')) throw new Error('Supply a new output directory. No live mode exists.');
  globalThis.fetch = () => { throw new Error('Network forbidden in offline preparation.'); };
  prepareArcBenchmark(resolve(process.argv[2]!)).then(r => console.log(JSON.stringify({ cases: r.rows.length, apiCalls: r.apiCalls, costPln: r.costPln }))).catch(() => { console.error('Offline preparation failed.'); process.exitCode = 1; });
}
