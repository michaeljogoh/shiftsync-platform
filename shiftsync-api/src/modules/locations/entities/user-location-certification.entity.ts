import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { User } from '../../users/entities/user.entity';
import { Location } from './location.entity';

@Entity('user_location_certifications')
@Index(['userId', 'locationId'])
export class UserLocationCertification extends BaseEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  locationId!: string;

  @ManyToOne(() => User, (user) => user.locationCertifications, {
    onDelete: 'CASCADE',
  })
  user!: User;

  @ManyToOne(() => Location, (location) => location.certifications, {
    onDelete: 'CASCADE',
  })
  location!: Location;

  @Column({ type: 'timestamp' })
  certifiedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null = null;

  @Column({ type: 'uuid', nullable: true })
  revokedBy: string | null = null;

  @Column({ type: 'text', nullable: true })
  revocationReason: string | null = null;
}

