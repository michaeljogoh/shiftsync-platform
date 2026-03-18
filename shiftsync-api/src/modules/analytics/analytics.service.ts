import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { startOfWeek, endOfWeek, addDays } from 'date-fns';
import { Shift } from '../shifts/entities/shift.entity';
import { ShiftAssignment } from '../assignments/entities/shift-assignment.entity';
import { User } from '../users/entities/user.entity';
import { AssignmentsService } from '../assignments/assignments.service';

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class AnalyticsService {
  private cache = new Map<string, { value: unknown; expires: number }>();

  constructor(
    @InjectRepository(Shift)
    private readonly shiftsRepo: Repository<Shift>,
    @InjectRepository(ShiftAssignment)
    private readonly assignmentsRepo: Repository<ShiftAssignment>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  private getCached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) return entry.value as Promise<T>;
    const promise = fn().then((value) => {
      this.cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
      return value;
    });
    return promise;
  }

  async getOvertime(
    locationId?: string,
    weekStart?: string,
  ): Promise<{ userId: string; name: string; projectedHours: number }[]> {
    const start = weekStart ? new Date(weekStart) : new Date();
    const weekStartDate = startOfWeek(start, { weekStartsOn: 0 });
    const weekEndDate = endOfWeek(start, { weekStartsOn: 0 });

    const qb = this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.shift', 's')
      .where('a.status NOT IN (:...statuses)', { statuses: ['cancelled'] })
      .andWhere('s.startAt >= :weekStart', { weekStart: weekStartDate })
      .andWhere('s.endAt <= :weekEnd', { weekEnd: weekEndDate });

    if (locationId) {
      qb.andWhere('s.locationId = :locationId', { locationId });
    }

    const assignments = await qb.getMany();
    const hoursByUser = new Map<string, number>();

    for (const a of assignments) {
      const s = await this.shiftsRepo.findOne({ where: { id: a.shiftId } });
      if (!s) continue;
      const hours = (s.endAt.getTime() - s.startAt.getTime()) / (60 * 60 * 1000);
      hoursByUser.set(a.userId, (hoursByUser.get(a.userId) ?? 0) + hours);
    }

    const result: { userId: string; name: string; projectedHours: number }[] = [];
    for (const [userId, hours] of hoursByUser) {
      if (hours >= 35) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        result.push({
          userId,
          name: user ? `${user.firstName} ${user.lastName}` : userId,
          projectedHours: Math.round(hours * 10) / 10,
        });
      }
    }
    return result;
  }

  async getHoursDistribution(
    locationId: string | undefined,
    startDate: string,
    endDate: string,
  ): Promise<{ userId: string; name: string; totalHours: number }[]> {
    const key = `hours:${locationId ?? 'all'}:${startDate}:${endDate}`;
    return this.getCached(key, async () => {
      const qb = this.assignmentsRepo
        .createQueryBuilder('a')
        .innerJoin('a.shift', 's')
        .where('a.status NOT IN (:...statuses)', { statuses: ['cancelled'] })
        .andWhere('s.startAt >= :start', { start: new Date(startDate) })
        .andWhere('s.endAt <= :end', { end: new Date(endDate) });

      if (locationId) {
        qb.andWhere('s.locationId = :locationId', { locationId });
      }

      const assignments = await qb.getMany();
      const hoursByUser = new Map<string, number>();

      for (const a of assignments) {
        const s = await this.shiftsRepo.findOne({ where: { id: a.shiftId } });
        if (!s) continue;
        const hours = (s.endAt.getTime() - s.startAt.getTime()) / (60 * 60 * 1000);
        hoursByUser.set(a.userId, (hoursByUser.get(a.userId) ?? 0) + hours);
      }

      const result: { userId: string; name: string; totalHours: number }[] = [];
      for (const [userId, hours] of hoursByUser) {
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        result.push({
          userId,
          name: user ? `${user.firstName} ${user.lastName}` : userId,
          totalHours: Math.round(hours * 10) / 10,
        });
      }
      return result;
    });
  }

  async getFairness(
    locationId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    fairnessScore: number;
    averagePremiumRatio: number;
    standardDeviation: number;
    staff: {
      userId: string;
      name: string;
      premiumShiftsAssigned: number;
      totalShiftsAssigned: number;
      premiumRatio: number;
      deviationFromAverage: number;
      flagged: boolean;
    }[];
  }> {
    const start = startDate ? new Date(startDate) : addDays(new Date(), -7);
    const end = endDate ? new Date(endDate) : new Date();
    const key = `fairness:${locationId}:${start.toISOString()}:${end.toISOString()}`;

    return this.getCached(key, async () => {
      const assignments = await this.assignmentsRepo
        .createQueryBuilder('a')
        .innerJoin('a.shift', 's')
        .where('a.status NOT IN (:...statuses)', { statuses: ['cancelled', 'dropped'] })
        .andWhere('s.locationId = :locationId', { locationId })
        .andWhere('s.startAt >= :start', { start })
        .andWhere('s.endAt <= :end', { end })
        .getMany();

      const totalByUser = new Map<string, number>();
      const premiumByUser = new Map<string, number>();

      for (const a of assignments) {
        const s = await this.shiftsRepo.findOne({ where: { id: a.shiftId } });
        if (!s) continue;
        totalByUser.set(a.userId, (totalByUser.get(a.userId) ?? 0) + 1);
        if ((s as Shift & { isPremium?: boolean }).isPremium) {
          premiumByUser.set(a.userId, (premiumByUser.get(a.userId) ?? 0) + 1);
        }
      }

      const ratios: number[] = [];
      const staff: {
        userId: string;
        name: string;
        premiumShiftsAssigned: number;
        totalShiftsAssigned: number;
        premiumRatio: number;
        deviationFromAverage: number;
        flagged: boolean;
      }[] = [];

      for (const [userId, total] of totalByUser) {
        const premium = premiumByUser.get(userId) ?? 0;
        const ratio = total > 0 ? premium / total : 0;
        ratios.push(ratio);
        const user = await this.usersRepo.findOne({ where: { id: userId } });
        staff.push({
          userId,
          name: user ? `${user.firstName} ${user.lastName}` : userId,
          premiumShiftsAssigned: premium,
          totalShiftsAssigned: total,
          premiumRatio: ratio,
          deviationFromAverage: 0,
          flagged: false,
        });
      }

      const average =
        ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
      const variance =
        ratios.length > 1
          ? ratios.reduce((sum, r) => sum + Math.pow(r - average, 2), 0) / ratios.length
          : 0;
      const standardDeviation = Math.sqrt(variance);

      const fairnessScore =
        average > 0
          ? Math.max(0, Math.min(1, 1 - standardDeviation / average))
          : 1;

      const DEVIATION_FLAG_THRESHOLD = 0.25;
      staff.forEach((s) => {
        s.deviationFromAverage =
          average > 0 ? (s.premiumRatio - average) / average : 0;
        s.flagged = average > 0 && Math.abs(s.deviationFromAverage) > DEVIATION_FLAG_THRESHOLD;
      });

      return {
        fairnessScore,
        averagePremiumRatio: average,
        standardDeviation,
        staff,
      };
    });
  }

  async whatIf(userId: string, shiftId: string): Promise<{
    projectedWeeklyHours: number;
    conflicts: { rule: string; message: string }[];
    warnings: string[];
    canAssign: boolean;
  }> {
    const shift = await this.shiftsRepo.findOne({
      where: { id: shiftId },
      relations: ['location', 'requiredSkill'],
    });
    if (!shift) throw new Error('Shift not found');

    const weekStart = startOfWeek(shift.startAt, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(shift.startAt, { weekStartsOn: 0 });

    const assignments = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.shift', 's')
      .where('a.userId = :userId', { userId })
      .andWhere('a.status NOT IN (:...statuses)', { statuses: ['cancelled'] })
      .andWhere('s.startAt >= :weekStart', { weekStart })
      .andWhere('s.endAt <= :weekEnd', { weekEnd })
      .getMany();

    let totalHours = (shift.endAt.getTime() - shift.startAt.getTime()) / (60 * 60 * 1000);
    for (const a of assignments) {
      const s = await this.shiftsRepo.findOne({ where: { id: a.shiftId } });
      if (s && s.id !== shiftId) {
        totalHours += (s.endAt.getTime() - s.startAt.getTime()) / (60 * 60 * 1000);
      }
    }

    const conflicts: { rule: string; message: string }[] = [];
    const warnings: string[] = [];

    const validation = await this.assignmentsService.validateOnly(shiftId, userId);
    if (!validation.valid) {
      conflicts.push({ rule: 'constraint', message: validation.message ?? 'Constraint violation' });
    }

    const projectedWeeklyHours = Math.round(totalHours * 10) / 10;
    if (totalHours >= 40) warnings.push(`Would reach ${projectedWeeklyHours}h this week (exceeds 40h)`);
    else if (totalHours >= 35) warnings.push(`Would reach ${projectedWeeklyHours}h this week (approaching 40h)`);

    return {
      projectedWeeklyHours,
      conflicts,
      warnings,
      canAssign: conflicts.length === 0,
    };
  }

  async getUnderstaffed(
    locationId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ shiftId: string; title: string; needed: number; assigned: number }[]> {
    const qb = this.shiftsRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: 'published' });

    if (locationId) qb.andWhere('s.locationId = :locationId', { locationId });
    if (startDate) qb.andWhere('s.startAt >= :start', { start: new Date(startDate) });
    if (endDate) qb.andWhere('s.endAt <= :end', { end: new Date(endDate) });

    const shifts = await qb.getMany();
    const result: { shiftId: string; title: string; needed: number; assigned: number }[] = [];

    for (const s of shifts) {
      const count = await this.assignmentsRepo.count({
        where: {
          shiftId: s.id,
          status: 'assigned' as const,
        },
      });
      const countConfirmed = await this.assignmentsRepo
        .createQueryBuilder('a')
        .where('a.shiftId = :shiftId', { shiftId: s.id })
        .andWhere('a.status NOT IN (:...statuses)', { statuses: ['cancelled', 'dropped'] })
        .getCount();

      if (countConfirmed < s.headcountNeeded) {
        result.push({
          shiftId: s.id,
          title: s.title ?? s.id,
          needed: s.headcountNeeded,
          assigned: countConfirmed,
        });
      }
    }
    return result;
  }
}
