import { StyleSheet, Text, View } from 'react-native';

import { levelProgress } from '../../domain/progression.ts';
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

export function StatusScreen({ profile, onEditProfile, onRestoreExercises }: { profile: UserProfile; onEditProfile: () => void; onRestoreExercises: () => void }) {
  const xp = levelProgress(profile);
  const totalStats = STATS.reduce((sum, stat) => sum + profile[stat.key], 0);
  return (
    <Screen eyebrow="CHARACTER DATA" title="Status" subtitle="Parameters reflect completed work. No points are assigned arbitrarily.">
      <SystemPanel accent="purple">
        <View style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.avatarRune}>◇</Text></View>
          <View style={styles.identityCopy}><Text style={styles.designation}>AWAKENED HUNTER</Text><Text style={styles.level}>LEVEL {profile.level}</Text><Text style={styles.total}>TOTAL ATTRIBUTE POWER {totalStats}</Text></View>
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
              <View style={styles.attributeCopy}><Text style={styles.attributeLabel}>{label}</Text><ProgressBar progress={Math.min(1, profile[key] / Math.max(10, totalStats / 2))} /></View>
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
  attributeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  attributeValue: { color: colors.text, fontSize: 23, fontWeight: '900', width: 38, textAlign: 'right' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '47%', minHeight: 104, padding: spacing.lg, justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(147,164,195,0.14)', backgroundColor: 'rgba(14,19,32,0.72)' },
  metricValue: { color: colors.text, fontSize: 27, fontWeight: '900' },
  metricLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginTop: spacing.sm },
  settingsCopy: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  settingsButton: { marginTop: spacing.lg },
  restoreButton: { marginTop: spacing.sm },
});
