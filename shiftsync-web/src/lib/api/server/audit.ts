import 'server-only';

import { serverFetch } from './client';

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  locationId: string | null;
  createdAt: string;
  actor?: { id: string; email: string; firstName: string; lastName: string } | null;
  location?: { id: string; name: string } | null;
}

export async function fetchAuditLogs(params: {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  locationId?: string;
  limit?: number;
  offset?: number;
  token?: string;
}): Promise<AuditLogEntry[]> {
  const search = new URLSearchParams();
  if (params.entityType) search.set('entityType', params.entityType);
  if (params.entityId) search.set('entityId', params.entityId);
  if (params.actorId) search.set('actorId', params.actorId);
  if (params.locationId) search.set('locationId', params.locationId);
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  return serverFetch<AuditLogEntry[]>(`/audit/logs?${search.toString()}`, {
    token: params.token,
    tags: ['audit'],
  });
}
