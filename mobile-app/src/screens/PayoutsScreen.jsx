import { View } from 'react-native';
import { InfoPanel } from '../components/InfoPanel';
import { NoticeStrip } from '../components/NoticeStrip';
import { ScreenShell } from '../components/ScreenShell';
import { SectionTitle } from '../components/SectionTitle';
import { StatCard } from '../components/StatCard';
import { theme } from '../lib/theme/theme';

export function PayoutsScreen() {
  return (
    <ScreenShell
      eyebrow="Payouts"
      title="Protected Income"
      description="This screen will surface payout decisions and payout transaction status for the worker."
    >
      <NoticeStrip
        tone="warning"
        text="Payouts will show worker-facing status only, including approved, held, failed, or not eligible outcomes."
      />
      <View style={{ gap: theme.spacing.lg }}>
        <StatCard
          eyebrow="Latest Payout"
          title="Status"
          value="Review-Aware"
          note="Held, approved, failed, or not eligible states will be shown without exposing internal operator tooling."
          tone="warning"
        />
      </View>
      <SectionTitle eyebrow="Payout History" title="Readable Outcome States" meta="This section will summarize payout decisions without exposing internal operations tooling." />
      <InfoPanel
        title="Current intent"
        body="The mobile app will reflect backend payout states such as approved, held, failed, or not eligible without exposing internal review tooling."
        tone="warning"
        badgeLabel="Worker Safe"
      />
    </ScreenShell>
  );
}
