import { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { STAT_KEYS, type CompletionSummary, type StatKey } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { colors, radius, spacing } from '../theme.ts';

const STAT_CODES: Record<StatKey, string> = {
  strength: 'STR',
  endurance: 'END',
  agility: 'AGI',
  vitality: 'VIT',
  mobility: 'MOB',
};

export function CompletionReportScreen({ report, onContinue }: { report: CompletionSummary; onContinue: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const levelUp = report.levelAfter > report.levelBefore;
  const rankUp = report.rankAfter !== report.rankBefore;
  const gains = STAT_KEYS.filter((key) => report.statGains[key] > 0);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  const headline = rankUp ? 'RANK ASCENSION' : levelUp ? 'LEVEL UP' : 'REWARD REPORT';
  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.root}>
      <View style={styles.aura} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity, transform: [{ translateY }] }]}>
          <Text style={styles.system}>SYSTEM // RECORD UPDATED</Text>
          <Text style={[styles.headline, rankUp && styles.rankHeadline]}>{headline}</Text>
          <Text style={styles.protocol}>{report.planTitle}</Text>

          {rankUp ? (
            <View style={styles.ascensionPanel}>
              <Text style={styles.ascensionLabel}>HUNTER RANK</Text>
              <View style={styles.ascensionRow}><Text style={styles.rankValue}>{report.rankBefore}</Text><Text style={styles.arrow}>→</Text><Text style={[styles.rankValue, styles.rankValueNew]}>{report.rankAfter}</Text></View>
            </View>
          ) : levelUp ? (
            <View style={styles.ascensionPanel}>
              <Text style={styles.ascensionLabel}>CURRENT LEVEL</Text>
              <View style={styles.ascensionRow}><Text style={styles.levelValue}>{report.levelBefore}</Text><Text style={styles.arrow}>→</Text><Text style={[styles.levelValue, styles.levelValueNew]}>{report.levelAfter}</Text></View>
            </View>
          ) : null}

          <View style={styles.rewardPanel}>
            <Text style={styles.rewardLabel}>ENERGY ACQUIRED</Text>
            <Text style={styles.rewardValue}>+{report.xpEarned} XP</Text>
          </View>

          <Text style={styles.sectionLabel}>ATTRIBUTE DEVELOPMENT</Text>
          <View style={styles.gainsGrid}>
            {gains.length > 0 ? gains.map((key) => (
              <View key={key} style={styles.gainCard}><Text style={styles.gainCode}>{STAT_CODES[key]}</Text><Text style={styles.gainValue}>+{report.statGains[key]}</Text></View>
            )) : <Text style={styles.noGains}>No attribute increase in this protocol.</Text>}
          </View>

          {report.rankTrial && !rankUp ? <Text style={styles.trialNote}>Rank trial recorded. Ascension conditions remain active.</Text> : null}
          <GlowButton label="RETURN TO SYSTEM" onPress={onContinue} style={styles.button} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  aura: { position: 'absolute', alignSelf: 'center', top: 70, width: 420, height: 420, borderRadius: 210, backgroundColor: colors.purple, opacity: 0.09 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  content: { width: '100%', alignItems: 'center' },
  system: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 2.4 },
  headline: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', marginTop: spacing.lg },
  rankHeadline: { color: colors.purple, textShadowColor: colors.purple, textShadowRadius: 18 },
  protocol: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: spacing.sm },
  ascensionPanel: { width: '100%', alignItems: 'center', marginTop: spacing.xxl, padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(106,92,255,0.55)', backgroundColor: 'rgba(106,92,255,0.08)' },
  ascensionLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.7 },
  ascensionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl, marginTop: spacing.md },
  rankValue: { color: colors.textMuted, fontSize: 48, fontWeight: '900' },
  rankValueNew: { color: colors.purple, textShadowColor: colors.purple, textShadowRadius: 18 },
  levelValue: { color: colors.textMuted, fontSize: 42, fontWeight: '900' },
  levelValueNew: { color: colors.primary, textShadowColor: colors.primary, textShadowRadius: 18 },
  arrow: { color: colors.textDim, fontSize: 22, fontWeight: '700' },
  rewardPanel: { width: '100%', alignItems: 'center', marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(41,182,255,0.06)' },
  rewardLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  rewardValue: { color: colors.primary, fontSize: 26, fontWeight: '900', marginTop: 5 },
  sectionLabel: { alignSelf: 'flex-start', color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: spacing.xl, marginBottom: spacing.sm },
  gainsGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gainCard: { minWidth: 72, flexGrow: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(85,230,177,0.2)', backgroundColor: 'rgba(85,230,177,0.05)' },
  gainCode: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  gainValue: { color: colors.success, fontSize: 20, fontWeight: '900', marginTop: 4 },
  noGains: { color: colors.textMuted, fontSize: 11 },
  trialNote: { color: colors.warning, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: spacing.lg },
  button: { width: '100%', marginTop: spacing.xxl },
});
