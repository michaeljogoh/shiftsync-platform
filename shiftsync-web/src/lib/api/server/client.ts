import 'server-only';

import type { ServerSession } from '@/lib/auth/server-session';
import { getServerSession } from '@/lib/auth/server-session';

export class ServerFetchError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function ensureSession(explicitToken?: string): Promise<ServerSession> {
  if (explicitToken) {
    // When an explicit token is provided, we build a minimal session wrapper.
    return {
      accessToken: explicitToken,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      session: {} as ServerSession['session'],
    };
  }

  const session = await getServerSession();
  if (!session) {
    throw new ServerFetchError(401, 'Not authenticated');
  }
  return session;
}

export interface ServerFetchOptions extends RequestInit {
  token?: string;
  tags?: string[];
}

const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Server-only fetch wrapper for Server Components and Server Actions.
 * Uses the backend base URL and automatically attaches the access token.
 */
export async function serverFetch<T>(path: string, options: ServerFetchOptions = {}): Promise<T> {
  const { token, tags, headers, ...rest } = options;
  const { accessToken } = await ensureSession(token);

  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(headers ?? {}),
    },
    next: tags ? { tags } : undefined,
  });

  if (!res.ok) {
    let body: any;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    const message = body?.message ?? `Request failed with status ${res.status}`;
    throw new ServerFetchError(res.status, message, body ?? undefined);
  }

  return (await res.json()) as T;
}

