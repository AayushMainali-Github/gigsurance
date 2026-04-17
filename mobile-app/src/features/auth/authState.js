export function getAuthFlowState({ isAuthenticated, isRestoring, user }) {
  if (isRestoring) return 'restoring';
  if (!isAuthenticated) return 'auth';
  if (!user?.linkedWorker) return 'worker-link';
  if (!user?.currentPolicy) return 'policy-enroll';
  return 'app';
}
