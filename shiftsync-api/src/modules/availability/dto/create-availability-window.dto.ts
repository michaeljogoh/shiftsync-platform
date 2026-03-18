import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateAvailabilityWindowDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0=Sunday, 6=Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00', description: 'HH:mm in location timezone' })
  @IsString()
  startTime!: string;

  @ApiProperty({ example: '17:00', description: 'HH:mm in location timezone' })
  @IsString()
  endTime!: string;

  @ApiProperty({ example: '2025-01-01' })
  @IsDateString()
  effectiveFrom!: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}
