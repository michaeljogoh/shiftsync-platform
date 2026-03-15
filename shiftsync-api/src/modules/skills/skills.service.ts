import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Skill } from './entities/skill.entity';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(Skill)
    private readonly skillsRepo: Repository<Skill>,
  ) {}

  async findAll(): Promise<Skill[]> {
    return this.skillsRepo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Skill> {
    const skill = await this.skillsRepo.findOne({ where: { id } });
    if (!skill) throw new NotFoundException('Skill not found');
    return skill;
  }

  async create(dto: CreateSkillDto): Promise<Skill> {
    const existing = await this.skillsRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Skill with this name already exists');
    const skill = this.skillsRepo.create(dto);
    return this.skillsRepo.save(skill);
  }

  async update(id: string, dto: UpdateSkillDto): Promise<Skill> {
    const skill = await this.findById(id);
    if (dto.name && dto.name !== skill.name) {
      const existing = await this.skillsRepo.findOne({ where: { name: dto.name } });
      if (existing) throw new ConflictException('Skill with this name already exists');
    }
    Object.assign(skill, dto);
    return this.skillsRepo.save(skill);
  }

  async remove(id: string): Promise<void> {
    const skill = await this.skillsRepo.findOne({
      where: { id },
      relations: ['shifts'],
    });
    if (!skill) throw new NotFoundException('Skill not found');
    if (skill.shifts?.length) {
      throw new ConflictException('Cannot delete skill: shifts reference it');
    }
    await this.skillsRepo.softRemove(skill);
  }
}
