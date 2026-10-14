import type { Activity } from '@/types/mathacademy';
import { dedupeActivities } from '@/utils/dedupe-activities';

/** Key under which the popup stores fetched activities for the report pages. */
export const ACTIVITIES_STORAGE_KEY = 'activitiesData';

export async function storeActivities(activities: Activity[]): Promise<void> {
  await browser.storage.local.set({ [ACTIVITIES_STORAGE_KEY]: dedupeActivities(activities) });
}

export async function loadStoredActivities(): Promise<Activity[] | null> {
  const result = await browser.storage.local.get(ACTIVITIES_STORAGE_KEY);
  const activities = result[ACTIVITIES_STORAGE_KEY];
  // Dedupe on read so data stored by older versions (which could contain
  // duplicates) is corrected without needing a refetch.
  return Array.isArray(activities) ? dedupeActivities(activities as Activity[]) : null;
}
