import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('availability_exceptions')
export class AvailabilityException extends BaseEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.availabilityExceptions, {
    onDelete: 'CASCADE',
  })
  user!: User;

  @Column({ type: 'date' })
  exceptionDate!: string;

  @Column({ type: 'boolean' })
  isAvailable!: boolean;

  @Column({ type: 'time', nullable: true })
  startTime: string | null = null;

  @Column({ type: 'time', nullable: true })
  endTime: string | null = null;

  @Column({ type: 'text', nullable: true })
  reason: string | null = null;
}

