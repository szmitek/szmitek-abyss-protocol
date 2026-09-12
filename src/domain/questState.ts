import { toDateKey } from './date.ts';
import { generateDailyProtocol, trainingGate } from './generator.ts';
import { ensureWeeklyProtocol } from './weeklyProtocol.ts';
import { createDailyReadiness, readinessForDate, recordDailyReadiness } from './readiness.ts';
import type { AppSnapshot, DailyReadinessInput } from './types.ts';

export function updateDailyReadiness(snapshot: AppSnapshot, input: DailyReadinessInput, expectedDateKey: string, now = new Date()): AppSnapshot {
  if (expectedDateKey !== toDateKey(now)) throw new Error('A new day has started. Return to the System and open a fresh readiness scan.');
  if (!snapshot.profile || snapshot.activeWorkout) throw new Error('Finish or exit your workout before editing readiness.');
  const readiness = createDailyReadiness(input, now);
  const profile = recordDailyReadiness(snapshot.profile, readiness);
  return refreshDailyQuest({ ...snapshot, profile, dailyQuest: null }, readiness.dateKey);
}

export function refreshDailyQuest(snapshot: AppSnapshot, dateKey = toDateKey(new Date())): AppSnapshot {
  if (!snapshot.profile || snapshot.activeWorkout) return snapshot;
  const profile = snapshot.profile;
  const gate = trainingGate(profile, dateKey);
  const weeklyProtocol = gate ? null : ensureWeeklyProtocol(snapshot.weeklyProtocol, profile, snapshot.history, dateKey);
  const withProtocol = weeklyProtocol === snapshot.weeklyProtocol ? snapshot : { ...snapshot, weeklyProtocol };
  const currentQuest = withProtocol.dailyQuest;
  const readinessBand = readinessForDate(profile, dateKey)?.band;
  // IDs identify a calendar week; a rebuilt contract may have the same ID and different rules.
  const questUsesCurrentProtocol = weeklyProtocol === snapshot.weeklyProtocol
    && weeklyProtocol && currentQuest?.plan.weeklySession?.protocolId === weeklyProtocol.id
    && currentQuest.plan.kind === 'training' && currentQuest.plan.readinessBand === readinessBand;
  if (!gate && currentQuest?.dateKey === dateKey && (currentQuest.status === 'complete' && currentQuest.plan.kind === 'training' || questUsesCurrentProtocol)) return withProtocol;
  const plan = gate ?? generateDailyProtocol(profile, snapshot.history, dateKey, weeklyProtocol);
  const alreadyCleared = snapshot.history.some((entry) => entry.completed && entry.dateKey === dateKey && !entry.planId.startsWith('rank-trial-'));
  const executable = plan.kind === 'training' || plan.kind === 'rank-trial';
  return {
    ...withProtocol,
    dailyQuest: { id: `quest-${dateKey}`, dateKey, status: !executable || alreadyCleared ? 'complete' : 'available', plan },
  };
}

export function acknowledgeTrainingArcReview(snapshot: AppSnapshot, dateKey = toDateKey(new Date())): AppSnapshot {
  return snapshot.pendingArcReviewId
    ? refreshDailyQuest({ ...snapshot, pendingArcReviewId: null, weeklyProtocol: null, dailyQuest: null }, dateKey)
    : snapshot;
}

export function beginDailyWorkout(snapshot: AppSnapshot, now = new Date()): AppSnapshot {
  if (!snapshot.profile || snapshot.activeWorkout || snapshot.pendingArcReviewId) return snapshot;
  const current = refreshDailyQuest(snapshot, toDateKey(now));
  const quest = current.dailyQuest;
  const readiness = readinessForDate(current.profile!, toDateKey(now));
  if (!quest || quest.status === 'complete' || quest.plan.kind !== 'training' || !readiness || !['normal', 'reduced'].includes(readiness.band)) return current;
  return {
    ...current,
    dailyQuest: { ...quest, status: 'active' },
    activeWorkout: {
      questId: quest.id, plan: quest.plan, exerciseIndex: 0,
      completedSets: quest.plan.exercises.map(() => 0), startedAt: now.toISOString(),
    },
  };
}
