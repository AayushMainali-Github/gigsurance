import { View } from 'react-native';
import { InfoPanel } from '../components/InfoPanel';
import { ScreenShell } from '../components/ScreenShell';
import { StatCard } from '../components/StatCard';
import { theme } from '../lib/theme/theme';

export function PayoutsScreen() {
  return (
    <ScreenShell
      eyebrow="Payouts"
      title="Protected Income"
      description="This screen will surface payout decisions and payout transaction status for the worker."
    >
      <View style={{ gap: theme.spacing.lg }}>
        <StatCard
          eyebrow="Latest Payout"
          title="Status"
          value="Review-Aware"
          note="Held, approved, failed, or not eligible states will be shown without exposing internal operator tooling."
          tone="warning"
        />
      </View>
      <InfoPanel
        title="Current intent"
        body="The mobile app will reflect backend payout states such as approved, held, failed, or not eligible without exposing internal review tooling."
        tone="warning"
        badgeLabel="Worker Safe"
      />
    </ScreenShell>
  );
}
