import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme/theme';
import { PrimaryButton } from './PrimaryButton';

export function ActionCard({ eyebrow, title, body, actionLabel, onPress }) {
  return (
    <View style={styles.card}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel ? <PrimaryButton label={actionLabel} onPress={onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfacePrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    ...theme.elevation.card
  },
  eyebrow: {
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    ...theme.typography.eyebrow
  },
  title: {
    color: theme.colors.textPrimary,
    ...theme.typography.section
  },
  body: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
    ...theme.typography.body
  }
});
