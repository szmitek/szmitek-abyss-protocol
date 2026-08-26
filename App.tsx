import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStoreProvider, useAppStore } from './src/state/AppStore.tsx';
import { planRequiresDailyReadiness, readinessForDate } from './src/domain/readiness.ts';
import { BottomNav, type AppTab } from './src/ui/components/BottomNav.tsx';
import { QuestBriefing } from './src/ui/components/QuestBriefing.tsx';
import { SystemBackground } from './src/ui/components/SystemBackground.tsx';
import { DashboardScreen } from './src/ui/screens/DashboardScreen.tsx';
import { OnboardingScreen } from './src/ui/screens/OnboardingScreen.tsx';
import { ProgressScreen } from './src/ui/screens/ProgressScreen.tsx';
import { QuestsScreen } from './src/ui/screens/QuestsScreen.tsx';
import { CompletionReportScreen } from './src/ui/screens/CompletionReportScreen.tsx';
import { StatusScreen } from './src/ui/screens/StatusScreen.tsx';
import { SystemScanScreen } from './src/ui/screens/SystemScanScreen.tsx';
import { MovementCalibrationScreen } from './src/ui/screens/MovementCalibrationScreen.tsx';
import { PostureArchiveScreen } from './src/ui/screens/PostureArchiveScreen.tsx';
import { ReadinessScreen } from './src/ui/screens/ReadinessScreen.tsx';
import { WorkoutScreen } from './src/ui/screens/WorkoutScreen.tsx';
import { colors } from './src/ui/theme.ts';

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppStoreProvider>
        <StatusBar style="light" />
        <SystemRoot />
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}

function SystemRoot() {
  const { snapshot, hydrated, completeOnboarding, updateProfile, updateSystemScan, completeMovementAssessment, savePostureScan, deletePostureScan, submitDailyReadiness, restoreExercises, beginDailyQuest, beginRankTrial, replaceCurrentExercise, completeCurrentSet, abandonWorkout, finishWorkout, dismissCompletion } = useAppStore();
  const [tab, setTab] = useState<AppTab>('system');
  const [dailyBriefingOpen, setDailyBriefingOpen] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [systemScanEditing, setSystemScanEditing] = useState(false);
  const [movementCalibrationEditing, setMovementCalibrationEditing] = useState(false);
  const [postureArchiveOpen, setPostureArchiveOpen] = useState(false);
  const [readinessOpen, setReadinessOpen] = useState(false);

  if (!hydrated) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.loadingText}>INITIALIZING SYSTEM</Text></View>;
  }

  if (!snapshot.onboardingComplete || !snapshot.profile) {
    return <OnboardingScreen onComplete={(answers) => { completeOnboarding(answers); setSystemScanEditing(true); }} />;
  }

  if (snapshot.activeWorkout) {
    return <WorkoutScreen active={snapshot.activeWorkout} onReplaceExercise={replaceCurrentExercise} onCompleteSet={completeCurrentSet} onExit={abandonWorkout} onFinish={finishWorkout} />;
  }

  if (snapshot.lastCompletion) {
    return <CompletionReportScreen report={snapshot.lastCompletion} onContinue={dismissCompletion} />;
  }

  if (profileEditing) {
    return (
      <OnboardingScreen
        initialAnswers={snapshot.profile}
        onCancel={() => setProfileEditing(false)}
        onComplete={(answers) => {
          updateProfile(answers);
          setProfileEditing(false);
        }}
      />
    );
  }

  if (systemScanEditing) {
    return (
      <SystemBackground>
        <SystemScanScreen
          initialProfile={snapshot.profile.healthProfile}
          onCancel={snapshot.profile.healthProfile.scanCompleted ? () => setSystemScanEditing(false) : undefined}
          onSave={(healthProfile) => {
            updateSystemScan(healthProfile);
            setSystemScanEditing(false);
            if (snapshot.profile!.movementAssessments.length === 0 && healthProfile.safetySignals.length === 0) setMovementCalibrationEditing(true);
          }}
        />
      </SystemBackground>
    );
  }

  if (movementCalibrationEditing) {
    const baseline = snapshot.profile.movementAssessments.length === 0;
    return (
      <SystemBackground>
        <MovementCalibrationScreen
          kind={baseline ? 'baseline' : 'reassessment'}
          {...(!baseline ? { onCancel: () => setMovementCalibrationEditing(false) } : {})}
          onComplete={(results) => {
            completeMovementAssessment(results, baseline ? 'baseline' : 'reassessment');
            setMovementCalibrationEditing(false);
          }}
        />
      </SystemBackground>
    );
  }

  if (postureArchiveOpen) {
    return (
      <SystemBackground>
        <PostureArchiveScreen
          profile={snapshot.profile}
          onBack={() => setPostureArchiveOpen(false)}
          onSave={savePostureScan}
          onDelete={deletePostureScan}
        />
      </SystemBackground>
    );
  }

  if (readinessOpen) {
    return (
      <SystemBackground>
        <ReadinessScreen
          onBack={() => setReadinessOpen(false)}
          onSubmit={(input) => {
            submitDailyReadiness(input);
            setReadinessOpen(false);
          }}
        />
      </SystemBackground>
    );
  }

  const requestDailyQuest = () => {
    const quest = snapshot.dailyQuest;
    if (quest && planRequiresDailyReadiness(quest.plan) && !readinessForDate(snapshot.profile!, quest.dateKey)) {
      setReadinessOpen(true);
      return;
    }
    setDailyBriefingOpen(true);
  };

  const acceptDailyQuest = () => {
    setDailyBriefingOpen(false);
    beginDailyQuest();
  };

  return (
    <SystemBackground>
      {tab === 'system' ? <DashboardScreen snapshot={snapshot} onBeginQuest={requestDailyQuest} onOpenReadiness={() => setReadinessOpen(true)} onOpenSystemScan={() => setSystemScanEditing(true)} onOpenMovementCalibration={() => setMovementCalibrationEditing(true)} /> : null}
      {tab === 'quests' ? <QuestsScreen snapshot={snapshot} onBeginDaily={requestDailyQuest} onBeginRankTrial={beginRankTrial} onOpenReadiness={() => setReadinessOpen(true)} onOpenMovementCalibration={() => setMovementCalibrationEditing(true)} /> : null}
      {tab === 'status' ? <StatusScreen profile={snapshot.profile} onEditProfile={() => setProfileEditing(true)} onOpenSystemScan={() => setSystemScanEditing(true)} onOpenMovementCalibration={() => setMovementCalibrationEditing(true)} onOpenPostureArchive={() => setPostureArchiveOpen(true)} onRestoreExercises={restoreExercises} /> : null}
      {tab === 'progress' ? <ProgressScreen history={snapshot.history} /> : null}
      <BottomNav active={tab} onChange={setTab} />
      <QuestBriefing
        onAccept={acceptDailyQuest}
        onClose={() => setDailyBriefingOpen(false)}
        plan={snapshot.dailyQuest?.plan ?? null}
        visible={dailyBriefingOpen}
      />
    </SystemBackground>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 2.5, marginTop: 18 },
});
