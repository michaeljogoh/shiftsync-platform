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
import { ArrowLeftRightIcon, PackageOpenIcon, CheckIcon, XIcon, HandIcon } from 'lucide-react';

function swapStatusBadge(status: string) {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending_target: 'default',
    pending_manager: 'default',
    approved: 'secondary',
    rejected: 'destructive',
    cancelled: 'secondary',
    expired: 'secondary',
  };
  return <Badge variant={map[status] ?? 'secondary'} className="text-xs">{status.replace('_', ' ')}</Badge>;
}

async function fetchSwapsClient(locationId?: string, status?: string): Promise<SwapRequestSummary[]> {
  const params = new URLSearchParams();
  if (locationId) params.set('locationId', locationId);
  if (status) params.set('status', status);
  const { data } = await apiClient.get<SwapRequestSummary[]>(`/swaps?${params.toString()}`);
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
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const role = session?.role;

  type View = 'manager' | 'staff' | 'drops';
  const defaultView: View = role === 'admin' || role === 'manager' ? 'manager' : 'staff';
  const [view, setView] = useState<View>(defaultView);
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [denyModal, setDenyModal] = useState<SwapRequestSummary | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [acceptModal, setAcceptModal] = useState<SwapRequestSummary | null>(null);
  const [acceptNote, setAcceptNote] = useState('');
  const [actioning, setActioning] = useState(false);
  const [createSwapOpen, setCreateSwapOpen] = useState(false);

  const { data: managerSwaps = [], isLoading: managerLoading, isError: managerError, error: managerErr, refetch: refetchSwaps } = useQuery({
    queryKey: [...queryKeys.swaps.all(), { locationId: locationFilter, status: statusFilter }],
    queryFn: () => fetchSwapsClient(locationFilter || undefined, statusFilter || undefined),
    enabled: view === 'manager',
  });

  const swapStatusCode = (managerErr as { response?: { status?: number } })?.response?.status;

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
    enabled: (view === 'staff') && !!userId,
  });

  const { data: availableDrops = [], isLoading: dropsLoading } = useQuery({
    queryKey: ['swaps', 'available-drops', userId],
    queryFn: async () => {
      const { data } = await apiClient.get<SwapRequestSummary[]>('/swaps/available-drops');
      return data;
    },
    enabled: view === 'drops' && !!userId,
  });

  // Swaps where I am the target
  const incomingSwaps = mySwaps.filter((s) => s.targetUserId === userId && s.status === 'pending_target');

  const handleApprove = async (swap: SwapRequestSummary) => {
    setActioning(true);
    try {
      await apiClient.patch(`/swaps/${swap.id}/approve`, {});
      toast.success('Request approved.');
      queryClient.invalidateQueries({ queryKey: queryKeys.swaps.all() });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to approve');
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

  const handleAcceptSwap = async () => {
    if (!acceptModal) return;
    setActioning(true);
    try {
      await apiClient.patch(`/swaps/${acceptModal.id}/accept`, { targetNote: acceptNote });
      toast.success('Swap accepted — pending manager approval.');
      setAcceptModal(null);
      setAcceptNote('');
      queryClient.invalidateQueries({ queryKey: ['swaps', 'my', userId] });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to accept');
    } finally {
      setActioning(false);
    }
  };

  const handleRejectSwap = async (swap: SwapRequestSummary) => {
    setActioning(true);
    try {
      await apiClient.patch(`/swaps/${swap.id}/reject`, {});
      toast.success('Swap rejected.');
      queryClient.invalidateQueries({ queryKey: ['swaps', 'my', userId] });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to reject');
    } finally {
      setActioning(false);
    }
  };

  const handleCancelRequest = async (swap: SwapRequestSummary) => {
    setActioning(true);
    try {
      await apiClient.patch(`/swaps/${swap.id}/cancel`, {});
      toast.success('Request cancelled.');
      queryClient.invalidateQueries({ queryKey: ['swaps', 'my', userId] });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to cancel');
    } finally {
      setActioning(false);
    }
  };

  const handleClaimDrop = async (swap: SwapRequestSummary) => {
    setActioning(true);
    try {
      await apiClient.patch(`/swaps/${swap.id}/claim`, {});
      toast.success('Shift picked up! Check your schedule.');
      queryClient.invalidateQueries({ queryKey: ['swaps', 'available-drops', userId] });
      queryClient.invalidateQueries({ queryKey: ['swaps', 'my', userId] });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to claim shift');
    } finally {
      setActioning(false);
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString();
  const canCancelStatuses = ['pending_target', 'pending_manager'];

  const formatShiftLabel = (shift: { title?: string | null; startAt: string; endAt: string; location?: { name: string; ianaTimezone?: string } }) => {
    const tz = shift.location?.ianaTimezone ?? 'UTC';
    const { primary } = formatShiftTimeRange({ startAt: shift.startAt, endAt: shift.endAt, locationTimezone: tz });
    return `${shift.title ?? 'Shift'} · ${primary}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">Swap & Drop Requests</h1>
        <div className="flex flex-wrap items-center gap-2">
          <RoleGate role={['admin', 'manager']}>
            <Button variant={view === 'manager' ? 'secondary' : 'ghost'} size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => setView('manager')}>
              Manager view
            </Button>
          </RoleGate>
          <Button variant={view === 'staff' ? 'secondary' : 'ghost'} size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => setView('staff')}>
            My requests
            {incomingSwaps.length > 0 && (
              <Badge className="ml-1.5 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center" variant="destructive">
                {incomingSwaps.length}
              </Badge>
            )}
          </Button>
          <Button variant={view === 'drops' ? 'secondary' : 'ghost'} size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => setView('drops')}>
            <PackageOpenIcon className="mr-1 size-3.5" />
            Available drops
          </Button>
          {(view === 'staff' || view === 'drops') && userId && (
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

      {/* Manager View */}
      {view === 'manager' && (
        <PermissionGate require="swaps:view" fallback={<PermissionDenied />}>
          <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-card p-3">
            <select className="h-10 w-full min-h-[44px] rounded-md border border-input bg-background px-2 text-sm text-foreground sm:h-9 sm:w-auto sm:min-h-0" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
              <option value="">All locations</option>
              {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
            <select className="h-10 w-full min-h-[44px] rounded-md border border-input bg-background px-2 text-sm text-foreground sm:h-9 sm:w-auto sm:min-h-0" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
            <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full rounded" />)}</div>
          )}
          {managerError && (swapStatusCode === 403 ? <PermissionDenied /> : <FullPageError message="Failed to load swap requests." onRetry={() => refetchSwaps()} />)}
          {!managerLoading && !managerError && (
            <div className="overflow-x-auto rounded-lg border border-border -mx-1 px-1 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-3 py-2 text-left font-medium text-foreground">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Initiator</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Target</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Shift</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Submitted</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managerSwaps.map((swap) => (
                    <tr key={swap.id} className="border-b border-border">
                      <td className="px-3 py-2"><Badge variant="outline">{swap.type}</Badge></td>
                      <td className="px-3 py-2 text-foreground">{swap.initiator ? `${swap.initiator.firstName} ${swap.initiator.lastName}` : swap.initiatorId}</td>
                      <td className="px-3 py-2 text-foreground">{swap.targetUser ? `${swap.targetUser.firstName} ${swap.targetUser.lastName}` : '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{swap.initiatorAssignment?.shift ? formatShiftLabel(swap.initiatorAssignment.shift) : '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(swap.createdAt)}</td>
                      <td className="px-3 py-2">{swapStatusBadge(swap.status)}</td>
                      <td className="px-3 py-2">
                        {swap.status === 'pending_manager' && (
                          <div className="flex gap-1.5">
                            <Button size="sm" className="min-h-[44px] min-w-[44px] sm:h-7 sm:min-h-0 sm:min-w-0" onClick={() => handleApprove(swap)} disabled={actioning}>Approve</Button>
                            <Button size="sm" variant="outline" className="min-h-[44px] min-w-[44px] sm:h-7 sm:min-h-0 sm:min-w-0" onClick={() => setDenyModal(swap)} disabled={actioning}>Deny</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {managerSwaps.length === 0 && (
                <div className="py-12 text-center">
                  <ArrowLeftRightIcon className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No requests match your filters.</p>
                </div>
              )}
            </div>
          )}
        </PermissionGate>
      )}

      {/* Staff View — My requests */}
      {view === 'staff' && (
        <div className="space-y-4">
          {/* Incoming swap requests (I am the target) */}
          {incomingSwaps.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Badge variant="destructive">{incomingSwaps.length}</Badge>
                Incoming swap requests — action required
              </h2>
              <div className="space-y-2">
                {incomingSwaps.map((swap) => (
                  <div key={swap.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {swap.initiator ? `${swap.initiator.firstName} ${swap.initiator.lastName}` : 'Someone'} wants to swap shifts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Their shift: {swap.initiatorAssignment?.shift ? formatShiftLabel(swap.initiatorAssignment.shift) : '—'}
                      </p>
                      {swap.initiatorNote && <p className="text-xs italic text-muted-foreground mt-0.5">&ldquo;{swap.initiatorNote}&rdquo;</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 gap-1" onClick={() => setAcceptModal(swap)} disabled={actioning}>
                        <CheckIcon className="size-3.5" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => handleRejectSwap(swap)} disabled={actioning}>
                        <XIcon className="size-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">Your original assignment stays unchanged until manager approval. You can cancel before approval.</p>
          {mySwapsLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : mySwaps.filter((s) => s.initiatorId === userId).length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
              <ArrowLeftRightIcon className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">No active requests</p>
              <p className="mt-1 text-xs text-muted-foreground">Create a swap or drop request using the button above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border -mx-1 px-1 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="px-3 py-2 text-left font-medium text-foreground">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">My shift</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">With / To</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mySwaps.filter((s) => s.initiatorId === userId).map((swap) => (
                    <tr key={swap.id} className="border-b border-border">
                      <td className="px-3 py-2"><Badge variant="outline">{swap.type}</Badge></td>
                      <td className="px-3 py-2 text-foreground">{swap.initiatorAssignment?.shift ? formatShiftLabel(swap.initiatorAssignment.shift) : '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {swap.targetUser ? `${swap.targetUser.firstName} ${swap.targetUser.lastName}` : swap.type === 'drop' ? 'Open drop' : '—'}
                      </td>
                      <td className="px-3 py-2">{swapStatusBadge(swap.status)}</td>
                      <td className="px-3 py-2">
                        {canCancelStatuses.includes(swap.status) && (
                          <Button size="sm" variant="outline" className="min-h-[44px] sm:min-h-0" onClick={() => handleCancelRequest(swap)} disabled={actioning}>
                            Cancel
                          </Button>
                        )}
                        {!canCancelStatuses.includes(swap.status) && (
                          <span className="text-xs text-muted-foreground capitalize">{swap.status.replace('_', ' ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Available drops view */}
      {view === 'drops' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">These are open drop requests from colleagues. Pick one up if you&apos;re qualified — no manager approval needed for claiming.</p>
          {dropsLoading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : availableDrops.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-4 py-12 text-center">
              <PackageOpenIcon className="mx-auto mb-2 size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">No available drops</p>
              <p className="mt-1 text-xs text-muted-foreground">When colleagues drop shifts you&apos;re qualified for, they&apos;ll appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableDrops.map((drop) => {
                const shift = drop.initiatorAssignment?.shift;
                return (
                  <div key={drop.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {shift ? formatShiftLabel(shift) : 'Shift'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shift?.location?.name} · Dropped by {drop.initiator ? `${drop.initiator.firstName} ${drop.initiator.lastName}` : 'colleague'}
                      </p>
                      {drop.initiatorNote && <p className="text-xs italic text-muted-foreground">&ldquo;{drop.initiatorNote}&rdquo;</p>}
                      {drop.expiresAt && (
                        <p className="text-xs text-amber-600">Expires: {new Date(drop.expiresAt).toLocaleString()}</p>
                      )}
                    </div>
                    <Button size="sm" className="gap-1.5 min-h-[44px] sm:min-h-0" onClick={() => handleClaimDrop(drop)} disabled={actioning}>
                      <HandIcon className="size-3.5" /> Pick up shift
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Deny modal */}
      <Dialog open={!!denyModal} onOpenChange={(open) => !open && setDenyModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny request</DialogTitle>
            <DialogDescription>Optionally provide a reason for the denial.</DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
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

      {/* Accept swap modal */}
      <Dialog open={!!acceptModal} onOpenChange={(open) => !open && setAcceptModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept swap request</DialogTitle>
            <DialogDescription>
              Accepting sends this to the manager for final approval. Your assignment stays unchanged until then.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Note (optional)</label>
            <textarea
              className="min-h-[60px] w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              placeholder="Any message for the manager..."
              value={acceptNote}
              onChange={(e) => setAcceptNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptModal(null)}>Cancel</Button>
            <Button onClick={handleAcceptSwap} disabled={actioning}>Accept swap</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
