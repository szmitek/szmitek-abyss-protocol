import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cliOptions, runBenchmark } from '../weekly-review-benchmark/harness.ts';
import { arcPilotV2, assertArcPilotV2Options } from './pilotConfig.ts';

export function arcA01V2Options(args: string[], env: Readonly<Record<string, string | undefined>>) {
  if (args.length !== 1 || !['--dry-run', '--live'].includes(args[0]!)) throw new Error('Exactly one A01 mode required; no model, case, effort or repeat options.');
  const options = { ...cliOptions([args[0]!, '--effort=medium', '--repeats=1', '--payload=compact'], {
    ...env, BENCH_MAX_RUN_PLN: env.BENCH_MAX_RUN_PLN ?? String(arcPilotV2.capPln),
    BENCH_MAX_SESSION_PLN: env.BENCH_MAX_SESSION_PLN ?? String(arcPilotV2.capPln),
    BENCH_PLN_PER_USD: env.BENCH_PLN_PER_USD ?? String(arcPilotV2.fx),
    BENCH_MAX_OUTPUT_TOKENS: env.BENCH_MAX_OUTPUT_TOKENS ?? String(arcPilotV2.outputTokens),
  }), arcA01V2: true };
  assertArcPilotV2Options(options);
  return options;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dry = process.argv.slice(2).length === 1 && process.argv[2] === '--dry-run';
  if (dry) globalThis.fetch = () => { throw new Error('HTTP forbidden in Arc A01 v2 dry-run.'); };
  runBenchmark(arcA01V2Options(process.argv.slice(2), process.env)).then(({ summary }) => {
    console.log(JSON.stringify({ case: summary.selectedCases, dryRun: summary.dryRun, runs: summary.runs, valid: summary.results.filter(r => r.valid).length, stopped: summary.stopped }));
    if (summary.stopped || summary.results.some(r => !r.valid)) process.exitCode = 1;
  }).catch(() => { console.error('Arc A01 v2 stopped safely; no retry or budget increase.'); process.exitCode = 1; });
}
