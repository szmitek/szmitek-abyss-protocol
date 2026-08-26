import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { loadSnapshot, saveSnapshot } from '../data/storage.ts';
import { toDateKey } from '../domain/date.ts';
import { generateDailyProtocol, generateRankTrial, replaceExerciseInPlan } from '../domain/generator.ts';
import { recordPostureScan, removePostureScan } from '../domain/postureArchive.ts';
import { createProfile, INITIAL_SNAPSHOT, recordMovementAssessment, restoreExcludedExercises, updateHealthProfile, updateProfileSettings } from '../domain/profile.ts';
import { applyCompletedWorkout, calculateAttributeDevelopment, completeRankTrial, createCompletionSummary, rankTrialEligibility } from '../domain/progression.ts';
import type { AppSnapshot, MovementAssessmentKind, MovementCheck, MovementRating, OnboardingAnswers, PerceivedDifficulty, PlayerHealthProfile, PostureScan, WorkoutHistoryEntry } from '../domain/types.ts';

interface AppStoreValue {
  snapshot: AppSnapshot;
  hydrated: boolean;
  completeOnboarding: (answers: OnboardingAnswers) => void;
  updateProfile: (answers: OnboardingAnswers) => void;
  updateSystemScan: (healthProfile: PlayerHealthProfile) => void;
  completeMovementAssessment: (results: Record<MovementCheck, MovementRating>, kind: MovementAssessmentKind) => void;
  savePostureScan: (scan: PostureScan) => void;
  deletePostureScan: (scanId: string) => void;
  restoreExercises: () => void;
  beginDailyQuest: () => void;
  beginRankTrial: () => void;
  replaceCurrentExercise: (permanentlyExclude: boolean) => void;
  completeCurrentSet: () => void;
  abandonWorkout: () => void;
  finishWorkout: (difficulty: PerceivedDifficulty) => void;
  dismissCompletion: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function freshQuest(snapshot: AppSnapshot, dateKey = toDateKey(new Date())): AppSnapshot {
  if (!snapshot.profile || snapshot.activeWorkout) return snapshot;
  if (snapshot.dailyQuest?.dateKey === dateKey) return snapshot;
  const plan = generateDailyProtocol(snapshot.profile, snapshot.history, dateKey);
  return { ...snapshot, dailyQuest: { id: `quest-${dateKey}`, dateKey, status: plan.kind === 'recovery' || plan.kind === 'safety-hold' || plan.kind === 'reassessment' ? 'complete' : 'available', plan } };
}

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(INITIAL_SNAPSHOT);
  const [hydrated, setHydrated] = useState(false);

  const commit = useCallback((update: (current: AppSnapshot) => AppSnapshot) => {
    setSnapshot((current) => {
      const next = update(current);
      void saveSnapshot(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadSnapshot().then((stored) => {
      if (!mounted) return;
      const ready = freshQuest(stored);
      setSnapshot(ready);
      void saveSnapshot(ready);
      setHydrated(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') commit((current) => freshQuest(current));
    });
    return () => subscription.remove();
  }, [commit]);

  const completeOnboarding = useCallback((answers: OnboardingAnswers) => {
    const profile = createProfile(answers);
    const base: AppSnapshot = { ...INITIAL_SNAPSHOT, onboardingComplete: true, profile };
    commit(() => freshQuest(base));
  }, [commit]);

  const updateProfile = useCallback((answers: OnboardingAnswers) => {
    commit((current) => {
      if (!current.profile || current.activeWorkout) return current;
      const profile = updateProfileSettings(current.profile, answers);
      if (current.dailyQuest?.status === 'complete' && current.dailyQuest.plan.kind !== 'recovery') return { ...current, profile };
      return freshQuest({ ...current, profile, dailyQuest: null });
    });
  }, [commit]);

  const updateSystemScan = useCallback((healthProfile: PlayerHealthProfile) => {
    commit((current) => {
      if (!current.profile || current.activeWorkout) return current;
      const profile = updateHealthProfile(current.profile, healthProfile);
      if (current.dailyQuest?.status === 'complete' && current.dailyQuest.plan.kind === 'training') return { ...current, profile };
      return freshQuest({ ...current, profile, dailyQuest: null });
    });
  }, [commit]);

  const completeMovementAssessment = useCallback((results: Record<MovementCheck, MovementRating>, kind: MovementAssessmentKind) => {
    commit((current) => {
      if (!current.profile || current.activeWorkout) return current;
      const profile = recordMovementAssessment(current.profile, results, kind);
      if (current.dailyQuest?.status === 'complete' && current.dailyQuest.plan.kind === 'training') return { ...current, profile };
      return freshQuest({ ...current, profile, dailyQuest: null });
    });
  }, [commit]);

  const savePostureScan = useCallback((scan: PostureScan) => {
    commit((current) => current.profile
      ? { ...current, profile: recordPostureScan(current.profile, scan) }
      : current);
  }, [commit]);

  const deletePostureScan = useCallback((scanId: string) => {
    commit((current) => current.profile
      ? { ...current, profile: removePostureScan(current.profile, scanId) }
      : current);
  }, [commit]);

  const restoreExercises = useCallback(() => {
    commit((current) => {
      if (!current.profile || current.activeWorkout || current.profile.excludedExercises.length === 0) return current;
      const profile = restoreExcludedExercises(current.profile);
      if (current.dailyQuest?.status === 'complete' && current.dailyQuest.plan.kind !== 'recovery') return { ...current, profile };
      return freshQuest({ ...current, profile, dailyQuest: null });
    });
  }, [commit]);

  const beginDailyQuest = useCallback(() => {
    commit((current) => {
      const quest = current.dailyQuest;
      if (!quest || quest.status === 'complete') return current;
      return {
        ...current,
        dailyQuest: { ...quest, status: 'active' },
        activeWorkout: {
          questId: quest.id,
          plan: quest.plan,
          exerciseIndex: 0,
          completedSets: quest.plan.exercises.map(() => 0),
          startedAt: new Date().toISOString(),
        },
      };
    });
  }, [commit]);

  const beginRankTrial = useCallback(() => {
    commit((current) => {
      if (!current.profile || current.activeWorkout) return current;
      const eligibility = rankTrialEligibility(current.profile);
      if (!eligibility.eligible || !eligibility.target) return current;
      const plan = generateRankTrial(current.profile, current.history, toDateKey(new Date()), eligibility.target);
      return {
        ...current,
        activeWorkout: {
          questId: `rank-${eligibility.target}`,
          plan,
          exerciseIndex: 0,
          completedSets: plan.exercises.map(() => 0),
          startedAt: new Date().toISOString(),
        },
      };
    });
  }, [commit]);

  const replaceCurrentExercise = useCallback((permanentlyExclude: boolean) => {
    commit((current) => {
      const active = current.activeWorkout;
      const profile = current.profile;
      if (!active || !profile || (active.completedSets[active.exerciseIndex] ?? 0) > 0) return current;
      const currentExercise = active.plan.exercises[active.exerciseIndex]?.exercise;
      if (!currentExercise) return current;

      const nextProfile = permanentlyExclude && !profile.excludedExercises.includes(currentExercise.id)
        ? { ...profile, excludedExercises: [...profile.excludedExercises, currentExercise.id] }
        : profile;
      const plan = replaceExerciseInPlan(active.plan, active.exerciseIndex, nextProfile);
      if (!plan) return current;
      const dailyQuest = current.dailyQuest?.id === active.questId
        ? { ...current.dailyQuest, plan }
        : current.dailyQuest;
      return { ...current, profile: nextProfile, dailyQuest, activeWorkout: { ...active, plan } };
    });
  }, [commit]);

  const completeCurrentSet = useCallback(() => {
    commit((current) => {
      const active = current.activeWorkout;
      if (!active || active.exerciseIndex >= active.plan.exercises.length) return current;
      const prescription = active.plan.exercises[active.exerciseIndex];
      if (!prescription) return current;
      const completedSets = [...active.completedSets];
      const nextSetCount = (completedSets[active.exerciseIndex] ?? 0) + 1;
      completedSets[active.exerciseIndex] = Math.min(nextSetCount, prescription.sets);
      const exerciseIndex = nextSetCount >= prescription.sets ? active.exerciseIndex + 1 : active.exerciseIndex;
      return { ...current, activeWorkout: { ...active, completedSets, exerciseIndex } };
    });
  }, [commit]);

  const abandonWorkout = useCallback(() => {
    commit((current) => {
      const active = current.activeWorkout;
      if (!active) return current;
      const dailyQuest = current.dailyQuest?.id === active.questId
        ? { ...current.dailyQuest, status: 'available' as const }
        : current.dailyQuest;
      return { ...current, dailyQuest, activeWorkout: null };
    });
  }, [commit]);

  const finishWorkout = useCallback((difficulty: PerceivedDifficulty) => {
    commit((current) => {
      const active = current.activeWorkout;
      if (!active || !current.profile || active.exerciseIndex < active.plan.exercises.length) return current;
      const now = new Date();
      const development = calculateAttributeDevelopment(current.profile, active.plan);
      const entry: WorkoutHistoryEntry = {
        id: `workout-${now.getTime()}`,
        date: now.toISOString(),
        dateKey: toDateKey(now),
        planId: active.plan.id,
        title: active.plan.title,
        completed: true,
        durationSeconds: Math.max(60, Math.round((now.getTime() - new Date(active.startedAt).getTime()) / 1000)),
        difficulty: active.plan.difficulty,
        perceivedDifficulty: difficulty,
        results: active.plan.exercises.map((item, index) => ({
          exerciseId: item.exercise.id,
          completedSets: active.completedSets[index] ?? 0,
          targetPerSet: item.target,
          completedVolume: (active.completedSets[index] ?? 0) * item.target,
        })),
        xpEarned: active.plan.rewardXp,
        attributeXpEarned: development.attributeXpEarned,
        statGains: development.statGains,
      };
      const rankTrial = active.questId.startsWith('rank-');
      let profile = applyCompletedWorkout(current.profile, entry);
      if (rankTrial) profile = completeRankTrial(profile);
      const dailyQuest = rankTrial
        ? current.dailyQuest
        : current.dailyQuest ? { ...current.dailyQuest, status: 'complete' as const } : null;
      const lastCompletion = createCompletionSummary(current.profile, profile, entry, rankTrial);
      return { ...current, profile, history: [entry, ...current.history], dailyQuest, activeWorkout: null, lastCompletion };
    });
  }, [commit]);

  const dismissCompletion = useCallback(() => {
    commit((current) => current.lastCompletion ? { ...current, lastCompletion: null } : current);
  }, [commit]);

  const value = useMemo<AppStoreValue>(() => ({
    snapshot,
    hydrated,
    completeOnboarding,
    updateProfile,
    updateSystemScan,
    completeMovementAssessment,
    savePostureScan,
    deletePostureScan,
    restoreExercises,
    beginDailyQuest,
    beginRankTrial,
    replaceCurrentExercise,
    completeCurrentSet,
    abandonWorkout,
    finishWorkout,
    dismissCompletion,
  }), [snapshot, hydrated, completeOnboarding, updateProfile, updateSystemScan, completeMovementAssessment, savePostureScan, deletePostureScan, restoreExercises, beginDailyQuest, beginRankTrial, replaceCurrentExercise, completeCurrentSet, abandonWorkout, finishWorkout, dismissCompletion]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error('useAppStore must be used inside AppStoreProvider');
  return context;
}
