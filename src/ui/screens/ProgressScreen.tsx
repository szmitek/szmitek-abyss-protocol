import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EXERCISE_BY_ID } from '../../data/exercises.ts';
import { buildExerciseInsights } from '../../domain/insights.ts';
import type { WorkoutHistoryEntry } from '../../domain/types.ts';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

export function ProgressScreen({ history }: { history: WorkoutHistoryEntry[] }) {
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const totalSeconds = history.reduce((sum, workout) => sum + workout.durationSeconds, 0);
  const totalXp = history.reduce((sum, workout) => sum + workout.xpEarned, 0);
  const totalSets = history.reduce((sum, workout) => sum + workout.results.reduce((setSum, result) => setSum + result.completedSets, 0), 0);
  const insights = buildExerciseInsights(history).slice(0, 4);
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
      <SystemPanel eyebrow="PROGRESSION SIGNALS" title={insights.length ? 'Exercise development' : 'Awaiting data'}>
        {insights.length === 0 ? <Text style={styles.explanation}>Complete more protocols to reveal exercise-specific trends.</Text> : insights.map((insight) => {
          const unit = insight.repType === 'seconds' ? 'SEC' : 'REPS';
          const improved = insight.latestTarget > insight.firstTarget;
          return (
            <View key={insight.exerciseId} style={styles.insightRow}>
              <View style={styles.insightCopy}><Text style={styles.insightName}>{insight.name}</Text><Text style={styles.insightMeta}>{insight.sessions} {insight.sessions === 1 ? 'SESSION' : 'SESSIONS'} · {insight.totalVolume} TOTAL</Text></View>
              <View style={styles.insightValue}><Text style={[styles.insightTarget, improved && styles.insightImproved]}>{insight.firstTarget} → {insight.latestTarget}</Text><Text style={styles.insightUnit}>{unit}</Text></View>
            </View>
          );
        })}
      </SystemPanel>
      <SystemPanel eyebrow="HISTORY" title={history.length ? 'Cleared protocols' : 'No records yet'}>
        {history.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyRune}>◇</Text><Text style={styles.emptyTitle}>THE ARCHIVE IS EMPTY</Text><Text style={styles.emptyText}>Complete the Daily Quest to create your first record.</Text></View>
        ) : history.map((workout) => (
          <HistoryRow
            expanded={expandedWorkoutId === workout.id}
            key={workout.id}
            onToggle={() => setExpandedWorkoutId((current) => current === workout.id ? null : workout.id)}
            workout={workout}
          />
        ))}
      </SystemPanel>
    </Screen>
  );
}

function SummaryMetric({ value, label }: { value: string | number; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function HistoryRow({ workout, expanded, onToggle }: { workout: WorkoutHistoryEntry; expanded: boolean; onToggle: () => void }) {
  const attributeXp = Object.entries(workout.attributeXpEarned).filter(([, gain]) => gain > 0);
  return (
    <View style={styles.historyEntry}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle} style={styles.historyRow}>
        <View style={styles.dateBox}><Text style={styles.dateDay}>{workout.dateKey.slice(8)}</Text><Text style={styles.dateMonth}>{new Date(`${workout.dateKey}T12:00:00`).toLocaleDateString('en', { month: 'short' }).toUpperCase()}</Text></View>
        <View style={styles.historyCopy}><Text style={styles.historyTitle}>{workout.title}</Text><Text style={styles.historyMeta}>{Math.round(workout.durationSeconds / 60)} MIN · {workout.results.length} EXERCISES · {workout.perceivedDifficulty.replace('-', ' ').toUpperCase()}</Text></View>
        <View style={styles.historyReward}><Text style={styles.historyXp}>+{workout.xpEarned}</Text><Text style={styles.expandMark}>{expanded ? '−' : '+'}</Text></View>
      </Pressable>
      {expanded ? (
        <View style={styles.historyDetails}>
          {workout.results.map((result) => {
            const exercise = EXERCISE_BY_ID.get(result.exerciseId);
            return (
              <View key={result.exerciseId} style={styles.resultRow}>
                <Text style={styles.resultName}>{exercise?.name ?? result.exerciseId}</Text>
                <Text style={styles.resultValue}>{result.completedSets} × {result.targetPerSet}{exercise?.repType === 'seconds' ? ' SEC' : ''}</Text>
              </View>
            );
          })}
          {attributeXp.length > 0 ? <View style={styles.gainsRow}>{attributeXp.map(([stat, gain]) => <Text key={stat} style={styles.gain}>+{gain} {stat.slice(0, 3).toUpperCase()} AP</Text>)}</View> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, minHeight: 88, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  metricValue: { color: colors.text, fontSize: 23, fontWeight: '900' },
  metricLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginTop: 6 },
  explanation: { color: colors.textMuted, fontSize: 12, lineHeight: 19 },
  insightRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(147,164,195,0.1)' },
  insightCopy: { flex: 1, paddingRight: spacing.sm },
  insightName: { color: colors.text, fontSize: 12, fontWeight: '800' },
  insightMeta: { color: colors.textDim, fontSize: 8, fontWeight: '800', letterSpacing: 0.7, marginTop: 4 },
  insightValue: { alignItems: 'flex-end' },
  insightTarget: { color: colors.textMuted, fontSize: 14, fontWeight: '900' },
  insightImproved: { color: colors.success },
  insightUnit: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyRune: { color: colors.textDim, fontSize: 40 },
  emptyTitle: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginTop: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm, textAlign: 'center' },
  historyEntry: { borderTopWidth: 1, borderTopColor: 'rgba(147,164,195,0.1)' },
  historyRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center' },
  dateBox: { width: 44, alignItems: 'center' },
  dateDay: { color: colors.primary, fontSize: 17, fontWeight: '900' },
  dateMonth: { color: colors.textDim, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  historyCopy: { flex: 1, marginHorizontal: spacing.sm },
  historyTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  historyMeta: { color: colors.textDim, fontSize: 8, fontWeight: '700', marginTop: 5 },
  historyXp: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  historyReward: { width: 38, alignItems: 'flex-end' },
  expandMark: { color: colors.textDim, fontSize: 16, fontWeight: '700', marginTop: 4 },
  historyDetails: { paddingLeft: 52, paddingBottom: spacing.md, paddingRight: spacing.xs },
  resultRow: { minHeight: 31, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(147,164,195,0.07)' },
  resultName: { flex: 1, color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  resultValue: { color: colors.text, fontSize: 9, fontWeight: '900' },
  gainsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  gain: { color: colors.success, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
});
