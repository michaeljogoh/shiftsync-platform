export type Resource =
  | 'users'
  | 'locations'
  | 'shifts'
  | 'assignments'
  | 'swaps'
  | 'analytics'
  | 'audit'
  | 'availability'
  | 'skills'
  | 'notifications';

export type Action =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'approve'
  | 'deny'
  | 'export'
  | 'override';

export type Permission = `${Resource}:${Action}`;

export const ROLE_PERMISSIONS: Record<
  string,
  Record<Resource, Action[]>
> = {
  admin: {
    users: ['view', 'create', 'update', 'delete'],
    locations: ['view', 'create', 'update', 'delete'],
    shifts: ['view', 'create', 'update', 'delete', 'publish'],
    assignments: ['view', 'create', 'delete', 'override'],
    swaps: ['view', 'approve', 'deny'],
    analytics: ['view', 'export'],
    audit: ['view', 'export'],
    availability: ['view', 'update'],
    skills: ['view', 'create', 'update', 'delete'],
    notifications: ['view', 'update'],
  },
  manager: {
    users: ['view'],
    locations: ['view'],
    shifts: ['view', 'create', 'update', 'delete', 'publish'],
    assignments: ['view', 'create', 'delete', 'override'],
    swaps: ['view', 'approve', 'deny'],
    analytics: ['view', 'export'],
    audit: ['view'],
    availability: ['view'],
    skills: ['view'],
    notifications: ['view', 'update'],
  },
  staff: {
    users: [],
    locations: ['view'],
    shifts: ['view'],
    assignments: ['view'],
    swaps: ['view', 'create'],
    analytics: ['view'],
    audit: [],
    availability: ['view', 'update'],
    skills: ['view'],
    notifications: ['view', 'update'],
  },
};

