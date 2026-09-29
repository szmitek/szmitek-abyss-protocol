// Offline experiment only. Never imported by the mobile app or paid runner.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { arcCases } from './fixtures.ts';
import { arcPrompt } from './prepare.ts';
import { makeRequest, dryResponse, evaluateResponse } from '../weekly-review-benchmark/adapter.ts';
import type { TestCase } from '../weekly-review-benchmark/fixtures.ts';
import { estimateMaximum } from '../weekly-review-benchmark/budget.ts';

export const arcV2PromptVersion = 'arc-review.offline.v2';
export const arcV2InputVersion = 'arc-review.boundary-clarification.v2';
const oldBoundaryText = 'Reassessment-day training belongs to the next arc; boundary movement checks are supplied separately. Historical verdicts may use different boundaries.';
export const boundaryText = 'Only this arc\'s explicitly linked checkpoints.completion defines its completion boundary. Training on that linked completion date is excluded from this arc; the supplied period already applies that boundary. A test labelled reassessment that is not linked as checkpoints.completion does not itself close this arc or reassign any training. A null completion means no linked completion checkpoint, not a conflict with interim tests. Historical verdicts may use different boundaries.';
export const arcV2Prompt = arcPrompt + `
Interpret the selected period and arcContext.checkpoints together: only the linked completion checkpoint closes this arc. Do not infer another boundary from a test's kind or date alone. A full nominal four-week date range can still lack a completion checkpoint; describe that precisely rather than suggesting the supplied date range is shorter. Flag actual inconsistencies between the period, state and linked checkpoint without silently fixing data.
For each exercise's logged exposures, explicitly review actualVolume against prescribedVolume when both are available in that exposure's unit. Describe above, equal to or below the recorded target and cite the exposure evidence, alongside effort and wellbeing when relevant. Reproduce supplied numbers only; do not calculate new differences, percentages or aggregate adherence. A missing actual or target means comparison unavailable, never zero or success. Recorded targets apply to those exposures only, not a recovered full historical plan. Exceeding a target is not automatically better, unsafe or the cause of poor wellbeing; ask about the reason when it matters. Do not compare unlike units or machines. Do not force a change, diagnosis or unsupported recommendation. Cover a material execution-versus-target pattern or explicitly acknowledge unavailable comparison data.`;

export function clarifyArcCase(original: TestCase): TestCase {
  const test = structuredClone(original);
  const context = test.input.arcContext;
  if (!context || context.limitations.filter(s => s === oldBoundaryText).length !== 1) throw new Error('Known boundary wording changed; review the experiment before preparing v2.');
  // Only the misleading application-authored explanation changes. Records,
  // calculations, adversarial mutations and evidence IDs remain untouched.
  context.limitations = context.limitations.map(s => s === oldBoundaryText ? boundaryText : s);
  return test;
}
export function arcV2Request(test: TestCase) {
  const body = makeRequest(test, 'medium', 4096, 'compact');
  return { ...body, input: [{ role: 'system', content: arcV2Prompt }, body.input[1]!] };
}
export async function prepareArcV2(root: string) {
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const save = (name: string, value: unknown) => writeFileSync(resolve(root, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const rows = [];
  for (const original of arcCases()) {
    const test = clarifyArcCase(original), request = arcV2Request(test);
    const raw = await dryResponse(test), validation = evaluateResponse(raw, test, true);
    if (!validation.valid) throw new Error('V2 mock rejected by production validator.');
    save(`${test.id}.request.json`, request);
    save(`${test.id}.raw.json`, JSON.parse(raw.rawBody));
    save(`${test.id}.result.json`, { label: 'DRY RUN / NOT MODEL OUTPUT', valid: true, usage: null, actualCostPln: 0, quality: 'NOT_EVALUATED' });
    rows.push({ id: test.id, mutation: test.mutation, requestSha256: createHash('sha256').update(JSON.stringify(request)).digest('hex'), estimateAtRecordedTariffFx4: estimateMaximum(request, 4096, 4), quality: 'NOT_EVALUATED' });
  }
  const manifest = { promptVersion: arcV2PromptVersion, inputVersion: arcV2InputVersion, responseContract: 'progress-review.v1', mode: 'offline-only', apiCalls: 0, costPln: 0, rows };
  save('manifest.json', manifest);
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3 || process.argv[2]!.startsWith('--')) throw new Error('Supply a new output directory. No live mode exists.');
  globalThis.fetch = () => { throw new Error('HTTP forbidden in v2 preparation.'); };
  prepareArcV2(resolve(process.argv[2]!)).then(r => console.log(JSON.stringify({ cases: r.rows.length, apiCalls: r.apiCalls, costPln: r.costPln }))).catch(() => { console.error('Offline v2 preparation failed.'); process.exitCode = 1; });
}
