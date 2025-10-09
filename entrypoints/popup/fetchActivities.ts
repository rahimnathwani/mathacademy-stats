import type { Activity } from '@/types/mathacademy';

const BASE_URL = "https://www.mathacademy.com/api/previous-tasks/";
const MAX_PAGES = 200;
const SLEEP_MS = 200;
const OVERLAP_DAYS = 1000;
const VERBOSE = true;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

async function fetchPage(cutoff: Date): Promise<Activity[]> {
  const url = BASE_URL + enc(cutoff);
  if (VERBOSE) console.log("GET", url);
  
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Expected array page");
  }
  
  return data;
}

export async function fetchAllActivities(
  onProgress?: (message: string) => void
): Promise<Activity[]> {
  // Set window: last 3 years to now
  const WINDOW_END = new Date();
  const WINDOW_START = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
  
  const all: Activity[] = [];
  const seen = new Set<number>();
  
  function addUnique(items: Activity[]) {
    for (const item of items) {
      const id = item?.id;
      if (id && !seen.has(id)) {
        seen.add(id);
        all.push(item);
      }
    }
  }
  
  let cursor = new Date(WINDOW_END);
  let pages = 0;
  let lastCursorMs = cursor.getTime();
  
  onProgress?.(`Starting fetch from ${cursor.toISOString()}...`);
  
  while (pages < MAX_PAGES) {
    const page = await fetchPage(cursor);
    if (VERBOSE) console.log(`Page ${pages + 1}: received ${page.length} items`);
    onProgress?.(`Page ${pages + 1}: received ${page.length} items. Total: ${all.length}`);
    
    if (page.length === 0) {
      if (VERBOSE) console.log(`Empty page — stepping back ${OVERLAP_DAYS} days`);
      cursor = new Date(cursor.getTime() - OVERLAP_DAYS * 86400_000);
      
      if (cursor < WINDOW_START) break;
      if (cursor.getTime() === lastCursorMs) break;
      
      lastCursorMs = cursor.getTime();
      await sleep(SLEEP_MS);
      continue;
    }
    
    addUnique(page);
    
    // Determine next cursor
    const times = page.map(getItemTimeMs).filter(t => typeof t === "number" && Number.isFinite(t)) as number[];
    
    if (times.length > 0) {
      const oldest = Math.min(...times);
      const nextMs = oldest - 0;
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
    if (VERBOSE) console.log(`Total collected: ${all.length}. Next cursor: ${cursor.toString()}`);
    
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
  
  // Filter to window
  const inWindow = all.filter(item => {
    const t = getItemTimeMs(item);
    if (t === undefined) return true;
    return t >= WINDOW_START.getTime() && t <= WINDOW_END.getTime();
  });
  
  // Sort by completion time descending
  const bestTime = (item: Activity) => {
    const t = getItemTimeMs(item);
    return typeof t === "number" ? t : -Infinity;
  };
  inWindow.sort((a, b) => bestTime(b) - bestTime(a));
  
  onProgress?.(`Done! Collected ${inWindow.length} activities.`);
  
  return inWindow;
}

