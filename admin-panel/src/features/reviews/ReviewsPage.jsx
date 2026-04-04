import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryState } from '../../components/QueryState';
import { ObjectListTable } from '../../components/ObjectListTable';
import { StatCard } from '../../components/StatCard';
import { DetailPanel } from '../../components/DetailPanel';
import { api } from '../../lib/api/client';
import { formatNumber } from '../../lib/utils/format';

export function ReviewsPage() {
  const [page, setPage] = useState(1);
  const limit = 100;
  const queueQuery = useQuery({ queryKey: ['review-queue', page], queryFn: () => api.getReviewQueue({ page, limit }) });
  const items = useMemo(() => queueQuery.data?.data?.items?.map((item) => ({
    id: item._id,
    source: item.source,
    score: item.score,
    band: item.band,
    status: item.status,
    manualReviewRequired: item.manualReviewRequired,
    autoPenaltyApplied: item.autoPenaltyApplied,
    notes: item.notes
  })) || [], [queueQuery.data]);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const pagination = queueQuery.data?.data?.pagination || { page, limit, total: items.length };
  const totalCases = pagination.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCases / limit));
  const filteredItems = items.filter((item) => statusFilter === 'all' ? true : item.status === statusFilter);

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
  const openCount = items.filter((item) => item.status === 'open').length;
  const investigatingCount = items.filter((item) => item.status === 'investigating').length;
  const blockedCount = items.filter((item) => item.status === 'blocked').length;
  const manualCount = items.filter((item) => item.manualReviewRequired).length;
  const statusRows = [
    { id: 'open', status: 'Open', count: openCount },
    { id: 'investigating', status: 'Investigating', count: investigatingCount },
    { id: 'blocked', status: 'Blocked', count: blockedCount },
    { id: 'manual', status: 'Manual Review', count: manualCount }
  ];

  return (
    <QueryState isLoading={queueQuery.isLoading} error={queueQuery.error}>
      <div className="dashboard-stack">
        <section className="metric-grid">
          <StatCard title="Review Cases" value={formatNumber(totalCases)} />
          <StatCard title="Open Cases" value={formatNumber(openCount)} />
          <StatCard title="Investigating" value={formatNumber(investigatingCount)} />
          <StatCard title="Blocked" value={formatNumber(blockedCount)} />
          <StatCard title="Manual Review" value={formatNumber(manualCount)} />
        </section>
        <div className="panel-grid two-up">
          <ObjectListTable title="Review Status Mix" caption="Trust workflow posture" payload={statusRows} preferredKeys={['status', 'count']} />
          <DetailPanel
            title="Review Detail"
            caption="Selected trust case"
            item={selected}
            fields={[
              { key: 'source', label: 'Source' },
              { key: 'score', label: 'Score' },
              { key: 'band', label: 'Band' },
              { key: 'status', label: 'Status' },
              { key: 'manualReviewRequired', label: 'Manual Review' },
              { key: 'autoPenaltyApplied', label: 'Auto Penalty' }
            ]}
          />
        </div>
        <div className="panel-grid two-up">
          <ObjectListTable
            title="Review Queue"
            caption="Trust cases and manual review posture"
            payload={filteredItems}
            preferredKeys={['source', 'score', 'band', 'status', 'manualReviewRequired', 'autoPenaltyApplied']}
            rowKey={(row) => row.id}
            selectedRowKey={selectedId}
            onRowClick={(row) => setSelectedId(row.id)}
            pagination={{
              page,
              limit,
              total: totalCases,
              totalPages,
              onPageChange: setPage
            }}
          />
          <DetailPanel
            title="Case Context"
            caption="Read-only trust posture for the selected case"
            item={selected}
            fields={[
              { key: 'source', label: 'Source' },
              { key: 'score', label: 'Score' },
              { key: 'band', label: 'Band' },
              { key: 'status', label: 'Status' },
              { key: 'manualReviewRequired', label: 'Manual Review' },
              { key: 'autoPenaltyApplied', label: 'Auto Penalty' }
            ]}
            emptyMessage="Pick a review row to inspect it."
          />
        </div>
        <div className="panel-grid">
          <section className="card panel">
            <div className="panel-header">
              <div className="panel-heading">
                <div className="panel-title-row">
                  <h2>Queue Filter</h2>
                </div>
                <span className="panel-caption">Read-only scope control for review posture</span>
              </div>
            </div>
            <div className="panel-body">
              <div className="action-form">
                <label>
                  Status
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">all</option>
                    <option value="open">open</option>
                    <option value="investigating">investigating</option>
                    <option value="blocked">blocked</option>
                    <option value="cleared">cleared</option>
                    <option value="penalized">penalized</option>
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
