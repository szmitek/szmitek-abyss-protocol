import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cliOptions, runBenchmark } from './harness.ts';
export function solOptions(args: string[], env: Readonly<Record<string, string | undefined>>) {
  if (args.length !== 1 || !['--dry-run', '--live'].includes(args[0]!)) throw new Error('One fixed Sol W01 mode required.');
  const fixed = { ...env, BENCH_MAX_RUN_PLN: env.BENCH_MAX_RUN_PLN ?? '2.10', BENCH_MAX_SESSION_PLN: env.BENCH_MAX_SESSION_PLN ?? '2.10' };
  if (args[0] === '--live' && (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_RUN_ATTEMPT !== '1')) throw new Error('Live Sol W01 requires a new protected Actions run; no reruns.');
  return { ...cliOptions([...args, '--effort=medium', '--repeats=1'], fixed), solW01: true };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBenchmark(solOptions(process.argv.slice(2), process.env)).then(({ summary }) => {
    console.log(JSON.stringify({ dryRun: summary.dryRun, runs: summary.runs, stopped: summary.stopped, valid: summary.results.filter(r => r.valid).length }));
    if (summary.stopped || summary.results.some(r => !r.valid)) process.exitCode = 1;
  }).catch(() => { console.error('Sol W01 stopped safely; no retry.'); process.exitCode = 1; });
}
