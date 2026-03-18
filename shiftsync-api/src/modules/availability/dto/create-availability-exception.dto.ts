import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional } from 'class-validator';

export class CreateAvailabilityExceptionDto {
  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  exceptionDate!: string;

  @ApiProperty()
  @IsBoolean()
  isAvailable!: boolean;

  @ApiPropertyOptional({ example: '09:00', description: 'Required when isAvailable is true' })
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  reason?: string;
}
