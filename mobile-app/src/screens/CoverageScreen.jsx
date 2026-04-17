import { InfoPanel } from '../components/InfoPanel';
import { LoadingState } from '../components/LoadingState';
import { NoticeStrip } from '../components/NoticeStrip';
import { ScreenShell } from '../components/ScreenShell';
import { SectionTitle } from '../components/SectionTitle';
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
      <NoticeStrip
        tone="success"
        text="Coverage will remain worker-readable: active status, linked identity, policy summary, and premium context."
      />
      <View style={{ gap: theme.spacing.lg }}>
        <StatCard
          eyebrow="Policy Status"
          title="Coverage"
          value="Ready"
          note="Active, paused, and cancelled policy states will be rendered here in a worker-safe format."
          tone="primary"
        />
      </View>
      <SectionTitle eyebrow="Shared Primitive" title="Coverage Content Blocks" meta="Later backend data will sit inside reusable cards, notices, and list items." />
      <InfoPanel
        title="Planned scope"
        body="Coverage state will be built on top of the existing worker, policy, billing, and payouts backend surfaces only."
        tone="accent"
        badgeLabel="Scope"
      />
      <LoadingState label="Coverage data wiring comes in the backend integration phase" />
    </ScreenShell>
  );
}
