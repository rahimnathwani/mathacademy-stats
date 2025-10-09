import type { Activity } from '@/types/mathacademy';

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDateRangeFromActivities(activities: Activity[]): { min: Date; max: Date } | null {
  const completedTimes = activities
    .map(item => Date.parse(item.completed))
    .filter(t => Number.isFinite(t));
  
  if (completedTimes.length === 0) {
    return null;
  }
  
  return {
    min: new Date(Math.min(...completedTimes)),
    max: new Date(Math.max(...completedTimes))
  };
}

export function downloadJSON(activities: Activity[]): void {
  const dateRange = getDateRangeFromActivities(activities);
  const fileName = dateRange
    ? `mathacademy_activities_${formatDate(dateRange.min)}_to_${formatDate(dateRange.max)}.json`
    : `mathacademy_activities_${formatDate(new Date())}.json`;
  
  const blob = new Blob([JSON.stringify(activities, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

function escapeCSVField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, newline, or double quote, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

export function downloadCSV(activities: Activity[]): void {
  const headers = [
    'id',
    'type',
    'points',
    'pointsAwarded',
    'topic.id',
    'topic.name',
    'topic.course.id',
    'topic.course.name',
    'started',
    'completed',
    'test.id',
    'test.name',
    'test.course.id',
    'test.course.name'
  ];
  
  const rows = activities.map(activity => [
    activity.id,
    activity.type,
    activity.points,
    activity.pointsAwarded,
    activity.topic?.id,
    activity.topic?.name,
    activity.topic?.course?.id,
    activity.topic?.course?.name,
    activity.started,
    activity.completed,
    activity.test?.id,
    activity.test?.name,
    activity.test?.course?.id,
    activity.test?.course?.name
  ]);
  
  const csvContent = [
    headers.map(escapeCSVField).join(','),
    ...rows.map(row => row.map(escapeCSVField).join(','))
  ].join('\n');
  
  const dateRange = getDateRangeFromActivities(activities);
  const fileName = dateRange
    ? `mathacademy_activities_${formatDate(dateRange.min)}_to_${formatDate(dateRange.max)}.csv`
    : `mathacademy_activities_${formatDate(new Date())}.csv`;
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

