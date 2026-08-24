import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme.ts';

interface SystemPanelProps extends PropsWithChildren {
  eyebrow?: string;
  title?: string;
  trailing?: ReactNode;
  style?: ViewStyle;
  accent?: 'blue' | 'purple' | 'danger';
}

export function SystemPanel({ eyebrow, title, trailing, children, style, accent = 'blue' }: SystemPanelProps) {
  return (
    <View style={[styles.panel, accent === 'purple' && styles.purple, accent === 'danger' && styles.danger, style]}>
      {(eyebrow || title || trailing) && (
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
          </View>
          {trailing}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.11,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  purple: { borderColor: 'rgba(106, 92, 255, 0.4)' },
  danger: { borderColor: 'rgba(226, 61, 87, 0.42)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 2.2, marginBottom: 3 },
  title: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: 0.4 },
});
