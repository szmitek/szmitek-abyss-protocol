import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../state/AppStore.tsx';
import { GlowButton } from './GlowButton.tsx';
import { colors, spacing } from '../theme.ts';

export function StorageNotice() {
  const { saveError, retrySave, saving, restoring } = useAppStore();
  if (!saveError) return null;
  return <SafeAreaView edges={['top']} style={styles.container}><View style={styles.content}><Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.text}>SAVE FAILED · {saveError}</Text><GlowButton label={saving ? 'SAVING...' : 'RETRY SAVE'} variant="danger" disabled={saving || restoring} onPress={retrySave} /></View></SafeAreaView>;
}
const styles = StyleSheet.create({
  container: { backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, borderBottomWidth: 1, borderColor: colors.danger },
  text: { color: colors.danger, fontSize: 13, lineHeight: 19 },
});
