import { StyleSheet, Text, View } from 'react-native';

import { toDateKey } from '../../domain/date.ts';
import type { WeeklyProtocol, WorkoutHistoryEntry } from '../../domain/types.ts';
import { colors, radius, spacing } from '../theme.ts';
import { SystemPanel } from './SystemPanel.tsx';

function sessionState(dateKey: string, planId: string, completedPlanIds: ReadonlySet<string>, completedDateKeys: ReadonlySet<string>, today: string): 'cleared' | 'current' | 'closed' | 'queued' {
  if (completedPlanIds.has(planId) || completedDateKeys.has(dateKey)) return 'cleared';
  if (dateKey === today) return 'current';
  return dateKey < today ? 'closed' : 'queued';
}

const STATE_LABELS = {
  cleared: 'CLEARED',
  current: 'ACTIVE',
  closed: 'CLOSED',
  queued: 'QUEUED',
} as const;

export function WeeklyProtocolPanel({ protocol, history }: { protocol: WeeklyProtocol; history: WorkoutHistoryEntry[] }) {
  const today = toDateKey(new Date());
  const completedEntries = history.filter((entry) => entry.completed && !entry.planId.startsWith('rank-trial-'));
  const completedPlanIds = new Set(completedEntries.map((entry) => entry.planId));
  const completedDateKeys = new Set(completedEntries.map((entry) => entry.dateKey));
  const codes = protocol.sessions.map((session) => session.code).join(' / ');
  const arcLabel = protocol.trainingArcCycle && protocol.trainingArcWeek
    ? `ARC ${protocol.trainingArcCycle} // WEEK ${protocol.trainingArcWeek}`
    : 'SYSTEM MICRO-CYCLE';

  return (
    <SystemPanel eyebrow="WEEKLY PROTOCOL" title={codes} accent="purple" trailing={<Text style={styles.arc}>{arcLabel}</Text>}>
      <Text style={styles.intro}>The System has locked the weekly structure. Daily Readiness may reduce a session or replace it with recovery, but it will not redraw the micro-cycle.</Text>
      <View style={styles.sessions}>
        {protocol.sessions.map((session) => {
          const state = sessionState(session.dateKey, session.plan.id, completedPlanIds, completedDateKeys, today);
          const weekday = new Date(`${session.dateKey}T12:00:00`).toLocaleDateString('en', { weekday: 'short' }).toUpperCase();
          return (
            <View key={session.plan.id} style={[styles.session, state === 'current' && styles.current, state === 'cleared' && styles.cleared]}>
              <View style={[styles.code, state === 'current' && styles.codeCurrent]}><Text style={styles.codeText}>{session.code}</Text></View>
              <View style={styles.copy}>
                <Text style={styles.title}>{session.title}</Text>
                <Text style={styles.objective}>{weekday} · {session.objective}</Text>
              </View>
              <Text style={[styles.state, state === 'current' && styles.stateCurrent, state === 'cleared' && styles.stateCleared]}>{STATE_LABELS[state]}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.contract}>{protocol.sessions.length} SESSIONS · MUSCLE VOLUME CEILINGS ACTIVE · CORRECTIVE CAPACITY RESERVED</Text>
    </SystemPanel>
  );
}

const styles = StyleSheet.create({
  arc: { color: colors.purple, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  intro: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginBottom: spacing.md },
  sessions: { gap: spacing.sm },
  session: { minHeight: 62, flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(147,164,195,0.13)', backgroundColor: 'rgba(7,9,15,0.35)' },
  current: { borderColor: 'rgba(106,92,255,0.7)', backgroundColor: 'rgba(106,92,255,0.1)' },
  cleared: { borderColor: 'rgba(85,230,177,0.28)', backgroundColor: 'rgba(85,230,177,0.04)' },
  code: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(147,164,195,0.24)', marginRight: spacing.md },
  codeCurrent: { borderColor: colors.purple, shadowColor: colors.purple, shadowOpacity: 0.35, shadowRadius: 8 },
  codeText: { color: colors.text, fontSize: 14, fontWeight: '900' },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  objective: { color: colors.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 0.45, marginTop: 4 },
  state: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  stateCurrent: { color: colors.purple },
  stateCleared: { color: colors.success },
  contract: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 0.55, lineHeight: 13, marginTop: spacing.md, textAlign: 'center' },
});
