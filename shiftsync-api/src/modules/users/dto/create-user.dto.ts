import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @MinLength(8)
  password!: string;

  @ApiProperty({ maxLength: 100 })
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ maxLength: 100 })
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ enum: ['admin', 'manager', 'staff'] })
  @IsEnum(['admin', 'manager', 'staff'])
  role!: 'admin' | 'manager' | 'staff';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(168)
  desiredHoursPerWeek?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyInApp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyEmail?: boolean;
}
