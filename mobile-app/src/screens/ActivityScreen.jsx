import { View } from 'react-native';
import { DataListItem } from '../components/DataListItem';
import { NoticeStrip } from '../components/NoticeStrip';
import { ScreenShell } from '../components/ScreenShell';
import { SectionTitle } from '../components/SectionTitle';
import { theme } from '../lib/theme/theme';

export function ActivityScreen() {
  return (
    <ScreenShell
      eyebrow="Activity"
      title="Coverage Timeline"
      description="This screen will surface premium generation, policy actions, and payout events in a simple worker timeline."
    >
      <NoticeStrip
        tone="info"
        text="Activity will be worker-facing only. Review queues, overrides, and internal fraud operations will stay excluded."
      />
      <View style={{ gap: theme.spacing.md }}>
        <SectionTitle eyebrow="Recent Events" title="Timeline Preview" meta="Placeholder structure for upcoming backend integration." />
        <DataListItem
          label="Policy Event"
          value="Weekly premium generated"
          meta="Activity history will be structured as readable worker events, not operator logs."
          tone="accent"
          badgeLabel="Planned"
        />
        <DataListItem
          label="Payout Event"
          value="Payout approved or held"
          meta="Status messages will use plain language drawn from backend payout state."
          tone="warning"
          badgeLabel="Worker Safe"
        />
      </View>
    </ScreenShell>
  );
}
