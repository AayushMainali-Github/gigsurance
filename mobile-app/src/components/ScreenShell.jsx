import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../lib/theme/theme';
import { HeaderBlock } from './HeaderBlock';

export function ScreenShell({ eyebrow, title, description, rightSlot, children }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <HeaderBlock eyebrow={eyebrow} title={title} description={description} rightSlot={rightSlot} />
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
  content: {
    flex: 1,
    gap: theme.spacing.lg
  }
});
