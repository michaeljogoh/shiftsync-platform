import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddCertificationDto {
  @ApiProperty()
  @IsUUID()
  locationId!: string;
}
