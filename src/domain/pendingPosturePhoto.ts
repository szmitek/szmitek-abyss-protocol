import { POSTURE_VIEWS, type PosturePhotoSource, type PostureView } from './types.ts';

export interface PendingPosturePhoto {
  view: PostureView;
  source: PosturePhotoSource;
  profileId: string;
  requestedAt: string;
}

export function parsePendingPosturePhoto(raw: string | null, profileId: string, now = new Date()): PendingPosturePhoto | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PendingPosturePhoto;
    if (!value || value.profileId !== profileId || !POSTURE_VIEWS.includes(value.view) || !['camera', 'library'].includes(value.source)) return null;
    const age = now.getTime() - new Date(value.requestedAt).getTime();
    if (!Number.isFinite(age) || age < 0 || age > 86_400_000) return null;
    return { view: value.view, source: value.source, profileId, requestedAt: value.requestedAt };
  } catch { return null; }
}
