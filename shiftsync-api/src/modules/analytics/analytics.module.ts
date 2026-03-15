import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from '../shifts/entities/shift.entity';
import { ShiftAssignment } from '../assignments/entities/shift-assignment.entity';
import { User } from '../users/entities/user.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { LocationAccessGuard } from '../../common/guards/location-access.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, ShiftAssignment, User]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, LocationAccessGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
