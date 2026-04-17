import { InfoPanel } from '../components/InfoPanel';
import { ScreenShell } from '../components/ScreenShell';

export function PayoutsScreen() {
  return (
    <ScreenShell
      eyebrow="Payouts"
      title="Protected Income"
      description="This screen will surface payout decisions and payout transaction status for the worker."
    >
      <InfoPanel
        title="Current intent"
        body="The mobile app will reflect backend payout states such as approved, held, failed, or not eligible without exposing internal review tooling."
      />
    </ScreenShell>
  );
}
