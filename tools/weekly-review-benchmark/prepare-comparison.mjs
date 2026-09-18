// OFFLINE ONLY: no transport, credentials, environment, or live execution path.
import process from 'node:process';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { weeklyCases } from './fixtures.ts';
import { makeRequest, dryResponse, evaluateResponse } from './adapter.ts';
import { dimensions } from './scoring.ts';

const [baselinePath, outputPath] = process.argv.slice(2);
if (!baselinePath || !outputPath || process.argv.length !== 4) throw Error('Usage: node --experimental-strip-types tools/weekly-review-benchmark/prepare-comparison.mjs W01.request.json OUTPUT_DIRECTORY');
globalThis.fetch = () => { throw Error('Network forbidden in offline preparation'); };
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
assert.equal(baseline.model, 'gpt-6-astra');
assert.equal(baseline.reasoning.effort, 'medium');
assert.equal(baseline.max_output_tokens, 4096);
assert.equal(baseline.store, false);
assert.equal(JSON.parse(baseline.input[1].content).review.requestId, 'benchmark:W01');
const root = resolve(outputPath);
mkdirSync(root, { recursive: true });
const save = (name, value) => writeFileSync(resolve(root, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const requests = [{ id: 'screen-W01-sol', caseId: 'W01', body: { ...baseline, model: 'gpt-5.6-sol' }, phase: 'screen', payload: 'original-artifact' }];
assert.deepEqual({ ...requests[0].body, model: baseline.model }, baseline);
for (const id of ['W02', 'W03']) {
  const test = weeklyCases().find(t => t.id === id);
  const body = makeRequest(test, 'medium', 4096, 'compact');
  requests.push({ id: `compare-${id}-astra`, caseId: id, body, phase: 'conditional-comparison', payload: 'compact' });
  requests.push({ id: `compare-${id}-sol`, caseId: id, body: { ...body, model: 'gpt-5.6-sol' }, phase: 'conditional-comparison', payload: 'compact' });
}
const manifest = [];
for (const r of requests) {
  const { model, ...controlled } = r.body;
  const inputCeiling = Buffer.byteLength(JSON.stringify(r.body)) + 4096;
  assert.ok(inputCeiling < 272000);
  const rates = model === 'gpt-5.6-sol' ? { write: 5, output: 20 } : { write: 12.5, output: 50 };
  const ceilingPln = (inputCeiling * rates.write + r.body.max_output_tokens * rates.output) / 1e6 * 4;
  save(`${r.id}.request.json`, r.body);
  manifest.push({ id: r.id, caseId: r.caseId, phase: r.phase, payload: r.payload, model, effort: 'medium', requestSha256: hash(r.body), controlledFieldsSha256: hash(controlled), byteBasedReservationPln: ceilingPln });
}
for (const id of ['W02', 'W03']) {
  const pair = manifest.filter(r => r.caseId === id);
  assert.equal(pair[0].controlledFieldsSha256, pair[1].controlledFieldsSha256);
}
// This checks fixture/validator compatibility only. It is not model performance.
const validation = [];
for (const id of ['W01', 'W02', 'W03']) {
  const test = weeklyCases().find(t => t.id === id);
  const result = evaluateResponse(await dryResponse(test), test, true);
  assert.equal(result.valid, true);
  validation.push({ testcaseId: id, mockValid: result.valid, modelQuality: 'NOT_EVALUATED' });
}
save('human-scores.DO-NOT-SEND.json', manifest.map(r => ({ candidateId: r.id, blindLabel: null, reviewStatus: 'pending', scores: Object.fromEntries([...dimensions, 'prioritization', 'actionability', 'readability'].map(d => [d, null])), criticalViolations: null, unsupportedClaims: null, requiredBehaviorsMet: null, stability: 'not_evaluated_single_sample', notes: '' })));
save('manifest.json', { offlineOnly: true, paidAuthorized: false, apiRequests: 0, apiCostPln: 0, baselineRequestSha256: hash(baseline), pricingAssumptionDate: '2026-09-18', plnPerUsd: 4, pricingRequiresRecheckBeforeLive: true, requests: manifest, mockValidation: validation });
console.log(JSON.stringify({ offlineOnly: true, requestFiles: manifest.length, mockValid: validation.length, apiRequests: 0, apiCostPln: 0, screenReservationPln: manifest[0].byteBasedReservationPln, output: root }));
