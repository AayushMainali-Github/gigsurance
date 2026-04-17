import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme/theme';

export function ScreenShell({ eyebrow, title, description, children }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.pageBackground
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg
  },
  header: {
    marginBottom: theme.spacing.xxl,
    gap: theme.spacing.sm
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    ...theme.typography.eyebrow
  },
  title: {
    color: theme.colors.textPrimary,
    ...theme.typography.title
  },
  description: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
    ...theme.typography.body
  },
  content: {
    flex: 1,
    gap: theme.spacing.lg
  }
});
