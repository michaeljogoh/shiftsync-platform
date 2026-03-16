export const queryKeys = {
  shifts: {
    all: () => ['shifts'] as const,
    byLocation: (locationId: string | undefined, week: string | undefined) =>
      ['shifts', { locationId, week }] as const,
    detail: (id: string) => ['shifts', id] as const,
    history: (id: string) => ['shifts', id, 'history'] as const,
  },
  assignments: {
    byUser: (userId: string) => ['assignments', 'user', userId] as const,
    byShift: (shiftId: string) => ['assignments', 'shift', shiftId] as const,
  },
  swaps: {
    all: () => ['swaps'] as const,
    byUser: (userId: string) => ['swaps', 'user', userId] as const,
    detail: (id: string) => ['swaps', id] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
  analytics: {
    overtime: (locationId: string | undefined, week: string | undefined) =>
      ['analytics', 'overtime', { locationId, week }] as const,
    fairness: (locationId: string, period: string) =>
      ['analytics', 'fairness', { locationId, period }] as const,
  },
  users: {
    all: (filters?: unknown) => ['users', filters] as const,
    detail: (id: string) => ['users', id] as const,
  },
  locations: {
    all: () => ['locations'] as const,
    onDuty: (id: string) => ['locations', id, 'on-duty'] as const,
  },
};

