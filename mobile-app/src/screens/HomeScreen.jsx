import { InfoPanel } from '../components/InfoPanel';
import { ScreenShell } from '../components/ScreenShell';

export function HomeScreen() {
  return (
    <ScreenShell
      eyebrow="Worker Dashboard"
      title="GIGSurance"
      description="Worker-facing home for coverage, weekly premium, and payout status."
    >
      <InfoPanel
        title="Phase 4-5 scaffold"
        body="This app shell is intentionally minimal. Next phases will wire auth, worker linking, policy activation, premium visibility, and payout history to backend endpoints."
      />
    </ScreenShell>
  );
}
