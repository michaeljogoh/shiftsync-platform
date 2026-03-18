import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { AssignmentsService } from '../assignments/assignments.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CreateAssignmentDto } from '../assignments/dto/create-assignment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LocationAccessGuard } from '../../common/guards/location-access.guard';
import {
  RequirePermission,
  Roles,
  CurrentUser,
} from '../../common/decorators/auth.decorators';
import type { SessionUser } from '../auth/auth.types';
import { Auditable } from '../../common/decorators/auditable.decorator';

@ApiTags('Shifts')
@ApiBearerAuth()
@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ShiftsController {
  constructor(
    private readonly shiftsService: ShiftsService,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  @Get()
  @RequirePermission('shifts:view')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List shifts with filters' })
  async findAll(
    @CurrentUser() user: SessionUser,
    @Query('locationId') locationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: 'draft' | 'published' | 'cancelled',
  ) {
    return this.shiftsService.findAll(
      { locationId, startDate, endDate, status },
      user,
    );
  }

  @Post()
  @RequirePermission('shifts:create')
  @Roles('admin', 'manager')
  @UseGuards(LocationAccessGuard)
  @Auditable('shift')
  @ApiOperation({ summary: 'Create shift' })
  @ApiCreatedResponse({ description: 'Shift created' })
  @ApiBadRequestResponse({ description: 'Validation failed or invalid dates' })
  @ApiForbiddenResponse({ description: 'No access to location' })
  async create(@CurrentUser() user: SessionUser, @Body() dto: CreateShiftDto) {
    return this.shiftsService.create(dto, user.id);
  }

  @Get(':id')
  @RequirePermission('shifts:view')
  @ApiOperation({ summary: 'Get shift by ID' })
  async findOne(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.shiftsService.findByIdForView(user, id);
  }

  @Patch(':id')
  @RequirePermission('shifts:update')
  @Roles('admin', 'manager')
  @Auditable('shift')
  @ApiOperation({ summary: 'Update shift' })
  @ApiNotFoundResponse({ description: 'Shift not found' })
  @ApiConflictResponse({ description: 'Within edit cutoff for published shift' })
  async update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.shiftsService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('shifts:delete')
  @Roles('admin', 'manager')
  @Auditable('shift')
  @ApiOperation({ summary: 'Delete shift (draft only)' })
  async remove(@Param('id') id: string) {
    await this.shiftsService.remove(id);
  }

  @Post(':id/publish')
  @RequirePermission('shifts:publish')
  @Roles('admin', 'manager')
  @Auditable('shift')
  @ApiOperation({ summary: 'Publish shift' })
  async publish(@Param('id') id: string) {
    return this.shiftsService.publish(id);
  }

  @Post(':id/unpublish')
  @RequirePermission('shifts:publish')
  @Roles('admin', 'manager')
  @Auditable('shift')
  @ApiOperation({ summary: 'Unpublish shift' })
  async unpublish(@Param('id') id: string) {
    return this.shiftsService.unpublish(id);
  }

  @Get(':id/assignments')
  @RequirePermission('assignments:view')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get shift assignments' })
  async getAssignments(@Param('id') id: string) {
    return this.shiftsService.getAssignments(id);
  }

  @Post(':id/assignments')
  @RequirePermission('assignments:create')
  @Roles('admin', 'manager')
  @Auditable('assignment')
  @ApiOperation({ summary: 'Create assignment' })
  async createAssignment(
    @CurrentUser() user: SessionUser,
    @Param('id') shiftId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentsService.create(shiftId, dto, user.id);
  }

  @Delete(':id/assignments/:assignId')
  @RequirePermission('assignments:delete')
  @Roles('admin', 'manager')
  @Auditable('assignment')
  @ApiOperation({ summary: 'Remove assignment' })
  async deleteAssignment(
    @Param('id') shiftId: string,
    @Param('assignId') assignId: string,
  ) {
    await this.assignmentsService.remove(shiftId, assignId);
  }

  @Get(':id/history')
  @RequirePermission('assignments:view')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Audit trail for shift' })
  async getHistory(@Param('id') id: string) {
    return this.shiftsService.getHistory(id);
  }
}
