import type { Activity } from '@/types/mathacademy';

/**
 * Drop repeated activities, keeping the first occurrence of each `id`.
 *
 * The previous-tasks API can return the same activity on overlapping pages, so
 * anything that merges pages or reads previously stored data should go through
 * this. Items without a numeric id can't be matched and are kept as-is.
 */
export function dedupeActivities(activities: Activity[]): Activity[] {
  const seen = new Set<number>();
  return activities.filter((activity) => {
    const id = activity?.id;
    if (typeof id !== 'number') return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
