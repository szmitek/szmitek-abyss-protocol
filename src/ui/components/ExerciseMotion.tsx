import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import type { Exercise } from '../../domain/types.ts';
import { colors } from '../theme.ts';

type MotionKind = 'march' | 'jack' | 'squat' | 'lunge' | 'floor' | 'core' | 'mobility' | 'upright';

const includesAny = (value: string, tokens: readonly string[]) => tokens.some((token) => value.includes(token));

export function motionKindFor(exercise: Pick<Exercise, 'id' | 'exerciseType'>): MotionKind {
  const id = exercise.id;
  if (includesAny(id, ['march', 'run-place', 'high-knees', 'fast-feet'])) return 'march';
  if (includesAny(id, ['jack', 'skater', 'lateral-shuffle'])) return 'jack';
  if (includesAny(id, ['lunge', 'split-squat', 'cossack'])) return 'lunge';
  if (includesAny(id, ['squat', 'wall-sit', 'calf-raise', 'ankle-rock'])) return 'squat';
  if (includesAny(id, ['pushup', 'plank', 'climber', 'inchworm', 'bird-dog', 'cat-cow', 'child-pose', 'cobra'])) return 'floor';
  if (exercise.exerciseType === 'core' || includesAny(id, ['crunch', 'hollow', 'leg-raise', 'bridge'])) return 'core';
  if (exercise.exerciseType === 'mobility' || exercise.exerciseType === 'warmup') return 'mobility';
  return 'upright';
}

function motionCue(exercise: Exercise, kind: MotionKind): string {
  if (exercise.id === 'cat-cow') return 'ARCH · ROUND · BREATHE';
  if (kind === 'march') return 'ALTERNATE ARM + KNEE';
  if (kind === 'jack') return 'STEP WIDE · REACH HIGH';
  if (kind === 'lunge') return 'STEP · LOWER · RETURN';
  if (kind === 'squat') return 'BRACE · LOWER · DRIVE';
  if (kind === 'floor') return 'LOCK CORE · MOVE AS ONE';
  if (kind === 'core') return 'EXHALE · CONTROL · RESET';
  if (kind === 'mobility') return 'SLOW RANGE · NO PAIN';
  return 'CONTROL EVERY REP';
}

export function ExerciseMotion({ exercise, paused = false }: { exercise: Exercise; paused?: boolean }) {
  const phase = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const kind = motionKindFor(exercise);

  useEffect(() => {
    if (paused) {
      phase.stopAnimation();
      glow.stopAnimation();
      return;
    }
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(phase, { toValue: 1, duration: 850, useNativeDriver: true }),
      Animated.timing(phase, { toValue: 0, duration: 850, useNativeDriver: true }),
    ]));
    const aura = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1300, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ]));
    motion.start();
    aura.start();
    return () => {
      motion.stop();
      aura.stop();
    };
  }, [glow, paused, phase]);

  return (
    <View accessibilityLabel={`Animated movement guide for ${exercise.name}`} style={styles.root}>
      <Animated.View
        style={[
          styles.outerRing,
          {
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.72] }),
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] }) }],
          },
        ]}
      />
      <View style={styles.scanLine} />
      {kind === 'floor' || kind === 'core'
        ? <FloorFigure kind={kind} phase={phase} />
        : <UprightFigure kind={kind} phase={phase} />}
      <View style={styles.cuePill}><Text style={styles.cue}>{motionCue(exercise, kind)}</Text></View>
    </View>
  );
}

function UprightFigure({ kind, phase }: { kind: Exclude<MotionKind, 'floor' | 'core'>; phase: Animated.Value }) {
  const bodyY = phase.interpolate({
    inputRange: [0, 1],
    outputRange: [0, kind === 'squat' ? 18 : kind === 'lunge' ? 12 : kind === 'march' ? -3 : 0],
  });
  const armSweep = kind === 'jack' ? 62 : kind === 'march' ? 28 : kind === 'mobility' ? 38 : 8;
  const legSweep = kind === 'jack' ? 24 : kind === 'march' ? 18 : kind === 'lunge' ? 34 : kind === 'squat' ? 12 : 4;

  return (
    <Animated.View style={[styles.uprightFigure, { transform: [{ translateY: bodyY }] }]}>
      <View style={styles.head} />
      <View style={styles.torso} />
      <Animated.View style={[styles.limb, styles.leftArm, { transform: [{ rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['12deg', `${-armSweep}deg`] }) }] }]} />
      <Animated.View style={[styles.limb, styles.rightArm, { transform: [{ rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', `${armSweep}deg`] }) }] }]} />
      <Animated.View style={[styles.leg, styles.leftLeg, { transform: [{ rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['5deg', `${-legSweep}deg`] }) }, { translateY: kind === 'march' ? -10 : 0 }] }]} />
      <Animated.View style={[styles.leg, styles.rightLeg, { transform: [{ rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', `${legSweep}deg`] }) }, { translateY: kind === 'lunge' ? 9 : 0 }] }]} />
      <View style={styles.coreNode} />
    </Animated.View>
  );
}

function FloorFigure({ kind, phase }: { kind: 'floor' | 'core'; phase: Animated.Value }) {
  const torsoRotate = phase.interpolate({ inputRange: [0, 1], outputRange: kind === 'core' ? ['-8deg', '-28deg'] : ['-3deg', '5deg'] });
  const torsoY = phase.interpolate({ inputRange: [0, 1], outputRange: [0, kind === 'core' ? -10 : 7] });
  return (
    <View style={styles.floorFigure}>
      <Animated.View style={[styles.floorBody, { transform: [{ translateY: torsoY }, { rotate: torsoRotate }] }]}>
        <View style={styles.floorHead} />
        <View style={styles.floorTorso} />
        <View style={[styles.floorLimb, styles.floorArm]} />
        <Animated.View style={[styles.floorLimb, styles.floorLeg, { transform: [{ rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['4deg', kind === 'core' ? '-20deg' : '9deg'] }) }] }]} />
        <View style={styles.floorNode} />
      </Animated.View>
      <View style={styles.ground} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: 220, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  outerRing: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: colors.primary, backgroundColor: 'rgba(41,182,255,0.025)', shadowColor: colors.primary, shadowOpacity: 0.7, shadowRadius: 25 },
  scanLine: { position: 'absolute', width: 152, height: 1, backgroundColor: colors.lineStrong, opacity: 0.35 },
  uprightFigure: { width: 118, height: 154, marginTop: -8 },
  head: { position: 'absolute', top: 5, left: 47, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.primary, backgroundColor: 'rgba(41,182,255,0.12)' },
  torso: { position: 'absolute', top: 31, left: 55, width: 8, height: 59, borderRadius: 4, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.9, shadowRadius: 8 },
  limb: { position: 'absolute', top: 37, width: 6, height: 57, borderRadius: 3, backgroundColor: colors.primary },
  leftArm: { left: 37 },
  rightArm: { right: 37 },
  leg: { position: 'absolute', top: 85, width: 7, height: 61, borderRadius: 4, backgroundColor: colors.primary },
  leftLeg: { left: 47 },
  rightLeg: { right: 47 },
  coreNode: { position: 'absolute', top: 77, left: 52, width: 14, height: 14, borderWidth: 2, borderColor: colors.text, backgroundColor: colors.blue, transform: [{ rotate: '45deg' }], shadowColor: colors.primary, shadowOpacity: 1, shadowRadius: 10 },
  floorFigure: { width: 190, height: 116, justifyContent: 'center' },
  floorBody: { width: 164, height: 70, marginLeft: 12 },
  floorHead: { position: 'absolute', top: 13, left: 2, width: 23, height: 23, borderRadius: 12, borderWidth: 2, borderColor: colors.primary, backgroundColor: 'rgba(41,182,255,0.12)' },
  floorTorso: { position: 'absolute', top: 22, left: 24, width: 82, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  floorLimb: { position: 'absolute', width: 64, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  floorArm: { top: 27, left: 35, transform: [{ rotate: '62deg' }] },
  floorLeg: { top: 22, left: 98 },
  floorNode: { position: 'absolute', top: 18, left: 96, width: 14, height: 14, borderWidth: 2, borderColor: colors.text, backgroundColor: colors.blue, transform: [{ rotate: '45deg' }] },
  ground: { position: 'absolute', left: 15, right: 15, bottom: 18, height: 1, backgroundColor: colors.lineStrong, opacity: 0.5 },
  cuePill: { position: 'absolute', bottom: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(7,9,15,0.9)' },
  cue: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
});
