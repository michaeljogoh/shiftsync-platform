import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Permission } from '../../modules/auth/permissions.config';
import type { SessionUser } from '../../modules/auth/auth.types';

export const Public = () => SetMetadata('isPublic', true);

export const Roles = (...roles: Array<'admin' | 'manager' | 'staff'>) =>
  SetMetadata('roles', roles);

export const RequirePermission = (permission: Permission) =>
  SetMetadata('permission', permission);

export const CurrentUser = createParamDecorator(
  (
    data: keyof SessionUser | undefined,
    ctx: ExecutionContext,
  ) => {
    const request = ctx.switchToHttp().getRequest();
    const user: SessionUser | undefined = request.user;
    if (!user) return null;
    return data ? user[data] : user;
  },
);

