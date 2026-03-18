import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addHours } from 'date-fns';
import { SwapRequest } from './entities/swap-request.entity';
import { ShiftAssignment } from '../assignments/entities/shift-assignment.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { CreateSwapDto } from './dto/create-swap.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification-types';
import { AssignmentsService } from '../assignments/assignments.service';
import type { SessionUser } from '../auth/auth.types';
import { RealtimeService } from '../realtime/realtime.service';
import { RealtimeEvents } from '../realtime/realtime-events';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class SwapsService {
  constructor(
    @InjectRepository(SwapRequest)
    private readonly swapsRepo: Repository<SwapRequest>,
    @InjectRepository(ShiftAssignment)
    private readonly assignmentsRepo: Repository<ShiftAssignment>,
    @InjectRepository(Shift)
    private readonly shiftsRepo: Repository<Shift>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly assignmentsService: AssignmentsService,
    private readonly realtimeService: RealtimeService,
    private readonly mailService: MailService,
  ) {}

  private async getManagerLocationIds(managerId: string): Promise<string[]> {
    const manager = await this.usersRepo.findOne({
      where: { id: managerId },
      relations: ['managedLocations'],
    });
    return (manager?.managedLocations ?? []).map((l) => l.id);
  }

  private async assertManagerAccessToSwap(
    managerId: string,
    swap: SwapRequest,
  ): Promise<void> {
    const locationId = (swap as unknown as {
      initiatorAssignment?: { shift?: { locationId?: string } };
    })?.initiatorAssignment?.shift?.locationId;
    if (!locationId) return;
    const allowed = await this.getManagerLocationIds(managerId);
    if (!allowed.includes(locationId)) {
      throw new ForbiddenException('You do not have access to this location');
    }
  }

  async create(dto: CreateSwapDto, initiatorId: string): Promise<SwapRequest> {
    const pendingCount = await this.swapsRepo.count({
      where: [
        { initiatorId, status: 'pending_target' as const },
        { initiatorId, status: 'pending_manager' as const },
      ],
    });
    if (pendingCount >= 3) {
      throw new UnprocessableEntityException(
        'Cannot have more than 3 pending swap/drop requests simultaneously',
      );
    }

    const initiatorAssignment = await this.assignmentsRepo.findOne({
      where: { id: dto.initiatorAssignmentId },
      relations: ['shift', 'user'],
    });
    if (!initiatorAssignment || initiatorAssignment.userId !== initiatorId) {
      throw new NotFoundException('Assignment not found');
    }
    if (initiatorAssignment.status === 'cancelled') {
      throw new ConflictException('Assignment is cancelled');
    }

    const shift = await this.shiftsRepo.findOne({
      where: { id: initiatorAssignment.shiftId },
      relations: ['location'],
    });
    if (!shift) throw new NotFoundException('Shift not found');

    const expiresInHours = dto.type === 'drop' ? 24 : 48;
    const expiresAt = addHours(shift.startAt, -expiresInHours);
    if (new Date() >= expiresAt) {
      throw new ConflictException('Request would already be expired');
    }

    let targetUserId: string | null = null;
    let targetAssignmentId: string | null = null;

    if (dto.type === 'swap') {
      if (!dto.targetAssignmentId) {
        throw new ConflictException('targetAssignmentId required for swap');
      }
      const targetAssignment = await this.assignmentsRepo.findOne({
        where: { id: dto.targetAssignmentId },
        relations: ['user'],
      });
      if (!targetAssignment)
        throw new NotFoundException('Target assignment not found');
      targetUserId = targetAssignment.userId;
      targetAssignmentId = targetAssignment.id;
    }

    const swap = this.swapsRepo.create({
      initiatorId,
      targetUserId,
      initiatorAssignmentId: dto.initiatorAssignmentId,
      targetAssignmentId,
      type: dto.type,
      status: dto.type === 'drop' ? 'pending_manager' : 'pending_target',
      initiatorNote: dto.initiatorNote ?? null,
      expiresAt,
    });
    await this.swapsRepo.save(swap);

    if (targetUserId) {
      this.realtimeService.emitToUser(targetUserId, RealtimeEvents.SWAP_REQUEST_RECEIVED, {
        swapId: swap.id,
        initiatorId,
        type: swap.type,
      });
      await this.notificationsService.create({
        userId: targetUserId,
        type: NotificationType.SWAP_REQUEST_RECEIVED,
        title: 'Swap request',
        body: 'You have received a swap request.',
        referenceType: 'swap',
        referenceId: swap.id,
      });
      const targetUser = await this.usersRepo.findOne({ where: { id: targetUserId } });
      if (targetUser) {
        await this.mailService.sendSwapRequest(targetUser, swap);
      }
    }

    return swap;
  }

  async findAll(filters: {
    locationId?: string;
    status?: string;
  }): Promise<SwapRequest[]> {
    const qb = this.swapsRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.initiator', 'initiator')
      .leftJoinAndSelect('s.targetUser', 'targetUser')
      .leftJoinAndSelect('s.initiatorAssignment', 'ia')
      .leftJoinAndSelect('ia.shift', 'shift')
      .leftJoinAndSelect('shift.location', 'loc');

    if (filters.locationId) {
      qb.andWhere('shift.locationId = :locationId', {
        locationId: filters.locationId,
      });
    }
    if (filters.status) {
      qb.andWhere('s.status = :status', { status: filters.status });
    }

    return qb.orderBy('s.createdAt', 'DESC').getMany();
  }

  async findAllForView(
    actor: SessionUser,
    filters: { locationId?: string; status?: string },
  ): Promise<SwapRequest[]> {
    if (actor.role === 'admin') return this.findAll(filters);
    if (actor.role !== 'manager') {
      throw new ForbiddenException('You do not have access to this resource');
    }

    const allowedLocationIds = await this.getManagerLocationIds(actor.id);
    if (allowedLocationIds.length === 0) return [];
    if (filters.locationId && !allowedLocationIds.includes(filters.locationId)) {
      throw new ForbiddenException('You do not have access to this location');
    }

    const qb = this.swapsRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.initiator', 'initiator')
      .leftJoinAndSelect('s.targetUser', 'targetUser')
      .leftJoinAndSelect('s.initiatorAssignment', 'ia')
      .leftJoinAndSelect('ia.shift', 'shift')
      .leftJoinAndSelect('shift.location', 'loc')
      .andWhere('shift.locationId IN (:...allowedLocationIds)', {
        allowedLocationIds,
      });

    if (filters.locationId) {
      qb.andWhere('shift.locationId = :locationId', {
        locationId: filters.locationId,
      });
    }
    if (filters.status) {
      qb.andWhere('s.status = :status', { status: filters.status });
    }

    return qb.orderBy('s.createdAt', 'DESC').getMany();
  }

  async findById(id: string): Promise<SwapRequest> {
    const swap = await this.swapsRepo.findOne({
      where: { id },
      relations: [
        'initiator',
        'targetUser',
        'initiatorAssignment',
        'initiatorAssignment.shift',
        'initiatorAssignment.shift.location',
        'targetAssignment',
      ],
    });
    if (!swap) throw new NotFoundException('Swap request not found');
    return swap;
  }

  async findByIdForView(actor: SessionUser, id: string): Promise<SwapRequest> {
    const swap = await this.findById(id);
    if (actor.role === 'admin') return swap;
    if (actor.role === 'manager') {
      await this.assertManagerAccessToSwap(actor.id, swap);
      return swap;
    }
    // staff can only view swaps they are part of
    const isParticipant =
      swap.initiatorId === actor.id || swap.targetUserId === actor.id;
    if (!isParticipant) {
      throw new ForbiddenException('You do not have access to this swap');
    }
    return swap;
  }

  async accept(
    id: string,
    targetUserId: string,
    note?: string,
  ): Promise<SwapRequest> {
    const swap = await this.findById(id);
    if (swap.targetUserId !== targetUserId) {
      throw new ForbiddenException('Not the target of this swap');
    }
    if (swap.status !== 'pending_target') {
      throw new ConflictException('Swap is not pending your acceptance');
    }
    swap.status = 'pending_manager';
    swap.targetNote = note ?? null;
    await this.swapsRepo.save(swap);
    this.realtimeService.emitToRooms(
      [swap.initiatorId, swap.targetUserId].filter(Boolean).map((uid) => `user_${uid}`),
      RealtimeEvents.SWAP_STATUS_CHANGED,
      { swapId: swap.id, status: swap.status },
    );
    return swap;
  }

  async reject(id: string, targetUserId: string): Promise<SwapRequest> {
    const swap = await this.findById(id);
    if (swap.targetUserId !== targetUserId) {
      throw new ForbiddenException('Not the target of this swap');
    }
    if (swap.status !== 'pending_target') {
      throw new ConflictException('Swap is not pending your response');
    }
    swap.status = 'rejected';
    await this.swapsRepo.save(swap);
    this.realtimeService.emitToRooms(
      [swap.initiatorId, swap.targetUserId].filter(Boolean).map((uid) => `user_${uid}`),
      RealtimeEvents.SWAP_STATUS_CHANGED,
      { swapId: swap.id, status: swap.status },
    );
    await this.notificationsService.create({
      userId: swap.initiatorId,
      type: NotificationType.SWAP_REJECTED,
      title: 'Swap rejected',
      body: 'Your swap request was rejected.',
      referenceType: 'swap',
      referenceId: swap.id,
    });
    return swap;
  }

  async cancel(id: string, initiatorId: string): Promise<SwapRequest> {
    const swap = await this.findById(id);
    if (swap.initiatorId !== initiatorId) {
      throw new ForbiddenException('Only initiator can cancel');
    }
    if (swap.status !== 'pending_target' && swap.status !== 'pending_manager') {
      throw new ConflictException('Cannot cancel in current status');
    }
    swap.status = 'cancelled';
    await this.swapsRepo.save(swap);
    this.realtimeService.emitToRooms(
      [swap.initiatorId, swap.targetUserId].filter(Boolean).map((uid) => `user_${uid}`),
      RealtimeEvents.SWAP_STATUS_CHANGED,
      { swapId: swap.id, status: swap.status },
    );
    if (swap.targetUserId) {
      await this.notificationsService.create({
        userId: swap.targetUserId,
        type: NotificationType.SWAP_CANCELLED,
        title: 'Swap cancelled',
        body: 'The swap request was cancelled.',
        referenceType: 'swap',
        referenceId: swap.id,
      });
    }
    return swap;
  }

  async approve(id: string, managerId: string): Promise<SwapRequest> {
    const swap = await this.findById(id);
    if (swap.status !== 'pending_manager') {
      throw new ConflictException('Swap is not pending approval');
    }
    await this.assertManagerAccessToSwap(managerId, swap);

    if (swap.type === 'swap' && swap.targetAssignmentId) {
      const initAssignment = await this.assignmentsRepo.findOne({
        where: { id: swap.initiatorAssignmentId },
        relations: ['shift'],
      });
      const targetAssignment = await this.assignmentsRepo.findOne({
        where: { id: swap.targetAssignmentId },
        relations: ['shift'],
      });
      if (!initAssignment || !targetAssignment)
        throw new NotFoundException('Assignment not found');

      const initiatorId = initAssignment.userId;
      const targetId = targetAssignment.userId;

      const targetOnInitiatorShift = await this.assignmentsService.validateOnly(
        initAssignment.shiftId,
        targetId,
      );
      if (!targetOnInitiatorShift.valid) {
        throw new UnprocessableEntityException(
          `Approval rejected: ${targetOnInitiatorShift.message}`,
        );
      }
      const initiatorOnTargetShift = await this.assignmentsService.validateOnly(
        targetAssignment.shiftId,
        initiatorId,
      );
      if (!initiatorOnTargetShift.valid) {
        throw new UnprocessableEntityException(
          `Approval rejected: ${initiatorOnTargetShift.message}`,
        );
      }

      initAssignment.status = 'cancelled';
      await this.assignmentsRepo.save(initAssignment);
      targetAssignment.status = 'cancelled';
      await this.assignmentsRepo.save(targetAssignment);

      const newInitAssignment = this.assignmentsRepo.create({
        shiftId: targetAssignment.shiftId,
        userId: initiatorId,
        assignedBy: managerId,
        status: 'confirmed',
      });
      await this.assignmentsRepo.save(newInitAssignment);
      const newTargetAssignment = this.assignmentsRepo.create({
        shiftId: initAssignment.shiftId,
        userId: targetId,
        assignedBy: managerId,
        status: 'confirmed',
      });
      await this.assignmentsRepo.save(newTargetAssignment);
    } else if (swap.type === 'drop') {
      const initAssignment = await this.assignmentsRepo.findOne({
        where: { id: swap.initiatorAssignmentId },
      });
      if (initAssignment) {
        initAssignment.status = 'dropped';
        await this.assignmentsRepo.save(initAssignment);
      }
    }

    swap.status = 'approved';
    swap.reviewedBy = managerId;
    swap.reviewedAt = new Date();
    await this.swapsRepo.save(swap);

    await this.notificationsService.create({
      userId: swap.initiatorId,
      type:
        swap.type === 'swap'
          ? NotificationType.SWAP_APPROVED
          : NotificationType.DROP_PICKED_UP,
      title: 'Request approved',
      body: 'Your request has been approved.',
      referenceType: 'swap',
      referenceId: swap.id,
    });
    if (swap.targetUserId) {
      await this.notificationsService.create({
        userId: swap.targetUserId,
        type: NotificationType.SWAP_APPROVED,
        title: 'Swap approved',
        body: 'The swap has been approved.',
        referenceType: 'swap',
        referenceId: swap.id,
      });
    }

    const locationId = (swap as { initiatorAssignment?: { shift?: { locationId: string } } })
      .initiatorAssignment?.shift?.locationId;
    if (locationId) {
      this.realtimeService.emitToLocation(locationId, RealtimeEvents.SWAP_MANAGER_ACTION, {
        swapId: swap.id,
        action: 'approved',
        reviewedBy: managerId,
      });
    }
    this.realtimeService.emitToRooms(
      [swap.initiatorId, swap.targetUserId].filter(Boolean).map((uid) => `user_${uid}`),
      RealtimeEvents.SWAP_STATUS_CHANGED,
      { swapId: swap.id, status: swap.status },
    );

    if (swap.initiator) {
      await this.mailService.sendSwapApproved(
        swap.initiator,
        swap.targetUser ?? null,
        swap,
      );
    }

    return swap;
  }

  async handleShiftEdited(shiftId: string, assignmentIds: string[]): Promise<void> {
    if (assignmentIds.length === 0) return;
    const pending = await this.swapsRepo
      .createQueryBuilder('s')
      .where(
        '(s.initiatorAssignmentId IN (:...ids) OR s.targetAssignmentId IN (:...ids))',
        { ids: assignmentIds },
      )
      .andWhere('s.status IN (:...statuses)', {
        statuses: ['pending_target', 'pending_manager'],
      })
      .getMany();

    const cancelBody =
      'The underlying shift was edited; the swap/drop request has been cancelled.';
    for (const swap of pending) {
      swap.status = 'cancelled';
      await this.swapsRepo.save(swap);
      this.realtimeService.emitToRooms(
        [swap.initiatorId, swap.targetUserId].filter(Boolean).map((uid) => `user_${uid}`),
        RealtimeEvents.SWAP_STATUS_CHANGED,
        { swapId: swap.id, status: swap.status, reason: 'shift_edited' },
      );
      await this.notificationsService.create({
        userId: swap.initiatorId,
        type: NotificationType.SWAP_CANCELLED,
        title: 'Swap/drop request cancelled',
        body: cancelBody,
        referenceType: 'swap',
        referenceId: swap.id,
      });
      if (swap.targetUserId) {
        await this.notificationsService.create({
          userId: swap.targetUserId,
          type: NotificationType.SWAP_CANCELLED,
          title: 'Swap request cancelled',
          body: cancelBody,
          referenceType: 'swap',
          referenceId: swap.id,
        });
      }
    }
  }

  async deny(
    id: string,
    managerId: string,
    reason?: string,
  ): Promise<SwapRequest> {
    const swap = await this.findById(id);
    if (swap.status !== 'pending_manager') {
      throw new ConflictException('Swap is not pending approval');
    }
    await this.assertManagerAccessToSwap(managerId, swap);
    swap.status = 'rejected';
    swap.reviewedBy = managerId;
    swap.reviewedAt = new Date();
    swap.managerNote = reason ?? null;
    await this.swapsRepo.save(swap);

    const locationId = (swap as { initiatorAssignment?: { shift?: { locationId: string } } })
      .initiatorAssignment?.shift?.locationId;
    if (locationId) {
      this.realtimeService.emitToLocation(locationId, RealtimeEvents.SWAP_MANAGER_ACTION, {
        swapId: swap.id,
        action: 'denied',
        reviewedBy: managerId,
      });
    }
    this.realtimeService.emitToRooms(
      [swap.initiatorId, swap.targetUserId].filter(Boolean).map((uid) => `user_${uid}`),
      RealtimeEvents.SWAP_STATUS_CHANGED,
      { swapId: swap.id, status: swap.status },
    );

    await this.notificationsService.create({
      userId: swap.initiatorId,
      type: NotificationType.SWAP_DENIED,
      title: 'Request denied',
      body: reason ?? 'Your request was denied.',
      referenceType: 'swap',
      referenceId: swap.id,
    });

    return swap;
  }

  async findByUser(userId: string): Promise<SwapRequest[]> {
    return this.swapsRepo.find({
      where: [{ initiatorId: userId }, { targetUserId: userId }],
      relations: [
        'initiator',
        'targetUser',
        'initiatorAssignment',
        'initiatorAssignment.shift',
        'initiatorAssignment.shift.location',
        'initiatorAssignment.shift.requiredSkill',
        'targetAssignment',
        'targetAssignment.shift',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Returns all open drop requests (pending_manager, type='drop') for shifts the requesting
   * user is qualified to cover (certified for the location, has required skill, is available,
   * no double-booking). Excludes drops initiated by the requesting user.
   */
  async findAvailableDrops(userId: string): Promise<SwapRequest[]> {
    const drops = await this.swapsRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.initiator', 'initiator')
      .leftJoinAndSelect('s.initiatorAssignment', 'ia')
      .leftJoinAndSelect('ia.shift', 'shift')
      .leftJoinAndSelect('shift.location', 'loc')
      .leftJoinAndSelect('shift.requiredSkill', 'skill')
      .where('s.type = :type', { type: 'drop' })
      .andWhere('s.status = :status', { status: 'pending_manager' })
      .andWhere('s.initiatorId != :userId', { userId })
      .andWhere('s.expiresAt > :now', { now: new Date() })
      .andWhere('shift.startAt > :now', { now: new Date() })
      .orderBy('shift.startAt', 'ASC')
      .getMany();

    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['skills', 'locationCertifications'],
    });
    if (!user) return [];

    const eligible: SwapRequest[] = [];
    for (const drop of drops) {
      const shift = drop.initiatorAssignment?.shift;
      if (!shift) continue;

      const hasSkill = user.skills?.some((sk) => sk.id === shift.requiredSkillId);
      if (!hasSkill) continue;

      const cert = user.locationCertifications?.find(
        (c) => c.locationId === shift.locationId && !c.revokedAt,
      );
      if (!cert) continue;

      eligible.push(drop);
    }

    return eligible;
  }

  /**
   * Staff claims an open drop shift. Creates a new assignment for the claimer on the dropped
   * shift (validated) and marks the swap as approved.
   */
  async claimDrop(swapId: string, claimerId: string): Promise<SwapRequest> {
    const swap = await this.findById(swapId);
    if (swap.type !== 'drop') {
      throw new ConflictException('Only drop requests can be claimed');
    }
    if (swap.status !== 'pending_manager') {
      throw new ConflictException('Drop request is not available to claim');
    }
    if (swap.initiatorId === claimerId) {
      throw new ForbiddenException('Cannot claim your own drop');
    }
    if (new Date() >= (swap.expiresAt ?? new Date(0))) {
      throw new ConflictException('Drop request has expired');
    }

    const initAssignment = await this.assignmentsRepo.findOne({
      where: { id: swap.initiatorAssignmentId },
      relations: ['shift', 'shift.location', 'shift.requiredSkill'],
    });
    if (!initAssignment) throw new NotFoundException('Assignment not found');

    const validation = await this.assignmentsService.validateOnly(
      initAssignment.shiftId,
      claimerId,
    );
    if (!validation.valid) {
      throw new UnprocessableEntityException(
        `Cannot claim: ${validation.message}`,
      );
    }

    initAssignment.status = 'dropped';
    await this.assignmentsRepo.save(initAssignment);

    const newAssignment = this.assignmentsRepo.create({
      shiftId: initAssignment.shiftId,
      userId: claimerId,
      assignedBy: claimerId,
      status: 'confirmed',
    });
    await this.assignmentsRepo.save(newAssignment);

    swap.status = 'approved';
    swap.targetUserId = claimerId;
    swap.reviewedBy = claimerId;
    swap.reviewedAt = new Date();
    swap.targetNote = 'Claimed by staff member';
    await this.swapsRepo.save(swap);

    await this.notificationsService.create({
      userId: swap.initiatorId,
      type: NotificationType.DROP_PICKED_UP,
      title: 'Drop claimed',
      body: 'Your drop request was picked up.',
      referenceType: 'swap',
      referenceId: swap.id,
    });
    await this.notificationsService.create({
      userId: claimerId,
      type: NotificationType.DROP_PICKED_UP,
      title: 'Shift picked up',
      body: 'You successfully picked up the shift.',
      referenceType: 'swap',
      referenceId: swap.id,
    });

    const locationId = initAssignment.shift?.locationId;
    if (locationId) {
      this.realtimeService.emitToLocation(locationId, RealtimeEvents.SWAP_MANAGER_ACTION, {
        swapId: swap.id,
        action: 'drop_claimed',
        claimedBy: claimerId,
      });
    }
    this.realtimeService.emitToRooms(
      [swap.initiatorId, claimerId].map((uid) => `user_${uid}`),
      RealtimeEvents.SWAP_STATUS_CHANGED,
      { swapId: swap.id, status: swap.status },
    );

    return swap;
  }
}
