import type { Activity } from '@/types/mathacademy';

/**
 * Key under which fetched activities are stored. The report pages read them from
 * here, and the popup uses them as its cache for incremental refreshes.
 */
export const ACTIVITIES_STORAGE_KEY = 'activitiesData';

/** Key for metadata about the stored activities (see `ActivitiesMeta`). */
const ACTIVITIES_META_KEY = 'activitiesMeta';

export interface ActivitiesMeta {
  /**
   * ISO time back to which history has been fully fetched. Missing for data
   * saved by older versions, which fetched a shorter window.
   */
  coveredFrom?: string;
  updatedAt: string;
}

export async function storeActivities(
  activities: Activity[],
  meta?: Omit<ActivitiesMeta, 'updatedAt'>
): Promise<void> {
  await browser.storage.local.set({
    [ACTIVITIES_STORAGE_KEY]: activities,
    [ACTIVITIES_META_KEY]: { ...meta, updatedAt: new Date().toISOString() },
  });
}

export async function loadStoredActivities(): Promise<Activity[] | null> {
  const result = await browser.storage.local.get(ACTIVITIES_STORAGE_KEY);
  const activities = result[ACTIVITIES_STORAGE_KEY];
  return Array.isArray(activities) ? (activities as Activity[]) : null;
}

export async function loadActivitiesMeta(): Promise<ActivitiesMeta | null> {
  const result = await browser.storage.local.get(ACTIVITIES_META_KEY);
  return (result[ACTIVITIES_META_KEY] as ActivitiesMeta | undefined) ?? null;
}

export async function clearStoredActivities(): Promise<void> {
  await browser.storage.local.remove([ACTIVITIES_STORAGE_KEY, ACTIVITIES_META_KEY]);
}
