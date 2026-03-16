import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AcceptSwapDto {
  @ApiPropertyOptional({ description: 'Optional note from target when accepting' })
  @IsOptional()
  @IsString()
  targetNote?: string;
}

export class DenySwapDto {
  @ApiPropertyOptional({ description: 'Manager reason when denying' })
  @IsOptional()
  @IsString()
  managerNote?: string;
}
