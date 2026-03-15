import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from './entities/shift.entity';
import { Location } from '../locations/entities/location.entity';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { SwapsModule } from '../swaps/swaps.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, Location, User, AuditLog]),
    NotificationsModule,
    AssignmentsModule,
    SwapsModule,
    RealtimeModule,
    MailModule,
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService, TypeOrmModule],
})
export class ShiftsModule {}
