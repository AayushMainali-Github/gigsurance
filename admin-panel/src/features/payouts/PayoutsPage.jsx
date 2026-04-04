import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryState } from '../../components/QueryState';
import { ObjectListTable } from '../../components/ObjectListTable';
import { StatCard } from '../../components/StatCard';
import { DetailPanel } from '../../components/DetailPanel';
import { api } from '../../lib/api/client';
import { formatCurrency, formatNumber } from '../../lib/utils/format';

export function PayoutsPage() {
  const [page, setPage] = useState(1);
  const limit = 100;
  const query = useQuery({ queryKey: ['payout-queue', page], queryFn: () => api.getPayoutQueue({ page, limit }) });
  const items = useMemo(() => query.data?.data?.items?.map((transaction) => ({
    id: transaction._id,
    decisionId: transaction.payoutDecisionId?._id,
    transactionStatus: transaction.status,
    amountInr: transaction.amountInr,
    reconciliationState: transaction.reconciliationState,
    createdAt: transaction.createdAt,
    disbursedAt: transaction.disbursedAt,
    workerId: transaction.payoutDecisionId?.workerId?.platformDriverId,
    platformName: transaction.payoutDecisionId?.workerId?.platformName,
    incidentDate: transaction.payoutDecisionId?.incidentDate,
    finalPayoutInr: transaction.payoutDecisionId?.finalPayoutInr,
    decisionConfidenceBand: transaction.payoutDecisionId?.decisionConfidenceBand,
    recommendedTrustAction: transaction.payoutDecisionId?.recommendedTrustAction
  })) || [], [query.data]);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const pagination = query.data?.data?.pagination || { page, limit, total: items.length };
  const totalPayouts = pagination.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalPayouts / limit));
  const filteredItems = items.filter((item) => statusFilter === 'all' ? true : item.transactionStatus === statusFilter);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  const selected = filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null;
  const heldCount = items.filter((item) => item.transactionStatus === 'held').length;
  const pendingCount = items.filter((item) => item.transactionStatus === 'pending').length;
  const failedCount = items.filter((item) => item.transactionStatus === 'failed').length;
  const totalLiability = items.reduce((sum, item) => sum + Number(item.amountInr || 0), 0);
  const avgPayout = items.length ? totalLiability / items.length : 0;
  const reconciliationRows = [
    { id: 'pending', status: 'Pending', count: pendingCount },
    { id: 'held', status: 'Held', count: heldCount },
    { id: 'failed', status: 'Failed', count: failedCount },
    { id: 'queue', status: 'Queue Size', count: items.length }
  ];

  return (
    <QueryState isLoading={query.isLoading} error={query.error}>
      <div className="dashboard-stack">
        <section className="metric-grid">
          <StatCard title="Queued Payouts" value={formatNumber(totalPayouts)} />
          <StatCard title="Pending Payouts" value={formatNumber(pendingCount)} />
          <StatCard title="Held Payouts" value={formatNumber(heldCount)} />
          <StatCard title="Failed Payouts" value={formatNumber(failedCount)} />
          <StatCard title="Queue Liability" value={formatCurrency(totalLiability)} tone="accent" />
          <StatCard title="Average Payout" value={formatCurrency(avgPayout)} />
        </section>
        <div className="panel-grid two-up">
          <ObjectListTable
            title="Payout Status Mix"
            caption="Current payout queue posture"
            payload={reconciliationRows}
            preferredKeys={['status', 'count']}
          />
          <DetailPanel
            title="Payout Detail"
            caption="Selected payout and liability row"
            item={selected}
            fields={[
              { key: 'platformName', label: 'Platform' },
              { key: 'workerId', label: 'Worker ID' },
              { key: 'transactionStatus', label: 'Transaction Status' },
              { key: 'finalPayoutInr', label: 'Decision Payout', render: (item) => formatCurrency(item.finalPayoutInr || 0) },
              { key: 'amountInr', label: 'Queue Amount', render: (item) => formatCurrency(item.amountInr || 0) },
              { key: 'reconciliationState', label: 'Reconciliation' },
              { key: 'recommendedTrustAction', label: 'Trust Action' }
            ]}
          />
        </div>
        <div className="panel-grid two-up">
          <ObjectListTable
            title="Payout Queue"
            caption="Daily payout decisions and liability state"
            payload={filteredItems}
            preferredKeys={['platformName', 'workerId', 'incidentDate', 'finalPayoutInr', 'transactionStatus', 'reconciliationState']}
            rowKey={(row) => row.id}
            selectedRowKey={selectedId}
            onRowClick={(row) => setSelectedId(row.id)}
            pagination={{
              page,
              limit,
              total: totalPayouts,
              totalPages,
              onPageChange: setPage
            }}
          />
          <DetailPanel
            title="Selected Liability"
            caption="Read-only payout context for the selected transaction"
            item={selected}
            fields={[
              { key: 'platformName', label: 'Platform' },
              { key: 'workerId', label: 'Worker ID' },
              { key: 'transactionStatus', label: 'Transaction Status' },
              { key: 'finalPayoutInr', label: 'Decision Payout', render: (item) => formatCurrency(item.finalPayoutInr || 0) },
              { key: 'amountInr', label: 'Queue Amount', render: (item) => formatCurrency(item.amountInr || 0) },
              { key: 'recommendedTrustAction', label: 'Trust Action' },
              { key: 'decisionConfidenceBand', label: 'Confidence Band' }
            ]}
            emptyMessage="Pick a payout row to inspect it."
          />
        </div>
        <div className="panel-grid">
          <section className="card panel">
            <div className="panel-header">
              <div className="panel-heading">
                <div className="panel-title-row">
                  <h2>Queue Filter</h2>
                </div>
                <span className="panel-caption">Read-only scope control for payout posture</span>
              </div>
            </div>
            <div className="panel-body">
              <div className="action-form">
                <label>
                  Status
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">all</option>
                    <option value="pending">pending</option>
                    <option value="held">held</option>
                    <option value="failed">failed</option>
                  </select>
                </label>
              </div>
            </div>
          </section>
        </div>
      </div>
    </QueryState>
  );
}
