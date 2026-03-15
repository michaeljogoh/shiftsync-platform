import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class UpdateShiftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requiredSkillId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  headcountNeeded?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  editCutoffHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'cancelled'] })
  @IsOptional()
  @IsIn(['draft', 'published', 'cancelled'])
  status?: 'draft' | 'published' | 'cancelled';
}
