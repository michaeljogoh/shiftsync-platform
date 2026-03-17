import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry(failureCount, error: any) {
          const status = typeof error?.status === 'number' ? error.status : undefined;
          if (status === 401 || status === 403) return false;
          return failureCount < 2;
        },
      },
    },
  });
}

