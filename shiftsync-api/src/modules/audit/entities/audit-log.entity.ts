import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { User } from '../../users/entities/user.entity';
import { Location } from '../../locations/entities/location.entity';

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['actorId'])
@Index(['createdAt'])
@Index(['locationId'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  actorId: string | null = null;

  @ManyToOne(() => User, (user) => user.auditLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  actor: User | null = null;

  @Column({ type: 'varchar', length: 100 })
  entityType!: string;

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'jsonb', nullable: true })
  beforeState: Record<string, unknown> | null = null;

  @Column({ type: 'jsonb', nullable: true })
  afterState: Record<string, unknown> | null = null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null = null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null = null;

  @Column({ type: 'uuid', nullable: true })
  locationId: string | null = null;

  @ManyToOne(() => Location, (location) => location.auditLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  location: Location | null = null;
}

