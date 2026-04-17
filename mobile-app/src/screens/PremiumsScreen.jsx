import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { DataListItem } from '../components/DataListItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { InfoPanel } from '../components/InfoPanel';
import { LoadingState } from '../components/LoadingState';
import { NoticeStrip } from '../components/NoticeStrip';
import { ScreenShell } from '../components/ScreenShell';
import { SectionTitle } from '../components/SectionTitle';
import { StatCard } from '../components/StatCard';
import { api } from '../lib/api/client';
import { getErrorMessage, isUnauthorizedError } from '../lib/api/client';
import { theme } from '../lib/theme/theme';
import {
  formatCurrencyInr,
  formatStatusLabel,
  getStatusTone
} from '../lib/utils/format';
import { useAuth } from '../features/auth/AuthContext';

function formatWeekRange(currentPremium) {
  if (!currentPremium?.weekStart || !currentPremium?.weekEnd) {
    return 'Current week';
  }

  const start = new Date(currentPremium.weekStart).toLocaleDateString();
  const end = new Date(currentPremium.weekEnd).toLocaleDateString();
  return `${start} - ${end}`;
}

export function PremiumsScreen() {
  const { logout } = useAuth();
  const currentPremiumQuery = useQuery({
    queryKey: ['billing-current'],
    queryFn: () => api.billing.getCurrent()
  });
  const premiumHistoryQuery = useQuery({
    queryKey: ['billing-history'],
    queryFn: () => api.billing.getHistory({ page: 1, limit: 5 })
  });

  if (currentPremiumQuery.isLoading || premiumHistoryQuery.isLoading) {
    return (
      <ScreenShell
        eyebrow="Weekly Premium"
        title="Premiums"
        description="Your current weekly premium, timing context, and recent pricing history."
      >
        <LoadingState label="Loading premium details" />
      </ScreenShell>
    );
  }

  if (currentPremiumQuery.isError || premiumHistoryQuery.isError) {
    const error = currentPremiumQuery.error || premiumHistoryQuery.error;

    return (
      <ScreenShell
        eyebrow="Weekly Premium"
        title="Premiums"
        description="Your current weekly premium, timing context, and recent pricing history."
      >
        <ErrorState
          title={isUnauthorizedError(error) ? 'Session expired' : 'Premium data unavailable'}
          body={
            isUnauthorizedError(error)
              ? 'Your session is no longer valid. Sign in again to continue.'
              : getErrorMessage(error, 'Premium data could not be loaded from the backend right now.')
          }
          actionLabel={isUnauthorizedError(error) ? 'Log Out' : 'Retry'}
          onAction={isUnauthorizedError(error) ? logout : () => {
            void currentPremiumQuery.refetch();
            void premiumHistoryQuery.refetch();
          }}
        />
      </ScreenShell>
    );
  }

  const currentPremium = currentPremiumQuery.data?.data || null;
  const premiumHistory = premiumHistoryQuery.data?.data || [];
  const hasReviewFlag = Boolean(currentPremium?.riskReviewFlag || currentPremium?.manualReviewFlag);

  return (
    <ScreenShell
      eyebrow="Weekly Premium"
      title="Premiums"
      description="Current premium visibility stays honest to the backend: INR-first, timing-aware, and explanation-light."
    >
      <NoticeStrip
        tone={hasReviewFlag ? 'warning' : 'info'}
        text={
          hasReviewFlag
            ? 'This week’s premium includes a review-aware signal. The worker-facing summary is shown below.'
            : 'Premiums are shown in INR based on the current backend decision output. Delivery-denominated display is deferred until it is reliably available.'
        }
      />

      {currentPremium ? (
        <View style={{ gap: theme.spacing.lg }}>
          <StatCard
            eyebrow="Current Premium"
            title={formatStatusLabel(currentPremium.status || 'Current')}
            value={formatCurrencyInr(currentPremium.finalPremiumInr)}
            note={`Coverage week: ${formatWeekRange(currentPremium)}`}
            tone="primary"
          />
          <SectionTitle eyebrow="This Week" title="Premium Summary" meta="Backend-supported worker view of the current premium decision." />
          <DataListItem
            label="Current Premium"
            value={formatCurrencyInr(currentPremium.finalPremiumInr)}
            meta="Displayed in INR because the current backend reliably provides rupee-denominated output."
            tone="primary"
            badgeLabel={formatStatusLabel(currentPremium.status || 'quoted')}
          />
          <DataListItem
            label="Confidence"
            value={currentPremium.confidenceBand || 'Not available'}
            meta={
              currentPremium.confidenceScore !== undefined && currentPremium.confidenceScore !== null
                ? `Confidence score: ${currentPremium.confidenceScore}`
                : 'No confidence score available.'
            }
            tone={hasReviewFlag ? 'warning' : 'info'}
            badgeLabel={hasReviewFlag ? 'Review Aware' : 'Normal'}
          />
          <DataListItem
            label="Timing Context"
            value={formatWeekRange(currentPremium)}
            meta="The current premium maps to the backend weekly pricing window."
            tone="accent"
            badgeLabel="Week"
          />
          <InfoPanel
            title="Premium Explanation"
            body={
              currentPremium.penaltyExplanation ||
              currentPremium.finalDecisionSnapshot?.summary ||
              'A detailed pricing explanation is not currently exposed in a concise worker-safe form, so this screen stays minimal and honest.'
            }
            tone="info"
            badgeLabel="Summary"
          />
        </View>
      ) : (
        <EmptyState
          title="No current premium available"
          body="Your premium will appear here after the weekly pricing cycle generates the current decision."
        />
      )}

      <View style={{ gap: theme.spacing.md }}>
        <SectionTitle eyebrow="Recent Pricing" title="Premium History" meta="Latest worker-visible premium decisions." />
        {premiumHistory.length ? (
          premiumHistory.map((item) => (
            <DataListItem
              key={item.id}
              label={formatWeekRange(item)}
              value={formatCurrencyInr(item.finalPremiumInr)}
              meta={item.confidenceBand ? `Confidence band: ${item.confidenceBand}` : 'No confidence band available.'}
              tone={getStatusTone(item.status)}
              badgeLabel={formatStatusLabel(item.status || 'quoted')}
            />
          ))
        ) : (
          <EmptyState
            title="No premium history yet"
            body="Past weekly premium decisions will appear here once they are available for this account."
          />
        )}
      </View>
    </ScreenShell>
  );
}
