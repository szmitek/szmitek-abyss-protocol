import { useEffect, useState } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { buildLongitudinalEvidence, evidenceAssessments } from '../../domain/longitudinalEvidence.ts';
import { evidenceNotes, scanPhotos } from '../../domain/postureArchive.ts';
import type { MovementAssessment, PosturePhoto, PostureScan, UserProfile, WorkoutHistoryEntry } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, spacing } from '../theme.ts';

function testLabel(assessment: MovementAssessment) {
  return `${assessment.dateKey} · ${new Date(assessment.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · ${assessment.kind}`;
}

export function EvidenceScreen({ profile, history, onBack }: { profile: UserProfile; history: WorkoutHistoryEntry[]; onBack: () => void }) {
  const now = new Date();
  const assessments = evidenceAssessments(profile, now);
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState<'before' | 'after' | null>(null);
  const [limit, setLimit] = useState(10);
  const selectedBefore = beforeId ?? assessments.at(-2)?.id ?? '';
  const selectedAfter = afterId ?? assessments.at(-1)?.id ?? '';
  const evidence = buildLongitudinalEvidence(profile, history, selectedBefore, selectedAfter, now);
  useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (choosing) setChoosing(null); else onBack();
      return true;
    });
    return () => back.remove();
  }, [choosing, onBack]);

  return <Screen eyebrow="PROGRESS // EVIDENCE" title="Your changes over time" subtitle="Compare your recorded checks, photos and training context. This view does not change your plan or rewards.">
    <GlowButton label="BACK TO PROGRESS" variant="secondary" onPress={onBack} />
    <SystemPanel eyebrow="COMPARISON PERIOD" title="Choose two movement checks">
      <Text style={styles.copy}>The latest two checks are selected initially. Choose any earlier and later check, including two on the same day. Times are displayed in this device's time zone; dates retain their recorded local day.</Text>
      {(['before', 'after'] as const).map((side) => {
        const assessment = assessments.find((item) => item.id === (side === 'before' ? selectedBefore : selectedAfter));
        return <Pressable key={side} accessibilityRole="button" accessibilityLabel={`Choose ${side} movement check`} onPress={() => { setChoosing(side); setLimit(10); }} style={styles.choice}>
          <Text style={styles.label}>{side.toUpperCase()}</Text><Text style={styles.copy}>{assessment ? testLabel(assessment) : 'No check selected'}</Text>
        </Pressable>;
      })}
      {choosing ? <View style={styles.stack}>
        <Text accessibilityRole="header" style={styles.label}>SELECT {choosing.toUpperCase()}</Text>
        {[...assessments].reverse().slice(0, limit).map((assessment) => <Pressable key={assessment.id} accessibilityRole="radio" accessibilityState={{ checked: assessment.id === (choosing === 'before' ? selectedBefore : selectedAfter) }} onPress={() => {
          if (choosing === 'before') setBeforeId(assessment.id); else setAfterId(assessment.id);
          setChoosing(null);
        }} style={styles.choice}><Text style={styles.copy}>{testLabel(assessment)}</Text></Pressable>)}
        {assessments.length > limit ? <GlowButton label="OLDER CHECKS" variant="secondary" onPress={() => setLimit((value) => value + 10)} /> : null}
        <GlowButton label="CLOSE SELECTION" variant="secondary" onPress={() => setChoosing(null)} />
      </View> : null}
      {assessments.length < 2 ? <Text style={styles.copy}>Complete two Movement Analysis checks to compare results. Photos are optional. Future-dated checks are excluded until their recorded time.</Text> : !evidence ? <Text accessibilityRole="alert" style={styles.copy}>Choose two different checks with BEFORE earlier than AFTER. A removed or future-dated check cannot be used.</Text> : null}
    </SystemPanel>
    {evidence ? <>
      <SystemPanel eyebrow="RECORDED MOVEMENT" title="Before → after">
        {evidence.movement.map((item) => <View key={item.check} style={styles.record}>
          <Text style={styles.label}>{item.check.replaceAll('-', ' ').toUpperCase()}</Text>
          <Text style={styles.copy}>{item.before.toUpperCase()} → {item.after.toUpperCase()} · {item.change.toUpperCase()}</Text>
        </View>)}
        <Text style={styles.note}>These are your reported clear / limited / pain ratings. A change does not measure strength or establish a medical conclusion.</Text>
      </SystemPanel>
      <SystemPanel eyebrow="LINKED VISUAL RECORDS" title="Photo evidence" accent="purple">
        <Text style={styles.copy}>Only photos explicitly linked to the selected tests are used. Similar dates alone do not establish a link. {evidence.photos.unlinked} unlinked record(s) in this period remain in Posture Archive.</Text>
        <PhotoEndpoint label="BEFORE" scan={evidence.photos.before} showImages={evidence.photos.views.length === 0} />
        <PhotoEndpoint label="AFTER" scan={evidence.photos.after} showImages={evidence.photos.views.length === 0} />
        {evidence.photos.views.map((view) => <View key={view} style={styles.record}>
          <Text style={styles.label}>{view.toUpperCase()} · MATCHING VIEW</Text>
          <View style={styles.pair}>
            <EvidenceImage key={`before-${evidence.photos.before!.id}-${view}`} photo={evidence.photos.before!.photos[view]!} label="BEFORE" />
            <EvidenceImage key={`after-${evidence.photos.after!.id}-${view}`} photo={evidence.photos.after!.photos[view]!} label="AFTER" />
          </View>
        </View>)}
        {evidence.photos.views.length === 0 ? <Text style={styles.copy}>A matched photo comparison is unavailable. Missing or removed photos do not mean there was no progress.</Text> : null}
        <Text style={styles.note}>Framing, lighting and clothing can differ even with a confirmed setup. Photos are not scored or analyzed. Legacy unspecified-side views cannot establish a left/right comparison.</Text>
      </SystemPanel>
      <SystemPanel eyebrow="CALENDAR CONTEXT" title={`${evidence.before.dateKey} → ${evidence.after.dateKey}`}>
        <Text style={styles.copy}>{evidence.days} calendar day(s), both endpoints included. Counts include the whole recorded days, including activity before or after the test time on those days. Future records are excluded.</Text>
        <Metric label="Completed training" value={`${evidence.training.sessions} sessions · ${evidence.training.activeDays} distinct days`} />
        <Metric label="Training duration" value={`${evidence.training.minutes} logged minutes`} />
        <Metric label="Work volume" value={`${evidence.training.workSets} sets · ${evidence.training.reps} reps · ${evidence.training.seconds} timed seconds`} />
        <Metric label="Warm-ups, separate" value={`${evidence.training.warmupSets} logged sets`} />
        <Metric label="Rank Trials, separate" value={`${evidence.training.trials} completed trials`} />
        <Metric label="Return mode" value={`${evidence.training.returnSessions} of the training sessions`} />
        {evidence.training.unknownUnitSets ? <Text style={styles.note}>{evidence.training.unknownUnitSets} sets have an unknown exercise unit and are excluded from rep/second totals.</Text> : null}
        <Text style={styles.note}>Trial volume is excluded above. Return work remains visible but does not count as evidence for progression. Recorded volume can include prescribed targets when actual performance was not logged.</Text>
      </SystemPanel>
      <SystemPanel eyebrow="RETAINED DAILY REPORTS" title="Readiness and wellbeing">
        <Metric label="Coverage" value={`${evidence.readiness.recordedDays} of ${evidence.days} days · ${evidence.readiness.missingDays} without retained reports`} />
        <Metric label="Readiness bands" value={`${evidence.readiness.normal} normal · ${evidence.readiness.reduced} reduced · ${evidence.readiness.recovery} recovery · ${evidence.readiness.hold} hold`} />
        <Metric label="Reported pain or warning" value={`${evidence.readiness.warnings} days`} />
        <Metric label="Reported low energy" value={`${evidence.readiness.lowEnergy} days`} />
        <Metric label="Reported poor sleep" value={`${evidence.readiness.poorSleep} days`} />
        <Metric label="Reported high soreness" value={`${evidence.readiness.highSoreness} days`} />
        <Text style={styles.note}>The app retains up to 90 daily reports. Missing days may be unrecorded or no longer retained; they are not symptom-free days. Signals overlap. Recovery/hold reports do not prove a scheduled rest day or a completed workout. Current health settings are not historical symptoms.</Text>
      </SystemPanel>
      <SystemPanel eyebrow="ORIGINAL CYCLE REPORT" title={evidence.report ? `Arc ${evidence.report.cycleNumber} · archived context` : 'No exact cycle report'} accent="purple">
        {evidence.report ? <>
          <Metric label="Original adherence" value={`${evidence.report.adherence.completedSessions} / ${evidence.report.adherence.scheduledSessions} sessions · ${Math.round(evidence.report.adherence.rate * 100)}%`} />
          <Text style={styles.copy}>Target source: {evidence.report.adherence.targetSource === 'cycle-start' ? 'frequency saved at cycle start' : 'legacy estimate; original frequency was unavailable'}. Current frequency does not rewrite this target.</Text>
          <Metric label="Archived readiness totals" value={`${evidence.report.readiness.normal} normal · ${evidence.report.readiness.reduced} reduced · ${evidence.report.readiness.recovery} recovery · ${evidence.report.readiness.hold} hold`} />
          <Text style={styles.note}>Report saved on {evidence.report.dateKey} for these exact baseline/final checks. Its original aggregates remain separate from the retained daily reports above and can differ. Original decision: {evidence.report.decision.toUpperCase()}. Viewing this does not reapply it.</Text>
        </> : <Text style={styles.copy}>This pair has no archived cycle report. Completed sessions are shown above, but an adherence percentage would require a recorded target for this exact period. Today's training frequency is not used to invent one.</Text>}
      </SystemPanel>
    </> : null}
  </Screen>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.record}><Text style={styles.label}>{label.toUpperCase()}</Text><Text style={styles.copy}>{value}</Text></View>;
}

function PhotoEndpoint({ label, scan, showImages }: { label: string; scan: PostureScan | null; showImages: boolean }) {
  return <View style={styles.record}>
    <Text style={styles.label}>{label} CHECKPOINT</Text>
    {scan ? <>
      <Text style={styles.copy}>Record saved {new Date(scan.date).toLocaleString('en-GB')}.</Text>
      {evidenceNotes(scan).map((note) => <Text key={note} style={styles.note}>{note}</Text>)}
      {showImages ? scanPhotos(scan).map((photo) => <EvidenceImage key={`${scan.id}-${photo.view}`} photo={photo} label={`${label} · ${photo.view.toUpperCase()}`} />) : null}
      <Text style={styles.note}>Views available: {scanPhotos(scan).map((photo) => photo.view.toUpperCase()).join(', ')}.</Text>
    </> : <Text style={styles.copy}>No linked record is available. It may never have been linked, may have been deleted, or may be absent from a data-only restore.</Text>}
  </View>;
}

function EvidenceImage({ photo, label }: { photo: PosturePhoto; label: string }) {
  const [failed, setFailed] = useState(false);
  return <View style={styles.imageColumn}>
    <Text style={styles.label}>{label}</Text>
    {failed ? <Text style={styles.copy}>Image file unavailable. The record remains saved; check your backup.</Text> : <Image accessibilityLabel={`${label} ${photo.view} photo`} source={{ uri: photo.uri }} resizeMode="contain" onError={() => setFailed(true)} style={styles.image} />}
    <Text style={styles.note}>{photo.originalCapturedAt ? `Approximate acquisition: ${new Date(photo.originalCapturedAt).toLocaleString('en-GB')}` : 'Original capture date unknown'}</Text>
  </View>;
}

const styles = StyleSheet.create({
  copy: { color: colors.textMuted, fontSize: 13, lineHeight: 21 },
  note: { color: colors.textMuted, fontSize: 11, lineHeight: 18, marginTop: spacing.sm },
  label: { color: colors.text, fontSize: 12, fontWeight: '800', lineHeight: 20 },
  choice: { borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 8, padding: spacing.md, minHeight: 52, marginTop: spacing.sm },
  record: { paddingVertical: spacing.md, gap: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.line },
  stack: { gap: spacing.sm, marginTop: spacing.md },
  pair: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  imageColumn: { flex: 1, minWidth: 0 },
  image: { width: '100%', aspectRatio: 0.65, backgroundColor: '#050812', marginTop: spacing.sm },
});
