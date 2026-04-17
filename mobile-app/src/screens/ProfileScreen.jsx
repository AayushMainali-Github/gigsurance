import { useQuery } from '@tanstack/react-query';
import { DataListItem } from '../components/DataListItem';
import { EmptyState } from '../components/EmptyState';
import { InfoPanel } from '../components/InfoPanel';
import { LoadingState } from '../components/LoadingState';
import { NoticeStrip } from '../components/NoticeStrip';
import { PrimaryButton } from '../components/PrimaryButton';
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
  formatTierLabel,
  getStatusTone
} from '../lib/utils/format';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const currentPolicyQuery = useQuery({
    queryKey: ['policy-current'],
    queryFn: () => api.policies.getCurrent()
  });

  if (currentPolicyQuery.isLoading) {
    return (
      <ScreenShell
        eyebrow="Account"
        title="Profile"
        description="This screen contains account details, linked worker summary, policy summary, and logout."
      >
        <LoadingState label="Loading account details" />
      </ScreenShell>
    );
  }

  const currentPolicy = currentPolicyQuery.data?.data || user?.currentPolicy || null;
  const linkedWorker = user?.linkedWorker || null;
  const userStatus = formatStatusLabel(user?.status);
  const userTone = getStatusTone(user?.status);

  return (
    <ScreenShell
      eyebrow="Account"
      title="Profile"
      description="This screen contains account details, linked worker summary, policy summary, and sign-out only."
    >
      <NoticeStrip
        tone="info"
        text="Profile remains intentionally small: account state, linked worker identity, policy summary, and logout."
      />
      <View style={{ gap: theme.spacing.lg }}>
        <StatCard
          eyebrow="Account Status"
          title={userStatus}
          value={user?.email || 'Unknown Account'}
          note="This worker app stays limited to account state, linked identity, policy summary, and logout."
          tone={userTone}
        />
      </View>
      <SectionTitle eyebrow="Account Surface" title="Worker-Safe Profile" meta="The profile section will not expand into admin or finance workflows." />
      <View style={{ gap: theme.spacing.md }}>
        <DataListItem
          label="Email"
          value={user?.email || 'Not available'}
          meta="Your account email comes directly from the current user profile."
          tone="info"
          badgeLabel={userStatus}
        />
        <DataListItem
          label="Role"
          value={formatStatusLabel(user?.role)}
          meta="This is the current backend role tied to the account."
          tone="neutral"
          badgeLabel="Role"
        />
        {linkedWorker ? (
          <>
            <DataListItem
              label="Linked Worker"
              value={linkedWorker.platformDriverId}
              meta={`${formatPlatformLabel(linkedWorker.platformName)} worker in ${linkedWorker.city}, ${linkedWorker.state}`}
              tone={getStatusTone(linkedWorker.enrollmentStatus)}
              badgeLabel={formatStatusLabel(linkedWorker.enrollmentStatus)}
            />
            <DataListItem
              label="Worker Tier"
              value={formatTierLabel(linkedWorker.cityTier)}
              meta="Tier labels follow the same readable formatting used across the rest of the UI."
              tone="accent"
              badgeLabel="Tier"
            />
          </>
        ) : (
          <EmptyState
            title="No linked worker"
            body="A linked worker profile is required for coverage and payout visibility."
          />
        )}
        {currentPolicy ? (
          <>
            <DataListItem
              label="Current Policy"
              value={formatStatusLabel(currentPolicy.status)}
              meta="This is the current policy state on your account."
              tone={getStatusTone(currentPolicy.status)}
              badgeLabel={formatStatusLabel(currentPolicy.status)}
            />
            <DataListItem
              label="Weekly Premium"
              value={formatCurrencyInr(currentPolicy.currentWeeklyPremiumInr)}
              meta="This is the worker-visible current weekly premium on the policy record."
              tone="primary"
              badgeLabel="Policy"
            />
          </>
        ) : (
          <EmptyState
            title="No active policy"
            body="Policy summary will appear here once your account has a current policy."
          />
        )}
      </View>
      <InfoPanel
        title="Boundary"
        body="Support chat, KYC workflows, bank management, preferences, and operator tooling are intentionally excluded because the current backend does not expose them."
        tone="danger"
        badgeLabel="Excluded"
      />
      <PrimaryButton label="Log Out" onPress={logout} />
    </ScreenShell>
  );
}
