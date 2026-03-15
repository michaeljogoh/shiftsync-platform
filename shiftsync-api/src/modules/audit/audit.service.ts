import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async findAll(filters: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    locationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    const qb = this.auditRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.actor', 'actor')
      .orderBy('a.createdAt', 'DESC');

    if (filters.entityType) qb.andWhere('a.entityType = :entityType', { entityType: filters.entityType });
    if (filters.entityId) qb.andWhere('a.entityId = :entityId', { entityId: filters.entityId });
    if (filters.actorId) qb.andWhere('a.actorId = :actorId', { actorId: filters.actorId });
    if (filters.locationId) qb.andWhere('a.locationId = :locationId', { locationId: filters.locationId });

    qb.take(filters.limit ?? 25).skip(filters.offset ?? 0);
    return qb.getMany();
  }

  async exportCsv(filters: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
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
