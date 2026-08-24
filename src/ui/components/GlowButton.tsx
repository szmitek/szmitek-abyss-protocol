import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme.ts';

interface GlowButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}

export function GlowButton({ label, onPress, disabled = false, variant = 'primary', style }: GlowButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: '#7DD5FF',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  secondary: { backgroundColor: 'rgba(41, 182, 255, 0.08)', borderColor: colors.lineStrong, shadowOpacity: 0 },
  danger: { backgroundColor: colors.danger, borderColor: '#FF7287', shadowColor: colors.danger },
  disabled: { opacity: 0.38 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  label: { color: '#03101A', fontWeight: '900', fontSize: 14, letterSpacing: 1.6 },
  secondaryLabel: { color: colors.primary },
});
