import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme/theme';

export function HeaderBlock({ eyebrow, title, description, rightSlot }) {
  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.xxl,
    gap: theme.spacing.md
  },
  copy: {
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
  rightSlot: {
    alignSelf: 'flex-start'
  }
});
