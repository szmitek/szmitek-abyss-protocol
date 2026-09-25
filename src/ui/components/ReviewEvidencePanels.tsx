import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { WeeklyReviewInput } from '../../domain/aiContracts.ts';
import type { ReviewEvidence } from '../../domain/reviewEvidence.ts';
import { GlowButton } from './GlowButton.tsx';
import { SystemPanel } from './SystemPanel.tsx';
import { colors, spacing } from '../theme.ts';
export function Coverage({ input }: { input: WeeklyReviewInput }) {
  const c = input.dataCoverage;
  return <SystemPanel eyebrow="SELECTED PERIOD" title="Data coverage">
    <Text style={styles.text}>Training: {input.adherence.completedTrainingSessions} recorded completions on {input.adherence.activeDays} days. No log is not proof that no activity occurred.</Text>
    <Text style={styles.text}>Adherence: unavailable. {input.adherence.reason}</Text>
    <Text style={styles.text}>Wellbeing: {c.wellbeingDays}/{c.calendarDays} days · {c.missingWellbeingDays} unknown days.</Text>
    <Text style={styles.text}>Body measurements: {input.body.statistics.recordCount} records on {c.measurementDays} days.</Text>
    {(['weight', 'waist'] as const).map((metric) => <Text key={metric} style={styles.text}>{metric === 'weight' ? 'Weight' : 'Waist'}: {input.body.statistics.metrics[metric].sampleCount} comparable readings · {input.body.statistics.metrics[metric].measuredDays} days · {input.body.statistics.metrics[metric].excludedProtocolCount} different-protocol readings excluded.</Text>)}
    <Text style={styles.text}>Actual set values missing: {c.missingActualSets}. Legacy prescriptions are not actual performance.</Text>
    <Text style={styles.text}>Movement tests: {input.tests.records.length} self-reported records. Photos: {input.photos.manifest.length} local checkpoints; images were not read or analysed.</Text>
  </SystemPanel>;
}
export function EvidenceDetail({ evidence, registry, onSelect, onClose }: { evidence: ReviewEvidence; registry: Map<string, ReviewEvidence>; onSelect: (id: string) => void; onClose: () => void }) {
  const [limit, setLimit] = useState(20);
  return <SystemPanel eyebrow={`EVIDENCE · ${evidence.kind.toUpperCase()}`} title={evidence.title}>
    <Text style={styles.text}>{evidence.detail}</Text>
    <Text selectable style={styles.meta}>Evidence ID: {evidence.id}</Text>
    {evidence.sourceIds.slice(0, limit).map((id) => <GlowButton key={id} label={`SOURCE: ${registry.get(id)!.title}`} variant="secondary" onPress={() => onSelect(id)} />)}
    {evidence.sourceIds.length > limit ? <GlowButton label="MORE SOURCES" variant="secondary" onPress={() => setLimit((v) => v + 20)} /> : null}
    {!evidence.sourceIds.length ? <Text style={styles.text}>This is a recorded source, or an aggregate with no supporting records.</Text> : null}
    <GlowButton label="CLOSE EVIDENCE" variant="secondary" onPress={onClose} />
  </SystemPanel>;
}
const styles = StyleSheet.create({ text: { color: colors.text, lineHeight: 21, marginBottom: spacing.md }, notice: { color: colors.warning, lineHeight: 22, fontWeight: '700', marginBottom: spacing.md }, meta: { color: colors.textMuted, marginBottom: spacing.md }, entry: { gap: spacing.sm, marginBottom: spacing.lg } });
