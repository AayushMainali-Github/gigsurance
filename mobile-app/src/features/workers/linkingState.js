import { getErrorMessage } from '../../lib/api/errors.js';

export function getWorkerLinkFeedback(error) {
  if (!error) {
    return { tone: 'info', message: 'Link your worker identity to continue into coverage.' };
  }

  const message = getErrorMessage(error, 'Unable to link worker right now.');

  if (error?.status === 404) {
    return { tone: 'warning', message: 'Worker not found in the mock operational API. Check platform and driver ID.' };
  }

  if (error?.status === 409 && /another user/i.test(message)) {
    return { tone: 'danger', message: 'This worker is already linked to another account.' };
  }

  if (error?.status === 409) {
    return { tone: 'warning', message: 'A primary worker is already linked to this account.' };
  }

  return { tone: 'danger', message };
}
