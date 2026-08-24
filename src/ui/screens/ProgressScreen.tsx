import { StyleSheet, Text, View } from 'react-native';

import type { WorkoutHistoryEntry } from '../../domain/types.ts';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

export function ProgressScreen({ history }: { history: WorkoutHistoryEntry[] }) {
  const totalSeconds = history.reduce((sum, workout) => sum + workout.durationSeconds, 0);
  const totalXp = history.reduce((sum, workout) => sum + workout.xpEarned, 0);
  const totalSets = history.reduce((sum, workout) => sum + workout.results.reduce((setSum, result) => setSum + result.completedSets, 0), 0);
  return (
    <Screen eyebrow="ACTIVITY ARCHIVE" title="Progress" subtitle="Every cleared protocol becomes training intelligence.">
      <View style={styles.summary}>
        <SummaryMetric value={history.length} label="WORKOUTS" />
        <SummaryMetric value={`${Math.round(totalSeconds / 60)}`} label="MINUTES" />
        <SummaryMetric value={totalSets} label="SETS" />
      </View>
      <SystemPanel eyebrow="ACQUIRED ENERGY" title={`${totalXp} TOTAL XP`} accent="purple">
        <Text style={styles.explanation}>Future protocols use this archive to adjust volume, variants, recovery, and exercise rotation.</Text>
      </SystemPanel>
      <SystemPanel eyebrow="HISTORY" title={history.length ? 'Cleared protocols' : 'No records yet'}>
        {history.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyRune}>◇</Text><Text style={styles.emptyTitle}>THE ARCHIVE IS EMPTY</Text><Text style={styles.emptyText}>Complete the Daily Quest to create your first record.</Text></View>
        ) : history.map((workout) => <HistoryRow key={workout.id} workout={workout} />)}
      </SystemPanel>
    </Screen>
  );
}

function SummaryMetric({ value, label }: { value: string | number; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function HistoryRow({ workout }: { workout: WorkoutHistoryEntry }) {
  return (
    <View style={styles.historyRow}>
      <View style={styles.dateBox}><Text style={styles.dateDay}>{workout.dateKey.slice(8)}</Text><Text style={styles.dateMonth}>{new Date(`${workout.dateKey}T12:00:00`).toLocaleDateString('en', { month: 'short' }).toUpperCase()}</Text></View>
      <View style={styles.historyCopy}><Text style={styles.historyTitle}>{workout.title}</Text><Text style={styles.historyMeta}>{Math.round(workout.durationSeconds / 60)} MIN · {workout.results.length} EXERCISES · {workout.perceivedDifficulty.replace('-', ' ').toUpperCase()}</Text></View>
      <Text style={styles.historyXp}>+{workout.xpEarned}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, minHeight: 88, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  metricValue: { color: colors.text, fontSize: 23, fontWeight: '900' },
  metricLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginTop: 6 },
  explanation: { color: colors.textMuted, fontSize: 12, lineHeight: 19 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyRune: { color: colors.textDim, fontSize: 40 },
  emptyTitle: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginTop: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm, textAlign: 'center' },
  historyRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(147,164,195,0.1)' },
  dateBox: { width: 44, alignItems: 'center' },
  dateDay: { color: colors.primary, fontSize: 17, fontWeight: '900' },
  dateMonth: { color: colors.textDim, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  historyCopy: { flex: 1, marginHorizontal: spacing.sm },
  historyTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  historyMeta: { color: colors.textDim, fontSize: 8, fontWeight: '700', marginTop: 5 },
  historyXp: { color: colors.primary, fontSize: 11, fontWeight: '900' },
});
