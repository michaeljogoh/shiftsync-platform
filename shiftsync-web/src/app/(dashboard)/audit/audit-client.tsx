'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { AuditLogEntry } from '@/lib/api/server/audit';
import { PermissionGate } from '@/components/shared/PermissionGate';

export function AuditClient() {
  const [actorEmail, setActorEmail] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', actorEmail, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (actorEmail) params.set('actorEmail', actorEmail);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      const { data } = await apiClient.get<AuditLogEntry[]>(`/audit/logs?${params.toString()}`);
      return data;
    },
  });

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (actorEmail) params.set('actorEmail', actorEmail);
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">Audit Log</h1>
        <PermissionGate require="audit:export">
          <Button
            size="sm"
            variant="default"
            className="min-h-[44px] sm:min-h-0"
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </PermissionGate>
      </div>

      <PermissionGate require="audit:view" fallback={<p className="text-sm text-muted-foreground">You need audit:view permission.</p>}>
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-card p-3">
          <input
            type="text"
            placeholder="Search by actor email…"
            className="h-10 w-full min-h-[44px] rounded-md border border-input bg-background px-3 text-sm text-foreground sm:h-9 sm:w-64 sm:min-h-0"
            value={actorEmail}
            onChange={(e) => { setActorEmail(e.target.value); setOffset(0); }}
          />
        </div>

        {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && (
          <div className="overflow-x-auto rounded-lg border border-border -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Timestamp</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actor</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Action</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Entity</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Location</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border">
                    <td className="px-3 py-2 text-muted-foreground">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      {log.actor ? `${log.actor.email}` : log.actorId ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-foreground">{log.action}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {log.entityType} {log.entityId}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{log.location?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">No audit logs.</div>
            )}
          </div>
        )}
        <div className="flex justify-between gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] sm:min-h-0"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px] sm:min-h-0"
            disabled={logs.length < limit}
            onClick={() => setOffset((o) => o + limit)}
          >
            Next
          </Button>
        </div>
      </PermissionGate>
    </div>
  );
}
