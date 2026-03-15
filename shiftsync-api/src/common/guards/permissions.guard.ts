import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '../../modules/auth/permissions.config';
import type { SessionUser } from '../../modules/auth/auth.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<Permission | undefined>(
      'permission',
      context.getHandler(),
    );
    if (!required) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user: SessionUser | undefined = request.user;
    if (!user) return false;
    return user.features.includes(required);
  }
}

