import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { snapshotRepository } from '../data/storage.ts';
import { stageVaultRestore } from '../data/vaultFiles.ts';
import type { BackupFile } from '../domain/backup.ts';
import { toDateKey } from '../domain/date.ts';
import { generateRankTrial, replaceExerciseInPlan } from '../domain/generator.ts';
import { acknowledgeTrainingArcReview, beginDailyWorkout, refreshDailyQuest as freshQuest } from '../domain/questState.ts';
import { recordPostureScan, removePostureScan } from '../domain/postureArchive.ts';
import { createProfile, INITIAL_SNAPSHOT, recordMovementAssessment, restoreExcludedExercises, updateCorrectiveProfile, updateHealthProfile, updateProfileSettings } from '../domain/profile.ts';
import { applyCompletedWorkout, calculateAttributeDevelopment, completeRankTrial, createCompletionSummary, rankTrialEligibility } from '../domain/progression.ts';
import { createDailyReadiness, recordDailyReadiness } from '../domain/readiness.ts';
import type { AppSnapshot, CorrectiveProfile, DailyReadinessInput, MovementAssessmentKind, MovementCheck, MovementRating, OnboardingAnswers, PerceivedDifficulty, PlayerHealthProfile, PostureScan, WorkoutHistoryEntry } from '../domain/types.ts';

interface AppStoreValue {
  snapshot: AppSnapshot;
  hydrated: boolean;
  loadError: string | null;
  saveError: string | null;
  saving: boolean;
  restoring: boolean;
  retrySave: () => void;
  reloadStorage: () => Promise<void>;
  restoreBackup: (backup: BackupFile) => Promise<void>;
  restoreLocalRecovery: () => Promise<void>;
  completeOnboarding: (answers: OnboardingAnswers) => void;
  updateProfile: (answers: OnboardingAnswers) => void;
  updateSystemScan: (healthProfile: PlayerHealthProfile) => void;
  updateCorrectiveProfile: (correctiveProfile: CorrectiveProfile) => void;
  completeMovementAssessment: (results: Record<MovementCheck, MovementRating>, kind: MovementAssessmentKind) => void;
  acknowledgeArcReview: () => void;
  savePostureScan: (scan: PostureScan) => Promise<void>;
  deletePostureScan: (scanId: string) => Promise<void>;
  submitDailyReadiness: (input: DailyReadinessInput) => void;
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

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<AppSnapshot>(INITIAL_SNAPSHOT);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const currentRef = useRef(snapshot);
  const readyRef = useRef(false);
  const busyRef = useRef(false);
  const dirtyRef = useRef(false);
  const mountedRef = useRef(true);
  const saveSequence = useRef(0);
  const loadSequence = useRef(0);

  const persist = useCallback((next: AppSnapshot) => {
    const sequence = ++saveSequence.current;
    dirtyRef.current = true; setSaving(true);
    void snapshotRepository.save(next).then(() => {
      if (!mountedRef.current || sequence !== saveSequence.current) return;
      dirtyRef.current = false; setSaveError(null); setSaving(false);
    }).catch(() => {
      if (!mountedRef.current || sequence !== saveSequence.current) return;
      setSaveError('Progress is only in memory. Keep the app open and retry saving.'); setSaving(false);
    });
  }, []);

  const commit = useCallback((update: (current: AppSnapshot) => AppSnapshot) => {
    if (!readyRef.current || busyRef.current) return;
    const next = update(currentRef.current);
    if (next === currentRef.current) return;
    currentRef.current = next; setSnapshot(next); persist(next);
  }, [persist]);

  const reloadStorage = useCallback(async () => {
    if (busyRef.current || dirtyRef.current) return;
    const sequence = ++loadSequence.current;
    readyRef.current = false;
    try {
      const stored = await snapshotRepository.load();
      const ready = freshQuest(stored);
      if (!mountedRef.current || sequence !== loadSequence.current) return;
      currentRef.current = ready; setSnapshot(ready); readyRef.current = true;
      setLoadError(null); setHydrated(true);
      if (ready !== stored) persist(ready);
    } catch {
      if (!mountedRef.current || sequence !== loadSequence.current) return;
      setLoadError('The saved Player could not be read. The original record has been left untouched. Retry loading or restore a Data Vault backup.');
      setHydrated(true);
    }
  }, [persist]);

  useEffect(() => {
    mountedRef.current = true;
    void reloadStorage();
    return () => { mountedRef.current = false; loadSequence.current += 1; };
  }, [reloadStorage]);

  const retrySave = useCallback(() => { if (readyRef.current && !busyRef.current) persist(currentRef.current); }, [persist]);

  const commitPhotoChange = useCallback(async (update: (current: AppSnapshot) => AppSnapshot) => {
    if (!readyRef.current || busyRef.current) throw new Error('Storage is busy. Try again.');
    busyRef.current = true; setSaving(true); saveSequence.current += 1;
    try {
      const next = update(currentRef.current);
      await snapshotRepository.save(next);
      currentRef.current = next; setSnapshot(next); dirtyRef.current = false; setSaveError(null);
    } catch (error) {
      if (dirtyRef.current) setSaveError('Progress is only in memory. Keep the app open and retry saving.');
      throw error;
    } finally { busyRef.current = false; setSaving(false); }
  }, []);

  const restoreBackup = useCallback(async (backup: BackupFile) => {
    if (busyRef.current || currentRef.current.activeWorkout) throw new Error('Finish or exit the active workout before restoring data.');
    busyRef.current = true; setRestoring(true); saveSequence.current += 1;
    let staged: Awaited<ReturnType<typeof stageVaultRestore>> | null = null;
    let replacementAttempted = false;
    try {
      if (readyRef.current) {
        // The recovery slot must include the latest in-memory edits, even after a failed autosave.
        await snapshotRepository.save(currentRef.current);
        dirtyRef.current = false; setSaveError(null);
      }
      staged = await stageVaultRestore(backup);
      const next = freshQuest(staged.snapshot);
      replacementAttempted = true;
      await snapshotRepository.replace(next);
      currentRef.current = next; setSnapshot(next); readyRef.current = true;
      dirtyRef.current = false; setLoadError(null); setSaveError(null); setHydrated(true);
    } catch (error) {
      // A storage error can have an ambiguous write result; retain staged files after
      // replacement starts so a persisted snapshot can never reference deleted photos.
      if (!replacementAttempted) staged?.rollback();
      if (dirtyRef.current) setSaveError('The current Player could not be saved. Retry saving before importing.');
      throw error;
    } finally { busyRef.current = false; setRestoring(false); setSaving(false); }
  }, []);

  const restoreLocalRecovery = useCallback(async () => {
    if (busyRef.current || currentRef.current.activeWorkout) throw new Error('Finish or exit the active workout before restoring data.');
    busyRef.current = true; setRestoring(true); saveSequence.current += 1;
    let published = false;
    try {
      const recovered = await snapshotRepository.restoreRecovery();
      const next = freshQuest(recovered);
      currentRef.current = next; setSnapshot(next); readyRef.current = true;
      published = true;
      dirtyRef.current = false; setLoadError(null); setSaveError(null); setHydrated(true);
      if (next !== recovered) persist(next);
    } finally { busyRef.current = false; setRestoring(false); if (!published) setSaving(false); }
  }, [persist]);

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
      if (current.dailyQuest?.status === 'complete' && current.dailyQuest.plan.kind !== 'recovery') return { ...current, profile, weeklyProtocol: null };
      return freshQuest({ ...current, profile, weeklyProtocol: null, dailyQuest: null });
    });
  }, [commit]);

  const updateSystemScan = useCallback((healthProfile: PlayerHealthProfile) => {
    commit((current) => {
      if (!current.profile || current.activeWorkout) return current;
      const profile = updateHealthProfile(current.profile, healthProfile);
      if (current.dailyQuest?.status === 'complete' && current.dailyQuest.plan.kind === 'training') return { ...current, profile, weeklyProtocol: null };
      return freshQuest({ ...current, profile, weeklyProtocol: null, dailyQuest: null });
    });
  }, [commit]);

  const completeMovementAssessment = useCallback((results: Record<MovementCheck, MovementRating>, kind: MovementAssessmentKind) => {
    commit((current) => {
      if (!current.profile || current.activeWorkout) return current;
      const previousReviewId = current.profile.trainingArcReviews[0]?.id ?? null;
      const profile = recordMovementAssessment(current.profile, results, kind, current.history);
      const reviewId = profile.trainingArcReviews[0]?.id;
      const pendingArcReviewId = reviewId && reviewId !== previousReviewId ? reviewId : current.pendingArcReviewId;
      if (current.dailyQuest?.status === 'complete' && current.dailyQuest.plan.kind === 'training') return { ...current, profile, weeklyProtocol: null, pendingArcReviewId };
      return freshQuest({ ...current, profile, weeklyProtocol: null, dailyQuest: null, pendingArcReviewId });
    });
  }, [commit]);

  const acknowledgeArcReview = useCallback(() => {
    commit((current) => acknowledgeTrainingArcReview(current));
  }, [commit]);

  const saveCorrectiveProfile = useCallback((correctiveProfile: CorrectiveProfile) => {
    commit((current) => {
      if (!current.profile || current.activeWorkout) return current;
      const profile = updateCorrectiveProfile(current.profile, correctiveProfile);
      if (current.dailyQuest?.status === 'complete' && current.dailyQuest.plan.kind === 'training') return { ...current, profile, weeklyProtocol: null };
      return freshQuest({ ...current, profile, weeklyProtocol: null, dailyQuest: null });
    });
  }, [commit]);

  const savePostureScan = useCallback((scan: PostureScan) => {
    return commitPhotoChange((current) => current.profile
      ? { ...current, profile: recordPostureScan(current.profile, scan) }
      : current);
  }, [commitPhotoChange]);

  const deletePostureScan = useCallback((scanId: string) => {
    return commitPhotoChange((current) => current.profile
      ? { ...current, profile: removePostureScan(current.profile, scanId) }
      : current);
  }, [commitPhotoChange]);

  const submitDailyReadiness = useCallback((input: DailyReadinessInput) => {
    commit((current) => {
      if (!current.profile || current.activeWorkout) return current;
      const readiness = createDailyReadiness(input);
      const profile = recordDailyReadiness(current.profile, readiness);
      return freshQuest({ ...current, profile, dailyQuest: null }, readiness.dateKey);
    });
  }, [commit]);

  const restoreExercises = useCallback(() => {
    commit((current) => {
      if (!current.profile || current.activeWorkout || current.profile.excludedExercises.length === 0) return current;
      const profile = restoreExcludedExercises(current.profile);
      if (current.dailyQuest?.status === 'complete' && current.dailyQuest.plan.kind !== 'recovery') return { ...current, profile, weeklyProtocol: null };
      return freshQuest({ ...current, profile, weeklyProtocol: null, dailyQuest: null });
    });
  }, [commit]);

  const beginDailyQuest = useCallback(() => {
    commit((current) => beginDailyWorkout(current));
  }, [commit]);

  const beginRankTrial = useCallback(() => {
    commit((current) => {
      if (!current.profile || current.activeWorkout || current.pendingArcReviewId) return current;
      const eligibility = rankTrialEligibility(current.profile, toDateKey(new Date()), current.history);
      if (!eligibility.eligible || !eligibility.target) return current;
      const plan = generateRankTrial(current.profile, current.history, toDateKey(new Date()), eligibility.target);
      if (plan.kind !== 'rank-trial') return current;
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
      return { ...current, profile: nextProfile, weeklyProtocol: permanentlyExclude ? null : current.weeklyProtocol, dailyQuest, activeWorkout: { ...active, plan } };
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
      if (rankTrial) profile = completeRankTrial(profile, current.history);
      const dailyQuest = rankTrial
        ? current.dailyQuest
        : current.dailyQuest ? { ...current.dailyQuest, status: 'complete' as const } : null;
      const lastCompletion = createCompletionSummary(current.profile, profile, entry, rankTrial);
      return { ...current, profile, history: [entry, ...current.history], dailyQuest, activeWorkout: null, lastCompletion };
    });
  }, [commit]);

  const dismissCompletion = useCallback(() => {
    commit((current) => current.lastCompletion ? freshQuest({ ...current, lastCompletion: null }) : current);
  }, [commit]);

  const value = useMemo<AppStoreValue>(() => ({
    snapshot,
    hydrated,
    loadError, saveError, saving, restoring, retrySave, reloadStorage, restoreBackup, restoreLocalRecovery,
    completeOnboarding,
    updateProfile,
    updateSystemScan,
    updateCorrectiveProfile: saveCorrectiveProfile,
    completeMovementAssessment,
    acknowledgeArcReview,
    savePostureScan,
    deletePostureScan,
    submitDailyReadiness,
    restoreExercises,
    beginDailyQuest,
    beginRankTrial,
    replaceCurrentExercise,
    completeCurrentSet,
    abandonWorkout,
    finishWorkout,
    dismissCompletion,
  }), [snapshot, hydrated, loadError, saveError, saving, restoring, retrySave, reloadStorage, restoreBackup, restoreLocalRecovery, completeOnboarding, updateProfile, updateSystemScan, saveCorrectiveProfile, completeMovementAssessment, acknowledgeArcReview, savePostureScan, deletePostureScan, submitDailyReadiness, restoreExercises, beginDailyQuest, beginRankTrial, replaceCurrentExercise, completeCurrentSet, abandonWorkout, finishWorkout, dismissCompletion]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error('useAppStore must be used inside AppStoreProvider');
  return context;
}
