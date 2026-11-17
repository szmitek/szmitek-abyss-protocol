// Offline-only, React Native-compatible snapshot preflight.
// The preview is NOT consent, a quote, an authenticated request, or a network transport.
import type { WeeklyReviewInput } from './aiContracts.ts';
import { assertTextArcSchema } from './arcTextSchema.ts';

export const TEXT_ARC_PREVIEW_MAX_BYTES = 256 * 1024;
export interface TextArcPreview {
  readonly contractVersion: 'text-arc-payload.v1';
  readonly input: WeeklyReviewInput;
  readonly canonicalJson: string;
  readonly byteLength: number;
}

const allowedRoot = new Set([
  'contractVersion', 'requestId', 'locale', 'period', 'facts',
  'training', 'exerciseExposures', 'adherence', 'archivedAdherence',
  'wellbeing', 'tests', 'body', 'dataCoverage', 'photos',
  'constraints', 'arcContext',
]);
const forbiddenKeys = new Set([
  'imageUri', 'imageUrl', 'photoUri', 'photoUrl', 'localUri',
  'fileUri', 'base64', 'imageBase64', 'photoBase64', 'pixels',
]);
const forbiddenLocations = /(?:data:image\/|file:\/\/|content:\/\/|(?:^|[\s"'(])https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|heic)(?:[?\s"'<>]|$))/i;

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

// One stable serializer for both the phone preview and developer-only SHA-256 preflight.
function canonical(value: unknown, depth = 0): string {
  if (depth > 40) throw new Error('Review payload nesting limit exceeded.');
  if (value === null) return 'null';
  if (typeof value === 'string') {
    if (forbiddenLocations.test(value)) throw new Error('Image data or local image URI found in text review.');
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map((entry) => canonical(entry, depth + 1)).join(',') + ']';
  if (!isObject(value)) throw new Error('Unsupported value in text review.');
  const keys = Object.keys(value).sort();
  if (keys.some(key => forbiddenKeys.has(key))) throw new Error('Unexpected image field in text review.');
  return '{' + keys.map(key => JSON.stringify(key) + ':' + canonical(value[key], depth + 1)).join(',') + '}';
}

function utf8Bytes(value: string): number {
  let count = 0;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) count++;
    else if (code <= 0x7ff) count += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) { count += 4; index++; }
      else throw new Error('Invalid Unicode in review payload.');
    } else if (code >= 0xdc00 && code <= 0xdfff) throw new Error('Invalid Unicode in review payload.');
    else count += 3;
    if (count > TEXT_ARC_PREVIEW_MAX_BYTES) throw new Error('Text review exceeds the 256 KiB limit.');
  }
  return count;
}

export function prepareTextArcPreview(input: WeeklyReviewInput): TextArcPreview {
  if (!isObject(input) || input.contractVersion !== 'weekly-review.v1'
    || !isObject(input.arcContext) || input.arcContext.contractVersion !== 'arc-review-context.v1'
    || input.historyContext !== undefined || input.locale !== 'en'
    || !isObject(input.photos) || Object.keys(input.photos).some(key => !['status', 'localAnalysis', 'manifest'].includes(key))
    || input.photos.status !== 'no_pixels_attached' || input.photos.localAnalysis !== 'not_run'
    || !Array.isArray(input.photos.manifest)
    || !isObject(input.constraints) || input.constraints.mayModifyPlan !== false
    || input.constraints.mayDiagnose !== false || input.constraints.mayEstimateBodyComposition !== false
    || Object.keys(input).some(key => !allowedRoot.has(key))) {
    throw new Error('Invalid scope for offline text-only Arc Review preview.');
  }
  // Reject even unexpected nested fields; client code must never silently include them.
  assertTextArcSchema(input);
  // Photos are local references. Neither images nor their identifiers belong in a text request.
  const { historyContext, ...fields } = input;
  void historyContext;
  const candidate = {
    contractVersion: 'text-arc-payload.v1',
    input: { ...fields, photos: { status: 'no_pixels_attached', localAnalysis: 'not_run', manifest: [] } },
  };
  const canonicalJson = canonical(candidate);
  const byteLength = utf8Bytes(canonicalJson);
  // The canonical serialization is the immutable snapshot for this preview.
  const detached = JSON.parse(canonicalJson) as { input: WeeklyReviewInput };
  return { contractVersion: 'text-arc-payload.v1', input: detached.input, canonicalJson, byteLength };
}
