import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme/theme';
import { PrimaryButton } from './PrimaryButton';

export function ErrorState({ title, body, actionLabel, onAction }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? <PrimaryButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surfacePrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    gap: theme.spacing.md
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
