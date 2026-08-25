import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ActiveWorkout, PerceivedDifficulty } from '../../domain/types.ts';
import { ExerciseGuide } from '../components/ExerciseGuide.tsx';
import { GlowButton } from '../components/GlowButton.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { colors, radius, spacing } from '../theme.ts';

interface WorkoutScreenProps {
  active: ActiveWorkout;
  onCompleteSet: () => void;
  onExit: () => void;
  onFinish: (difficulty: PerceivedDifficulty) => void;
}

type TimerPhase = 'idle' | 'countdown' | 'running' | 'paused' | 'complete';

const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}`.padStart(2, '0') + ':' + `${seconds % 60}`.padStart(2, '0');

export function WorkoutScreen({ active, onCompleteSet, onExit, onFinish }: WorkoutScreenProps) {
  useKeepAwake('active-workout');
  const insets = useSafeAreaInsets();
  const prescription = active.plan.exercises[active.exerciseIndex];
  const completedForCurrent = active.completedSets[active.exerciseIndex] ?? 0;
  const initialTarget = prescription?.exercise.repType === 'seconds' ? prescription.target : 0;
  const [restRemaining, setRestRemaining] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(initialTarget);
  const [timerPhase, setTimerPhase] = useState<TimerPhase>('idle');
  const [prepRemaining, setPrepRemaining] = useState(0);
  const timerDeadlineRef = useRef<number | null>(null);
  const restDeadlineRef = useRef<number | null>(null);

  const totalSets = active.plan.exercises.reduce((sum, item) => sum + item.sets, 0);
  const completedSets = active.completedSets.reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    timerDeadlineRef.current = null;
    setTimerPhase('idle');
    setPrepRemaining(0);
    setTimerRemaining(prescription?.exercise.repType === 'seconds' ? prescription.target : 0);
  }, [prescription?.exercise.id, prescription?.target, completedForCurrent]);

  useEffect(() => {
    if (timerPhase !== 'countdown') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const timeout = setTimeout(() => {
      if (prepRemaining <= 1) {
        timerDeadlineRef.current = Date.now() + timerRemaining * 1000;
        setPrepRemaining(0);
        setTimerPhase('running');
        return;
      }
      setPrepRemaining((value) => value - 1);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [prepRemaining, timerPhase, timerRemaining]);

  useEffect(() => {
    if (timerPhase !== 'running') return;
    const tick = () => {
      const deadline = timerDeadlineRef.current;
      if (!deadline) return;
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimerRemaining(next);
      if (next === 0) {
        timerDeadlineRef.current = null;
        setTimerPhase('complete');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [timerPhase]);

  const restActive = restRemaining > 0;
  useEffect(() => {
    if (!restActive) return;
    const tick = () => {
      const deadline = restDeadlineRef.current;
      if (!deadline) return;
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRestRemaining(next);
      if (next === 0) {
        restDeadlineRef.current = null;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      }
    };
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [restActive]);

  if (!prescription) return <QuestComplete planTitle={active.plan.title} rewardXp={active.plan.rewardXp} onFinish={onFinish} />;

  const isTimed = prescription.exercise.repType === 'seconds';
  const isLastSetOfExercise = completedForCurrent + 1 >= prescription.sets;
  const isFinalSequence = isLastSetOfExercise && active.exerciseIndex === active.plan.exercises.length - 1;
  const next = isLastSetOfExercise ? active.plan.exercises[active.exerciseIndex + 1] : prescription;

  const finishSet = () => {
    timerDeadlineRef.current = null;
    if (!isFinalSequence) {
      restDeadlineRef.current = Date.now() + prescription.restSeconds * 1000;
      setRestRemaining(prescription.restSeconds);
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    onCompleteSet();
  };

  const startCountdown = () => {
    setPrepRemaining(3);
    setTimerPhase('countdown');
  };

  const pauseTimer = () => {
    const deadline = timerDeadlineRef.current;
    if (deadline) setTimerRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    timerDeadlineRef.current = null;
    setTimerPhase('paused');
  };

  const resumeTimer = () => {
    timerDeadlineRef.current = Date.now() + timerRemaining * 1000;
    setTimerPhase('running');
  };

  const primaryAction = () => {
    if (restActive || timerPhase === 'countdown') return;
    if (!isTimed || timerPhase === 'complete') {
      finishSet();
      return;
    }
    if (timerPhase === 'running') {
      pauseTimer();
      return;
    }
    if (timerPhase === 'paused') {
      resumeTimer();
      return;
    }
    startCountdown();
  };

  const skipRecovery = () => {
    restDeadlineRef.current = null;
    setRestRemaining(0);
  };

  const confirmExit = () => {
    Alert.alert(
      'End current protocol?',
      'Incomplete progress will not be saved. There is no streak penalty.',
      [
        { text: 'KEEP TRAINING', style: 'cancel' },
        { text: 'END SESSION', style: 'destructive', onPress: onExit },
      ],
    );
  };

  const primaryLabel = restActive
    ? `RECOVERY ${formatClock(restRemaining)}`
    : timerPhase === 'countdown'
      ? `READY ${prepRemaining}`
      : timerPhase === 'running'
        ? `PAUSE · ${formatClock(timerRemaining)}`
        : timerPhase === 'paused'
          ? `RESUME · ${formatClock(timerRemaining)}`
          : isTimed && timerPhase === 'idle'
            ? `START ${timerRemaining} SEC TIMER`
            : isFinalSequence ? 'COMPLETE QUEST' : 'SET COMPLETE';

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.root}>
      <View style={styles.aura} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>ACTIVE PROTOCOL</Text><Text style={styles.planTitle}>{active.plan.title}</Text></View>
          <View style={styles.headerActions}>
            <Text style={styles.progressCopy}>{completedSets} / {totalSets} SETS</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="End workout" onPress={confirmExit} style={styles.exitButton}><Text style={styles.exitText}>EXIT</Text></Pressable>
          </View>
        </View>
        <ProgressBar progress={completedSets / totalSets} />

        <View style={styles.exerciseHeader}>
          <Text style={styles.sequence}>SEQUENCE {`${active.exerciseIndex + 1}`.padStart(2, '0')} / {`${active.plan.exercises.length}`.padStart(2, '0')}</Text>
          <Text style={styles.exerciseName}>{prescription.exercise.name}</Text>
          <Text style={styles.muscle}>{prescription.exercise.primaryMuscle.toUpperCase()} · DIFFICULTY {prescription.exercise.difficulty}</Text>
        </View>

        <View style={styles.visualStage}>
          <ExerciseGuide exercise={prescription.exercise} paused={timerPhase === 'paused'} />
          {timerPhase === 'countdown' ? (
            <View style={styles.countdownOverlay}>
              <Animated.Text style={styles.countdownValue}>{prepRemaining}</Animated.Text>
              <Text style={styles.countdownLabel}>GET READY</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.targetPanel}>
          <View style={styles.targetBlock}><Text style={styles.targetLabel}>SET</Text><Text style={styles.targetValue}>{completedForCurrent + 1}<Text style={styles.targetMuted}> / {prescription.sets}</Text></Text></View>
          <View style={styles.divider} />
          <View style={styles.targetBlock}><Text style={styles.targetLabel}>{isTimed ? 'DURATION' : 'TARGET'}</Text><Text style={styles.targetValue}>{isTimed ? (timerPhase === 'idle' ? prescription.target : timerRemaining) : prescription.target}<Text style={styles.targetMuted}>{isTimed ? ' SEC' : ' REPS'}</Text></Text></View>
        </View>

        <View style={styles.cue}><Text style={styles.cueMark}>SYSTEM TIP</Text><Text style={styles.cueText}>{prescription.exercise.description}</Text></View>

        <View style={styles.nextPanel}><Text style={styles.nextLabel}>NEXT SEQUENCE</Text><Text style={styles.nextName}>{next?.exercise.name ?? 'QUEST COMPLETE'}</Text><Text style={styles.nextTarget}>{next ? `${isLastSetOfExercise ? 1 : completedForCurrent + 2} / ${next.sets} · ${next.target}${next.exercise.repType === 'seconds' ? ' sec' : ' reps'}` : `+${active.plan.rewardXp} XP`}</Text></View>

        <View style={styles.footer}>
          <GlowButton label={primaryLabel} onPress={primaryAction} disabled={restActive || timerPhase === 'countdown'} />
          {restActive ? <Pressable accessibilityRole="button" onPress={skipRecovery} style={styles.skip}><Text style={styles.skipText}>SKIP RECOVERY</Text></Pressable> : null}
          {isTimed && (timerPhase === 'running' || timerPhase === 'paused') ? <Pressable accessibilityRole="button" onPress={finishSet} style={styles.skip}><Text style={styles.skipText}>COMPLETE SET NOW</Text></Pressable> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuestComplete({ planTitle, rewardXp, onFinish }: { planTitle: string; rewardXp: number; onFinish: (difficulty: PerceivedDifficulty) => void }) {
  const scale = useRef(new Animated.Value(0.75)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 55, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.completeRoot}>
      <View style={styles.completeAura} />
      <ScrollView contentContainerStyle={styles.completeScroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.completeContent, { opacity, transform: [{ scale }] }]}>
          <Text style={styles.completeSystem}>SYSTEM</Text>
          <Text style={styles.completeRune}>◇</Text>
          <Text style={styles.completeTitle}>QUEST COMPLETE</Text>
          <Text style={styles.completePlan}>{planTitle}</Text>
          <View style={styles.rewardBox}><Text style={styles.rewardLabel}>ENERGY ACQUIRED</Text><Text style={styles.rewardValue}>+{rewardXp} XP</Text></View>
          <Text style={styles.feedbackQuestion}>How did the protocol feel?</Text>
          <View style={styles.feedbackButtons}>
            <GlowButton label="TOO EASY" variant="secondary" onPress={() => onFinish('too-easy')} style={styles.feedbackButton} />
            <GlowButton label="PERFECT" onPress={() => onFinish('perfect')} style={styles.feedbackButton} />
            <GlowButton label="TOO HARD" variant="secondary" onPress={() => onFinish('too-hard')} style={styles.feedbackButton} />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  aura: { position: 'absolute', top: 150, alignSelf: 'center', width: 330, height: 330, borderRadius: 165, backgroundColor: colors.blue, opacity: 0.055 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.md },
  headerCopy: { flex: 1 },
  headerActions: { alignItems: 'flex-end', gap: 6 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 2.3 },
  planTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 5 },
  progressCopy: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  exitButton: { minWidth: 46, minHeight: 26, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(226,61,87,0.35)', backgroundColor: 'rgba(226,61,87,0.08)' },
  exitText: { color: colors.danger, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  exerciseHeader: { alignItems: 'center', marginTop: spacing.xl },
  sequence: { color: colors.purple, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  exerciseName: { color: colors.text, fontSize: 29, fontWeight: '900', textAlign: 'center', marginTop: spacing.sm, letterSpacing: -0.5 },
  muscle: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginTop: spacing.sm },
  visualStage: { minHeight: 248, justifyContent: 'center', marginTop: spacing.sm },
  countdownOverlay: { position: 'absolute', alignSelf: 'center', width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7,9,15,0.94)', borderWidth: 1, borderColor: colors.lineStrong, shadowColor: colors.primary, shadowOpacity: 0.7, shadowRadius: 25 },
  countdownValue: { color: colors.text, fontSize: 62, fontWeight: '900', lineHeight: 68, textShadowColor: colors.primary, textShadowRadius: 18 },
  countdownLabel: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  targetPanel: { flexDirection: 'row', minHeight: 74, alignItems: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  targetBlock: { flex: 1, alignItems: 'center' },
  targetLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  targetValue: { color: colors.text, fontSize: 27, fontWeight: '900', marginTop: 4 },
  targetMuted: { color: colors.textMuted, fontSize: 11 },
  divider: { width: 1, height: 38, backgroundColor: colors.line },
  cue: { marginTop: spacing.md, paddingHorizontal: spacing.md, minHeight: 55, justifyContent: 'center' },
  cueMark: { color: colors.primary, fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  cueText: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  nextPanel: { marginTop: 'auto', marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(147,164,195,0.05)', borderWidth: 1, borderColor: 'rgba(147,164,195,0.1)' },
  nextLabel: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  nextName: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 4, paddingRight: 115 },
  nextTarget: { position: 'absolute', right: spacing.md, top: 23, color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  footer: { gap: spacing.sm },
  skip: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  completeRoot: { flex: 1, backgroundColor: colors.background },
  completeScroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  completeAura: { position: 'absolute', alignSelf: 'center', top: '20%', width: 420, height: 420, borderRadius: 210, backgroundColor: colors.blue, opacity: 0.1 },
  completeContent: { width: '100%', alignItems: 'center' },
  completeSystem: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  completeRune: { color: colors.primary, fontSize: 96, lineHeight: 110, textShadowColor: colors.primary, textShadowRadius: 30, marginTop: spacing.lg },
  completeTitle: { color: colors.text, fontSize: 31, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center' },
  completePlan: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: spacing.sm },
  rewardBox: { width: '100%', alignItems: 'center', marginTop: spacing.xxl, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: 'rgba(41,182,255,0.08)' },
  rewardLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  rewardValue: { color: colors.primary, fontSize: 25, fontWeight: '900', marginTop: 5 },
  feedbackQuestion: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: spacing.xxl, marginBottom: spacing.md },
  feedbackButtons: { width: '100%', gap: spacing.sm },
  feedbackButton: { minHeight: 50 },
});
