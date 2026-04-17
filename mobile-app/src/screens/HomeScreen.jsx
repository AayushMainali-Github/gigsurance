import { View } from 'react-native';
import { InfoPanel } from '../components/InfoPanel';
import { ScreenShell } from '../components/ScreenShell';
import { StatCard } from '../components/StatCard';
import { theme } from '../lib/theme/theme';

export function HomeScreen() {
  return (
    <ScreenShell
      eyebrow="Worker Dashboard"
      title="GIGSurance"
      description="Worker-facing home for coverage, weekly premium, and payout status."
    >
      <View style={{ gap: theme.spacing.lg }}>
        <StatCard
          eyebrow="Current Coverage"
          title="Active"
          value="Protected"
          note="The mobile home will prioritize weekly coverage, latest payout state, and premium visibility."
          tone="success"
        />
        <StatCard
          eyebrow="Weekly Premium"
          title="Preview"
          value="Pending"
          note="Delivery-denominated pricing will only be shown when the backend returns it cleanly."
          tone="primary"
        />
      </View>
      <InfoPanel
        title="Phase 4-5 scaffold"
        body="This app shell is intentionally minimal. Next phases will wire auth, worker linking, policy activation, premium visibility, and payout history to backend endpoints."
        tone="info"
        badgeLabel="Scaffold"
      />
    </ScreenShell>
  );
}
