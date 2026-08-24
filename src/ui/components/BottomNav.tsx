import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme.ts';

export type AppTab = 'system' | 'quests' | 'status' | 'progress';

const TABS: { id: AppTab; icon: string; label: string }[] = [
  { id: 'system', icon: '◇', label: 'SYSTEM' },
  { id: 'quests', icon: '◆', label: 'QUESTS' },
  { id: 'status', icon: '◈', label: 'STATUS' },
  { id: 'progress', icon: '⌁', label: 'PROGRESS' },
];

export function BottomNav({ active, onChange }: { active: AppTab; onChange: (tab: AppTab) => void }) {
  return (
    <View style={styles.shell}>
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onChange(tab.id)} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            <Text style={[styles.icon, selected && styles.selected]}>{tab.icon}</Text>
            <Text style={[styles.label, selected && styles.selected]}>{tab.label}</Text>
            {selected ? <View style={styles.indicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { position: 'absolute', bottom: 18, left: spacing.lg, right: spacing.lg, height: 72, flexDirection: 'row', borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(10,14,24,0.96)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
  icon: { color: colors.textDim, fontSize: 19, lineHeight: 22 },
  label: { color: colors.textDim, fontSize: 7, fontWeight: '900', letterSpacing: 0.9, marginTop: 4 },
  selected: { color: colors.primary, textShadowColor: colors.primary, textShadowRadius: 8 },
  indicator: { position: 'absolute', top: 0, width: 24, height: 2, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 1, shadowRadius: 6 },
});
