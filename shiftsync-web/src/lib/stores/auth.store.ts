import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Role, Session } from '@/types/auth';
import { setAuthCookies, clearAuthCookies } from '@/lib/auth/client-cookies';
import { closeSocket } from '@/lib/socket';

// ─── Types (mirror backend exactly) ───────────────────────────────────────
// Role, Permission, SessionUser, Session are in @/types/auth
//
// Critical: session.features is the only place the frontend checks permissions.
// Never duplicate role/permission checks in component logic. Always use can() / is() from this store.

export type Permission = string;

export interface AuthStore {
  accessToken: string | null;
  session: Session | null;
  isAuthenticated: boolean;

  setAuth: (accessToken: string, session: Session, remember?: boolean) => void;
  updateSession: (accessToken: string, session: Session) => void;
  clearAuth: () => void;

  can: (feature: Permission) => boolean;
  is: (role: Role | Role[]) => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      accessToken: null,
      session: null,
      isAuthenticated: false,

      setAuth(accessToken, session, remember = true) {
        set({ accessToken, session, isAuthenticated: true });
        setAuthCookies(accessToken, session, remember);
      },

      updateSession(accessToken, session) {
        set({ accessToken, session, isAuthenticated: true });
        setAuthCookies(accessToken, session, true);
      },

      clearAuth() {
        closeSocket();
        set({ accessToken: null, session: null, isAuthenticated: false });
        clearAuthCookies();
      },

      can(feature) {
        return get().session?.features.includes(feature) ?? false;
      },

      is(role) {
        const current = get().session?.role;
        if (!current) return false;
        return Array.isArray(role) ? role.includes(current) : role === current;
      },
    }),
    {
      name: 'shiftsync-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken && state?.session) {
          setAuthCookies(state.accessToken, state.session, true);
        }
      },
    },
  ),
);
