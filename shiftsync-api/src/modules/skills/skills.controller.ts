import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission, Roles } from '../../common/decorators/auth.decorators';

@ApiTags('Skills')
@ApiBearerAuth()
@Controller('skills')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @RequirePermission('skills:view')
  @ApiOperation({ summary: 'List all skills' })
  async findAll() {
    return this.skillsService.findAll();
  }

  @Post()
  @RequirePermission('skills:create')
  @Roles('admin')
  @ApiOperation({ summary: 'Create skill (Admin)' })
  async create(@Body() dto: CreateSkillDto) {
    return this.skillsService.create(dto);
  }

  @Get(':id')
  @RequirePermission('skills:view')
  @ApiOperation({ summary: 'Get skill by ID' })
  async findOne(@Param('id') id: string) {
    return this.skillsService.findById(id);
  }

  @Patch(':id')
  @RequirePermission('skills:update')
  @Roles('admin')
  @ApiOperation({ summary: 'Update skill (Admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateSkillDto) {
    return this.skillsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('skills:delete')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete skill (Admin)' })
  async remove(@Param('id') id: string) {
    await this.skillsService.remove(id);
  }
}
