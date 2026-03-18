import type { AvailabilityWindow } from '@/lib/api/server/availability';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Scenario 3: Availability windows are time-of-day; we display them in the shift's location timezone.
 * Returns a short label e.g. "Mon 9am–5pm, Tue 9am–5pm (PST)".
 */
export function formatAvailabilityInShiftTz(
  windows: AvailabilityWindow[],
  tzAbbrev: string,
): string {
  if (!windows.length) return '—';
  const byDay = new Map<number, { start: string; end: string }[]>();
  windows.forEach((w) => {
    if (!byDay.has(w.dayOfWeek)) byDay.set(w.dayOfWeek, []);
    byDay.get(w.dayOfWeek)!.push({ start: w.startTime, end: w.endTime });
  });
  const parts: string[] = [];
  for (let d = 0; d <= 6; d++) {
    const ranges = byDay.get(d);
    if (!ranges?.length) continue;
    const rangeStr = ranges
      .map((r) => `${formatTime(r.start)}–${formatTime(r.end)}`)
      .join(', ');
    parts.push(`${DAY_NAMES[d]} ${rangeStr}`);
  }
  if (parts.length === 0) return '—';
  return `${parts.join(', ')} (${tzAbbrev})`;
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (h === 0 && m === 0) return '12am';
  if (h === 12 && m === 0) return '12pm';
  if (h < 12) return `${h === 0 ? 12 : h}:${String(m).padStart(2, '0')}am`;
  return `${h - 12}:${String(m).padStart(2, '0')}pm`;
}

/**
 * Check if the shift (start in ISO) falls within availability windows.
 * Shift is interpreted in the given IANA timezone for day-of-week and time.
 */
export function isAvailableForShift(
  windows: AvailabilityWindow[],
  shiftStartAt: string,
  _shiftEndAt: string,
  ianaTimezone: string,
): boolean {
  const start = new Date(shiftStartAt);
  const inTz = new Date(start.toLocaleString('en-US', { timeZone: ianaTimezone }));
  const startDay = inTz.getDay();
  const startMinutes = inTz.getHours() * 60 + inTz.getMinutes();

  for (const w of windows) {
    if (w.dayOfWeek !== startDay) continue;
    const [wh, wm] = w.startTime.split(':').map(Number);
    const [weh, wem] = w.endTime.split(':').map(Number);
    const wStartMin = wh * 60 + wm;
    const wEndMin = weh * 60 + wem;
    if (startMinutes >= wStartMin && startMinutes < wEndMin) return true;
  }
  return false;
}
