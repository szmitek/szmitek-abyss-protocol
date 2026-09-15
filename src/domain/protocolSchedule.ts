import { toDateKey } from './date.ts';
import { readinessForDate } from './readiness.ts';
import { plannedTrainingWindow } from './schedule.ts';
import { getTrainingArcState } from './trainingArc.ts';
import { weeklyProtocolIsCurrent } from './weeklyProtocol.ts';
import type { ActiveWorkout, UserProfile, WeeklyProtocol, WeeklyProtocolSession, WorkoutHistoryEntry } from './types.ts';

export type SessionStatus = 'cleared' | 'trained' | 'active' | 'ready' | 'readiness' | 'missed' | 'recovery' | 'hold' | 'unavailable' | 'queued';

// A display projection only: never complete a quest, move a session or award XP here.
export function weeklySessionStatus(session: WeeklyProtocolSession, profile: UserProfile, history: readonly WorkoutHistoryEntry[], today: string, activeWorkout: ActiveWorkout | null = null): SessionStatus {
  if (session.dateKey > today) return 'queued';
  const completed = history.filter((entry) => entry.dateKey === session.dateKey && entry.completed
    && !entry.planId.startsWith('rank-trial-') && entry.results.some((result) => result.completedSets > 0));
  if (completed.some((entry) => entry.planId === session.plan.id)) return 'cleared';
  if (completed.length) return 'trained';
  const readiness = readinessForDate(profile, session.dateKey);
  if (readiness?.band === 'hold') return 'hold';
  if (readiness?.band === 'recovery') return 'recovery';
  if (session.plan.kind !== 'training') return 'unavailable';
  if (activeWorkout?.plan.id === session.plan.id && activeWorkout.plan.dateKey === session.dateKey) return 'active';
  if (session.dateKey < today) return 'missed';
  return readiness ? 'ready' : 'readiness';
}

// null means the active arc reaches its re-scan gate before another training date.
// Future readiness is deliberately not predicted; this is a scheduled date, not clearance.
export function nextProtocolTrainingDateKey(profile: UserProfile, protocol: WeeklyProtocol | null, today: string): string | null {
  const current = weeklyProtocolIsCurrent(protocol, profile, today) ? protocol : null;
  const window = plannedTrainingWindow(profile, today);
  const endDateKey = current?.weekEndDateKey ?? window.endDateKey;
  const dates = current ? current.sessions.map((session) => session.dateKey) : window.trainingDateKeys;
  for (let offset = 1; offset <= 7; offset += 1) {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() + offset);
    const candidate = toDateKey(date);
    if (getTrainingArcState(profile.trainingArcs, candidate)?.reassessmentDue) return null;
    if (candidate <= endDateKey) {
      if (dates.includes(candidate)) return candidate;
    } else if (plannedTrainingWindow(profile, candidate).trainingDateKeys.includes(candidate)) return candidate;
  }
  return null;
}
