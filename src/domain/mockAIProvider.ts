import type { AIExecutionPolicy, AIProvider, AIResult, ProgressReview, ReplacementInput, ReplacementReview, WeeklyReviewInput } from './aiContracts.ts';

const provenance = { providerId: 'mock-v1', mode: 'mock' as const, label: 'DEVELOPMENT MOCK — not an AI analysis' };
export class MockAIProvider implements AIProvider {
  readonly id = 'mock-v1';
  capabilities() { return { mode: 'mock' as const, progress: true, replacement: false, physique: false }; }
  async analyzeProgress(input: WeeklyReviewInput, policy: AIExecutionPolicy): Promise<AIResult<ProgressReview>> {
    if (policy.signal?.aborted) return { ok: false, error: { code: 'cancelled', message: 'Request cancelled.' } };
    if (input.contractVersion !== 'weekly-review.v1') return { ok: false, error: { code: 'invalid_input', message: 'Unsupported review contract.' } };
    const facts = input.facts.filter((f) => f.value !== null && f.sourceIds.length > 0).slice(0, 3);
    return { ok: true, provenance: { ...provenance }, data: {
      contractVersion: 'progress-review.v1', requestId: input.requestId,
      status: facts.length ? 'complete' : 'insufficient_evidence',
      summary: 'DEVELOPMENT MOCK — recorded facts only. No model, photo analysis or training advice was used.',
      claims: facts.map((f) => ({ id: `mock:${f.id}`, type: 'FACT', topic: f.metric, text: `${f.metric}: ${f.value} ${f.unit}.`, evidenceIds: [f.id],
        confidence: { level: 'high', reason: 'Copied from application-computed facts; not a biological inference.' }, limitations: [f.method, 'Illustrative mock output.'], alternatives: [] })),
      questions: [], proposedChanges: [],
    } };
  }
  async suggestExerciseReplacement(input: ReplacementInput, policy: AIExecutionPolicy): Promise<AIResult<ReplacementReview>> {
    if (policy.signal?.aborted) return { ok: false, error: { code: 'cancelled', message: 'Request cancelled.' } };
    return { ok: true, provenance: { ...provenance }, data: { requestId: input.requestId, status: 'no_proposal', proposedChanges: [] } };
  }
}
