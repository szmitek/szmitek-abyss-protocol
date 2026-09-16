import { toDateKey } from './date.ts';
import { activeTrainingArc } from './trainingArc.ts';
import { CAPTURE_VIEWS, POSTURE_VIEWS, type PosturePhotoMap, type PostureScan, type PostureView, type UserProfile } from './types.ts';

const DAY_MS = 86_400_000;

export interface PostureComparison {
  current: PostureScan;
  previous: PostureScan;
  elapsedDays: number;
}

export function createPostureScan(
  profile: UserProfile,
  photos: PosturePhotoMap,
  now = new Date(),
  id = `posture-${now.getTime()}`,
): PostureScan {
  const arc = activeTrainingArc(profile.trainingArcs);
  return {
    id,
    date: now.toISOString(),
    dateKey: toDateKey(now),
    trainingArcId: arc?.id ?? null,
    trainingArcCycle: arc?.cycleNumber ?? null,
    photos,
  };
}

export function recordPostureScan(profile: UserProfile, scan: PostureScan): UserProfile {
  return { ...profile, postureScans: [scan, ...profile.postureScans.filter((item) => item.id !== scan.id)] };
}

export function removePostureScan(profile: UserProfile, scanId: string): UserProfile {
  return { ...profile, postureScans: profile.postureScans.filter((scan) => scan.id !== scanId),
    trainingArcReviews: profile.trainingArcReviews.map((review) => ({ ...review,
      baselinePostureScanId: review.baselinePostureScanId === scanId ? null : review.baselinePostureScanId,
      completionPostureScanId: review.completionPostureScanId === scanId ? null : review.completionPostureScanId,
    })),
  };
}

export function latestPostureComparison(scans: readonly PostureScan[]): PostureComparison | null {
  if (scans.length < 2) return null;
  const ordered = [...scans].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const current = ordered[0];
  const previous = ordered[1];
  if (!current || !previous) return null;
  return {
    current,
    previous,
    elapsedDays: Math.max(0, Math.round((new Date(current.date).getTime() - new Date(previous.date).getTime()) / DAY_MS)),
  };
}

export function scanViews(scan: PostureScan): readonly PostureView[] {
  return scan.protocol === 'four-view-v1' ? CAPTURE_VIEWS : POSTURE_VIEWS;
}

export function scanPhotos(scan: PostureScan) {
  return scanViews(scan).map((view) => {
    const photo = scan.photos[view];
    if (!photo) throw new Error('The photo record is incomplete.');
    return photo;
  });
}

export function comparisonViews(a: PostureScan, b: PostureScan): PostureView[] {
  // An unspecified legacy side is never treated as a known left/right view.
  return scanViews(a).filter((view) => view !== 'side' && scanViews(b).includes(view));
}

export function evidenceNotes(scan: PostureScan): string[] {
  return [
    scan.protocol ? 'Four-view protocol · setup confirmed by you, not automatically verified.' : 'Legacy three-view record · side and setup are unspecified.',
    scanPhotos(scan).every((photo) => photo.originalCapturedAt) ? 'Approximate camera acquisition times recorded by this app.' : 'Original capture time is unknown for one or more images. Record date is not the photo date.',
    scan.movementAssessmentId ? 'Linked to a completed movement check.' : 'No movement check is linked to this record.',
  ];
}

export function linkScanToAssessment(profile: UserProfile, scanId: string | undefined, assessmentId: string, now: Date): UserProfile {
  if (!scanId) return profile;
  const scan = profile.postureScans.find((item) => item.id === scanId);
  if (!scan || scan.protocol !== 'four-view-v1' || scan.movementAssessmentId || scan.dateKey !== toDateKey(now)
    || Date.parse(scan.date) > now.getTime() || now.getTime() - Date.parse(scan.date) > DAY_MS) {
    throw new Error('This photo checkpoint can no longer be linked. Cancel and start a new checkpoint, or run Movement Analysis without photos.');
  }
  return { ...profile, postureScans: profile.postureScans.map((item) => item.id === scanId ? { ...item, movementAssessmentId: assessmentId } : item) };
}
