import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ description: 'Required for 7th consecutive day override' })
  @IsOptional()
  @IsBoolean()
  override?: boolean;

  @ApiPropertyOptional({ minLength: 20, description: 'Required when override is true' })
  @IsOptional()
  @IsString()
  @MinLength(20, { message: 'Override reason must be at least 20 characters' })
  overrideReason?: string;
}
