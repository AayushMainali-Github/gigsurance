import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme/theme';

export function EmptyState({ title, body }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm
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
