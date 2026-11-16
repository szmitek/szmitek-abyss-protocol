// Developer-only text Arc Review preflight. Not a production API or consent grant.
// No network, files, photos or application-state mutation.
import { createHash } from 'node:crypto';
import type { WeeklyReviewInput } from '../../src/domain/aiContracts.ts';

export interface TextArcPayload {
  readonly contractVersion: 'text-arc-payload.v1';
  readonly input: WeeklyReviewInput;
  readonly canonicalJson: string;
  readonly sha256: string;
  readonly byteLength: number;
}

const prohibited = /(?:data:image\/|file:\/\/|content:\/\/|(?:^|[\s"'(])https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|heic)(?:[?\s"'<>]|$))/i;
const topLevel = ['contractVersion', 'requestId', 'locale', 'period', 'facts',
  'training', 'exerciseExposures', 'adherence', 'archivedAdherence',
  'wellbeing', 'tests', 'body', 'dataCoverage', 'photos',
  'constraints', 'arcContext'];
const ordinaryObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function canonical(value: unknown, depth = 0): string {
  if (depth > 40) throw new Error('Review payload nesting limit exceeded.');
  if (value === null) return 'null';
  if (typeof value === 'string') {
    if (prohibited.test(value)) throw new Error('Image data or a local image URI is not allowed in a text review.');
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(v => canonical(v, depth + 1)).join(',') + ']';
  if (!ordinaryObject(value)) throw new Error('Unsupported value in the review payload.');
  const keys = Object.keys(value).sort();
  return '{' + keys.map(key => JSON.stringify(key) + ':' + canonical(value[key], depth + 1)).join(',') + '}';
}

/** Freeze a detached, text-only arc request before any future consent/quote UI. */
export function prepareTextArcPayload(input: WeeklyReviewInput): TextArcPayload {
  if (!ordinaryObject(input) || input.contractVersion !== 'weekly-review.v1'
    || !ordinaryObject(input.arcContext) || input.arcContext.contractVersion !== 'arc-review-context.v1'
    || input.historyContext !== undefined || input.photos?.status !== 'no_pixels_attached'
    || input.photos.localAnalysis !== 'not_run'
    || input.constraints?.mayModifyPlan !== false
    || input.constraints.mayDiagnose !== false
    || input.constraints.mayEstimateBodyComposition !== false
    || Object.keys(input).some(key => !topLevel.includes(key))) {
    throw new Error('Expected a valid, unmodified text-only Arc Review scope.');
  }
  // Photo manifest is excluded entirely. The existing local archive is untouched.
  const { historyContext, ...fields } = input;
  void historyContext;
  const detached: WeeklyReviewInput = JSON.parse(JSON.stringify({
    ...fields, photos: { status: 'no_pixels_attached', localAnalysis: 'not_run', manifest: [] },
  })) as WeeklyReviewInput;
  const canonicalJson = canonical({ contractVersion: 'text-arc-payload.v1', input: detached });
  const byteLength = Buffer.byteLength(canonicalJson, 'utf8');
  if (byteLength > 256 * 1024) throw new Error('Text review exceeds the 256 KiB preflight limit.');
  return { contractVersion: 'text-arc-payload.v1', input: detached, canonicalJson,
    sha256: createHash('sha256').update(canonicalJson, 'utf8').digest('hex'), byteLength };
}
