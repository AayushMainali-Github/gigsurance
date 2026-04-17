import { InfoPanel } from '../components/InfoPanel';
import { ScreenShell } from '../components/ScreenShell';
import { StatCard } from '../components/StatCard';
import { View } from 'react-native';
import { theme } from '../lib/theme/theme';

export function ProfileScreen() {
  return (
    <ScreenShell
      eyebrow="Account"
      title="Profile"
      description="This screen will contain account details, linked worker summary, and sign-out/session controls."
    >
      <View style={{ gap: theme.spacing.lg }}>
        <StatCard
          eyebrow="App Boundary"
          title="Worker App"
          value="Focused"
          note="The mobile app stays limited to worker identity, coverage, payouts, and account state."
          tone="info"
        />
      </View>
      <InfoPanel
        title="Boundary"
        body="Operator finance, fraud queues, admin overrides, and monitoring surfaces are intentionally excluded from the worker app."
        tone="danger"
        badgeLabel="Excluded"
      />
    </ScreenShell>
  );
}
