import { toDateKey } from './date.ts';
import { activeTrainingArc } from './trainingArc.ts';
import type { PosturePhotoMap, PostureScan, UserProfile } from './types.ts';

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
  return { ...profile, postureScans: profile.postureScans.filter((scan) => scan.id !== scanId) };
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
