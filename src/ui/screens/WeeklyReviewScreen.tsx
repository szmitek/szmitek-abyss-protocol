import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { latestCompletedReviewWeek, prepareWeeklySummary, shiftReviewDay } from '../../domain/reviewSession.ts';
import { reviewEvidence } from '../../domain/reviewEvidence.ts';
import { useAppStore } from '../../state/AppStore.tsx';
import { Screen } from '../components/Screen.tsx';
import { GlowButton } from '../components/GlowButton.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { Coverage, EvidenceDetail } from '../components/ReviewEvidencePanels.tsx';
import { colors, spacing } from '../theme.ts';

// Historical component filename retained; this screen never invokes a provider.
export function WeeklyReviewScreen({ onBack }: { onBack: () => void }) {
  const { snapshot, calendarDay } = useAppStore();
  const latestEnd = latestCompletedReviewWeek(calendarDay);
  const [chosenEnd, setChosenEnd] = useState(latestEnd);
  const end = chosenEnd > latestEnd ? latestEnd : chosenEnd;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limit, setLimit] = useState(12);
  const bundle = useMemo(() => {
    try { const input = prepareWeeklySummary(snapshot, end, timeZone); return { input, evidence: reviewEvidence(input) }; }
    catch { return null; }
  }, [snapshot, end, timeZone]);
  const selected = selectedId ? bundle?.evidence.get(selectedId) : null;
  if (selected && bundle) return <Screen eyebrow="LOCAL SOURCE" title="Summary evidence" subtitle="Calculated on this device. No AI.">
    <EvidenceDetail key={selected.id} evidence={selected} registry={bundle.evidence} onSelect={setSelectedId} onClose={() => setSelectedId(null)} />
  </Screen>;
  const move = (days: number) => { setChosenEnd(shiftReviewDay(end, days)); setSelectedId(null); setLimit(12); };
  return <Screen eyebrow="OFFLINE · NO API COST" title="Weekly Summary" subtitle="Recorded results, without AI interpretation.">
    <GlowButton label="BACK TO PROGRESS" variant="secondary" onPress={onBack} />
    <SystemPanel eyebrow="COMPLETED MONDAY–SUNDAY WEEK" title={`${shiftReviewDay(end, -6)} – ${end}`}>
      <Text style={styles.text}>{timeZone}. The current incomplete week is excluded. No background AI or paid analysis runs here.</Text>
      <GlowButton label="PREVIOUS WEEK" variant="secondary" onPress={() => move(-7)} />
      <GlowButton label="NEXT WEEK" variant="secondary" disabled={end >= latestEnd} onPress={() => move(7)} />
    </SystemPanel>
    {!bundle ? <Text accessibilityRole="alert" style={styles.text}>Summary unavailable. Check your local records.</Text> : <>
      <Coverage input={bundle.input} />
      <SystemPanel eyebrow="BODY MEASUREMENTS" title="Weight & waist">
        {(['weight', 'waist'] as const).map(metric => { const m = bundle.input.body.statistics.metrics[metric]; return <View key={metric}>
          <Text style={styles.text}>{metric}: latest {m.latest ? `${m.latest.value} ${m.unit} (${m.latest.date})` : 'Unavailable'} · change from previous measured day {m.change === null ? 'Unavailable' : `${Number(m.change.toFixed(3))} ${m.unit}`} · mean {m.mean === null ? 'Unavailable' : `${Number(m.mean.toFixed(3))} ${m.unit}`}.</Text>
          <GlowButton label={`SOURCE: ${metric}`} variant="secondary" onPress={() => setSelectedId(`body:${metric}:latest`)} />
        </View>; })}
        <Text style={styles.text}>Only measurements inside this week. Missing values are not zeros. Daily means use comparable protocols; no body composition is estimated.</Text>
      </SystemPanel>
      <SystemPanel eyebrow="RECORDED WORK SETS" title="Performance & effort">
        {bundle.input.exerciseExposures.length === 0 ? <Text style={styles.text}>No recorded exercise exposures. Progress cannot be assessed.</Text> : bundle.input.exerciseExposures.slice(0, limit).map(e => <GlowButton key={e.id} label={`${e.dateKey} · ${e.exerciseId} · VIEW SETS & EFFORT`} variant="secondary" onPress={() => setSelectedId(e.id)} />)}
        {bundle.input.exerciseExposures.length > limit ? <GlowButton label="MORE EXERCISES" variant="secondary" onPress={() => setLimit(n => n + 12)} /> : null}
        {bundle.input.facts.filter(f => f.id.startsWith('exercise:')).slice(0, limit).map(f => <View key={f.id}>
          <Text style={styles.text}>{f.metric}: {f.value === null ? 'Unavailable' : `${Number(f.value.toFixed(3))} ${f.unit}`}</Text>
          <GlowButton label="VIEW CALCULATION & SOURCES" variant="secondary" onPress={() => setSelectedId(f.id)} />
        </View>)}
        {bundle.input.facts.filter(f => f.id.startsWith('exercise:')).length > limit ? <GlowButton label="MORE CALCULATIONS" variant="secondary" onPress={() => setLimit(n => n + 12)} /> : null}
        <Text style={styles.text}>Changes compare recorded exposures within the week and the same equipment group. Volume is not a strength or technique score.</Text>
      </SystemPanel>
      <SystemPanel eyebrow="SELF-REPORTS" title="Wellbeing & movement">
        {[...bundle.input.wellbeing, ...bundle.input.tests.records].map(r => <GlowButton key={r.id} label={bundle.evidence.get(r.id)!.title} variant="secondary" onPress={() => setSelectedId(r.id)} />)}
        {!bundle.input.wellbeing.length && !bundle.input.tests.records.length ? <Text style={styles.text}>No entries. Recovery and movement cannot be assessed.</Text> : null}
      </SystemPanel>
    </>}
  </Screen>;
}
const styles = StyleSheet.create({ text: { color: colors.text, lineHeight: 21, marginBottom: spacing.md } });
