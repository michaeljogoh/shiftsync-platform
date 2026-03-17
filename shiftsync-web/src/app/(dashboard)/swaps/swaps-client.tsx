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
import { formatShiftTimeRange } from '@/lib/format-shift-time';
import { useAuthStore } from '@/lib/stores/auth.store';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { RoleGate } from '@/components/shared/RoleGate';
import { toast } from 'sonner';
import { FullPageError } from '@/components/shared/FullPageError';
import { PermissionDenied } from '@/components/shared/PermissionDenied';
import { CreateSwapRequestForm, type AssignmentOption } from './create-swap-request-form';
import { Skeleton } from '@/components/ui/skeleton';

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

async function fetchMyAssignments(userId: string): Promise<AssignmentOption[]> {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 14);
  const { data } = await apiClient.get<Array<{ id: string; shift?: { id: string; title: string | null; startAt: string } }>>(
    `/users/${userId}/assignments?startDate=${start.toISOString().slice(0, 10)}&endDate=${end.toISOString().slice(0, 10)}`,
  );
  return Array.isArray(data) ? data : [];
}

export function SwapsClient({ locations }: SwapsClientProps) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const [view, setView] = useState<'manager' | 'staff'>('manager');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [denyModal, setDenyModal] = useState<SwapRequestSummary | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [actioning, setActioning] = useState(false);
  const [createSwapOpen, setCreateSwapOpen] = useState(false);

  const { data: managerSwaps = [], isLoading: managerLoading, isError: managerError, error: managerErr, refetch: refetchSwaps } = useQuery({
    queryKey: [...queryKeys.swaps.all(), { locationId: locationFilter, status: statusFilter }],
    queryFn: () => fetchSwapsClient(locationFilter || undefined, statusFilter || undefined),
    enabled: view === 'manager',
  });

  const swapStatusCode = (managerErr as { response?: { status?: number } })?.response?.status;

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

  const formatShiftLabel = (shift: { title?: string | null; startAt: string; endAt: string; location?: { name: string; ianaTimezone?: string } }) => {
    const tz = shift.location?.ianaTimezone ?? 'UTC';
    const { primary } = formatShiftTimeRange({ startAt: shift.startAt, endAt: shift.endAt, locationTimezone: tz });
    return `${shift.title ?? 'Shift'} · ${primary}`;
  };

  const { data: myAssignments = [] } = useQuery({
    queryKey: ['assignments', 'me', userId],
    queryFn: () => fetchMyAssignments(userId!),
    enabled: createSwapOpen && !!userId,
  });

  const { data: mySwaps = [], isLoading: mySwapsLoading } = useQuery({
    queryKey: ['swaps', 'my', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<SwapRequestSummary[]>(`/users/${userId}/swaps`);
      return data;
    },
    enabled: view === 'staff' && !!userId,
  });

  const handleCancelRequest = async (swap: SwapRequestSummary) => {
    setActioning(true);
    try {
      await apiClient.patch(`/swaps/${swap.id}/cancel`, {});
      toast.success('Request cancelled.');
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all() });
      queryClient.invalidateQueries({ queryKey: ['swaps', 'my', userId] });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to cancel';
      toast.error(msg);
    } finally {
      setActioning(false);
    }
  };

  const canCancelStatuses = ['pending_target', 'pending_manager'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-50">Swap & Drop Requests</h1>
        <div className="flex flex-wrap items-center gap-2">
          <RoleGate role={['admin', 'manager']}>
            <Button
              variant={view === 'manager' ? 'secondary' : 'ghost'}
              size="sm"
              className="min-h-[44px] sm:min-h-0"
              onClick={() => setView('manager')}
            >
              Manager view
            </Button>
            <Button
              variant={view === 'staff' ? 'secondary' : 'ghost'}
              size="sm"
              className="min-h-[44px] sm:min-h-0"
              onClick={() => setView('staff')}
            >
              My requests
            </Button>
          </RoleGate>
          <RoleGate role={['staff']}>
            {view !== 'staff' && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] sm:min-h-0"
                onClick={() => setView('staff')}
              >
                My requests
              </Button>
            )}
          </RoleGate>
          {view === 'staff' && userId && (
            <Button size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => setCreateSwapOpen(true)}>
              New request
            </Button>
          )}
        </div>
      </div>

      <CreateSwapRequestForm
        open={createSwapOpen}
        onOpenChange={setCreateSwapOpen}
        myAssignments={myAssignments}
        targetAssignments={[]}
      />

      {view === 'manager' && (
        <PermissionGate require="swaps:view" fallback={<p className="text-sm text-slate-400">You need permission to view swap requests.</p>}>
          <div className="flex flex-wrap gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            <select
              className="h-10 w-full min-h-[44px] rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 sm:h-9 sm:w-auto sm:min-h-0"
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
              className="h-10 w-full min-h-[44px] rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 sm:h-9 sm:w-auto sm:min-h-0"
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

          {managerLoading && (
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
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-slate-800">
                      <td className="px-3 py-2"><Skeleton className="h-5 w-14 rounded" /></td>
                      <td className="px-3 py-2"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-3 py-2"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-3 py-2"><Skeleton className="h-5 w-20 rounded" /></td>
                      <td className="px-3 py-2"><Skeleton className="h-7 w-16 rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {managerError && view === 'manager' && (
            swapStatusCode === 403 ? (
              <PermissionDenied />
            ) : (
              <FullPageError
                message="Failed to load swap requests. Please try again."
                onRetry={() => refetchSwaps()}
              />
            )
          )}
          {!managerLoading && !managerError && (
            <div className="overflow-x-auto rounded-lg border border-slate-800 -mx-1 px-1 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[600px] text-sm">
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
                          ? formatShiftLabel(swap.initiatorAssignment.shift)
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{formatDate(swap.createdAt)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={swap.status === 'pending_manager' ? 'default' : 'secondary'}>{swap.status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        {swap.status === 'pending_manager' && (
                          <div className="flex gap-1.5">
                            <Button size="sm" className="min-h-[44px] min-w-[44px] sm:h-7 sm:min-h-0 sm:min-w-0" onClick={() => handleApprove(swap)} disabled={actioning}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="min-h-[44px] min-w-[44px] sm:h-7 sm:min-h-0 sm:min-w-0" onClick={() => setDenyModal(swap)} disabled={actioning}>
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
                <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
                  <p className="text-sm font-medium text-slate-200">No pending requests</p>
                  <p className="mt-1 text-xs text-slate-500">When staff submit swap or drop requests, they&apos;ll appear here.</p>
                </div>
              )}
            </div>
          )}
        </PermissionGate>
      )}

      {view === 'staff' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">My active requests. Cancel before manager approval to revert. Your original assignment stays unchanged until the request is approved.</p>
          {mySwapsLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : mySwaps.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-300">No pending requests</p>
              <p className="mt-1 text-xs text-slate-500">Create a swap or drop request from the Schedule or use the button above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-800 -mx-1 px-1 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/70">
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">My shift</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mySwaps.map((swap) => (
                    <tr key={swap.id} className="border-b border-slate-800">
                      <td className="px-3 py-2">
                        <Badge variant="outline">{swap.type}</Badge>
                      </td>
                      <td className="px-3 py-2 text-slate-200">
                        {swap.initiatorAssignment?.shift
                          ? formatShiftLabel(swap.initiatorAssignment.shift)
                          : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={swap.status === 'pending_manager' || swap.status === 'pending_target' ? 'default' : 'secondary'}>
                          {swap.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {canCancelStatuses.includes(swap.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[44px] sm:min-h-0"
                            onClick={() => handleCancelRequest(swap)}
                            disabled={actioning}
                          >
                            Cancel request
                          </Button>
                        )}
                        {swap.status === 'approved' && <span className="text-slate-500">Approved</span>}
                        {swap.status === 'rejected' && <span className="text-slate-500">Rejected</span>}
                        {swap.status === 'cancelled' && <span className="text-slate-500">Cancelled</span>}
                        {swap.status === 'expired' && <span className="text-slate-500">Expired</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
