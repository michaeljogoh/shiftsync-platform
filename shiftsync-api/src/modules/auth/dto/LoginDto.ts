import { IsBoolean, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  password!: string;
}
export class RefreshDto {
  @IsNotEmpty()
  refreshToken!: string;
}
export class LogoutDto {
  @IsNotEmpty()
  refreshToken!: string;
}
export class UpdateNotificationsDto {
  @IsBoolean()
  notifyInApp!: boolean;

  @IsBoolean()
  notifyEmail!: boolean;
}
export class ChangePasswordDto {
  @IsNotEmpty()
  currentPassword!: string;

  @IsNotEmpty()
  @MinLength(8)
  newPassword!: string;
}
