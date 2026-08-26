import { StyleSheet, Text, View } from 'react-native';

import { calculateRecovery } from '../../domain/recovery.ts';
import { levelProgress } from '../../domain/progression.ts';
import { nextScheduledTrainingDateKey } from '../../domain/schedule.ts';
import type { AppSnapshot, StatKey } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

interface DashboardScreenProps {
  snapshot: AppSnapshot;
  onBeginQuest: () => void;
  onOpenSystemScan: () => void;
}

const STATS: { key: StatKey; code: string }[] = [
  { key: 'strength', code: 'STR' },
  { key: 'endurance', code: 'END' },
  { key: 'agility', code: 'AGI' },
  { key: 'vitality', code: 'VIT' },
  { key: 'mobility', code: 'MOB' },
];

export function DashboardScreen({ snapshot, onBeginQuest, onOpenSystemScan }: DashboardScreenProps) {
  const profile = snapshot.profile!;
  const quest = snapshot.dailyQuest;
  const xp = levelProgress(profile);
  const recovery = calculateRecovery(snapshot.history);
  const recoveryDay = quest?.plan.kind === 'recovery';
  const safetyHold = quest?.plan.kind === 'safety-hold';
  const nextTraining = recoveryDay && quest ? nextScheduledTrainingDateKey(profile, quest.dateKey) : null;
  const recoveryHighlights = Object.entries(recovery).filter(([group]) => ['chest', 'core', 'quads'].includes(group));

  return (
    <Screen
      eyebrow="SYSTEM ONLINE"
      title="Welcome, Player"
      subtitle={safetyHold ? 'Safeguard active. Training remains sealed.' : recoveryDay ? 'Scheduled recovery protects long-term progression.' : 'Your parameters are stable. One protocol awaits.'}
      action={<View style={styles.rankBadge}><Text style={styles.rankLabel}>RANK</Text><Text style={styles.rank}>{profile.rank}</Text></View>}
    >
      <SystemPanel>
        <View style={styles.levelHeader}>
          <View><Text style={styles.caption}>CURRENT LEVEL</Text><Text style={styles.level}>{profile.level}</Text></View>
          <View style={styles.xpCopy}><Text style={styles.xp}>{xp.current} / {xp.required} XP</Text><Text style={styles.next}>NEXT AWAKENING</Text></View>
        </View>
        <ProgressBar progress={xp.ratio} />
      </SystemPanel>

      <View style={styles.statsRow}>
        {STATS.map(({ key, code }) => (
          <View key={key} style={styles.stat}><Text style={styles.statCode}>{code}</Text><Text style={styles.statValue}>{Math.floor(profile[key])}</Text></View>
        ))}
      </View>

      {!profile.healthProfile.scanCompleted ? (
        <SystemPanel eyebrow="PLAYER SCAN REQUIRED" title="Complete System calibration" accent="purple">
          <Text style={styles.scanCopy}>Register pain signals, posture priorities and known restrictions so generated protocols can adapt to you.</Text>
          <GlowButton label="START PLAYER SCAN" variant="secondary" onPress={onOpenSystemScan} style={styles.scanButton} />
        </SystemPanel>
      ) : null}

      <SystemPanel
        eyebrow={safetyHold ? 'SYSTEM SAFEGUARD' : recoveryDay ? 'PLANNED RECOVERY' : quest?.status === 'complete' ? 'PROTOCOL CLEARED' : 'DAILY QUEST'}
        title={quest?.plan.title ?? 'SCANNING...'}
        trailing={<Text style={[styles.questStatus, (quest?.status === 'complete' || recoveryDay) && styles.complete, safetyHold && styles.holdStatus]}>● {safetyHold ? 'SEALED' : recoveryDay ? 'RECOVERY' : quest?.status.toUpperCase()}</Text>}
      >
        {safetyHold ? (
          <View style={[styles.recoveryDirective, styles.holdDirective]}>
            <Text style={[styles.recoveryDirectiveMark, styles.holdMark]}>!</Text>
            <View style={styles.recoveryDirectiveCopy}>
              <Text style={styles.recoveryDirectiveTitle}>PLAYER CLEARANCE REQUIRED</Text>
              <Text style={styles.recoveryDirectiveText}>Review unresolved warning signals in Player Scan before returning to unsupervised training.</Text>
              <GlowButton label="REVIEW PLAYER SCAN" variant="secondary" onPress={onOpenSystemScan} style={styles.scanButton} />
            </View>
          </View>
        ) : recoveryDay ? (
          <View style={styles.recoveryDirective}>
            <Text style={styles.recoveryDirectiveMark}>◇</Text>
            <View style={styles.recoveryDirectiveCopy}>
              <Text style={styles.recoveryDirectiveTitle}>NO TRAINING REQUIRED</Text>
              <Text style={styles.recoveryDirectiveText}>Your streak is protected. Next training: {nextTraining ? new Date(`${nextTraining}T12:00:00`).toLocaleDateString('en', { weekday: 'long' }).toUpperCase() : 'SCHEDULED'}</Text>
            </View>
          </View>
        ) : quest ? (
          <>
            <View style={styles.questMeta}>
              <Meta label="FOCUS" value={quest.plan.focus} />
              <Meta label="TIME" value={`${quest.plan.estimatedMinutes} MIN`} />
              <Meta label="REWARD" value={`+${quest.plan.rewardXp} XP`} />
            </View>
            <View style={styles.exercisePreview}>
              {quest.plan.exercises.slice(0, 4).map((item, index) => (
                <View key={item.exercise.id} style={styles.exerciseLine}>
                  <Text style={styles.exerciseIndex}>{`${index + 1}`.padStart(2, '0')}</Text>
                  <Text style={styles.exerciseName}>{item.exercise.name}</Text>
                  <Text style={styles.exerciseTarget}>{item.sets} × {item.target}{item.exercise.repType === 'seconds' ? 's' : ''}</Text>
                </View>
              ))}
              {quest.plan.exercises.length > 4 ? <Text style={styles.more}>+ {quest.plan.exercises.length - 4} MORE SEQUENCES</Text> : null}
            </View>
            <GlowButton
              label={quest.status === 'complete' ? 'QUEST COMPLETE' : snapshot.activeWorkout ? 'RESUME QUEST' : 'BEGIN QUEST'}
              onPress={onBeginQuest}
              disabled={quest.status === 'complete'}
            />
          </>
        ) : null}
      </SystemPanel>

      <SystemPanel eyebrow="RECOVERY SCAN" title="Muscle readiness">
        <View style={styles.recoveryList}>
          {recoveryHighlights.map(([group, value]) => (
            <View key={group} style={styles.recoveryRow}>
              <Text style={styles.recoveryName}>{group.toUpperCase()}</Text>
              <View style={styles.recoveryBar}><ProgressBar progress={value / 100} danger={value < 40} /></View>
              <Text style={[styles.recoveryValue, value < 40 && styles.low]}>{value}%</Text>
            </View>
          ))}
        </View>
      </SystemPanel>

      <View style={styles.streakCard}>
        <Text style={styles.flame}>✦</Text>
        <View style={styles.streakCopy}><Text style={styles.streak}>{profile.streak > 0 ? `${profile.streak} WORKOUT STREAK` : 'BEGIN YOUR STREAK'}</Text><Text style={styles.streakNote}>Planned recovery preserves your chain.</Text></View>
      </View>
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <View style={styles.meta}><Text style={styles.metaLabel}>{label}</Text><Text numberOfLines={label === 'FOCUS' ? 2 : 1} style={styles.metaValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  rankBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: 'rgba(41, 182, 255, 0.08)', shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 14 },
  rankLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '800', letterSpacing: 1.5 },
  rank: { color: colors.primary, fontSize: 28, fontWeight: '900', lineHeight: 31 },
  levelHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.md },
  caption: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.6 },
  level: { color: colors.text, fontSize: 42, fontWeight: '900', lineHeight: 45 },
  xpCopy: { alignItems: 'flex-end', paddingBottom: 4 },
  xp: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  next: { color: colors.textDim, fontSize: 8, fontWeight: '800', letterSpacing: 1.3, marginTop: 3 },
  statsRow: { flexDirection: 'row', gap: 7 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(147,164,195,0.14)', backgroundColor: 'rgba(14,19,32,0.72)' },
  statCode: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 },
  questStatus: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  complete: { color: colors.success },
  holdStatus: { color: colors.danger },
  scanCopy: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  scanButton: { marginTop: spacing.md },
  recoveryDirective: { minHeight: 92, flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(85,230,177,0.2)', backgroundColor: 'rgba(85,230,177,0.05)' },
  recoveryDirectiveMark: { color: colors.success, fontSize: 34, marginRight: spacing.md },
  recoveryDirectiveCopy: { flex: 1 },
  recoveryDirectiveTitle: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  recoveryDirectiveText: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 5 },
  holdDirective: { borderColor: 'rgba(226,61,87,0.28)', backgroundColor: 'rgba(226,61,87,0.06)' },
  holdMark: { color: colors.danger, fontWeight: '900', width: 34, textAlign: 'center' },
  questMeta: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  meta: { flex: 1 },
  metaLabel: { color: colors.textDim, fontSize: 8, fontWeight: '800', letterSpacing: 1.2 },
  metaValue: { color: colors.text, fontSize: 11, lineHeight: 15, fontWeight: '800', marginTop: 4 },
  exercisePreview: { borderTopWidth: 1, borderTopColor: 'rgba(147,164,195,0.12)', paddingTop: spacing.sm, marginBottom: spacing.lg },
  exerciseLine: { minHeight: 37, flexDirection: 'row', alignItems: 'center' },
  exerciseIndex: { color: colors.primary, fontSize: 10, fontWeight: '900', width: 30 },
  exerciseName: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' },
  exerciseTarget: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  more: { color: colors.textDim, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: spacing.sm },
  recoveryList: { gap: spacing.md },
  recoveryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recoveryName: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1, width: 52 },
  recoveryBar: { flex: 1 },
  recoveryValue: { color: colors.success, fontSize: 11, fontWeight: '900', width: 36, textAlign: 'right' },
  low: { color: colors.danger },
  streakCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, backgroundColor: 'rgba(106,92,255,0.08)', borderWidth: 1, borderColor: 'rgba(106,92,255,0.28)' },
  flame: { color: colors.purple, fontSize: 31, marginRight: spacing.lg, textShadowColor: colors.purple, textShadowRadius: 12 },
  streakCopy: { flex: 1 },
  streak: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },
  streakNote: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
});
