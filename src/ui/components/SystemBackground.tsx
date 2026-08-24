import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme.ts';

export function SystemBackground({ children }: PropsWithChildren) {
  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={[styles.aura, styles.auraTop]} />
      <View pointerEvents="none" style={[styles.aura, styles.auraBottom]} />
      <View pointerEvents="none" style={styles.gridLineA} />
      <View pointerEvents="none" style={styles.gridLineB} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  aura: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: colors.blue, opacity: 0.075 },
  auraTop: { top: -190, right: -130 },
  auraBottom: { bottom: -230, left: -160, backgroundColor: colors.purple },
  gridLineA: { position: 'absolute', top: 185, left: -50, width: 240, height: 1, backgroundColor: colors.line, opacity: 0.25, transform: [{ rotate: '-34deg' }] },
  gridLineB: { position: 'absolute', bottom: 210, right: -60, width: 280, height: 1, backgroundColor: colors.line, opacity: 0.2, transform: [{ rotate: '-34deg' }] },
});
