import { DataListItem } from '../components/DataListItem';
import { InfoPanel } from '../components/InfoPanel';
import { NoticeStrip } from '../components/NoticeStrip';
import { ScreenShell } from '../components/ScreenShell';
import { SectionTitle } from '../components/SectionTitle';
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
      <NoticeStrip
        tone="danger"
        text="Profile remains intentionally small: account state, linked worker identity, and session controls."
      />
      <View style={{ gap: theme.spacing.lg }}>
        <StatCard
          eyebrow="App Boundary"
          title="Worker App"
          value="Focused"
          note="The mobile app stays limited to worker identity, coverage, payouts, and account state."
          tone="info"
        />
      </View>
      <SectionTitle eyebrow="Account Surface" title="Worker-Safe Profile" meta="The profile section will not expand into admin or finance workflows." />
      <DataListItem
        label="Session"
        value="Secure token storage configured"
        meta="Actual login, logout, and session restore wiring will be added in the auth implementation phase."
        tone="info"
        badgeLabel="Ready"
      />
      <InfoPanel
        title="Boundary"
        body="Operator finance, fraud queues, admin overrides, and monitoring surfaces are intentionally excluded from the worker app."
        tone="danger"
        badgeLabel="Excluded"
      />
    </ScreenShell>
  );
}
