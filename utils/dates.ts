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
