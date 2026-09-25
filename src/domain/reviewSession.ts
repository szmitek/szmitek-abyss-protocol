import { isMeasurementDay } from './bodyMeasurements.ts';
import type { AIProvider, AIResult, ProgressReview, ReviewPeriod, WeeklyReviewInput } from './aiContracts.ts';
import type { AppSnapshot } from './types.ts';
import { buildWeeklyReview } from './weeklyReview.ts';
import { validateProgressResponse } from './reviewValidation.ts';

export const MOCK_REVIEW_LABEL = 'DEVELOPMENT MOCK — not an AI analysis';
export function shiftReviewDay(day: string, days: number): string {
  if (!isMeasurementDay(day) || !Number.isInteger(days)) throw new Error('Invalid calendar date.');
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function latestCompletedReviewWeek(today: string): string {
  if (!isMeasurementDay(today)) throw new Error('Invalid calendar date.');
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  return shiftReviewDay(today, -(weekday || 7));
}
export function prepareWeeklySummary(snapshot: AppSnapshot, weekEnd: string, timeZone: string): WeeklyReviewInput {
  if (!isMeasurementDay(weekEnd) || new Date(`${weekEnd}T12:00:00Z`).getUTCDay() !== 0) throw new Error('Choose a completed Monday–Sunday week.');
  return buildWeeklyReview(snapshot, { from: shiftReviewDay(weekEnd, -6), to: weekEnd, timeZone, bounds: 'inclusive-local-dates' }, `summary:${weekEnd}`);
}
export function prepareWeeklyReview(snapshot: AppSnapshot, weekEnd: string, timeZone: string): WeeklyReviewInput {
  if (!isMeasurementDay(weekEnd) || new Date(`${weekEnd}T12:00:00Z`).getUTCDay() !== 0) throw new Error('Choose a completed Monday–Sunday week.');
  const period: ReviewPeriod = { from: shiftReviewDay(weekEnd, -6), to: weekEnd, timeZone, bounds: 'inclusive-local-dates' };
  const input = buildWeeklyReview(snapshot, period, `weekly:${period.from}:${period.to}`);
  const context = buildWeeklyReview(snapshot, { ...period, from: shiftReviewDay(weekEnd, -27) }, `context:${weekEnd}`);
  // Facts for the four-week scope have separate IDs even when the metric matches.
  const { requestId, ...historyContext } = context;
  void requestId; // Only the selected week owns the provider request identifier.
  input.historyContext = { ...historyContext, facts: context.facts.map((f) => ({ ...f, id: `history:${f.id}` })) };
  return input;
}
export function reviewRevision(input: WeeklyReviewInput): string {
  // Exact local equality, not a security hash. Never transmitted or persisted.
  return JSON.stringify(input);
}

export type ReviewRunResult = AIResult<ProgressReview> | { ok: false; error: { code: 'invalid_output'; message: string } };
export async function runWeeklyReview(provider: AIProvider, input: WeeklyReviewInput, signal?: AbortSignal): Promise<ReviewRunResult> {
  if (signal?.aborted) return { ok: false, error: { code: 'cancelled', message: 'Review cancelled.' } };
  try {
    const capabilities = provider.capabilities();
    // Explicit package boundary. A future approved execution policy replaces this
    // gate; UI, review contracts and evidence validation do not depend on an SDK.
    if (capabilities.mode !== 'mock' || !capabilities.progress) return { ok: false, error: { code: 'unsupported', message: 'Only the offline development mock is enabled.' } };
    const detached = JSON.parse(JSON.stringify(input)) as WeeklyReviewInput;
    const response: unknown = await provider.analyzeProgress(detached, { allowNetwork: false, ...(signal ? { signal } : {}) });
    if (signal?.aborted) return { ok: false, error: { code: 'cancelled', message: 'Review cancelled.' } };
    const validated = validateProgressResponse(response, input, provider.id, capabilities.mode);
    if (!validated.ok) return { ok: false, error: { code: 'invalid_output', message: 'Review rejected: the response did not match its contract or evidence.' } };
    return validated.result;
  } catch {
    return { ok: false, error: { code: 'unavailable', message: 'The local review could not be prepared. Try again.' } };
  }
}
