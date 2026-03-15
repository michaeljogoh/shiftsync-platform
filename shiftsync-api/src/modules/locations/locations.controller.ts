import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LocationAccessGuard } from '../../common/guards/location-access.guard';
import { Roles, RequirePermission } from '../../common/decorators/auth.decorators';

@ApiTags('Locations')
@ApiBearerAuth()
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  @RequirePermission('locations:view')
  @ApiOperation({ summary: 'List all locations' })
  async findAll() {
    return this.locationsService.findAll();
  }

  @Post()
  @RequirePermission('locations:create')
  @Roles('admin')
  @ApiOperation({ summary: 'Create location (Admin)' })
  async create(@Body() dto: CreateLocationDto) {
    return this.locationsService.create(dto);
  }

  @Get(':id')
  @RequirePermission('locations:view')
  @ApiOperation({ summary: 'Get location by ID' })
  async findOne(@Param('id') id: string) {
    return this.locationsService.findById(id);
  }

  @Patch(':id')
  @RequirePermission('locations:update')
  @Roles('admin')
  @ApiOperation({ summary: 'Update location (Admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locationsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('locations:delete')
  @Roles('admin')
  @ApiOperation({ summary: 'Soft delete location (Admin)' })
  async remove(@Param('id') id: string) {
    await this.locationsService.remove(id);
  }

  @Post(':id/managers')
  @RequirePermission('locations:update')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign manager to location (Admin)' })
  async addManager(
    @Param('id') id: string,
    @Body('managerId') managerId: string,
  ) {
    await this.locationsService.addManager(id, managerId);
  }

  @Delete(':id/managers/:uid')
  @RequirePermission('locations:update')
  @Roles('admin')
  @ApiOperation({ summary: 'Remove manager from location (Admin)' })
  async removeManager(@Param('id') id: string, @Param('uid') uid: string) {
    await this.locationsService.removeManager(id, uid);
  }

  @Get(':id/staff')
  @RequirePermission('locations:view')
  @UseGuards(LocationAccessGuard)
  @ApiOperation({ summary: 'List certified staff at location' })
  async getStaff(@Param('id') id: string) {
    return this.locationsService.getCertifiedStaff(id);
  }

  @Get(':id/on-duty')
  @RequirePermission('locations:view')
  @UseGuards(LocationAccessGuard)
  @ApiOperation({ summary: 'Who is currently on shift at location' })
  async getOnDuty(@Param('id') id: string) {
    return this.locationsService.getOnDuty(id);
  }
}
