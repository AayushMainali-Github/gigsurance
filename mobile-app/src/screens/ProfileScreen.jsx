import { InfoPanel } from '../components/InfoPanel';
import { ScreenShell } from '../components/ScreenShell';

export function ProfileScreen() {
  return (
    <ScreenShell
      eyebrow="Account"
      title="Profile"
      description="This screen will contain account details, linked worker summary, and sign-out/session controls."
    >
      <InfoPanel
        title="Boundary"
        body="Operator finance, fraud queues, admin overrides, and monitoring surfaces are intentionally excluded from the worker app."
      />
    </ScreenShell>
  );
}
