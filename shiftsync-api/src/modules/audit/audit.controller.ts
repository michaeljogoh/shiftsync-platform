import {
  Get,
  Param,
  Query,
  Controller,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import * as express from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LocationAccessGuard } from '../../common/guards/location-access.guard';
import { RequirePermission, Roles } from '../../common/decorators/auth.decorators';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @RequirePermission('audit:view')
  @Roles('admin')
  @ApiOperation({ summary: 'List audit logs (Admin)' })
  async getLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('actorId') actorId?: string,
    @Query('locationId') locationId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.findAll({
      entityType,
      entityId,
      actorId,
      locationId,
      limit: limit ? parseInt(limit, 10) : 25,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('logs/export')
  @RequirePermission('audit:export')
  @Roles('admin')
  @ApiOperation({ summary: 'Export audit logs as CSV (Admin)' })
  async exportLogs(
    @Res() res: express.Response,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('actorId') actorId?: string,
    @Query('locationId') locationId?: string,
  ) {
    const csv = await this.auditService.exportCsv({
      entityType,
      entityId,
      actorId,
      locationId,
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.send(csv);
  }

  @Get('locations/:locationId/logs')
  @RequirePermission('audit:view')
  @Roles('admin', 'manager')
  @UseGuards(LocationAccessGuard)
  @ApiOperation({ summary: 'Location-scoped audit logs' })
  async getLocationLogs(
    @Param('locationId') locationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.findByLocation(
      locationId,
      limit ? parseInt(limit, 10) : 25,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('shifts/:shiftId/logs')
  @RequirePermission('audit:view')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Audit logs for a shift' })
  async getShiftLogs(@Param('shiftId') shiftId: string) {
    return this.auditService.findByShift(shiftId);
  }
}
