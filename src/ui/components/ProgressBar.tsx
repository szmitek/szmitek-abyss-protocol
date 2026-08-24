import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme.ts';

export function ProgressBar({ progress, danger = false }: { progress: number; danger?: boolean }) {
  const normalized = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, danger && styles.danger, { width: `${normalized * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 7, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: 'rgba(147, 164, 195, 0.14)' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 8 },
  danger: { backgroundColor: colors.danger, shadowColor: colors.danger },
});
