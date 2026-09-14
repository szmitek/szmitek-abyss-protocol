import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { isValidSetPerformance } from '../../domain/setPerformance.ts';
import type { Exercise, PerceivedDifficulty, SetPerformance } from '../../domain/types.ts';
import { GlowButton } from './GlowButton.tsx';
import { colors, radius, spacing } from '../theme.ts';

interface Props {
  exercise: Exercise;
  target: number;
  lastSetLoad: number | null;
  label: string;
  disabled: boolean;
  onComplete: (set: SetPerformance) => void;
}

export function SetLogForm({ exercise, target, lastSetLoad, label, disabled, onComplete }: Props) {
  const [reps, setReps] = useState(String(target));
  const [weight, setWeight] = useState(lastSetLoad === null ? '' : String(lastSetLoad));
  const [effort, setEffort] = useState<PerceivedDifficulty | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const normalizedWeight = weight.trim().replace(',', '.');
    const set: SetPerformance = {
      actual: /^\d+$/.test(reps.trim()) ? Number(reps) : NaN,
      loadKg: exercise.loading ? /^\d+(\.\d{1,2})?$/.test(normalizedWeight) ? Number(normalizedWeight) : NaN : null,
      effort,
    };
    if (!isValidSetPerformance(set, exercise)) {
      setError(exercise.loading ? 'Enter 0–500 whole reps, 0–1000 kg and select how the set felt.' : 'Enter 0–500 whole reps.');
      return;
    }
    setError(null);
    onComplete(set);
  };
  return <View style={styles.root}>
    <Text style={styles.heading}>SET RECORD // CONFIRM ACTUAL PERFORMANCE</Text>
    <Text style={styles.copy}>Adjust the target below to what you actually completed. Enter 0 if no reps were completed.</Text>
    <Text style={styles.label}>COMPLETED REPS</Text>
    <TextInput accessibilityLabel="Completed repetitions" editable={!disabled} value={reps} onChangeText={setReps} keyboardType="number-pad" maxLength={3} style={styles.input} selectTextOnFocus />
    {exercise.loading ? <>
      <Text style={styles.label}>{exercise.loading === 'per-hand' ? 'KG PER DUMBBELL' : exercise.loading === 'stack' ? 'KG MARKED / ADDED ON THIS MACHINE' : 'TOTAL KG (INCLUDE BAR WHEN USED)'}</Text>
      <TextInput accessibilityLabel="Weight in kilograms" editable={!disabled} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" maxLength={7} placeholder="Choose your load" placeholderTextColor={colors.textDim} style={styles.input} selectTextOnFocus />
      <Text style={styles.label}>HOW DID THIS SET FEEL?</Text>
      <View style={styles.choices}>{(['too-easy', 'perfect', 'too-hard'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: effort === value, disabled }} disabled={disabled} onPress={() => setEffort(value)} style={[styles.choice, effort === value && styles.selected]}><Text style={styles.choiceText}>{value.replaceAll('-', ' ').toUpperCase()}</Text></Pressable>)}</View>
    </> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <GlowButton label={label} disabled={disabled} onPress={submit} />
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm, paddingVertical: spacing.md },
  heading: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  copy: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  input: { minHeight: 48, color: colors.text, fontSize: 18, padding: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.panel },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minHeight: 48, padding: spacing.sm, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm },
  selected: { borderColor: colors.primary, backgroundColor: 'rgba(41,182,255,0.12)' },
  choiceText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 12 },
});
