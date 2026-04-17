import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme/theme';

export function LoadingState({ label = 'Loading workspace' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfacePrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
    padding: theme.spacing.xl
  },
  label: {
    color: theme.colors.textSecondary,
    ...theme.typography.body
  }
});
