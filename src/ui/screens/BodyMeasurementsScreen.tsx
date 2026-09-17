import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { BODY_METRICS, bodyMeasurementStats, createBodyMeasurement, sortBodyMeasurements, type BodyMetric, type BodyValues } from '../../domain/bodyMeasurements.ts';
import { toDateKey } from '../../domain/date.ts';
import { useAppStore } from '../../state/AppStore.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { GlowButton } from '../components/GlowButton.tsx';
import { colors, spacing } from '../theme.ts';

const LABELS: Record<BodyMetric, string> = { weight: 'Body weight', waist: 'Waist', hips: 'Hips', chest: 'Chest', upperArm: 'Upper arm', thigh: 'Thigh', calf: 'Calf' };
const EMPTY = Object.fromEntries(BODY_METRICS.map((key) => [key, ''])) as Record<BodyMetric, string>;

export function BodyMeasurementsScreen({ onBack }: { onBack: () => void }) {
  const { snapshot, saveBodyMeasurement, saving, saveError, restoring } = useAppStore();
  const records = snapshot.profile!.bodyMeasurements;
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [values, setValues] = useState({ ...EMPTY });
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [limit, setLimit] = useState(10);
  const sorted = useMemo(() => sortBodyMeasurements(records).reverse(), [records]);
  const stats = useMemo(() => bodyMeasurementStats(records), [records]);
  const save = () => {
    try {
      const parsed = Object.fromEntries(BODY_METRICS.map((key) => {
        const raw = values[key].trim().replace(',', '.');
        if (raw && !/^\d+(\.\d+)?$/.test(raw)) throw new Error(`Enter a valid number for ${LABELS[key].toLowerCase()}.`);
        return [key, raw ? Number(raw) : null];
      })) as BodyValues;
      const now = new Date();
      let id = `body-${now.getTime()}`;
      while (records.some((m) => m.id === id)) id += '-next';
      saveBodyMeasurement(createBodyMeasurement(id, date.trim(), parsed, now));
      setValues({ ...EMPTY }); setMessage('Measurement added. Check saving status before closing the app.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to add measurement.'); }
  };
  return <Screen eyebrow="LOCAL BODY LOG" title="Body measurements" subtitle="Optional records. Training works without them.">
    <GlowButton label="BACK TO PROGRESS" variant="secondary" onPress={onBack} />
    <SystemPanel eyebrow="LATEST AVAILABLE" title="Weight & waist">
      {(['weight', 'waist'] as const).map((key) => <Text key={key} style={styles.text}>{LABELS[key]}: {stats.metrics[key].latest ? `${stats.metrics[key].latest!.value} ${stats.metrics[key].unit} · ${stats.metrics[key].latest!.date}` : 'Not recorded'}</Text>)}
    </SystemPanel>
    <SystemPanel eyebrow="NEW RECORD" title="Add a measurement">
      <Text style={styles.text}>Use similar morning conditions and the same scale. Measure the waist midway between the lowest rib and top of the hip bone, after a relaxed exhale, without tightening the tape. Keep tape position consistent. Record one reading per field; repeated readings and corrections will have dedicated support later.</Text>
      <Text style={styles.text}>Measurement date (YYYY-MM-DD)</Text>
      <TextInput accessibilityLabel="Measurement date YYYY-MM-DD" value={date} onChangeText={setDate} autoCapitalize="none" style={styles.input} maxLength={10} />
      {BODY_METRICS.filter((key) => optionalOpen || key === 'weight' || key === 'waist').map((key) => <View key={key}>
        <Text style={styles.text}>{LABELS[key]} ({key === 'weight' ? 'kg' : 'cm'}) · optional</Text>
        <TextInput accessibilityLabel={`${LABELS[key]} in ${key === 'weight' ? 'kilograms' : 'centimetres'}`} keyboardType="decimal-pad" value={values[key]} onChangeText={(value) => setValues((current) => ({ ...current, [key]: value }))} style={styles.input} maxLength={10} placeholder="Not measured" placeholderTextColor={colors.textDim} />
      </View>)}
      <GlowButton label={optionalOpen ? 'HIDE OPTIONAL CIRCUMFERENCES' : 'OTHER CIRCUMFERENCES'} variant="secondary" onPress={() => setOptionalOpen((v) => !v)} />
      {optionalOpen ? <Text style={styles.text}>Hips: widest point. Chest: same tape level and relaxed breath. Arm, thigh and calf: right side, relaxed, same marked position each time. Use the same conditions for every comparison.</Text> : null}
      <Text style={styles.text}>Leave missing values blank. Enter at least one value. These records do not estimate body fat or muscle mass.</Text>
      <GlowButton label="ADD MEASUREMENT" onPress={save} disabled={saving || restoring} />
      {message ? <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text> : null}
      {saveError ? <Text accessibilityRole="alert" style={styles.text}>{saveError}</Text> : <Text style={styles.text}>{saving ? 'Saving locally…' : 'Local storage ready.'}</Text>}
    </SystemPanel>
    <SystemPanel eyebrow={`${records.length} RECORDS`} title="Measurement history">
      {sorted.length === 0 ? <Text style={styles.text}>No measurements yet.</Text> : sorted.slice(0, limit).map((m) => <View key={m.id} style={styles.row}>
        <Text style={styles.text}>{m.measuredOn}</Text>
        <Text style={styles.text}>{BODY_METRICS.filter((key) => m.values[key] !== null).map((key) => `${LABELS[key]} ${m.values[key]} ${key === 'weight' ? 'kg' : 'cm'}`).join(' · ')}</Text>
      </View>)}
      {sorted.length > limit ? <GlowButton label="OLDER MEASUREMENTS" variant="secondary" onPress={() => setLimit((v) => v + 10)} /> : null}
    </SystemPanel>
  </Screen>;
}
const styles = StyleSheet.create({ text: { color: colors.text, marginBottom: spacing.sm, lineHeight: 21 }, input: { color: colors.text, borderColor: colors.textDim, borderWidth: 1, borderRadius: 8, padding: spacing.md, minHeight: 48, marginBottom: spacing.md }, row: { marginBottom: spacing.md } });
