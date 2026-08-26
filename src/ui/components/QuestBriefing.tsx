import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EQUIPMENT, type WorkoutPlan } from '../../domain/types.ts';
import { GlowButton } from './GlowButton.tsx';
import { colors, radius, spacing } from '../theme.ts';

interface QuestBriefingProps {
  visible: boolean;
  plan: WorkoutPlan | null;
  onAccept: () => void;
  onClose: () => void;
}

export function QuestBriefing({ visible, plan, onAccept, onClose }: QuestBriefingProps) {
  if (!plan) return null;
  const bodyweightOnly = plan.exercises.every(({ exercise }) =>
    exercise.requiredEquipment.length === 1 && exercise.requiredEquipment[0] === EQUIPMENT.NONE,
  );

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.backdrop}>
        <View style={styles.aura} />
        <View style={styles.panel}>
          <View style={styles.topSignal}><View style={styles.topLine} /><Text style={styles.topCode}>SYSTEM // DIRECTIVE</Text><View style={styles.topLine} /></View>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.alertIcon}><Text style={styles.alertIconText}>!</Text></View>
            <Text style={styles.title}>QUEST INFO</Text>
            <Text style={styles.protocol}>{plan.title}</Text>
            <Text style={styles.summary}>[A {plan.estimatedMinutes}-minute {plan.focus.toLowerCase()} protocol calibrated to your current parameters and registered loadout.]</Text>

            <View style={styles.verificationRow}>
              <Text style={styles.verificationLabel}>LOADOUT</Text>
              <Text style={styles.verificationValue}>{bodyweightOnly ? 'BODYWEIGHT // VERIFIED' : 'EQUIPMENT // VERIFIED'}</Text>
            </View>

            <View style={styles.sequenceList}>
              {plan.exercises.map((item, index) => (
                <View key={item.exercise.id} style={styles.sequence}>
                  <Text style={styles.sequenceIndex}>{`${index + 1}`.padStart(2, '0')}</Text>
                  <View style={styles.sequenceCopy}>
                    <Text style={styles.sequenceName}>{item.exercise.name}</Text>
                    <Text style={styles.sequenceMeta}>{item.selectionReasons?.map((reason) => reason.label).join(' · ') ?? item.exercise.primaryMuscle.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.sequenceTarget}>{item.sets} × {item.target}{item.exercise.repType === 'seconds' ? ' SEC' : ''}</Text>
                </View>
              ))}
            </View>

            <View style={styles.rewardBox}>
              <Text style={styles.rewardLabel}>CLEAR REWARD</Text>
              <Text style={styles.rewardValue}>+{plan.rewardXp} XP</Text>
            </View>

            <View style={styles.safeguard}>
              <Text style={styles.safeguardTitle}>SYSTEM SAFEGUARD</Text>
              <Text style={styles.safeguardCopy}>Stop if you feel pain, dizziness, or unusual shortness of breath. Leaving an unfinished quest carries no penalty.</Text>
            </View>

            <GlowButton label="ACCEPT DIRECTIVE" onPress={onAccept} style={styles.accept} />
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.backButton}>
              <Text style={styles.backText}>RETURN TO SYSTEM</Text>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(0,2,8,0.94)' },
  aura: { position: 'absolute', alignSelf: 'center', width: 410, height: 410, borderRadius: 205, backgroundColor: colors.blue, opacity: 0.08 },
  panel: {
    maxHeight: '92%',
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(103,202,255,0.72)',
    backgroundColor: 'rgba(8,15,26,0.98)',
    shadowColor: colors.primary,
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 18,
  },
  topSignal: { height: 30, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: spacing.md, backgroundColor: 'rgba(41,182,255,0.06)' },
  topLine: { flex: 1, height: 1, backgroundColor: colors.line },
  topCode: { color: colors.primary, fontSize: 6, fontWeight: '900', letterSpacing: 1.5 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  alertIcon: { alignSelf: 'center', width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.text, shadowColor: colors.primary, shadowOpacity: 0.7, shadowRadius: 12 },
  alertIconText: { color: colors.text, fontSize: 27, fontWeight: '500', lineHeight: 30 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', letterSpacing: 1.8, textAlign: 'center', marginTop: spacing.md },
  protocol: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.8, textAlign: 'center', marginTop: 5 },
  summary: { color: colors.text, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.sm },
  verificationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: 'rgba(85,230,177,0.06)', borderWidth: 1, borderColor: 'rgba(85,230,177,0.2)' },
  verificationLabel: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  verificationValue: { color: colors.success, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  sequenceList: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(147,164,195,0.14)' },
  sequence: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(147,164,195,0.1)' },
  sequenceIndex: { width: 28, color: colors.primary, fontSize: 9, fontWeight: '900' },
  sequenceCopy: { flex: 1, paddingRight: spacing.sm },
  sequenceName: { color: colors.text, fontSize: 11, fontWeight: '800' },
  sequenceMeta: { color: colors.primary, fontSize: 6, lineHeight: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 3 },
  sequenceTarget: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  rewardBox: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(41,182,255,0.06)' },
  rewardLabel: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1.4 },
  rewardValue: { color: colors.primary, fontSize: 21, fontWeight: '900', marginTop: 3, textShadowColor: colors.primary, textShadowRadius: 9 },
  safeguard: { marginTop: spacing.md, padding: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.warning, backgroundColor: 'rgba(248,200,106,0.05)' },
  safeguardTitle: { color: colors.warning, fontSize: 7, fontWeight: '900', letterSpacing: 1.3 },
  safeguardCopy: { color: colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 4 },
  accept: { marginTop: spacing.lg },
  backButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  backText: { color: colors.textDim, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
});
