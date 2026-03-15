import { Column, Entity, Index, ManyToMany, OneToMany } from 'typeorm';
import { BaseEntity } from '../../database/base.entity';
import { User } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';

@Entity('skills')
export class Skill extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description: string | null = null;

  @ManyToMany(() => User, (user) => user.skills)
  users!: User[];

  @OneToMany(
    () => Shift,
    (shift) => shift.requiredSkill,
  )
  shifts!: Shift[];
}

