import {
  Column,
  Entity,
  ManyToOne,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { User } from '../../users/entities/user.entity';
import { ShiftAssignment } from '../../assignments/entities/shift-assignment.entity';

export type SwapRequestType = 'swap' | 'drop';
export type SwapRequestStatus =
  | 'pending_target'
  | 'pending_manager'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired';

@Entity('swap_requests')
@Index(['initiatorId'])
@Index(['targetUserId'])
export class SwapRequest extends BaseEntity {
  @Column({ type: 'uuid' })
  initiatorId!: string;

  @ManyToOne(() => User, (user) => user.initiatedSwaps, {
    onDelete: 'CASCADE',
  })
  initiator!: User;

  @Column({ type: 'uuid', nullable: true })
  targetUserId: string | null = null;

  @ManyToOne(() => User, (user) => user.targetedSwaps, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  targetUser: User | null = null;

  @Column({ type: 'uuid' })
  initiatorAssignmentId!: string;

  @ManyToOne(
    () => ShiftAssignment,
    (assignment) => assignment.id,
    { onDelete: 'CASCADE' },
  )
  initiatorAssignment!: ShiftAssignment;

  @Column({ type: 'uuid', nullable: true })
  targetAssignmentId: string | null = null;

  @ManyToOne(
    () => ShiftAssignment,
    (assignment) => assignment.id,
    { onDelete: 'CASCADE', nullable: true },
  )
  targetAssignment: ShiftAssignment | null = null;

  @Column({ type: 'enum', enum: ['swap', 'drop'] })
  type!: SwapRequestType;

  @Column({
    type: 'enum',
    enum: [
      'pending_target',
      'pending_manager',
      'approved',
      'rejected',
      'cancelled',
      'expired',
    ],
  })
  status!: SwapRequestStatus;

  @Column({ type: 'text', nullable: true })
  initiatorNote: string | null = null;

  @Column({ type: 'text', nullable: true })
  targetNote: string | null = null;

  @Column({ type: 'text', nullable: true })
  managerNote: string | null = null;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string | null = null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null = null;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;
}

