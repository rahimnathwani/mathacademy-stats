(async () => {

// ===== CONFIG =====

const WINDOW_END_LOCAL = new Date().toISOString().slice(0, 19);

const WINDOW_START_LOCAL = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19);

// Detect the current hostname (mathacademy.com or www.mathacademy.com)
const BASE = `https://${window.location.hostname}/api/previous-tasks/`;

const MAX_PAGES = 200; // big safety cap

const SLEEP_MS = 200; // polite pacing

const OVERLAP_DAYS = 1000; // days to jump back when no progress or empty page

const VERBOSE = true;

  

// ===== Helpers =====

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  

// Force the path to look like your samples: always PST text & -0800 offset.

// Example: "Mon Jan 20 2025 16:00:00 GMT-0800 (Pacific Standard Time)"

function toPSTPathString(d) {

const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const pad2 = (n) => String(n).padStart(2, "0");

return `${days[d.getDay()]} ${months[d.getMonth()]} ${pad2(d.getDate())} ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} GMT-0800 (Pacific Standard Time)`;

}

const enc = (d) => encodeURIComponent(toPSTPathString(d));

  

// Robust timestamp extraction (checks many fields & common nestings)

function getItemTimeMs(it) {

const candidates = [

it?.completed

];

for (const c of candidates) {

if (!c) continue;

if (typeof c === "number" && Number.isFinite(c)) return c;

if (typeof c === "string") {

const n = Number(c);

if (Number.isFinite(n) && String(n).length >= 10) return n; // secs/ms string

const t = Date.parse(c);

if (Number.isFinite(t)) return t;

}

}

return undefined;

}

  

async function fetchPage(cutoff) {

const url = BASE + enc(cutoff);

if (VERBOSE) console.log("GET", url);

const r = await fetch(url, { credentials: "include" });

if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);

const data = await r.json();

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

  

// ===== Window & state =====

const WINDOW_END = new Date(WINDOW_END_LOCAL);

const WINDOW_START = new Date(WINDOW_START_LOCAL);

  

const all = [];

const seen = new Set();

  

function addUnique(items) {

for (const it of items) {

const id = it?.id ?? it?.taskId ?? it?.uid ?? it?.guid ?? it?.slug ?? JSON.stringify(it);

if (!seen.has(id)) {

seen.add(id);

all.push(it);

}

}

}

  

// Start just before the window end to be inclusive

let cursor = new Date(WINDOW_END);

// To mimic your samples even more, many pages in your URLs use "16:00:00".

// If you want to lock that, uncomment the next line:

// cursor.setHours(16, 0, 0, 0);

  

let pages = 0;

let lastCursorMs = cursor.getTime();

  

console.log(`Crawling back from ${cursor.toString()} to ${WINDOW_START.toString()} (collect first, filter later)…`);

  

while (pages < MAX_PAGES) {

const page = await fetchPage(cursor);

if (VERBOSE) console.log(`Page ${pages + 1}: received ${page.length} items`);

  

if (page.length === 0) {

if (VERBOSE) console.log(`Empty page — stepping back ${OVERLAP_DAYS} days to break potential server window, then retry.`);

cursor = new Date(cursor.getTime() - OVERLAP_DAYS * 86400_000);

// stop if we are already past the window start

if (cursor < WINDOW_START) break;

// also break if no progress vs previous step

if (cursor.getTime() === lastCursorMs) break;

lastCursorMs = cursor.getTime();

await sleep(SLEEP_MS);

continue;

}

  

addUnique(page);

  

// Determine next cursor

const times = page.map(getItemTimeMs).filter(t => typeof t === "number" && Number.isFinite(t));

if (times.length > 0) {

const oldest = Math.min(...times);

const nextMs = oldest - 0; // don't care about overlap, as we have a key to deduplicate

const next = new Date(nextMs);

// If no progress (same or later), force a jump

if (!(nextMs < lastCursorMs)) {

if (VERBOSE) console.warn(`No-progress cursor detected; forcing jump back ${OVERLAP_DAYS} days.`);

cursor = new Date(cursor.getTime() - OVERLAP_DAYS * 86400_000);

} else {

cursor = next;

}

} else {

// No timestamps parseable — force a jump

if (VERBOSE) console.warn(`No parsable timestamps; forcing jump back ${OVERLAP_DAYS} days.`);

cursor = new Date(cursor.getTime() - OVERLAP_DAYS * 86400_000);

}

  

pages++;

if (VERBOSE) console.log(`Total collected: ${all.length}. Next cursor: ${cursor.toString()}`);

  

if (cursor < WINDOW_START) {

if (VERBOSE) console.log("Crossed WINDOW_START; finishing pagination.");

break;

}

  

// If the cursor didn’t change, break to avoid infinite loop

if (cursor.getTime() === lastCursorMs) {

if (VERBOSE) console.warn("Cursor unchanged after step; stopping to avoid loop.");

break;

}

lastCursorMs = cursor.getTime();

  

await sleep(SLEEP_MS);

}

  

// ===== Finalize: filter to window, sort, download =====

const inWindow = all.filter(it => {

const t = getItemTimeMs(it);

if (t === undefined) return true; // keep unknown-dated records

return t >= WINDOW_START.getTime() && t <= WINDOW_END.getTime();

});

  

// Stable sort by best-known time desc

const bestTime = (it) => {

const t = getItemTimeMs(it);

return typeof t === "number" ? t : -Infinity;

};

inWindow.sort((a, b) => bestTime(b) - bestTime(a));

  

// Dynamically determine the min and max 'completed' dates in inWindow

function formatDate(dt) {

// Format as YYYY-MM-DD

return dt.toISOString().slice(0, 10);

}

const completedTimes = inWindow

.map(it => getItemTimeMs(it))

.filter(t => typeof t === "number" && Number.isFinite(t));

let fileName;

if (completedTimes.length > 0) {

const minDate = new Date(Math.min(...completedTimes));

const maxDate = new Date(Math.max(...completedTimes));

fileName = `mathacademy_previous_tasks_${formatDate(minDate)}_to_${formatDate(maxDate)}.json`;

} else {

fileName = `mathacademy_previous_tasks_no_dates.json`;

}

const blob = new Blob([JSON.stringify(inWindow, null, 2)], { type: "application/json" });

const a = document.createElement("a");

a.href = URL.createObjectURL(blob);

a.download = fileName;

document.body.appendChild(a);

a.click();

URL.revokeObjectURL(a.href);

a.remove();

  

console.log(`Done. Pages: ${pages}. Collected: ${all.length}. In window: ${inWindow.length}. Saved ${fileName}.`);

})().catch(err => console.error(err));