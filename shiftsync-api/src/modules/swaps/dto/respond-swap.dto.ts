import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AcceptSwapDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetNote?: string;
}

export class DenySwapDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerNote?: string;
}
