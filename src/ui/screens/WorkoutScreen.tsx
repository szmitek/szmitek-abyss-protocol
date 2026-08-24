import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ActiveWorkout, PerceivedDifficulty } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { colors, radius, spacing } from '../theme.ts';

interface WorkoutScreenProps {
  active: ActiveWorkout;
  onCompleteSet: () => void;
  onFinish: (difficulty: PerceivedDifficulty) => void;
}

export function WorkoutScreen({ active, onCompleteSet, onFinish }: WorkoutScreenProps) {
  const prescription = active.plan.exercises[active.exerciseIndex];
  const completedForCurrent = active.completedSets[active.exerciseIndex] ?? 0;
  const [restRemaining, setRestRemaining] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(prescription?.exercise.repType === 'seconds' ? prescription.target : 0);
  const [timerRunning, setTimerRunning] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  const totalSets = active.plan.exercises.reduce((sum, item) => sum + item.sets, 0);
  const completedSets = active.completedSets.reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    setTimerRunning(false);
    setTimerRemaining(prescription?.exercise.repType === 'seconds' ? prescription.target : 0);
  }, [prescription?.exercise.id, prescription?.target, completedForCurrent]);

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  useEffect(() => {
    if (restRemaining <= 0) return;
    const timer = setInterval(() => setRestRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [restRemaining]);

  useEffect(() => {
    if (!timerRunning || timerRemaining <= 0) return;
    const timer = setInterval(() => setTimerRemaining((value) => {
      if (value <= 1) {
        setTimerRunning(false);
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [timerRunning, timerRemaining]);

  if (!prescription) return <QuestComplete planTitle={active.plan.title} rewardXp={active.plan.rewardXp} onFinish={onFinish} />;

  const isTimed = prescription.exercise.repType === 'seconds';
  const isLastSetOfExercise = completedForCurrent + 1 >= prescription.sets;
  const isFinalSequence = isLastSetOfExercise && active.exerciseIndex === active.plan.exercises.length - 1;
  const next = isLastSetOfExercise ? active.plan.exercises[active.exerciseIndex + 1] : prescription;

  const finishSet = () => {
    if (!isFinalSequence) setRestRemaining(prescription.restSeconds);
    onCompleteSet();
  };

  const primaryAction = () => {
    if (restRemaining > 0) return;
    if (isTimed && timerRemaining > 0) {
      setTimerRunning(true);
      return;
    }
    finishSet();
  };

  const primaryLabel = restRemaining > 0
    ? `RECOVERY 00:${`${restRemaining}`.padStart(2, '0')}`
    : timerRunning
      ? `HOLD 00:${`${timerRemaining}`.padStart(2, '0')}`
      : isTimed && timerRemaining > 0
        ? `START ${timerRemaining} SEC TIMER`
        : isFinalSequence ? 'COMPLETE QUEST' : 'SET COMPLETE';

  return (
    <View style={styles.root}>
      <View style={styles.aura} />
      <View style={styles.header}>
        <View style={styles.headerCopy}><Text style={styles.eyebrow}>ACTIVE PROTOCOL</Text><Text style={styles.planTitle}>{active.plan.title}</Text></View>
        <Text style={styles.progressCopy}>{completedSets} / {totalSets} SETS</Text>
      </View>
      <ProgressBar progress={completedSets / totalSets} />

      <View style={styles.exerciseHeader}>
        <Text style={styles.sequence}>SEQUENCE {`${active.exerciseIndex + 1}`.padStart(2, '0')} / {`${active.plan.exercises.length}`.padStart(2, '0')}</Text>
        <Text style={styles.exerciseName}>{prescription.exercise.name}</Text>
        <Text style={styles.muscle}>{prescription.exercise.primaryMuscle.toUpperCase()} · DIFFICULTY {prescription.exercise.difficulty}</Text>
      </View>

      <View style={styles.visualWrap}>
        <Animated.View style={[styles.outerRing, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.62] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }] }]} />
        <View style={styles.innerRing}><Text style={styles.rune}>◇</Text><Text style={styles.form}>FORM SCAN</Text></View>
      </View>

      <View style={styles.targetPanel}>
        <View style={styles.targetBlock}><Text style={styles.targetLabel}>SET</Text><Text style={styles.targetValue}>{completedForCurrent + 1}<Text style={styles.targetMuted}> / {prescription.sets}</Text></Text></View>
        <View style={styles.divider} />
        <View style={styles.targetBlock}><Text style={styles.targetLabel}>{isTimed ? 'DURATION' : 'TARGET'}</Text><Text style={styles.targetValue}>{isTimed && timerRunning ? timerRemaining : prescription.target}<Text style={styles.targetMuted}>{isTimed ? ' SEC' : ' REPS'}</Text></Text></View>
      </View>

      <View style={styles.cue}><Text style={styles.cueMark}>SYSTEM TIP</Text><Text style={styles.cueText}>{prescription.exercise.description}</Text></View>

      <View style={styles.nextPanel}><Text style={styles.nextLabel}>NEXT SEQUENCE</Text><Text style={styles.nextName}>{next?.exercise.name ?? 'QUEST COMPLETE'}</Text><Text style={styles.nextTarget}>{next ? `${isLastSetOfExercise ? 1 : completedForCurrent + 2} / ${next.sets} · ${next.target}${next.exercise.repType === 'seconds' ? ' sec' : ' reps'}` : `+${active.plan.rewardXp} XP`}</Text></View>

      <View style={styles.footer}>
        <GlowButton label={primaryLabel} onPress={primaryAction} disabled={restRemaining > 0 || timerRunning} />
        {restRemaining > 0 ? <Pressable onPress={() => setRestRemaining(0)} style={styles.skip}><Text style={styles.skipText}>SKIP RECOVERY</Text></Pressable> : null}
      </View>
    </View>
  );
}

function QuestComplete({ planTitle, rewardXp, onFinish }: { planTitle: string; rewardXp: number; onFinish: (difficulty: PerceivedDifficulty) => void }) {
  const scale = useRef(new Animated.Value(0.75)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 55, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);
  return (
    <View style={styles.completeRoot}>
      <View style={styles.completeAura} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: 24 },
  aura: { position: 'absolute', top: 150, alignSelf: 'center', width: 330, height: 330, borderRadius: 165, backgroundColor: colors.blue, opacity: 0.055 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 2.3 },
  planTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 5 },
  progressCopy: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  exerciseHeader: { alignItems: 'center', marginTop: spacing.xl },
  sequence: { color: colors.purple, fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  exerciseName: { color: colors.text, fontSize: 29, fontWeight: '900', textAlign: 'center', marginTop: spacing.sm, letterSpacing: -0.5 },
  muscle: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginTop: spacing.sm },
  visualWrap: { height: 205, alignItems: 'center', justifyContent: 'center' },
  outerRing: { position: 'absolute', width: 178, height: 178, borderRadius: 89, borderWidth: 1, borderColor: colors.primary, backgroundColor: 'rgba(41,182,255,0.025)', shadowColor: colors.primary, shadowOpacity: 0.5, shadowRadius: 28 },
  innerRing: { width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,19,32,0.8)' },
  rune: { color: colors.primary, fontSize: 58, lineHeight: 64, textShadowColor: colors.primary, textShadowRadius: 18 },
  form: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 1.8 },
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
  nextName: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 4 },
  nextTarget: { position: 'absolute', right: spacing.md, top: 23, color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  footer: { gap: spacing.sm },
  skip: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  completeRoot: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  completeAura: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: colors.blue, opacity: 0.1 },
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
