import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { UserLocationCertification } from './entities/user-location-certification.entity';
import { ShiftAssignment } from '../assignments/entities/shift-assignment.entity';
import { User } from '../users/entities/user.entity';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { LocationAccessGuard } from '../../common/guards/location-access.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Location,
      UserLocationCertification,
      ShiftAssignment,
      User,
    ]),
  ],
  controllers: [LocationsController],
  providers: [LocationsService, LocationAccessGuard],
})
export class LocationsModule {}
