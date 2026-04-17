import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../lib/theme/theme';

export function PrimaryButton({ label, onPress, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null
      ]}
    >
      <Text style={[styles.label, disabled ? styles.labelDisabled : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md
  },
  buttonPressed: {
    opacity: 0.9
  },
  buttonDisabled: {
    backgroundColor: theme.colors.surfaceSecondary
  },
  label: {
    color: theme.colors.surfacePrimary,
    ...theme.typography.bodyStrong
  },
  labelDisabled: {
    color: theme.colors.textMuted
  }
});
