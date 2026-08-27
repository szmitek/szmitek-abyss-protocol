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

export const PAIN_AREAS = ['lower-back', 'upper-back-neck', 'shoulders', 'wrists', 'hips', 'knees', 'ankles'] as const;
export type PainArea = (typeof PAIN_AREAS)[number];

export const POSTURE_PRIORITIES = ['pelvic-control', 'rounded-upper-back', 'forward-shoulders', 'hip-mobility', 'shoulder-mobility'] as const;
export type PosturePriority = (typeof POSTURE_PRIORITIES)[number];

export const SAFETY_SIGNALS = ['chest-pain', 'fainting-dizziness', 'unusual-breathlessness', 'acute-injury', 'medical-restriction'] as const;
export type SafetySignal = (typeof SAFETY_SIGNALS)[number];

export const MOVEMENT_CHECKS = ['squat-control', 'overhead-reach', 'hip-hinge', 'single-leg-balance', 'plank-control'] as const;
export type MovementCheck = (typeof MOVEMENT_CHECKS)[number];
export type MovementRating = 'clear' | 'limited' | 'pain';
export type MovementAssessmentKind = 'baseline' | 'reassessment';
export type TrainingArcPhase = 'calibration' | 'foundation' | 'overload' | 'consolidation';
export type TrainingArcDecision = 'advance' | 'continue' | 'recalibrate' | 'recovery' | 'hold';
export type ReadinessEnergy = 'low' | 'stable' | 'high';
export type ReadinessSleep = 'poor' | 'fair' | 'good';
export type ReadinessSoreness = 'none' | 'mild' | 'high';
export type ReadinessBand = 'normal' | 'reduced' | 'recovery' | 'hold';
export type WeeklySessionCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export const CORRECTIVE_GOALS = [
  'pelvic-control',
  'upper-back-capacity',
  'shoulder-position',
  'head-neck-control',
  'hip-mobility',
  'shoulder-mobility',
  'left-right-control',
] as const;
export type CorrectiveGoal = (typeof CORRECTIVE_GOALS)[number];
export type CorrectivePriority = 'primary' | 'support';
export type CorrectiveEvidenceSource = 'self-observation' | 'player-scan' | 'movement-analysis' | 'posture-archive';

export const POSTURE_VIEWS = ['front', 'side', 'back'] as const;
export type PostureView = (typeof POSTURE_VIEWS)[number];
export type PosturePhotoSource = 'camera' | 'library';

export const STAT_KEYS = ['strength', 'endurance', 'agility', 'vitality', 'mobility'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'neck',
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
  selectionReasons?: ExerciseSelectionReason[];
}

export interface ExerciseSelectionReason {
  code: 'prepare' | 'training-goal' | 'corrective' | 'player-scan' | 'movement-analysis' | 'recovery' | 'mobility';
  label: string;
}

export interface WorkoutPlan {
  id: string;
  kind?: 'training' | 'recovery' | 'safety-hold' | 'reassessment' | 'rank-trial';
  dateKey: string;
  title: string;
  focus: string;
  estimatedMinutes: number;
  difficulty: 1 | 2 | 3;
  exercises: ExercisePrescription[];
  rewardXp: number;
  trainingArc?: TrainingArcContext;
  readinessBand?: ReadinessBand;
  correctiveFocus?: CorrectiveGoal;
  weeklySession?: WeeklySessionContext;
}

export interface WeeklySessionContext {
  protocolId: string;
  code: WeeklySessionCode;
  sessionIndex: number;
  sessionCount: number;
  weekStartDateKey: string;
  objective: string;
}

export interface WeeklySessionBlueprint {
  code: WeeklySessionCode;
  dateKey: string;
  title: string;
  objective: string;
  focusMuscles: MuscleGroup[];
}

export interface WeeklyProtocolSession extends WeeklySessionBlueprint {
  plan: WorkoutPlan;
}

export interface WeeklyProtocol {
  id: string;
  weekStartDateKey: string;
  weekEndDateKey: string;
  createdAt: string;
  profileFingerprint: string;
  trainingArcCycle: number | null;
  trainingArcWeek: number | null;
  volumeCaps: Partial<Record<MuscleGroup, number>>;
  sessions: WeeklyProtocolSession[];
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

export interface PlayerHealthProfile {
  scanCompleted: boolean;
  painAreas: PainArea[];
  posturePriorities: PosturePriority[];
  safetySignals: SafetySignal[];
  knownConditions: string;
  clinicianRestrictions: string;
  updatedAt: string | null;
}

export interface CorrectiveTarget {
  goal: CorrectiveGoal;
  priority: CorrectivePriority;
  sources: CorrectiveEvidenceSource[];
}

export interface CorrectiveProfile {
  configured: boolean;
  targets: CorrectiveTarget[];
  updatedAt: string | null;
}

export interface MovementAssessment {
  id: string;
  kind: MovementAssessmentKind;
  date: string;
  dateKey: string;
  results: Record<MovementCheck, MovementRating>;
}

export interface TrainingArc {
  id: string;
  cycleNumber: number;
  startDateKey: string;
  durationWeeks: 4;
  baselineAssessmentId: string;
  completionAssessmentId: string | null;
  reviewId: string | null;
  entryDecision: TrainingArcDecision | null;
}

export interface TrainingArcContext {
  cycleNumber: number;
  week: 1 | 2 | 3 | 4;
  phase: TrainingArcPhase;
}

export interface PosturePhoto {
  view: PostureView;
  uri: string;
  width: number;
  height: number;
  source: PosturePhotoSource;
  capturedAt: string;
}

export type PosturePhotoMap = Record<PostureView, PosturePhoto>;

export interface PostureScan {
  id: string;
  date: string;
  dateKey: string;
  trainingArcId: string | null;
  trainingArcCycle: number | null;
  photos: PosturePhotoMap;
}

export interface TrainingArcReview {
  id: string;
  trainingArcId: string;
  cycleNumber: number;
  date: string;
  dateKey: string;
  baselineAssessmentId: string;
  completionAssessmentId: string;
  baselinePostureScanId: string | null;
  completionPostureScanId: string | null;
  adherence: {
    scheduledSessions: number;
    completedSessions: number;
    rate: number;
  };
  movement: {
    improved: number;
    declined: number;
    unchanged: number;
  };
  difficulty: {
    tooEasy: number;
    perfect: number;
    tooHard: number;
  };
  readiness: {
    normal: number;
    reduced: number;
    recovery: number;
    hold: number;
  };
  decision: TrainingArcDecision;
  reasons: string[];
}

export interface DailyReadiness {
  id: string;
  date: string;
  dateKey: string;
  energy: ReadinessEnergy;
  sleep: ReadinessSleep;
  soreness: ReadinessSoreness;
  soreMuscles: MuscleGroup[];
  painOrWarning: boolean;
  band: ReadinessBand;
}

export interface DailyReadinessInput {
  energy: ReadinessEnergy;
  sleep: ReadinessSleep;
  soreness: ReadinessSoreness;
  soreMuscles: MuscleGroup[];
  painOrWarning: boolean;
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
  attributeXpEarned: StatBlock;
  statGains: StatBlock;
}

export interface UserProfile extends StatBlock {
  id: string;
  level: number;
  xp: number;
  rank: Rank;
  attributeXp: StatBlock;
  healthProfile: PlayerHealthProfile;
  correctiveProfile: CorrectiveProfile;
  movementAssessments: MovementAssessment[];
  trainingArcs: TrainingArc[];
  trainingArcReviews: TrainingArcReview[];
  postureScans: PostureScan[];
  readinessLog: DailyReadiness[];
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
  activeTrainingWeeks: string[];
  rankTrialCompleted: Rank[];
}

export interface DailyQuest {
  id: string;
  dateKey: string;
  status: 'available' | 'active' | 'complete';
  plan: WorkoutPlan;
}

export interface CompletionSummary {
  id: string;
  planTitle: string;
  xpEarned: number;
  attributeXpEarned: StatBlock;
  statGains: StatBlock;
  levelBefore: number;
  levelAfter: number;
  rankBefore: Rank;
  rankAfter: Rank;
  rankTrial: boolean;
}

export interface ActiveWorkout {
  questId: string;
  plan: WorkoutPlan;
  exerciseIndex: number;
  completedSets: number[];
  startedAt: string;
}

export interface AppSnapshot {
  schemaVersion: 9;
  onboardingComplete: boolean;
  profile: UserProfile | null;
  weeklyProtocol: WeeklyProtocol | null;
  dailyQuest: DailyQuest | null;
  activeWorkout: ActiveWorkout | null;
  history: WorkoutHistoryEntry[];
  lastCompletion: CompletionSummary | null;
  pendingArcReviewId: string | null;
}

export interface OnboardingAnswers {
  goal: Goal;
  experienceLevel: ExperienceLevel;
  workoutDuration: UserProfile['workoutDuration'];
  workoutsPerWeek: UserProfile['workoutsPerWeek'];
  availableEquipment: Equipment[];
}

export type RecoveryState = Record<MuscleGroup, number>;
