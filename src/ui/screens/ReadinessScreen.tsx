import { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { toDateKey } from '../../domain/date.ts';
import { calculateReadinessBand } from '../../domain/readiness.ts';
import { readinessDraft, readinessDraftChanged, readinessInput } from '../../domain/readinessDraft.ts';
import type { DailyReadiness, DailyReadinessInput, MuscleGroup, ReadinessEnergy, ReadinessSleep, ReadinessSoreness } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

interface ReadinessScreenProps {
  initialReadiness: DailyReadiness | null;
  onBack: () => void;
  onSubmit: (input: DailyReadinessInput, dateKey: string) => void;
}

const ENERGY: { value: ReadinessEnergy; label: string; detail: string }[] = [
  { value: 'low', label: 'LOW', detail: 'Drained' },
  { value: 'stable', label: 'STABLE', detail: 'Usual' },
  { value: 'high', label: 'HIGH', detail: 'Ready' },
];

const SLEEP: { value: ReadinessSleep; label: string; detail: string }[] = [
  { value: 'poor', label: 'POOR', detail: 'Broken' },
  { value: 'fair', label: 'FAIR', detail: 'Limited' },
  { value: 'good', label: 'GOOD', detail: 'Restored' },
];

const SORENESS: { value: ReadinessSoreness; label: string; detail: string }[] = [
  { value: 'none', label: 'NONE', detail: 'Fresh' },
  { value: 'mild', label: 'MILD', detail: 'Manageable' },
  { value: 'high', label: 'HIGH', detail: 'Heavy' },
];

const SORE_MUSCLES: MuscleGroup[] = ['chest', 'back', 'shoulders', 'arms', 'neck', 'core', 'quads', 'hamstrings', 'glutes', 'calves', 'full-body'];

export function ReadinessScreen({ initialReadiness, onBack, onSubmit }: ReadinessScreenProps) {
  const [session] = useState(() => {
    const dateKey = toDateKey(new Date());
    return { dateKey, initial: readinessDraft(initialReadiness, dateKey), editing: initialReadiness?.dateKey === dateKey };
  });
  const [draft, setDraft] = useState(session.initial);
  const [error, setError] = useState<string | null>(null);
  const { energy, sleep, soreness, soreMuscles, painOrWarning } = draft;
  const dirty = readinessDraftChanged(session.initial, draft);
  const input = readinessInput(draft);
  const band = input ? calculateReadinessBand(input) : null;
  const missing = [!energy && 'energy', !sleep && 'sleep', !soreness && 'soreness', soreness && soreness !== 'none' && !soreMuscles.length && 'affected areas'].filter(Boolean);

  const requestBack = useCallback(() => {
    if (!dirty) { onBack(); return; }
    Alert.alert('Discard readiness changes?', 'Your saved signal stays unchanged until you sync.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard changes', style: 'destructive', onPress: onBack },
    ]);
  }, [dirty, onBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { requestBack(); return true; });
    return () => subscription.remove();
  }, [requestBack]);

  const toggleMuscle = (muscle: MuscleGroup) => {
    setDraft((current) => ({ ...current, soreMuscles: current.soreMuscles.includes(muscle) ? current.soreMuscles.filter((item) => item !== muscle) : [...current.soreMuscles, muscle] }));
  };

  const submit = () => {
    if (!input) return;
    const save = () => {
      try { onSubmit(input, session.dateKey); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Readiness could not be updated. Try again.'); }
    };
    if (session.initial.painOrWarning && !painOrWarning) {
      Alert.alert('Clear the warning signal?', 'Only confirm if the previous entry was incorrect or the warning is no longer present. Other System safeguards still apply.', [
        { text: 'Keep editing', style: 'cancel' }, { text: 'Confirm correction', onPress: save },
      ]);
    } else save();
  };

  return (
    <Screen eyebrow="PLAYER SYNC" title="Daily Readiness" subtitle="One honest signal lets the System tune today's protocol without guessing.">
      <Text style={styles.sessionCopy}>{session.editing ? 'EDITING TODAY’S SIGNAL' : 'NEW DAILY SIGNAL'} · {session.dateKey}{'\n'}{session.editing ? 'Your saved answers are loaded. Changes apply only when you sync; completed training stays recorded.' : 'Choose an answer in each section. Yesterday’s answers are never carried forward.'}</Text>
      <SystemPanel eyebrow="01 // ENERGY" title="Current charge">
        <OptionRow label="Energy" options={ENERGY} selected={energy} onSelect={(value) => setDraft((current) => ({ ...current, energy: value }))} />
      </SystemPanel>

      <SystemPanel eyebrow="02 // SLEEP" title="Last recovery cycle">
        <OptionRow label="Sleep" options={SLEEP} selected={sleep} onSelect={(value) => setDraft((current) => ({ ...current, sleep: value }))} />
      </SystemPanel>

      <SystemPanel eyebrow="03 // MUSCLE LOAD" title="Training soreness">
        <OptionRow label="Soreness" options={SORENESS} selected={soreness} onSelect={(value) => setDraft((current) => ({ ...current, soreness: value, soreMuscles: value === 'none' ? [] : current.soreMuscles }))} />
        {soreness && soreness !== 'none' ? (
          <View style={styles.muscleSection}>
            <Text style={styles.sectionLabel}>MARK AFFECTED AREAS</Text>
            <View style={styles.muscleGrid}>
              {SORE_MUSCLES.map((muscle) => {
                const selected = soreMuscles.includes(muscle);
                return (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    key={muscle}
                    onPress={() => toggleMuscle(muscle)}
                    style={({ pressed }) => [styles.muscleChip, selected && styles.muscleChipSelected, pressed && styles.pressed]}
                  >
                    <Text style={[styles.muscleText, selected && styles.muscleTextSelected]}>{muscle.toUpperCase()}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </SystemPanel>

      <SystemPanel eyebrow="SYSTEM SAFEGUARD" title="Pain or unusual symptoms" accent={painOrWarning ? 'danger' : 'purple'}>
        <Text style={styles.safetyCopy}>Training soreness is not the same as sharp or new pain. Select the warning signal for pain, dizziness, chest discomfort, an acute injury, or unusual breathlessness.</Text>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: painOrWarning }}
          onPress={() => setDraft((current) => ({ ...current, painOrWarning: !current.painOrWarning }))}
          style={({ pressed }) => [styles.warning, painOrWarning && styles.warningActive, pressed && styles.pressed]}
        >
          <View style={[styles.warningMark, painOrWarning && styles.warningMarkActive]}><Text style={styles.warningMarkText}>{painOrWarning ? '!' : '◇'}</Text></View>
          <View style={styles.warningCopy}><Text style={[styles.warningTitle, painOrWarning && styles.warningTitleActive]}>{painOrWarning ? 'WARNING SIGNAL ACTIVE' : 'NO WARNING SIGNAL'}</Text><Text style={styles.warningDetail}>{painOrWarning ? 'Unsupervised training will be sealed for today.' : 'Tap only when a warning symptom is present.'}</Text></View>
        </Pressable>
      </SystemPanel>

      {band ? (
        <View style={[styles.outcome, band === 'hold' && styles.outcomeHold, band === 'recovery' && styles.outcomeRecovery]}>
          <Text style={styles.outcomeLabel}>SYSTEM RESPONSE</Text>
          <Text style={[styles.outcomeValue, band === 'hold' && styles.outcomeDanger]}>{band === 'normal' ? 'PLANNED LOAD' : band === 'reduced' ? 'REDUCED LOAD' : band === 'recovery' ? 'RECOVERY DIRECTIVE' : 'PROTOCOL SEALED'}</Text>
          <Text style={styles.outcomeCopy}>{band === 'normal' ? 'The existing plan stays unchanged. High energy never raises load above the planned progression.' : band === 'reduced' ? 'Working sets and progression will be reduced; sore areas move down the selection order.' : band === 'recovery' ? 'Today becomes a protected recovery day with no required workout.' : 'No unsupervised workout will be generated from this signal.'}</Text>
        </View>
      ) : null}

      {missing.length ? <Text style={styles.sessionCopy} accessibilityLiveRegion="polite">Complete: {missing.join(', ')}.</Text> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      <GlowButton label={session.editing ? 'UPDATE READINESS' : 'SYNC READINESS'} onPress={submit} disabled={!input || (session.editing && !dirty)} />
      <GlowButton label="RETURN TO SYSTEM" onPress={requestBack} variant="secondary" />
    </Screen>
  );
}

function OptionRow<T extends string>({ label, options, selected, onSelect }: { label: string; options: { value: T; label: string; detail: string }[]; selected: T | null; onSelect: (value: T) => void }) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.25;
  return (
    <View style={[styles.options, stacked && styles.optionsStacked]}>
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${option.label}, ${option.detail}`}
            accessibilityState={{ selected: active }}
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [styles.option, stacked && styles.optionStacked, active && styles.optionActive, pressed && styles.pressed]}
          >
            <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{option.label}</Text>
            <Text style={styles.optionDetail}>{option.detail}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sessionCopy: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  options: { flexDirection: 'row', gap: spacing.sm },
  optionsStacked: { flexDirection: 'column' },
  optionStacked: { flex: 0 },
  option: { flex: 1, minHeight: 76, padding: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(147,164,195,0.16)', backgroundColor: 'rgba(7,9,15,0.42)' },
  optionActive: { borderColor: colors.lineStrong, backgroundColor: 'rgba(41,182,255,0.1)' },
  optionLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '900', letterSpacing: 0.4, textAlign: 'center' },
  optionLabelActive: { color: colors.primary },
  optionDetail: { color: colors.textMuted, fontSize: 12, marginTop: 5, textAlign: 'center' },
  muscleSection: { marginTop: spacing.lg },
  sectionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '900', letterSpacing: 0.7, marginBottom: spacing.sm },
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  muscleChip: { minHeight: 48, maxWidth: '100%', justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(147,164,195,0.16)' },
  muscleChipSelected: { borderColor: colors.lineStrong, backgroundColor: 'rgba(41,182,255,0.1)' },
  muscleText: { color: colors.textMuted, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  muscleTextSelected: { color: colors.primary },
  safetyCopy: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: spacing.lg },
  warning: { minHeight: 78, flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(147,164,195,0.16)', backgroundColor: 'rgba(7,9,15,0.42)' },
  warningActive: { borderColor: 'rgba(226,61,87,0.62)', backgroundColor: 'rgba(226,61,87,0.09)' },
  warningMark: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.textDim, marginRight: spacing.md },
  warningMarkActive: { borderColor: colors.danger },
  warningMarkText: { color: colors.text, fontSize: 20, fontWeight: '900' },
  warningCopy: { flex: 1 },
  warningTitle: { color: colors.text, fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  warningTitleActive: { color: colors.danger },
  warningDetail: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  outcome: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(41,182,255,0.06)' },
  outcomeRecovery: { borderColor: 'rgba(85,230,177,0.35)', backgroundColor: 'rgba(85,230,177,0.06)' },
  outcomeHold: { borderColor: 'rgba(226,61,87,0.42)', backgroundColor: 'rgba(226,61,87,0.07)' },
  outcomeLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  outcomeValue: { color: colors.primary, fontSize: 15, fontWeight: '900', letterSpacing: 0.8, marginTop: 5 },
  outcomeDanger: { color: colors.danger },
  outcomeCopy: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  pressed: { opacity: 0.78 },
});
