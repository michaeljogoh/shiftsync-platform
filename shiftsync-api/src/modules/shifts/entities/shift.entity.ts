import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { Location } from '../../locations/entities/location.entity';
import { Skill } from '../../skills/entities/skill.entity';
import { ShiftAssignment } from '../../assignments/entities/shift-assignment.entity';

export type ShiftStatus = 'draft' | 'published' | 'cancelled';

@Entity('shifts')
@Index(['locationId', 'startAt', 'status'])
@Index(['startAt', 'endAt'])
export class Shift extends BaseEntity {
  @Column({ type: 'uuid' })
  locationId!: string;

  @ManyToOne(() => Location, (location) => location.shifts, {
    onDelete: 'CASCADE',
  })
  location!: Location;

  @Column({ type: 'uuid' })
  requiredSkillId!: string;

  @ManyToOne(() => Skill, (skill) => skill.shifts, {
    onDelete: 'RESTRICT',
  })
  requiredSkill!: Skill;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null = null;

  @Column({ type: 'timestamptz' })
  startAt!: Date;

  @Column({ type: 'timestamptz' })
  endAt!: Date;

  @Column({ type: 'smallint', default: 1 })
  headcountNeeded!: number;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'cancelled'],
    default: 'draft',
  })
  status!: ShiftStatus;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null = null;

  @Column({ type: 'smallint', default: 48 })
  editCutoffHours!: number;

  @Column({ type: 'boolean', default: false })
  isPremium!: boolean;

  @OneToMany(
    () => ShiftAssignment,
    (assignment) => assignment.shift,
  )
  assignments!: ShiftAssignment[];
}

