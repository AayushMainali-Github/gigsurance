import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme/theme';
import { StatusBadge } from './StatusBadge';

export function DataListItem({ label, value, meta, tone = 'neutral', badgeLabel }) {
  return (
    <View style={styles.item}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
      {badgeLabel ? <StatusBadge tone={tone} label={badgeLabel} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: theme.colors.surfacePrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md
  },
  copy: {
    gap: theme.spacing.xs
  },
  label: {
    color: theme.colors.textMuted,
    ...theme.typography.meta
  },
  value: {
    color: theme.colors.textPrimary,
    ...theme.typography.bodyStrong
  },
  meta: {
    color: theme.colors.textSecondary,
    lineHeight: 18,
    ...theme.typography.meta
  }
});
