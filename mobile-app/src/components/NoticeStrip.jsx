import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme/theme';

const noticePalette = {
  info: {
    backgroundColor: theme.colors.infoTint,
    color: '#155E75'
  },
  warning: {
    backgroundColor: theme.colors.warningTint,
    color: '#92400E'
  },
  danger: {
    backgroundColor: theme.colors.dangerTint,
    color: '#991B1B'
  },
  success: {
    backgroundColor: theme.colors.successTint,
    color: '#065F46'
  }
};

export function NoticeStrip({ tone = 'info', text }) {
  const palette = noticePalette[tone] || noticePalette.info;

  return (
    <View style={[styles.container, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.text, { color: palette.color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md
  },
  text: {
    ...theme.typography.body
  }
});
