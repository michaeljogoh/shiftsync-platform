import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('availability_windows')
@Index(['userId', 'dayOfWeek'])
export class AvailabilityWindow extends BaseEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.availabilityWindows, {
    onDelete: 'CASCADE',
  })
  user!: User;

  @Column({ type: 'smallint' })
  dayOfWeek!: number; // 0-6

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @Column({ type: 'date' })
  effectiveFrom!: string;

  @Column({ type: 'date', nullable: true })
  effectiveUntil: string | null = null;
}

