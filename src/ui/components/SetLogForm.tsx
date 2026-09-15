import { loadGuidance } from '../../domain/loadGuidance.ts';
import { setupsForExercise } from '../../domain/loadouts.ts';
import { chooseLoadIncrease, loadProgressionOffer } from '../../domain/loadProgression.ts';
import { MAX_WARMUP_SETS } from '../../domain/workoutLifecycle.ts';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { isValidSetPerformance } from '../../domain/setPerformance.ts';
import type { Exercise, LoadDecision, PerceivedDifficulty, SetKind, SetPerformance, UserProfile, WorkoutHistoryEntry } from '../../domain/types.ts';
import { GlowButton } from './GlowButton.tsx';
import { colors, radius, spacing } from '../theme.ts';

interface Props {
  exercise: Exercise;
  profile: UserProfile;
  history: WorkoutHistoryEntry[];
  dateKey: string;
  reduced: boolean;
  lastSetupId: string | null;
  target: number;
  lastSetLoad: number | null;
  label: string;
  disabled: boolean;
  completedWorkSets: number;
  warmupSets: SetPerformance[];
  training: boolean;
  onComplete: (set: SetPerformance, kind: SetKind) => void;
}

export function SetLogForm({ exercise, profile, history, dateKey, reduced, lastSetupId, target, lastSetLoad, label, disabled, completedWorkSets, warmupSets, training, onComplete }: Props) {
  const setups = useMemo(() => setupsForExercise(profile, exercise.id), [profile, exercise.id]);
  const [setupId, setSetupId] = useState(lastSetupId ?? '');
  const setup = setups.find((s) => s.id === setupId);
  const guidance = useMemo(() => loadGuidance(exercise, profile, history, dateKey, reduced, setup), [exercise, profile, history, dateKey, reduced, setup]);
  const [reps, setReps] = useState(String(target));
  const [weight, setWeight] = useState(lastSetLoad === null ? '' : String(lastSetLoad));
  const [effort, setEffort] = useState<PerceivedDifficulty | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<SetKind>('work');
  const [increment, setIncrement] = useState('');
  const [decision, setDecision] = useState<LoadDecision | null>(null);
  const preparation = training && Boolean(exercise.loading) && completedWorkSets === 0;
  const hardWarmup = warmupSets.some((set) => set.effort === 'too-hard');
  const offer = useMemo(() => preparation && !hardWarmup
    ? loadProgressionOffer(exercise, profile, history, dateKey, reduced, setup) : null,
  [preparation, hardWarmup, exercise, profile, history, dateKey, reduced, setup]);
  const changeKind = (next: SetKind) => {
    setKind(next); setDecision(null); setWeight(''); setReps(next === 'warmup' ? '' : String(target)); setEffort(null); setError(null);
  };
  const selectIncrease = () => {
    const value = increment.trim().replace(',', '.');
    const choice = offer && /^\d+(\.\d{1,2})?$/.test(value) ? chooseLoadIncrease(offer, Number(value)) : null;
    if (!choice) { setError('Enter an available increase with up to 2 decimal places. Suggestions are capped at 10% of the previous load; keep your current load if the next step is larger.'); return; }
    setDecision(choice.decision); setWeight(String(choice.loadKg)); setReps(String(exercise.minReps)); setError(null);
  };
  const submit = () => {
    const normalizedWeight = weight.trim().replace(',', '.');
    const set: SetPerformance = {
      actual: /^\d+$/.test(reps.trim()) ? Number(reps) : NaN,
      loadKg: exercise.loading ? /^\d+(\.\d{1,2})?$/.test(normalizedWeight) ? Number(normalizedWeight) : NaN : null,
      effort,
      ...(setup ? { machineSetup: { ...setup } } : {}),
      ...(decision && kind === 'work' ? { loadDecision: decision } : {}),
    };
    if (!isValidSetPerformance(set, exercise)) {
      setError(exercise.loading ? 'Enter 0–500 whole reps, 0–1000 kg and select how the set felt.' : 'Enter 0–500 whole reps.');
      return;
    }
    setError(null);
    onComplete(set, kind);
  };
  return <View style={styles.root}>
    {exercise.loading === 'stack' ? <>
      <Text style={styles.heading}>MACHINE SETUP // {profile.loadouts?.active.toUpperCase() ?? 'UNCONFIGURED'}</Text>
      <Text style={styles.copy}>Use the same machine, settings and kg convention for comparisons. Register setups in Status → Loadout before training.</Text>
      <View style={styles.choices}>{[{ id: '', label: 'NOT IDENTIFIED' }, ...setups].map((s) => <Pressable key={s.id} accessibilityRole="radio" accessibilityState={{ checked: setupId === s.id, disabled }} disabled={disabled} style={[styles.choice, setupId === s.id && styles.selected]} onPress={() => { setSetupId(s.id); setWeight(''); setDecision(null); setIncrement(''); setReps(kind === 'warmup' ? '' : String(target)); setError(null); }}><Text style={styles.choiceText}>{s.label}</Text></Pressable>)}</View>
    </> : null}
    {preparation ? <>
      <Text style={styles.heading}>SET TYPE</Text>
      <View style={styles.choices}>{(['work', 'warmup'] as const).map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: kind === value, disabled: disabled || (value === 'warmup' && warmupSets.length >= MAX_WARMUP_SETS) }} disabled={disabled || (value === 'warmup' && warmupSets.length >= MAX_WARMUP_SETS)} onPress={() => changeKind(value)} style={[styles.choice, kind === value && styles.selected]}><Text style={styles.choiceText}>{value === 'work' ? 'WORK SET' : 'WARM-UP'}</Text></Pressable>)}</View>
      <Text style={styles.copy}>{warmupSets.length} / {MAX_WARMUP_SETS} optional warm-ups recorded. Log them before the first work set. They do not complete work sets or add progression evidence or XP.</Text>
    </> : null}
    {kind === 'work' && guidance.message ? <Text style={styles.copy}>{guidance.message}{guidance.previousKg !== null ? ` Last recorded: ${guidance.previousKg} kg${exercise.loading === 'per-hand' ? ' each' : exercise.loading === 'stack' ? ' marked' : ' total'}.` : ''}</Text> : null}
    {preparation && hardWarmup ? <Text style={styles.copy}>A warm-up felt too hard. No increase is offered today; review your load before continuing.</Text> : null}
    {kind === 'work' && offer ? <>
      <Text style={styles.heading}>OPTIONAL LOAD PROGRESSION</Text>
      <Text style={styles.copy}>The last two exposures ({offer.evidenceDateKeys.join(', ')}) reached the top of the rep range at {offer.previousKg} kg{exercise.loading === 'per-hand' ? ' each' : ''}. Enter the smallest increase your equipment supports. The app caps suggestions at 10%; no weight is selected automatically.</Text>
      <TextInput accessibilityLabel="Available weight increase in kilograms" editable={!disabled} value={increment} onChangeText={setIncrement} keyboardType="decimal-pad" maxLength={6} placeholder="Available increment, kg" placeholderTextColor={colors.textDim} style={styles.input} />
      <GlowButton label="CHOOSE THIS INCREASE" variant="secondary" disabled={disabled || !increment.trim()} onPress={selectIncrease} />
    </> : null}
    {decision ? <>
      <Text style={styles.copy}>Chosen: {weight} kg{exercise.loading === 'per-hand' ? ' each' : ''}. The work target restarts at {exercise.minReps} reps when this set is confirmed. Record actual reps below. Nothing is saved until confirmation.</Text>
      <GlowButton label="CANCEL LOAD CHANGE" variant="secondary" disabled={disabled} onPress={() => { setDecision(null); setWeight(lastSetLoad === null ? '' : String(lastSetLoad)); setReps(String(target)); }} />
    </> : null}
    {kind === 'warmup' ? <Text style={styles.copy}>Choose your own light preparation load and record actual reps. No starting weight or warm-up prescription is estimated.</Text> : null}
    <Text style={styles.heading}>{kind === 'warmup' ? 'WARM-UP RECORD' : 'WORK SET RECORD'} // CONFIRM ACTUAL PERFORMANCE</Text>
    <Text style={styles.copy}>Adjust the target below to what you actually completed. Enter 0 if no reps were completed.</Text>
    <Text style={styles.label}>COMPLETED REPS</Text>
    <TextInput accessibilityLabel="Completed repetitions" editable={!disabled} value={reps} onChangeText={setReps} keyboardType="number-pad" maxLength={3} style={styles.input} selectTextOnFocus />
    {exercise.loading ? <>
      <Text style={styles.label}>{exercise.loading === 'per-hand' ? 'KG PER DUMBBELL' : exercise.loading === 'stack' ? 'KG MARKED / ADDED ON THIS MACHINE' : 'TOTAL KG (INCLUDE BAR WHEN USED)'}</Text>
      <TextInput accessibilityLabel="Weight in kilograms" editable={!disabled} value={weight} onChangeText={(value) => { setWeight(value); if (decision) { setDecision(null); setReps(String(target)); } }} keyboardType="decimal-pad" maxLength={7} placeholder="Choose your load" placeholderTextColor={colors.textDim} style={styles.input} selectTextOnFocus />
      <Text style={styles.label}>HOW DID THIS SET FEEL?</Text>
      <View style={styles.choices}>{(['too-easy', 'perfect', 'too-hard'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: effort === value, disabled }} disabled={disabled} onPress={() => setEffort(value)} style={[styles.choice, effort === value && styles.selected]}><Text style={styles.choiceText}>{value.replaceAll('-', ' ').toUpperCase()}</Text></Pressable>)}</View>
    </> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <GlowButton label={disabled ? label : kind === 'warmup' ? 'CONFIRM WARM-UP' : label} disabled={disabled} onPress={submit} />
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
