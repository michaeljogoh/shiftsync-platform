import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import type { SessionUser } from '../../modules/auth/auth.types';

@Injectable()
export class LocationAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: SessionUser;
      params?: { locationId?: string; id?: string };
      body?: { locationId?: string };
      query?: { locationId?: string };
    }>();
    const user = request.user;
    if (!user) return false;

    if (user.role === 'admin') return true;

    const locationId =
      request.params?.locationId ??
      request.params?.id ??
      request.body?.locationId ??
      request.query?.locationId;
    if (!locationId) return true;

    const fullUser = await this.usersRepo.findOne({
      where: { id: user.id },
      relations: ['managedLocations', 'locationCertifications'],
    });
    if (!fullUser) return false;

    if (user.role === 'manager') {
      const hasAccess = fullUser.managedLocations?.some(
        (loc) => loc.id === locationId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have manager access to this location',
        );
      }
      return true;
    }

    if (user.role === 'staff') {
      const certified = fullUser.locationCertifications?.some(
        (c) => c.locationId === locationId && !c.revokedAt,
      );
      if (!certified) {
        throw new ForbiddenException(
          'You are not certified for this location',
        );
      }
      return true;
    }

    return false;
  }
}
