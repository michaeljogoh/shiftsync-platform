import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UserLocationCertification } from '../locations/entities/user-location-certification.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { SessionUser } from '../auth/auth.types';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(UserLocationCertification)
    private readonly certsRepo: Repository<UserLocationCertification>,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    const tempPassword = dto.password;
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      isActive: dto.isActive ?? true,
      desiredHoursPerWeek: dto.desiredHoursPerWeek?.toString() ?? null,
      notifyInApp: dto.notifyInApp ?? true,
      notifyEmail: dto.notifyEmail ?? false,
    });
    await this.usersRepo.save(user);
    if (user.notifyEmail) {
      await this.mailService.sendWelcome(user, tempPassword);
    }
    return user;
  }

  async findAll(filters?: {
    role?: 'admin' | 'manager' | 'staff';
    locationId?: string;
    skillId?: string;
  }): Promise<User[]> {
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.skills', 'skill')
      .leftJoinAndSelect('user.locationCertifications', 'cert')
      .leftJoinAndSelect('cert.location', 'loc')
      .leftJoinAndSelect('user.managedLocations', 'managedLoc');

    if (filters?.role) {
      qb.andWhere('user.role = :role', { role: filters.role });
    }
    if (filters?.locationId) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM user_location_certifications c WHERE c."userId" = user.id AND c."locationId" = :locationId AND c."revokedAt" IS NULL)',
        { locationId: filters.locationId },
      );
    }
    if (filters?.skillId) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM user_skills us WHERE us."userId" = user.id AND us."skillId" = :skillId)',
        { skillId: filters.skillId },
      );
    }

    return qb.getMany();
  }

  async findAllForView(
    actor: SessionUser,
    filters?: {
      role?: 'admin' | 'manager' | 'staff';
      locationId?: string;
      skillId?: string;
    },
  ): Promise<User[]> {
    // Admin can see all users.
    if (actor.role === 'admin') return this.findAll(filters);

    // Managers can only see users who are certified in one of the manager's locations.
    if (actor.role === 'manager') {
      const manager = await this.findById(actor.id, ['managedLocations']);
      const allowedLocationIds = (manager.managedLocations ?? []).map((l) => l.id);
      if (allowedLocationIds.length === 0) return [];

      // If a location filter is provided, it must be within the manager's scope.
      if (filters?.locationId && !allowedLocationIds.includes(filters.locationId)) {
        throw new ForbiddenException('You do not have access to this location');
      }

      const qb = this.usersRepo
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.skills', 'skill')
        .leftJoinAndSelect('user.locationCertifications', 'cert')
        .leftJoinAndSelect('cert.location', 'loc')
        .leftJoinAndSelect('user.managedLocations', 'managedLoc');

      // Scope to users certified at any allowed location (and not revoked).
      qb.andWhere(
        'EXISTS (SELECT 1 FROM user_location_certifications c WHERE c."userId" = user.id AND c."locationId" IN (:...allowedLocationIds) AND c."revokedAt" IS NULL)',
        { allowedLocationIds },
      );

      if (filters?.role) {
        qb.andWhere('user.role = :role', { role: filters.role });
      }
      if (filters?.locationId) {
        qb.andWhere(
          'EXISTS (SELECT 1 FROM user_location_certifications c2 WHERE c2."userId" = user.id AND c2."locationId" = :locationId AND c2."revokedAt" IS NULL)',
          { locationId: filters.locationId },
        );
      }
      if (filters?.skillId) {
        qb.andWhere(
          'EXISTS (SELECT 1 FROM user_skills us WHERE us."userId" = user.id AND us."skillId" = :skillId)',
          { skillId: filters.skillId },
        );
      }

      return qb.getMany();
    }

    // Staff should not have users:view permission, but keep safe default.
    throw new ForbiddenException('You do not have access to this resource');
  }

  async findById(id: string, relations: string[] = []): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: SessionUser,
  ): Promise<User> {
    const user = await this.findById(id);
    const isSelf = currentUser.id === id;
    const isAdmin = currentUser.role === 'admin';

    if (isSelf && !isAdmin) {
      const allowed: (keyof UpdateUserDto)[] = [
        'firstName',
        'lastName',
        'desiredHoursPerWeek',
        'notifyInApp',
        'notifyEmail',
      ];
      const filtered = Object.fromEntries(
        Object.entries(dto).filter(([k]) => allowed.includes(k as keyof UpdateUserDto)),
      ) as UpdateUserDto;
      Object.assign(user, filtered);
    } else if (isAdmin) {
      Object.assign(user, dto);
      if (dto.desiredHoursPerWeek !== undefined) {
        user.desiredHoursPerWeek = dto.desiredHoursPerWeek?.toString() ?? null;
      }
    } else {
      throw new ForbiddenException('Cannot update this user');
    }

    await this.usersRepo.save(user);
    return user;
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.usersRepo.softRemove(user);
  }

  async addSkill(userId: string, skillId: string): Promise<void> {
    const user = await this.findById(userId, ['skills']);
    const hasSkill = user.skills?.some((s) => s.id === skillId);
    if (hasSkill) {
      throw new ConflictException('User already has this skill');
    }
    await this.usersRepo
      .createQueryBuilder()
      .relation(User, 'skills')
      .of(userId)
      .add(skillId);
  }

  async removeSkill(userId: string, skillId: string): Promise<void> {
    await this.usersRepo
      .createQueryBuilder()
      .relation(User, 'skills')
      .of(userId)
      .remove(skillId);
  }

  async certifyForLocation(userId: string, locationId: string): Promise<UserLocationCertification> {
    const existing = await this.certsRepo.findOne({
      where: { userId, locationId },
    });
    if (existing && !existing.revokedAt) {
      throw new ConflictException('User is already certified for this location');
    }
    if (existing && existing.revokedAt) {
      existing.revokedAt = null;
      existing.revokedBy = null;
      existing.revocationReason = null;
      existing.certifiedAt = new Date();
      await this.certsRepo.save(existing);
      return existing;
    }
    const cert = this.certsRepo.create({
      userId,
      locationId,
      certifiedAt: new Date(),
    });
    await this.certsRepo.save(cert);
    return cert;
  }

  async revokeCertification(
    userId: string,
    locationId: string,
    revokedBy: string,
    reason: string,
  ): Promise<void> {
    const cert = await this.certsRepo.findOne({
      where: { userId, locationId },
    });
    if (!cert) {
      throw new NotFoundException('Certification not found');
    }
    if (cert.revokedAt) {
      throw new ConflictException('Certification is already revoked');
    }
    cert.revokedAt = new Date();
    cert.revokedBy = revokedBy;
    cert.revocationReason = reason;
    await this.certsRepo.save(cert);
  }

  canAccessUser(actor: SessionUser, targetUserId: string): boolean {
    if (actor.role === 'admin') return true;
    if (actor.id === targetUserId) return true;
    return false;
  }

  canAccessUserAsManager(actor: SessionUser, targetUserId: string, locationIds: string[]): boolean {
    if (actor.role === 'admin') return true;
    if (actor.id === targetUserId) return true;
    if (actor.role === 'manager' && locationIds.length > 0) return true;
    return false;
  }

  async findByIdForView(actor: SessionUser, id: string): Promise<User> {
    const user = await this.findById(id, ['skills', 'locationCertifications', 'locationCertifications.location', 'managedLocations']);
    if (actor.role === 'admin' || actor.id === id) return user;
    if (actor.role === 'manager') {
      const manager = await this.findById(actor.id, ['managedLocations']);
      const managerLocationIds = (manager.managedLocations ?? []).map((l) => l.id);
      const userCertLocationIds = (user.locationCertifications ?? [])
        .filter((c) => !c.revokedAt)
        .map((c) => c.locationId);
      const hasOverlap = managerLocationIds.some((lid) => userCertLocationIds.includes(lid));
      if (!hasOverlap) {
        throw new ForbiddenException('You do not have access to this user');
      }
      return user;
    }
    throw new ForbiddenException('You do not have access to this user');
  }
}
