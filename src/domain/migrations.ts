import { EMPTY_CORRECTIVE_PROFILE, EMPTY_HEALTH_PROFILE, INITIAL_SNAPSHOT } from './profile.ts';
import { totalAttributeXpForValue, trainingWeekKey } from './progression.ts';
import { STAT_KEYS, type AppSnapshot, type StatBlock, type UserProfile, type WorkoutHistoryEntry } from './types.ts';

const EMPTY_STATS: StatBlock = { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 };
export type StoredSnapshot = Omit<Partial<AppSnapshot>, 'schemaVersion'> & { schemaVersion?: number };

function migrateProfile(profile: UserProfile, history: WorkoutHistoryEntry[]): UserProfile {
  const attributeXp = profile.attributeXp ?? { ...EMPTY_STATS };
  if (!profile.attributeXp) {
    for (const key of STAT_KEYS) attributeXp[key] = totalAttributeXpForValue(profile[key]);
  }
  const correctiveProfile = profile.correctiveProfile ?? { ...EMPTY_CORRECTIVE_PROFILE };
  const correctiveHistory = profile.correctiveHistory ?? (correctiveProfile.configured ? [{
    id: `directive-legacy-${profile.id}`,
    date: correctiveProfile.updatedAt,
    trainingArcId: null,
    source: 'legacy-current' as const,
    targets: correctiveProfile.targets.map((target) => ({ ...target, sources: [...target.sources] })),
  }] : []);
  return {
    ...profile,
    attributeXp,
    activeTrainingWeeks: profile.activeTrainingWeeks
      ?? [...new Set(history.filter((entry) => entry.completed).map((entry) => trainingWeekKey(entry.dateKey)))],
    healthProfile: profile.healthProfile ?? { ...EMPTY_HEALTH_PROFILE },
    correctiveProfile,
    correctiveHistory,
    movementAssessments: profile.movementAssessments ?? [],
    trainingArcs: (profile.trainingArcs ?? []).map((arc) => ({
      ...arc,
      reviewId: arc.reviewId ?? null,
      entryDecision: arc.entryDecision ?? null,
      planSnapshot: arc.planSnapshot ?? { workoutsPerWeek: profile.workoutsPerWeek, source: 'legacy-estimate' },
    })),
    trainingArcReviews: (profile.trainingArcReviews ?? []).map((review) => ({
      ...review,
      adherence: { ...review.adherence, targetSource: review.adherence.targetSource ?? 'legacy-estimate' },
    })),
    postureScans: profile.postureScans ?? [],
    readinessLog: profile.readinessLog ?? [],
  };
}

export function migrateSnapshot(parsed: StoredSnapshot): AppSnapshot {
  const history = (parsed.history ?? []).map((entry) => ({
    ...entry,
    attributeXpEarned: entry.attributeXpEarned ?? { ...EMPTY_STATS },
  }));
  const profile = parsed.profile ? migrateProfile(parsed.profile, history) : null;
  const lastCompletion = parsed.lastCompletion
    ? { ...parsed.lastCompletion, attributeXpEarned: parsed.lastCompletion.attributeXpEarned ?? { ...EMPTY_STATS } }
    : null;
  return { ...INITIAL_SNAPSHOT, ...parsed, schemaVersion: 10, profile, history, lastCompletion, weeklyProtocol: parsed.weeklyProtocol ?? null, pendingArcReviewId: parsed.pendingArcReviewId ?? null };
}
