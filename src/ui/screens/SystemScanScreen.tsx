import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  PAIN_AREAS,
  POSTURE_PRIORITIES,
  SAFETY_SIGNALS,
  type PainArea,
  type PlayerHealthProfile,
  type PosturePriority,
  type SafetySignal,
} from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

interface SystemScanScreenProps {
  initialProfile: PlayerHealthProfile;
  onCancel?: () => void;
  onSave: (profile: PlayerHealthProfile) => void;
}

const PAIN_LABELS: Record<PainArea, string> = {
  'lower-back': 'LOWER BACK',
  'upper-back-neck': 'UPPER BACK / NECK',
  shoulders: 'SHOULDERS',
  wrists: 'WRISTS',
  hips: 'HIPS',
  knees: 'KNEES',
  ankles: 'ANKLES',
};

const POSTURE_LABELS: Record<PosturePriority, { label: string; detail: string }> = {
  'pelvic-control': { label: 'PELVIC CONTROL', detail: 'Core, glutes and hip control' },
  'rounded-upper-back': { label: 'UPPER BACK', detail: 'Thoracic movement and back strength' },
  'forward-shoulders': { label: 'SHOULDER POSITION', detail: 'Scapular control and chest balance' },
  'hip-mobility': { label: 'HIP MOBILITY', detail: 'Controlled range around the hips' },
  'shoulder-mobility': { label: 'SHOULDER MOBILITY', detail: 'Comfortable overhead movement' },
};

const SAFETY_LABELS: Record<SafetySignal, { label: string; detail: string }> = {
  'chest-pain': { label: 'CHEST PAIN', detail: 'During exertion or unexplained' },
  'fainting-dizziness': { label: 'FAINTING / DIZZINESS', detail: 'During or after activity' },
  'unusual-breathlessness': { label: 'UNUSUAL BREATHLESSNESS', detail: 'Beyond expected effort' },
  'acute-injury': { label: 'ACUTE INJURY', detail: 'Recent injury, surgery or severe pain' },
  'medical-restriction': { label: 'MEDICAL RESTRICTION', detail: 'No clearance for unsupervised exercise' },
};

function toggle<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function SystemScanScreen({ initialProfile, onCancel, onSave }: SystemScanScreenProps) {
  const [painAreas, setPainAreas] = useState<PainArea[]>(initialProfile.painAreas);
  const [posturePriorities, setPosturePriorities] = useState<PosturePriority[]>(initialProfile.posturePriorities);
  const [safetySignals, setSafetySignals] = useState<SafetySignal[]>(initialProfile.safetySignals);
  const [knownConditions, setKnownConditions] = useState(initialProfile.knownConditions);
  const [clinicianRestrictions, setClinicianRestrictions] = useState(initialProfile.clinicianRestrictions);
  const holdActive = safetySignals.length > 0;

  const save = () => onSave({
    scanCompleted: true,
    painAreas,
    posturePriorities,
    safetySignals,
    knownConditions: knownConditions.trim(),
    clinicianRestrictions: clinicianRestrictions.trim(),
    updatedAt: initialProfile.updatedAt,
  });

  return (
    <Screen
      eyebrow="SYSTEM // BIOMETRIC LINK"
      title="Player Scan"
      subtitle="Register the signals that must shape every generated protocol. These parameters stay on this device."
    >
      <SystemPanel eyebrow="01 // ACTIVE SIGNALS" title="Pain during movement">
        <Text style={styles.help}>Select only areas that currently hurt or reliably become painful during training. The System will remove conflicting exercises.</Text>
        <View style={styles.grid}>
          {PAIN_AREAS.map((area) => <SelectChip key={area} label={PAIN_LABELS[area]} selected={painAreas.includes(area)} onPress={() => setPainAreas((current) => toggle(current, area))} />)}
        </View>
      </SystemPanel>

      <SystemPanel eyebrow="02 // ADAPTATION TARGET" title="Posture priorities" accent="purple">
        <Text style={styles.help}>These are training priorities, not diagnoses. The generator will bias the block toward the selected movement qualities.</Text>
        <View style={styles.stack}>
          {POSTURE_PRIORITIES.map((priority) => (
            <SelectRow key={priority} label={POSTURE_LABELS[priority].label} detail={POSTURE_LABELS[priority].detail} selected={posturePriorities.includes(priority)} onPress={() => setPosturePriorities((current) => toggle(current, priority))} />
          ))}
        </View>
      </SystemPanel>

      <SystemPanel eyebrow="03 // SAFETY GATE" title="Unresolved warning signals" accent="danger">
        <Text style={styles.help}>Selecting any item pauses generated workouts. Clear it only when the situation is resolved or you have appropriate professional guidance.</Text>
        <View style={styles.stack}>
          {SAFETY_SIGNALS.map((signal) => (
            <SelectRow key={signal} label={SAFETY_LABELS[signal].label} detail={SAFETY_LABELS[signal].detail} selected={safetySignals.includes(signal)} danger onPress={() => setSafetySignals((current) => toggle(current, signal))} />
          ))}
        </View>
        {holdActive ? <View style={styles.hold}><Text style={styles.holdCode}>SYSTEM SAFEGUARD ACTIVE</Text><Text style={styles.holdText}>Daily training will remain sealed while warning signals are registered.</Text></View> : null}
      </SystemPanel>

      <SystemPanel eyebrow="04 // PRIVATE RECORD" title="Known conditions and guidance">
        <Text style={styles.fieldLabel}>CONDITIONS / DIAGNOSES YOU WANT RECORDED</Text>
        <TextInput
          accessibilityLabel="Known conditions"
          multiline
          onChangeText={setKnownConditions}
          placeholder="Example: diagnosed hyperlordosis, recurring lower-back symptoms..."
          placeholderTextColor={colors.textDim}
          style={styles.input}
          value={knownConditions}
        />
        <Text style={[styles.fieldLabel, styles.secondField]}>PHYSIO / DOCTOR RESTRICTIONS</Text>
        <TextInput
          accessibilityLabel="Professional exercise restrictions"
          multiline
          onChangeText={setClinicianRestrictions}
          placeholder="Exercises, ranges or loads you were told to avoid..."
          placeholderTextColor={colors.textDim}
          style={styles.input}
          value={clinicianRestrictions}
        />
        <Text style={styles.privateNote}>◇ LOCAL RECORD // No photo analysis or cloud upload is active in this version.</Text>
      </SystemPanel>

      <GlowButton label={holdActive ? 'LOCK TRAINING PROTOCOLS' : 'SEAL PLAYER PARAMETERS'} variant={holdActive ? 'danger' : 'primary'} onPress={save} />
      {onCancel ? <GlowButton label="RETURN TO STATUS" variant="secondary" onPress={onCancel} /> : null}
    </Screen>
  );
}

function SelectChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}>
      <Text style={[styles.chipText, selected && styles.selectedText]}>{selected ? '◆ ' : '◇ '}{label}</Text>
    </Pressable>
  );
}

function SelectRow({ label, detail, selected, danger = false, onPress }: { label: string; detail: string; selected: boolean; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.row, selected && (danger ? styles.dangerSelected : styles.selected), pressed && styles.pressed]}>
      <Text style={[styles.rowMark, danger && styles.dangerMark]}>{selected ? '◆' : '◇'}</Text>
      <View style={styles.rowCopy}><Text style={[styles.rowLabel, selected && (danger ? styles.dangerText : styles.selectedText)]}>{label}</Text><Text style={styles.rowDetail}>{detail}</Text></View>
      <Text style={[styles.state, selected && (danger ? styles.dangerText : styles.selectedText)]}>{selected ? 'ACTIVE' : 'CLEAR'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  help: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stack: { gap: spacing.sm },
  chip: { width: '48%', minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(147,164,195,0.16)', backgroundColor: 'rgba(7,9,15,0.42)' },
  selected: { borderColor: colors.lineStrong, backgroundColor: 'rgba(41,182,255,0.09)' },
  dangerSelected: { borderColor: 'rgba(226,61,87,0.75)', backgroundColor: 'rgba(226,61,87,0.09)' },
  pressed: { opacity: 0.72 },
  chipText: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  selectedText: { color: colors.primary },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(147,164,195,0.14)', backgroundColor: 'rgba(7,9,15,0.42)' },
  rowMark: { color: colors.primary, fontSize: 16, width: 30 },
  dangerMark: { color: colors.danger },
  rowCopy: { flex: 1 },
  rowLabel: { color: colors.text, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  rowDetail: { color: colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  state: { color: colors.textDim, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  dangerText: { color: colors.danger },
  hold: { marginTop: spacing.md, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.danger, backgroundColor: 'rgba(226,61,87,0.07)' },
  holdCode: { color: colors.danger, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  holdText: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  fieldLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginBottom: spacing.sm },
  secondField: { marginTop: spacing.lg },
  input: { minHeight: 88, color: colors.text, fontSize: 12, lineHeight: 18, textAlignVertical: 'top', padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(147,164,195,0.18)', backgroundColor: 'rgba(7,9,15,0.55)' },
  privateNote: { color: colors.success, fontSize: 8, fontWeight: '800', letterSpacing: 0.7, lineHeight: 14, marginTop: spacing.md },
});
