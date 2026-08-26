import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { buildCorrectiveProfile, CORRECTIVE_GOAL_DETAILS, suggestCorrectiveTargets } from '../../domain/correctiveProfile.ts';
import { CORRECTIVE_GOALS, type CorrectiveEvidenceSource, type CorrectiveGoal, type CorrectiveProfile, type UserProfile } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

interface CorrectiveProfileScreenProps {
  profile: UserProfile;
  onBack: () => void;
  onSave: (profile: CorrectiveProfile) => void;
}

const SOURCE_LABELS: Record<CorrectiveEvidenceSource, string> = {
  'self-observation': 'PLAYER INPUT',
  'player-scan': 'PLAYER SCAN',
  'movement-analysis': 'MOVEMENT',
  'posture-archive': 'VISUAL RECORD',
};

export function CorrectiveProfileScreen({ profile, onBack, onSave }: CorrectiveProfileScreenProps) {
  const suggestions = useMemo(() => suggestCorrectiveTargets(profile), [profile]);
  const suggestionMap = useMemo(() => new Map(suggestions.map((target) => [target.goal, target.sources])), [suggestions]);
  const initialGoals = profile.correctiveProfile.configured
    ? profile.correctiveProfile.targets.map((target) => target.goal)
    : suggestions.map((target) => target.goal);
  const initialPrimary = profile.correctiveProfile.targets.find((target) => target.priority === 'primary')?.goal ?? initialGoals[0] ?? null;
  const [selected, setSelected] = useState<CorrectiveGoal[]>(initialGoals);
  const [primary, setPrimary] = useState<CorrectiveGoal | null>(initialPrimary);

  const toggle = (goal: CorrectiveGoal) => {
    const next = selected.includes(goal) ? selected.filter((item) => item !== goal) : [...selected, goal];
    setSelected(next);
    if (primary === goal && !next.includes(goal)) setPrimary(next[0] ?? null);
    else if (!primary && next.includes(goal)) setPrimary(goal);
  };

  const save = (goals = selected) => onSave(buildCorrectiveProfile(profile, goals, primary && goals.includes(primary) ? primary : goals[0] ?? null));

  return (
    <Screen
      eyebrow="SYSTEM // CORRECTIVE DIRECTIVE"
      title="Player Profile"
      subtitle="Choose what the next Training Arcs should develop. These are training priorities—not diagnoses from a photo or a self-report."
    >
      <View style={styles.safeguard}>
        <Text style={styles.safeguardMark}>!</Text>
        <View style={styles.safeguardCopy}>
          <Text style={styles.safeguardTitle}>SAFETY OVERRIDES EVERY TARGET</Text>
          <Text style={styles.safeguardText}>Pain, warning signals and clinician restrictions can remove an exercise even when it matches your primary directive.</Text>
        </View>
      </View>

      {suggestions.length > 0 ? (
        <SystemPanel eyebrow="SIGNAL FUSION" title={`${suggestions.length} System suggestion${suggestions.length === 1 ? '' : 's'}`} accent="purple">
          <Text style={styles.info}>Suggestions come only from the Player Scan and limited Movement Analysis checks. A posture photo remains a private comparison record until you confirm a target yourself.</Text>
        </SystemPanel>
      ) : null}

      <View style={styles.targetList}>
        {CORRECTIVE_GOALS.map((goal) => {
          const details = CORRECTIVE_GOAL_DETAILS[goal];
          const active = selected.includes(goal);
          const isPrimary = primary === goal && active;
          const sources = suggestionMap.get(goal) ?? [];
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${details.label}. ${details.detail}`}
              key={goal}
              onPress={() => toggle(goal)}
              style={({ pressed }) => [styles.target, active && styles.targetActive, isPrimary && styles.targetPrimary, pressed && styles.pressed]}
            >
              <View style={[styles.marker, active && styles.markerActive]}><Text style={[styles.markerText, active && styles.markerTextActive]}>{active ? '◆' : '◇'}</Text></View>
              <View style={styles.targetCopy}>
                <View style={styles.targetHeader}>
                  <Text style={[styles.targetName, active && styles.targetNameActive]}>{details.label.toUpperCase()}</Text>
                  {isPrimary ? <Text style={styles.primaryBadge}>PRIMARY</Text> : sources.length > 0 ? <Text style={styles.suggestedBadge}>SUGGESTED</Text> : null}
                </View>
                <Text style={styles.targetDetail}>{details.detail}</Text>
                {sources.length > 0 ? <Text style={styles.sources}>{sources.map((source) => SOURCE_LABELS[source]).join(' + ')}</Text> : null}
                {active && !isPrimary ? (
                  <Pressable accessibilityRole="button" onPress={(event) => { event.stopPropagation(); setPrimary(goal); }} style={styles.makePrimary}>
                    <Text style={styles.makePrimaryText}>SET AS PRIMARY DIRECTIVE</Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <SystemPanel eyebrow="GENERATOR CONTRACT" title={selected.length > 0 ? `${selected.length} active target${selected.length === 1 ? '' : 's'}` : 'General training only'}>
        <Text style={styles.info}>{selected.length > 0 ? 'Each normal protocol will reserve corrective capacity where compatible. The primary directive receives the strongest bias; support targets rotate to prevent monotony.' : 'No corrective bias will be added. Goal, recovery, equipment and movement rules still apply.'}</Text>
      </SystemPanel>

      <GlowButton label={selected.length > 0 ? 'SEAL CORRECTIVE PROFILE' : 'SELECT A DIRECTIVE'} disabled={selected.length === 0} onPress={() => save()} />
      <GlowButton label="USE GENERAL PROFILE" variant="secondary" onPress={() => save([])} />
      <GlowButton label="RETURN TO STATUS" variant="secondary" onPress={onBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeguard: { minHeight: 88, flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(248,200,106,0.3)', backgroundColor: 'rgba(248,200,106,0.06)' },
  safeguardMark: { width: 38, color: colors.warning, fontSize: 30, fontWeight: '900', textAlign: 'center', marginRight: spacing.md },
  safeguardCopy: { flex: 1 },
  safeguardTitle: { color: colors.warning, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  safeguardText: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  info: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  targetList: { gap: spacing.md },
  target: { flexDirection: 'row', minHeight: 112, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(147,164,195,0.16)', backgroundColor: 'rgba(14,19,32,0.8)' },
  targetActive: { borderColor: colors.lineStrong, backgroundColor: 'rgba(41,182,255,0.07)' },
  targetPrimary: { borderColor: 'rgba(106,92,255,0.75)', backgroundColor: 'rgba(106,92,255,0.1)' },
  marker: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(147,164,195,0.22)', marginRight: spacing.md },
  markerActive: { borderColor: colors.lineStrong },
  markerText: { color: colors.textDim, fontSize: 16 },
  markerTextActive: { color: colors.primary },
  targetCopy: { flex: 1 },
  targetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  targetName: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
  targetNameActive: { color: colors.primary },
  targetDetail: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  primaryBadge: { color: colors.purple, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  suggestedBadge: { color: colors.success, fontSize: 7, fontWeight: '900', letterSpacing: 0.6 },
  sources: { color: colors.success, fontSize: 7, fontWeight: '900', letterSpacing: 0.8, marginTop: spacing.sm },
  makePrimary: { alignSelf: 'flex-start', marginTop: spacing.md, paddingVertical: spacing.sm, paddingRight: spacing.md },
  makePrimaryText: { color: colors.purple, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  pressed: { opacity: 0.74 },
});
