import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  addDays,
  differenceInHours,
  startOfWeek,
  parseISO,
  differenceInCalendarDays,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { User } from '../users/entities/user.entity';
import { UserLocationCertification } from '../locations/entities/user-location-certification.entity';
import { AvailabilityWindow } from '../availability/entities/availability-window.entity';
import { AvailabilityException } from '../availability/entities/availability-exception.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import {
  SchedulingConstraintException,
  AssignmentConflictException,
} from '../../common/exceptions';
import { ConfigService } from '@nestjs/config';
import { RealtimeService } from '../realtime/realtime.service';
import { RealtimeEvents } from '../realtime/realtime-events';

export interface AssignmentValidationResult {
  success: true;
  assignment: ShiftAssignment;
  warnings?: Array<
    | { type: 'overtime_approaching'; projectedWeeklyHours: number }
    | {
        type: 'overtime_exceeded';
        projectedWeeklyHours: number;
        estimatedOvertimeCost?: number;
      }
    | { type: 'consecutive_day'; dayNumber: number }
    | { type: 'daily_hours'; dailyHours: number }
    | { type: 'headcount_exceeded'; currentCount: number; headcountNeeded: number }
  >;
}

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(ShiftAssignment)
    private readonly assignmentsRepo: Repository<ShiftAssignment>,
    @InjectRepository(Shift)
    private readonly shiftsRepo: Repository<Shift>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(UserLocationCertification)
    private readonly certsRepo: Repository<UserLocationCertification>,
    @InjectRepository(AvailabilityWindow)
    private readonly windowsRepo: Repository<AvailabilityWindow>,
    @InjectRepository(AvailabilityException)
    private readonly exceptionsRepo: Repository<AvailabilityException>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly realtimeService: RealtimeService,
  ) {}

  /** Advisory lock key from userId for concurrent assignment serialization (5.4). */
  private advisoryLockKey(userId: string): number {
    const hash = crypto.createHash('md5').update(userId).digest();
    return hash.readUInt32BE(0);
  }

  async create(
    shiftId: string,
    dto: CreateAssignmentDto,
    assignedBy: string,
  ): Promise<AssignmentValidationResult> {
    const shift = await this.shiftsRepo.findOne({
      where: { id: shiftId },
      relations: ['location', 'requiredSkill'],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const user = await this.usersRepo.findOne({
      where: { id: dto.userId },
      relations: ['skills', 'locationCertifications'],
    });
    if (!user) throw new NotFoundException('User not found');

    const suggestions = await this.getSuggestions(shift);

    const skillCheck = await this.checkSkill(user, shift);
    if (!skillCheck.valid) {
      throw new SchedulingConstraintException(
        skillCheck.message!,
        undefined,
        suggestions,
      );
    }

    const certCheck = await this.checkCertification(user, shift);
    if (!certCheck.valid) {
      throw new SchedulingConstraintException(
        certCheck.message!,
        undefined,
        suggestions,
      );
    }

    const availCheck = await this.checkAvailability(user, shift);
    if (!availCheck.valid) {
      throw new SchedulingConstraintException(
        availCheck.message!,
        { availability: availCheck.details },
        suggestions,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const lockKey = this.advisoryLockKey(dto.userId);
      const [lockRow] = await manager.query<[{ ok: boolean }]>(
        'SELECT pg_try_advisory_xact_lock($1::bigint) AS ok',
        [lockKey],
      );
      if (!lockRow?.ok) {
        throw new ConflictException(
          'Concurrent assignment in progress for this staff member; please retry.',
        );
      }

      const overlapCheck = await this.checkDoubleBooking(dto.userId, shift);
      if (!overlapCheck.valid) {
        this.realtimeService.emitToUser(assignedBy, RealtimeEvents.ASSIGNMENT_CONFLICT, {
          message: overlapCheck.message,
          ...overlapCheck.details,
        });
        throw new AssignmentConflictException(
          overlapCheck.message!,
          overlapCheck.details,
          suggestions,
        );
      }

      const restCheck = await this.checkRestPeriod(dto.userId, shift);
      if (!restCheck.valid) {
        throw new AssignmentConflictException(
          restCheck.message!,
          restCheck.details,
          suggestions,
        );
      }

      const overtimeCheck = await this.checkOvertime(dto.userId, shift);
      if (overtimeCheck.hardBlock) {
        throw new SchedulingConstraintException(
          overtimeCheck.message!,
          undefined,
          suggestions,
        );
      }

      const dailyCheck = await this.checkDailyHours(dto.userId, shift);
      if (!dailyCheck.valid) {
        throw new SchedulingConstraintException(
          dailyCheck.message!,
          dailyCheck.details,
          suggestions,
        );
      }

      const consecutiveCheck = await this.checkConsecutiveDays(
        dto.userId,
        shift,
        dto.override,
        dto.overrideReason,
      );
      if (!consecutiveCheck.valid) {
        throw new SchedulingConstraintException(
          consecutiveCheck.message!,
          undefined,
          suggestions,
        );
      }

      const assignment = this.assignmentsRepo.create({
        shiftId,
        userId: dto.userId,
        assignedBy,
        status: 'assigned',
      });
      await manager.save(ShiftAssignment, assignment);

      const warnings: AssignmentValidationResult['warnings'] = [];
      if (overtimeCheck.warning) warnings.push(overtimeCheck.warning);
      if (consecutiveCheck.warning) warnings.push(consecutiveCheck.warning);
      if (dailyCheck.dailyWarning) warnings.push(dailyCheck.dailyWarning);

      const headcountNeeded = shift.headcountNeeded ?? 1;
      const totalAssigned = await manager
        .createQueryBuilder(ShiftAssignment, 'a')
        .where('a.shiftId = :shiftId', { shiftId })
        .andWhere('a.status NOT IN (:...statuses)', {
          statuses: ['cancelled', 'dropped'],
        })
        .getCount();
      if (totalAssigned > headcountNeeded) {
        warnings.push({
          type: 'headcount_exceeded',
          currentCount: totalAssigned,
          headcountNeeded,
        });
      }

      this.realtimeService.emitToUser(dto.userId, RealtimeEvents.ASSIGNMENT_CREATED, {
        assignmentId: assignment.id,
        shiftId,
        assignedBy,
      });

      return { success: true, assignment, warnings };
    });
  }

  async validateOnly(
    shiftId: string,
    userId: string,
  ): Promise<{ valid: boolean; message?: string }> {
    const shift = await this.shiftsRepo.findOne({
      where: { id: shiftId },
      relations: ['location', 'requiredSkill'],
    });
    if (!shift) return { valid: false, message: 'Shift not found' };
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['skills', 'locationCertifications'],
    });
    if (!user) return { valid: false, message: 'User not found' };

    const skillCheck = await this.checkSkill(user, shift);
    if (!skillCheck.valid) return skillCheck;
    const certCheck = await this.checkCertification(user, shift);
    if (!certCheck.valid) return certCheck;
    const availCheck = await this.checkAvailability(user, shift);
    if (!availCheck.valid) return availCheck;
    const overlapCheck = await this.checkDoubleBooking(userId, shift);
    if (!overlapCheck.valid) return overlapCheck;
    const restCheck = await this.checkRestPeriod(userId, shift);
    if (!restCheck.valid) return restCheck;
    const dailyCheck = await this.checkDailyHours(userId, shift);
    if (!dailyCheck.valid) return dailyCheck;
    const consecutiveCheck = await this.checkConsecutiveDays(
      userId,
      shift,
      false,
      undefined,
    );
    if (!consecutiveCheck.valid)
      return { valid: false, message: consecutiveCheck.message };
    return { valid: true };
  }

  async remove(shiftId: string, assignmentId: string): Promise<void> {
    const assignment = await this.assignmentsRepo.findOne({
      where: { id: assignmentId, shiftId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    assignment.status = 'cancelled';
    await this.assignmentsRepo.save(assignment);
    this.realtimeService.emitToUser(assignment.userId, RealtimeEvents.ASSIGNMENT_CANCELLED, {
      assignmentId: assignment.id,
      shiftId,
    });
  }

  async findByUser(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ShiftAssignment[]> {
    const qb = this.assignmentsRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.shift', 'shift')
      .leftJoinAndSelect('shift.location', 'location')
      .where('a.userId = :userId', { userId })
      .andWhere('a.status NOT IN (:...statuses)', {
        statuses: ['cancelled'],
      });

    if (startDate) {
      qb.andWhere('shift.startAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }
    if (endDate) {
      qb.andWhere('shift.endAt <= :endDate', { endDate: new Date(endDate) });
    }

    return qb.orderBy('shift.startAt', 'ASC').getMany();
  }

  private async checkSkill(
    user: User,
    shift: Shift,
  ): Promise<{ valid: boolean; message?: string }> {
    const hasSkill = user.skills?.some((s) => s.id === shift.requiredSkillId);
    if (!hasSkill) {
      const skillName =
        (shift as Shift & { requiredSkill?: { name: string } }).requiredSkill
          ?.name ?? 'required';
      return {
        valid: false,
        message: `Staff member does not have required skill: ${skillName}`,
      };
    }
    return { valid: true };
  }

  private async checkCertification(
    user: User,
    shift: Shift,
  ): Promise<{ valid: boolean; message?: string }> {
    const cert = await this.certsRepo.findOne({
      where: { userId: user.id, locationId: shift.locationId },
    });
    if (!cert || cert.revokedAt) {
      return {
        valid: false,
        message: 'Staff member is not certified for this location',
      };
    }
    return { valid: true };
  }

  /**
   * Availability: convert shift (UTC) to location timezone with date-fns-tz (toZonedTime),
   * then compare against availability windows' dayOfWeek and time range. No manual UTC offset arithmetic.
   */
  private async checkAvailability(
    user: User,
    shift: Shift,
  ): Promise<{
    valid: boolean;
    message?: string;
    details?: unknown;
  }> {
    const tz =
      (shift as Shift & { location?: { ianaTimezone: string } }).location
        ?.ianaTimezone ?? 'UTC';
    const shiftStartZoned = toZonedTime(shift.startAt, tz);
    const shiftEndZoned = toZonedTime(shift.endAt, tz);
    const dayOfWeek = shiftStartZoned.getDay();
    const dateStr = shiftStartZoned.toISOString().slice(0, 10);

    const exception = await this.exceptionsRepo.findOne({
      where: { userId: user.id, exceptionDate: dateStr },
    });
    if (exception) {
      if (!exception.isAvailable) {
        return {
          valid: false,
          message: 'Staff has blocked this date',
          details: {
            exception,
            actualAvailability: `Blocked on ${exception.exceptionDate}`,
          },
        };
      }
      if (exception.startTime && exception.endTime) {
        const [exStartH, exStartM] = exception.startTime.split(':').map(Number);
        const [exEndH, exEndM] = exception.endTime.split(':').map(Number);
        const shiftStartMin =
          shiftStartZoned.getHours() * 60 + shiftStartZoned.getMinutes();
        const shiftEndMin =
          shiftEndZoned.getHours() * 60 + shiftEndZoned.getMinutes();
        const exStartMin = exStartH * 60 + exStartM;
        const exEndMin = exEndH * 60 + exEndM;
        if (shiftStartMin < exStartMin || shiftEndMin > exEndMin) {
          return {
            valid: false,
            message: 'Shift outside exception window',
            details: {
              exception,
              actualAvailability: `Exception on ${exception.exceptionDate}: ${exception.startTime}-${exception.endTime}`,
            },
          };
        }
      }
      return { valid: true };
    }

    const windows = await this.windowsRepo.find({
      where: { userId: user.id, dayOfWeek },
    });
    const shiftStartMin =
      shiftStartZoned.getHours() * 60 + shiftStartZoned.getMinutes();
    const shiftEndMin =
      shiftEndZoned.getHours() * 60 + shiftEndZoned.getMinutes();

    for (const w of windows) {
      const [sH, sM] = w.startTime.split(':').map(Number);
      const [eH, eM] = w.endTime.split(':').map(Number);
      const winStart = sH * 60 + sM;
      const winEnd = eH * 60 + eM;
      if (shiftStartMin >= winStart && shiftEndMin <= winEnd) {
        const from = new Date(w.effectiveFrom);
        const until = w.effectiveUntil ? new Date(w.effectiveUntil) : null;
        if (shiftStartZoned >= from && (!until || shiftStartZoned <= until)) {
          return { valid: true };
        }
      }
    }
    return {
      valid: false,
      message: 'Shift falls outside staff availability',
      details: {
        windows,
        actualAvailability: windows.map(
          (w) =>
            `Day ${w.dayOfWeek} ${w.startTime}-${w.endTime} (from ${w.effectiveFrom}${w.effectiveUntil ? ` to ${w.effectiveUntil}` : ''})`,
        ),
      },
    };
  }

  private async checkDoubleBooking(
    userId: string,
    shift: Shift,
  ): Promise<{
    valid: boolean;
    message?: string;
    details?: Record<string, unknown>;
  }> {
    const overlapping = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.shift', 's')
      .where('a.userId = :userId', { userId })
      .andWhere('a.status NOT IN (:...statuses)', { statuses: ['cancelled'] })
      .andWhere('(s.startAt < :endAt AND s.endAt > :startAt)', {
        startAt: shift.startAt,
        endAt: shift.endAt,
      })
      .andWhere('s.id != :shiftId', { shiftId: shift.id })
      .getMany();
    if (overlapping.length > 0) {
      const conflicting = overlapping[0];
      const s = await this.shiftsRepo.findOne({
        where: { id: conflicting.shiftId },
      });
      return {
        valid: false,
        message: 'Staff has overlapping shift assignment',
        details: {
          conflictingShift: s
            ? {
                id: s.id,
                startAt: s.startAt,
                endAt: s.endAt,
                title: s.title,
              }
            : { shiftId: conflicting.shiftId },
          competingAssignedBy: conflicting.assignedBy,
        },
      };
    }
    return { valid: true };
  }

  private async checkRestPeriod(
    userId: string,
    shift: Shift,
  ): Promise<{
    valid: boolean;
    message?: string;
    details?: Record<string, unknown>;
  }> {
    const others = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.shift', 's')
      .where('a.userId = :userId', { userId })
      .andWhere('a.status NOT IN (:...statuses)', { statuses: ['cancelled'] })
      .andWhere('s.id != :shiftId', { shiftId: shift.id })
      .getMany();

    for (const a of others) {
      const s = await this.shiftsRepo.findOne({ where: { id: a.shiftId } });
      if (!s) continue;
      const gapBefore = differenceInHours(shift.startAt, s.endAt);
      const gapAfter = differenceInHours(s.startAt, shift.endAt);
      if (gapBefore > 0 && gapBefore < 10) {
        return {
          valid: false,
          message: 'Less than 10 hours rest between shifts',
          details: {
            conflictingShift: {
              id: s.id,
              startAt: s.startAt,
              endAt: s.endAt,
              title: s.title,
            },
            gapHours: gapBefore,
            requiredGapHours: 10,
          },
        };
      }
      if (gapAfter > 0 && gapAfter < 10) {
        return {
          valid: false,
          message: 'Less than 10 hours rest between shifts',
          details: {
            conflictingShift: {
              id: s.id,
              startAt: s.startAt,
              endAt: s.endAt,
              title: s.title,
            },
            gapHours: gapAfter,
            requiredGapHours: 10,
          },
        };
      }
    }
    return { valid: true };
  }

  private async checkOvertime(
    userId: string,
    shift: Shift,
  ): Promise<{
    hardBlock: boolean;
    message?: string;
    warning?: AssignmentValidationResult['warnings'][0];
  }> {
    const durationHours =
      (shift.endAt.getTime() - shift.startAt.getTime()) / (60 * 60 * 1000);
    const weekStart = startOfWeek(shift.startAt, { weekStartsOn: 0 });
    const weekEnd = addDays(weekStart, 7);

    const assignments = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.shift', 's')
      .where('a.userId = :userId', { userId })
      .andWhere('a.status NOT IN (:...statuses)', { statuses: ['cancelled'] })
      .andWhere('s.startAt >= :weekStart', { weekStart })
      .andWhere('s.endAt < :weekEnd', { weekEnd })
      .getMany();

    let totalHours = durationHours;
    for (const a of assignments) {
      const s = await this.shiftsRepo.findOne({ where: { id: a.shiftId } });
      if (s && s.id !== shift.id) {
        totalHours +=
          (s.endAt.getTime() - s.startAt.getTime()) / (60 * 60 * 1000);
      }
    }

    if (totalHours >= 40) {
      const projected = Math.round(totalHours * 10) / 10;
      const overtimeHours = Math.max(0, projected - 40);
      return {
        hardBlock: false,
        warning: {
          type: 'overtime_exceeded',
          projectedWeeklyHours: projected,
          estimatedOvertimeCost: overtimeHours * 1.5,
        },
      };
    }
    if (totalHours >= 35) {
      return {
        hardBlock: false,
        warning: {
          type: 'overtime_approaching',
          projectedWeeklyHours: Math.round(totalHours * 10) / 10,
        },
      };
    }
    return { hardBlock: false };
  }

  private async checkDailyHours(
    userId: string,
    shift: Shift,
  ): Promise<{
    valid: boolean;
    message?: string;
    details?: Record<string, unknown>;
    dailyWarning?: { type: 'daily_hours'; dailyHours: number };
  }> {
    const dayStart = new Date(shift.startAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = addDays(dayStart, 1);

    const assignments = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.shift', 's')
      .where('a.userId = :userId', { userId })
      .andWhere('a.status NOT IN (:...statuses)', { statuses: ['cancelled'] })
      .andWhere('s.startAt >= :dayStart', { dayStart })
      .andWhere('s.endAt < :dayEnd', { dayEnd })
      .getMany();

    let totalMinutes = 0;
    for (const a of assignments) {
      const s = await this.shiftsRepo.findOne({ where: { id: a.shiftId } });
      if (!s) continue;
      const start = s.id === shift.id ? shift.startAt : s.startAt;
      const end = s.id === shift.id ? shift.endAt : s.endAt;
      totalMinutes += (end.getTime() - start.getTime()) / (60 * 1000);
    }
    const totalHours = totalMinutes / 60;
    const rounded = Math.round(totalHours * 10) / 10;
    const hardBlock = this.configService.get<number>(
      'OVERTIME_HARD_BLOCK_HOURS',
      12,
    );
    if (totalHours > hardBlock) {
      return {
        valid: false,
        message: `Daily hours exceed ${hardBlock}h limit`,
        details: { dailyHours: rounded, limit: hardBlock },
      };
    }
    if (totalHours > 8 && totalHours <= hardBlock) {
      return {
        valid: true,
        dailyWarning: { type: 'daily_hours', dailyHours: rounded },
      };
    }
    return { valid: true };
  }

  private async checkConsecutiveDays(
    userId: string,
    shift: Shift,
    override?: boolean,
    overrideReason?: string,
  ): Promise<{
    valid: boolean;
    message?: string;
    warning?: AssignmentValidationResult['warnings'][0];
  }> {
    const tz =
      (shift as Shift & { location?: { ianaTimezone: string } }).location
        ?.ianaTimezone ?? 'UTC';
    const shiftStartZoned = toZonedTime(shift.startAt, tz);
    const dateStr = shiftStartZoned.toISOString().slice(0, 10);

    const assignedDates = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.shift', 's')
      .where('a.userId = :userId', { userId })
      .andWhere('a.status NOT IN (:...statuses)', { statuses: ['cancelled'] })
      .getMany();

    const workedDates = new Set<string>();
    for (const a of assignedDates) {
      const s = await this.shiftsRepo.findOne({
        where: { id: a.shiftId },
        relations: ['location'],
      });
      if (!s) continue;
      const locTz =
        (s as Shift & { location?: { ianaTimezone: string } }).location
          ?.ianaTimezone ?? 'UTC';
      const zoned = toZonedTime(s.startAt, locTz);
      workedDates.add(zoned.toISOString().slice(0, 10));
    }
    workedDates.add(dateStr);

    const sorted = Array.from(workedDates).sort();
    let maxConsecutive = 0;
    let current = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = parseISO(sorted[i - 1]);
      const curr = parseISO(sorted[i]);
      if (differenceInCalendarDays(curr, prev) === 1) {
        current++;
      } else {
        maxConsecutive = Math.max(maxConsecutive, current);
        current = 1;
      }
    }
    maxConsecutive = Math.max(maxConsecutive, current);

    if (maxConsecutive >= 7) {
      if (override && overrideReason && overrideReason.length >= 20) {
        return { valid: true };
      }
      return {
        valid: false,
        message:
          '7th consecutive day; override requires reason (min 20 characters)',
      };
    }
    if (maxConsecutive === 6) {
      return {
        valid: true,
        warning: { type: 'consecutive_day', dayNumber: 6 },
      };
    }
    return { valid: true };
  }

  async getSuggestions(
    shift: Shift,
  ): Promise<Array<{ userId: string; name: string; reason: string }>> {
    const certs = await this.certsRepo.find({
      where: {
        locationId: shift.locationId,
        revokedAt: null as unknown as Date,
      },
      relations: ['user', 'user.skills'],
    });

    const withHours: Array<{
      userId: string;
      name: string;
      reason: string;
      weekHours: number;
    }> = [];
    for (const c of certs) {
      const user = c.user;
      if (!user) continue;
      const hasSkill = user.skills?.some((s) => s.id === shift.requiredSkillId);
      if (!hasSkill) continue;

      const availCheck = await this.checkAvailability(user, shift);
      if (!availCheck.valid) continue;

      const overlapCheck = await this.checkDoubleBooking(user.id, shift);
      if (!overlapCheck.valid) continue;

      const weekStart = startOfWeek(shift.startAt, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 7);
      const assignments = await this.assignmentsRepo
        .createQueryBuilder('a')
        .innerJoin('a.shift', 's')
        .where('a.userId = :userId', { userId: user.id })
        .andWhere('a.status NOT IN (:...statuses)', { statuses: ['cancelled'] })
        .andWhere('s.startAt >= :weekStart', { weekStart })
        .andWhere('s.endAt < :weekEnd', { weekEnd })
        .getMany();

      let weekHours = 0;
      for (const a of assignments) {
        const s = await this.shiftsRepo.findOne({ where: { id: a.shiftId } });
        if (s)
          weekHours +=
            (s.endAt.getTime() - s.startAt.getTime()) / (60 * 60 * 1000);
      }
      const shiftHours =
        (shift.endAt.getTime() - shift.startAt.getTime()) / (60 * 60 * 1000);
      if (weekHours + shiftHours >= 40) continue;

      const name = `${user.firstName} ${user.lastName}`;
      let reason = 'Has required skill, available, no conflicts';
      if (weekHours + shiftHours >= 35) reason += ', approaching overtime';
      withHours.push({ userId: user.id, name, reason, weekHours });
    }

    withHours.sort((a, b) => {
      if (a.weekHours !== b.weekHours) return a.weekHours - b.weekHours;
      return a.name.localeCompare(b.name);
    });
    return withHours
      .slice(0, 5)
      .map(({ userId, name, reason }) => ({ userId, name, reason }));
  }
}
