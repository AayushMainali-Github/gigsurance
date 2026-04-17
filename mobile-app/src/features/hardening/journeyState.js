export function buildJourneyChecklist({ user, coverage, currentPremium, latestPayout, reviewSummary }) {
  return [
    {
      key: 'signup',
      label: 'New signup',
      complete: Boolean(user?.email),
      detail: user?.email ? `Account present for ${user.email}` : 'No authenticated worker account yet.'
    },
    {
      key: 'workerLink',
      label: 'Worker linked',
      complete: Boolean(user?.linkedWorker),
      detail: user?.linkedWorker
        ? `${user.linkedWorker.platformDriverId || 'Linked worker'} connected`
        : 'No linked worker on the account.'
    },
    {
      key: 'activePolicy',
      label: 'Active policy',
      complete: coverage?.status === 'active' || user?.currentPolicy?.status === 'active',
      detail:
        coverage?.status === 'active' || user?.currentPolicy?.status === 'active'
          ? 'Protection is active.'
          : 'No active policy visible yet.'
    },
    {
      key: 'premiumVisible',
      label: 'Weekly premium visible',
      complete: Boolean(currentPremium),
      detail: currentPremium ? 'Current weekly premium is available.' : 'No current premium decision yet.'
    },
    {
      key: 'payoutVisible',
      label: 'Payout visible',
      complete: Boolean(latestPayout),
      detail: latestPayout ? `Latest payout status: ${latestPayout.status || 'unknown'}` : 'No payout decision yet.'
    },
    {
      key: 'reviewStateVisible',
      label: 'Held/review state visible',
      complete: Boolean(reviewSummary?.hasOpenReview || latestPayout?.status === 'held' || latestPayout?.manualReviewFlag || latestPayout?.riskReviewFlag),
      detail:
        reviewSummary?.hasOpenReview || latestPayout?.status === 'held' || latestPayout?.manualReviewFlag || latestPayout?.riskReviewFlag
          ? 'A held or review-aware state is visible to the worker.'
          : 'No held/review state is currently visible.'
    }
  ];
}
