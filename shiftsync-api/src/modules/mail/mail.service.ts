import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as postmark from 'postmark';
import { User } from '../users/entities/user.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { SwapRequest } from '../swaps/entities/swap-request.entity';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private client: postmark.ServerClient | null = null;
  private fromEmail: string = '';

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('POSTMARK_SERVER_TOKEN');
    const from = this.configService.get<string>('POSTMARK_FROM_EMAIL');
    if (token) {
      this.client = new postmark.ServerClient(token);
      this.fromEmail = from ?? 'noreply@shiftsync.local';
    }
  }

  private get isEnabled(): boolean {
    return (
      this.configService.get<string>('ENABLE_EMAIL_NOTIFICATIONS') === 'true' &&
      !!this.configService.get<string>('POSTMARK_SERVER_TOKEN') &&
      !!this.client
    );
  }

  private async send(to: string, subject: string, textBody: string, htmlBody?: string): Promise<void> {
    if (!this.client || !this.fromEmail) return;
    try {
      await this.client.sendEmail({
        From: this.fromEmail,
        To: to,
        Subject: subject,
        TextBody: textBody,
        HtmlBody: htmlBody ?? textBody.replace(/\n/g, '<br>'),
      });
    } catch (err) {
      this.logger.warn(`Postmark send failed to ${to}: ${(err as Error).message}`);
    }
  }

  private formatShift(shift: Shift): string {
    const start = shift.startAt instanceof Date ? shift.startAt : new Date(shift.startAt);
    const end = shift.endAt instanceof Date ? shift.endAt : new Date(shift.endAt);
    const title = shift.title ?? 'Shift';
    return `${title} ${start.toLocaleString()} – ${end.toLocaleString()}`;
  }

  async sendWelcome(user: User, tempPassword: string): Promise<void> {
    if (!user.notifyEmail || !this.isEnabled) return;
    const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
    const subject = 'Welcome to ShiftSync';
    const text = `Hi ${name},\n\nYour ShiftSync account has been created.\n\nEmail: ${user.email}\nTemporary password: ${tempPassword}\n\nPlease sign in and change your password.\n\n— ShiftSync`;
    await this.send(user.email, subject, text);
  }

  async sendSchedulePublished(staff: User, shifts: Shift[]): Promise<void> {
    if (!staff.notifyEmail || !this.isEnabled) return;
    const name = `${staff.firstName} ${staff.lastName}`.trim() || staff.email;
    const list = shifts.map((s) => this.formatShift(s)).join('\n• ');
    const subject = 'Your schedule has been published';
    const text = `Hi ${name},\n\nYour schedule has been published with the following shift(s):\n\n• ${list}\n\n— ShiftSync`;
    await this.send(staff.email, subject, text);
  }

  async sendSwapRequest(target: User, swap: SwapRequest): Promise<void> {
    if (!target.notifyEmail || !this.isEnabled) return;
    const name = `${target.firstName} ${target.lastName}`.trim() || target.email;
    const subject = 'You have a swap request';
    const text = `Hi ${name},\n\nSomeone has requested to swap shifts with you. Please log in to ShiftSync to accept or decline.\n\nRequest ID: ${swap.id}\n\n— ShiftSync`;
    await this.send(target.email, subject, text);
  }

  async sendSwapApproved(initiator: User, target: User | null, swap: SwapRequest): Promise<void> {
    if (!this.isEnabled) return;
    const subject = 'Swap request approved';
    const base = `The swap request (${swap.id}) has been approved.`;
    if (initiator.notifyEmail) {
      const name = `${initiator.firstName} ${initiator.lastName}`.trim() || initiator.email;
      await this.send(initiator.email, subject, `Hi ${name},\n\n${base}\n\n— ShiftSync`);
    }
    if (target?.notifyEmail) {
      const name = `${target.firstName} ${target.lastName}`.trim() || target.email;
      await this.send(target.email, subject, `Hi ${name},\n\n${base}\n\n— ShiftSync`);
    }
  }

  async sendOverTimeWarning(staff: User, projectedHours: number): Promise<void> {
    if (!staff.notifyEmail || !this.isEnabled) return;
    const name = `${staff.firstName} ${staff.lastName}`.trim() || staff.email;
    const subject = 'Overtime notice';
    const text = `Hi ${name},\n\nYour projected hours this week are ${projectedHours}h. You are approaching or over 40 hours.\n\n— ShiftSync`;
    await this.send(staff.email, subject, text);
  }

  async sendShiftCancelled(staff: User, shift: Shift): Promise<void> {
    if (!staff.notifyEmail || !this.isEnabled) return;
    const name = `${staff.firstName} ${staff.lastName}`.trim() || staff.email;
    const subject = 'Shift cancelled';
    const text = `Hi ${name},\n\nThe following shift has been cancelled:\n\n${this.formatShift(shift)}\n\n— ShiftSync`;
    await this.send(staff.email, subject, text);
  }
}
