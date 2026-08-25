import { useEffect, useState } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

import type { Exercise } from '../../domain/types.ts';
import { colors, radius } from '../theme.ts';

// Metro requires statically analyzable image literals for assets bundled in the native app.
/* eslint-disable @typescript-eslint/no-require-imports */
interface GuideAsset {
  source: ImageSourcePropType;
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  frameDurationMs: number;
  sequence: readonly number[];
  phases: readonly [string, string];
  secondPhaseStartFrame?: number;
}

const TWO_SIDED_SEQUENCE = [0, 1, 2, 3, 2, 1, 0, 4, 5, 6, 7, 6, 5, 4] as const;

const GUIDE_ASSETS: Partial<Record<string, GuideAsset>> = {
  'march-place': {
    source: require('../../../assets/exercises/sprites/march-in-place.jpg'),
    columns: 4,
    rows: 2,
    frameWidth: 144,
    frameHeight: 192,
    frameDurationMs: 110,
    sequence: TWO_SIDED_SEQUENCE,
    phases: ['GROUND', 'KNEE DRIVE'],
  },
  'step-jack': {
    source: require('../../../assets/exercises/sprites/low-impact-step-jack.jpg'),
    columns: 4,
    rows: 2,
    frameWidth: 144,
    frameHeight: 192,
    frameDurationMs: 120,
    sequence: [0, 2, 1, 3, 1, 2, 0, 4, 6, 5, 7, 5, 6, 4],
    phases: ['CENTER', 'STEP + REACH'],
  },
  'reverse-lunge': {
    source: require('../../../assets/exercises/sprites/reverse-lunge.jpg'),
    columns: 4,
    rows: 2,
    frameWidth: 144,
    frameHeight: 192,
    frameDurationMs: 150,
    sequence: TWO_SIDED_SEQUENCE,
    phases: ['STAND', 'STEP + LOWER'],
  },
  'cat-cow': {
    source: require('../../../assets/exercises/sprites/cat-cow.jpg'),
    columns: 2,
    rows: 4,
    frameWidth: 292,
    frameHeight: 98,
    frameDurationMs: 165,
    sequence: [0, 1, 2, 3, 3, 3, 2, 1, 0, 4, 5, 6, 7, 7, 7, 6, 5, 4],
    phases: ['EXTEND', 'ROUND'],
    secondPhaseStartFrame: 4,
  },
};

export function ExerciseGuide({ exercise, paused = false }: { exercise: Exercise; paused?: boolean }) {
  const guide = GUIDE_ASSETS[exercise.id];
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    setCursor(0);
  }, [exercise.id]);

  useEffect(() => {
    if (!guide || paused) return;
    const timer = setInterval(() => {
      setCursor((current) => (current + 1) % guide.sequence.length);
    }, guide.frameDurationMs);
    return () => clearInterval(timer);
  }, [guide, paused]);

  if (!guide) return <GuideUnavailable exercise={exercise} />;

  const frame = guide.sequence[cursor % guide.sequence.length] ?? 0;
  const column = frame % guide.columns;
  const row = Math.floor(frame / guide.columns);
  const activePhase = guide.secondPhaseStartFrame === undefined
    ? (frame % 4 === 0 ? 0 : 1)
    : (frame >= guide.secondPhaseStartFrame ? 1 : 0);
  const framesPerSecond = Math.round(1000 / guide.frameDurationMs);

  return (
    <View accessibilityLabel={`Frame animated movement guide for ${exercise.name}`} style={styles.root}>
      <View style={styles.guideHeader}>
        <Text style={styles.guideHeaderText}>MOTION ARCHIVE</Text>
        <Text style={styles.guideHeaderMeta}>{paused ? 'PAUSED' : `${framesPerSecond} FPS LOOP`}</Text>
      </View>

      <View pointerEvents="none" style={styles.motionField}>
        <View style={styles.orbitOuter} />
        <View style={[styles.frameViewport, { width: guide.frameWidth, height: guide.frameHeight }]}>
          <Image
            source={guide.source}
            resizeMode="stretch"
            style={{
              position: 'absolute',
              left: -column * guide.frameWidth,
              top: -row * guide.frameHeight,
              width: guide.frameWidth * guide.columns,
              height: guide.frameHeight * guide.rows,
            }}
          />
        </View>
      </View>

      <View style={styles.phaseRow}>
        <View style={[styles.phase, activePhase === 0 ? styles.phaseActive : styles.phaseInactive]}>
          <Text style={styles.phaseIndex}>01</Text>
          <Text numberOfLines={1} style={styles.phaseLabel}>{guide.phases[0]}</Text>
        </View>
        <View style={[styles.phase, styles.phaseRight, activePhase === 1 ? styles.phaseActive : styles.phaseInactive]}>
          <Text style={styles.phaseIndex}>02</Text>
          <Text numberOfLines={1} style={styles.phaseLabel}>{guide.phases[1]}</Text>
        </View>
      </View>
    </View>
  );
}

function GuideUnavailable({ exercise }: { exercise: Exercise }) {
  return (
    <View accessibilityLabel={`Movement instructions for ${exercise.name}`} style={[styles.root, styles.fallback]}>
      <View style={styles.fallbackRune}><Text style={styles.fallbackRuneText}>◇</Text></View>
      <Text style={styles.fallbackEyebrow}>MOTION ARCHIVE // CALIBRATING</Text>
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
    backgroundColor: '#02050C',
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
  motionField: {
    position: 'absolute',
    top: 22,
    left: 0,
    right: 0,
    bottom: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitOuter: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 1,
    borderColor: 'rgba(41,182,255,0.13)',
    backgroundColor: 'rgba(18,125,255,0.02)',
  },
  frameViewport: { overflow: 'hidden' },
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
  phaseActive: { opacity: 1 },
  phaseInactive: { opacity: 0.35 },
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
