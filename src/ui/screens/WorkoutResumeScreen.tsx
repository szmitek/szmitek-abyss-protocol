import { useCallback, useEffect } from 'react';
import { Alert, BackHandler, StyleSheet, Text } from 'react-native';

import { workoutResumeBlock } from '../../domain/workoutLifecycle.ts';
import type { AppSnapshot } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors } from '../theme.ts';

export function WorkoutResumeScreen({ snapshot, onResume, onExit }: { snapshot: AppSnapshot; onResume: () => void; onExit: () => void }) {
  const active = snapshot.activeWorkout!;
  const blocked = workoutResumeBlock(snapshot);
  const completed = active.completedSets.reduce((sum, count) => sum + count, 0);
  const total = active.plan.exercises.reduce((sum, item) => sum + item.sets, 0);
  const close = useCallback(() => {
    Alert.alert('Close saved session?', 'This removes the unfinished session checkpoint. It does not award XP or change completed workout history.', [
      { text: 'Keep checkpoint', style: 'cancel' },
      { text: 'Close session', style: 'destructive', onPress: onExit },
    ]);
  }, [onExit]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => subscription.remove();
  }, [close]);
  return <Screen eyebrow="SYSTEM CHECKPOINT" title={blocked ? 'Session needs review' : 'Ready to return?'} subtitle="Your confirmed sets are retained. Training waits for your decision.">
    <SystemPanel title={active.plan.title} eyebrow={`${completed} / ${total} SETS CONFIRMED`}>
      <Text style={styles.copy}>{active.plan.exercises[active.exerciseIndex]?.exercise.name ?? 'All sets confirmed. Resume to submit your feedback.'}</Text>
      <Text style={styles.copy}>{blocked ?? 'An unfinished set timer restarts from its full target after interruption. Resume only when you are ready; no set is completed automatically.'}</Text>
    </SystemPanel>
    <GlowButton label="RESUME SESSION" onPress={onResume} disabled={Boolean(blocked)} />
    <GlowButton label="CLOSE SESSION" variant="secondary" onPress={close} />
  </Screen>;
}

const styles = StyleSheet.create({ copy: { color: colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: 12 } });
