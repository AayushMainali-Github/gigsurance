import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme/theme';
import { StatusBadge } from './StatusBadge';

export function StatCard({ eyebrow, title, value, note, tone = 'primary' }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <StatusBadge tone={tone} label={title} />
      </View>
      <Text style={styles.value}>{value}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
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
  header: {
    gap: theme.spacing.sm
  },
  eyebrow: {
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    ...theme.typography.eyebrow
  },
  value: {
    color: theme.colors.textPrimary,
    ...theme.typography.metric
  },
  note: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
    ...theme.typography.body
  }
});
