import {
  Column,
  Entity,
  Index,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { User } from '../../users/entities/user.entity';

export type ShiftAssignmentStatus =
  | 'assigned'
  | 'confirmed'
  | 'swap_pending'
  | 'dropped'
  | 'cancelled';

@Entity('shift_assignments')
@Index(['userId', 'status'])
@Index(['shiftId'])
export class ShiftAssignment extends BaseEntity {
  @Column({ type: 'uuid' })
  shiftId!: string;

  @ManyToOne(() => Shift, (shift) => shift.assignments, {
    onDelete: 'CASCADE',
  })
  shift!: Shift;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.shiftAssignments, {
    onDelete: 'CASCADE',
  })
  user!: User;

  @Column({ type: 'uuid' })
  assignedBy!: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  assignedByUser?: User;

  @Column({
    type: 'enum',
    enum: ['assigned', 'confirmed', 'swap_pending', 'dropped', 'cancelled'],
  })
  status!: ShiftAssignmentStatus;
}

