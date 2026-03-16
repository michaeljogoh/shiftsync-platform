import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@coastaleats.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin1234!', minLength: 1 })
  @IsNotEmpty()
  password!: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token from login' })
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiProperty({ description: 'Refresh token to revoke' })
  @IsNotEmpty()
  refreshToken!: string;
}

export class UpdateNotificationsDto {
  @ApiProperty()
  @IsBoolean()
  notifyInApp!: boolean;

  @ApiProperty()
  @IsBoolean()
  notifyEmail!: boolean;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ minLength: 8 })
  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}
