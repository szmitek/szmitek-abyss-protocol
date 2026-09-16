import { configureLoadouts } from './loadouts.ts';
import { toDateKey } from './date.ts';
import { lastNormalWorkout, returnPlanActive, returnProgress, RETURN_SESSIONS } from './returnTraining.ts';
import { generateDailyProtocol, trainingGate } from './generator.ts';
import { ensureWeeklyProtocol } from './weeklyProtocol.ts';
import { createDailyReadiness, readinessForDate, recordDailyReadiness } from './readiness.ts';
import type { AppSnapshot, DailyReadinessInput, TrainingLoadouts, MachineSetup } from './types.ts';

export function changeReturnPlan(snapshot: AppSnapshot, expectedDateKey: string, expectedId: string | null, action: 'start' | 'end', now = new Date()): AppSnapshot {
  const dateKey = toDateKey(now), profile = snapshot.profile;
  if (!['start', 'end'].includes(action)) throw new Error('Unknown return-plan action.');
  if (dateKey !== expectedDateKey) throw new Error('A new day has started. Open a fresh return-plan review.');
  if (!profile || snapshot.activeWorkout) throw new Error('Finish or close the active workout before changing the return plan.');
  if ((profile.returnPlan?.id ?? null) !== expectedId) throw new Error('The return plan changed. Open a fresh review.');
  if (snapshot.pendingArcReviewId || trainingGate(profile, dateKey)) throw new Error('Complete the Player checks and arc review before changing the return plan.');
  if (action === 'start' && returnPlanActive(profile) || action === 'end' && !returnPlanActive(profile)) return snapshot;
  if (action === 'start' && !lastNormalWorkout(snapshot.history, now)) throw new Error('Complete your first normal training session before using a return plan.');
  if (profile.returnPlan && (now.getTime() < Date.parse(profile.returnPlan.endedAt ?? profile.returnPlan.startedAt) || action === 'start' && now.getTime() === Date.parse(profile.returnPlan.startedAt))) throw new Error('Check the device date before changing the return plan.');
  const returnPlan = action === 'start'
    ? { id: `return-${now.getTime()}`, startedAt: now.toISOString(), startDateKey: dateKey, endedAt: null, endDateKey: null, exitReason: null }
    : { ...profile.returnPlan!, endedAt: now.toISOString(), endDateKey: dateKey, exitReason: returnProgress(profile, snapshot.history, now) >= RETURN_SESSIONS ? 'completed' as const : 'early-exit' as const };
  const completedToday = snapshot.dailyQuest?.dateKey === dateKey && snapshot.dailyQuest.status === 'complete' && snapshot.dailyQuest.plan.kind === 'training';
  return refreshDailyQuest({ ...snapshot, profile: { ...profile, returnPlan }, weeklyProtocol: null, dailyQuest: completedToday ? snapshot.dailyQuest : null }, dateKey);
}

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

export function closeActiveWorkout(snapshot: AppSnapshot, now = new Date()): AppSnapshot {
  if (!snapshot.activeWorkout) return snapshot;
  const dailyQuest = snapshot.dailyQuest?.id === snapshot.activeWorkout.questId
    ? { ...snapshot.dailyQuest, status: 'available' as const }
    : snapshot.dailyQuest;
  return refreshDailyQuest({ ...snapshot, dailyQuest, activeWorkout: null }, toDateKey(now));
}

export function updateTrainingLoadouts(snapshot: AppSnapshot, loadouts: TrainingLoadouts, setups: MachineSetup[], now = new Date()): AppSnapshot {
  if (!snapshot.profile || snapshot.activeWorkout) throw new Error('Finish or exit the workout before changing your loadout.');
  const profile = configureLoadouts(snapshot.profile, loadouts, setups);
  return refreshDailyQuest({ ...snapshot, profile, weeklyProtocol: null }, toDateKey(now));
}
