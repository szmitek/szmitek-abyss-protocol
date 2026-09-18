import { pilot, positive } from './budget.ts';
import type { SecretEnvironment } from './security.ts';

// Operational metadata only: never inputs, responses, headers or credentials.
export interface BudgetJournal {
  version: 1;
  reservations: { runId: string; month: string; microPln: number }[];
}
const repository = 'szmitek/szmitek-abyss-protocol';
const branch = 'benchmark-budget';
const endpoint = `https://api.github.com/repos/${repository}/contents/budget.json`;
const failure = () => new Error('Durable budget unavailable or exhausted; no model request permitted.');

export function reserveSession(value: unknown, runId: string, month: string, sessionPln: number): BudgetJournal {
  if (!/^\d+$/.test(runId) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw failure();
  const budget = value as BudgetJournal | null;
  if (!budget || budget.version !== 1 || !Array.isArray(budget.reservations)) throw failure();
  const ids = new Set<string>();
  let reserved = 0;
  for (const item of budget.reservations) {
    if (!item || typeof item.runId !== 'string' || typeof item.month !== 'string' || !/^\d+$/.test(item.runId) || ids.has(item.runId) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month) || item.month > month || !Number.isSafeInteger(item.microPln) || item.microPln <= 0) throw failure();
    ids.add(item.runId);
    if (item.month === month) reserved += item.microPln;
  }
  const amount = Math.ceil(positive(sessionPln, 'session limit') * 1e6);
  // Rerunning any attempt of the same Actions run cannot replay paid calls.
  if (ids.has(runId) || !Number.isSafeInteger(reserved + amount) || reserved + amount > pilot.projectHardMonthlyPln * 1e6) throw failure();
  return { version: 1, reservations: [...budget.reservations.map(({ runId, month, microPln }) => ({ runId, month, microPln })), { runId, month, microPln: amount }] };
}

export async function reserveActionsSession(env: SecretEnvironment, sessionPln: number, month: string): Promise<number> {
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REPOSITORY !== repository || env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.BENCH_ALLOW_PAID !== 'YES' || !env.GITHUB_TOKEN || /\s/.test(env.GITHUB_TOKEN) || !env.GITHUB_RUN_ID) throw failure();
  const headers = { 'Content-Type': 'application/json', Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' };
  try {
    const current = await fetch(`${endpoint}?ref=${branch}`, { headers, redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!current.ok) throw failure(); // Including 404: never initialize silently.
    const file = await current.json() as { sha?: unknown; encoding?: unknown; content?: unknown };
    if (typeof file.sha !== 'string' || !/^[a-f0-9]{40}$/.test(file.sha) || file.encoding !== 'base64' || typeof file.content !== 'string') throw failure();
    const next = reserveSession(JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')), env.GITHUB_RUN_ID, month, sessionPln);
    // SHA compare-and-set. A conflict, timeout or unknown write outcome stops;
    // never retry or refund automatically, including after runner cancellation.
    const updated = await fetch(endpoint, { method: 'PUT', headers, redirect: 'error', signal: AbortSignal.timeout(30000), body: JSON.stringify({ branch, sha: file.sha, message: `Reserve benchmark session ${env.GITHUB_RUN_ID}`, content: Buffer.from(JSON.stringify(next, null, 2) + '\n').toString('base64') }) });
    if (!updated.ok) throw failure();
    return next.reservations.filter((r) => r.month === month).reduce((sum, r) => sum + r.microPln, 0) / 1e6;
  } catch { throw failure(); } // Never propagate HTTP bodies/headers/errors.
}
