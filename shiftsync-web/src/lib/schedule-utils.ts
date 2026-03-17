/**
 * Schedule view utilities: week range (Sun–Sat), slot grid 6am–2am, premium detection.
 */

const SLOT_START_HOUR = 6;
const SLOT_END_HOUR = 26; // 2am next day = 26 in 24h terms
export const SLOTS_PER_HOUR = 2; // 30-min
export const TOTAL_SLOTS = (SLOT_END_HOUR - SLOT_START_HOUR) * SLOTS_PER_HOUR;

/** Get Sunday 00:00 and Saturday 23:59:59 for the week containing the given date (ISO date string). */
export function getWeekRange(weekIso: string): { start: Date; end: Date } {
  const d = new Date(weekIso + 'T12:00:00.000Z');
  const day = d.getUTCDay();
  const sundayOffset = day;
  const start = new Date(d);
  start.setUTCDate(d.getUTCDate() - sundayOffset);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

/** Format week for API: startDate and endDate as YYYY-MM-DD. */
export function weekToStartEnd(weekIso: string): { startDate: string; endDate: string } {
  const { start, end } = getWeekRange(weekIso);
  const f = (x: Date) =>
    `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
  return { startDate: f(start), endDate: f(end) };
}

/** Get next/prev week ISO date (Sunday of that week). */
export function addWeeks(weekIso: string, delta: number): string {
  const { start } = getWeekRange(weekIso);
  const next = new Date(start);
  next.setUTCDate(start.getUTCDate() + 7 * delta);
  return next.toISOString().slice(0, 10);
}

/** Slot index (0..TOTAL_SLOTS-1) for a given time (minutes from midnight). 6am = 0, 2am next day = 39. */
export function timeToSlotIndex(minutesFromMidnight: number): number {
  const hour = Math.floor(minutesFromMidnight / 60);
  const min = minutesFromMidnight % 60;
  const half = Math.floor(min / 30);
  if (hour >= SLOT_START_HOUR) {
    return Math.min(TOTAL_SLOTS - 1, (hour - SLOT_START_HOUR) * SLOTS_PER_HOUR + half);
  }
  if (hour < 2) {
    return Math.min(TOTAL_SLOTS - 1, 36 + hour * SLOTS_PER_HOUR + half);
  }
  return 0;
}

/** Day index 0..6 for a date within the week (Sunday = 0). */
export function getDayIndex(date: Date, weekStart: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = date.getTime() - weekStart.getTime();
  return Math.floor(diff / msPerDay);
}

/** Label for column: Sun, Mon, ... Sat + short date. */
export function getDayLabel(weekStart: Date, dayIndex: number): { short: string; date: string } {
  const d = new Date(weekStart);
  d.setUTCDate(weekStart.getUTCDate() + dayIndex);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  return { short: days[dayIndex], date };
}

/** Time label for slot index (e.g. "6:00", "14:30"). */
export function slotIndexToLabel(slotIndex: number): string {
  const hour = SLOT_START_HOUR + Math.floor(slotIndex / SLOTS_PER_HOUR);
  const min = (slotIndex % SLOTS_PER_HOUR) * 30;
  const h = hour >= 24 ? hour - 24 : hour;
  return `${h}:${min === 0 ? '00' : min}`;
}

/** Premium shift: Fri/Sat evening (5pm–midnight) in location TZ. */
export function isPremiumShift(
  startAt: string,
  ianaTimezone: string = 'UTC',
): boolean {
  try {
    const date = new Date(startAt);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    const isFriSat = weekday === 'Fri' || weekday === 'Sat';
    const timeMinutes = hour * 60 + minute;
    const start1700 = 17 * 60;
    const end2400 = 24 * 60;
    return isFriSat && timeMinutes >= start1700 && timeMinutes < end2400;
  } catch {
    return false;
  }
}
