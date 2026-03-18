/**
 * Client-only auth cookie helpers.
 * Used so middleware can read accessToken/session and redirect accordingly.
 * Call from auth store on setAuth, updateSession, clearAuth, and after rehydration.
 */

import type { Session } from '@/types/auth';

const ACCESS_TOKEN_KEY = 'accessToken';
const SESSION_KEY = 'session';
const PATH = '/';
const MAX_AGE_DAYS = 7;

function getCookieOpts(remember: boolean = true) {
  const maxAge = remember ? 60 * 60 * 24 * MAX_AGE_DAYS : 60 * 60 * 24; // 7 days vs 1 day
  return `path=${PATH}; max-age=${maxAge}; samesite=lax`;
}

export function setAuthCookies(accessToken: string, session: Session, remember: boolean = true) {
  if (typeof document === 'undefined') return;
  const opts = getCookieOpts(remember);
  document.cookie = `${ACCESS_TOKEN_KEY}=${encodeURIComponent(accessToken)}; ${opts}`;
  document.cookie = `${SESSION_KEY}=${encodeURIComponent(JSON.stringify(session))}; ${opts}`;
}

export function clearAuthCookies() {
  if (typeof document === 'undefined') return;
  document.cookie = `${ACCESS_TOKEN_KEY}=; path=${PATH}; max-age=0`;
  document.cookie = `${SESSION_KEY}=; path=${PATH}; max-age=0`;
}
