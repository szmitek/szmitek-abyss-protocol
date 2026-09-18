// No live option, no credentials, no transport calls.
import process from 'node:process';
import console from 'node:console';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { weeklyCases } from './fixtures.ts';
import { dryResponse, evaluateResponse } from './adapter.ts';
import { completenessRequest, completenessPromptVersion } from './completeness-v2.ts';
import { estimateMaximum, solPrice } from './budget.ts';
if (process.argv.length !== 3 || process.argv[2].startsWith('--')) throw Error('Supply a new output directory; live mode does not exist.');
globalThis.fetch = () => { throw Error('Network forbidden'); };
const root = resolve(process.argv[2]);
mkdirSync(root, { recursive: true });
const save = (name, x) => writeFileSync(resolve(root, name), JSON.stringify(x, null, 2)+'\n', { flag: 'wx' });
const rows = [];
for (const test of weeklyCases().filter(t => ['W01', 'W02', 'W03'].includes(t.id))) {
  const body = completenessRequest(test, 'gpt-5.6-sol');
  const response = await dryResponse(test);
  assert.equal(evaluateResponse(response, test, true).valid, true);
  save(`${test.id}.request.json`, body);
  save(`${test.id}.mock.json`, { label: 'MOCK — NOT A RESPONSE TO V2 PROMPT; QUALITY NOT EVALUATED', raw: JSON.parse(response.rawBody) });
  rows.push({ testcaseId: test.id, requestSha256: createHash('sha256').update(JSON.stringify(body)).digest('hex'), estimate: estimateMaximum(body, 4096, 4, solPrice), completeness: null, prioritization: null, actionability: null, readability: null, criticalViolations: null });
}
save('manifest.json', { promptVersion: completenessPromptVersion, dryRun: true, apiCalls: 0, costPln: 0, quality: 'NOT_EVALUATED', rows });
console.log(JSON.stringify({ requestFiles: rows.length, mockValidationPassed: rows.length, apiCalls: 0, costPln: 0, quality: 'NOT_EVALUATED' }));
