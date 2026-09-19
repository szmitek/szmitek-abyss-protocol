import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cliOptions, runBenchmark } from './harness.ts';
export function v2Options(args: string[], env: Readonly<Record<string, string | undefined>>) {
  if (args.length !== 2 || !['--dry-run', '--live'].includes(args[0]!) || !['--model=sol', '--model=astra'].includes(args[1]!)) throw new Error('Fixed v2 W01 mode and model required.');
  const v2Model = args[1] === '--model=sol' ? 'sol' : 'astra';
  const cap = v2Model === 'sol' ? '1.80' : '4.40';
  if (args[0] === '--live' && (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_RUN_ATTEMPT !== '1')) throw new Error('New protected Actions run required; no reruns.');
  const options = cliOptions([args[0]!, '--effort=medium', '--repeats=1', '--payload=compact'], { ...env, BENCH_MAX_RUN_PLN: env.BENCH_MAX_RUN_PLN ?? cap, BENCH_MAX_SESSION_PLN: env.BENCH_MAX_SESSION_PLN ?? cap });
  return { ...options, v2Model: v2Model as 'sol' | 'astra' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBenchmark(v2Options(process.argv.slice(2), process.env)).then(({ summary }) => {
    console.log(JSON.stringify({ model: summary.model, promptVersion: summary.promptVersion, dryRun: summary.dryRun, runs: summary.runs, stopped: summary.stopped, valid: summary.results.filter(r => r.valid).length }));
    if (summary.stopped || summary.results.some(r => !r.valid)) process.exitCode = 1;
  }).catch(() => { console.error('V2 W01 stopped safely; no retry or budget increase.'); process.exitCode = 1; });
}
