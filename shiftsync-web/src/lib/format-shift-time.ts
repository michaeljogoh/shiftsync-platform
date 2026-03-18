/**
 * Timezone-aware shift time formatting.
 * - Always show times in the location's timezone with abbreviation (e.g. PST).
 * - Overnight shifts: "11:00 PM – 3:00 AM +1".
 * - Optional secondary "your time" when user's local timezone differs.
 */

function formatInTz(
  iso: string,
  ianaTimezone: string,
  options: { timeStyle?: 'short' | 'medium'; dateStyle?: 'short'; hour12?: boolean } = {},
): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    timeZone: ianaTimezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
}

/** Get timezone abbreviation (e.g. PST, EST) for a given date in that timezone. */
export function getTimezoneAbbreviation(ianaTimezone: string, date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart?.value ?? ianaTimezone.split('/').pop() ?? 'UTC';
  } catch {
    return ianaTimezone.split('/').pop() ?? 'UTC';
  }
}

/** Get the calendar date (YYYY-MM-DD) in the given timezone for an ISO instant. */
function getDateKeyInTz(iso: string, ianaTimezone: string): string {
  const d = new Date(iso);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ianaTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // YYYY-MM-DD for en-CA
}

export interface FormatShiftTimeRangeOptions {
  startAt: string;
  endAt: string;
  locationTimezone: string;
  /** If true, add secondary "(X:00 PM your time)" when user's TZ differs. Default true in UI. */
  showUserLocal?: boolean;
}

export interface FormatShiftTimeRangeResult {
  /** e.g. "6:00 PM – 11:00 PM PST" or "11:00 PM – 3:00 AM +1 PST" */
  primary: string;
  /** e.g. " (9:00 PM – 2:00 AM your time)" when showUserLocal and TZ differs */
  secondary?: string;
}

export function formatShiftTimeRange({
  startAt,
  endAt,
  locationTimezone,
  showUserLocal = false,
}: FormatShiftTimeRangeOptions): FormatShiftTimeRangeResult {
  const tz = locationTimezone || 'UTC';
  const startDate = new Date(startAt);
  const abbrev = getTimezoneAbbreviation(tz, startDate);

  const startTimeOnly = formatInTz(startAt, tz);
  const endTimeOnly = formatInTz(endAt, tz);

  const startDateKey = getDateKeyInTz(startAt, tz);
  const endDateKey = getDateKeyInTz(endAt, tz);
  const overnight = startDateKey !== endDateKey;

  const endSuffix = overnight ? ' +1' : '';
  const primary = `${startTimeOnly} – ${endTimeOnly}${endSuffix} ${abbrev}`;

  let secondary: string | undefined;
  if (showUserLocal && typeof Intl !== 'undefined') {
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTz !== tz) {
        const startUser = formatInTz(startAt, userTz);
        const endUser = formatInTz(endAt, userTz);
        const endUserDateKey = getDateKeyInTz(endAt, userTz);
        const startUserDateKey = getDateKeyInTz(startAt, userTz);
        const userOvernight = startUserDateKey !== endUserDateKey;
        const endUserSuffix = userOvernight ? ' +1' : '';
        secondary = ` (${startUser} – ${endUser}${endUserSuffix} your time)`;
      }
    } catch {
      // ignore
    }
  }

  return { primary, secondary };
}

/** Format a single time in location TZ with abbreviation: "6:00 PM PST". */
export function formatShiftTime(iso: string, locationTimezone: string): string {
  const tz = locationTimezone || 'UTC';
  const d = new Date(iso);
  const time = formatInTz(iso, tz);
  const abbrev = getTimezoneAbbreviation(tz, d);
  return `${time} ${abbrev}`;
}
