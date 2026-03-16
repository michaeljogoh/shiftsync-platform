import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public, CurrentUser } from '../../common/decorators/auth.decorators';
import type { SessionPayload, SessionUser } from './auth.types';
import {
  LoginDto,
  RefreshDto,
  LogoutDto,
  UpdateNotificationsDto,
  ChangePasswordDto,
} from './dto/LoginDto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and obtain tokens and session' })
  @ApiOkResponse({ description: 'Login successful; returns accessToken, refreshToken, session' })
  @ApiBadRequestResponse({ description: 'Invalid body or validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    session: SessionPayload;
  }> {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiOkResponse({ description: 'Tokens refreshed' })
  @ApiBadRequestResponse({ description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshDto): Promise<{
    accessToken: string;
    refreshToken: string;
    session: SessionPayload;
  }> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiOkResponse({ description: 'Logged out' })
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.authService.revokeRefreshToken(dto.refreshToken);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current session' })
  @ApiOkResponse({ description: 'Current session returned' })
  async me(@CurrentUser() user: SessionUser): Promise<SessionPayload> {
    return this.authService.getSessionForUser(user);
  }

  @Patch('me/notifications')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiOkResponse({ description: 'Preferences updated' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async updateNotifications(
    @CurrentUser() user: SessionUser,
    @Body() dto: UpdateNotificationsDto,
  ): Promise<void> {
    await this.authService.updateNotificationPreferences(
      user.id,
      dto.notifyInApp,
      dto.notifyEmail,
    );
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiOkResponse({ description: 'Password changed' })
  @ApiBadRequestResponse({ description: 'Validation failed or current password wrong' })
  async changePassword(
    @CurrentUser() user: SessionUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
