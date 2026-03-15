import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LocationAccessGuard } from '../../common/guards/location-access.guard';
import { RequirePermission, Roles } from '../../common/decorators/auth.decorators';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overtime')
  @RequirePermission('analytics:view')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Projected overtime for week' })
  async getOvertime(
    @Query('locationId') locationId?: string,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.analyticsService.getOvertime(locationId, weekStart);
  }

  @Get('hours-distribution')
  @RequirePermission('analytics:view')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Hours per staff (cached 5min)' })
  async getHoursDistribution(
    @Query('locationId') locationId: string | undefined,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getHoursDistribution(
      locationId,
      startDate,
      endDate,
    );
  }

  @Get('fairness')
  @RequirePermission('analytics:view')
  @Roles('admin', 'manager')
  @UseGuards(LocationAccessGuard)
  @ApiOperation({ summary: 'Premium shift fairness (cached 5min)' })
  async getFairness(
    @Query('locationId') locationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getFairness(locationId, startDate, endDate);
  }

  @Post('what-if')
  @RequirePermission('analytics:view')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Preview impact of assigning user to shift' })
  async whatIf(@Body() body: { userId: string; shiftId: string }) {
    return this.analyticsService.whatIf(body.userId, body.shiftId);
  }

  @Get('understaffed')
  @RequirePermission('analytics:view')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Shifts with unfilled headcount' })
  async getUnderstaffed(
    @Query('locationId') locationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getUnderstaffed(
      locationId,
      startDate,
      endDate,
    );
  }
}
