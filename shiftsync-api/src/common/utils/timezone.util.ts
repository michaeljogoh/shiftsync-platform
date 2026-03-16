import { toDate, formatInTimeZone } from 'date-fns-tz';

/**
 * ISO 8601 with offset: ends with Z or ±HH:MM or ±HHMM.
 * If no offset, API assumes the location's ianaTimezone (use parseDateTimeForLocation).
 */
export function hasTimezoneOffset(isoString: string): boolean {
  return /Z|[+-]\d{2}:?\d{2}$/.test(isoString.trim());
}

/**
 * Parse an ISO 8601 datetime string for storage (UTC).
 * - If the string has an offset (Z or ±HH:MM), parse as that instant.
 * - If no offset, interpret the string as local time in ianaTimezone and convert to UTC
 *   using date-fns-tz (zonedTimeToUtc / toDate). No manual UTC offset arithmetic.
 */
export function parseDateTimeForLocation(
  isoString: string,
  ianaTimezone: string,
): Date {
  const trimmed = isoString.trim();
  if (hasTimezoneOffset(trimmed)) {
    return new Date(trimmed);
  }
  const utcDate = toDate(trimmed, { timeZone: ianaTimezone });
  if (Number.isNaN(utcDate.getTime())) {
    throw new Error(`Invalid date string: ${isoString}`);
  }
  return utcDate;
}

export interface LocalTime {
  timezone: string;
  formatted: string;
}

/**
 * Format a UTC date for display in a location's timezone.
 * Uses date-fns-tz (formatInTimeZone). Example: "2025-01-10 15:00:00 PST".
 */
export function formatWithLocalTime(
  utcDate: Date,
  ianaTimezone: string,
): LocalTime {
  const date = utcDate instanceof Date ? utcDate : new Date(utcDate);
  const formatted = formatInTimeZone(
    date,
    ianaTimezone,
    'yyyy-MM-dd HH:mm:ss zzz',
  );
  return { timezone: ianaTimezone, formatted };
}

/**
 * Add localTime display fields for startAt/endAt to a shift-like object.
 * Storage remains UTC (timestamptz); response includes both UTC and localTime per spec.
 */
export function withLocalTimeDisplay<T extends { startAt: Date; endAt: Date; location?: { ianaTimezone: string } }>(
  entity: T,
  ianaTimezone: string,
): T & {
  startAt: string;
  endAt: string;
  startAtLocalTime: LocalTime;
  endAtLocalTime: LocalTime;
} {
  const tz = ianaTimezone ?? 'UTC';
  return {
    ...entity,
    startAt: (entity.startAt instanceof Date ? entity.startAt : new Date(entity.startAt)).toISOString(),
    endAt: (entity.endAt instanceof Date ? entity.endAt : new Date(entity.endAt)).toISOString(),
    startAtLocalTime: formatWithLocalTime(entity.startAt, tz),
    endAtLocalTime: formatWithLocalTime(entity.endAt, tz),
  };
}
