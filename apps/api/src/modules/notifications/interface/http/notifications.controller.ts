import { Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NOTIFICATION_REPOSITORY, type NotificationRepository } from '../../domain/repositories';
import { TEMPLATES } from '../../domain/templates';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { CurrentUser, Roles } from '../../../identity/interface/http';

@ApiTags('notifications') @ApiBearerAuth() @Controller('me/notifications')
export class NotificationsController {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repo: NotificationRepository) {}
  @Get() @ApiOperation({ summary: 'In-app inbox (newest first); ?unread=true' }) list(@CurrentUser() u: AuthUser, @Query('unread') unread?: string, @Query('limit') limit?: string) { return this.repo.inbox(u.id, { unreadOnly: unread === 'true', limit: limit ? Number(limit) : 50 }); }
  @Get('unread-count') async unread(@CurrentUser() u: AuthUser) { return { unread: await this.repo.unreadCount(u.id) }; }
  @Post(':id/read') @HttpCode(200) async read(@CurrentUser() u: AuthUser, @Param('id') id: string) { return { read: await this.repo.markRead(u.id, id) }; }
  @Post('read-all') @HttpCode(200) async readAll(@CurrentUser() u: AuthUser) { return { read: await this.repo.markAllRead(u.id) }; }
}
@ApiTags('admin/notifications') @ApiBearerAuth() @Controller('admin/notifications') @Roles({ platform: ['ops', 'support', 'super_admin'] })
export class AdminNotificationsController {
  @Get('templates') templates() { return Object.values(TEMPLATES); }
}
