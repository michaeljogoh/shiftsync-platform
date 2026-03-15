import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LocationsModule } from './modules/locations/locations.module';
import { SkillsModule } from './modules/skills/skills.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { SwapsModule } from './modules/swaps/swaps.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { MailModule } from './modules/mail/mail.module';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './modules/database/database.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    LocationsModule,
    SkillsModule,
    AvailabilityModule,
    ShiftsModule,
    AssignmentsModule,
    SwapsModule,
    NotificationsModule,
    AuditModule,
    AnalyticsModule,
    RealtimeModule,
    JobsModule,
    MailModule,
    CommonModule,
    ConfigModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
