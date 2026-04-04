import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryState } from '../../components/QueryState';
import { ObjectListTable } from '../../components/ObjectListTable';
import { StatCard } from '../../components/StatCard';
import { DetailPanel } from '../../components/DetailPanel';
import { SparkBarList } from '../../components/SparkBarList';
import { api } from '../../lib/api/client';
import { formatNumber } from '../../lib/utils/format';

export function AuditPage() {
  const query = useQuery({ queryKey: ['audit-logs'], queryFn: api.getAuditLogs });
  const items = useMemo(() => query.data?.data?.items || [], [query.data]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((item) => item._id === selectedId)) {
      setSelectedId(items[0]._id);
    }
  }, [items, selectedId]);

  const selected = items.find((item) => item._id === selectedId) || null;
  const overrideCount = items.filter((item) => ['override_premium', 'override_payout'].includes(item.action)).length;
  const suspendCount = items.filter((item) => item.action === 'suspend_user_account').length;
  const annotationCount = items.filter((item) => item.action === 'annotate_account').length;
  const summaryRows = [
    { action: 'Overrides', count: overrideCount },
    { action: 'Suspensions', count: suspendCount },
    { action: 'Annotations', count: annotationCount }
  ];
  const actionRows = summaryRows.map((item) => ({
    id: item.action,
    label: item.action,
    value: Number(item.count || 0),
    displayValue: `${item.count}`
  }));
  return (
    <QueryState isLoading={query.isLoading} error={query.error}>
      <div className="dashboard-stack">
        <section className="metric-grid">
          <StatCard title="Audit Entries" value={formatNumber(items.length)} />
          <StatCard title="Overrides" value={formatNumber(overrideCount)} />
          <StatCard title="Suspensions" value={formatNumber(suspendCount)} />
          <StatCard title="Annotations" value={formatNumber(annotationCount)} />
        </section>
        <div className="panel-grid two-up">
          <ObjectListTable title="Audit Mix" caption="Admin action composition" payload={summaryRows} preferredKeys={['action', 'count']} />
          <DetailPanel
            title="Audit Detail"
            caption="Selected action trace"
            item={selected}
            fields={[
              { key: 'action', label: 'Action' },
              { key: 'entityType', label: 'Entity Type' },
              { key: 'entityId', label: 'Entity ID' },
              { key: 'actorId', label: 'Actor ID' },
              { key: 'createdAt', label: 'Created At' },
              { key: 'explanationSummary', label: 'Explanation' }
            ]}
          />
        </div>
        <div className="panel-grid two-up">
          <SparkBarList
            title="Action Rank"
            caption="Admin action mix at a glance"
            rows={actionRows}
          />
          <ObjectListTable
            title="Audit Log"
            caption="Trace of admin actions and system decisions"
            payload={items}
            preferredKeys={['action', 'entityType', 'entityId', 'actorId', 'createdAt', 'explanationSummary']}
            rowKey={(row) => row._id}
            selectedRowKey={selectedId}
            onRowClick={(row) => setSelectedId(row._id)}
          />
        </div>
      </div>
    </QueryState>
  );
}
