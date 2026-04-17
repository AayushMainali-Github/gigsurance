import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { DataListItem } from '../components/DataListItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { NoticeStrip } from '../components/NoticeStrip';
import { ScreenShell } from '../components/ScreenShell';
import { SectionTitle } from '../components/SectionTitle';
import { useAuth } from '../features/auth/AuthContext';
import { api, getErrorMessage, isUnauthorizedError } from '../lib/api/client';
import { theme } from '../lib/theme/theme';
import {
  formatCurrencyInr,
  formatPlatformLabel,
  formatStatusLabel,
  getStatusTone
} from '../lib/utils/format';

function toDateLabel(value) {
  if (!value) return 'Date unavailable';
  return new Date(value).toLocaleDateString();
}

export function ActivityScreen() {
  const { user, logout } = useAuth();
  const workerQuery = useQuery({
    queryKey: ['worker-primary'],
    queryFn: () => api.workers.getPrimary()
  });
  const currentPolicyQuery = useQuery({
    queryKey: ['policy-current'],
    queryFn: () => api.policies.getCurrent()
  });
  const premiumHistoryQuery = useQuery({
    queryKey: ['billing-history'],
    queryFn: () => api.billing.getHistory({ page: 1, limit: 3 })
  });
  const payoutHistoryQuery = useQuery({
    queryKey: ['payout-history'],
    queryFn: () => api.payouts.getHistory({ page: 1, limit: 3 })
  });

  if (
    workerQuery.isLoading ||
    currentPolicyQuery.isLoading ||
    premiumHistoryQuery.isLoading ||
    payoutHistoryQuery.isLoading
  ) {
    return (
      <ScreenShell
        eyebrow="Activity"
        title="Coverage Timeline"
        description="This screen surfaces premium generation, policy actions, and payout events in a simple worker timeline."
      >
        <LoadingState label="Loading your activity timeline" />
      </ScreenShell>
    );
  }

  if (workerQuery.isError || currentPolicyQuery.isError || premiumHistoryQuery.isError || payoutHistoryQuery.isError) {
    const error = workerQuery.error || currentPolicyQuery.error || premiumHistoryQuery.error || payoutHistoryQuery.error;

    return (
      <ScreenShell
        eyebrow="Activity"
        title="Coverage Timeline"
        description="This screen surfaces premium generation, policy actions, and payout events in a simple worker timeline."
      >
        <ErrorState
          title={isUnauthorizedError(error) ? 'Session expired' : 'Activity unavailable'}
          body={
            isUnauthorizedError(error)
              ? 'Your session is no longer valid. Sign in again to continue.'
              : getErrorMessage(error, 'Timeline data could not be loaded from the backend right now.')
          }
          actionLabel={isUnauthorizedError(error) ? 'Log Out' : 'Retry'}
          onAction={isUnauthorizedError(error) ? logout : () => {
            void workerQuery.refetch();
            void currentPolicyQuery.refetch();
            void premiumHistoryQuery.refetch();
            void payoutHistoryQuery.refetch();
          }}
        />
      </ScreenShell>
    );
  }

  const linkedWorker = workerQuery.data?.data || user?.linkedWorker || null;
  const currentPolicy = currentPolicyQuery.data?.data || user?.currentPolicy || null;
  const premiumHistory = premiumHistoryQuery.data?.data || [];
  const payoutHistory = payoutHistoryQuery.data?.data || [];

  const events = [];

  if (linkedWorker) {
    events.push({
      id: `worker-${linkedWorker.id}`,
      label: 'Linked Worker',
      value: `${formatPlatformLabel(linkedWorker.platformName)} ${linkedWorker.platformDriverId}`,
      meta: `${linkedWorker.city}, ${linkedWorker.state} on ${toDateLabel(linkedWorker.linkedAt)}`,
      tone: getStatusTone(linkedWorker.enrollmentStatus),
      badgeLabel: formatStatusLabel(linkedWorker.enrollmentStatus || 'linked'),
      sortValue: linkedWorker.linkedAt || linkedWorker.createdAt || ''
    });
  }

  if (currentPolicy) {
    events.push({
      id: `policy-${currentPolicy.id}`,
      label: 'Policy Enrolled',
      value: formatStatusLabel(currentPolicy.status || 'active'),
      meta: `Coverage started on ${toDateLabel(currentPolicy.startedAt)}`,
      tone: getStatusTone(currentPolicy.status),
      badgeLabel: formatStatusLabel(currentPolicy.status || 'policy'),
      sortValue: currentPolicy.startedAt || ''
    });
  }

  premiumHistory.forEach((item) => {
    events.push({
      id: `premium-${item.id}`,
      label: 'Weekly Premium Generated',
      value: formatCurrencyInr(item.finalPremiumInr),
      meta: `Coverage week ${toDateLabel(item.weekStart)} to ${toDateLabel(item.weekEnd)}`,
      tone: item.manualReviewFlag || item.riskReviewFlag ? 'warning' : getStatusTone(item.status),
      badgeLabel: formatStatusLabel(item.status || 'quoted'),
      sortValue: item.weekStart || ''
    });
  });

  payoutHistory.forEach((item) => {
    events.push({
      id: `payout-${item.id}`,
      label: 'Payout Decision',
      value: `${formatStatusLabel(item.status || 'unknown')} - ${formatCurrencyInr(item.finalPayoutInr)}`,
      meta: `Incident on ${toDateLabel(item.incidentDate)}`,
      tone: getStatusTone(item.status),
      badgeLabel: formatStatusLabel(item.status || 'payout'),
      sortValue: item.incidentDate || ''
    });
  });

  const sortedEvents = events
    .filter((item) => item.sortValue)
    .sort((a, b) => new Date(b.sortValue).getTime() - new Date(a.sortValue).getTime());

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
        <SectionTitle eyebrow="Recent Events" title="Timeline" meta="Readable worker insurance events without a full analytics layer." />
        {sortedEvents.length ? (
          sortedEvents.map((item) => (
            <DataListItem
              key={item.id}
              label={item.label}
              value={item.value}
              meta={item.meta}
              tone={item.tone}
              badgeLabel={item.badgeLabel}
            />
          ))
        ) : (
          <EmptyState
            title="No activity yet"
            body="Your linked worker, policy, premium, and payout events will appear here as they become available."
          />
        )}
      </View>
    </ScreenShell>
  );
}
