import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { configurationVerdict, type Assessment } from './scoring.ts';

// Offline human-scoring pass. Does not import adapter or perform model calls.
const directory = resolve(process.argv[2] ?? '');
const summary = JSON.parse(readFileSync(resolve(directory, 'summary.json'), 'utf8'));
const assessments = JSON.parse(readFileSync(resolve(directory, 'scores.json'), 'utf8')) as (Assessment & { testcaseId: string; effort: string; repeat: number })[];
const key = (r: { testcaseId: string; effort: string; repeat: number }) => `${r.testcaseId}-${r.effort}-${r.repeat}`;
if (!Array.isArray(assessments) || new Set(assessments.map(key)).size !== assessments.length) throw new Error('Duplicate/invalid assessments.');
const runs = summary.results as { testcaseId: string; effort: string; repeat: number; valid: boolean; dryRun: boolean }[];
const rows = runs.map((r) => {
  const assessment = assessments.find((a) => key(a) === key(r));
  if (!assessment) throw new Error('Missing assessment.');
  return { ...r, assessment };
});
const perCase = [...new Set(rows.map((r) => `${r.testcaseId}:${r.effort}`))].map((id) => {
  const selected = rows.filter((r) => `${r.testcaseId}:${r.effort}` === id);
  const records = selected.map((r) => JSON.parse(readFileSync(resolve(directory, `${key(r)}.result.json`), 'utf8')));
  const latencies = records.map((r) => r.latencyMs as number).sort((a, b) => a - b);
  let verdict = configurationVerdict(selected);
  if (verdict === 'pilot_gate_passed_not_production_certification' && selected.length < 3) verdict = 'pending_repeat_testing';
  return { id, repeats: selected.length, verdict, structureValid: selected.filter((r) => r.valid).length, latencyMs: { min: latencies[0], max: latencies.at(-1), median: latencies.length % 2 ? latencies[Math.floor(latencies.length / 2)] : (latencies[latencies.length / 2 - 1]! + latencies[latencies.length / 2]!) / 2 }, accountedCostPln: records.reduce((sum, r) => sum + r.chargedPln, 0), assessments: selected.map((r) => r.assessment) };
});
const configurations = ['medium', 'high'].map((effort) => {
  let verdict = configurationVerdict(rows.filter((r) => r.effort === effort));
  const subset = perCase.filter((r) => r.id.endsWith(`:${effort}`));
  if (verdict === 'pilot_gate_passed_not_production_certification' && (subset.length !== (effort === 'medium' ? 8 : 4) || subset.some((r) => r.repeats < 3))) verdict = 'incomplete_matrix_or_repeats';
  return { effort, verdict };
});
writeFileSync(resolve(directory, 'scored-summary.json'), JSON.stringify({ label: summary.dryRun ? 'DRY RUN — not model quality' : 'Human-scored benchmark; not a medical validation', perCase, configurations }, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify(configurations));
