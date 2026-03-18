import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwapRequest } from '../swaps/entities/swap-request.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { Location } from '../locations/entities/location.entity';
import { ShiftAssignment } from '../assignments/entities/shift-assignment.entity';
import { LocationsModule } from '../locations/locations.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SwapRequest, Shift, Location, ShiftAssignment]),
    LocationsModule,
    RealtimeModule,
    NotificationsModule,
    AuditModule,
    AnalyticsModule,
  ],
  providers: [JobsService],
})
export class JobsModule {}
