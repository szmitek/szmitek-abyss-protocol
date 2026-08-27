import { StyleSheet, Text, View } from 'react-native';

import type { TrainingArcDecision, TrainingArcReview } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

const DECISION: Record<TrainingArcDecision, { label: string; title: string; copy: string }> = {
  advance: { label: 'ADVANCE', title: 'Controlled progression authorized', copy: 'The next Training Arc may progress after its calibration week.' },
  continue: { label: 'CONTINUE', title: 'Current path confirmed', copy: 'The next Training Arc will reinforce the current progression level.' },
  recalibrate: { label: 'RECALIBRATE', title: 'Directive review required', copy: 'Review the Corrective Profile before the next cycle settles.' },
  recovery: { label: 'RECOVERY ENTRY', title: 'Protected cycle entry', copy: 'Week one will use minimum difficulty and one work set per movement.' },
  hold: { label: 'SYSTEM HOLD', title: 'Unsupervised training sealed', copy: 'Resolve the registered pain or warning signal before training resumes.' },
};

export function ArcReviewScreen({ review, onContinue }: { review: TrainingArcReview; onContinue: () => void }) {
  const decision = DECISION[review.decision];
  const accent = review.decision === 'hold' ? 'danger' : ['recovery', 'recalibrate'].includes(review.decision) ? 'purple' : 'blue';
  const decisionColor = review.decision === 'hold' ? colors.danger : review.decision === 'advance' ? colors.success : review.decision === 'recovery' ? colors.warning : colors.primary;
  return (
    <Screen eyebrow={'SYSTEM // ARC ' + review.cycleNumber + ' REPORT'} title="Reassessment complete" subtitle="The next directive is based on execution, movement checks, difficulty and readiness — never on XP alone.">
      <SystemPanel eyebrow="SYSTEM VERDICT" title={decision.title} accent={accent} trailing={<Text style={[styles.verdict, { color: decisionColor }]}>{decision.label}</Text>}>
        <Text style={styles.copy}>{decision.copy}</Text>
      </SystemPanel>

      <View style={styles.metrics}>
        <Metric value={Math.round(review.adherence.rate * 100) + '%'} label="ADHERENCE" />
        <Metric value={'+' + review.movement.improved} label="IMPROVED" positive={review.movement.improved > 0} />
        <Metric value={'-' + review.movement.declined} label="DECLINED" danger={review.movement.declined > 0} />
      </View>

      <SystemPanel eyebrow="ARC SIGNALS" title="Evidence summary">
        <Signal label="CLEARED SESSIONS" value={review.adherence.completedSessions + ' / ' + review.adherence.scheduledSessions} />
        <Signal label="MOVEMENT" value={review.movement.improved + ' UP · ' + review.movement.unchanged + ' STABLE · ' + review.movement.declined + ' DOWN'} />
        <Signal label="SESSION LOAD" value={review.difficulty.perfect + ' MATCHED · ' + review.difficulty.tooHard + ' TOO HARD'} />
        <Signal label="READINESS" value={review.readiness.normal + ' NORMAL · ' + review.readiness.reduced + ' REDUCED · ' + (review.readiness.recovery + review.readiness.hold) + ' PROTECTED'} />
        <Signal label="VISUAL CHECKPOINTS" value={review.baselinePostureScanId && review.completionPostureScanId ? 'MANUAL COMPARISON READY' : 'SECOND CHECKPOINT UNAVAILABLE'} />
      </SystemPanel>

      <SystemPanel eyebrow="WHY THIS DIRECTIVE" title="System rationale" accent="purple">
        {review.reasons.map((reason, index) => <View key={reason} style={styles.reason}><Text style={styles.reasonIndex}>{String(index + 1).padStart(2, '0')}</Text><Text style={styles.reasonText}>{reason}</Text></View>)}
      </SystemPanel>

      <GlowButton label={review.decision === 'recalibrate' ? 'REVIEW CORRECTIVE PROFILE' : review.decision === 'hold' ? 'ACKNOWLEDGE HOLD' : 'ENTER NEXT TRAINING ARC'} variant={review.decision === 'hold' ? 'danger' : 'primary'} onPress={onContinue} />
      <Text style={styles.note}>POSTURE PHOTOS ARE PRIVATE REFERENCE MATERIAL. THE SYSTEM DOES NOT DIAGNOSE OR SCORE THEM.</Text>
    </Screen>
  );
}

function Metric({ value, label, positive = false, danger = false }: { value: string; label: string; positive?: boolean; danger?: boolean }) {
  return <View style={styles.metric}><Text style={[styles.metricValue, positive && styles.positive, danger && styles.danger]}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function Signal({ label, value }: { label: string; value: string }) {
  return <View style={styles.signal}><Text style={styles.signalLabel}>{label}</Text><Text style={styles.signalValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  verdict: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, textAlign: 'right' },
  copy: { color: colors.textMuted, fontSize: 12, lineHeight: 19 },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, minHeight: 82, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  metricValue: { color: colors.primary, fontSize: 21, fontWeight: '900' },
  metricLabel: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 5 },
  positive: { color: colors.success },
  danger: { color: colors.danger },
  signal: { minHeight: 47, borderTopWidth: 1, borderTopColor: 'rgba(147,164,195,0.1)', justifyContent: 'center' },
  signalLabel: { color: colors.textDim, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  signalValue: { color: colors.text, fontSize: 10, fontWeight: '800', marginTop: 4 },
  reason: { flexDirection: 'row', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(147,164,195,0.1)' },
  reasonIndex: { color: colors.purple, fontSize: 9, fontWeight: '900', width: 30 },
  reasonText: { flex: 1, color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  note: { color: colors.textDim, fontSize: 8, fontWeight: '800', letterSpacing: 0.8, lineHeight: 14, textAlign: 'center', paddingHorizontal: spacing.md },
});

