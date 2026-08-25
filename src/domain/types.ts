export const EQUIPMENT = {
  NONE: 'none',
  MAT: 'mat',
  DUMBBELLS: 'dumbbells',
  BANDS: 'bands',
  PULL_UP_BAR: 'pull-up-bar',
  BENCH: 'bench',
  KETTLEBELL: 'kettlebell',
} as const;

export type Equipment = (typeof EQUIPMENT)[keyof typeof EQUIPMENT];

export const GOALS = {
  GENERAL: 'general-fitness',
  STRENGTH: 'strength',
  MUSCLE: 'muscle',
  FAT_LOSS: 'fat-loss',
  CONDITIONING: 'conditioning',
  MOBILITY: 'mobility',
} as const;

export type Goal = (typeof GOALS)[keyof typeof GOALS];
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
export type PerceivedDifficulty = 'too-easy' | 'perfect' | 'too-hard';

export const STAT_KEYS = ['strength', 'endurance', 'agility', 'vitality', 'mobility'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'core',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'full-body',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type ExerciseType = 'warmup' | 'strength' | 'cardio' | 'core' | 'mobility';
export type RepType = 'reps' | 'seconds';

export interface Exercise {
  id: string;
  name: string;
  description: string;
  muscleGroups: readonly MuscleGroup[];
  primaryMuscle: MuscleGroup;
  requiredEquipment: readonly Equipment[];
  difficulty: 1 | 2 | 3;
  progressionGroup: string;
  progressionLevel: number;
  exerciseType: ExerciseType;
  repType: RepType;
  minReps: number;
  maxReps: number;
  defaultRest: number;
  statImpact: Partial<Record<StatKey, number>>;
  muscleLoad: Partial<Record<MuscleGroup, number>>;
}

export interface ExercisePrescription {
  exercise: Exercise;
  sets: number;
  target: number;
  restSeconds: number;
}

export interface WorkoutPlan {
  id: string;
  kind?: 'training' | 'recovery' | 'rank-trial';
  dateKey: string;
  title: string;
  focus: string;
  estimatedMinutes: number;
  difficulty: 1 | 2 | 3;
  exercises: ExercisePrescription[];
  rewardXp: number;
}

export interface ExerciseResult {
  exerciseId: string;
  completedSets: number;
  targetPerSet: number;
  completedVolume: number;
}

export interface StatBlock {
  strength: number;
  endurance: number;
  agility: number;
  vitality: number;
  mobility: number;
}

export interface WorkoutHistoryEntry {
  id: string;
  date: string;
  dateKey: string;
  planId: string;
  title: string;
  completed: boolean;
  durationSeconds: number;
  difficulty: 1 | 2 | 3;
  perceivedDifficulty: PerceivedDifficulty;
  results: ExerciseResult[];
  xpEarned: number;
  statGains: StatBlock;
}

export interface UserProfile extends StatBlock {
  id: string;
  level: number;
  xp: number;
  rank: Rank;
  availableEquipment: Equipment[];
  excludedExercises: string[];
  goal: Goal;
  experienceLevel: ExperienceLevel;
  workoutDuration: 10 | 15 | 20 | 30 | 45 | 60;
  workoutsPerWeek: 2 | 3 | 4 | 5 | 6 | 7;
  streak: number;
  longestStreak: number;
  totalWorkouts: number;
  lastWorkoutDateKey: string | null;
  rankTrialCompleted: Rank[];
}

export interface DailyQuest {
  id: string;
  dateKey: string;
  status: 'available' | 'active' | 'complete';
  plan: WorkoutPlan;
}

export interface ActiveWorkout {
  questId: string;
  plan: WorkoutPlan;
  exerciseIndex: number;
  completedSets: number[];
  startedAt: string;
}

export interface AppSnapshot {
  schemaVersion: 1;
  onboardingComplete: boolean;
  profile: UserProfile | null;
  dailyQuest: DailyQuest | null;
  activeWorkout: ActiveWorkout | null;
  history: WorkoutHistoryEntry[];
}

export interface OnboardingAnswers {
  goal: Goal;
  experienceLevel: ExperienceLevel;
  workoutDuration: UserProfile['workoutDuration'];
  workoutsPerWeek: UserProfile['workoutsPerWeek'];
  availableEquipment: Equipment[];
}

export type RecoveryState = Record<MuscleGroup, number>;
