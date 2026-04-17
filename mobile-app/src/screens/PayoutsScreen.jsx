import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { DataListItem } from '../components/DataListItem';
import { EmptyState } from '../components/EmptyState';
import { InfoPanel } from '../components/InfoPanel';
import { LoadingState } from '../components/LoadingState';
import { NoticeStrip } from '../components/NoticeStrip';
import { ScreenShell } from '../components/ScreenShell';
import { SectionTitle } from '../components/SectionTitle';
import { StatCard } from '../components/StatCard';
import { api } from '../lib/api/client';
import { theme } from '../lib/theme/theme';
import {
  formatCurrencyInr,
  formatStatusLabel,
  getStatusTone
} from '../lib/utils/format';

function formatIncidentDate(value) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString();
}

function getPayoutTone(status) {
  return getStatusTone(status);
}

function getTrustMessage(item) {
  if (!item) {
    return 'No recent payout decision is available yet.';
  }

  if (item.status === 'held') {
    return 'Your latest payout is being verified before release.';
  }

  if (item.manualReviewFlag || item.riskReviewFlag) {
    return 'A review-aware payout state exists on your latest decision.';
  }

  if (item.status === 'approved') {
    return 'Your latest payout decision was approved.';
  }

  if (item.status === 'not_eligible') {
    return 'The latest incident did not result in an eligible payout.';
  }

  if (item.status === 'failed') {
    return 'The latest payout decision failed and may need follow-up.';
  }

  return 'Latest payout status is shown below.';
}

export function PayoutsScreen() {
  const payoutsQuery = useQuery({
    queryKey: ['payouts-list'],
    queryFn: () => api.payouts.list({ page: 1, limit: 5 })
  });
  const latestPayoutQuery = useQuery({
    queryKey: ['payout-latest'],
    queryFn: () => api.payouts.getLatest()
  });

  if (payoutsQuery.isLoading || latestPayoutQuery.isLoading) {
    return (
      <ScreenShell
        eyebrow="Payouts"
        title="Protected Income"
        description="This screen surfaces payout decisions and payout transaction status for the worker."
      >
        <LoadingState label="Loading payout history" />
      </ScreenShell>
    );
  }

  const payoutBundle = payoutsQuery.data?.data || { decisions: [], transactions: [] };
  const latestPayout = latestPayoutQuery.data?.data || null;
  const decisions = payoutBundle.decisions || [];
  const transactions = payoutBundle.transactions || [];
  const latestTransaction = latestPayout
    ? transactions.find((item) => item.payoutDecisionId === latestPayout.id) || null
    : null;
  const tone = getPayoutTone(latestPayout?.status);

  return (
    <ScreenShell
      eyebrow="Payouts"
      title="Protected Income"
      description="This screen will surface payout decisions and payout transaction status for the worker."
    >
      <NoticeStrip
        tone={tone === 'neutral' ? 'info' : tone}
        text={getTrustMessage(latestPayout)}
      />

      {latestPayout ? (
        <>
          <View style={{ gap: theme.spacing.lg }}>
            <StatCard
              eyebrow="Latest Payout"
              title={formatStatusLabel(latestPayout.status || 'latest')}
              value={formatCurrencyInr(latestPayout.finalPayoutInr)}
              note={`Incident date: ${formatIncidentDate(latestPayout.incidentDate)}`}
              tone={tone === 'neutral' ? 'info' : tone}
            />
          </View>
          <SectionTitle eyebrow="Payout History" title="Readable Outcome States" meta="Worker-facing payout decisions and recent payout history." />
          <DataListItem
            label="Latest Payout Amount"
            value={formatCurrencyInr(latestPayout.finalPayoutInr)}
            meta="This amount reflects the latest backend payout decision for your account."
            tone={tone}
            badgeLabel={formatStatusLabel(latestPayout.status || 'latest')}
          />
          <DataListItem
            label="Incident Date"
            value={formatIncidentDate(latestPayout.incidentDate)}
            meta="This is the disruption date tied to the latest payout decision."
            tone="accent"
            badgeLabel="Incident"
          />
          <DataListItem
            label="Trust And Review"
            value={latestPayout.recommendedTrustAction || 'No special trust action'}
            meta={
              latestPayout.manualReviewFlag || latestPayout.riskReviewFlag
                ? 'A review-aware signal exists on this payout decision.'
                : 'No worker-visible review flag is currently attached to this decision.'
            }
            tone={latestPayout.manualReviewFlag || latestPayout.riskReviewFlag ? 'warning' : 'info'}
            badgeLabel={latestPayout.manualReviewFlag || latestPayout.riskReviewFlag ? 'Review' : 'Clear'}
          />
          {latestTransaction ? (
            <DataListItem
              label="Transaction Status"
              value={formatStatusLabel(latestTransaction.status || 'Unknown')}
              meta={
                latestTransaction.referenceId
                  ? `Reference: ${latestTransaction.referenceId}`
                  : 'No payout reference is currently available.'
              }
              tone={getPayoutTone(latestTransaction.status)}
              badgeLabel={formatStatusLabel(latestTransaction.reconciliationState || 'unreconciled')}
            />
          ) : null}
          <InfoPanel
            title="Worker Payout Summary"
            body="Payouts stay worker-readable here: amount, incident date, outcome state, and any simple review-aware message where relevant."
            tone="warning"
            badgeLabel="Worker Safe"
          />
        </>
      ) : (
        <EmptyState
          title="No payout decisions yet"
          body="Payout decisions will appear here when a disruption event leads to a backend payout assessment."
        />
      )}

      <View style={{ gap: theme.spacing.md }}>
        <SectionTitle eyebrow="Recent Decisions" title="Payout History" meta="Latest payout decisions for this worker account." />
        {decisions.length ? (
          decisions.map((item) => (
            <DataListItem
              key={item.id}
              label={formatIncidentDate(item.incidentDate)}
              value={formatCurrencyInr(item.finalPayoutInr)}
              meta={
                item.manualReviewFlag || item.riskReviewFlag
                  ? 'Review-aware payout decision.'
                  : `Status: ${formatStatusLabel(item.status || 'unknown')}`
              }
              tone={getPayoutTone(item.status)}
              badgeLabel={formatStatusLabel(item.status || 'unknown')}
            />
          ))
        ) : (
          <EmptyState
            title="No payout history yet"
            body="Recent payout outcomes will appear here once your account has payout decisions."
          />
        )}
      </View>
    </ScreenShell>
  );
}
