import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { toDateKey } from '../../domain/date.ts';
import { trainingGate } from '../../domain/generator.ts';
import { lastNormalWorkout, returnPlanActive, returnProgress, RETURN_SESSIONS } from '../../domain/returnTraining.ts';
import type { AppSnapshot } from '../../domain/types.ts';
import { colors, spacing } from '../theme.ts';
import { GlowButton } from './GlowButton.tsx';
import { SystemPanel } from './SystemPanel.tsx';

export function ReturnPlanPanel({ snapshot, onSave }: { snapshot: AppSnapshot; onSave: (dateKey: string, expectedId: string | null, action: 'start' | 'end') => void }) {
  const [review, setReview] = useState<{ dateKey: string; id: string | null; action: 'start' | 'end' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const profile = snapshot.profile!, now = new Date(), today = toDateKey(now);
  const active = returnPlanActive(profile), last = lastNormalWorkout(snapshot.history, now);
  const count = returnProgress(profile, snapshot.history, now);
  const blocked = Boolean(snapshot.activeWorkout || snapshot.pendingArcReviewId || trainingGate(profile, today));
  if (!last && !profile.returnPlan) return null;
  const open = () => { setError(null); setReview({ dateKey: today, id: profile.returnPlan?.id ?? null, action: active ? 'end' : 'start' }); };
  const confirm = () => {
    if (!review) return;
    try { onSave(review.dateKey, review.id, review.action); setReview(null); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Review the current plan and try again.'); }
  };
  return <SystemPanel eyebrow="TRAINING CONTINUITY" title={active ? count >= RETURN_SESSIONS ? 'Return block ready for review' : 'Return plan active' : 'Returning after a break?'} accent="purple">
    {active ? <Text style={styles.copy}>{count} / {RETURN_SESSIONS} training days completed. At most two work sets per exercise, minimum rep/time targets and no automatic progression or Rank Trials. Readiness may reduce this further. Choose your own kilograms.</Text>
      : <Text style={styles.copy}>{last ? `Last completed training: ${last.dateKey}. ` : ''}Choose a lighter entry block when you return. Nothing changes until you confirm.</Text>}
    {active && count >= RETURN_SESSIONS ? <Text style={styles.copy}>Limits stay active until you review and confirm the end of this block.</Text> : null}
    {blocked ? <Text style={styles.copy}>Finish or close the open workout and complete required Player checks before changing this plan.</Text> : null}
    {review ? <View style={styles.actions}>
      <Text style={styles.copy}>{review.action === 'start'
        ? 'Keep your scheduled days. For three completed training days, work is capped at two sets and minimum targets, with difficulty at most 2. Skipped days do not advance the block. Existing safety and arc restrictions still apply.'
        : count >= RETURN_SESSIONS ? 'End the return block? Your next unstarted protocol will use normal arc and readiness rules. New training evidence will be required before progression resumes.' : 'End this block early? The next unstarted protocol will use normal arc and readiness rules. Pre-break and return-block records will not authorize new progression.'}</Text>
      <Text style={styles.copy}>History, rank and earned progress are retained. This does not choose a starting weight.</Text>
      <GlowButton label={review.action === 'start' ? 'CONFIRM RETURN PLAN' : 'CONFIRM END OF BLOCK'} disabled={blocked} onPress={confirm} />
      <GlowButton label="CANCEL" variant="secondary" onPress={() => { setReview(null); setError(null); }} />
    </View> : <GlowButton label={active ? 'REVIEW RETURN BLOCK' : 'REVIEW RETURN PLAN'} variant="secondary" disabled={blocked || (!active && !last)} onPress={open} />}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </SystemPanel>;
}

const styles = StyleSheet.create({
  copy: { color: colors.textMuted, fontSize: 12, lineHeight: 19, marginBottom: spacing.md },
  actions: { gap: spacing.sm },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.md },
});
