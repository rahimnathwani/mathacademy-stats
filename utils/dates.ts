/**
 * Format a date as YYYY-MM-DD in the user's local timezone.
 *
 * All daily aggregation uses this key so that an activity completed late in
 * the evening counts toward the user's local calendar day, not the UTC day.
 */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse an activity timestamp (`completed` / `started`) into a local Date.
 *
 * The API labels these timestamps UTC (`...Z`), but the clock time is the
 * user's own wall-clock time: `completed: "2026-09-17T19:21:21.000Z"` comes
 * with `timeCompletedStr: "7:21 PM"`. Reading them as UTC shifts activities
 * done after midnight (or late in the evening, east of UTC) onto the wrong
 * day. This keeps the wall-clock fields, so local getters (`getHours`,
 * `getDay`, `toLocalDateKey`) return what Math Academy showed the user.
 * Differences between two timestamps are unaffected either way.
 */
export function parseActivityTime(timestamp: string): Date {
  const d = new Date(timestamp);
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds()
  );
}
