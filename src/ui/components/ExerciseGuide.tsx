import { useEffect, useRef } from 'react';
import { Animated, Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

import type { Exercise } from '../../domain/types.ts';
import { colors, radius } from '../theme.ts';

// Metro requires statically analyzable image literals for assets bundled in the native app.
/* eslint-disable @typescript-eslint/no-require-imports */
interface GuideAsset {
  source: ImageSourcePropType;
  phases: readonly [string, string];
}

const GUIDE_ASSETS: Partial<Record<string, GuideAsset>> = {
  'march-place': {
    source: require('../../../assets/exercises/march-in-place.jpg'),
    phases: ['START', 'DRIVE'],
  },
  'step-jack': {
    source: require('../../../assets/exercises/low-impact-step-jack.jpg'),
    phases: ['START', 'STEP + REACH'],
  },
  'reverse-lunge': {
    source: require('../../../assets/exercises/reverse-lunge.jpg'),
    phases: ['START', 'STEP + LOWER'],
  },
  'cat-cow': {
    source: require('../../../assets/exercises/cat-cow.jpg'),
    phases: ['EXTEND', 'ROUND'],
  },
};

export function ExerciseGuide({ exercise, paused = false }: { exercise: Exercise; paused?: boolean }) {
  const signal = useRef(new Animated.Value(0)).current;
  const guide = GUIDE_ASSETS[exercise.id];

  useEffect(() => {
    if (paused || !guide) {
      signal.stopAnimation();
      return;
    }

    const sequence = Animated.loop(Animated.sequence([
      Animated.timing(signal, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.delay(350),
      Animated.timing(signal, { toValue: 0, duration: 900, useNativeDriver: true }),
      Animated.delay(350),
    ]));
    sequence.start();
    return () => sequence.stop();
  }, [guide, paused, signal]);

  if (!guide) return <GuideUnavailable exercise={exercise} />;

  const firstOpacity = signal.interpolate({ inputRange: [0, 1], outputRange: [1, 0.48] });
  const secondOpacity = signal.interpolate({ inputRange: [0, 1], outputRange: [0.48, 1] });

  return (
    <View accessibilityLabel={`Two-phase movement guide for ${exercise.name}`} style={styles.root}>
      <View style={styles.guideHeader}>
        <Text style={styles.guideHeaderText}>FORM ARCHIVE</Text>
        <Text style={styles.guideHeaderMeta}>02 PHASES</Text>
      </View>
      <Image source={guide.source} resizeMode="contain" style={styles.image} />
      <View pointerEvents="none" style={styles.centerSignal}>
        <Text style={styles.centerSignalText}>›</Text>
      </View>
      <View style={styles.phaseRow}>
        <Animated.View style={[styles.phase, { opacity: firstOpacity }]}>
          <Text style={styles.phaseIndex}>01</Text>
          <Text numberOfLines={1} style={styles.phaseLabel}>{guide.phases[0]}</Text>
        </Animated.View>
        <Animated.View style={[styles.phase, styles.phaseRight, { opacity: secondOpacity }]}>
          <Text style={styles.phaseIndex}>02</Text>
          <Text numberOfLines={1} style={styles.phaseLabel}>{guide.phases[1]}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

function GuideUnavailable({ exercise }: { exercise: Exercise }) {
  return (
    <View accessibilityLabel={`Movement instructions for ${exercise.name}`} style={[styles.root, styles.fallback]}>
      <View style={styles.fallbackRune}><Text style={styles.fallbackRuneText}>◇</Text></View>
      <Text style={styles.fallbackEyebrow}>FORM ARCHIVE // CALIBRATING</Text>
      <Text style={styles.fallbackTitle}>{exercise.primaryMuscle.toUpperCase()}</Text>
      <Text style={styles.fallbackCopy}>Follow the System Tip below. Stop if the movement causes pain.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 232,
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(41,182,255,0.2)',
    backgroundColor: '#070A11',
  },
  guideHeader: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  guideHeaderText: { color: colors.primary, fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  guideHeaderMeta: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  image: { position: 'absolute', top: 17, left: 0, right: 0, width: '100%', height: 184 },
  centerSignal: {
    position: 'absolute',
    top: 96,
    alignSelf: 'center',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(7,9,15,0.92)',
  },
  centerSignalText: { color: colors.primary, fontSize: 21, fontWeight: '500', lineHeight: 23 },
  phaseRow: { position: 'absolute', left: 10, right: 10, bottom: 9, flexDirection: 'row', gap: 7 },
  phase: {
    flex: 1,
    minHeight: 29,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: 'rgba(41,182,255,0.1)',
  },
  phaseRight: { justifyContent: 'flex-end' },
  phaseIndex: { color: colors.primary, fontSize: 7, fontWeight: '900', marginRight: 6 },
  phaseLabel: { color: colors.text, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  fallback: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  fallbackRune: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  fallbackRuneText: { color: colors.primary, fontSize: 36, lineHeight: 40, textShadowColor: colors.primary, textShadowRadius: 12 },
  fallbackEyebrow: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 1.4, marginTop: 14 },
  fallbackTitle: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 1.1, marginTop: 5 },
  fallbackCopy: { color: colors.textMuted, fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 7 },
});
