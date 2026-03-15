import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { RealtimeEvents } from '../realtime/realtime-events';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(params: {
    userId: string;
    type: string;
    title: string;
    body: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<Notification> {
    const n = this.repo.create(params);
    const saved = await this.repo.save(n);
    this.realtimeService.emitToUser(params.userId, RealtimeEvents.NOTIFICATION_NEW, {
      id: saved.id,
      type: saved.type,
      title: saved.title,
      body: saved.body,
      referenceType: saved.referenceType,
      referenceId: saved.referenceId,
      createdAt: saved.createdAt,
    });
    return saved;
  }

  async findByUser(
    userId: string,
    options: { limit?: number; offset?: number; unreadOnly?: boolean } = {},
  ): Promise<Notification[]> {
    const { limit = 25, offset = 0, unreadOnly = false } = options;
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC')
      .take(limit)
      .skip(offset);
    if (unreadOnly) qb.andWhere('n.isRead = false');
    return qb.getMany();
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.repo.update(
      { id, userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.repo.delete({ id, userId });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, isRead: false } });
  }
}
