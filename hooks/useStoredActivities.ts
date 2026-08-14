import { useEffect, useState } from 'react';
import type { Activity } from '@/types/mathacademy';
import { loadStoredActivities } from '@/utils/storage';

export interface StoredActivitiesState {
  activities: Activity[];
  loading: boolean;
  error: string | null;
  /**
   * True once activities are loaded and non-empty. Pages should render
   * `<PageStatus>` while this is false — it covers all three not-ready states.
   */
  ready: boolean;
}

/**
 * Load the activities the popup saved to `browser.storage.local`.
 *
 * Every report page starts from this data, so the loading/error lifecycle
 * lives here instead of being repeated in each page component.
 */
export function useStoredActivities(): StoredActivitiesState {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStoredActivities()
      .then((stored) => {
        if (stored) {
          setActivities(stored);
        } else {
          setError('No activities data found. Please fetch data from the popup first.');
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Error loading activities: ${message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  return {
    activities,
    loading,
    error,
    ready: !loading && !error && activities.length > 0,
  };
}
