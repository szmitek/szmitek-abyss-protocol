// Developer-only digest adapter for the exact offline mobile text preview.
// Never imported by the mobile app; no provider, HTTP, credentials or persistence.
import { createHash } from 'node:crypto';
import type { WeeklyReviewInput } from '../../src/domain/aiContracts.ts';
import { prepareTextArcPreview, type TextArcPreview } from '../../src/domain/textArcPreview.ts';

export interface TextArcPayload extends TextArcPreview {
  readonly sha256: string;
}

export function prepareTextArcPayload(input: WeeklyReviewInput): TextArcPayload {
  const preview = prepareTextArcPreview(input);
  return {
    ...preview,
    sha256: createHash('sha256').update(preview.canonicalJson, 'utf8').digest('hex'),
  };
}
