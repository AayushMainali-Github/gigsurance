import { InfoPanel } from '../components/InfoPanel';
import { ScreenShell } from '../components/ScreenShell';
import { StatCard } from '../components/StatCard';
import { View } from 'react-native';
import { theme } from '../lib/theme/theme';

export function CoverageScreen() {
  return (
    <ScreenShell
      eyebrow="Coverage"
      title="Policy And Protection"
      description="This screen will hold linked worker identity, policy status, and weekly premium details."
    >
      <View style={{ gap: theme.spacing.lg }}>
        <StatCard
          eyebrow="Policy Status"
          title="Coverage"
          value="Ready"
          note="Active, paused, and cancelled policy states will be rendered here in a worker-safe format."
          tone="primary"
        />
      </View>
      <InfoPanel
        title="Planned scope"
        body="Coverage state will be built on top of the existing worker, policy, billing, and payouts backend surfaces only."
        tone="accent"
        badgeLabel="Scope"
      />
    </ScreenShell>
  );
}
