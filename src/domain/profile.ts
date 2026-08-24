import { EQUIPMENT, type AppSnapshot, type OnboardingAnswers, type UserProfile } from './types.ts';

export const INITIAL_SNAPSHOT: AppSnapshot = {
  schemaVersion: 1,
  onboardingComplete: false,
  profile: null,
  dailyQuest: null,
  activeWorkout: null,
  history: [],
};

export function createProfile(answers: OnboardingAnswers): UserProfile {
  const equipment = answers.availableEquipment.includes(EQUIPMENT.NONE)
    ? [EQUIPMENT.NONE]
    : [EQUIPMENT.NONE, ...answers.availableEquipment];

  return {
    id: `local-${Date.now()}`,
    level: 1,
    xp: 0,
    rank: 'E',
    strength: 1,
    endurance: 1,
    agility: 1,
    vitality: 1,
    mobility: 1,
    availableEquipment: [...new Set(equipment)],
    excludedExercises: [],
    goal: answers.goal,
    experienceLevel: answers.experienceLevel,
    workoutDuration: answers.workoutDuration,
    workoutsPerWeek: answers.workoutsPerWeek,
    streak: 0,
    longestStreak: 0,
    totalWorkouts: 0,
    lastWorkoutDateKey: null,
    rankTrialCompleted: [],
  };
}
