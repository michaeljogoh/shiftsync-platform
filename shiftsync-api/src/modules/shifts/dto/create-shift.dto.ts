import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsBoolean,
  MinLength,
} from 'class-validator';

export class CreateShiftDto {
  @ApiProperty()
  @IsUUID()
  locationId!: string;

  @ApiProperty()
  @IsUUID()
  requiredSkillId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiProperty({
    example: '2025-01-10T18:00:00Z',
    description: 'ISO 8601 datetime. With offset (Z or ±HH:MM) parsed as that instant; without offset interpreted as location ianaTimezone.',
  })
  @IsString()
  startAt!: string;

  @ApiProperty({
    example: '2025-01-10T23:00:00Z',
    description: 'ISO 8601 datetime. With offset (Z or ±HH:MM) parsed as that instant; without offset interpreted as location ianaTimezone.',
  })
  @IsString()
  endAt!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  headcountNeeded?: number;

  @ApiPropertyOptional({ default: 48 })
  @IsOptional()
  @IsInt()
  @Min(0)
  editCutoffHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;
}
