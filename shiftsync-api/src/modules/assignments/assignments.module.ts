import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftAssignment } from './entities/shift-assignment.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { User } from '../users/entities/user.entity';
import { UserLocationCertification } from '../locations/entities/user-location-certification.entity';
import { AvailabilityWindow } from '../availability/entities/availability-window.entity';
import { AvailabilityException } from '../availability/entities/availability-exception.entity';
import { RealtimeModule } from '../realtime/realtime.module';
import { AssignmentsService } from './assignments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShiftAssignment,
      Shift,
      User,
      UserLocationCertification,
      AvailabilityWindow,
      AvailabilityException,
    ]),
    RealtimeModule,
  ],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
