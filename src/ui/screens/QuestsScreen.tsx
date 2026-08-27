import { StyleSheet, Text, View } from 'react-native';

import { rankTrialEligibility } from '../../domain/progression.ts';
import { nextScheduledTrainingDateKey } from '../../domain/schedule.ts';
import { planRequiresDailyReadiness, readinessForDate } from '../../domain/readiness.ts';
import type { AppSnapshot } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { WeeklyProtocolPanel } from '../components/WeeklyProtocolPanel.tsx';
import { colors, spacing } from '../theme.ts';

interface QuestsScreenProps {
  snapshot: AppSnapshot;
  onBeginDaily: () => void;
  onBeginRankTrial: () => void;
  onOpenReadiness: () => void;
  onOpenMovementCalibration: () => void;
}

export function QuestsScreen({ snapshot, onBeginDaily, onBeginRankTrial, onOpenReadiness, onOpenMovementCalibration }: QuestsScreenProps) {
  const profile = snapshot.profile!;
  const quest = snapshot.dailyQuest;
  const trial = rankTrialEligibility(profile);
  const recoveryDay = quest?.plan.kind === 'recovery';
  const safetyHold = quest?.plan.kind === 'safety-hold';
  const readiness = quest ? readinessForDate(profile, quest.dateKey) : null;
  const readinessRequired = Boolean(quest && planRequiresDailyReadiness(quest.plan) && !readiness);
  const readinessHold = quest?.plan.readinessBand === 'hold';
  const readinessRecovery = quest?.plan.readinessBand === 'recovery';
  const reassessmentDue = quest?.plan.kind === 'reassessment';
  const nextTraining = recoveryDay && quest ? nextScheduledTrainingDateKey(profile, quest.dateKey) : null;
  return (
    <Screen eyebrow="MISSION REGISTRY" title="Quests" subtitle="Clear today's protocol or prepare for ascension.">
      <SystemPanel eyebrow={readinessRequired ? 'DAILY READINESS REQUIRED' : safetyHold ? 'SYSTEM SAFEGUARD' : reassessmentDue ? 'TRAINING ARC COMPLETE' : recoveryDay ? readinessRecovery ? 'ADAPTIVE RECOVERY' : 'RECOVERY DAY' : 'DAILY QUEST'} title={readinessRequired ? 'Sync Player status' : quest?.plan.title ?? 'Scanning'} accent={safetyHold ? 'danger' : reassessmentDue ? 'purple' : 'blue'} trailing={<Text style={[styles.reward, safetyHold && styles.holdReward]}>{readinessRequired ? 'AWAITING' : safetyHold ? 'SEALED' : reassessmentDue ? 'RE-SCAN' : recoveryDay ? 'REST' : `+${quest?.plan.rewardXp ?? 0} XP`}</Text>}>
        {readinessRequired ? (
          <View style={[styles.recoveryMessage, styles.readinessMessage]}>
            <Text style={[styles.recoveryMark, styles.readinessMark]}>◇</Text>
            <View style={styles.recoveryCopy}><Text style={styles.recoveryTitle}>PLAYER SIGNAL NOT SYNCED</Text><Text style={styles.recoveryText}>Complete the short Daily Readiness Scan before the System reveals and opens today's protocol.</Text></View>
          </View>
        ) : safetyHold ? (
          <View style={[styles.recoveryMessage, styles.holdMessage]}>
            <Text style={[styles.recoveryMark, styles.holdMark]}>!</Text>
            <View style={styles.recoveryCopy}><Text style={styles.recoveryTitle}>UNRESOLVED SIGNAL DETECTED</Text><Text style={styles.recoveryText}>{readinessHold ? 'Today\'s readiness report contains pain or an unusual symptom. The unsupervised protocol is sealed.' : 'The System will not generate an unsupervised workout while a safety hold is active. Review Player Scan or Movement Analysis from Status.'}</Text></View>
          </View>
        ) : reassessmentDue ? (
          <View style={[styles.recoveryMessage, styles.reassessmentMessage]}>
            <Text style={[styles.recoveryMark, styles.reassessmentMark]}>◇</Text>
            <View style={styles.recoveryCopy}><Text style={styles.recoveryTitle}>NEW PLAYER SIGNAL REQUIRED</Text><Text style={styles.recoveryText}>Repeat Movement Analysis to compare the completed cycle and generate the next Training Arc.</Text></View>
          </View>
        ) : recoveryDay ? (
          <View style={styles.recoveryMessage}>
            <Text style={styles.recoveryMark}>◇</Text>
            <View style={styles.recoveryCopy}><Text style={styles.recoveryTitle}>{readinessRecovery ? 'READINESS RECOVERY ACTIVE' : 'RECOVERY DIRECTIVE ACTIVE'}</Text><Text style={styles.recoveryText}>{readinessRecovery ? 'Today\'s combined signal replaced the planned workout with protected recovery.' : `No workout is required today. Your next training protocol is scheduled for ${nextTraining ? new Date(`${nextTraining}T12:00:00`).toLocaleDateString('en', { weekday: 'long' }) : 'the next training day'}.`}</Text></View>
          </View>
        ) : quest?.plan.exercises.map((item, index) => (
          <View key={item.exercise.id} style={styles.sequence}>
            <Text style={styles.sequenceIndex}>{`${index + 1}`.padStart(2, '0')}</Text>
            <View style={styles.sequenceCopy}><Text style={styles.sequenceName}>{item.exercise.name}</Text><Text style={styles.sequenceType}>{item.exercise.primaryMuscle.toUpperCase()}</Text></View>
            <Text style={styles.sequenceTarget}>{item.sets} × {item.target}{item.exercise.repType === 'seconds' ? ' SEC' : ''}</Text>
          </View>
        ))}
        <GlowButton
          label={readinessRequired ? 'SYNC DAILY READINESS' : readinessHold || readinessRecovery ? 'REVIEW DAILY READINESS' : safetyHold ? 'PROTOCOL SEALED' : reassessmentDue ? 'BEGIN PLAYER RE-SCAN' : recoveryDay ? 'RECOVERY ACTIVE' : quest?.status === 'complete' ? 'CLEARED' : snapshot.activeWorkout ? 'RESUME QUEST' : 'BEGIN QUEST'}
          disabled={!readinessRequired && !readinessHold && !readinessRecovery && quest?.status === 'complete' && !reassessmentDue}
          onPress={readinessRequired || readinessHold || readinessRecovery ? onOpenReadiness : reassessmentDue ? onOpenMovementCalibration : onBeginDaily}
          style={styles.button}
        />
      </SystemPanel>

      {snapshot.weeklyProtocol ? <WeeklyProtocolPanel protocol={snapshot.weeklyProtocol} history={snapshot.history} /> : null}

      <SystemPanel eyebrow="ASCENSION" title={trial.target ? `RANK ${profile.rank} → ${trial.target}` : 'MAXIMUM RANK'} accent="danger">
        <View style={styles.trialHero}>
          <Text style={styles.trialRune}>◇</Text>
          <View style={styles.trialCopy}>
            <Text style={styles.trialTitle}>{trial.eligible ? 'RANK UP AVAILABLE' : 'TRIAL LOCKED'}</Text>
            <Text style={styles.trialText}>{trial.eligible ? 'A higher-intensity test calibrated from your current protocol.' : 'Meet all readiness conditions before the System opens the gate.'}</Text>
          </View>
        </View>
        {trial.reasons.map((reason) => <View key={reason} style={styles.requirement}><Text style={styles.requirementMark}>◇</Text><Text style={styles.requirementText}>{reason}</Text></View>)}
        {trial.target && trial.reasons.length === 1 && trial.reasons[0]?.includes('Daily Readiness') ? <GlowButton label="SYNC DAILY READINESS" variant="secondary" onPress={onOpenReadiness} style={styles.button} /> : null}
        <GlowButton label={trial.eligible ? 'ENTER RANK TRIAL' : 'TRIAL LOCKED'} variant={trial.eligible ? 'danger' : 'secondary'} disabled={!trial.eligible} onPress={onBeginRankTrial} style={styles.button} />
      </SystemPanel>

      <SystemPanel eyebrow="ARCHIVE SIGNALS" title="Future gates" accent="purple">
        <View style={styles.futureRow}><Text style={styles.futureIcon}>◈</Text><View><Text style={styles.futureTitle}>DUNGEONS</Text><Text style={styles.futureText}>Themed training sequences · sealed</Text></View></View>
        <View style={styles.futureRow}><Text style={styles.futureIcon}>◆</Text><View><Text style={styles.futureTitle}>BOSS FIGHTS</Text><Text style={styles.futureText}>High-intensity challenges · sealed</Text></View></View>
      </SystemPanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  reward: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  holdReward: { color: colors.danger },
  sequence: { minHeight: 54, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(147,164,195,0.1)' },
  sequenceIndex: { color: colors.primary, fontSize: 10, fontWeight: '900', width: 30 },
  sequenceCopy: { flex: 1 },
  sequenceName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  sequenceType: { color: colors.textDim, fontSize: 8, fontWeight: '800', letterSpacing: 1.2, marginTop: 3 },
  sequenceTarget: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  button: { marginTop: spacing.lg },
  recoveryMessage: { flexDirection: 'row', alignItems: 'center', minHeight: 84, padding: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(85,230,177,0.2)', backgroundColor: 'rgba(85,230,177,0.05)' },
  recoveryMark: { color: colors.success, fontSize: 30, marginRight: spacing.md },
  recoveryCopy: { flex: 1 },
  recoveryTitle: { color: colors.text, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  recoveryText: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  holdMessage: { borderColor: 'rgba(226,61,87,0.3)', backgroundColor: 'rgba(226,61,87,0.06)' },
  holdMark: { color: colors.danger, fontWeight: '900', textAlign: 'center', width: 30 },
  reassessmentMessage: { borderColor: 'rgba(106,92,255,0.3)', backgroundColor: 'rgba(106,92,255,0.07)' },
  reassessmentMark: { color: colors.purple },
  readinessMessage: { borderColor: colors.lineStrong, backgroundColor: 'rgba(41,182,255,0.07)' },
  readinessMark: { color: colors.primary },
  trialHero: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  trialRune: { color: colors.danger, fontSize: 44, marginRight: spacing.lg, textShadowColor: colors.danger, textShadowRadius: 14 },
  trialCopy: { flex: 1 },
  trialTitle: { color: colors.text, fontSize: 15, fontWeight: '900', letterSpacing: 0.7 },
  trialText: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  requirement: { flexDirection: 'row', alignItems: 'center', minHeight: 34 },
  requirementMark: { color: colors.danger, fontSize: 11, marginRight: spacing.md },
  requirementText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  futureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  futureIcon: { color: colors.purple, fontSize: 24, width: 48 },
  futureTitle: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  futureText: { color: colors.textDim, fontSize: 10, marginTop: 4 },
});
