import { requireEnvironmentKey, containsCredential } from './security.ts';
import { reviewEvidence } from '../../src/domain/reviewEvidence.ts';
import { validateProgressResponse } from '../../src/domain/reviewValidation.ts';
import { MockAIProvider } from '../../src/domain/mockAIProvider.ts';
import type { TestCase } from './fixtures.ts';
import { responseSchema, systemPrompt } from './contract.ts';

export type Effort = 'medium' | 'high';
export const model = 'gpt-6-astra';
export const providerId = 'openai-weekly-benchmark';
export function makeRequest(test: TestCase, effort: Effort, maxOutputTokens: number, payload: 'full' | 'compact' = 'full') {
  if (!['medium', 'high'].includes(effort) || !Number.isSafeInteger(maxOutputTokens) || maxOutputTokens < 1024 || maxOutputTokens > 16384) throw new Error('Invalid benchmark configuration.');
  const facts = [...test.input.facts, ...(test.input.historyContext?.facts ?? [])];
  const evidence = [...reviewEvidence(test.input).values()].map((e) => {
    const f = facts.find((v) => v.id === e.id);
    return { ...(payload === 'compact' ? { id: e.id, kind: e.kind, sourceIds: e.sourceIds, available: e.available } : e), canonicalFactText: f && f.value !== null && f.sourceIds.length ? `${f.metric}: ${f.value} ${f.unit}.` : null };
  });
  // Explicit whitelist: no title, reference answers, rubric, mutation note or sibling cases.
  return { model, service_tier: 'default', reasoning: { effort }, store: false, stream: false, max_output_tokens: maxOutputTokens,
    input: [{ role: 'system', content: systemPrompt }, { role: 'user', content: JSON.stringify({ review: test.input, evidence }) }],
    text: { format: { type: 'json_schema', name: 'progress_review_v1', strict: true, schema: responseSchema } },
  };
}
export type RequestBody = Omit<ReturnType<typeof makeRequest>, 'service_tier'> & { service_tier?: string };
export interface TransportResult { httpStatus: number | null; rawBody: string; transportError: 'timeout' | 'network' | 'sensitive_response_withheld' | null }
// Developer-only adapter. Never imported by the mobile application. No retries,
// redirect following, tools, files, previous_response_id, conversations or SDK.
export async function openAIRequest(body: RequestBody, env: Readonly<Record<string, string | undefined>>): Promise<TransportResult> {
  if (env.BENCH_ALLOW_PAID !== 'YES' || !env.OPENAI_API_KEY?.trim()) throw new Error('Live benchmark requires explicit paid opt-in and an environment API key.');
  const key = requireEnvironmentKey(env);
  try {
    const result = await fetch('https://api.openai.com/v1/responses', { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(180_000) });
    const rawBody = await result.text();
    if (containsCredential(rawBody, key)) return { httpStatus: result.status, rawBody: '', transportError: 'sensitive_response_withheld' };
    return { httpStatus: result.status, rawBody, transportError: null };
  } catch (error) {
    // Do not serialize exception messages/headers: credentials must never enter logs.
    return { httpStatus: null, rawBody: '', transportError: error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network' };
  }
}
export async function dryResponse(test: TestCase): Promise<TransportResult> {
  const r = await new MockAIProvider().analyzeProgress(test.input, { allowNetwork: false });
  if (!r.ok) throw new Error('Dry mock failed.');
  return { httpStatus: null, transportError: null, rawBody: JSON.stringify({ id: 'dry-run-not-model-output', model, status: 'completed', usage: null, output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(r.data) }] }] }) };
}
const record = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
export function evaluateResponse(raw: TransportResult, test: TestCase, dry: boolean) {
  let envelope: unknown;
  try { envelope = JSON.parse(raw.rawBody); } catch { return { valid: false, status: 'invalid_json', returnedModel: null, usage: null, data: null, error: 'Unparseable response body' }; }
  if (!record(envelope)) return { valid: false, status: 'invalid_envelope', returnedModel: null, usage: null, data: null, error: 'Invalid response envelope' };
  const status = typeof envelope.status === 'string' ? envelope.status : 'unknown';
  const returnedModel = typeof envelope.model === 'string' ? envelope.model : null;
  const usage = record(envelope.usage) ? envelope.usage : null;
  const messages = Array.isArray(envelope.output) ? envelope.output.filter(record).filter((o) => o.type === 'message' && o.role === 'assistant') : [];
  const content = messages.flatMap((m) => Array.isArray(m.content) ? m.content.filter(record) : []);
  const refusal = content.some((c) => c.type === 'refusal');
  const outputs = content.filter((c) => c.type === 'output_text' && typeof c.text === 'string');
  let data: unknown = null;
  if (outputs.length === 1) { try { data = JSON.parse(outputs[0]!.text as string); } catch { /* Raw text is preserved separately, never repaired. */ } }
  const eligible = !raw.transportError && (dry || raw.httpStatus === 200) && status === 'completed' && !refusal && outputs.length === 1 && returnedModel !== null;
  const validation = validateProgressResponse({ ok: true, data, provenance: { providerId, mode: 'cloud', label: dry ? 'DRY RUN — not model output' : 'OpenAI benchmark only' } }, test.input, providerId, 'cloud');
  return { serviceTier: typeof envelope.service_tier === 'string' ? envelope.service_tier : null, valid: eligible && validation.ok && validation.result.ok, status: refusal ? 'refused' : status, returnedModel, usage, data, error: eligible && validation.ok ? null : 'Rejected by completion/envelope/production response validation' };
}
