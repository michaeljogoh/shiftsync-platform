import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

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

export class UpdateSelfUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

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
