import type { Activity } from '@/types/mathacademy';

const MAX_PAGES = 200;
const SLEEP_MS = 200;
const OVERLAP_DAYS = 1000;
const VERBOSE = true;
const CACHE_KEY = 'mathacademyActivitiesCache';

type CachePayload = {
  items: Activity[];
  updatedAt: string;
};

const hasLocalStorage = () => typeof localStorage !== 'undefined';

function readCache(): Activity[] {
  if (!hasLocalStorage()) return [];

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as CachePayload | Activity[];
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && Array.isArray(parsed.items)) {
      return parsed.items;
    }
  } catch (err) {
    console.warn('Failed to read cached activities:', err);
  }

  return [];
}

function writeCache(items: Activity[]): void {
  if (!hasLocalStorage()) return;

  try {
    const payload: CachePayload = {
      items,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to write cached activities:', err);
  }
}

export function getCachedActivities(): Activity[] {
  const cached = readCache();
  return sortActivities([...cached]);
}

export function clearActivityCache(): void {
  if (!hasLocalStorage()) return;

  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (err) {
    console.warn('Failed to clear cached activities:', err);
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

// Force the path to look like PST format with -0800 offset
function toPSTPathString(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad2 = (n: number) => String(n).padStart(2, "0");
  
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${pad2(d.getDate())} ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} GMT-0800 (Pacific Standard Time)`;
}

const enc = (d: Date) => encodeURIComponent(toPSTPathString(d));

// Extract timestamp from activity item
function getItemTimeMs(item: Activity): number | undefined {
  const candidate = item?.completed;

  if (!candidate) return undefined;
  
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return candidate;
  }
  
  if (typeof candidate === "string") {
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

async function fetchPage(baseUrl: string, cutoff: Date): Promise<Activity[]> {
  const url = baseUrl + enc(cutoff);
  if (VERBOSE) console.log("GET", url);
  
  let response;
  try {
    response = await fetch(url, { credentials: "include" });
  } catch (err) {
    throw new Error(
      `Failed to fetch: ${err instanceof Error ? err.message : String(err)}\n` +
      `URL: ${url}\n` +
      `This might be a network error, CORS issue, or missing host_permissions in the extension manifest.`
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

export async function fetchAllActivities(
  onProgress?: (message: string) => void
): Promise<Activity[]> {
  // Detect the current hostname and build the base URL
  const hostname = await getMathAcademyHostname();
  const BASE_URL = `https://${hostname}/api/previous-tasks/`;

  if (VERBOSE) console.log(`Using API base URL: ${BASE_URL}`);
  onProgress?.(`Detected hostname: ${hostname}`);

  const cachedActivities = getCachedActivities();
  if (cachedActivities.length > 0) {
    onProgress?.(`Loaded ${cachedActivities.length} cached activities.`);
  }
  
  // Set window: last 3 years to now
  const WINDOW_END = new Date();
  const WINDOW_START = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
  
  const newActivities: Activity[] = [];
  const seen = new Set<number>();

  for (const item of cachedActivities) {
    const id = item?.id;
    if (typeof id === 'number') {
      seen.add(id);
    }
  }
  
  let cursor = new Date(WINDOW_END);
  let pages = 0;
  let lastCursorMs = cursor.getTime();
  
  onProgress?.(`Starting fetch from ${cursor.toISOString()}...`);

  while (pages < MAX_PAGES) {
    const page = await fetchPage(BASE_URL, cursor);
    if (VERBOSE) console.log(`Page ${pages + 1}: received ${page.length} items`);
    onProgress?.(`Page ${pages + 1}: received ${page.length} items. Total new: ${newActivities.length}`);

    if (page.length === 0) {
      if (VERBOSE) console.log(`Empty page — stepping back ${OVERLAP_DAYS} days`);
      cursor = new Date(cursor.getTime() - OVERLAP_DAYS * 86400_000);

      if (cursor < WINDOW_START) break;
      if (cursor.getTime() === lastCursorMs) break;
      
      lastCursorMs = cursor.getTime();
      await sleep(SLEEP_MS);
      continue;
    }
    
    const freshItems: Activity[] = [];

    for (const item of page) {
      const id = item?.id;
      if (typeof id === 'number' && seen.has(id)) {
        // Skip duplicate item but don't stop pagination
        continue;
      }

      if (typeof id === 'number') {
        seen.add(id);
      }

      freshItems.push(item);
    }

    if (freshItems.length > 0) {
      newActivities.push(...freshItems);
    }

    // Determine next cursor
    const times = page.map(getItemTimeMs).filter(t => typeof t === "number" && Number.isFinite(t)) as number[];
    
    if (times.length > 0) {
      const oldest = Math.min(...times);
      const nextMs = oldest - 60000; // Subtract 1 minute to ensure progress and avoid duplicates
      const next = new Date(nextMs);
      
      if (!(nextMs < lastCursorMs)) {
        if (VERBOSE) console.warn(`No-progress cursor detected; forcing jump back ${OVERLAP_DAYS} days.`);
        cursor = new Date(cursor.getTime() - OVERLAP_DAYS * 86400_000);
      } else {
        cursor = next;
      }
    } else {
      if (VERBOSE) console.warn(`No parsable timestamps; forcing jump back ${OVERLAP_DAYS} days.`);
      cursor = new Date(cursor.getTime() - OVERLAP_DAYS * 86400_000);
    }
    
    pages++;
    if (VERBOSE) console.log(`Total new collected: ${newActivities.length}. Next cursor: ${cursor.toString()}`);

    if (cursor < WINDOW_START) {
      if (VERBOSE) console.log("Crossed WINDOW_START; finishing pagination.");
      break;
    }
    
    if (cursor.getTime() === lastCursorMs) {
      if (VERBOSE) console.warn("Cursor unchanged after step; stopping to avoid loop.");
      break;
    }
    
    lastCursorMs = cursor.getTime();
    await sleep(SLEEP_MS);
  }
  
  // Combine new and cached activities, ensuring no duplicates
  const combined = [...newActivities];
  const seenIds = new Set<number>();

  // Add all new activity IDs to seen set
  newActivities.forEach(item => {
    if (typeof item.id === 'number') {
      seenIds.add(item.id);
    }
  });

  // Add cached activities that aren't already in new activities
  for (const item of cachedActivities) {
    if (typeof item.id !== 'number' || !seenIds.has(item.id)) {
      combined.push(item);
      if (typeof item.id === 'number') {
        seenIds.add(item.id);
      }
    }
  }

  const inWindow = combined.filter(item => {
    const t = getItemTimeMs(item);
    if (t === undefined) return true;
    return t >= WINDOW_START.getTime() && t <= WINDOW_END.getTime();
  });

  sortActivities(inWindow);

  writeCache(inWindow);

  onProgress?.(`Done! Collected ${inWindow.length} activities.`);

  return inWindow;
}

