import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import type { SessionUser } from '../auth/auth.types';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  private async getManagerLocationIds(managerId: string): Promise<string[]> {
    const manager = await this.usersRepo.findOne({
      where: { id: managerId },
      relations: ['managedLocations'],
    });
    return (manager?.managedLocations ?? []).map((l) => l.id);
  }

  async findAll(filters: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    actorEmail?: string;
    locationId?: string;
    allowedLocationIds?: string[];
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    const qb = this.auditRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.actor', 'actor')
      .leftJoinAndSelect('a.location', 'location')
      .orderBy('a.createdAt', 'DESC');

    if (filters.entityType) qb.andWhere('a.entityType = :entityType', { entityType: filters.entityType });
    if (filters.entityId) qb.andWhere('a.entityId = :entityId', { entityId: filters.entityId });
    if (filters.actorId) qb.andWhere('a.actorId = :actorId', { actorId: filters.actorId });
    if (filters.actorEmail) qb.andWhere('actor.email ILIKE :actorEmail', { actorEmail: `%${filters.actorEmail}%` });
    if (filters.locationId) qb.andWhere('a.locationId = :locationId', { locationId: filters.locationId });
    if (filters.allowedLocationIds) {
      if (filters.allowedLocationIds.length === 0) return [];
      qb.andWhere('a.locationId IN (:...allowedLocationIds)', {
        allowedLocationIds: filters.allowedLocationIds,
      });
    }

    qb.take(filters.limit ?? 25).skip(filters.offset ?? 0);
    return qb.getMany();
  }

  async findAllForUser(
    actor: SessionUser,
    filters: {
      entityType?: string;
      entityId?: string;
      actorId?: string;
      actorEmail?: string;
      locationId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<AuditLog[]> {
    if (actor.role !== 'manager') return this.findAll(filters);

    const allowedLocationIds = await this.getManagerLocationIds(actor.id);
    if (filters.locationId && !allowedLocationIds.includes(filters.locationId)) {
      throw new ForbiddenException('You do not have manager access to this location');
    }
    return this.findAll({ ...filters, allowedLocationIds });
  }

  async exportCsv(filters: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    actorEmail?: string;
    locationId?: string;
  }): Promise<string> {
    const logs = await this.findAll({ ...filters, limit: 1000 });
    const headers = ['id', 'actorId', 'entityType', 'entityId', 'action', 'createdAt', 'locationId'];
    const rows = logs.map((l) =>
      [
        l.id,
        l.actorId ?? '',
        l.entityType,
        l.entityId,
        l.action,
        l.createdAt?.toISOString() ?? '',
        l.locationId ?? '',
      ].join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }

  async findByLocation(locationId: string, limit = 25, offset = 0): Promise<AuditLog[]> {
    return this.findAll({ locationId, limit, offset });
  }

  async findByShift(shiftId: string): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { entityType: 'shift', entityId: shiftId },
      order: { createdAt: 'DESC' },
      relations: ['actor'],
    });
  }

  async create(entry: {
    actorId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    locationId?: string | null;
  }): Promise<AuditLog> {
    const log = this.auditRepo.create(entry);
    return this.auditRepo.save(log);
  }
}
