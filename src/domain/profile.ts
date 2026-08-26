import { EQUIPMENT, type AppSnapshot, type Equipment, type OnboardingAnswers, type PlayerHealthProfile, type UserProfile } from './types.ts';

export const EMPTY_HEALTH_PROFILE: PlayerHealthProfile = {
  scanCompleted: false,
  painAreas: [],
  posturePriorities: [],
  safetySignals: [],
  knownConditions: '',
  clinicianRestrictions: '',
  updatedAt: null,
};

export const INITIAL_SNAPSHOT: AppSnapshot = {
  schemaVersion: 2,
  onboardingComplete: false,
  profile: null,
  dailyQuest: null,
  activeWorkout: null,
  history: [],
  lastCompletion: null,
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
