import type { Activity, CourseStats } from '@/types/mathacademy';

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  if (lower === upper) {
    return sorted[lower];
  }
  
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

interface ProcessedActivity {
  courseName: string;
  xpPerMinute: number;
}

export function generateStats(activities: Activity[], activityType?: string): CourseStats[] {
  // Filter out activities where completed - started > 2 hours
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  
  const processedActivities: ProcessedActivity[] = [];
  
  for (const activity of activities) {
    // Filter by activity type if specified
    if (activityType && activity.type !== activityType) {
      continue;
    }
    
    const startedMs = Date.parse(activity.started);
    const completedMs = Date.parse(activity.completed);
    
    if (!Number.isFinite(startedMs) || !Number.isFinite(completedMs)) {
      continue;
    }
    
    const durationMs = completedMs - startedMs;
    
    // Skip if duration > 2 hours or duration <= 0
    if (durationMs > TWO_HOURS_MS || durationMs <= 0) {
      continue;
    }
    
    const durationMinutes = durationMs / (60 * 1000);
    
    // Using the course the user was in when they did the activity,
    // even if it was a review of material from a different (prior) course.
    const courseName = activity.test?.course?.name; 
    
    if (!courseName) {
      continue;
    }
    
    // Calculate XP per minute
    const xpPerMinute = activity.pointsAwarded / durationMinutes;
    
    processedActivities.push({
      courseName,
      xpPerMinute
    });
  }
  
  // Group by course
  const byCourse = new Map<string, number[]>();
  
  for (const activity of processedActivities) {
    if (!byCourse.has(activity.courseName)) {
      byCourse.set(activity.courseName, []);
    }
    byCourse.get(activity.courseName)!.push(activity.xpPerMinute);
  }
  
  // Calculate stats for each course
  const stats: CourseStats[] = [];
  const thresholds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  
  for (const [courseName, xpValues] of byCourse.entries()) {
    const percentile25 = calculatePercentile(xpValues, 25);
    const percentile50 = calculatePercentile(xpValues, 50);
    const percentile75 = calculatePercentile(xpValues, 75);
    
    const countAboveOne = xpValues.filter(xp => xp >= 1).length;
    const percentAboveOne = (countAboveOne / xpValues.length) * 100;
    
    // Calculate percentage of activities at or above each threshold
    const thresholdPercentages: { [threshold: number]: number } = {};
    for (const threshold of thresholds) {
      const countAboveThreshold = xpValues.filter(xp => xp >= threshold).length;
      thresholdPercentages[threshold] = (countAboveThreshold / xpValues.length) * 100;
    }
    
    stats.push({
      courseName,
      percentile25,
      percentile50,
      percentile75,
      percentAboveOne,
      activityCount: xpValues.length,
      thresholdPercentages
    });
  }
  
  // Sort by course name
  stats.sort((a, b) => a.courseName.localeCompare(b.courseName));
  
  return stats;
}

