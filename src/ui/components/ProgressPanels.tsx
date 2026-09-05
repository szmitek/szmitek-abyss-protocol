import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CORRECTIVE_GOAL_DETAILS } from '../../domain/correctiveProfile.ts';
import type { ActivityWeek } from '../../domain/insights.ts';
import { attributeProgress } from '../../domain/progression.ts';
import { STAT_KEYS, type UserProfile, type WorkoutHistoryEntry } from '../../domain/types.ts';
import { colors, spacing } from '../theme.ts';
import { GlowButton } from './GlowButton.tsx';
import { SystemPanel } from './SystemPanel.tsx';

export function ActivityPanel({ weeks }: { weeks: ActivityWeek[] }) {
  const [metric, setMetric] = useState<'sessions' | 'sets'>('sessions');
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const selected = weeks.find((week) => week.startDateKey === selectedStart) ?? weeks[weeks.length - 1];
  const maximum = Math.max(1, ...weeks.map((week) => week[metric]));
  return (
    <SystemPanel eyebrow="EIGHT-WEEK SIGNAL" title="Training rhythm">
      <View style={styles.switches}>
        {(['sessions', 'sets'] as const).map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: metric === item }} onPress={() => setMetric(item)} style={[styles.switch, metric === item && styles.selected]}><Text style={styles.label}>{item.toUpperCase()}</Text></Pressable>)}
      </View>
      <View style={styles.chart}>
        {weeks.map((week) => (
          <Pressable key={week.startDateKey} accessibilityRole="button" accessibilityLabel={`Week of ${week.startDateKey}: ${week[metric]} ${metric}`} accessibilityState={{ selected: selected?.startDateKey === week.startDateKey }} onPress={() => setSelectedStart(week.startDateKey)} style={styles.column}>
            <Text style={styles.barValue}>{week[metric]}</Text>
            <View style={styles.track}><View style={[styles.bar, { height: `${week[metric] / maximum * 100}%`, backgroundColor: selected?.startDateKey === week.startDateKey ? colors.primary : colors.purple }]} /></View>
            <Text style={styles.barDate}>{week.startDateKey.slice(5).replace('-', '/')}</Text>
          </Pressable>
        ))}
      </View>
      {selected ? <View accessibilityLiveRegion="polite" style={styles.detail}>
        <Text style={styles.label}>WEEK OF {selected.startDateKey}{selected === weeks[weeks.length - 1] ? ' · IN PROGRESS' : ''}</Text>
        <Text style={styles.copy}>{selected.sessions} sessions · {selected.activeDays} active days · {Math.round(selected.seconds / 60)} min</Text>
        <Text style={styles.copy}>{selected.sets} sets · {selected.repetitions} reps · {selected.timedVolume} sec of timed exercises</Text>
      </View> : null}
      <Text style={styles.note}>Tap a week for details. Completed sessions include Rank Trials; sets include warm-ups. Recorded targets and volume are completion logs, not measured strength.</Text>
    </SystemPanel>
  );
}

export function AttributePanel({ profile, history }: { profile: UserProfile; history: WorkoutHistoryEntry[] }) {
  return (
    <SystemPanel eyebrow="ATTRIBUTE LEDGER" title="How your stats grow" accent="purple">
      <Text style={styles.copy}>Each exercise contributes AP to its linked attributes for every completed set. A stat gains a point when its AP threshold is reached; the next threshold then increases.</Text>
      {STAT_KEYS.map((key) => {
        const progress = attributeProgress(profile, key);
        const recorded = history.filter((entry) => entry.completed).reduce((sum, entry) => sum + entry.attributeXpEarned[key], 0);
        const carried = Math.max(0, profile.attributeXp[key] - recorded);
        return <View key={key} style={styles.detail}>
          <View style={styles.row}><Text style={styles.label}>{key.toUpperCase()} {profile[key]}</Text><Text style={styles.value}>{profile[key] >= 100 ? 'MAX LEVEL' : `${progress.current} / ${progress.required} AP`}</Text></View>
          <View accessibilityRole="progressbar" accessibilityLabel={`${key} attribute progress`} accessibilityValue={{ min: 0, max: progress.required, now: Math.min(progress.current, progress.required) }} style={styles.meter}><View style={[styles.fill, { width: `${progress.ratio * 100}%` }]} /></View>
          <Text style={styles.note}>{recorded} AP in session history{carried > 0 ? ` · ${carried} AP carried from earlier data` : ''}. Open a session below to inspect its gains.</Text>
        </View>;
      })}
    </SystemPanel>
  );
}

export function DirectiveHistoryPanel({ profile }: { profile: UserProfile }) {
  const [limit, setLimit] = useState(5);
  return (
    <SystemPanel eyebrow="DIRECTIVE TIMELINE" title="Corrective priorities">
      {profile.correctiveHistory.length === 0 ? <Text style={styles.copy}>Confirm a Corrective Profile to start this timeline.</Text> : profile.correctiveHistory.slice(0, limit).map((revision) => {
        const arc = profile.trainingArcs.find((item) => item.id === revision.trainingArcId);
        return <View key={revision.id} style={styles.detail}>
          <Text style={styles.label}>{revision.date?.slice(0, 10) ?? 'DATE UNAVAILABLE'}{arc ? ` · ARC ${arc.cycleNumber}` : ''}</Text>
          {revision.targets.length ? revision.targets.map((target) => <View key={target.goal} style={styles.target}>
            <Text style={styles.copy}>{target.priority === 'primary' ? '◆' : '◇'} {CORRECTIVE_GOAL_DETAILS[target.goal].label}</Text>
            <Text style={styles.note}>{target.priority.toUpperCase()} · {target.sources.map((source) => source.replaceAll('-', ' ')).join(', ')}</Text>
          </View>) : <Text style={styles.copy}>General training · no corrective priority</Text>}
          {revision.source === 'legacy-current' ? <Text style={styles.note}>Existing profile imported. Earlier changes were not recorded.</Text> : null}
        </View>;
      })}
      {profile.correctiveHistory.length > limit ? <GlowButton label="OLDER DIRECTIVES" variant="secondary" onPress={() => setLimit((value) => value + 10)} /> : null}
    </SystemPanel>
  );
}

export function ArcComparisonPanel({ profile }: { profile: UserProfile }) {
  const [latest, previous] = [...profile.trainingArcReviews].sort((a, b) => b.cycleNumber - a.cycleNumber);
  if (!latest || !previous) return null;
  const rows = [
    ['Adherence', `${Math.round(previous.adherence.rate * 100)}%`, `${Math.round(latest.adherence.rate * 100)}%`],
    ['Sessions', `${previous.adherence.completedSessions}/${previous.adherence.scheduledSessions}`, `${latest.adherence.completedSessions}/${latest.adherence.scheduledSessions}`],
    ['Checks improved', String(previous.movement.improved), String(latest.movement.improved)],
    ['Checks declined', String(previous.movement.declined), String(latest.movement.declined)],
    ['Too-hard sessions', String(previous.difficulty.tooHard), String(latest.difficulty.tooHard)],
    ['Protected days', String(previous.readiness.recovery + previous.readiness.hold), String(latest.readiness.recovery + latest.readiness.hold)],
  ];
  return <SystemPanel eyebrow="CYCLE COMPARISON" title={`Arc ${previous.cycleNumber} → Arc ${latest.cycleNumber}`} accent="purple">
    <View style={styles.row}><Text style={styles.cellLabel}>SIGNAL</Text><Text style={styles.cell}>ARC {previous.cycleNumber}</Text><Text style={styles.cell}>ARC {latest.cycleNumber}</Text></View>
    {rows.map(([label, before, after]) => <View key={label} style={styles.row}><Text style={styles.cellLabel}>{label}</Text><Text style={styles.cell}>{before}</Text><Text style={styles.cell}>{after}</Text></View>)}
    <Text style={styles.note}>Each movement change is relative to that cycle's own baseline. Protected days are recovery or hold scans. Original session targets can differ between cycles.</Text>
    {latest.adherence.targetSource !== 'cycle-start' || previous.adherence.targetSource !== 'cycle-start' ? <Text style={styles.note}>One or both session targets are legacy estimates.</Text> : null}
  </SystemPanel>;
}

const styles = StyleSheet.create({
  switches: { flexDirection: 'row', gap: spacing.sm },
  switch: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.line, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  selected: { borderColor: colors.primary, backgroundColor: 'rgba(41,182,255,0.12)' },
  chart: { flexDirection: 'row', marginTop: spacing.lg, gap: 4 },
  column: { flex: 1, alignItems: 'center', minHeight: 150 },
  track: { height: 98, width: '70%', justifyContent: 'flex-end', marginVertical: 8, backgroundColor: 'rgba(147,164,195,0.06)', borderRadius: 4, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 4 },
  barValue: { color: colors.text, fontSize: 12, fontWeight: '800' },
  barDate: { color: colors.textMuted, fontSize: 9 },
  label: { color: colors.text, fontSize: 11, fontWeight: '800', lineHeight: 18 },
  copy: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  note: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  detail: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.line, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  value: { flex: 1, color: colors.primary, fontSize: 12, textAlign: 'right', fontWeight: '800' },
  meter: { height: 5, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden', marginVertical: 6 },
  fill: { height: '100%', backgroundColor: colors.purple },
  target: { paddingVertical: 4 },
  cellLabel: { flex: 2, color: colors.textMuted, fontSize: 12 },
  cell: { flex: 1, color: colors.text, fontSize: 12, textAlign: 'right' },
});
