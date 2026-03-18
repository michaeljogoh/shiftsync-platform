import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AvailabilityService } from '../availability/availability.service';
import { AssignmentsService } from '../assignments/assignments.service';
import { SwapsService } from '../swaps/swaps.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateSelfUserDto } from './dto/update-user.dto';
import { RevokeCertificationDto } from './dto/revoke-certification.dto';
import { AddCertificationDto } from './dto/add-certification.dto';
import { CreateAvailabilityWindowDto } from '../availability/dto/create-availability-window.dto';
import { UpdateAvailabilityWindowDto } from '../availability/dto/update-availability-window.dto';
import { CreateAvailabilityExceptionDto } from '../availability/dto/create-availability-exception.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles, RequirePermission, CurrentUser } from '../../common/decorators/auth.decorators';
import { Auditable } from '../../common/decorators/auditable.decorator';
import type { SessionUser } from '../auth/auth.types';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly availabilityService: AvailabilityService,
    private readonly assignmentsService: AssignmentsService,
    private readonly swapsService: SwapsService,
  ) {}

  @Get()
  @RequirePermission('users:view')
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (Admin)' })
  async findAll(
    @Query('role') role?: 'admin' | 'manager' | 'staff',
    @Query('locationId') locationId?: string,
    @Query('skillId') skillId?: string,
  ) {
    return this.usersService.findAll({ role, locationId, skillId });
  }

  @Post()
  @RequirePermission('users:create')
  @Roles('admin')
  @Auditable('user')
  @ApiOperation({ summary: 'Create user (Admin)' })
  @ApiCreatedResponse({ description: 'User created' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Admin only' })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @RequirePermission('users:view')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findOne(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.usersService.findByIdForView(user, id);
  }

  @Patch(':id')
  @Auditable('user')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto | UpdateSelfUserDto,
  ) {
    const isAdmin = user.role === 'admin';
    return this.usersService.update(id, dto as UpdateUserDto, user);
  }

  @Delete(':id')
  @RequirePermission('users:delete')
  @Roles('admin')
  @Auditable('user')
  @ApiOperation({ summary: 'Soft delete user (Admin)' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }

  @Post(':id/skills')
  @RequirePermission('users:update')
  @Roles('admin')
  @Auditable('user')
  @ApiOperation({ summary: 'Add skill to user (Admin)' })
  async addSkill(@Param('id') id: string, @Body('skillId') skillId: string) {
    await this.usersService.addSkill(id, skillId);
  }

  @Delete(':id/skills/:skillId')
  @RequirePermission('users:update')
  @Roles('admin')
  @Auditable('user')
  @ApiOperation({ summary: 'Remove skill from user (Admin)' })
  async removeSkill(@Param('id') id: string, @Param('skillId') skillId: string) {
    await this.usersService.removeSkill(id, skillId);
  }

  @Post(':id/certifications')
  @RequirePermission('users:update')
  @Roles('admin')
  @Auditable('user')
  @ApiOperation({ summary: 'Certify user for location (Admin)' })
  async addCertification(
    @Param('id') id: string,
    @Body() dto: AddCertificationDto,
  ) {
    return this.usersService.certifyForLocation(id, dto.locationId);
  }

  @Delete(':id/certifications/:locationId')
  @RequirePermission('users:update')
  @Roles('admin')
  @Auditable('user')
  @ApiOperation({ summary: 'Revoke certification (Admin)' })
  async revokeCertification(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @Body() dto: RevokeCertificationDto,
  ) {
    await this.usersService.revokeCertification(id, locationId, user.id, dto.reason);
  }

  @Get(':id/swaps')
  @RequirePermission('swaps:view')
  @ApiOperation({ summary: 'Get user swap requests' })
  async getSwaps(@Param('id') id: string) {
    return this.swapsService.findByUser(id);
  }

  @Get(':id/assignments')
  @RequirePermission('assignments:view')
  @ApiOperation({ summary: 'Get user assignments' })
  async getAssignments(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.assignmentsService.findByUser(id, startDate, endDate);
  }

  @Get(':id/availability')
  @RequirePermission('availability:view')
  @ApiOperation({ summary: 'Get user availability' })
  async getAvailability(@Param('id') id: string) {
    return this.availabilityService.getAvailability(id);
  }

  @Post(':id/availability/windows')
  @RequirePermission('availability:update')
  @ApiOperation({ summary: 'Create availability window' })
  async createAvailabilityWindow(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: CreateAvailabilityWindowDto,
  ) {
    if (user.role !== 'admin' && user.id !== id) {
      throw new ForbiddenException('Can only edit own availability');
    }
    return this.availabilityService.createWindow(id, dto);
  }

  @Patch(':id/availability/windows/:wid')
  @RequirePermission('availability:update')
  @ApiOperation({ summary: 'Update availability window' })
  async updateAvailabilityWindow(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('wid') wid: string,
    @Body() dto: UpdateAvailabilityWindowDto,
  ) {
    if (user.role !== 'admin' && user.id !== id) {
      throw new ForbiddenException('Can only edit own availability');
    }
    return this.availabilityService.updateWindow(id, wid, dto);
  }

  @Delete(':id/availability/windows/:wid')
  @RequirePermission('availability:update')
  @ApiOperation({ summary: 'Delete availability window' })
  async deleteAvailabilityWindow(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('wid') wid: string,
  ) {
    if (user.role !== 'admin' && user.id !== id) {
      throw new ForbiddenException('Can only edit own availability');
    }
    await this.availabilityService.deleteWindow(id, wid);
  }

  @Post(':id/availability/exceptions')
  @RequirePermission('availability:update')
  @ApiOperation({ summary: 'Create availability exception' })
  async createAvailabilityException(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: CreateAvailabilityExceptionDto,
  ) {
    if (user.role !== 'admin' && user.id !== id) {
      throw new ForbiddenException('Can only edit own availability');
    }
    return this.availabilityService.createException(id, dto);
  }

  @Delete(':id/availability/exceptions/:eid')
  @RequirePermission('availability:update')
  @ApiOperation({ summary: 'Delete availability exception' })
  async deleteAvailabilityException(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('eid') eid: string,
  ) {
    if (user.role !== 'admin' && user.id !== id) {
      throw new ForbiddenException('Can only edit own availability');
    }
    await this.availabilityService.deleteException(id, eid);
  }
}
