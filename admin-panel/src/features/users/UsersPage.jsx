import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QueryState } from '../../components/QueryState';
import { ObjectListTable } from '../../components/ObjectListTable';
import { StatCard } from '../../components/StatCard';
import { DetailPanel } from '../../components/DetailPanel';
import { api } from '../../lib/api/client';
import { formatNumber } from '../../lib/utils/format';

export function UsersPage() {
  const query = useQuery({ queryKey: ['admin-users'], queryFn: api.getUsers });
  const items = useMemo(() => query.data?.data?.items?.map((user) => ({
    id: user._id,
    email: user.email,
    status: user.status,
    role: user.role,
    platformName: user.linkedWorkerId?.platformName,
    platformDriverId: user.linkedWorkerId?.platformDriverId,
    city: user.linkedWorkerId?.city,
    policyStatus: user.currentPolicyId?.status
  })) || [], [query.data]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const selected = items.find((item) => item.id === selectedId) || null;
  const activeCount = items.filter((item) => item.status === 'active').length;
  const suspendedCount = items.filter((item) => item.status === 'suspended').length;
  const linkedCount = items.filter((item) => item.platformDriverId).length;
  const policyAttachedCount = items.filter((item) => item.policyStatus).length;
  const statusRows = [
    { id: 'active', status: 'Active', count: activeCount },
    { id: 'suspended', status: 'Suspended', count: suspendedCount },
    { id: 'linked', status: 'Linked Workers', count: linkedCount },
    { id: 'policy', status: 'Policy Attached', count: policyAttachedCount }
  ];

  return (
    <QueryState isLoading={query.isLoading} error={query.error}>
      <div className="dashboard-stack">
        <section className="metric-grid">
          <StatCard title="Users" value={formatNumber(items.length)} />
          <StatCard title="Active Users" value={formatNumber(activeCount)} />
          <StatCard title="Suspended Users" value={formatNumber(suspendedCount)} />
          <StatCard title="Linked Workers" value={formatNumber(linkedCount)} />
          <StatCard title="Policy Attached" value={formatNumber(policyAttachedCount)} />
        </section>
        <div className="panel-grid two-up">
          <ObjectListTable title="User Status Mix" caption="Account and enrollment posture" payload={statusRows} preferredKeys={['status', 'count']} />
          <DetailPanel
            title="User Detail"
            caption="Selected insured user"
            item={selected}
            fields={[
              { key: 'email', label: 'Email' },
              { key: 'status', label: 'Status' },
              { key: 'role', label: 'Role' },
              { key: 'platformName', label: 'Platform' },
              { key: 'platformDriverId', label: 'Worker ID' },
              { key: 'city', label: 'City' },
              { key: 'policyStatus', label: 'Policy Status' }
            ]}
          />
        </div>
        <div className="panel-grid two-up">
          <ObjectListTable
            title="Users"
            caption="Insured users and linked workers"
            payload={items}
            preferredKeys={['email', 'status', 'role', 'platformName', 'platformDriverId', 'city']}
            rowKey={(row) => row.id}
            selectedRowKey={selectedId}
            onRowClick={(row) => setSelectedId(row.id)}
          />
          <DetailPanel
            title="Selected Context"
            caption="Read-only snapshot of the selected insured user"
            item={selected}
            fields={[
              { key: 'email', label: 'Email' },
              { key: 'platformDriverId', label: 'Worker' },
              { key: 'platformName', label: 'Platform' },
              { key: 'city', label: 'City' },
              { key: 'status', label: 'Account Status' },
              { key: 'policyStatus', label: 'Policy Status' }
            ]}
          />
        </div>
      </div>
    </QueryState>
  );
}
