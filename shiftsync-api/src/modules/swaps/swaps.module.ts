import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SwapRequest } from './entities/swap-request.entity';
import { ShiftAssignment } from '../assignments/entities/shift-assignment.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { User } from '../users/entities/user.entity';
import { SwapsController } from './swaps.controller';
import { SwapsService } from './swaps.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SwapRequest, ShiftAssignment, Shift, User]),
    NotificationsModule,
    AssignmentsModule,
    RealtimeModule,
  ],
  controllers: [SwapsController],
  providers: [SwapsService],
  exports: [SwapsService],
})
export class SwapsModule {}
