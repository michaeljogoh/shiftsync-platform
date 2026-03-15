import {
  Column,
  Entity,
  Index,
  ManyToMany,
  OneToMany,
  JoinTable,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { User } from '../../users/entities/user.entity';
import { UserLocationCertification } from './user-location-certification.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';

@Entity('locations')
export class Location extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  address: string | null = null;

  @Column({ type: 'varchar', length: 100 })
  ianaTimezone!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(
    () => UserLocationCertification,
    (cert) => cert.location,
  )
  certifications!: UserLocationCertification[];

  @ManyToMany(() => User, (user) => user.managedLocations)
  @JoinTable({
    name: 'manager_location_assignments',
    joinColumn: { name: 'locationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'managerId', referencedColumnName: 'id' },
  })
  managers!: User[];

  @OneToMany(
    () => Shift,
    (shift) => shift.location,
  )
  shifts!: Shift[];

  @OneToMany(
    () => AuditLog,
    (log) => log.location,
  )
  auditLogs!: AuditLog[];
}

