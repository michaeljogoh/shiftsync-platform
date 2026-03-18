import axios, { AxiosHeaders } from 'axios';

import { useAuthStore } from '@/lib/stores/auth.store';

const baseURL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/v1`;

export const apiClient = axios.create({
  baseURL,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    const headers =
      config.headers && !(config.headers instanceof AxiosHeaders)
        ? new AxiosHeaders(config.headers)
        : (config.headers as AxiosHeaders | undefined) ?? new AxiosHeaders();

    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function drainQueue(token: string) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config as typeof err.config & { _retry?: boolean };

    if (err.response?.status === 401 && !originalRequest._retry) {
      const { refreshToken } = useAuthStore.getState();

      if (refreshToken) {
        if (isRefreshing) {
          return new Promise((resolve) => {
            refreshQueue.push((token: string) => {
              originalRequest.headers = originalRequest.headers ?? {};
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const { data } = await axios.post<{
            accessToken: string;
            refreshToken: string;
            session: import('@/types/auth').Session;
          }>(`${baseURL}/auth/refresh`, { refreshToken });

          const newToken = data.accessToken;
          useAuthStore.getState().updateSession(newToken, data.session, data.refreshToken);
          drainQueue(newToken);

          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch {
          refreshQueue = [];
          useAuthStore.getState().clearAuth();
          if (typeof window !== 'undefined') {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?returnUrl=${returnUrl}`;
          }
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }

      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?returnUrl=${returnUrl}`;
      }
    }
    return Promise.reject(err);
  },
);
