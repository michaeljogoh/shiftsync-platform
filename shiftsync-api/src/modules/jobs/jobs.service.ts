import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In, Between } from 'typeorm';
import { addHours, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { SwapRequest } from '../swaps/entities/swap-request.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { Location } from '../locations/entities/location.entity';
import { ShiftAssignment } from '../assignments/entities/shift-assignment.entity';
import { LocationsService } from '../locations/locations.service';
import { RealtimeService } from '../realtime/realtime.service';
import { RealtimeEvents } from '../realtime/realtime-events';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types';
import { AuditService } from '../audit/audit.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(SwapRequest)
    private readonly swapsRepo: Repository<SwapRequest>,
    @InjectRepository(Shift)
    private readonly shiftsRepo: Repository<Shift>,
    @InjectRepository(Location)
    private readonly locationsRepo: Repository<Location>,
    @InjectRepository(ShiftAssignment)
    private readonly assignmentsRepo: Repository<ShiftAssignment>,
    private readonly locationsService: LocationsService,
    private readonly realtimeService: RealtimeService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Cron('*/15 * * * *') // Every 15 minutes
  async expireDropRequests(): Promise<void> {
    const now = new Date();
    const expired = await this.swapsRepo.find({
      where: {
        status: In(['pending_target', 'pending_manager']),
        expiresAt: LessThan(now),
      },
      relations: ['initiatorAssignment', 'initiatorAssignment.shift'],
    });
    for (const swap of expired) {
      const previousStatus = swap.status;
      swap.status = 'expired';
      await this.swapsRepo.save(swap);
      await this.notificationsService.create({
        userId: swap.initiatorId,
        type: swap.type === 'drop' ? NotificationType.DROP_EXPIRED : NotificationType.SWAP_EXPIRED,
        title: swap.type === 'drop' ? 'Drop request expired' : 'Swap request expired',
        body:
          swap.type === 'drop'
            ? 'Your drop request has expired.'
            : 'Your swap request has expired.',
        referenceType: 'swap',
        referenceId: swap.id,
      });
      const locationId = (swap as { initiatorAssignment?: { shift?: { locationId: string } } })
        .initiatorAssignment?.shift?.locationId ?? null;
      await this.auditService.create({
        actorId: null,
        entityType: 'swap',
        entityId: swap.id,
        action: 'expired',
        beforeState: { status: previousStatus },
        afterState: { status: 'expired' },
        locationId,
      });
    }
  }

  @Cron('0 * * * *') // Every hour
  async warnApproachingCutoffs(): Promise<void> {
    const now = new Date();
    const windowEnd = addHours(now, 49);
    const shifts = await this.shiftsRepo.find({
      where: {
        status: 'published',
        startAt: Between(now, windowEnd),
      },
    });

    for (const shift of shifts) {
      const assignedCount = await this.assignmentsRepo
        .createQueryBuilder('a')
        .where('a.shiftId = :shiftId', { shiftId: shift.id })
        .andWhere('a.status NOT IN (:...statuses)', { statuses: ['cancelled', 'dropped'] })
        .getCount();
      const headcountNeeded = shift.headcountNeeded ?? 1;
      if (assignedCount >= headcountNeeded) continue;
      const loc = await this.locationsRepo.findOne({
        where: { id: shift.locationId },
        relations: ['managers'],
      });
      if (!loc?.managers?.length) continue;
      const unfilled = headcountNeeded - assignedCount;
      for (const manager of loc.managers) {
        await this.notificationsService.create({
          userId: manager.id,
          type: NotificationType.CUTOFF_WARNING,
          title: 'Shift approaching edit cutoff',
          body: `Shift ${shift.title ?? shift.id} starts within 49 hours with ${unfilled} unfilled headcount slot(s) (${assignedCount}/${headcountNeeded}).`,
          referenceType: 'shift',
          referenceId: shift.id,
        });
      }
    }
  }

  @Cron('* * * * *') // Every minute
  async emitOnDutyUpdates(): Promise<void> {
    const locations = await this.locationsService.findAll();
    for (const loc of locations) {
      const onDuty = await this.locationsService.getOnDuty(loc.id);
      this.realtimeService.emitToLocation(loc.id, RealtimeEvents.DUTY_UPDATE, {
        locationId: loc.id,
        onDuty,
        at: new Date().toISOString(),
      });
    }
  }

  @Cron('0 6 * * 1') // Monday 6am
  async weeklyFairnessReport(): Promise<void> {
    const now = new Date();
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const startStr = lastWeekStart.toISOString().slice(0, 10);
    const endStr = lastWeekEnd.toISOString().slice(0, 10);

    const locations = await this.locationsRepo.find({
      relations: ['managers'],
    });
    for (const loc of locations) {
      const fairness = await this.analyticsService.getFairness(loc.id, startStr, endStr);
      const flagged = fairness.staff.filter((s) => s.flagged);
      if (flagged.length === 0) continue;
      if (!loc.managers?.length) continue;
      const names = flagged.map((s) => `${s.name} (${(s.deviationFromAverage * 100).toFixed(0)}% from avg)`).join(', ');
      for (const manager of loc.managers) {
        await this.notificationsService.create({
          userId: manager.id,
          type: NotificationType.FAIRNESS_REPORT,
          title: 'Weekly fairness report',
          body: `For the week ${startStr}–${endStr}, the following staff had premium shift ratio >25% from average: ${names}.`,
          referenceType: 'location',
          referenceId: loc.id,
        });
      }
    }
  }
}
