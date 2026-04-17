import { useQuery } from '@tanstack/react-query';
import { DataListItem } from '../components/DataListItem';
import { EmptyState } from '../components/EmptyState';
import { InfoPanel } from '../components/InfoPanel';
import { LoadingState } from '../components/LoadingState';
import { NoticeStrip } from '../components/NoticeStrip';
import { ScreenShell } from '../components/ScreenShell';
import { SectionTitle } from '../components/SectionTitle';
import { StatCard } from '../components/StatCard';
import { View } from 'react-native';
import { useAuth } from '../features/auth/AuthContext';
import { api } from '../lib/api/client';
import { theme } from '../lib/theme/theme';
import {
  formatCurrencyInr,
  formatPlatformLabel,
  formatStatusLabel,
  getStatusTone
} from '../lib/utils/format';

export function CoverageScreen() {
  const { user } = useAuth();
  const policySummaryQuery = useQuery({
    queryKey: ['worker-policy-summary'],
    queryFn: () => api.users.getPolicySummary()
  });

  if (policySummaryQuery.isLoading) {
    return (
      <ScreenShell
        eyebrow="Coverage"
        title="Policy And Protection"
        description="This screen explains your linked worker identity, policy posture, and current protection state."
      >
        <LoadingState label="Loading coverage details" />
      </ScreenShell>
    );
  }

  const policySummary = policySummaryQuery.data?.data || {};
  const currentPolicy = policySummary.currentPolicy || user?.currentPolicy || null;
  const coverage = policySummary.coverage || null;
  const linkedWorker = policySummary.linkedWorker || user?.linkedWorker || null;
  const policyStatus = currentPolicy?.status || coverage?.status || 'unknown';
  const startedAt = currentPolicy?.startedAt ? new Date(currentPolicy.startedAt).toLocaleDateString() : 'Not available';

  return (
    <ScreenShell
      eyebrow="Coverage"
      title="Policy And Protection"
      description="This screen explains your policy posture in plain language using the current backend coverage and policy data."
    >
      <NoticeStrip
        tone={getStatusTone(policyStatus)}
        text={`Your current policy is ${formatStatusLabel(policyStatus)}. This screen focuses on linked worker identity, policy state, and current protection context.`}
      />

      {currentPolicy || linkedWorker ? (
        <>
          <View style={{ gap: theme.spacing.lg }}>
            <StatCard
              eyebrow="Policy Status"
              title={formatStatusLabel(policyStatus)}
              value={policyStatus === 'active' ? 'Protection Active' : formatStatusLabel(policyStatus)}
              note="Active, paused, and cancelled policy states are shown here in worker-safe language."
              tone={getStatusTone(policyStatus)}
            />
          </View>
          <SectionTitle eyebrow="Coverage Details" title="Current Policy Posture" meta="Worker-facing summary of the current policy and linked worker state." />
          <DataListItem
            label="Linked Worker"
            value={linkedWorker ? linkedWorker.platformDriverId : 'No linked worker'}
            meta={
              linkedWorker
                ? `${formatPlatformLabel(linkedWorker.platformName)} worker in ${linkedWorker.city}, ${linkedWorker.state}`
                : 'You need a linked worker profile before coverage can function.'
            }
            tone={linkedWorker ? getStatusTone(linkedWorker.enrollmentStatus) : 'warning'}
            badgeLabel={formatStatusLabel(linkedWorker?.enrollmentStatus || 'missing')}
          />
          <DataListItem
            label="Policy Status"
            value={formatStatusLabel(policyStatus)}
            meta="This reflects the current backend policy state for your account."
            tone={getStatusTone(policyStatus)}
            badgeLabel={formatStatusLabel(policyStatus)}
          />
          <DataListItem
            label="Started Date"
            value={startedAt}
            meta="This is the start date of your current policy when available."
            tone="accent"
            badgeLabel="Started"
          />
          <DataListItem
            label="Protection State"
            value={coverage?.status === 'active' ? 'Protected This Week' : 'Not Fully Active'}
            meta="Protection state is driven by your current coverage status."
            tone={getStatusTone(coverage?.status)}
            badgeLabel={formatStatusLabel(coverage?.status || 'unknown')}
          />
          <DataListItem
            label="No-Claim Weeks"
            value={
              currentPolicy?.noClaimWeeks !== undefined && currentPolicy?.noClaimWeeks !== null
                ? String(currentPolicy.noClaimWeeks)
                : 'Not available'
            }
            meta="This reflects the current no-claim count when available from the policy record."
            tone="info"
            badgeLabel="Policy Meta"
          />
          <DataListItem
            label="Current Weekly Premium"
            value={formatCurrencyInr(currentPolicy?.currentWeeklyPremiumInr)}
            meta="Coverage and premium wording stay aligned with the worker dashboard and premium surface."
            tone="primary"
            badgeLabel="Coverage"
          />
          <InfoPanel
            title="Coverage Summary"
            body="This screen is intentionally focused on policy posture and worker protection state. It does not introduce unsupported claims workflows or operator actions."
            tone="accent"
            badgeLabel="Worker Safe"
          />
        </>
      ) : (
        <EmptyState
          title="No coverage details available"
          body="Coverage information will appear here once a worker is linked and a policy exists for the account."
        />
      )}
    </ScreenShell>
  );
}
