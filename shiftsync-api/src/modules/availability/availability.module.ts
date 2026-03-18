import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityWindow } from './entities/availability-window.entity';
import { AvailabilityException } from './entities/availability-exception.entity';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AvailabilityWindow, AvailabilityException]),
  ],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
