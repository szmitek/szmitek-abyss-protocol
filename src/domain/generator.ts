import { EXERCISES } from '../data/exercises.ts';
import { hasSafetyHold, healthPriorityScore, isHealthCompatible, preferredHealthExercises } from './health.ts';
import { calculateRecovery } from './recovery.ts';
import { isScheduledTrainingDay } from './schedule.ts';
import { GOALS, MUSCLE_GROUPS, type Exercise, type ExercisePrescription, type MuscleGroup, type Rank, type UserProfile, type WorkoutHistoryEntry, type WorkoutPlan } from './types.ts';

export function isEquipmentCompatible(exercise: Exercise, availableEquipment: readonly string[]): boolean {
  return exercise.requiredEquipment.every((required) => availableEquipment.includes(required));
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFactory(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4_294_967_296;
  };
}

function difficultyCap(profile: UserProfile): 1 | 2 | 3 {
  if (profile.experienceLevel === 'beginner') return profile.totalWorkouts >= 8 ? 2 : 1;
  if (profile.experienceLevel === 'intermediate') return profile.totalWorkouts >= 12 ? 3 : 2;
  return 3;
}

function goalPriorities(profile: UserProfile): MuscleGroup[] {
  switch (profile.goal) {
    case GOALS.STRENGTH:
    case GOALS.MUSCLE:
      return ['chest', 'quads', 'glutes', 'back', 'shoulders', 'core', 'hamstrings'];
    case GOALS.FAT_LOSS:
    case GOALS.CONDITIONING:
      return ['full-body', 'quads', 'core', 'glutes', 'calves', 'chest'];
    case GOALS.MOBILITY:
      return ['glutes', 'back', 'hamstrings', 'shoulders', 'core', 'quads'];
    default:
      return ['quads', 'chest', 'core', 'glutes', 'back', 'full-body', 'shoulders'];
  }
}

function recentExerciseIds(history: WorkoutHistoryEntry[]): Set<string> {
  const latest = [...history].filter((entry) => entry.completed).sort((a, b) => b.date.localeCompare(a.date))[0];
  return new Set(latest?.results.map((result) => result.exerciseId) ?? []);
}

function chooseVariant(group: Exercise[], profile: UserProfile, history: WorkoutHistoryEntry[]): Exercise {
  const ordered = [...group].sort((a, b) => a.progressionLevel - b.progressionLevel);
  const results = history.flatMap((workout) => workout.results.map((result) => ({ workout, result })))
    .filter(({ result }) => ordered.some((exercise) => exercise.id === result.exerciseId))
    .sort((a, b) => b.workout.date.localeCompare(a.workout.date));

  if (results.length === 0) {
    const position = profile.experienceLevel === 'beginner' ? 0 : profile.experienceLevel === 'intermediate' ? Math.floor((ordered.length - 1) * 0.45) : Math.floor((ordered.length - 1) * 0.7);
    return ordered[position] ?? ordered[0]!;
  }

  const current = ordered.find((exercise) => exercise.id === results[0]?.result.exerciseId) ?? ordered[0]!;
  const currentResults = results.filter(({ result }) => result.exerciseId === current.id).slice(0, 2);
  const mastered = currentResults.length >= 2 && currentResults.every(({ workout, result }) =>
    workout.perceivedDifficulty !== 'too-hard' && result.completedSets > 0 && result.completedVolume >= result.completedSets * result.targetPerSet,
  );
  if (!mastered) return current;
  return ordered[ordered.indexOf(current) + 1] ?? current;
}

function prescribe(exercise: Exercise, profile: UserProfile, history: WorkoutHistoryEntry[]): ExercisePrescription {
  const previous = history.flatMap((workout) => workout.results.map((result) => ({ workout, result })))
    .filter(({ result }) => result.exerciseId === exercise.id)
    .sort((a, b) => b.workout.date.localeCompare(a.workout.date));
  const baseOffset = profile.experienceLevel === 'beginner' ? 0 : profile.experienceLevel === 'intermediate' ? 2 : 3;
  let target = Math.min(exercise.maxReps, exercise.minReps + baseOffset);

  if (previous[0]) {
    target = previous[0].result.targetPerSet;
    if (previous[0].workout.perceivedDifficulty === 'too-hard') target = Math.max(exercise.minReps, target - (exercise.repType === 'seconds' ? 5 : 2));
    const lastTwoMastered = previous.length >= 2 && previous.slice(0, 2).every(({ workout, result }) =>
      workout.perceivedDifficulty !== 'too-hard' && result.completedVolume >= result.completedSets * result.targetPerSet,
    );
    if (lastTwoMastered) target = Math.min(exercise.maxReps, target + (exercise.repType === 'seconds' ? 5 : 2));
  }

  const sets = exercise.exerciseType === 'warmup' || exercise.exerciseType === 'mobility'
    ? 1
    : profile.workoutDuration <= 15 ? 2 : profile.workoutDuration === 60 && profile.experienceLevel === 'advanced' ? 4 : 3;
  return { exercise, sets, target, restSeconds: exercise.defaultRest };
}

function desiredExerciseCount(minutes: UserProfile['workoutDuration']): number {
  if (minutes <= 10) return 4;
  if (minutes <= 15) return 5;
  if (minutes <= 20) return 6;
  if (minutes <= 30) return 7;
  if (minutes <= 45) return 9;
  return 10;
}

function replacementScore(candidate: Exercise, current: Exercise): number {
  const sharedMuscles = candidate.muscleGroups.filter((group) => current.muscleGroups.includes(group)).length;
  return (candidate.primaryMuscle === current.primaryMuscle ? 100 : 0)
    + sharedMuscles * 15
    + (candidate.difficulty === current.difficulty ? 25 : 0)
    + (candidate.progressionGroup === current.progressionGroup ? -30 : 0)
    - Math.abs(candidate.progressionLevel - current.progressionLevel);
}

export function replaceExerciseInPlan(plan: WorkoutPlan, exerciseIndex: number, profile: UserProfile): WorkoutPlan | null {
  const current = plan.exercises[exerciseIndex];
  if (!current) return null;

  const planExerciseIds = new Set(plan.exercises.map((item) => item.exercise.id));
  const candidates = EXERCISES.filter((exercise) =>
    exercise.id !== current.exercise.id
    && !planExerciseIds.has(exercise.id)
    && !profile.excludedExercises.includes(exercise.id)
    && isEquipmentCompatible(exercise, profile.availableEquipment)
    && isHealthCompatible(exercise, profile)
    && exercise.exerciseType === current.exercise.exerciseType
    && exercise.repType === current.exercise.repType
    && exercise.difficulty <= current.exercise.difficulty,
  ).sort((a, b) => replacementScore(b, current.exercise) - replacementScore(a, current.exercise) || a.id.localeCompare(b.id));

  const replacement = candidates[0];
  if (!replacement) return null;
  const exercises = [...plan.exercises];
  exercises[exerciseIndex] = {
    ...current,
    exercise: replacement,
    target: Math.max(replacement.minReps, Math.min(replacement.maxReps, current.target)),
    restSeconds: replacement.defaultRest,
  };

  if (!isEquipmentCompatible(replacement, profile.availableEquipment)) {
    throw new Error('Equipment constraint invariant violated during exercise replacement.');
  }
  return { ...plan, exercises };
}

export function generateWorkout(profile: UserProfile, history: WorkoutHistoryEntry[], dateKey: string): WorkoutPlan {
  const random = randomFactory(`${profile.id}:${dateKey}:${profile.totalWorkouts}`);
  const cap = difficultyCap(profile);
  const eligible = EXERCISES.filter((exercise) =>
    isEquipmentCompatible(exercise, profile.availableEquipment) &&
    isHealthCompatible(exercise, profile) &&
    !profile.excludedExercises.includes(exercise.id) &&
    exercise.difficulty <= cap,
  );
  if (eligible.length === 0) throw new Error('No exercises satisfy the equipment safety constraint.');

  const now = new Date(`${dateKey}T12:00:00`);
  const recovery = calculateRecovery(history, now);
  const priorityIndex = new Map(goalPriorities(profile).map((group, index) => [group, index]));
  const focusGroups: MuscleGroup[] = MUSCLE_GROUPS
    .filter((group) => group !== 'arms' && group !== 'calves')
    .sort((a, b) => (recovery[b] - recovery[a]) || ((priorityIndex.get(a) ?? 99) - (priorityIndex.get(b) ?? 99)))
    .slice(0, 4);
  const recent = recentExerciseIds(history);
  const totalCount = desiredExerciseCount(profile.workoutDuration);
  const selected: Exercise[] = [];

  const warmups = eligible.filter((exercise) => exercise.exerciseType === 'warmup');
  if (warmups.length > 0) selected.push(warmups[Math.floor(random() * warmups.length)]!);

  const calibratedExercise = preferredHealthExercises(profile, eligible)
    .find((exercise) => exercise.exerciseType !== 'warmup' && exercise.exerciseType !== 'mobility');
  if (calibratedExercise && selected.length < totalCount - 1) selected.push(calibratedExercise);

  const workPool = eligible.filter((exercise) => exercise.exerciseType !== 'warmup' && exercise.exerciseType !== 'mobility');
  const grouped = new Map<string, Exercise[]>();
  for (const exercise of workPool) {
    const bucket = grouped.get(exercise.progressionGroup) ?? [];
    bucket.push(exercise);
    grouped.set(exercise.progressionGroup, bucket);
  }

  const scoredGroups = [...grouped.values()].map((variants) => {
    const representative = variants[0]!;
    const focusIndex = focusGroups.indexOf(representative.primaryMuscle);
    const focusScore = focusIndex < 0 ? 0 : 30 - focusIndex * 6;
    const varietyScore = variants.some((exercise) => recent.has(exercise.id)) ? -18 : 8;
    const jitter = random() * 10;
    const calibrationScore = Math.max(...variants.map((exercise) => healthPriorityScore(exercise, profile)));
    return { variants, score: focusScore + recovery[representative.primaryMuscle] * 0.35 + varietyScore + calibrationScore + jitter };
  }).sort((a, b) => b.score - a.score);

  for (const candidate of scoredGroups) {
    if (selected.length >= totalCount - 1) break;
    if (candidate.variants.some((exercise) => selected.some((item) => item.progressionGroup === exercise.progressionGroup))) continue;
    selected.push(chooseVariant(candidate.variants, profile, history));
  }

  const mobility = eligible.filter((exercise) => exercise.exerciseType === 'mobility' && !selected.some((item) => item.id === exercise.id));
  if (mobility.length > 0) {
    const best = [...mobility].sort((a, b) => focusGroups.indexOf(a.primaryMuscle) - focusGroups.indexOf(b.primaryMuscle))[0];
    if (best) selected.push(best);
  }

  const prescriptions = selected.slice(0, totalCount).map((exercise) => prescribe(exercise, profile, history));
  if (!prescriptions.every((item) => isEquipmentCompatible(item.exercise, profile.availableEquipment) && isHealthCompatible(item.exercise, profile))) {
    throw new Error('Workout safety constraint invariant violated.');
  }

  const difficulty = Math.max(...prescriptions.map((item) => item.exercise.difficulty)) as 1 | 2 | 3;
  const focus = focusGroups.slice(0, 2).map((group) => group.replace('-', ' ')).join(' + ');
  return {
    id: `daily-${dateKey}`,
    kind: 'training',
    dateKey,
    title: profile.goal === GOALS.MOBILITY ? 'AURA RESTORATION' : 'DAILY PROTOCOL',
    focus: focus.toUpperCase(),
    estimatedMinutes: profile.workoutDuration,
    difficulty,
    exercises: prescriptions,
    rewardXp: 80 + prescriptions.length * 12 + difficulty * 20,
  };
}

export function generateRecoveryProtocol(dateKey: string): WorkoutPlan {
  return {
    id: `recovery-${dateKey}`,
    kind: 'recovery',
    dateKey,
    title: 'RECOVERY PROTOCOL',
    focus: 'SYSTEM REST DAY',
    estimatedMinutes: 0,
    difficulty: 1,
    exercises: [],
    rewardXp: 0,
  };
}

export function generateSafetyHoldProtocol(dateKey: string): WorkoutPlan {
  return {
    id: `safety-hold-${dateKey}`,
    kind: 'safety-hold',
    dateKey,
    title: 'SYSTEM SAFEGUARD',
    focus: 'PLAYER CLEARANCE REQUIRED',
    estimatedMinutes: 0,
    difficulty: 1,
    exercises: [],
    rewardXp: 0,
  };
}

export function generateDailyProtocol(profile: UserProfile, history: WorkoutHistoryEntry[], dateKey: string): WorkoutPlan {
  if (hasSafetyHold(profile.healthProfile)) return generateSafetyHoldProtocol(dateKey);
  return isScheduledTrainingDay(profile, dateKey)
    ? generateWorkout(profile, history, dateKey)
    : generateRecoveryProtocol(dateKey);
}

export function generateRankTrial(profile: UserProfile, history: WorkoutHistoryEntry[], dateKey: string, targetRank: Rank): WorkoutPlan {
  const base = generateWorkout({ ...profile, workoutDuration: Math.max(20, profile.workoutDuration) as UserProfile['workoutDuration'] }, history, dateKey);
  return {
    ...base,
    id: `rank-trial-${targetRank}-${dateKey}`,
    kind: 'rank-trial',
    title: `RANK ${targetRank} TRIAL`,
    focus: 'ASCENSION PROTOCOL',
    exercises: base.exercises.map((item) => ({
      ...item,
      target: Math.min(item.exercise.maxReps, item.target + (item.exercise.repType === 'seconds' ? 5 : 2)),
    })),
    rewardXp: base.rewardXp + 150,
  };
}
