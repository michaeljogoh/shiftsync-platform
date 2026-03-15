import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import {
  ROLE_PERMISSIONS,
  type Permission,
  type Resource,
} from './permissions.config';
import type {
  JwtPayload,
  SessionPayload,
  SessionUser,
} from './auth.types';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException();
    }
    return user;
  }

  buildSession(user: User): SessionPayload {
    const rolePerms = ROLE_PERMISSIONS[user.role];

    const permissions: Record<Resource, string[]> = {
      users: rolePerms.users ?? [],
      locations: rolePerms.locations ?? [],
      shifts: rolePerms.shifts ?? [],
      assignments: rolePerms.assignments ?? [],
      swaps: rolePerms.swaps ?? [],
      analytics: rolePerms.analytics ?? [],
      audit: rolePerms.audit ?? [],
      availability: rolePerms.availability ?? [],
      skills: rolePerms.skills ?? [],
      notifications: rolePerms.notifications ?? [],
    };

    const features: Permission[] = Object.entries(rolePerms).flatMap(
      ([resource, actions]) =>
        actions.map(
          (action) => `${resource}:${action}` as Permission,
        ),
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone ?? null,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      role: user.role,
      permissions,
      features,
    };
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.signAsync(payload);
  }

  private async issueRefreshToken(user: User): Promise<string> {
    const rawToken = crypto.randomUUID().replace(/-/g, '');
    const hash = await bcrypt.hash(rawToken, 12);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const token = this.refreshTokensRepo.create({
      userId: user.id,
      tokenHash: hash,
      expiresAt,
      revokedAt: null,
    });
    await this.refreshTokensRepo.save(token);
    return rawToken;
  }

  async login(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    session: SessionPayload;
  }> {
    const user = await this.validateUser(email, password);
    const session = this.buildSession(user);
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user);
    return { accessToken, refreshToken, session };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokens = await this.refreshTokensRepo.find();
    for (const token of tokens) {
      const match = await bcrypt.compare(rawToken, token.tokenHash);
      if (match && !token.revokedAt) {
        token.revokedAt = new Date();
        await this.refreshTokensRepo.save(token);
        break;
      }
    }
  }

  async refresh(
    rawToken: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    session: SessionPayload;
  }> {
    const tokens = await this.refreshTokensRepo.find({
      relations: ['user'],
    });
    let matched: RefreshToken | undefined;
    for (const token of tokens) {
      const match = await bcrypt.compare(rawToken, token.tokenHash);
      if (match) {
        matched = token;
        break;
      }
    }

    if (
      !matched ||
      matched.revokedAt ||
      matched.expiresAt < new Date()
    ) {
      throw new UnauthorizedException();
    }

    matched.revokedAt = new Date();
    await this.refreshTokensRepo.save(matched);

    const user = await this.usersRepo.findOneOrFail({
      where: { id: matched.userId },
    });
    const session = this.buildSession(user);
    const accessToken = await this.signAccessToken(user);
    const newRefreshToken = await this.issueRefreshToken(user);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      session,
    };
  }

  async getSessionForUser(user: SessionUser): Promise<SessionPayload> {
    const fullUser = await this.usersRepo.findOneOrFail({
      where: { id: user.id },
    });
    return this.buildSession(fullUser);
  }

  async updateNotificationPreferences(
    userId: string,
    notifyInApp: boolean,
    notifyEmail: boolean,
  ): Promise<void> {
    await this.usersRepo.update(userId, {
      notifyInApp,
      notifyEmail,
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    const valid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!valid) {
      throw new UnauthorizedException();
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersRepo.save(user);
  }
}

