import type { AIResult, ProgressReview, WeeklyReviewInput } from './aiContracts.ts';
import { reviewEvidence } from './reviewEvidence.ts';

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 2000): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const strings = (v: unknown, max = 16): v is string[] => Array.isArray(v) && v.length <= max && v.every((x) => text(x));
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every((key) => allowed.includes(key));
type Validation = { ok: true; result: AIResult<ProgressReview> } | { ok: false };

// Runtime shape + referential validation is not clinical/semantic validation of
// future model prose. FACT text is deliberately canonical and app-owned.
export function validateProgressResponse(value: unknown, input: WeeklyReviewInput, providerId: string, mode: 'mock' | 'local' | 'cloud'): Validation {
  try {
    if (!object(value) || typeof value.ok !== 'boolean') return { ok: false };
    if (!value.ok) {
      const e = value.error;
      if (!keys(value, ['ok', 'error']) || !object(e) || !keys(e, ['code', 'message']) || !['unsupported', 'cancelled', 'invalid_input', 'unavailable'].includes(String(e.code)) || !text(e.message)) return { ok: false };
      // Do not display arbitrary provider error text.
      return { ok: true, result: { ok: false, error: { code: e.code as 'unavailable', message: 'The review provider could not complete this request.' } } };
    }
    if (!keys(value, ['ok', 'data', 'provenance']) || !object(value.provenance) || !keys(value.provenance, ['providerId', 'mode', 'label'])
      || value.provenance.providerId !== providerId || value.provenance.mode !== mode || !text(value.provenance.label)) return { ok: false };
    const r = value.data;
    if (!object(r) || !keys(r, ['contractVersion', 'requestId', 'status', 'summary', 'claims', 'questions', 'proposedChanges'])
      || r.contractVersion !== 'progress-review.v1' || r.requestId !== input.requestId || !['complete', 'insufficient_evidence'].includes(String(r.status))
      || !text(r.summary) || !strings(r.questions) || !Array.isArray(r.claims) || r.claims.length > 32
      || !Array.isArray(r.proposedChanges) || r.proposedChanges.length !== 0) return { ok: false };
    const evidence = reviewEvidence(input);
    const facts = new Map([...input.facts, ...(input.historyContext?.facts ?? [])].map((f) => [f.id, f]));
    const ids = new Set<string>();
    for (const c of r.claims) {
      if (!object(c) || !keys(c, ['id', 'type', 'topic', 'text', 'evidenceIds', 'confidence', 'limitations', 'alternatives'])
        || !text(c.id, 256) || ids.has(c.id) || !['FACT', 'OBSERVATION', 'HYPOTHESIS', 'RECOMMENDATION'].includes(String(c.type))
        || !text(c.topic, 256) || !text(c.text) || !strings(c.evidenceIds) || c.evidenceIds.length === 0 || new Set(c.evidenceIds).size !== c.evidenceIds.length
        || c.evidenceIds.some((id) => !evidence.get(id)?.available) || !strings(c.limitations) || !strings(c.alternatives)
        || !object(c.confidence) || !keys(c.confidence, ['level', 'reason']) || !['low', 'medium', 'high'].includes(String(c.confidence.level)) || !text(c.confidence.reason)) return { ok: false };
      ids.add(c.id);
      if (c.type === 'FACT') {
        const f = facts.get(c.evidenceIds[0]!);
        if (c.evidenceIds.length !== 1 || !f || f.value === null || !f.sourceIds.length || c.topic !== f.metric || c.text !== `${f.metric}: ${f.value} ${f.unit}.`) return { ok: false };
      }
    }
    if (r.status === 'complete' && r.claims.length === 0) return { ok: false };
    return { ok: true, result: JSON.parse(JSON.stringify(value)) as AIResult<ProgressReview> };
  } catch { return { ok: false }; }
}
