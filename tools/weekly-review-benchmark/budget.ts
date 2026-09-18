// Standard short-context rates; verified 2026-09-18. No tools or regional uplift.
// https://developers.openai.com/api/docs/pricing
// https://developers.openai.com/api/docs/guides/prompt-caching
export const price = { inputPerMillionUsd: 10, cachedInputPerMillionUsd: 1, cacheWritePerMillionUsd: 12.5, outputPerMillionUsd: 50, checkedOn: '2026-09-18' };
export const solPrice = { inputPerMillionUsd: 4, cachedInputPerMillionUsd: 0.4, cacheWritePerMillionUsd: 5, outputPerMillionUsd: 20, checkedOn: '2026-09-18' };
export const pilot = { astraSoftMonthlyPln: 5, projectHardMonthlyPln: 10 };
export function positive(value: unknown, label: string): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid ${label}.`);
  return n;
}
export function estimateMaximum(body: unknown, maxOutput: number, plnPerUsd: number, rates = price) {
  positive(plnPerUsd, 'FX'); positive(maxOutput, 'output limit');
  // Conservative byte ceiling for text-only input, plus 4096 serialization/framing
  // tokens. Not a provider token count or a guarantee of provider accounting.
  const inputCeiling = Buffer.byteLength(JSON.stringify(body), 'utf8') + 4096;
  if (inputCeiling > 272000) throw new Error('Input exceeds benchmark standard-price ceiling.');
  return { basis: 'UTF-8 byte ceiling + 4096 framing, all input at cache-write rate, full output cap; no assumed cache hits', inputTokenCeiling: inputCeiling, outputTokenCeiling: maxOutput, maximumPln: (inputCeiling * rates.cacheWritePerMillionUsd + maxOutput * rates.outputPerMillionUsd) / 1e6 * plnPerUsd };
}
export function usageCost(usage: Record<string, unknown> | null, fx: number, rates = price) {
  positive(fx, 'FX');
  if (!usage) return null;
  const count = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  const input = usage.input_tokens, output = usage.output_tokens;
  if (!count(input) || !count(output) || input > 272000) return null;
  const details = usage.input_tokens_details ?? {};
  const outDetails = usage.output_tokens_details ?? {};
  if (typeof details !== 'object' || Array.isArray(details) || typeof outDetails !== 'object' || Array.isArray(outDetails)) return null;
  const d = details as Record<string, unknown>, o = outDetails as Record<string, unknown>;
  // Missing cache-write accounting is unknown, not proof of a free/ordinary input.
  if (input > 0 && (d.cache_write_tokens === undefined || d.cached_tokens === undefined)) return null;
  const cached = d.cached_tokens ?? 0, written = d.cache_write_tokens ?? 0, reasoning = o.reasoning_tokens ?? null;
  if (!count(cached) || !count(written) || cached + written > input || reasoning !== null && (!count(reasoning) || reasoning > output)) return null;
  if (usage.total_tokens !== undefined && (!count(usage.total_tokens) || usage.total_tokens !== input + output)) return null;
  const ordinary = input - cached - written;
  // Reasoning is a subset of output_tokens, never an extra charge.
  const breakdownUsd = { normalInput: ordinary * rates.inputPerMillionUsd / 1e6, cacheWrite: written * rates.cacheWritePerMillionUsd / 1e6, cacheRead: cached * rates.cachedInputPerMillionUsd / 1e6, output: output * rates.outputPerMillionUsd / 1e6 };
  const usd = (ordinary * Math.round(rates.inputPerMillionUsd * 1000) + written * Math.round(rates.cacheWritePerMillionUsd * 1000) + cached * Math.round(rates.cachedInputPerMillionUsd * 1000) + output * Math.round(rates.outputPerMillionUsd * 1000)) / 1e9;
  if (!Number.isSafeInteger(ordinary * Math.round(rates.inputPerMillionUsd * 1000) + written * Math.round(rates.cacheWritePerMillionUsd * 1000) + cached * Math.round(rates.cachedInputPerMillionUsd * 1000) + output * Math.round(rates.outputPerMillionUsd * 1000))) return null;
  return { inputTokens: input, ordinaryInputTokens: ordinary, cacheWriteTokens: written, cachedInputTokens: cached, outputTokens: output, reasoningTokens: reasoning, visibleOutputTokens: reasoning === null ? null : output - reasoning, breakdownUsd, usd, pln: usd * fx, basis: 'reported usage × recorded pricing, including cache writes; not an invoice' };
}
export function reserveCost(maximum: number, spentSession: number, spentMonth: number, perRun: number, sessionCap: number) {
  for (const value of [maximum, perRun, sessionCap]) positive(value, 'budget');
  if (![spentSession, spentMonth].every((n) => Number.isFinite(n) && n >= 0)) throw new Error('Invalid spending ledger.');
  if (maximum > perRun || spentSession + maximum > sessionCap || spentMonth + maximum > pilot.projectHardMonthlyPln) throw new Error('Budget stop before request; limits were not increased.');
  return spentMonth + maximum;
}
