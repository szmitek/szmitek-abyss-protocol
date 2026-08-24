import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme.ts';

interface ScreenProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  scroll?: boolean;
}

export function Screen({ eyebrow = 'SYSTEM', title, subtitle, action, scroll = true, children }: ScreenProps) {
  const body = (
    <>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      <View style={styles.content}>{children}</View>
    </>
  );
  if (!scroll) return <View style={styles.root}>{body}</View>;
  return <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>{body}</ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: 116 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingTop: 58, paddingBottom: spacing.xl },
  copy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
});
