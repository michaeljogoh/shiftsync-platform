import {
  Column,
  Entity,
  Index,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { Location } from '../../locations/entities/location.entity';
import { Skill } from '../../skills/entities/skill.entity';
import { UserLocationCertification } from '../../locations/entities/user-location-certification.entity';
import { AvailabilityWindow } from '../../availability/entities/availability-window.entity';
import { AvailabilityException } from '../../availability/entities/availability-exception.entity';
import { ShiftAssignment } from '../../assignments/entities/shift-assignment.entity';
import { SwapRequest } from '../../swaps/entities/swap-request.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';

export type UserRole = 'admin' | 'manager' | 'staff';

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null = null;

  @Column({ type: 'enum', enum: ['admin', 'manager', 'staff'] })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  desiredHoursPerWeek: string | null = null;

  @Column({ type: 'boolean', default: true })
  notifyInApp!: boolean;

  @Column({ type: 'boolean', default: false })
  notifyEmail!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null = null;

  @ManyToMany(() => Skill, (skill) => skill.users, { cascade: false })
  @JoinTable({
    name: 'user_skills',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'skillId', referencedColumnName: 'id' },
  })
  skills!: Skill[];

  @OneToMany(
    () => UserLocationCertification,
    (cert) => cert.user,
  )
  locationCertifications!: UserLocationCertification[];

  @ManyToMany(() => Location, (location) => location.managers)
  managedLocations!: Location[];

  @OneToMany(
    () => AvailabilityWindow,
    (window) => window.user,
  )
  availabilityWindows!: AvailabilityWindow[];

  @OneToMany(
    () => AvailabilityException,
    (exception) => exception.user,
  )
  availabilityExceptions!: AvailabilityException[];

  @OneToMany(
    () => ShiftAssignment,
    (assignment) => assignment.user,
  )
  shiftAssignments!: ShiftAssignment[];

  @OneToMany(
    () => SwapRequest,
    (swap) => swap.initiator,
  )
  initiatedSwaps!: SwapRequest[];

  @OneToMany(
    () => SwapRequest,
    (swap) => swap.targetUser,
  )
  targetedSwaps!: SwapRequest[];

  @OneToMany(
    () => Notification,
    (notification) => notification.user,
  )
  notifications!: Notification[];

  @OneToMany(
    () => AuditLog,
    (log) => log.actor,
  )
  auditLogs!: AuditLog[];

  @OneToMany(
    () => RefreshToken,
    (token) => token.user,
  )
  refreshTokens!: RefreshToken[];
}

