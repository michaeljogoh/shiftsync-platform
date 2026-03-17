'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { LocationSummary } from '@/lib/api/server/locations';
import type { AuditLogEntry } from '@/lib/api/server/audit';
import { PermissionGate } from '@/components/shared/PermissionGate';

interface AuditClientProps {
  locations: LocationSummary[];
}

export function AuditClient({ locations }: AuditClientProps) {
  const [entityType, setEntityType] = useState('');
  const [actorId, setActorId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: queryKeys.audit.logs({ entityType, actorId, locationId, limit, offset }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityType) params.set('entityType', entityType);
      if (actorId) params.set('actorId', actorId);
      if (locationId) params.set('locationId', locationId);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const { data } = await apiClient.get<AuditLogEntry[]>(`/audit/logs?${params.toString()}`);
      return data;
    },
  });

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (entityType) params.set('entityType', entityType);
    if (actorId) params.set('actorId', actorId);
    if (locationId) params.set('locationId', locationId);
    const { data } = await apiClient.get<string>(`/audit/logs/export?${params.toString()}`, {
      responseType: 'text',
    });
    const blob = new Blob([data], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'audit-logs.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-50">Audit Log</h1>
        <PermissionGate require="audit:export">
          <Button size="sm" variant="outline" onClick={handleExport}>
            Export CSV
          </Button>
        </PermissionGate>
      </div>

      <PermissionGate require="audit:view" fallback={<p className="text-sm text-slate-400">You need audit:view permission.</p>}>
        <div className="flex flex-wrap gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <input
            type="text"
            placeholder="Entity type"
            className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          />
          <input
            type="text"
            placeholder="Actor ID"
            className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
          />
          <select
            className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {isLoading && <div className="text-sm text-slate-400">Loading…</div>}
        {!isLoading && (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/70">
                  <th className="px-3 py-2 text-left font-medium text-slate-300">Timestamp</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">Actor</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">Action</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">Entity</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">Location</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800">
                    <td className="px-3 py-2 text-slate-400">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-200">
                      {log.actor ? `${log.actor.email}` : log.actorId ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-200">{log.action}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {log.entityType} {log.entityId}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{log.locationId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-slate-500">No audit logs.</div>
            )}
          </div>
        )}
        <div className="flex justify-between pt-2">
          <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - limit))}>
            Previous
          </Button>
          <Button size="sm" variant="outline" disabled={logs.length < limit} onClick={() => setOffset((o) => o + limit)}>
            Next
          </Button>
        </div>
      </PermissionGate>
    </div>
  );
}
