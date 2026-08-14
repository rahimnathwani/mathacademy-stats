import type { Activity } from '@/types/mathacademy';

/**
 * Activities longer than this are excluded from rate statistics: a long gap
 * usually means the tab was left open, not continuous work.
 */
export const MAX_ACTIVITY_DURATION_MS = 2 * 60 * 60 * 1000;

/**
 * Duration of an activity in minutes, or null when the timestamps are missing
 * or invalid, or the duration falls outside (0, 2 hours].
 */
export function getActivityDurationMinutes(activity: Activity): number | null {
  const startedMs = Date.parse(activity.started);
  const completedMs = Date.parse(activity.completed);

  if (!Number.isFinite(startedMs) || !Number.isFinite(completedMs)) return null;

  const durationMs = completedMs - startedMs;
  if (durationMs <= 0 || durationMs > MAX_ACTIVITY_DURATION_MS) return null;

  return durationMs / 60000;
}
