import { StyleSheet, Text, View } from 'react-native';

import { weeklySessionStatus, type SessionStatus } from '../../domain/protocolSchedule.ts';
import type { ActiveWorkout, UserProfile, WeeklyProtocol, WorkoutHistoryEntry } from '../../domain/types.ts';
import { colors, radius, spacing } from '../theme.ts';
import { SystemPanel } from './SystemPanel.tsx';

const STATE_LABELS: Record<SessionStatus, string> = {
  cleared: 'CLEARED',
  trained: 'TRAINED · OTHER PROTOCOL',
  active: 'IN PROGRESS',
  ready: 'READY',
  readiness: 'READINESS REQUIRED',
  missed: 'MISSED · NO COMPLETION LOG',
  recovery: 'READINESS RECOVERY',
  hold: 'READINESS HOLD',
  unavailable: 'UNAVAILABLE',
  queued: 'QUEUED',
};

export function WeeklyProtocolPanel({ protocol, profile, history, today, activeWorkout }: { protocol: WeeklyProtocol; profile: UserProfile; history: WorkoutHistoryEntry[]; today: string; activeWorkout: ActiveWorkout | null }) {
  const sessions = protocol.sessions.map((session) => ({ session, state: weeklySessionStatus(session, profile, history, today, activeWorkout) }));
  const missed = sessions.filter(({ state }) => state === 'missed').length;
  const codes = protocol.sessions.map((session) => session.code).join(' / ');
  const arcLabel = protocol.trainingArcCycle && protocol.trainingArcWeek
    ? `ARC ${protocol.trainingArcCycle} // WEEK ${protocol.trainingArcWeek}`
    : 'SYSTEM MICRO-CYCLE';

  return (
    <SystemPanel eyebrow="WEEKLY PROTOCOL" title={codes} accent="purple" trailing={<Text style={styles.arc}>{arcLabel}</Text>}>
      <Text style={styles.intro}>The System has locked the weekly structure. Daily Readiness may reduce a session or replace it with recovery, but it will not redraw the micro-cycle.</Text>
      {missed > 0 ? <Text style={styles.intro}>{missed} past {missed === 1 ? 'session has' : 'sessions have'} no completion log. Continue with the next scheduled protocol. Missed work is not added to later days.</Text> : null}
      <View style={styles.sessions}>
        {sessions.map(({ session, state }) => {
          const current = session.dateKey === today && ['active', 'ready', 'readiness'].includes(state);
          const cleared = state === 'cleared' || state === 'trained';
          const weekday = new Date(`${session.dateKey}T12:00:00`).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
          return (
            <View key={session.dateKey} style={[styles.session, current && styles.current, cleared && styles.cleared]}>
              <View style={[styles.code, current && styles.codeCurrent]}><Text style={styles.codeText}>{session.code}</Text></View>
              <View style={styles.copy}>
                <Text style={styles.title}>{session.title}</Text>
                <Text style={styles.objective}>{weekday} · {session.objective}</Text>
                <Text style={[styles.state, current && styles.stateCurrent, cleared && styles.stateCleared]}>{STATE_LABELS[state]}</Text>
              </View>
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
  state: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 0.6, marginTop: 6 },
  stateCurrent: { color: colors.purple },
  stateCleared: { color: colors.success },
  contract: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 0.55, lineHeight: 13, marginTop: spacing.md, textAlign: 'center' },
});
