import { EQUIPMENT, type AppSnapshot, type CorrectiveProfile, type Equipment, type MovementAssessment, type MovementAssessmentKind, type MovementCheck, type MovementRating, type OnboardingAnswers, type PlayerHealthProfile, type UserProfile, type WorkoutHistoryEntry } from './types.ts';
import { createTrainingArcReview } from './arcReview.ts';
import { toDateKey } from './date.ts';
import { activeTrainingArc, registerAssessmentWithTrainingArcs } from './trainingArc.ts';

export const EMPTY_HEALTH_PROFILE: PlayerHealthProfile = {
  scanCompleted: false,
  painAreas: [],
  posturePriorities: [],
  safetySignals: [],
  knownConditions: '',
  clinicianRestrictions: '',
  updatedAt: null,
};

export const EMPTY_CORRECTIVE_PROFILE: CorrectiveProfile = {
  configured: false,
  targets: [],
  updatedAt: null,
};

export const INITIAL_SNAPSHOT: AppSnapshot = {
  schemaVersion: 11,
  onboardingComplete: false,
  profile: null,
  weeklyProtocol: null,
  dailyQuest: null,
  activeWorkout: null,
  history: [],
  lastCompletion: null,
  pendingArcReviewId: null,
};

export function normalizeEquipment(availableEquipment: readonly Equipment[]): Equipment[] {
  const equipment = availableEquipment.includes(EQUIPMENT.NONE)
    ? [EQUIPMENT.NONE]
    : [EQUIPMENT.NONE, ...availableEquipment];
  return [...new Set(equipment)];
}

export function createProfile(answers: OnboardingAnswers): UserProfile {
  return {
    id: `local-${Date.now()}`,
    level: 1,
    xp: 0,
    rank: 'E',
    attributeXp: { strength: 0, endurance: 0, agility: 0, vitality: 0, mobility: 0 },
    healthProfile: { ...EMPTY_HEALTH_PROFILE },
    correctiveProfile: { ...EMPTY_CORRECTIVE_PROFILE },
    correctiveHistory: [],
    movementAssessments: [],
    trainingArcs: [],
    trainingArcReviews: [],
    postureScans: [],
    readinessLog: [],
    strength: 1,
    endurance: 1,
    agility: 1,
    vitality: 1,
    mobility: 1,
    availableEquipment: normalizeEquipment(answers.availableEquipment),
    excludedExercises: [],
    goal: answers.goal,
    experienceLevel: answers.experienceLevel,
    workoutDuration: answers.workoutDuration,
    workoutsPerWeek: answers.workoutsPerWeek,
    streak: 0,
    longestStreak: 0,
    totalWorkouts: 0,
    lastWorkoutDateKey: null,
    activeTrainingWeeks: [],
    rankTrialCompleted: [],
  };
}

export function updateCorrectiveProfile(profile: UserProfile, correctiveProfile: CorrectiveProfile, now = new Date()): UserProfile {
  const targets = correctiveProfile.targets.map((target) => ({ ...target, sources: [...target.sources] }));
  const changed = !profile.correctiveProfile.configured || JSON.stringify(profile.correctiveProfile.targets) !== JSON.stringify(targets);
  const arc = activeTrainingArc(profile.trainingArcs);
  const reviewRequired = arc?.entryDecision === 'recalibrate' && !arc.directiveReviewedAt;
  if (!changed && !reviewRequired) return profile;
  const date = now.toISOString();
  return {
    ...profile,
    trainingArcs: reviewRequired ? profile.trainingArcs.map((item) => item.id === arc.id ? { ...item, directiveReviewedAt: date } : item) : profile.trainingArcs,
    correctiveProfile: {
      ...correctiveProfile,
      configured: true,
      targets,
      updatedAt: date,
    },
    correctiveHistory: [{
      id: `directive-${now.getTime()}-${profile.correctiveHistory.length}`,
      date,
      trainingArcId: activeTrainingArc(profile.trainingArcs)?.id ?? null,
      source: 'confirmed',
      targets: targets.map((target) => ({ ...target, sources: [...target.sources] })),
    }, ...profile.correctiveHistory],
  };
}

export function updateProfileSettings(profile: UserProfile, answers: OnboardingAnswers): UserProfile {
  return {
    ...profile,
    goal: answers.goal,
    experienceLevel: answers.experienceLevel,
    workoutDuration: answers.workoutDuration,
    workoutsPerWeek: answers.workoutsPerWeek,
    availableEquipment: normalizeEquipment(answers.availableEquipment),
  };
}

export function restoreExcludedExercises(profile: UserProfile): UserProfile {
  return profile.excludedExercises.length === 0 ? profile : { ...profile, excludedExercises: [] };
}

export function updateHealthProfile(profile: UserProfile, healthProfile: PlayerHealthProfile): UserProfile {
  return {
    ...profile,
    healthProfile: {
      ...healthProfile,
      scanCompleted: true,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function recordMovementAssessment(
  profile: UserProfile,
  results: Record<MovementCheck, MovementRating>,
  kind: MovementAssessmentKind,
  history: readonly WorkoutHistoryEntry[] = [],
  now = new Date(),
): UserProfile {
  const assessment: MovementAssessment = {
    id: `movement-${now.getTime()}`,
    kind,
    date: now.toISOString(),
    dateKey: toDateKey(now),
    results,
  };
  const review = createTrainingArcReview(profile, assessment, history);
  return {
    ...profile,
    movementAssessments: [assessment, ...profile.movementAssessments],
    trainingArcs: registerAssessmentWithTrainingArcs(profile.trainingArcs, assessment, review ? { id: review.id, decision: review.decision } : undefined, profile.workoutsPerWeek),
    trainingArcReviews: review ? [review, ...profile.trainingArcReviews] : profile.trainingArcReviews,
  };
}
