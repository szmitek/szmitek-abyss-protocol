import { createHash } from 'node:crypto';
import { clarifyArcCase, arcV2Request } from './prepare-v2.ts';
import { arcCases } from './fixtures.ts';
import { arcRequest } from './prepare.ts';
import { estimateMaximum } from '../weekly-review-benchmark/budget.ts';
import { scoreTemplate } from '../weekly-review-benchmark/scoring.ts';
import type { Options } from '../weekly-review-benchmark/harness.ts';
import type { TestCase } from '../weekly-review-benchmark/fixtures.ts';

// A proposal, not spending authorization. Changes require another reviewed pilot.
export const arcPilot = {
  testcase: 'A01', model: 'gpt-6-astra', effort: 'medium', outputTokens: 4096,
  fx: 4, capPln: 3.60, priceCheckedOn: '2026-09-28',
  requestSha256: '998eff3aedcdf87551ef62eb9beb4749c6cef855df8e296460796a9cfe32bdf2',
} as const;
export function arcPilotCase(): TestCase {
  const test = arcCases().find(c => c.id === arcPilot.testcase);
  if (!test) throw new Error('Frozen arc case missing.');
  return test;
}
export function arcPilotRequest(test: TestCase) {
  if (test.id !== arcPilot.testcase) throw new Error('Only A01 is eligible.');
  const body = arcRequest(test);
  if (createHash('sha256').update(JSON.stringify(body)).digest('hex') !== arcPilot.requestSha256) throw new Error('Frozen A01 request changed; review required.');
  if (estimateMaximum(body, arcPilot.outputTokens, arcPilot.fx).maximumPln > arcPilot.capPln) throw new Error('Frozen request exceeds pilot cap.');
  return body;
}
export function assertArcPilotOptions(options: Options) {
  if (options.v2Model || options.solW01 || options.cases !== 'all' || options.payload !== 'compact' || options.repeats !== 1 || options.effort !== arcPilot.effort || options.fx !== arcPilot.fx || options.maxOutputTokens !== arcPilot.outputTokens || options.perRunPln !== arcPilot.capPln || options.sessionPln !== arcPilot.capPln) throw new Error('Arc A01 configuration is fixed; no widening or other campaign permitted.');
  if (!options.dryRun && (options.env.GITHUB_ACTIONS !== 'true' || options.env.GITHUB_RUN_ATTEMPT !== '1')) throw new Error('New protected Actions run required; no reruns.');
  // Validate the exact payload before any lock, journal reservation or network.
  arcPilotRequest(arcPilotCase());
}
export function arcPilotScore() {
  return { ...scoreTemplate('A01', 'medium', 1), scope: 'single-case pilot, not production certification',
    domainCompleteness: null, practicalUsefulness: null,
    domains: { trainingExecution: null, comparablePerformance: null, effort: null, wellbeing: null, measurements: null, movementChecks: null, nextArcPriorityOrQuestion: null },
    gate: 'Each scored dimension >=3/4, valid output, zero unsupported claims and critical violations; stability remains untested with one response.' };
}

export const arcPilotV2 = { ...arcPilot, capPln: 3.70, requestSha256: '59dd43a1d0402ca269a860b62bd0c53db2077e53a212c78a1bf9a8fbc258c56f' } as const;
export function arcPilotV2Case() { return clarifyArcCase(arcPilotCase()); }
export function arcPilotV2Request(test: TestCase) {
  if (test.id !== 'A01') throw new Error('Only A01 v2 is eligible.');
  const body = arcV2Request(test);
  if (createHash('sha256').update(JSON.stringify(body)).digest('hex') !== arcPilotV2.requestSha256) throw new Error('Frozen A01 v2 request changed; review required.');
  if (estimateMaximum(body, 4096, 4).maximumPln > arcPilotV2.capPln) throw new Error('A01 v2 exceeds cap.');
  return body;
}
export function assertArcPilotV2Options(options: Options) {
  if (options.arcA01 || options.perRunPln !== 3.70 || options.sessionPln !== 3.70) throw new Error('A01 v2 configuration is fixed.');
  assertArcPilotOptions({ ...options, perRunPln: arcPilot.capPln, sessionPln: arcPilot.capPln });
  arcPilotV2Request(arcPilotV2Case());
}
