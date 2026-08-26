import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { calculateReadinessBand } from '../../domain/readiness.ts';
import type { DailyReadinessInput, MuscleGroup, ReadinessEnergy, ReadinessSleep, ReadinessSoreness } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

interface ReadinessScreenProps {
  onBack: () => void;
  onSubmit: (input: DailyReadinessInput) => void;
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

const SORE_MUSCLES: MuscleGroup[] = ['chest', 'back', 'shoulders', 'core', 'quads', 'hamstrings', 'glutes', 'calves'];

export function ReadinessScreen({ onBack, onSubmit }: ReadinessScreenProps) {
  const [energy, setEnergy] = useState<ReadinessEnergy | null>(null);
  const [sleep, setSleep] = useState<ReadinessSleep | null>(null);
  const [soreness, setSoreness] = useState<ReadinessSoreness | null>(null);
  const [soreMuscles, setSoreMuscles] = useState<MuscleGroup[]>([]);
  const [painOrWarning, setPainOrWarning] = useState(false);

  const input = useMemo<DailyReadinessInput | null>(() => {
    if (!energy || !sleep || !soreness) return null;
    if (soreness !== 'none' && soreMuscles.length === 0) return null;
    return { energy, sleep, soreness, soreMuscles: soreness === 'none' ? [] : soreMuscles, painOrWarning };
  }, [energy, sleep, soreness, soreMuscles, painOrWarning]);
  const band = input ? calculateReadinessBand(input) : null;

  const toggleMuscle = (muscle: MuscleGroup) => {
    setSoreMuscles((current) => current.includes(muscle) ? current.filter((item) => item !== muscle) : [...current, muscle]);
  };

  const submit = () => {
    if (input) onSubmit(input);
  };

  return (
    <Screen eyebrow="PLAYER SYNC" title="Daily Readiness" subtitle="One honest signal lets the System tune today's protocol without guessing.">
      <SystemPanel eyebrow="01 // ENERGY" title="Current charge">
        <OptionRow options={ENERGY} selected={energy} onSelect={setEnergy} />
      </SystemPanel>

      <SystemPanel eyebrow="02 // SLEEP" title="Last recovery cycle">
        <OptionRow options={SLEEP} selected={sleep} onSelect={setSleep} />
      </SystemPanel>

      <SystemPanel eyebrow="03 // MUSCLE LOAD" title="Training soreness">
        <OptionRow options={SORENESS} selected={soreness} onSelect={(value) => { setSoreness(value); if (value === 'none') setSoreMuscles([]); }} />
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
          onPress={() => setPainOrWarning((current) => !current)}
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

      <GlowButton label="SYNC READINESS" onPress={submit} disabled={!input} />
      <GlowButton label="RETURN TO SYSTEM" onPress={onBack} variant="secondary" />
    </Screen>
  );
}

function OptionRow<T extends string>({ options, selected, onSelect }: { options: { value: T; label: string; detail: string }[]; selected: T | null; onSelect: (value: T) => void }) {
  return (
    <View style={styles.options}>
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && styles.pressed]}
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
  options: { flexDirection: 'row', gap: spacing.sm },
  option: { flex: 1, minHeight: 68, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(147,164,195,0.16)', backgroundColor: 'rgba(7,9,15,0.42)' },
  optionActive: { borderColor: colors.lineStrong, backgroundColor: 'rgba(41,182,255,0.1)' },
  optionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 0.9 },
  optionLabelActive: { color: colors.primary },
  optionDetail: { color: colors.textDim, fontSize: 8, marginTop: 5 },
  muscleSection: { marginTop: spacing.lg },
  sectionLabel: { color: colors.textDim, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginBottom: spacing.sm },
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  muscleChip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(147,164,195,0.16)' },
  muscleChipSelected: { borderColor: colors.lineStrong, backgroundColor: 'rgba(41,182,255,0.1)' },
  muscleText: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  muscleTextSelected: { color: colors.primary },
  safetyCopy: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginBottom: spacing.lg },
  warning: { minHeight: 78, flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(147,164,195,0.16)', backgroundColor: 'rgba(7,9,15,0.42)' },
  warningActive: { borderColor: 'rgba(226,61,87,0.62)', backgroundColor: 'rgba(226,61,87,0.09)' },
  warningMark: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.textDim, marginRight: spacing.md },
  warningMarkActive: { borderColor: colors.danger },
  warningMarkText: { color: colors.text, fontSize: 20, fontWeight: '900' },
  warningCopy: { flex: 1 },
  warningTitle: { color: colors.text, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  warningTitleActive: { color: colors.danger },
  warningDetail: { color: colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 4 },
  outcome: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(41,182,255,0.06)' },
  outcomeRecovery: { borderColor: 'rgba(85,230,177,0.35)', backgroundColor: 'rgba(85,230,177,0.06)' },
  outcomeHold: { borderColor: 'rgba(226,61,87,0.42)', backgroundColor: 'rgba(226,61,87,0.07)' },
  outcomeLabel: { color: colors.textDim, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  outcomeValue: { color: colors.primary, fontSize: 15, fontWeight: '900', letterSpacing: 0.8, marginTop: 5 },
  outcomeDanger: { color: colors.danger },
  outcomeCopy: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: spacing.sm },
  pressed: { opacity: 0.78 },
});
