import { generateWorkout } from './generator.ts';
import { toDateKey } from './date.ts';
import { trainingWindow } from './schedule.ts';
import { getTrainingArcState } from './trainingArc.ts';
import { MUSCLE_GROUPS, type MuscleGroup, type UserProfile, type WeeklyProtocol, type WeeklyProtocolSession, type WeeklySessionBlueprint, type WorkoutHistoryEntry } from './types.ts';

const SESSION_TEMPLATES: readonly Omit<WeeklySessionBlueprint, 'dateKey'>[] = [
  { code: 'A', title: 'POWER FOUNDATION', objective: 'LOWER + PUSH', focusMuscles: ['quads', 'chest', 'core'] },
  { code: 'B', title: 'POSTERIOR CHAIN', objective: 'HINGE + PULL', focusMuscles: ['hamstrings', 'glutes', 'back', 'core'] },
  { code: 'C', title: 'CONTROL INTEGRATION', objective: 'FULL BODY + CORRECTIVE', focusMuscles: ['full-body', 'shoulders', 'core', 'glutes'] },
  { code: 'D', title: 'UPPER CAPACITY', objective: 'BACK + CHEST + SHOULDERS', focusMuscles: ['back', 'chest', 'shoulders', 'arms'] },
  { code: 'E', title: 'LOWER CAPACITY', objective: 'QUADS + GLUTES + HINGE', focusMuscles: ['quads', 'glutes', 'hamstrings', 'calves'] },
  { code: 'F', title: 'CONDITIONING WAVE', objective: 'FULL BODY + CORE', focusMuscles: ['full-body', 'core', 'quads', 'calves'] },
  { code: 'G', title: 'AURA RESTORATION', objective: 'CONTROL + MOBILITY', focusMuscles: ['back', 'glutes', 'shoulders', 'core'] },
];

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function weeklyVolumeCaps(profile: UserProfile): Partial<Record<MuscleGroup, number>> {
  const base = profile.experienceLevel === 'beginner' ? 10 : profile.experienceLevel === 'intermediate' ? 14 : 18;
  return Object.fromEntries(MUSCLE_GROUPS.map((group) => {
    if (group === 'neck') return [group, Math.max(4, profile.workoutsPerWeek)];
    if (group === 'full-body') return [group, Math.max(6, profile.workoutsPerWeek * 2)];
    if (group === 'core') return [group, Math.max(base + 4, profile.workoutsPerWeek * 3)];
    if (group === 'arms' || group === 'calves') return [group, Math.max(8, profile.workoutsPerWeek * 2)];
    return [group, Math.max(base, profile.workoutsPerWeek * 2)];
  })) as Partial<Record<MuscleGroup, number>>;
}

export function weeklyProtocolFingerprint(profile: UserProfile, dateKey: string): string {
  const arc = getTrainingArcState(profile.trainingArcs, dateKey);
  return JSON.stringify({
    goal: profile.goal,
    experienceLevel: profile.experienceLevel,
    workoutDuration: profile.workoutDuration,
    workoutsPerWeek: profile.workoutsPerWeek,
    availableEquipment: [...profile.availableEquipment].sort(),
    excludedExercises: [...profile.excludedExercises].sort(),
    healthUpdatedAt: profile.healthProfile.updatedAt,
    correctiveUpdatedAt: profile.correctiveProfile.updatedAt,
    movementAssessmentId: profile.movementAssessments[0]?.id ?? null,
    trainingArcId: arc?.arc.id ?? null,
    trainingArcWeek: arc?.week ?? null,
  });
}

function addVolume(used: Partial<Record<MuscleGroup, number>>, session: WeeklyProtocolSession): void {
  for (const item of session.plan.exercises) {
    if (item.exercise.exerciseType === 'warmup' || item.exercise.exerciseType === 'mobility') continue;
    used[item.exercise.primaryMuscle] = (used[item.exercise.primaryMuscle] ?? 0) + item.sets;
  }
}

export function buildWeeklyProtocol(profile: UserProfile, history: WorkoutHistoryEntry[], dateKey: string): WeeklyProtocol {
  const arc = getTrainingArcState(profile.trainingArcs, dateKey);
  const arcWeekStart = arc ? addDays(arc.arc.startDateKey, (arc.week - 1) * 7) : null;
  const window = arcWeekStart ? trainingWindow({ ...profile, totalWorkouts: 0 }, arcWeekStart) : trainingWindow(profile, dateKey);
  const protocolId = `weekly-${profile.id}-${window.startDateKey}`;
  const caps = weeklyVolumeCaps(profile);
  const used: Partial<Record<MuscleGroup, number>> = {};
  const sessionCount = window.trainingDateKeys.length;
  const sessions: WeeklyProtocolSession[] = window.trainingDateKeys.map((sessionDateKey, index) => {
    const template = SESSION_TEMPLATES[index]!;
    const blueprint: WeeklySessionBlueprint = { ...template, focusMuscles: [...template.focusMuscles], dateKey: sessionDateKey };
    const plan = generateWorkout(profile, history, sessionDateKey, {
      session: blueprint,
      protocolId,
      weekStartDateKey: window.startDateKey,
      sessionIndex: index,
      sessionCount,
      ignoreReadiness: true,
      weeklyVolumeUsed: used,
      weeklyVolumeCaps: caps,
    });
    const session = { ...blueprint, plan };
    addVolume(used, session);
    return session;
  });

  return {
    id: protocolId,
    weekStartDateKey: window.startDateKey,
    weekEndDateKey: window.endDateKey,
    createdAt: new Date().toISOString(),
    profileFingerprint: weeklyProtocolFingerprint(profile, dateKey),
    trainingArcCycle: arc?.cycleNumber ?? null,
    trainingArcWeek: arc?.week ?? null,
    volumeCaps: caps,
    sessions,
  };
}

export function weeklyProtocolIsCurrent(protocol: WeeklyProtocol | null, profile: UserProfile, dateKey: string): protocol is WeeklyProtocol {
  if (!protocol || dateKey < protocol.weekStartDateKey || dateKey > protocol.weekEndDateKey) return false;
  return protocol.profileFingerprint === weeklyProtocolFingerprint(profile, dateKey);
}

export function ensureWeeklyProtocol(protocol: WeeklyProtocol | null, profile: UserProfile, history: WorkoutHistoryEntry[], dateKey: string): WeeklyProtocol {
  return weeklyProtocolIsCurrent(protocol, profile, dateKey) ? protocol : buildWeeklyProtocol(profile, history, dateKey);
}

export function weeklyWorkingSets(protocol: WeeklyProtocol): Partial<Record<MuscleGroup, number>> {
  const used: Partial<Record<MuscleGroup, number>> = {};
  for (const session of protocol.sessions) addVolume(used, session);
  return used;
}
