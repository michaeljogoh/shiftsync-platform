import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserLocationCertification } from '../locations/entities/user-location-certification.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MailModule } from '../mail/mail.module';
import { AvailabilityModule } from '../availability/availability.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { SwapsModule } from '../swaps/swaps.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserLocationCertification]),
    MailModule,
    AvailabilityModule,
    AssignmentsModule,
    SwapsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
