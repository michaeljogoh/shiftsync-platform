import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { UserLocationCertification } from './entities/user-location-certification.entity';
import { ShiftAssignment } from '../assignments/entities/shift-assignment.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import type { SessionUser } from '../auth/auth.types';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private readonly locationsRepo: Repository<Location>,
    @InjectRepository(UserLocationCertification)
    private readonly certsRepo: Repository<UserLocationCertification>,
    @InjectRepository(ShiftAssignment)
    private readonly assignmentsRepo: Repository<ShiftAssignment>,
  ) {}

  async findAll(user?: SessionUser): Promise<Location[]> {
    if (user?.role === 'manager') {
      return this.locationsRepo
        .createQueryBuilder('l')
        .innerJoin('l.managers', 'm', 'm.id = :managerId', {
          managerId: user.id,
        })
        .orderBy('l.name', 'ASC')
        .getMany();
    }
    return this.locationsRepo.find({ where: {}, order: { name: 'ASC' } });
  }

  async findById(id: string, relations: string[] = []): Promise<Location> {
    const loc = await this.locationsRepo.findOne({
      where: { id },
      relations,
    });
    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }

  async create(dto: CreateLocationDto): Promise<Location> {
    const loc = this.locationsRepo.create({
      name: dto.name,
      address: dto.address ?? null,
      ianaTimezone: dto.ianaTimezone,
      isActive: dto.isActive ?? true,
    });
    return this.locationsRepo.save(loc);
  }

  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const loc = await this.findById(id);
    Object.assign(loc, dto);
    return this.locationsRepo.save(loc);
  }

  async remove(id: string): Promise<void> {
    const loc = await this.findById(id);
    await this.locationsRepo.softRemove(loc);
  }

  async addManager(locationId: string, managerId: string): Promise<void> {
    const loc = await this.findById(locationId, ['managers']);
    const hasManager = loc.managers?.some((m) => m.id === managerId);
    if (hasManager) return;
    await this.locationsRepo
      .createQueryBuilder()
      .relation(Location, 'managers')
      .of(locationId)
      .add(managerId);
  }

  async removeManager(locationId: string, managerId: string): Promise<void> {
    await this.locationsRepo
      .createQueryBuilder()
      .relation(Location, 'managers')
      .of(locationId)
      .remove(managerId);
  }

  async getManagers(locationId: string): Promise<import('../users/entities/user.entity').User[]> {
    const loc = await this.findById(locationId, ['managers']);
    return loc.managers ?? [];
  }

  async getCertifiedStaff(locationId: string): Promise<UserLocationCertification[]> {
    return this.certsRepo.find({
      where: { locationId, revokedAt: null as unknown as Date },
      relations: ['user'],
    });
  }

  async getOnDuty(locationId: string): Promise<{ userId: string; shiftId: string }[]> {
    const now = new Date();
    const assignments = await this.assignmentsRepo
      .createQueryBuilder('a')
      .innerJoin('a.shift', 'shift')
      .where('shift.locationId = :locationId', { locationId })
      .andWhere('shift.startAt <= :now', { now })
      .andWhere('shift.endAt >= :now', { now })
      .andWhere('shift.status = :status', { status: 'published' })
      .andWhere('a.status NOT IN (:...statuses)', {
        statuses: ['cancelled', 'dropped'],
      })
      .getMany();
    return assignments.map((a) => ({ userId: a.userId, shiftId: a.shiftId }));
  }
}
