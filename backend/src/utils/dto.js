function toUserDto(user) {
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    status: user.status,
    linkedWorkerId: user.linkedWorkerId || null,
    currentPolicyId: user.currentPolicyId || null,
    createdAt: user.createdAt || null,
    lastLoginAt: user.lastLoginAt || null
  };
}

function toLinkedWorkerDto(worker) {
  if (!worker) return null;
  return {
    id: worker._id,
    userId: worker.userId,
    platformName: worker.platformName,
    platformDriverId: worker.platformDriverId,
    city: worker.city,
    state: worker.state,
    cityTier: worker.cityTier,
    linkedAt: worker.linkedAt,
    enrollmentStatus: worker.enrollmentStatus,
    workerSnapshotCache: worker.workerSnapshotCache
  };
}

function toPolicyDto(policy) {
  if (!policy) return null;
  return {
    id: policy._id,
    userId: policy.userId,
    linkedWorkerId: policy.linkedWorkerId,
    status: policy.status,
    startedAt: policy.startedAt,
    endedAt: policy.endedAt,
    currentWeeklyPremiumInr: policy.currentWeeklyPremiumInr,
    noClaimWeeks: policy.noClaimWeeks,
    fraudMultiplier: policy.fraudMultiplier,
    payoutReductionMultiplier: policy.payoutReductionMultiplier,
    latestQuoteMeta: policy.latestQuoteMeta,
    latestPayoutMeta: policy.latestPayoutMeta,
    latestReviewMeta: policy.latestReviewMeta || null
  };
}

function toPremiumDecisionDto(decision) {
  if (!decision) return null;
  return {
    id: decision._id,
    weekStart: decision.weekStart,
    weekEnd: decision.weekEnd,
    basePremiumInr: decision.basePremiumInr,
    penaltyMultiplier: decision.penaltyMultiplier,
    finalPremiumInr: decision.finalPremiumInr,
    confidenceScore: decision.confidenceScore,
    confidenceBand: decision.confidenceBand,
    riskReviewFlag: decision.riskReviewFlag,
    manualReviewFlag: decision.manualReviewFlag,
    status: decision.status,
    penaltyExplanation: decision.penaltyExplanation || null,
    finalDecisionSnapshot: decision.finalDecisionSnapshot || null,
    adminOverride: decision.adminOverride || null
  };
}

function toInvoiceDto(invoice) {
  if (!invoice) return null;
  return {
    id: invoice._id,
    premiumDecisionId: invoice.premiumDecisionId,
    amountInr: invoice.amountInr,
    dueAt: invoice.dueAt,
    status: invoice.status,
    paidAt: invoice.paidAt
  };
}

function toPayoutDecisionDto(decision) {
  if (!decision) return null;
  return {
    id: decision._id,
    incidentDate: decision.incidentDate,
    basePayoutInr: decision.basePayoutInr,
    penaltyMultiplier: decision.penaltyMultiplier,
    finalPayoutInr: decision.finalPayoutInr,
    payoutEligible: decision.payoutEligible,
    confidenceScore: decision.confidenceScore,
    confidenceBand: decision.confidenceBand,
    riskReviewFlag: decision.riskReviewFlag,
    manualReviewFlag: decision.manualReviewFlag,
    recommendedTrustAction: decision.recommendedTrustAction,
    status: decision.status,
    penaltyExplanation: decision.penaltyExplanation || null,
    finalDecisionSnapshot: decision.finalDecisionSnapshot || null,
    adminOverride: decision.adminOverride || null
  };
}

function toPayoutTransactionDto(tx) {
  if (!tx) return null;
  return {
    id: tx._id,
    payoutDecisionId: tx.payoutDecisionId,
    amountInr: tx.amountInr,
    status: tx.status,
    disbursedAt: tx.disbursedAt,
    referenceId: tx.referenceId,
    reconciliationState: tx.reconciliationState
  };
}

function toIncidentDto(incident) {
  if (!incident) return null;
  return {
    id: incident._id,
    date: incident.date,
    city: incident.city,
    state: incident.state,
    disruptionScore: incident.disruptionScore,
    triggerType: incident.triggerType,
    verified: incident.verified,
    sourceEvidence: incident.sourceEvidence
  };
}

function toRiskReviewCaseDto(item) {
  if (!item) return null;
  return {
    id: item._id,
    userId: item.userId,
    policyId: item.policyId,
    workerId: item.workerId,
    source: item.source,
    sourceDecisionId: item.sourceDecisionId,
    score: item.score,
    band: item.band,
    reviewReason: item.reviewReason,
    confidenceInputs: item.confidenceInputs,
    actionTaken: item.actionTaken,
    autoPenaltyApplied: item.autoPenaltyApplied,
    manualReviewRequired: item.manualReviewRequired,
    status: item.status,
    notes: item.notes,
    reviewedBy: item.reviewedBy,
    reviewedAt: item.reviewedAt,
    createdAt: item.createdAt || null
  };
}

function toAuditLogDto(item) {
  if (!item) return null;
  return {
    id: item._id,
    actorType: item.actorType,
    actorId: item.actorId,
    action: item.action,
    entityType: item.entityType,
    entityId: item.entityId,
    payload: item.payload,
    explanationSummary: item.explanationSummary || null,
    requestPayload: item.requestPayload || null,
    responsePayload: item.responsePayload || null,
    createdAt: item.createdAt || null
  };
}

module.exports = {
  toUserDto,
  toLinkedWorkerDto,
  toPolicyDto,
  toPremiumDecisionDto,
  toInvoiceDto,
  toPayoutDecisionDto,
  toPayoutTransactionDto,
  toIncidentDto,
  toRiskReviewCaseDto,
  toAuditLogDto
};
