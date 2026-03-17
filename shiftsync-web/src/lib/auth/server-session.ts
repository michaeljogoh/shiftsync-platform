import 'server-only';

import { cookies } from 'next/headers';
import type { Role, Session, SessionUser } from '@/types/auth';

export type { Role, Session, SessionUser };

export interface ServerSession {
  accessToken: string;
  session: Session;
}

/**
 * Placeholder server-side session reader.
 * Later we will align this with the real backend auth cookies.
 */
export async function getServerSession(): Promise<ServerSession | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const rawSession = cookieStore.get('session')?.value;

  if (!accessToken || !rawSession) return null;

  let session: Session;
  try {
    const decoded = decodeURIComponent(rawSession);
    session = JSON.parse(decoded) as Session;
  } catch {
    return null;
  }

  return { accessToken, session };
}

