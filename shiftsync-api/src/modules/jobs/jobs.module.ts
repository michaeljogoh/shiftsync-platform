import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LocationsModule } from '../locations/locations.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { JobsService } from './jobs.service';

@Module({
  imports: [ScheduleModule.forRoot(), LocationsModule, RealtimeModule],
  providers: [JobsService],
})
export class JobsModule {}
