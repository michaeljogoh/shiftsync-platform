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
    // eslint-disable-next-line no-param-reassign
    config.headers = headers;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?returnUrl=${returnUrl}`;
      }
    }
    return Promise.reject(err);
  },
);
