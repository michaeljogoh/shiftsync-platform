import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { SwapRequest } from '../swaps/entities/swap-request.entity';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  private get isEnabled(): boolean {
    return this.configService.get<string>('ENABLE_EMAIL_NOTIFICATIONS') === 'true'
      && !!this.configService.get<string>('POSTMARK_SERVER_TOKEN');
  }

  async sendWelcome(user: User, tempPassword: string): Promise<void> {
    if (!user.notifyEmail || !this.isEnabled) return;
    // TODO: integrate Postmark; for now no-op
    void user;
    void tempPassword;
  }

  async sendSchedulePublished(staff: User, shifts: Shift[]): Promise<void> {
    if (!staff.notifyEmail || !this.isEnabled) return;
    void staff;
    void shifts;
  }

  async sendSwapRequest(target: User, swap: SwapRequest): Promise<void> {
    if (!target.notifyEmail || !this.isEnabled) return;
    void target;
    void swap;
  }

  async sendSwapApproved(initiator: User, target: User, swap: SwapRequest): Promise<void> {
    if (!initiator.notifyEmail && !target.notifyEmail) return;
    if (!this.isEnabled) return;
    void initiator;
    void target;
    void swap;
  }

  async sendOverTimeWarning(staff: User, projectedHours: number): Promise<void> {
    if (!staff.notifyEmail || !this.isEnabled) return;
    void staff;
    void projectedHours;
  }

  async sendShiftCancelled(staff: User, shift: Shift): Promise<void> {
    if (!staff.notifyEmail || !this.isEnabled) return;
    void staff;
    void shift;
  }
}
