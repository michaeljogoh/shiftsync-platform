import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toZonedTime } from 'date-fns-tz';
import {
  parseDateTimeForLocation,
  withLocalTimeDisplay,
} from '../../common/utils/timezone.util';
import { Shift } from './entities/shift.entity';
import { Location } from '../locations/entities/location.entity';
import { User } from '../users/entities/user.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { EditCutoffException } from '../../common/exceptions';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types';
import { AuditLog } from '../audit/entities/audit-log.entity';
import type { SessionUser } from '../auth/auth.types';
import { SwapsService } from '../swaps/swaps.service';
import { RealtimeService } from '../realtime/realtime.service';
import { RealtimeEvents } from '../realtime/realtime-events';
import { MailService } from '../mail/mail.service';

export interface PublishResult {
  shift: Shift;
  warnings?: string[];
}

function computeIsPremium(startAt: Date, ianaTimezone: string): boolean {
  const zoned = toZonedTime(startAt, ianaTimezone);
  const day = zoned.getDay();
  const hours = zoned.getHours();
  const minutes = zoned.getMinutes();
  const timeMinutes = hours * 60 + minutes;
  const isFriOrSat = day === 5 || day === 6;
  const start1700 = 17 * 60;
  const end2359 = 23 * 60 + 59;
  return isFriOrSat && timeMinutes >= start1700 && timeMinutes <= end2359;
}

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftsRepo: Repository<Shift>,
    @InjectRepository(Location)
    private readonly locationsRepo: Repository<Location>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly notificationsService: NotificationsService,
    private readonly swapsService: SwapsService,
    private readonly configService: ConfigService,
    private readonly realtimeService: RealtimeService,
    private readonly mailService: MailService,
  ) {}

  async findAll(
    filters: {
      locationId?: string;
      startDate?: string;
      endDate?: string;
      status?: 'draft' | 'published' | 'cancelled';
    },
    actor: SessionUser,
  ): Promise<Shift[]> {
    const qb = this.shiftsRepo
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.location', 'location')
      .leftJoinAndSelect('shift.requiredSkill', 'skill');

    if (actor.role === 'staff') {
      // Staff can only view published shifts at locations they are certified for.
      qb.andWhere('shift.status = :published', { published: 'published' });
      qb.andWhere(
        'EXISTS (SELECT 1 FROM user_location_certifications c WHERE c."userId" = :userId AND c."locationId" = shift."locationId" AND c."revokedAt" IS NULL)',
        { userId: actor.id },
      );
    }

    if (filters.locationId) {
      qb.andWhere('shift.locationId = :locationId', {
        locationId: filters.locationId,
      });
    }
    if (filters.startDate) {
      qb.andWhere('shift.startAt >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }
    if (filters.endDate) {
      qb.andWhere('shift.endAt <= :endDate', {
        endDate: new Date(filters.endDate),
      });
    }
    if (filters.status) {
      qb.andWhere('shift.status = :status', { status: filters.status });
    }

    if (actor.role === 'manager') {
      qb.innerJoin(
        'manager_location_assignments',
        'm',
        'm.locationId = shift.locationId AND m.managerId = :managerId',
        { managerId: actor.id },
      );
    }

    return qb.orderBy('shift.startAt', 'ASC').getMany();
  }

  async findById(id: string, relations: string[] = []): Promise<Shift> {
    const shift = await this.shiftsRepo.findOne({
      where: { id },
      relations,
    });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async create(dto: CreateShiftDto, assignedBy: string): Promise<Shift> {
    const loc = await this.locationsRepo.findOne({
      where: { id: dto.locationId },
    });
    if (!loc) throw new NotFoundException('Location not found');

    let startAt: Date;
    let endAt: Date;
    try {
      startAt = parseDateTimeForLocation(dto.startAt.trim(), loc.ianaTimezone);
      endAt = parseDateTimeForLocation(dto.endAt.trim(), loc.ianaTimezone);
    } catch {
      throw new BadRequestException(
        'Invalid startAt/endAt. Use ISO 8601 with optional offset; without offset, times are interpreted in the location timezone.',
      );
    }
    const isPremium =
      dto.isPremium ?? computeIsPremium(startAt, loc.ianaTimezone);

    const shift = this.shiftsRepo.create({
      locationId: dto.locationId,
      requiredSkillId: dto.requiredSkillId,
      title: dto.title ?? null,
      startAt,
      endAt,
      headcountNeeded: dto.headcountNeeded ?? 1,
      status: 'draft',
      editCutoffHours: dto.editCutoffHours ?? 48,
      isPremium,
    });
    const saved = await this.shiftsRepo.save(shift);
    return withLocalTimeDisplay(saved, loc.ianaTimezone) as Shift;
  }

  async update(
    id: string,
    dto: UpdateShiftDto,
    actor: SessionUser,
  ): Promise<Shift> {
    const shift = await this.findById(id, ['location', 'assignments']);
    const loc = shift.location;
    const cutoffHours = shift.editCutoffHours ?? 48;
    const cutoffMs = cutoffHours * 60 * 60 * 1000;
    if (
      actor.role !== 'admin' &&
      shift.status === 'published' &&
      shift.startAt.getTime() - Date.now() < cutoffMs
    ) {
      throw new EditCutoffException(
        `Cannot edit shift within the edit cutoff window (${cutoffHours} hours before start). Edit cutoff is enforced for published shifts.`,
      );
    }

    const tz = loc?.ianaTimezone ?? 'UTC';
    try {
      if (dto.startAt) {
        shift.startAt = parseDateTimeForLocation(dto.startAt.trim(), tz);
        shift.isPremium = computeIsPremium(shift.startAt, tz);
      }
      if (dto.endAt)
        shift.endAt = parseDateTimeForLocation(dto.endAt.trim(), tz);
    } catch {
      throw new BadRequestException(
        'Invalid startAt/endAt. Use ISO 8601 with optional offset; without offset, times are interpreted in the location timezone.',
      );
    }
    if (dto.requiredSkillId !== undefined)
      shift.requiredSkillId = dto.requiredSkillId;
    if (dto.title !== undefined) shift.title = dto.title;
    if (dto.headcountNeeded !== undefined)
      shift.headcountNeeded = dto.headcountNeeded;
    if (dto.editCutoffHours !== undefined)
      shift.editCutoffHours = dto.editCutoffHours;
    if (dto.isPremium !== undefined) shift.isPremium = dto.isPremium;
    if (dto.status !== undefined) shift.status = dto.status as Shift['status'];

    await this.shiftsRepo.save(shift);
    const assignmentIds = (shift.assignments ?? []).map((a) => a.id);
    if (assignmentIds.length > 0) {
      await this.swapsService.handleShiftEdited(id, assignmentIds);
    }
    this.realtimeService.emitToLocation(
      shift.locationId,
      RealtimeEvents.SCHEDULE_UPDATED,
      {
        shiftId: id,
        locationId: shift.locationId,
      },
    );
    if (shift.status === 'cancelled') {
      this.realtimeService.emitToLocation(
        shift.locationId,
        RealtimeEvents.SHIFT_CANCELLED,
        {
          shiftId: id,
          locationId: shift.locationId,
        },
      );
    }
    return withLocalTimeDisplay(shift, tz) as Shift;
  }

  async remove(id: string): Promise<void> {
    const shift = await this.findById(id);
    if (shift.status !== 'draft') {
      throw new ConflictException('Can only delete draft shifts');
    }
    await this.shiftsRepo.softRemove(shift);
  }

  async publish(id: string): Promise<PublishResult> {
    const shift = await this.findById(id, [
      'assignments',
      'assignments.user',
      'location',
    ]);
    if (shift.status !== 'draft') {
      throw new ConflictException('Only draft shifts can be published');
    }

    const assignedCount = (shift.assignments ?? []).filter(
      (a) => a.status !== 'cancelled' && a.status !== 'dropped',
    ).length;
    const headcountNeeded = shift.headcountNeeded ?? 1;
    const blockUnfilled =
      this.configService.get<string>('PUBLISH_BLOCK_UNFILLED_HEADCOUNT') ===
      'true';
    const warnings: string[] = [];

    if (assignedCount < headcountNeeded) {
      const msg = `${assignedCount} of ${headcountNeeded} headcount slot(s) filled`;
      if (blockUnfilled) {
        throw new ConflictException(
          `Cannot publish: ${msg}. Set PUBLISH_BLOCK_UNFILLED_HEADCOUNT=false to allow publishing with unfilled slots (warning only).`,
        );
      }
      warnings.push(msg);
    }

    shift.status = 'published';
    shift.publishedAt = new Date();
    await this.shiftsRepo.save(shift);

    this.realtimeService.emitToLocation(
      shift.locationId,
      RealtimeEvents.SCHEDULE_PUBLISHED,
      {
        shiftId: shift.id,
        locationId: shift.locationId,
        publishedAt: shift.publishedAt,
      },
    );

    const assigned = shift.assignments ?? [];
    for (const a of assigned) {
      if (a.status === 'cancelled' || a.status === 'dropped') continue;
      if (a.user?.notifyInApp) {
        await this.notificationsService.create({
          userId: a.userId,
          type: NotificationType.SCHEDULE_PUBLISHED,
          title: 'Schedule published',
          body: 'Your shift has been published.',
          referenceType: 'shift',
          referenceId: shift.id,
        });
      }
      if (a.user) {
        await this.mailService.sendSchedulePublished(a.user, [shift]);
      }
    }

    return {
      shift: withLocalTimeDisplay(
        shift,
        shift.location?.ianaTimezone ?? 'UTC',
      ) as Shift,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  async unpublish(id: string): Promise<Shift> {
    const shift = await this.findById(id, [
      'location',
      'assignments',
      'assignments.user',
    ]);
    if (shift.status !== 'published') {
      throw new ConflictException('Only published shifts can be unpublished');
    }
    const cutoffMs = (shift.editCutoffHours ?? 48) * 60 * 60 * 1000;
    if (shift.startAt.getTime() - Date.now() < cutoffMs) {
      throw new EditCutoffException(
        'Cannot unpublish within edit cutoff of shift start',
      );
    }
    shift.status = 'draft';
    shift.publishedAt = null;
    await this.shiftsRepo.save(shift);

    this.realtimeService.emitToLocation(
      shift.locationId,
      RealtimeEvents.SCHEDULE_UPDATED,
      {
        shiftId: id,
        locationId: shift.locationId,
        action: 'unpublished',
      },
    );

    const assigned = shift.assignments ?? [];
    for (const a of assigned) {
      if (a.status === 'cancelled' || a.status === 'dropped') continue;
      if (a.user?.notifyInApp) {
        await this.notificationsService.create({
          userId: a.userId,
          type: NotificationType.SCHEDULE_PUBLISHED,
          title: 'Schedule unpublished',
          body: 'A shift you were assigned to has been moved back to draft.',
          referenceType: 'shift',
          referenceId: shift.id,
        });
      }
    }

    return withLocalTimeDisplay(
      shift,
      shift.location?.ianaTimezone ?? 'UTC',
    ) as Shift;
  }

  async getAssignments(shiftId: string): Promise<Shift['assignments']> {
    const shift = await this.findById(shiftId, [
      'assignments',
      'assignments.user',
    ]);
    return shift.assignments ?? [];
  }

  async getHistory(shiftId: string): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { entityType: 'shift', entityId: shiftId },
      order: { createdAt: 'DESC' },
      relations: ['actor'],
    });
  }

  canAccessShift(actor: SessionUser, locationId: string): boolean {
    if (actor.role === 'admin') return true;
    if (actor.role === 'manager') return true;
    return false;
  }

  async findByIdForView(actor: SessionUser, id: string): Promise<Shift> {
    const shift = await this.findById(id, [
      'location',
      'requiredSkill',
      'assignments',
      'assignments.user',
    ]);
    if (actor.role === 'admin') {
      return withLocalTimeDisplay(
        shift,
        shift.location?.ianaTimezone ?? 'UTC',
      ) as Shift;
    }
    if (actor.role === 'manager') {
      const manager = await this.usersRepo.findOne({
        where: { id: actor.id },
        relations: ['managedLocations'],
      });
      const managedIds = (manager?.managedLocations ?? []).map((l) => l.id);
      if (!managedIds.includes(shift.locationId)) {
        throw new ForbiddenException('No access to this shift');
      }
      return withLocalTimeDisplay(
        shift,
        shift.location?.ianaTimezone ?? 'UTC',
      ) as Shift;
    }
    // Staff can view published shifts at certified locations.
    if (shift.status !== 'published') {
      throw new ForbiddenException('No access to this shift');
    }
    const staff = await this.usersRepo.findOne({
      where: { id: actor.id },
      relations: ['locationCertifications'],
    });
    const certified = (staff?.locationCertifications ?? []).some(
      (c) => c.locationId === shift.locationId && !c.revokedAt,
    );
    if (!certified) throw new ForbiddenException('No access to this shift');
    return withLocalTimeDisplay(
      shift,
      shift.location?.ianaTimezone ?? 'UTC',
    ) as Shift;
  }
}
