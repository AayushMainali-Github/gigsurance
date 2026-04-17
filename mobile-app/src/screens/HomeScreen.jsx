import { View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { InfoPanel } from '../components/InfoPanel';
import { NoticeStrip } from '../components/NoticeStrip';
import { ScreenShell } from '../components/ScreenShell';
import { SectionTitle } from '../components/SectionTitle';
import { StatCard } from '../components/StatCard';
import { theme } from '../lib/theme/theme';

export function HomeScreen() {
  return (
    <ScreenShell
      eyebrow="Worker Dashboard"
      title="GIGSurance"
      description="Worker-facing home for coverage, weekly premium, and payout status."
    >
      <NoticeStrip
        tone="info"
        text="Home will remain the primary worker dashboard for coverage status, this week's premium, and latest payout outcome."
      />
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
      <SectionTitle eyebrow="Next Phase" title="Worker Summary Surface" meta="This screen will become the main at-a-glance dashboard." />
      <InfoPanel
        title="Phase 4-5 scaffold"
        body="This app shell is intentionally minimal. Next phases will wire auth, worker linking, policy activation, premium visibility, and payout history to backend endpoints."
        tone="info"
        badgeLabel="Scaffold"
      />
      <EmptyState
        title="No live worker data yet"
        body="Backend integration has not been wired yet. The shared component system is now in place so later data screens stay visually consistent."
      />
    </ScreenShell>
  );
}
