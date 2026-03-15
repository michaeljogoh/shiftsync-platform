import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LocationsService } from '../locations/locations.service';
import { RealtimeService } from '../realtime/realtime.service';
import { RealtimeEvents } from '../realtime/realtime-events';

@Injectable()
export class JobsService {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  @Cron('* * * * *') // every minute
  async emitDutyUpdates(): Promise<void> {
    const locations = await this.locationsService.findAll();
    for (const loc of locations) {
      const onDuty = await this.locationsService.getOnDuty(loc.id);
      this.realtimeService.emitToLocation(loc.id, RealtimeEvents.DUTY_UPDATE, {
        locationId: loc.id,
        onDuty,
        at: new Date().toISOString(),
      });
    }
  }
}
