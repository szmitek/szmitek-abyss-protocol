import { prepareArcReview } from '../../domain/arcProgressReview.ts';
import { Coverage, EvidenceDetail } from '../components/ReviewEvidencePanels.tsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { reviewProvider } from '../../data/reviewProvider.ts';
import { reviewEvidence } from '../../domain/reviewEvidence.ts';
import { MOCK_REVIEW_LABEL, reviewRevision, runWeeklyReview, type ReviewRunResult } from '../../domain/reviewSession.ts';
import { useAppStore } from '../../state/AppStore.tsx';
import { Screen } from '../components/Screen.tsx';
import { GlowButton } from '../components/GlowButton.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, spacing } from '../theme.ts';

export function ArcProgressReviewScreen({ onBack }: { onBack: () => void }) {
  const { snapshot, calendarDay } = useAppStore();
  const arcs = [...(snapshot.profile?.trainingArcs ?? [])].sort((a, b) => b.cycleNumber - a.cycleNumber);
  const [chosenArc, setChosenArc] = useState<string | null>(null);
  const selectedArc = arcs.find(a => a.id === chosenArc) ?? arcs[0];
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const bundle = useMemo(() => {
    try {
      const input = prepareArcReview(snapshot, selectedArc?.id ?? '', calendarDay, timeZone);
      return { input, evidence: reviewEvidence(input), revision: reviewRevision(input) };
    } catch { return null; }
  }, [snapshot, selectedArc?.id, calendarDay, timeZone]);
  const revision = bundle?.revision ?? '';
  const [result, setResult] = useState<{ revision: string; value: ReviewRunResult } | null>(null);
  const [busyRevision, setBusyRevision] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [factLimit, setFactLimit] = useState(12);
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
  const current = result?.revision === revision ? result.value : null;
  const busy = busyRevision === revision && controller.current?.signal.aborted === false;
  const selected = selectedEvidence ? bundle?.evidence.get(selectedEvidence) : undefined;
  const facts = bundle?.input.facts ?? [];
  if (selected && bundle) return <Screen eyebrow="LOCAL SOURCE EVIDENCE" title="Review evidence" subtitle={MOCK_REVIEW_LABEL}>
    <EvidenceDetail key={selected.id} evidence={selected} registry={bundle.evidence} onSelect={setSelectedEvidence} onClose={() => setSelectedEvidence(null)} />
  </Screen>;
  return <Screen eyebrow="LOCAL REVIEW" title="Arc Review" subtitle="Recorded evidence, calculated on this device.">
    <GlowButton label="BACK TO PROGRESS" variant="secondary" onPress={onBack} />
    <SystemPanel eyebrow="OFFLINE PREVIEW" title="Development mock" accent="purple">
      <Text style={styles.notice}>{MOCK_REVIEW_LABEL}</Text>
      <Text style={styles.text}>No AI model, uploads, photo analysis or plan changes. Run the mock to preview the report format. The result stays on this screen; leaving or restarting clears it. Your original records remain saved.</Text>
    </SystemPanel>
    <SystemPanel eyebrow="FOUR-WEEK TRAINING CYCLES" title="Choose an arc">
      {arcs.length === 0 ? <Text style={styles.text}>Complete your baseline movement checks to start the first arc. Training does not require an AI report.</Text> : arcs.map(arc => <GlowButton key={arc.id} label={`ARC ${arc.cycleNumber} · ${arc.startDateKey}${selectedArc?.id === arc.id ? ' · SELECTED' : ''}`} variant="secondary" onPress={() => { setChosenArc(arc.id); setSelectedEvidence(null); setFactLimit(12); }} />)}
    </SystemPanel>
    {!bundle ? <Text accessibilityRole="alert" style={styles.notice}>No review available for this arc. A missing or inconsistent boundary record prevents a report; your training remains available.</Text> : <>
      <Coverage input={bundle.input} />
      <SystemPanel eyebrow="ARC SCOPE" title={`${bundle.input.period.from} – ${bundle.input.period.to}`}>
        <Text style={styles.text}>{timeZone} · {bundle.input.arcContext!.state.replaceAll('_', ' ')}. Nominal end: {bundle.input.arcContext!.nominalEnd}. An ongoing arc is a partial preview, not a completed-cycle assessment.</Text>
        <Text style={styles.text}>Current goal: {bundle.input.arcContext!.profileContext.goal}. Current session duration: {bundle.input.arcContext!.profileContext.workoutDuration} minutes. These settings may differ from the original arc.</Text>
        <Text style={styles.text}>Cycle-start frequency: {bundle.input.arcContext!.plannedFrequency ? `${bundle.input.arcContext!.plannedFrequency.workoutsPerWeek}/week (${bundle.input.arcContext!.plannedFrequency.source})` : 'Unknown'}. This is not a retained attendance schedule.</Text>
        {bundle.input.arcContext!.limitations.map(text => <Text key={text} style={styles.text}>{text}</Text>)}
      </SystemPanel>
      <SystemPanel eyebrow="BOUNDARY CHECKS" title="Baseline & completion">
        {[bundle.input.arcContext!.checkpoints.baseline, bundle.input.arcContext!.checkpoints.completion].map((check, index) => check ? <GlowButton key={`${index}:${check.id}`} label={`${index === 0 ? 'BASELINE' : 'COMPLETION'} · ${check.dateKey}`} variant="secondary" onPress={() => setSelectedEvidence(check.id)} /> : <Text key={index} style={styles.text}>{index === 0 ? 'Baseline' : 'Completion'} check unavailable. No change in movement can be inferred from a missing check.</Text>)}
        <Text style={styles.text}>These boundary checks may be outside the training window. They remain subjective self-reports.</Text>
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
        <Text style={styles.text}>Proposed changes: none. The mock does not choose priorities or prescribe exercises. Accept/Reject will become available only after proposal validation is implemented. Your existing local arc directive is unchanged.</Text>
      </SystemPanel> : null}
      <SystemPanel eyebrow="ARC APP FACTS" title="Facts & source records">
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
        {!bundle.input.wellbeing.length && !bundle.input.tests.records.length ? <Text style={styles.text}>No wellbeing or movement records in this arc.</Text> : null}
      </SystemPanel>
    </>}
  </Screen>;
}

const styles = StyleSheet.create({ text: { color: colors.text, lineHeight: 21, marginBottom: spacing.md }, notice: { color: colors.warning, lineHeight: 22, fontWeight: '700', marginBottom: spacing.md }, entry: { gap: spacing.sm, marginBottom: spacing.lg } });
