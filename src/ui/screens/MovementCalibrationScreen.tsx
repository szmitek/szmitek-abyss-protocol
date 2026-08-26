import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MOVEMENT_CHECKS, type MovementCheck, type MovementRating } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

interface MovementCalibrationScreenProps {
  onCancel?: (() => void) | undefined;
  onComplete: (results: Record<MovementCheck, MovementRating>) => void;
}

const CHECKS: Record<MovementCheck, { name: string; protocol: string; signal: string }> = {
  'squat-control': {
    name: 'SQUAT CONTROL',
    protocol: 'Perform 5 slow bodyweight squats to a comfortable depth. Keep both feet grounded.',
    signal: 'Judge balance, knee comfort and control—not maximum depth.',
  },
  'overhead-reach': {
    name: 'OVERHEAD REACH',
    protocol: 'Stand with ribs relaxed and slowly raise both arms overhead without forcing the range.',
    signal: 'Judge symmetry and comfort without leaning backward.',
  },
  'hip-hinge': {
    name: 'HIP HINGE',
    protocol: 'With soft knees, push the hips back while keeping a long spine, then return to standing.',
    signal: 'Perform 5 controlled repetitions without chasing range.',
  },
  'single-leg-balance': {
    name: 'SINGLE-LEG BALANCE',
    protocol: 'Stand near a wall and balance on each leg for up to 20 seconds.',
    signal: 'Light fingertip support is allowed for safety.',
  },
  'plank-control': {
    name: 'PLANK CONTROL',
    protocol: 'Hold a forearm plank for up to 20 seconds while breathing normally.',
    signal: 'Stop before form breaks. This is not a maximum-effort test.',
  },
};

const RATINGS: { value: MovementRating; label: string; detail: string }[] = [
  { value: 'clear', label: 'CLEAR', detail: 'Controlled and pain-free' },
  { value: 'limited', label: 'LIMITED', detail: 'Restricted or unstable' },
  { value: 'pain', label: 'PAIN', detail: 'Pain during the check' },
];

export function MovementCalibrationScreen({ onCancel, onComplete }: MovementCalibrationScreenProps) {
  const [results, setResults] = useState<Partial<Record<MovementCheck, MovementRating>>>({});
  const complete = MOVEMENT_CHECKS.every((check) => results[check] !== undefined);
  const painDetected = Object.values(results).includes('pain');

  const save = () => {
    if (!complete) return;
    onComplete(results as Record<MovementCheck, MovementRating>);
  };

  return (
    <Screen
      eyebrow="SYSTEM // MOVEMENT ANALYSIS"
      title="Player Calibration"
      subtitle="Five submaximal checks establish a movement baseline. The System adapts difficulty and exercise selection from your report."
    >
      <View style={styles.directive}>
        <Text style={styles.directiveMark}>!</Text>
        <View style={styles.directiveCopy}>
          <Text style={styles.directiveTitle}>NO MAXIMUM EFFORT REQUIRED</Text>
          <Text style={styles.directiveText}>Choose PAIN if a check hurts and stop that check immediately. The System will seal unsupervised training until you re-scan.</Text>
        </View>
      </View>

      {MOVEMENT_CHECKS.map((check, index) => {
        const item = CHECKS[check];
        return (
          <SystemPanel key={check} eyebrow={`${`${index + 1}`.padStart(2, '0')} // MOVEMENT TRIAL`} title={item.name} accent={results[check] === 'pain' ? 'danger' : results[check] === 'limited' ? 'purple' : 'blue'}>
            <Text style={styles.protocol}>{item.protocol}</Text>
            <Text style={styles.signal}>◇ {item.signal}</Text>
            <View style={styles.ratings}>
              {RATINGS.map((rating) => (
                <RatingButton
                  key={rating.value}
                  {...rating}
                  selected={results[check] === rating.value}
                  onPress={() => setResults((current) => ({ ...current, [check]: rating.value }))}
                />
              ))}
            </View>
          </SystemPanel>
        );
      })}

      {painDetected ? (
        <View style={styles.hold}>
          <Text style={styles.holdTitle}>SYSTEM SAFEGUARD WILL ACTIVATE</Text>
          <Text style={styles.holdText}>A reported pain response is not a diagnosis. Training stays sealed until the movement check is repeated without pain or your Player Scan is reviewed.</Text>
        </View>
      ) : null}

      <GlowButton label={painDetected ? 'REGISTER PAIN SIGNAL' : 'SEAL MOVEMENT BASELINE'} variant={painDetected ? 'danger' : 'primary'} disabled={!complete} onPress={save} />
      {onCancel ? <GlowButton label="RETURN TO STATUS" variant="secondary" onPress={onCancel} /> : null}
    </Screen>
  );
}

function RatingButton({ value, label, detail, selected, onPress }: { value: MovementRating; label: string; detail: string; selected: boolean; onPress: () => void }) {
  const danger = value === 'pain';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.rating, selected && (danger ? styles.ratingDanger : styles.ratingSelected), pressed && styles.pressed]}
    >
      <Text style={[styles.ratingLabel, selected && (danger ? styles.dangerText : styles.selectedText)]}>{selected ? '◆ ' : '◇ '}{label}</Text>
      <Text style={styles.ratingDetail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  directive: { minHeight: 88, flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(248,200,106,0.3)', backgroundColor: 'rgba(248,200,106,0.06)' },
  directiveMark: { width: 38, color: colors.warning, fontSize: 30, fontWeight: '900', textAlign: 'center', marginRight: spacing.md },
  directiveCopy: { flex: 1 },
  directiveTitle: { color: colors.warning, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  directiveText: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  protocol: { color: colors.text, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  signal: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: spacing.sm },
  ratings: { gap: spacing.sm, marginTop: spacing.lg },
  rating: { minHeight: 52, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(147,164,195,0.15)', backgroundColor: 'rgba(7,9,15,0.4)' },
  ratingSelected: { borderColor: colors.lineStrong, backgroundColor: 'rgba(41,182,255,0.09)' },
  ratingDanger: { borderColor: 'rgba(226,61,87,0.72)', backgroundColor: 'rgba(226,61,87,0.09)' },
  ratingLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  ratingDetail: { color: colors.textDim, fontSize: 9, marginTop: 3 },
  selectedText: { color: colors.primary },
  dangerText: { color: colors.danger },
  pressed: { opacity: 0.72 },
  hold: { padding: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.danger, backgroundColor: 'rgba(226,61,87,0.07)' },
  holdTitle: { color: colors.danger, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  holdText: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 5 },
});
