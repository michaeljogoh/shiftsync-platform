import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AvailabilityWindow } from './entities/availability-window.entity';
import { AvailabilityException } from './entities/availability-exception.entity';
import { CreateAvailabilityWindowDto } from './dto/create-availability-window.dto';
import { UpdateAvailabilityWindowDto } from './dto/update-availability-window.dto';
import { CreateAvailabilityExceptionDto } from './dto/create-availability-exception.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilityWindow)
    private readonly windowsRepo: Repository<AvailabilityWindow>,
    @InjectRepository(AvailabilityException)
    private readonly exceptionsRepo: Repository<AvailabilityException>,
  ) {}

  async getAvailability(userId: string): Promise<{
    windows: AvailabilityWindow[];
    exceptions: AvailabilityException[];
  }> {
    const [windows, exceptions] = await Promise.all([
      this.windowsRepo.find({
        where: { userId },
        order: { dayOfWeek: 'ASC' },
      }),
      this.exceptionsRepo.find({
        where: { userId },
        order: { exceptionDate: 'ASC' },
      }),
    ]);
    return { windows, exceptions };
  }

  async createWindow(userId: string, dto: CreateAvailabilityWindowDto): Promise<AvailabilityWindow> {
    const window = this.windowsRepo.create({
      userId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      effectiveFrom: dto.effectiveFrom,
      effectiveUntil: dto.effectiveUntil ?? null,
    });
    return this.windowsRepo.save(window);
  }

  async updateWindow(
    userId: string,
    windowId: string,
    dto: UpdateAvailabilityWindowDto,
  ): Promise<AvailabilityWindow> {
    const window = await this.windowsRepo.findOne({
      where: { id: windowId, userId },
    });
    if (!window) throw new NotFoundException('Availability window not found');
    Object.assign(window, dto);
    return this.windowsRepo.save(window);
  }

  async deleteWindow(userId: string, windowId: string): Promise<void> {
    const result = await this.windowsRepo.delete({ id: windowId, userId });
    if (result.affected === 0) throw new NotFoundException('Availability window not found');
  }

  async createException(
    userId: string,
    dto: CreateAvailabilityExceptionDto,
  ): Promise<AvailabilityException> {
    const ex = this.exceptionsRepo.create({
      userId,
      exceptionDate: dto.exceptionDate,
      isAvailable: dto.isAvailable,
      startTime: dto.startTime ?? null,
      endTime: dto.endTime ?? null,
      reason: dto.reason ?? null,
    });
    return this.exceptionsRepo.save(ex);
  }

  async deleteException(userId: string, exceptionId: string): Promise<void> {
    const result = await this.exceptionsRepo.delete({ id: exceptionId, userId });
    if (result.affected === 0) throw new NotFoundException('Availability exception not found');
  }
}
