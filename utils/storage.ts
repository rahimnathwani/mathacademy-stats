import type { Activity } from '@/types/mathacademy';

/** Key under which the popup stores fetched activities for the report pages. */
export const ACTIVITIES_STORAGE_KEY = 'activitiesData';

export async function storeActivities(activities: Activity[]): Promise<void> {
  await browser.storage.local.set({ [ACTIVITIES_STORAGE_KEY]: activities });
}

export async function loadStoredActivities(): Promise<Activity[] | null> {
  const result = await browser.storage.local.get(ACTIVITIES_STORAGE_KEY);
  const activities = result[ACTIVITIES_STORAGE_KEY];
  return Array.isArray(activities) ? (activities as Activity[]) : null;
}
