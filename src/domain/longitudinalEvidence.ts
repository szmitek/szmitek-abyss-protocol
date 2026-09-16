import { EXERCISE_BY_ID } from '../data/exercises.ts';
import { toDateKey } from './date.ts';
import { comparisonViews } from './postureArchive.ts';
import { MOVEMENT_CHECKS, type MovementAssessment, type UserProfile, type WorkoutHistoryEntry } from './types.ts';

const DAY_MS = 86_400_000;
const score = { pain: 0, limited: 1, clear: 2 } as const;

function recordedByNow(entry: { date: string; dateKey: string }, now: Date): boolean {
  return Number.isFinite(Date.parse(entry.date)) && Date.parse(entry.date) <= now.getTime() && entry.dateKey <= toDateKey(now);
}

export function evidenceAssessments(profile: UserProfile, now = new Date()): MovementAssessment[] {
  return [...profile.movementAssessments].filter((entry) => recordedByNow(entry, now))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id));
}

export function buildLongitudinalEvidence(profile: UserProfile, history: readonly WorkoutHistoryEntry[], beforeId: string, afterId: string, now = new Date()) {
  const assessments = evidenceAssessments(profile, now);
  const before = assessments.find((entry) => entry.id === beforeId);
  const after = assessments.find((entry) => entry.id === afterId);
  if (!before || !after || before.id === after.id || Date.parse(before.date) >= Date.parse(after.date) || before.dateKey > after.dateKey) return null;
  // Day-key arithmetic is independent of DST. This is an inclusive calendar-day
  // context window, not a claim that day-level readiness happened between tests.
  const days = Math.round((Date.parse(`${after.dateKey}T12:00:00Z`) - Date.parse(`${before.dateKey}T12:00:00Z`)) / DAY_MS) + 1;
  const inWindow = (entry: { date: string; dateKey: string }) => recordedByNow(entry, now) && entry.dateKey >= before.dateKey && entry.dateKey <= after.dateKey;
  const completed = history.filter((entry) => entry.completed && inWindow(entry));
  const trials = completed.filter((entry) => entry.planId.startsWith('rank-trial-'));
  const training = completed.filter((entry) => !entry.planId.startsWith('rank-trial-') && entry.results.some((result) => result.completedSets > 0));
  const readiness = profile.readinessLog.filter(inWindow);
  const recordedDays = new Set(readiness.map((entry) => entry.dateKey)).size;
  const volume = { workSets: 0, warmupSets: 0, reps: 0, seconds: 0, unknownUnitSets: 0 };
  for (const entry of training) for (const result of entry.results) {
    const exercise = EXERCISE_BY_ID.get(result.exerciseId);
    volume.warmupSets += result.warmupSets?.length ?? 0;
    if (exercise?.exerciseType === 'warmup') { volume.warmupSets += result.completedSets; continue; }
    volume.workSets += result.completedSets;
    if (exercise?.repType === 'reps') volume.reps += result.completedVolume;
    else if (exercise?.repType === 'seconds') volume.seconds += result.completedVolume;
    else volume.unknownUnitSets += result.completedSets;
  }
  const linkedPhoto = (assessment: MovementAssessment) => profile.postureScans.find((scan) => scan.movementAssessmentId === assessment.id && recordedByNow(scan, now)) ?? null;
  const beforePhoto = linkedPhoto(before), afterPhoto = linkedPhoto(after);
  const report = profile.trainingArcReviews.find((review) => review.baselineAssessmentId === before.id && review.completionAssessmentId === after.id && recordedByNow(review, now)) ?? null;
  return {
    before, after, days,
    movement: MOVEMENT_CHECKS.map((check) => ({ check, before: before.results[check], after: after.results[check],
      change: score[after.results[check]] > score[before.results[check]] ? 'improved' as const : score[after.results[check]] < score[before.results[check]] ? 'declined' as const : 'unchanged' as const,
    })),
    photos: { before: beforePhoto, after: afterPhoto, views: beforePhoto && afterPhoto ? comparisonViews(beforePhoto, afterPhoto) : [],
      unlinked: profile.postureScans.filter((scan) => inWindow(scan) && !scan.movementAssessmentId).length,
    },
    training: { sessions: training.length, activeDays: new Set(training.map((entry) => entry.dateKey)).size,
      trials: trials.length, returnSessions: training.filter((entry) => entry.returnBlockId).length,
      minutes: Math.round(training.reduce((sum, entry) => sum + entry.durationSeconds, 0) / 60), ...volume,
    },
    readiness: { recordedDays, missingDays: Math.max(0, days - recordedDays),
      normal: readiness.filter((entry) => entry.band === 'normal').length,
      reduced: readiness.filter((entry) => entry.band === 'reduced').length,
      recovery: readiness.filter((entry) => entry.band === 'recovery').length,
      hold: readiness.filter((entry) => entry.band === 'hold').length,
      warnings: readiness.filter((entry) => entry.painOrWarning).length,
      lowEnergy: readiness.filter((entry) => entry.energy === 'low').length,
      poorSleep: readiness.filter((entry) => entry.sleep === 'poor').length,
      highSoreness: readiness.filter((entry) => entry.soreness === 'high').length,
    },
    // Preserve the original report. Do not recalculate its target or blend its
    // old readiness aggregate into retained daily observations.
    report,
  };
}
