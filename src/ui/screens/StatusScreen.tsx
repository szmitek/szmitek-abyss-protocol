import { StyleSheet, Text, View } from 'react-native';

import { attributeProgress, levelProgress } from '../../domain/progression.ts';
import { hasMovementPain, latestMovementAssessment, limitedMovementChecks } from '../../domain/calibration.ts';
import { compareAssessments, getTrainingArcState } from '../../domain/trainingArc.ts';
import { toDateKey } from '../../domain/date.ts';
import { latestReadiness } from '../../domain/readiness.ts';
import { CORRECTIVE_GOAL_DETAILS, primaryCorrectiveTarget } from '../../domain/correctiveProfile.ts';
import type { StatKey, UserProfile } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

const STATS: { key: StatKey; code: string; label: string }[] = [
  { key: 'strength', code: 'STR', label: 'Strength' },
  { key: 'endurance', code: 'END', label: 'Endurance' },
  { key: 'agility', code: 'AGI', label: 'Agility' },
  { key: 'vitality', code: 'VIT', label: 'Vitality' },
  { key: 'mobility', code: 'MOB', label: 'Mobility' },
];

export function StatusScreen({ profile, onEditProfile, onOpenSystemScan, onOpenMovementCalibration, onOpenCorrectiveProfile, onOpenPostureArchive, onRestoreExercises }: { profile: UserProfile; onEditProfile: () => void; onOpenSystemScan: () => void; onOpenMovementCalibration: () => void; onOpenCorrectiveProfile: () => void; onOpenPostureArchive: () => void; onRestoreExercises: () => void }) {
  const xp = levelProgress(profile);
  const totalStats = STATS.reduce((sum, stat) => sum + profile[stat.key], 0);
  const movementAssessment = latestMovementAssessment(profile);
  const movementPain = hasMovementPain(profile);
  const limitedChecks = limitedMovementChecks(profile);
  const arcState = getTrainingArcState(profile.trainingArcs, toDateKey(new Date()));
  const readiness = latestReadiness(profile);
  const correctiveTarget = primaryCorrectiveTarget(profile);
  const comparison = profile.movementAssessments[0] && profile.movementAssessments[1]
    ? compareAssessments(profile.movementAssessments[0], profile.movementAssessments[1])
    : null;
  return (
    <Screen eyebrow="CHARACTER DATA" title="Status" subtitle="Parameters reflect completed work. No points are assigned arbitrarily.">
      <SystemPanel accent="purple">
        <View style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.avatarRune}>◇</Text></View>
          <View style={styles.identityCopy}><Text style={styles.designation}>SYSTEM PLAYER</Text><Text style={styles.level}>LEVEL {profile.level}</Text><Text style={styles.total}>TOTAL ATTRIBUTE POWER {totalStats}</Text></View>
          <View style={styles.rank}><Text style={styles.rankLabel}>RANK</Text><Text style={styles.rankValue}>{profile.rank}</Text></View>
        </View>
        <View style={styles.xpRow}><Text style={styles.xpLabel}>LEVEL PROGRESS</Text><Text style={styles.xpValue}>{xp.current} / {xp.required} XP</Text></View>
        <ProgressBar progress={xp.ratio} />
      </SystemPanel>

      <SystemPanel eyebrow="ATTRIBUTES" title="System parameters">
        <View style={styles.attributeList}>
          {STATS.map(({ key, code, label }) => (
            <View key={key} style={styles.attribute}>
              <View style={styles.codeBox}><Text style={styles.code}>{code}</Text></View>
              <View style={styles.attributeCopy}><View style={styles.attributeHeader}><Text style={styles.attributeLabel}>{label}</Text><Text style={styles.attributeXp}>{attributeProgress(profile, key).current} / {attributeProgress(profile, key).required} AP</Text></View><ProgressBar progress={attributeProgress(profile, key).ratio} /></View>
              <Text style={styles.attributeValue}>{Math.floor(profile[key])}</Text>
            </View>
          ))}
        </View>
      </SystemPanel>

      <View style={styles.metricGrid}>
        <Metric value={profile.totalWorkouts} label="QUESTS CLEARED" />
        <Metric value={profile.streak} label="CURRENT STREAK" />
        <Metric value={profile.longestStreak} label="LONGEST STREAK" />
        <Metric value={profile.rankTrialCompleted.length} label="TRIALS SURVIVED" />
      </View>

      <SystemPanel eyebrow="DAILY READINESS" title={readiness ? `${readiness.band.toUpperCase()} SIGNAL` : 'No daily signal recorded'} accent={readiness?.band === 'hold' ? 'danger' : readiness?.band === 'recovery' ? 'purple' : 'blue'} {...(readiness ? { trailing: <Text style={styles.arcPhase}>{readiness.dateKey}</Text> } : {})}>
        {readiness ? (
          <View style={styles.scanMeta}>
            <ReadinessMetric value={readiness.energy} label="ENERGY" />
            <ReadinessMetric value={readiness.sleep} label="SLEEP" />
            <ReadinessMetric value={readiness.soreness} label="SORENESS" danger={readiness.band === 'hold'} />
          </View>
        ) : null}
        <Text style={styles.settingsCopy}>{readiness ? readiness.band === 'normal' ? 'The planned load was preserved; readiness never raises it above progression rules.' : readiness.band === 'reduced' ? 'Working volume and progression were reduced for this session.' : readiness.band === 'recovery' ? 'The training day was replaced with protected recovery.' : 'A warning signal sealed unsupervised training for that day.' : 'A signal will be requested before the next scheduled training protocol.'}</Text>
      </SystemPanel>

      <SystemPanel eyebrow="TRAINING ARC" title={arcState ? `Cycle ${arcState.cycleNumber} · Week ${arcState.week} / 4` : 'Awaiting movement baseline'} accent="purple" {...(arcState ? { trailing: <Text style={styles.arcPhase}>{arcState.reassessmentDue ? 'RE-SCAN' : arcState.phase.toUpperCase()}</Text> } : {})}>
        {arcState ? <ProgressBar progress={arcState.progress} /> : null}
        <Text style={[styles.settingsCopy, arcState && styles.arcCopy]}>{arcState ? arcState.reassessmentDue ? 'The four-week cycle is complete. Re-scan to archive the result and open the next cycle.' : `${arcState.daysRemaining} days remain before the next required Movement Analysis.` : 'Complete Player Calibration to activate phased workload instead of isolated daily sessions.'}</Text>
        {arcState?.reassessmentDue ? <GlowButton label="BEGIN PLAYER RE-SCAN" variant="secondary" onPress={onOpenMovementCalibration} style={styles.settingsButton} /> : null}
      </SystemPanel>

      <SystemPanel eyebrow="PLAYER SCAN" title={profile.healthProfile.scanCompleted ? 'Biometric parameters linked' : 'Calibration incomplete'} accent={profile.healthProfile.safetySignals.length > 0 ? 'danger' : 'purple'}>
        <View style={styles.scanMeta}>
          <ScanMetric value={profile.healthProfile.painAreas.length} label="PAIN SIGNALS" />
          <ScanMetric value={profile.healthProfile.posturePriorities.length} label="POSTURE TARGETS" />
          <ScanMetric value={profile.healthProfile.safetySignals.length} label="SAFETY HOLDS" danger={profile.healthProfile.safetySignals.length > 0} />
        </View>
        <Text style={styles.settingsCopy}>{profile.healthProfile.safetySignals.length > 0 ? 'Training is sealed until unresolved warning signals are reviewed.' : 'The generator uses these signals as hard safety filters and calibration priorities.'}</Text>
        <GlowButton label={profile.healthProfile.scanCompleted ? 'RECALIBRATE PLAYER SCAN' : 'START PLAYER SCAN'} variant="secondary" onPress={onOpenSystemScan} style={styles.settingsButton} />
      </SystemPanel>

      <SystemPanel eyebrow="MOVEMENT ANALYSIS" title={movementAssessment ? 'Movement baseline linked' : 'Baseline incomplete'} accent={movementPain ? 'danger' : 'purple'}>
        <View style={styles.scanMeta}>
          <ScanMetric value={movementAssessment ? 5 : 0} label="CHECKS LOGGED" />
          <ScanMetric value={limitedChecks.length} label="LIMITED" />
          <ScanMetric value={movementPain ? 1 : 0} label="PAIN HOLD" danger={movementPain} />
        </View>
        <Text style={styles.settingsCopy}>{movementPain ? 'A pain response seals unsupervised training. It is a safety signal, not a diagnosis.' : limitedChecks.length > 0 ? 'The generator caps conflicting movements and inserts foundation work for limited checks.' : movementAssessment ? 'Current baseline allows normal progression within recovery and workload limits.' : 'Five submaximal checks give the System a safer starting point than experience level alone.'}</Text>
        {comparison ? <Text style={styles.comparison}>LAST RE-SCAN // {comparison.improved} IMPROVED · {comparison.unchanged} STABLE · {comparison.declined} DECLINED</Text> : null}
        <GlowButton label={movementAssessment ? 'RECALIBRATE MOVEMENT' : 'START MOVEMENT ANALYSIS'} variant="secondary" onPress={onOpenMovementCalibration} style={styles.settingsButton} />
      </SystemPanel>

      <SystemPanel eyebrow="CORRECTIVE PROFILE" title={profile.correctiveProfile.configured ? correctiveTarget ? CORRECTIVE_GOAL_DETAILS[correctiveTarget.goal].label : 'General training profile' : 'Directive not confirmed'} accent="purple">
        {profile.correctiveProfile.targets.length > 0 ? (
          <View style={styles.correctiveTargets}>
            {profile.correctiveProfile.targets.map((target) => (
              <View key={target.goal} style={[styles.correctiveTarget, target.priority === 'primary' && styles.correctivePrimary]}>
                <Text style={[styles.correctiveTargetText, target.priority === 'primary' && styles.correctivePrimaryText]}>{target.priority === 'primary' ? '◆ ' : '◇ '}{CORRECTIVE_GOAL_DETAILS[target.goal].label.toUpperCase()}</Text>
                <Text style={styles.correctiveEvidence}>{target.sources.length} SIGNAL{target.sources.length === 1 ? '' : 'S'}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={styles.settingsCopy}>{profile.correctiveProfile.configured ? correctiveTarget ? 'The generator reserves compatible corrective work and explains its selections inside Quest Info.' : 'Corrective bias is disabled; all hard safety and movement constraints remain active.' : 'Confirm suggested priorities from Player Scan and Movement Analysis or choose a general profile.'}</Text>
        <GlowButton label={profile.correctiveProfile.configured ? 'EDIT CORRECTIVE PROFILE' : 'CREATE CORRECTIVE PROFILE'} variant="secondary" onPress={onOpenCorrectiveProfile} style={styles.settingsButton} />
      </SystemPanel>

      <SystemPanel eyebrow="POSTURE ARCHIVE" title={profile.postureScans.length > 0 ? `${profile.postureScans.length} visual checkpoint${profile.postureScans.length === 1 ? '' : 's'}` : 'Visual baseline missing'} accent="purple">
        <View style={styles.scanMeta}>
          <ScanMetric value={profile.postureScans.length} label="RECORDS" />
          <ScanMetric value={profile.postureScans.length * 3} label="LOCAL PHOTOS" />
          <ScanMetric value={profile.postureScans.length > 1 ? 1 : 0} label="COMPARE READY" />
        </View>
        <Text style={styles.settingsCopy}>{profile.postureScans.length > 1 ? 'Compare consistent front, side and back checkpoints without automatic diagnosis.' : 'Record three repeatable views now, then compare them after a Training Arc.'}</Text>
        <GlowButton label={profile.postureScans.length > 0 ? 'OPEN POSTURE ARCHIVE' : 'CREATE VISUAL BASELINE'} variant="secondary" onPress={onOpenPostureArchive} style={styles.settingsButton} />
      </SystemPanel>

      <SystemPanel eyebrow="PROTOCOL SETTINGS" title="System calibration">
        <Text style={styles.settingsCopy}>Update your objective, training level, mission duration, weekly rhythm, or registered equipment without resetting progress.</Text>
        <GlowButton label="EDIT PROTOCOL" variant="secondary" onPress={onEditProfile} style={styles.settingsButton} />
        {profile.excludedExercises.length > 0 ? (
          <GlowButton label={`RESTORE ${profile.excludedExercises.length} EXCLUDED`} variant="secondary" onPress={onRestoreExercises} style={styles.restoreButton} />
        ) : null}
      </SystemPanel>
    </Screen>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function ScanMetric({ value, label, danger = false }: { value: number; label: string; danger?: boolean }) {
  return <View style={styles.scanMetric}><Text style={[styles.scanValue, danger && styles.scanDanger]}>{value}</Text><Text style={styles.scanLabel}>{label}</Text></View>;
}

function ReadinessMetric({ value, label, danger = false }: { value: string; label: string; danger?: boolean }) {
  return <View style={styles.scanMetric}><Text style={[styles.readinessValue, danger && styles.scanDanger]}>{value.toUpperCase()}</Text><Text style={styles.scanLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(106,92,255,0.7)', backgroundColor: 'rgba(106,92,255,0.12)' },
  avatarRune: { color: colors.purple, fontSize: 40, textShadowColor: colors.purple, textShadowRadius: 15 },
  identityCopy: { flex: 1, marginLeft: spacing.lg },
  designation: { color: colors.purple, fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  level: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 5 },
  total: { color: colors.textMuted, fontSize: 9, fontWeight: '700', marginTop: 5 },
  rank: { alignItems: 'center' },
  rankLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '800', letterSpacing: 1.2 },
  rankValue: { color: colors.primary, fontSize: 36, fontWeight: '900' },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  xpLabel: { color: colors.textDim, fontSize: 8, fontWeight: '800', letterSpacing: 1.2 },
  xpValue: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  attributeList: { gap: spacing.lg },
  attribute: { flexDirection: 'row', alignItems: 'center' },
  codeBox: { width: 42, height: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(41,182,255,0.08)', borderWidth: 1, borderColor: colors.line },
  code: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  attributeCopy: { flex: 1, marginHorizontal: spacing.md, gap: 7 },
  attributeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  attributeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  attributeXp: { color: colors.textDim, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  attributeValue: { color: colors.text, fontSize: 23, fontWeight: '900', width: 38, textAlign: 'right' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '47%', minHeight: 104, padding: spacing.lg, justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(147,164,195,0.14)', backgroundColor: 'rgba(14,19,32,0.72)' },
  metricValue: { color: colors.text, fontSize: 27, fontWeight: '900' },
  metricLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginTop: spacing.sm },
  settingsCopy: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  scanMeta: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  scanMetric: { flex: 1, minHeight: 68, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(147,164,195,0.12)', backgroundColor: 'rgba(7,9,15,0.35)' },
  scanValue: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  readinessValue: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  scanDanger: { color: colors.danger },
  scanLabel: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 0.7, marginTop: 3, textAlign: 'center' },
  settingsButton: { marginTop: spacing.lg },
  restoreButton: { marginTop: spacing.sm },
  arcPhase: { color: colors.purple, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  arcCopy: { marginTop: spacing.md },
  comparison: { color: colors.success, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, lineHeight: 14, marginTop: spacing.md },
  correctiveTargets: { gap: spacing.sm, marginBottom: spacing.md },
  correctiveTarget: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(147,164,195,0.14)', backgroundColor: 'rgba(7,9,15,0.35)' },
  correctivePrimary: { borderColor: 'rgba(106,92,255,0.58)', backgroundColor: 'rgba(106,92,255,0.08)' },
  correctiveTargetText: { flex: 1, color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  correctivePrimaryText: { color: colors.purple },
  correctiveEvidence: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
});
