import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission, CurrentUser } from '../../common/decorators/auth.decorators';
import type { SessionUser } from '../auth/auth.types';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermission('notifications:view')
  @ApiOperation({ summary: 'List own notifications (paginated)' })
  async findAll(
    @CurrentUser() user: SessionUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findByUser(user.id, {
      limit: limit ? parseInt(limit, 10) : 25,
      offset: offset ? parseInt(offset, 10) : 0,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  @RequirePermission('notifications:view')
  @ApiOperation({ summary: 'Get unread count' })
  async getUnreadCount(@CurrentUser() user: SessionUser) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Patch(':id/read')
  @RequirePermission('notifications:update')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ) {
    await this.notificationsService.markRead(id, user.id);
  }

  @Patch('read-all')
  @RequirePermission('notifications:update')
  @ApiOperation({ summary: 'Mark all as read' })
  async markAllRead(@CurrentUser() user: SessionUser) {
    await this.notificationsService.markAllRead(user.id);
  }

  @Delete(':id')
  @RequirePermission('notifications:update')
  @ApiOperation({ summary: 'Delete notification' })
  async remove(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
  ) {
    await this.notificationsService.remove(id, user.id);
  }
}
