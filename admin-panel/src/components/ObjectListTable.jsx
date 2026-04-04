import { PanelTable } from './PanelTable';
import { formatLabel } from '../lib/utils/format';

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.policies)) return payload.policies;
  if (Array.isArray(payload?.cases)) return payload.cases;
  if (Array.isArray(payload?.entries)) return payload.entries;
  return [];
}

function extractPagination(payload) {
  return payload?.pagination || null;
}

export function ObjectListTable({ title, caption, payload, preferredKeys = [], onRowClick, selectedRowKey, rowKey, pagination }) {
  const rows = normalizeRows(payload);
  const payloadPagination = extractPagination(payload);
  const inferredKeys = rows[0] ? Object.keys(rows[0]).filter((key) => typeof rows[0][key] !== 'object').slice(0, 6) : [];
  const keys = [...new Set([...preferredKeys, ...inferredKeys])].slice(0, 6);
  const columns = keys.map((key) => ({
    key,
    label: formatLabel(key),
    render: (row) => row?.[key]
  }));

  return (
    <PanelTable
      title={title}
      caption={caption}
      columns={columns}
      rows={rows}
      rowKey={rowKey || ((row, index) => row?._id || row?.id || index)}
      onRowClick={onRowClick}
      selectedRowKey={selectedRowKey}
      pagination={pagination || payloadPagination}
    />
  );
}
