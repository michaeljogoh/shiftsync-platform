import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSwapDto {
  @ApiProperty({ enum: ['swap', 'drop'] })
  @IsEnum(['swap', 'drop'])
  type!: 'swap' | 'drop';

  @ApiProperty()
  @IsUUID()
  initiatorAssignmentId!: string;

  @ApiPropertyOptional({ description: 'Required for swap type' })
  @IsOptional()
  @IsUUID()
  targetAssignmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  initiatorNote?: string;
}
