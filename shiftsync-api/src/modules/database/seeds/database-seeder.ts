import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { addDays, addHours, startOfWeek, format } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { Location } from '../../locations/entities/location.entity';
import { Skill } from '../../skills/entities/skill.entity';
import { User } from '../../users/entities/user.entity';
import { UserLocationCertification } from '../../locations/entities/user-location-certification.entity';
import { AvailabilityWindow } from '../../availability/entities/availability-window.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { ShiftAssignment } from '../../assignments/entities/shift-assignment.entity';
import { SwapRequest } from '../../swaps/entities/swap-request.entity';

const ADMIN_EMAIL = 'admin@coastaleats.com';
const ADMIN_PASSWORD = 'Admin1234!';
const LOCATION_NAMES = [
  { name: 'Coastal Eats Downtown', ianaTimezone: 'America/New_York' },
  { name: 'Coastal Eats Midtown', ianaTimezone: 'America/New_York' },
  { name: 'Coastal Eats West', ianaTimezone: 'America/Los_Angeles' },
  { name: 'Coastal Eats Pacific', ianaTimezone: 'America/Los_Angeles' },
];
const SKILL_NAMES = ['bartender', 'line_cook', 'server', 'host', 'barback', 'supervisor'];

function localToUtc(dateStr: string, ianaTimezone: string): Date {
  return toDate(dateStr, { timeZone: ianaTimezone });
}

export async function runSeed(ds: DataSource): Promise<void> {
  const locRepo = ds.getRepository(Location);
  const skillRepo = ds.getRepository(Skill);
  const userRepo = ds.getRepository(User);
  const certRepo = ds.getRepository(UserLocationCertification);
  const availRepo = ds.getRepository(AvailabilityWindow);
  const shiftRepo = ds.getRepository(Shift);
  const assignRepo = ds.getRepository(ShiftAssignment);
  const swapRepo = ds.getRepository(SwapRequest);

  const existing = await locRepo.findOne({ where: { name: LOCATION_NAMES[0].name } });
  if (existing) {
    console.log('Seed data already present (Coastal Eats locations exist). Skipping.');
    return;
  }

  console.log('Seeding locations...');
  const locations: Location[] = [];
  for (const { name, ianaTimezone } of LOCATION_NAMES) {
    const loc = locRepo.create({ name, ianaTimezone, isActive: true });
    await locRepo.save(loc);
    locations.push(loc);
  }
  const [downtown, midtown, west, pacific] = locations;

  console.log('Seeding skills...');
  const skills: Record<string, Skill> = {};
  for (const name of SKILL_NAMES) {
    const s = skillRepo.create({ name });
    await skillRepo.save(s);
    skills[name] = s;
  }

  console.log('Seeding users (admin, managers, staff)...');
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = userRepo.create({
    email: ADMIN_EMAIL,
    passwordHash: adminHash,
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    notifyInApp: true,
    notifyEmail: false,
  });
  await userRepo.save(admin);

  const manager1 = userRepo.create({
    email: 'manager1@coastaleats.com',
    passwordHash: await bcrypt.hash('Manager123!', 12),
    firstName: 'Morgan',
    lastName: 'Manager',
    role: 'manager',
    isActive: true,
    notifyInApp: true,
    notifyEmail: false,
  });
  await userRepo.save(manager1);
  const manager2 = userRepo.create({
    email: 'manager2@coastaleats.com',
    passwordHash: await bcrypt.hash('Manager123!', 12),
    firstName: 'Alex',
    lastName: 'Manager',
    role: 'manager',
    isActive: true,
    notifyInApp: true,
    notifyEmail: false,
  });
  await userRepo.save(manager2);

  const staffEmails = [
    'jordan@coastaleats.com',
    'casey@coastaleats.com',
    'riley@coastaleats.com',
    'quinn@coastaleats.com',
    'sam@coastaleats.com',
    'taylor@coastaleats.com',
    'jamie@coastaleats.com',
    'morgan@coastaleats.com',
    'avery@coastaleats.com',
    'reese@coastaleats.com',
    'parker@coastaleats.com',
    'drew@coastaleats.com',
  ];
  const staffNames = [
    'Jordan', 'Casey', 'Riley', 'Quinn', 'Sam', 'Taylor',
    'Jamie', 'Morgan', 'Avery', 'Reese', 'Parker', 'Drew',
  ];
  const staff: User[] = [];
  for (let i = 0; i < 12; i++) {
    const u = userRepo.create({
      email: staffEmails[i],
      passwordHash: await bcrypt.hash('Staff123!', 12),
      firstName: staffNames[i],
      lastName: 'Staff',
      role: 'staff',
      isActive: true,
      notifyInApp: true,
      notifyEmail: false,
    });
    await userRepo.save(u);
    staff.push(u);
  }

  console.log('Linking managers to locations...');
  await locRepo
    .createQueryBuilder()
    .relation(Location, 'managers')
    .of(downtown.id)
    .add(manager1.id);
  await locRepo.createQueryBuilder().relation(Location, 'managers').of(midtown.id).add(manager1.id);
  await locRepo.createQueryBuilder().relation(Location, 'managers').of(west.id).add(manager2.id);
  await locRepo.createQueryBuilder().relation(Location, 'managers').of(pacific.id).add(manager2.id);

  console.log('Assigning skills to users...');
  for (let i = 0; i < staff.length; i++) {
    const u = staff[i];
    const skillNames = [
      ['server', 'host'],
      ['bartender', 'barback'],
      ['line_cook', 'server'],
      ['server', 'host', 'bartender'],
      ['line_cook', 'barback'],
      ['bartender', 'server'],
      ['supervisor', 'bartender'],
      ['server', 'line_cook'],
      ['host', 'server', 'line_cook'],
      ['bartender', 'line_cook'],
      ['server', 'host', 'barback'],
      ['line_cook', 'server', 'bartender'],
    ][i % 12];
    const skillList = skillNames.map((n) => skills[n]);
    await userRepo
      .createQueryBuilder()
      .relation(User, 'skills')
      .of(u.id)
      .add(skillList.map((s) => s.id));
  }

  console.log('Creating certifications...');
  const certify = async (userId: string, locationId: string) => {
    const c = certRepo.create({
      userId,
      locationId,
      certifiedAt: new Date(),
    });
    await certRepo.save(c);
  };
  await certify(staff[0].id, downtown.id);
  await certify(staff[0].id, midtown.id);
  await certify(staff[1].id, west.id);
  await certify(staff[1].id, pacific.id);
  await certify(staff[2].id, downtown.id);
  await certify(staff[2].id, west.id);
  await certify(staff[3].id, downtown.id);
  await certify(staff[3].id, midtown.id);
  await certify(staff[3].id, pacific.id);
  for (const s of staff.slice(4, 10)) await certify(s.id, downtown.id);
  await certify(staff[10].id, midtown.id);
  await certify(staff[11].id, west.id);
  await certify(staff[11].id, pacific.id);

  console.log('Creating availability windows (2 staff with limited availability)...');
  const baseFrom = format(addDays(new Date(), -30), 'yyyy-MM-dd');
  for (let i = 0; i < 12; i++) {
    const u = staff[i];
    if (i === 4 || i === 5) {
      await availRepo.save(
        availRepo.create({
          userId: u.id,
          dayOfWeek: 5,
          startTime: '17:00:00',
          endTime: '23:00:00',
          effectiveFrom: baseFrom,
        }),
      );
      await availRepo.save(
        availRepo.create({
          userId: u.id,
          dayOfWeek: 6,
          startTime: '10:00:00',
          endTime: '18:00:00',
          effectiveFrom: baseFrom,
        }),
      );
    } else {
      for (let d = 0; d <= 6; d++) {
        await availRepo.save(
          availRepo.create({
            userId: u.id,
            dayOfWeek: d,
            startTime: '06:00:00',
            endTime: '23:59:00',
            effectiveFrom: baseFrom,
          }),
        );
      }
    }
  }

  console.log('Creating shifts (current week + 2 weeks, premium, overnight)...');
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const shiftData: { location: Location; requiredSkillId: string; dateLocal: string; startLocal: string; endLocal: string; isPremium: boolean; title?: string }[] = [];

  for (let w = 0; w < 3; w++) {
    const weekStartDate = addDays(weekStart, w * 7);
    const friday = addDays(weekStartDate, 5);
    const saturday = addDays(weekStartDate, 6);
    const fridayStr = format(friday, 'yyyy-MM-dd');
    const saturdayStr = format(saturday, 'yyyy-MM-dd');

    [downtown, midtown, west, pacific].forEach((loc) => {
      const tz = loc.ianaTimezone;
      shiftData.push({
        location: loc,
        requiredSkillId: skills.server.id,
        dateLocal: fridayStr,
        startLocal: '18:00:00',
        endLocal: '23:00:00',
        isPremium: true,
        title: 'Friday evening',
      });
      shiftData.push({
        location: loc,
        requiredSkillId: skills.bartender.id,
        dateLocal: saturdayStr,
        startLocal: '17:00:00',
        endLocal: '23:30:00',
        isPremium: true,
        title: 'Saturday evening',
      });
    });
  }

  const overnightLoc = downtown;
  const saturdayForOvernight = addDays(weekStart, 6);
  shiftData.push({
    location: overnightLoc,
    requiredSkillId: skills.bartender.id,
    dateLocal: format(saturdayForOvernight, 'yyyy-MM-dd'),
    startLocal: '23:00:00',
    endLocal: '03:00:00',
    isPremium: true,
    title: 'Overnight',
  });

  const overlapDay = format(addDays(weekStart, 2), 'yyyy-MM-dd');
  shiftData.push({
    location: downtown,
    requiredSkillId: skills.server.id,
    dateLocal: overlapDay,
    startLocal: '10:00:00',
    endLocal: '14:00:00',
    isPremium: false,
    title: 'Overlap-A',
  });
  shiftData.push({
    location: downtown,
    requiredSkillId: skills.server.id,
    dateLocal: overlapDay,
    startLocal: '12:00:00',
    endLocal: '16:00:00',
    isPremium: false,
    title: 'Overlap-B',
  });

  for (let w = 0; w < 3; w++) {
    for (let d = 0; d < 5; d++) {
      const day = addDays(weekStart, w * 7 + d);
      const dateStr = format(day, 'yyyy-MM-dd');
      [downtown, midtown].forEach((loc) => {
        shiftData.push({
          location: loc,
          requiredSkillId: skills.server.id,
          dateLocal: dateStr,
          startLocal: '11:00:00',
          endLocal: '15:00:00',
          isPremium: false,
          title: 'Lunch',
        });
        shiftData.push({
          location: loc,
          requiredSkillId: skills.line_cook.id,
          dateLocal: dateStr,
          startLocal: '17:00:00',
          endLocal: '22:00:00',
          isPremium: false,
          title: 'Dinner',
        });
      });
    }
  }

  const shifts: Shift[] = [];
  for (const d of shiftData) {
    const startAt = localToUtc(`${d.dateLocal}T${d.startLocal}`, d.location.ianaTimezone);
    const endDate =
      d.endLocal <= d.startLocal
        ? format(addDays(new Date(d.dateLocal + 'T12:00:00'), 1), 'yyyy-MM-dd')
        : d.dateLocal;
    const endAt = localToUtc(`${endDate}T${d.endLocal}`, d.location.ianaTimezone);
    const shift = shiftRepo.create({
      locationId: d.location.id,
      requiredSkillId: d.requiredSkillId,
      title: d.title ?? null,
      startAt,
      endAt,
      headcountNeeded: 1,
      status: 'published',
      publishedAt: new Date(),
      editCutoffHours: 48,
      isPremium: d.isPremium,
    });
    await shiftRepo.save(shift);
    shifts.push(shift);
  }

  console.log('Creating assignments (one staff near 34h, one shift that would hit overtime if assigned)...');
  const getWeekStart = (d: Date) => startOfWeek(d, { weekStartsOn: 0 });
  const assignments: ShiftAssignment[] = [];
  const overlapTitles = ['Overlap-A', 'Overlap-B'];

  for (let i = 0; i < shifts.length; i++) {
    const shift = shifts[i];
    if (shift.title && overlapTitles.includes(shift.title)) continue;
    const staffIdx = i % staff.length;
    const assign = assignRepo.create({
      shiftId: shift.id,
      userId: staff[staffIdx].id,
      assignedBy: admin.id,
      status: 'confirmed',
    });
    await assignRepo.save(assign);
    assignments.push(assign);
  }

  const swapInitiatorAssignId = assignments[0].id;
  const swapTargetAssignId = assignments[1].id;
  const week0End = addDays(weekStart, 7);
  const week0Shifts = shifts.filter(
    (s) =>
      s.startAt >= weekStart &&
      s.startAt < week0End &&
      !s.title?.startsWith('Overlap'),
  );
  const staff34h = staff[6];
  const assign34h = await assignRepo.find({
    where: { userId: staff34h.id },
  });
  const assignedShiftIds = new Set(assign34h.map((a) => a.shiftId));
  let week0Hours = 0;
  for (const a of assign34h) {
    const s = await shiftRepo.findOne({ where: { id: a.shiftId } });
    if (s && s.startAt >= weekStart && s.startAt < week0End) {
      week0Hours += (s.endAt.getTime() - s.startAt.getTime()) / (60 * 60 * 1000);
    }
  }
  for (const shift of week0Shifts) {
    if (week0Hours >= 34) break;
    if (assignedShiftIds.has(shift.id)) continue;
    const existing = await assignRepo.findOne({ where: { shiftId: shift.id } });
    if (existing && (existing.id === swapInitiatorAssignId || existing.id === swapTargetAssignId)) continue;
    const hrs = (shift.endAt.getTime() - shift.startAt.getTime()) / (60 * 60 * 1000);
    if (existing) {
      await assignRepo.remove(existing);
    }
    await assignRepo.save(
      assignRepo.create({
        shiftId: shift.id,
        userId: staff34h.id,
        assignedBy: admin.id,
        status: 'confirmed',
      }),
    );
    week0Hours += hrs;
    assignedShiftIds.add(shift.id);
  }
  if (week0Hours >= 34) {
    console.log(`[Seed] Staff ${staff34h.email} has ~${Math.round(week0Hours * 10) / 10}h in week 0 (near overtime).`);
  }

  const shiftForOvertime = shifts.find((s) => s.locationId === downtown.id && !s.isPremium) ?? shifts[0];
  const staffAt34h = staff[6];
  const weekOfShift = getWeekStart(shiftForOvertime.startAt);
  const hoursSoFar = await assignRepo
    .createQueryBuilder('a')
    .innerJoin('a.shift', 's')
    .where('a.userId = :userId', { userId: staffAt34h.id })
    .andWhere('a.status != :cancelled', { cancelled: 'cancelled' })
    .andWhere('s.startAt >= :ws', { ws: weekOfShift })
    .andWhere('s.endAt < :we', { we: addDays(weekOfShift, 7) })
    .getMany();
  let totalH = 0;
  for (const a of hoursSoFar) {
    const s = await shiftRepo.findOne({ where: { id: a.shiftId } });
    if (s) totalH += (s.endAt.getTime() - s.startAt.getTime()) / (60 * 60 * 1000);
  }
  const shiftHours = (shiftForOvertime.endAt.getTime() - shiftForOvertime.startAt.getTime()) / (60 * 60 * 1000);
  if (totalH + shiftHours >= 40) {
    console.log(`[Seed] Staff ${staffAt34h.email} would hit overtime (${totalH + shiftHours}h) if assigned to shift ${shiftForOvertime.id}; skipping that assignment for demo.`);
  }

  console.log('Creating pending swap request...');
  const initiatorAssignment = assignments[0];
  const targetAssignment = assignments[1];
  const initShift = await shiftRepo.findOne({ where: { id: initiatorAssignment.shiftId }, relations: ['location'] });
  const expiresAt = addHours(initShift!.startAt, -48);
  const swap = swapRepo.create({
    initiatorId: initiatorAssignment.userId,
    targetUserId: targetAssignment.userId,
    initiatorAssignmentId: initiatorAssignment.id,
    targetAssignmentId: targetAssignment.id,
    type: 'swap',
    status: 'pending_target',
    expiresAt,
  });
  await swapRepo.save(swap);

  console.log('Attempting double-booking assignment (catch at seed time, log it, do not save)...');
  const overlapA = shifts.find((s) => s.title === 'Overlap-A');
  const overlapB = shifts.find((s) => s.title === 'Overlap-B');
  if (overlapA && overlapB) {
    const doubleBookUser = staff[0].id;
    await assignRepo.save(
      assignRepo.create({
        shiftId: overlapA.id,
        userId: doubleBookUser,
        assignedBy: admin.id,
        status: 'confirmed',
      }),
    );
    const overlapping = await assignRepo
      .createQueryBuilder('a')
      .innerJoin('a.shift', 's')
      .where('a.userId = :userId', { userId: doubleBookUser })
      .andWhere('a.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('s.id != :shiftId', { shiftId: overlapB.id })
      .getMany();
    let wouldDoubleBook = false;
    for (const a of overlapping) {
      const s = await shiftRepo.findOne({ where: { id: a.shiftId } });
      if (s && overlapB.startAt.getTime() < s.endAt.getTime() && s.startAt.getTime() < overlapB.endAt.getTime()) {
        wouldDoubleBook = true;
        break;
      }
    }
    if (wouldDoubleBook) {
      console.log('[Seed] Double-booking detected: would assign same staff to overlapping shift; not saving second assignment.');
    } else {
      await assignRepo.save(
        assignRepo.create({
          shiftId: overlapB.id,
          userId: doubleBookUser,
          assignedBy: admin.id,
          status: 'assigned',
        }),
      );
    }
  }

  console.log('Seed complete.');
  console.log('  Admin:', ADMIN_EMAIL, '/', ADMIN_PASSWORD);
  console.log('  Managers: manager1@coastaleats.com, manager2@coastaleats.com / Manager123!');
  console.log('  Staff: jordan@coastaleats.com ... / Staff123!');
}
