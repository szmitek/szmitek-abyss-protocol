import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStoreProvider, useAppStore } from './src/state/AppStore.tsx';
import { BottomNav, type AppTab } from './src/ui/components/BottomNav.tsx';
import { SystemBackground } from './src/ui/components/SystemBackground.tsx';
import { DashboardScreen } from './src/ui/screens/DashboardScreen.tsx';
import { OnboardingScreen } from './src/ui/screens/OnboardingScreen.tsx';
import { ProgressScreen } from './src/ui/screens/ProgressScreen.tsx';
import { QuestsScreen } from './src/ui/screens/QuestsScreen.tsx';
import { StatusScreen } from './src/ui/screens/StatusScreen.tsx';
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
  const { snapshot, hydrated, completeOnboarding, beginDailyQuest, beginRankTrial, completeCurrentSet, abandonWorkout, finishWorkout } = useAppStore();
  const [tab, setTab] = useState<AppTab>('system');

  if (!hydrated) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.loadingText}>INITIALIZING SYSTEM</Text></View>;
  }

  if (!snapshot.onboardingComplete || !snapshot.profile) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  if (snapshot.activeWorkout) {
    return <WorkoutScreen active={snapshot.activeWorkout} onCompleteSet={completeCurrentSet} onExit={abandonWorkout} onFinish={finishWorkout} />;
  }

  return (
    <SystemBackground>
      {tab === 'system' ? <DashboardScreen snapshot={snapshot} onBeginQuest={beginDailyQuest} /> : null}
      {tab === 'quests' ? <QuestsScreen snapshot={snapshot} onBeginDaily={beginDailyQuest} onBeginRankTrial={beginRankTrial} /> : null}
      {tab === 'status' ? <StatusScreen profile={snapshot.profile} /> : null}
      {tab === 'progress' ? <ProgressScreen history={snapshot.history} /> : null}
      <BottomNav active={tab} onChange={setTab} />
    </SystemBackground>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 2.5, marginTop: 18 },
});
