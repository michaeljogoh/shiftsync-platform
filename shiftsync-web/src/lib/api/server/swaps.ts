import 'server-only';

import { serverFetch } from './client';

export type SwapStatus =
  | 'pending_target'
  | 'pending_manager'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export interface SwapRequestSummary {
  id: string;
  type: 'swap' | 'drop';
  status: SwapStatus;
  initiatorId: string;
  targetUserId: string | null;
  initiatorAssignmentId: string;
  targetAssignmentId: string | null;
  initiatorNote: string | null;
  managerNote: string | null;
  expiresAt: string;
  createdAt: string;
  initiator?: { id: string; firstName: string; lastName: string; email: string };
  targetUser?: { id: string; firstName: string; lastName: string; email: string } | null;
  initiatorAssignment?: {
    id: string;
    shift?: { id: string; title: string | null; startAt: string; endAt: string; location?: { name: string } };
  };
  targetAssignment?: { id: string; shift?: { id: string; startAt: string; endAt: string } } | null;
}

export async function fetchSwaps(params: {
  locationId?: string;
  status?: string;
  token?: string;
}): Promise<SwapRequestSummary[]> {
  const search = new URLSearchParams();
  if (params.locationId) search.set('locationId', params.locationId);
  if (params.status) search.set('status', params.status);
  return serverFetch<SwapRequestSummary[]>(`/swaps?${search.toString()}`, {
    token: params.token,
    tags: ['swaps'],
  });
}

export async function fetchSwap(id: string, params?: { token?: string }): Promise<SwapRequestSummary> {
  return serverFetch<SwapRequestSummary>(`/swaps/${id}`, {
    token: params?.token,
    tags: ['swaps', id],
  });
}
