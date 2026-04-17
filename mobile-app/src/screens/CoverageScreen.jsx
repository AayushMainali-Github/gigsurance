import { InfoPanel } from '../components/InfoPanel';
import { ScreenShell } from '../components/ScreenShell';

export function CoverageScreen() {
  return (
    <ScreenShell
      eyebrow="Coverage"
      title="Policy And Protection"
      description="This screen will hold linked worker identity, policy status, and weekly premium details."
    >
      <InfoPanel
        title="Planned scope"
        body="Coverage state will be built on top of the existing worker, policy, billing, and payouts backend surfaces only."
      />
    </ScreenShell>
  );
}
