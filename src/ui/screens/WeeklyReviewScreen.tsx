import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { reviewProvider } from '../../data/reviewProvider.ts';
import type { WeeklyReviewInput } from '../../domain/aiContracts.ts';
import { reviewEvidence, type ReviewEvidence } from '../../domain/reviewEvidence.ts';
import { latestCompletedReviewWeek, MOCK_REVIEW_LABEL, prepareWeeklyReview, reviewRevision, runWeeklyReview, shiftReviewDay, type ReviewRunResult } from '../../domain/reviewSession.ts';
import { useAppStore } from '../../state/AppStore.tsx';
import { Screen } from '../components/Screen.tsx';
import { GlowButton } from '../components/GlowButton.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, spacing } from '../theme.ts';

export function WeeklyReviewScreen({ onBack }: { onBack: () => void }) {
  const { snapshot, calendarDay } = useAppStore();
  const latestEnd = latestCompletedReviewWeek(calendarDay);
  const [chosenEnd, setChosenEnd] = useState(latestEnd);
  const end = chosenEnd > latestEnd ? latestEnd : chosenEnd;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const bundle = useMemo(() => {
    try {
      const input = prepareWeeklyReview(snapshot, end, timeZone);
      return { input, evidence: reviewEvidence(input), revision: reviewRevision(input) };
    } catch { return null; }
  }, [snapshot, end, timeZone]);
  const revision = bundle?.revision ?? '';
  const [result, setResult] = useState<{ revision: string; value: ReviewRunResult } | null>(null);
  const [busyRevision, setBusyRevision] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [factLimit, setFactLimit] = useState(12);
  const [contextOpen, setContextOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, [revision]);
  const generate = async () => {
    if (!bundle) return;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setBusyRevision(revision); setResult(null);
    const value = await runWeeklyReview(reviewProvider, bundle.input, request.signal);
    if (request.signal.aborted) return;
    setResult({ revision, value }); setBusyRevision(null);
  };
  const moveWeek = (days: number) => {
    controller.current?.abort(); setBusyRevision(null);
    setChosenEnd(shiftReviewDay(end, days)); setSelectedEvidence(null); setFactLimit(12);
  };
  const current = result?.revision === revision ? result.value : null;
  const busy = busyRevision === revision && controller.current?.signal.aborted === false;
  const selected = selectedEvidence ? bundle?.evidence.get(selectedEvidence) : undefined;
  const facts = bundle ? contextOpen ? bundle.input.historyContext!.facts : bundle.input.facts : [];
  if (selected && bundle) return <Screen eyebrow="LOCAL SOURCE EVIDENCE" title="Review evidence" subtitle={MOCK_REVIEW_LABEL}>
    <EvidenceDetail key={selected.id} evidence={selected} registry={bundle.evidence} onSelect={setSelectedEvidence} onClose={() => setSelectedEvidence(null)} />
  </Screen>;
  return <Screen eyebrow="LOCAL REVIEW" title="Weekly Review" subtitle="Recorded evidence, calculated on this device.">
    <GlowButton label="BACK TO PROGRESS" variant="secondary" onPress={onBack} />
    <SystemPanel eyebrow="OFFLINE PREVIEW" title="Development mock" accent="purple">
      <Text style={styles.notice}>{MOCK_REVIEW_LABEL}</Text>
      <Text style={styles.text}>No AI model, uploads, photo analysis or plan changes. Run the mock to preview the report format. The result stays on this screen; leaving or restarting clears it. Your original records remain saved.</Text>
    </SystemPanel>
    <SystemPanel eyebrow="COMPLETED MONDAY–SUNDAY WEEK" title={`${shiftReviewDay(end, -6)} – ${end}`}>
      <Text style={styles.text}>{timeZone} · Local calendar dates. The current incomplete week is excluded.</Text>
      <GlowButton label="PREVIOUS WEEK" variant="secondary" onPress={() => moveWeek(-7)} />
      <GlowButton label="NEXT WEEK" variant="secondary" disabled={end >= latestEnd} onPress={() => moveWeek(7)} />
    </SystemPanel>
    {!bundle ? <Text accessibilityRole="alert" style={styles.notice}>Local evidence could not be prepared. Return to Progress and check your records. No report was generated.</Text> : <>
      <Coverage input={bundle.input} />
      <SystemPanel eyebrow="HISTORY CONTEXT" title="Four weeks, separate scope">
        <Text style={styles.text}>{bundle.input.historyContext!.period.from} – {end} (includes the selected week). {bundle.input.historyContext!.adherence.completedTrainingSessions} recorded training sessions; wellbeing {bundle.input.historyContext!.dataCoverage.wellbeingDays}/28 days. Context is not an extra week or proof of a lasting trend.</Text>
        <GlowButton label={contextOpen ? 'SHOW SELECTED WEEK FACTS' : 'SHOW FOUR-WEEK FACTS'} variant="secondary" onPress={() => { setContextOpen((v) => !v); setFactLimit(12); setSelectedEvidence(null); }} />
      </SystemPanel>
      <GlowButton label={busy ? 'PREPARING LOCAL REVIEW' : 'RUN DEVELOPMENT MOCK'} disabled={busy} onPress={() => { void generate(); }} />
      {busy ? <GlowButton label="CANCEL REVIEW" variant="secondary" onPress={() => { controller.current?.abort(); setBusyRevision(null); }} /> : null}
      {result && result.revision !== revision ? <Text style={styles.notice}>Data or period changed. The previous result is no longer current. Run the mock again.</Text> : null}
      {current && !current.ok ? <Text accessibilityRole="alert" style={styles.notice}>{current.error.message} No report is displayed. You can retry.</Text> : null}
      {current?.ok ? <SystemPanel eyebrow="VALIDATED MOCK OUTPUT" title={current.data.status === 'insufficient_evidence' ? 'Insufficient evidence' : 'Preview ready'}>
        <Text style={styles.notice}>{MOCK_REVIEW_LABEL}</Text>
        <Text style={styles.text}>{current.data.summary}</Text>
        <Text style={styles.text}>FACT = recorded/calculated. OBSERVATION = pattern. HYPOTHESIS = possible explanation. RECOMMENDATION = proposed action. Format and references were checked; this is not a clinical assessment.</Text>
        {current.data.claims.length === 0 ? <Text style={styles.text}>No supported claims. Missing records do not mean good recovery or successful training.</Text> : current.data.claims.map((claim) => <View key={claim.id} style={styles.entry}>
          <Text style={styles.notice}>{claim.type} · {claim.topic}</Text>
          <Text style={styles.text}>{claim.text}</Text>
          <Text style={styles.text}>Confidence: {claim.confidence.level} — {claim.confidence.reason}</Text>
          <Text style={styles.text}>Limitations: {claim.limitations.length ? claim.limitations.join(' ') : 'None supplied; evidence may still be incomplete.'}</Text>
          {claim.alternatives.length ? <Text style={styles.text}>Alternatives: {claim.alternatives.join(' ')}</Text> : null}
          {claim.evidenceIds.map((id) => <GlowButton key={id} label={`EVIDENCE: ${bundle.evidence.get(id)!.title}`} variant="secondary" onPress={() => setSelectedEvidence(id)} />)}
        </View>)}
        {current.data.questions.map((question, index) => <Text key={index} style={styles.text}>Question: {question}</Text>)}
        <Text style={styles.text}>No training changes proposed or applied.</Text>
      </SystemPanel> : null}
      <SystemPanel eyebrow={contextOpen ? 'FOUR-WEEK APP FACTS' : 'SELECTED WEEK APP FACTS'} title="Facts & source records">
        <Text style={styles.text}>Unavailable values stay unavailable. A recorded zero is shown as zero. Numbers describe logs, not diagnoses or body composition.</Text>
        {facts.slice(0, factLimit).map((f) => <View key={f.id} style={styles.entry}>
          <Text style={styles.text}>{f.metric}: {f.value === null ? 'Unavailable' : `${Number(f.value.toFixed(3))} ${f.unit}`}</Text>
          <GlowButton label={`DETAILS: ${f.metric}`} variant="secondary" onPress={() => setSelectedEvidence(f.id)} />
        </View>)}
        {facts.length > factLimit ? <GlowButton label="MORE FACTS" variant="secondary" onPress={() => setFactLimit((v) => v + 12)} /> : null}
      </SystemPanel>
      <SystemPanel eyebrow="SELF-REPORTED RECORDS" title="Wellbeing & movement checks">
        <Text style={styles.text}>No entry means unknown. Sleep categories are not hours; movement ratings are not measured angles.</Text>
        {[...bundle.input.wellbeing, ...bundle.input.tests.records].map((r) => <GlowButton key={r.id} label={bundle.evidence.get(r.id)!.title} variant="secondary" onPress={() => setSelectedEvidence(r.id)} />)}
        {!bundle.input.wellbeing.length && !bundle.input.tests.records.length ? <Text style={styles.text}>No wellbeing or movement records in this week.</Text> : null}
      </SystemPanel>
    </>}
  </Screen>;
}

function Coverage({ input }: { input: WeeklyReviewInput }) {
  const c = input.dataCoverage;
  return <SystemPanel eyebrow="SELECTED WEEK" title="Data coverage">
    <Text style={styles.text}>Training: {input.adherence.completedTrainingSessions} recorded completions on {input.adherence.activeDays} days. No log is not proof that no activity occurred.</Text>
    <Text style={styles.text}>Adherence: unavailable. {input.adherence.reason}</Text>
    <Text style={styles.text}>Wellbeing: {c.wellbeingDays}/{c.calendarDays} days · {c.missingWellbeingDays} unknown days.</Text>
    <Text style={styles.text}>Body measurements: {input.body.statistics.recordCount} records on {c.measurementDays} days.</Text>
    {(['weight', 'waist'] as const).map((metric) => <Text key={metric} style={styles.text}>{metric === 'weight' ? 'Weight' : 'Waist'}: {input.body.statistics.metrics[metric].sampleCount} comparable readings · {input.body.statistics.metrics[metric].measuredDays} days · {input.body.statistics.metrics[metric].excludedProtocolCount} different-protocol readings excluded.</Text>)}
    <Text style={styles.text}>Actual set values missing: {c.missingActualSets}. Legacy prescriptions are not actual performance.</Text>
    <Text style={styles.text}>Movement tests: {input.tests.records.length} self-reported records. Photos: {input.photos.manifest.length} local checkpoints; images were not read or analysed.</Text>
  </SystemPanel>;
}
function EvidenceDetail({ evidence, registry, onSelect, onClose }: { evidence: ReviewEvidence; registry: Map<string, ReviewEvidence>; onSelect: (id: string) => void; onClose: () => void }) {
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
