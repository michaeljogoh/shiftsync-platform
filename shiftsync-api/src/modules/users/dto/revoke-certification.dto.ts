import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class RevokeCertificationDto {
  @ApiProperty({ minLength: 1 })
  @IsNotEmpty()
  @MinLength(1, { message: 'Revocation reason is required' })
  reason!: string;
}
