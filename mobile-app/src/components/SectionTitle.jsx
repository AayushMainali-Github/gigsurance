import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme/theme';

export function SectionTitle({ eyebrow, title, meta }) {
  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs
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
  meta: {
    color: theme.colors.textSecondary,
    ...theme.typography.meta
  }
});
