// USD rates verified 2026-09-18; Standard, <=272K input, no tools/cache-write tiers.
export const price = { inputPerMillionUsd: 10, cachedInputPerMillionUsd: 1, outputPerMillionUsd: 50, checkedOn: '2026-09-18' };
export const pilot = { astraSoftMonthlyPln: 5, projectHardMonthlyPln: 10 };
export function positive(value: unknown, label: string): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid ${label}.`);
  return n;
}
export function estimateMaximum(body: unknown, maxOutput: number, plnPerUsd: number) {
  positive(plnPerUsd, 'FX'); positive(maxOutput, 'output limit');
  // Conservative byte ceiling for text-only input, plus 4096 serialization/framing
  // tokens. Not a provider token count or a guarantee of provider accounting.
  const inputCeiling = Buffer.byteLength(JSON.stringify(body), 'utf8') + 4096;
  if (inputCeiling > 272000) throw new Error('Input exceeds benchmark standard-price ceiling.');
  return { inputTokenCeiling: inputCeiling, outputTokenCeiling: maxOutput, maximumPln: (inputCeiling * price.inputPerMillionUsd + maxOutput * price.outputPerMillionUsd) / 1e6 * plnPerUsd };
}
export function usageCost(usage: Record<string, unknown> | null, fx: number) {
  if (!usage) return null;
  const input = usage.input_tokens, output = usage.output_tokens;
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 0 || typeof output !== 'number' || !Number.isSafeInteger(output) || output < 0) return null;
  const details = usage.input_tokens_details as Record<string, unknown> | undefined;
  const outDetails = usage.output_tokens_details as Record<string, unknown> | undefined;
  const cached = details?.cached_tokens ?? 0, reasoning = outDetails?.reasoning_tokens ?? null;
  if (typeof cached !== 'number' || !Number.isSafeInteger(cached) || cached < 0 || cached > input || reasoning !== null && (typeof reasoning !== 'number' || !Number.isSafeInteger(reasoning) || reasoning < 0 || reasoning > output)) return null;
  const usd = ((input - cached) * price.inputPerMillionUsd + cached * price.cachedInputPerMillionUsd + output * price.outputPerMillionUsd) / 1e6;
  return { inputTokens: input, cachedInputTokens: cached, outputTokens: output, reasoningTokens: reasoning, usd, pln: usd * fx, basis: 'reported usage × recorded pricing; not an invoice' };
}
export function reserveCost(maximum: number, spentSession: number, spentMonth: number, perRun: number, sessionCap: number) {
  for (const value of [maximum, perRun, sessionCap]) positive(value, 'budget');
  if (![spentSession, spentMonth].every((n) => Number.isFinite(n) && n >= 0)) throw new Error('Invalid spending ledger.');
  if (maximum > perRun || spentSession + maximum > sessionCap || spentMonth + maximum > pilot.projectHardMonthlyPln) throw new Error('Budget stop before request; limits were not increased.');
  return spentMonth + maximum;
}
