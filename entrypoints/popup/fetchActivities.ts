import type { Activity } from '@/types/mathacademy';
import {
  clearStoredActivities,
  loadActivitiesMeta,
  loadStoredActivities,
  storeActivities,
} from '@/utils/storage';

/** How far back to fetch history. */
const HISTORY_YEARS = 7;
// 25 activities per page, so this allows 50,000 activities in one refresh.
const MAX_PAGES = 2000;
const SLEEP_MS = 200;
const OVERLAP_DAYS = 1000;
const VERBOSE = import.meta.env.DEV;
/** localStorage key used by versions up to 1.3.0; migrated to browser.storage.local. */
const LEGACY_CACHE_KEY = 'mathacademyActivitiesCache';

/** Read and remove the cache left in localStorage by versions up to 1.3.0. */
function takeLegacyCache(): Activity[] {
  if (typeof localStorage === 'undefined') return [];

  try {
    const raw = localStorage.getItem(LEGACY_CACHE_KEY);
    if (!raw) return [];
    localStorage.removeItem(LEGACY_CACHE_KEY);
    const parsed = JSON.parse(raw) as { items?: Activity[] } | Activity[];
    if (Array.isArray(parsed)) return parsed;
    return Array.isArray(parsed?.items) ? parsed.items : [];
  } catch (err) {
    console.warn('Failed to read legacy cached activities:', err);
    return [];
  }
}

export async function getCachedActivities(): Promise<Activity[]> {
  const stored = (await loadStoredActivities()) ?? [];
  const legacy = takeLegacyCache();
  if (legacy.length === 0) return sortActivities([...stored]);

  // Older versions kept the cache in localStorage and copied it to storage.local only when a
  // report was opened, so merge both. No coveredFrom: the next refresh backfills older history.
  const byId = new Map<number, Activity>();
  for (const item of [...stored, ...legacy]) byId.set(item.id, item);
  const merged = sortActivities([...byId.values()]);
  await storeActivities(merged);
  return merged;
}

export async function clearActivityCache(): Promise<void> {
  takeLegacyCache();
  await clearStoredActivities();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Detect the current Math Academy hostname from the active tab
async function getMathAcademyHostname(): Promise<string> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tabs[0]?.url;

    if (currentUrl) {
      const url = new URL(currentUrl);
      const hostname = url.hostname;

      // Check if we're on mathacademy.com or www.mathacademy.com
      if (hostname === 'mathacademy.com' || hostname === 'www.mathacademy.com') {
        return hostname;
      }
    }
  } catch (err) {
    console.warn('Failed to detect hostname from active tab:', err);
  }

  // Default to mathacademy.com if detection fails
  return 'mathacademy.com';
}

const DAY_MS = 86_400_000;

/**
 * The API's timestamps are the user's wall-clock time labelled UTC (see `parseActivityTime`),
 * and its cursor takes that same wall-clock time, written as a PST date string. So cursors here
 * are "API time": milliseconds in the domain of `Date.parse(activity.completed)`, formatted
 * with UTC getters. Using local getters instead put the cursor 7–8 hours early in the US
 * Pacific timezone and skipped late-evening activities at page boundaries.
 */
function toCursorPath(apiMs: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const d = new Date(apiMs);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const time = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
  const str = `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${pad2(d.getUTCDate())} ${d.getUTCFullYear()} ${time} GMT-0800 (Pacific Standard Time)`;
  return encodeURIComponent(str);
}

/** The current wall-clock time, in API time. */
const nowInApiTime = () => Date.now() - new Date().getTimezoneOffset() * 60_000;

// Extract timestamp from activity item
function getItemTimeMs(item: Activity): number | undefined {
  const candidate = item?.completed;

  if (!candidate) return undefined;

  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return candidate;
  }

  if (typeof candidate === 'string') {
    const n = Number(candidate);
    if (Number.isFinite(n) && String(n).length >= 10) {
      return n;
    }
    const t = Date.parse(candidate);
    if (Number.isFinite(t)) {
      return t;
    }
  }

  return undefined;
}

const bestTime = (item: Activity) => {
  const t = getItemTimeMs(item);
  return typeof t === 'number' ? t : -Infinity;
};

function sortActivities(items: Activity[]): Activity[] {
  return items.sort((a, b) => bestTime(b) - bestTime(a));
}

async function fetchPage(baseUrl: string, cursorMs: number): Promise<Activity[]> {
  const url = baseUrl + toCursorPath(cursorMs);
  if (VERBOSE) console.log('GET', url);

  let response;
  try {
    response = await fetch(url, { credentials: 'include' });
  } catch (err) {
    throw new Error(
      `Failed to fetch: ${err instanceof Error ? err.message : String(err)}\n` +
        `URL: ${url}\n` +
        `This might be a network error, CORS issue, or missing host_permissions in the extension manifest.`,
      { cause: err }
    );
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} - URL: ${url}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    const dataType = data === null ? 'null' : typeof data;
    const dataPreview = JSON.stringify(data, null, 2).slice(0, 500);
    throw new Error(
      `Expected array page but received ${dataType}.\n` +
        `URL: ${url}\n` +
        `Response preview: ${dataPreview}${dataPreview.length === 500 ? '...' : ''}`
    );
  }

  return data;
}

type WalkResult = {
  items: Activity[];
  /** True if the walk reached `stopBeforeMs` (or a known activity) rather than giving up early. */
  complete: boolean;
};

/**
 * Page backwards through `/api/previous-tasks/` from `fromMs` until reaching `stopBeforeMs`,
 * an activity whose id is in `knownIds`, or `MAX_PAGES`. Times are API time (see `toCursorPath`).
 */
async function walkBack(
  baseUrl: string,
  fromMs: number,
  stopBeforeMs: number,
  knownIds: Set<number>,
  report: (pageItems: number, collected: number) => void
): Promise<WalkResult> {
  const items: Activity[] = [];
  const seen = new Set<number>();
  let cursor = fromMs;

  for (let pages = 0; pages < MAX_PAGES; pages++) {
    const page = await fetchPage(baseUrl, cursor);
    report(page.length, items.length);

    let next = cursor - OVERLAP_DAYS * DAY_MS; // empty page: jump back in case of a long gap
    if (page.length > 0) {
      for (const item of page) {
        if (knownIds.has(item.id)) return { items, complete: true };
        // Pages can overlap by a few activities; keep the first copy.
        if (!seen.has(item.id)) {
          seen.add(item.id);
          items.push(item);
        }
      }
      const times = page.map(getItemTimeMs).filter((t): t is number => t !== undefined);
      const oldest = times.length > 0 ? Math.min(...times) - 1 : Number.NaN; // -1ms: skip the oldest item
      // A page should only hold activities older than the cursor; if not, stop rather than skip.
      if (!(oldest < cursor)) return { items, complete: false };
      next = oldest;
    }

    if (next < stopBeforeMs) return { items, complete: true };
    cursor = next;
    await sleep(SLEEP_MS);
  }

  return { items, complete: false };
}

/**
 * Fetch the last `HISTORY_YEARS` of activities, reusing what is already stored.
 *
 * 1. New activities: page back from now until reaching one that is already stored.
 * 2. Older history: if the stored data doesn't reach back the full window (first run,
 *    or data saved by a version with a shorter window), page back from the oldest
 *    stored activity to the start of the window.
 */
export async function fetchAllActivities(
  onProgress?: (message: string) => void
): Promise<Activity[]> {
  const hostname = await getMathAcademyHostname();
  const BASE_URL = `https://${hostname}/api/previous-tasks/`;
  if (VERBOSE) console.log(`Using API base URL: ${BASE_URL}`);
  onProgress?.(`Detected hostname: ${hostname}`);

  const cached = await getCachedActivities();
  const meta = await loadActivitiesMeta();
  if (cached.length > 0) onProgress?.(`Loaded ${cached.length} cached activities.`);

  const windowStart = new Date(nowInApiTime());
  windowStart.setUTCFullYear(windowStart.getUTCFullYear() - HISTORY_YEARS);
  const startMs = windowStart.getTime();

  const cachedIds = new Set(cached.map((item) => item.id));
  // Start a day ahead so the newest activities are included whatever the timezone.
  const fresh = await walkBack(BASE_URL, nowInApiTime() + DAY_MS, startMs, cachedIds, (n, total) =>
    onProgress?.(`Fetching new activities: page of ${n}, ${total} new so far...`)
  );

  let older: WalkResult = { items: [], complete: true };
  let coveredFrom = meta?.coveredFrom;
  if (cached.length === 0) {
    coveredFrom = fresh.complete ? windowStart.toISOString() : undefined;
  } else if (!coveredFrom || new Date(coveredFrom) > windowStart) {
    const oldestMs = Math.min(...cached.map((item) => getItemTimeMs(item) ?? Infinity));
    if (Number.isFinite(oldestMs)) {
      older = await walkBack(BASE_URL, oldestMs - 1, startMs, new Set(), (n, total) =>
        onProgress?.(`Fetching older history: page of ${n}, ${total} older so far...`)
      );
      if (older.complete) coveredFrom = windowStart.toISOString();
    }
  }

  // Merge, dropping duplicates, and keep the window.
  const byId = new Map<number, Activity>();
  for (const item of [...fresh.items, ...cached, ...older.items]) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  const inWindow = [...byId.values()].filter((item) => {
    const t = getItemTimeMs(item);
    return t === undefined || t >= startMs;
  });
  sortActivities(inWindow);

  await storeActivities(inWindow, { coveredFrom });

  const partial = !fresh.complete || !older.complete;
  onProgress?.(
    `Done! Collected ${inWindow.length} activities.` +
      (partial ? ' Stopped early; refresh again to fetch the rest.' : '')
  );
  return inWindow;
}
