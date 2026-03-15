import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SwapsService } from './swaps.service';
import { CreateSwapDto } from './dto/create-swap.dto';
import { AcceptSwapDto, DenySwapDto } from './dto/respond-swap.dto';
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

@ApiTags('Swaps')
@ApiBearerAuth()
@Controller('swaps')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SwapsController {
  constructor(private readonly swapsService: SwapsService) {}

  @Post()
  @RequirePermission('swaps:create')
  @ApiOperation({ summary: 'Create swap or drop request' })
  async create(@CurrentUser() user: SessionUser, @Body() dto: CreateSwapDto) {
    return this.swapsService.create(dto, user.id);
  }

  @Get()
  @RequirePermission('swaps:view')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'List swap requests (Admin/Manager)' })
  async findAll(
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
  ) {
    return this.swapsService.findAll({ locationId, status });
  }

  @Get(':id')
  @RequirePermission('swaps:view')
  @ApiOperation({ summary: 'Get swap request' })
  async findOne(@Param('id') id: string) {
    return this.swapsService.findById(id);
  }

  @Patch(':id/accept')
  @RequirePermission('swaps:view')
  @ApiOperation({ summary: 'Accept swap (target staff)' })
  async accept(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: AcceptSwapDto,
  ) {
    return this.swapsService.accept(id, user.id, dto.targetNote);
  }

  @Patch(':id/reject')
  @RequirePermission('swaps:view')
  @ApiOperation({ summary: 'Reject swap (target staff)' })
  async reject(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.swapsService.reject(id, user.id);
  }

  @Patch(':id/cancel')
  @RequirePermission('swaps:view')
  @ApiOperation({ summary: 'Cancel (initiator)' })
  async cancel(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.swapsService.cancel(id, user.id);
  }

  @Patch(':id/approve')
  @RequirePermission('swaps:approve')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Approve (manager)' })
  async approve(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.swapsService.approve(id, user.id);
  }

  @Patch(':id/deny')
  @RequirePermission('swaps:deny')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Deny (manager)' })
  async deny(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: DenySwapDto,
  ) {
    return this.swapsService.deny(id, user.id, dto.managerNote);
  }
}
