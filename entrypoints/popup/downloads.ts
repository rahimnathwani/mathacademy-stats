import type { Activity } from '@/types/mathacademy';
import { parseActivityTime, toLocalDateKey } from '@/utils/dates';

/** `mathacademy_activities_<first>_to_<last>.<ext>`, dated by completion (user's wall-clock day). */
function exportFileName(activities: Activity[], ext: string): string {
  const times = activities
    .map((item) => parseActivityTime(item.completed).getTime())
    .filter((t) => Number.isFinite(t));

  if (times.length === 0) {
    return `mathacademy_activities_${toLocalDateKey(new Date())}.${ext}`;
  }

  const first = toLocalDateKey(new Date(Math.min(...times)));
  const last = toLocalDateKey(new Date(Math.max(...times)));
  return `mathacademy_activities_${first}_to_${last}.${ext}`;
}

function saveFile(content: string, type: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function downloadJSON(activities: Activity[]): void {
  saveFile(
    JSON.stringify(activities, null, 2),
    'application/json',
    exportFileName(activities, 'json')
  );
}

function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains comma, newline, or double quote, wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

const CSV_COLUMNS: [string, (a: Activity) => unknown][] = [
  ['id', (a) => a.id],
  ['type', (a) => a.type],
  ['points', (a) => a.points],
  ['pointsAwarded', (a) => a.pointsAwarded],
  ['topic.id', (a) => a.topic?.id],
  ['topic.name', (a) => a.topic?.name],
  ['topic.course.id', (a) => a.topic?.course?.id],
  ['topic.course.name', (a) => a.topic?.course?.name],
  ['started', (a) => a.started],
  ['completed', (a) => a.completed],
  ['test.id', (a) => a.test?.id],
  ['test.name', (a) => a.test?.name],
  ['test.course.id', (a) => a.test?.course?.id],
  ['test.course.name', (a) => a.test?.course?.name],
];

export function downloadCSV(activities: Activity[]): void {
  const lines = [
    CSV_COLUMNS.map(([header]) => escapeCSVField(header)).join(','),
    ...activities.map((activity) =>
      CSV_COLUMNS.map(([, get]) => escapeCSVField(get(activity))).join(',')
    ),
  ];
  saveFile(lines.join('\n'), 'text/csv', exportFileName(activities, 'csv'));
}
