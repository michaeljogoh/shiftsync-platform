'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/client/client';
import { queryKeys } from '@/lib/query-keys';
import type { SwapRequestSummary } from '@/lib/api/server/swaps';
import type { LocationSummary } from '@/lib/api/server/locations';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { RoleGate } from '@/components/shared/RoleGate';
import { toast } from 'sonner';

async function fetchSwapsClient(locationId?: string, status?: string): Promise<SwapRequestSummary[]> {
  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  if (status) params.set('status', status);
  const { data } = await apiClient.get<SwapRequestSummary[]>(`/swaps?${params.toString()}`);
  return data;
}

async function fetchMySwapsClient(): Promise<SwapRequestSummary[]> {
  const { data } = await apiClient.get<SwapRequestSummary[]>('/swaps');
  return data;
}

interface SwapsClientProps {
  locations: LocationSummary[];
}

export function SwapsClient({ locations }: SwapsClientProps) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'manager' | 'staff'>('manager');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [denyModal, setDenyModal] = useState<SwapRequestSummary | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [actioning, setActioning] = useState(false);

  const { data: managerSwaps = [], isLoading: managerLoading } = useQuery({
    queryKey: [...queryKeys.swaps.all(), { locationId: locationFilter, status: statusFilter }],
    queryFn: () => fetchSwapsClient(locationFilter || undefined, statusFilter || undefined),
    enabled: view === 'manager',
  });

  const handleApprove = async (swap: SwapRequestSummary) => {
    setActioning(true);
    try {
      await apiClient.patch(`/swaps/${swap.id}/approve`, {});
      toast.success('Request approved.');
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all() });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to approve';
      toast.error(msg);
    } finally {
      setActioning(false);
    }
  };

  const handleDeny = async () => {
    if (!denyModal) return;
    setActioning(true);
    try {
      await apiClient.patch(`/swaps/${denyModal.id}/deny`, { managerNote: denyReason });
      toast.success('Request denied.');
      setDenyModal(null);
      setDenyReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all() });
    } catch {
      toast.error('Failed to deny');
    } finally {
      setActioning(false);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-50">Swap & Drop Requests</h1>
        <RoleGate role={['admin', 'manager']}>
          <div className="flex gap-2">
            <Button
              variant={view === 'manager' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('manager')}
            >
              Manager view
            </Button>
            <Button
              variant={view === 'staff' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('staff')}
            >
              My requests
            </Button>
          </div>
        </RoleGate>
      </div>

      {view === 'manager' && (
        <PermissionGate require="swaps:view" fallback={<p className="text-sm text-slate-400">You need permission to view swap requests.</p>}>
          <div className="flex flex-wrap gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <select
              className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="pending_target">Pending target</option>
              <option value="pending_manager">Pending manager</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {managerLoading && <div className="text-sm text-slate-400">Loading…</div>}
          {!managerLoading && (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/70">
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Initiator</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Target</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Shift</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Submitted</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managerSwaps.map((swap) => (
                    <tr key={swap.id} className="border-b border-slate-800">
                      <td className="px-3 py-2">
                        <Badge variant="outline">{swap.type}</Badge>
                      </td>
                      <td className="px-3 py-2 text-slate-200">
                        {swap.initiator ? `${swap.initiator.firstName} ${swap.initiator.lastName}` : swap.initiatorId}
                      </td>
                      <td className="px-3 py-2 text-slate-200">
                        {swap.targetUser ? `${swap.targetUser.firstName} ${swap.targetUser.lastName}` : swap.type === 'drop' ? '—' : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {swap.initiatorAssignment?.shift
                          ? `${swap.initiatorAssignment.shift.title ?? 'Shift'} · ${formatDate(swap.initiatorAssignment.shift.startAt)}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{formatDate(swap.createdAt)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={swap.status === 'pending_manager' ? 'default' : 'secondary'}>{swap.status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        {swap.status === 'pending_manager' && (
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7" onClick={() => handleApprove(swap)} disabled={actioning}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-7" onClick={() => setDenyModal(swap)} disabled={actioning}>
                              Deny
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {managerSwaps.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-slate-500">No swap requests match the filters.</div>
              )}
            </div>
          )}
        </PermissionGate>
      )}

      {view === 'staff' && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-sm text-slate-400">My active requests and shifts I can pick up — use Schedule to request swap/drop from an assignment.</p>
        </div>
      )}

      <Dialog open={!!denyModal} onOpenChange={(open) => !open && setDenyModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny request</DialogTitle>
            <DialogDescription>Optionally provide a reason (required by spec).</DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-[80px] w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
            placeholder="Reason for denial…"
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyModal(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeny} disabled={actioning}>Deny</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
