import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { EXERCISE_BY_ID } from '../../data/exercises.ts';
import { toDateKey } from '../../domain/date.ts';
import { buildActivityWeeks, buildExerciseInsights, type ExerciseInsight } from '../../domain/insights.ts';
import type { TrainingArcDecision, UserProfile, WorkoutHistoryEntry } from '../../domain/types.ts';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { GlowButton } from '../components/GlowButton.tsx';
import { ActivityPanel, ArcComparisonPanel, AttributePanel, DirectiveHistoryPanel } from '../components/ProgressPanels.tsx';
import { colors, radius, spacing } from '../theme.ts';
import { ArcReviewScreen } from './ArcReviewScreen.tsx';

const DECISION_LABELS: Record<TrainingArcDecision, string> = {
  advance: 'ADVANCE',
  continue: 'CONTINUE',
  recalibrate: 'RECALIBRATE',
  recovery: 'RECOVERY ENTRY',
  hold: 'SYSTEM HOLD',
};

export function ProgressScreen({ profile, history }: { profile: UserProfile; history: WorkoutHistoryEntry[] }) {
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [exerciseLimit, setExerciseLimit] = useState(8);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [reportLimit, setReportLimit] = useState(5);
  const completed = useMemo(() => history.filter((entry) => entry.completed).sort((a, b) => b.date.localeCompare(a.date)), [history]);
  const insights = useMemo(() => buildExerciseInsights(completed), [completed]);
  const today = toDateKey(new Date());
  const weeks = useMemo(() => buildActivityWeeks(completed, today), [completed, today]);
  const totalSeconds = completed.reduce((sum, workout) => sum + workout.durationSeconds, 0);
  const totalXp = completed.reduce((sum, workout) => sum + workout.xpEarned, 0);
  const totalSets = completed.reduce((sum, workout) => sum + workout.results.reduce((setSum, result) => setSum + result.completedSets, 0), 0);
  const filteredInsights = insights.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const reports = [...profile.trainingArcReviews].sort((a, b) => b.cycleNumber - a.cycleNumber);
  const selectedReview = reports.find((review) => review.id === reviewId);
  const selectedExercise = insights.find((insight) => insight.exerciseId === exerciseId);
  if (selectedReview) return <ArcReviewScreen review={selectedReview} profile={profile} archived onContinue={() => setReviewId(null)} />;
  if (selectedExercise) return <ExerciseHistoryScreen key={selectedExercise.exerciseId} insight={selectedExercise} onBack={() => setExerciseId(null)} />;
  return (
    <Screen eyebrow="ACTIVITY ARCHIVE" title="Progress" subtitle="Every cleared protocol becomes training intelligence.">
      <View style={styles.summary}>
        <SummaryMetric value={completed.length} label="WORKOUTS" />
        <SummaryMetric value={`${Math.round(totalSeconds / 60)}`} label="MINUTES" />
        <SummaryMetric value={totalSets} label="SETS" />
      </View>
      <SystemPanel eyebrow="ACQUIRED ENERGY" title={`${totalXp} TOTAL XP`} accent="purple">
        <Text style={styles.explanation}>Future protocols use this archive to adjust volume, variants, recovery, and exercise rotation.</Text>
      </SystemPanel>
      <ActivityPanel weeks={weeks} />
      <SystemPanel eyebrow="PROGRESSION SIGNALS" title={insights.length ? 'Exercise development' : 'Awaiting data'}>
        <Text style={styles.explanation}>Inspect every exercise you have completed. Targets reflect logged prescriptions; a higher target alone does not prove improved technique.</Text>
        {insights.length > 0 ? <TextInput accessibilityLabel="Search completed exercises" value={query} onChangeText={(value) => { setQuery(value); setExerciseLimit(8); }} placeholder="Search exercises" placeholderTextColor={colors.textDim} autoCorrect={false} style={styles.search} /> : null}
        {filteredInsights.length === 0 ? <Text style={styles.explanation}>{insights.length ? 'No matching exercise.' : 'Complete a protocol to create your first exercise record.'}</Text> : filteredInsights.slice(0, exerciseLimit).map((insight) => {
          const unit = insight.repType === 'seconds' ? 'SEC' : insight.repType === 'reps' ? 'REPS' : 'UNITS UNKNOWN';
          const improved = insight.latestTarget > insight.firstTarget;
          return (
            <Pressable key={insight.exerciseId} accessibilityRole="button" accessibilityLabel={`Open ${insight.name} history, ${insight.sessions} sessions`} onPress={() => setExerciseId(insight.exerciseId)} style={styles.insightRow}>
              <View style={styles.insightCopy}><Text style={styles.insightName}>{insight.name}</Text><Text style={styles.insightMeta}>{insight.sessions} {insight.sessions === 1 ? 'SESSION' : 'SESSIONS'} · VIEW HISTORY</Text></View>
              <View style={styles.insightValue}><Text style={[styles.insightTarget, improved && styles.insightImproved]}>{insight.firstTarget} → {insight.latestTarget}</Text><Text style={styles.insightUnit}>{unit}</Text></View>
            </Pressable>
          );
        })}
        {filteredInsights.length > exerciseLimit ? <GlowButton label="MORE EXERCISES" variant="secondary" onPress={() => setExerciseLimit((value) => value + 12)} /> : null}
      </SystemPanel>
      <ArcComparisonPanel profile={profile} />
      <SystemPanel eyebrow="TRAINING ARC ARCHIVE" title={profile.trainingArcReviews.length ? 'Reassessment reports' : 'Awaiting first cycle'} accent="purple">
        {reports.length === 0 ? <Text style={styles.explanation}>Complete a four-week Training Arc and Player re-scan to unlock the first evidence report.</Text> : reports.slice(0, reportLimit).map((review) => (
          <Pressable key={review.id} accessibilityRole="button" accessibilityLabel={`Open Arc ${review.cycleNumber} report`} onPress={() => setReviewId(review.id)} style={styles.arcRow}>
            <View style={styles.arcCycle}><Text style={styles.arcCycleLabel}>ARC</Text><Text style={styles.arcCycleValue}>{String(review.cycleNumber).padStart(2, '0')}</Text></View>
            <View style={styles.arcCopy}>
              <Text style={styles.arcDecision}>{DECISION_LABELS[review.decision]}</Text>
              <Text style={styles.arcMeta}>{Math.round(review.adherence.rate * 100)}% ADHERENCE · {review.movement.improved} UP · {review.movement.declined} DOWN</Text>
            </View>
            <Text style={styles.arcDate}>{review.dateKey.slice(5).replace('-', '.')}</Text>
          </Pressable>
        ))}
        {reports.length > reportLimit ? <GlowButton label="OLDER REPORTS" variant="secondary" onPress={() => setReportLimit((value) => value + 10)} /> : null}
      </SystemPanel>
      <DirectiveHistoryPanel profile={profile} />
      <AttributePanel profile={profile} history={completed} />
      <SystemPanel eyebrow="HISTORY" title={completed.length ? 'Cleared protocols' : 'No records yet'}>
        {completed.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyRune}>◇</Text><Text style={styles.emptyTitle}>THE ARCHIVE IS EMPTY</Text><Text style={styles.emptyText}>Complete the Daily Quest to create your first record.</Text></View>
        ) : completed.slice(0, historyLimit).map((workout) => (
          <HistoryRow
            expanded={expandedWorkoutId === workout.id}
            key={workout.id}
            onToggle={() => setExpandedWorkoutId((current) => current === workout.id ? null : workout.id)}
            workout={workout}
          />
        ))}
        {completed.length > historyLimit ? <GlowButton label="OLDER SESSIONS" variant="secondary" onPress={() => setHistoryLimit((value) => value + 10)} /> : null}
      </SystemPanel>
    </Screen>
  );
}

function ExerciseHistoryScreen({ insight, onBack }: { insight: ExerciseInsight; onBack: () => void }) {
  const [limit, setLimit] = useState(12);
  const unit = insight.repType === 'seconds' ? 'sec' : insight.repType === 'reps' ? 'reps' : 'units unknown';
  return <Screen eyebrow="EXERCISE ARCHIVE" title={insight.name} subtitle={`${insight.sessions} sessions · ${insight.totalVolume} ${unit} logged`}>
    <GlowButton label="BACK TO PROGRESS" variant="secondary" onPress={onBack} />
    <SystemPanel eyebrow="TARGET PER SET" title={`${insight.firstTarget} → ${insight.latestTarget} ${unit}`}>
      <Text style={styles.explanation}>Highest recorded target: {insight.bestTarget} {unit}. Compare targets together with completed sets and perceived difficulty. Changes of exercise variant have separate records.</Text>
    </SystemPanel>
    <SystemPanel eyebrow="ALL EXPOSURES" title="Session records">
      {[...insight.samples].reverse().slice(0, limit).map((sample) => <View key={sample.id} style={styles.sample}>
        <Text style={styles.insightName}>{sample.dateKey} · {sample.sets} × {sample.target} {unit}</Text>
        <Text style={styles.explanation}>{sample.volume} {unit} logged · {sample.difficulty.replaceAll('-', ' ')}</Text>
      </View>)}
      {insight.samples.length > limit ? <GlowButton label="OLDER RECORDS" variant="secondary" onPress={() => setLimit((value) => value + 12)} /> : null}
    </SystemPanel>
  </Screen>;
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
          {workout.results.map((result, index) => {
            const exercise = EXERCISE_BY_ID.get(result.exerciseId);
            return (
              <View key={`${result.exerciseId}-${index}`} style={styles.resultRow}>
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
  search: { minHeight: 48, color: colors.text, backgroundColor: colors.panel, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, marginVertical: spacing.md, fontSize: 14 },
  sample: { paddingVertical: spacing.md, gap: 6, borderTopWidth: 1, borderTopColor: colors.line },
  summary: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, minHeight: 88, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel },
  metricValue: { color: colors.text, fontSize: 23, fontWeight: '900' },
  metricLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginTop: 6 },
  explanation: { color: colors.textMuted, fontSize: 12, lineHeight: 19 },
  insightRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(147,164,195,0.1)' },
  insightCopy: { flex: 1, paddingRight: spacing.sm },
  insightName: { color: colors.text, fontSize: 12, fontWeight: '800' },
  insightMeta: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 4 },
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
  arcRow: { minHeight: 65, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(147,164,195,0.1)' },
  arcCycle: { width: 42, alignItems: 'center' },
  arcCycleLabel: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  arcCycleValue: { color: colors.purple, fontSize: 17, fontWeight: '900', marginTop: 2 },
  arcCopy: { flex: 1, marginHorizontal: spacing.sm },
  arcDecision: { color: colors.text, fontSize: 11, fontWeight: '900', letterSpacing: 0.7 },
  arcMeta: { color: colors.textDim, fontSize: 8, fontWeight: '800', marginTop: 5 },
  arcDate: { color: colors.textMuted, fontSize: 9, fontWeight: '900' },
});
