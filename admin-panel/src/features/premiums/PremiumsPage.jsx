import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryState } from '../../components/QueryState';
import { ObjectListTable } from '../../components/ObjectListTable';
import { StatCard } from '../../components/StatCard';
import { DetailPanel } from '../../components/DetailPanel';
import { api } from '../../lib/api/client';
import { formatCurrency, formatNumber } from '../../lib/utils/format';

export function PremiumsPage() {
  const [page, setPage] = useState(1);
  const limit = 100;
  const query = useQuery({ queryKey: ['premium-queue', page], queryFn: () => api.getPremiumQueue({ page, limit }) });
  const items = useMemo(() => query.data?.data?.items?.map((invoice) => ({
    id: invoice._id,
    decisionId: invoice.premiumDecisionId?._id,
    invoiceStatus: invoice.status,
    amountInr: invoice.amountInr,
    dueAt: invoice.dueAt,
    paidAt: invoice.paidAt,
    workerId: invoice.premiumDecisionId?.workerId?.platformDriverId,
    platformName: invoice.premiumDecisionId?.workerId?.platformName,
    finalPremiumInr: invoice.premiumDecisionId?.finalPremiumInr,
    confidenceBand: invoice.premiumDecisionId?.confidenceBand,
    flaggedForReview: invoice.premiumDecisionId?.flaggedForReview
  })) || [], [query.data]);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const pagination = query.data?.data?.pagination || { page, limit, total: items.length };
  const totalInvoices = pagination.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalInvoices / limit));
  const filteredItems = items.filter((item) => statusFilter === 'all' ? true : item.invoiceStatus === statusFilter);

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
  const pendingCount = items.filter((item) => item.invoiceStatus === 'pending').length;
  const overdueCount = items.filter((item) => item.invoiceStatus === 'overdue').length;
  const paidCount = items.filter((item) => item.invoiceStatus === 'paid').length;
  const reviewCount = items.filter((item) => item.flaggedForReview).length;
  const totalInvoiced = items.reduce((sum, item) => sum + Number(item.amountInr || 0), 0);
  const avgPremium = items.length ? totalInvoiced / items.length : 0;
  const statusRows = [
    { id: 'pending', status: 'Pending', count: pendingCount },
    { id: 'overdue', status: 'Overdue', count: overdueCount },
    { id: 'paid', status: 'Paid', count: paidCount },
    { id: 'flagged', status: 'Flagged', count: reviewCount }
  ];

  return (
    <QueryState isLoading={query.isLoading} error={query.error}>
      <div className="dashboard-stack">
        <section className="metric-grid">
          <StatCard title="Invoices" value={formatNumber(totalInvoices)} />
          <StatCard title="Pending Invoices" value={formatNumber(pendingCount)} />
          <StatCard title="Overdue Invoices" value={formatNumber(overdueCount)} />
          <StatCard title="Flagged Premiums" value={formatNumber(reviewCount)} />
          <StatCard title="Total Invoiced" value={formatCurrency(totalInvoiced)} tone="accent" />
          <StatCard title="Average Premium" value={formatCurrency(avgPremium)} />
        </section>
        <div className="panel-grid two-up">
          <ObjectListTable
            title="Premium Status Mix"
            caption="Collection posture across the current invoice queue"
            payload={statusRows}
            preferredKeys={['status', 'count']}
          />
          <DetailPanel
            title="Premium Detail"
            caption="Selected invoice and decision"
            item={selected}
            fields={[
              { key: 'platformName', label: 'Platform' },
              { key: 'workerId', label: 'Worker ID' },
              { key: 'invoiceStatus', label: 'Invoice Status' },
              { key: 'amountInr', label: 'Invoice Amount', render: (item) => formatCurrency(item.amountInr || 0) },
              { key: 'finalPremiumInr', label: 'Decision Premium', render: (item) => formatCurrency(item.finalPremiumInr || 0) },
              { key: 'confidenceBand', label: 'Confidence' },
              { key: 'dueAt', label: 'Due At' }
            ]}
          />
        </div>
        <div className="panel-grid two-up">
          <ObjectListTable
            title="Premium Queue"
            caption="Weekly premium decisions and pending collection state"
            payload={filteredItems}
            preferredKeys={['platformName', 'workerId', 'finalPremiumInr', 'invoiceStatus', 'confidenceBand', 'dueAt']}
            rowKey={(row) => row.id}
            selectedRowKey={selectedId}
            onRowClick={(row) => setSelectedId(row.id)}
            pagination={{
              page,
              limit,
              total: totalInvoices,
              totalPages,
              onPageChange: setPage
            }}
          />
          <DetailPanel
            title="Queue Scope"
            caption="Read-only queue filter and selected invoice context"
            item={selected}
            fields={[
              { key: 'platformName', label: 'Platform' },
              { key: 'workerId', label: 'Worker ID' },
              { key: 'invoiceStatus', label: 'Invoice Status' },
              { key: 'amountInr', label: 'Invoice Amount', render: (item) => formatCurrency(item.amountInr || 0) },
              { key: 'finalPremiumInr', label: 'Decision Premium', render: (item) => formatCurrency(item.finalPremiumInr || 0) },
              { key: 'confidenceBand', label: 'Confidence' },
              { key: 'flaggedForReview', label: 'Review Flag', render: (item) => item.flaggedForReview ? 'Yes' : 'No' }
            ]}
            emptyMessage="Pick an invoice row to inspect it."
          />
        </div>
        <div className="panel-grid">
          <section className="card panel">
            <div className="panel-header">
              <div className="panel-heading">
                <div className="panel-title-row">
                  <h2>Queue Filter</h2>
                </div>
                <span className="panel-caption">Read-only scope control for invoice posture</span>
              </div>
            </div>
            <div className="panel-body">
              <div className="action-form">
                <label>
                  Status
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">all</option>
                    <option value="pending">pending</option>
                    <option value="overdue">overdue</option>
                    <option value="paid">paid</option>
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
