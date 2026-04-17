import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme/theme';

const badgeStyles = {
  primary: theme.badges.primary,
  success: theme.badges.success,
  warning: theme.badges.warning,
  danger: theme.badges.danger,
  info: theme.badges.info,
  accent: theme.badges.accent,
  neutral: theme.badges.neutral
};

export function StatusBadge({ tone = 'neutral', label }) {
  const palette = badgeStyles[tone] || badgeStyles.neutral;

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.label, { color: palette.textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.sm
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
    fontWeight: '600'
  }
});
