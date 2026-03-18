import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsDateString, IsOptional } from 'class-validator';

export class UpdateAvailabilityWindowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}
