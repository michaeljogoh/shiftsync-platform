import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { LocationAccessGuard } from '../../common/guards/location-access.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User])],
  controllers: [AuditController],
  providers: [AuditService, LocationAccessGuard],
  exports: [AuditService],
})
export class AuditModule {}
