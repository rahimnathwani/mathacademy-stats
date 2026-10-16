import type { Activity } from '@/types/mathacademy';
import { parseActivityTime, toLocalDateKey } from '@/utils/dates';
import { classifyActivity, isDiagnostic } from '@/utils/classify-activity';

/**
 * Daily aggregated data
 */
export interface DailyData {
  date: string; // YYYY-MM-DD format
  xp: number;
  count: number;
  totalPossible: number;
  totalEarned: number;
}

/**
 * Activity type counts
 */
export interface ActivityCounts {
  lessons: number;
  reviews: number;
  multisteps: number;
  quizzes: number;
  diagnostics: number;
}

/**
 * XP earned and possible for one activity.
 *
 * Diagnostics have no fixed base point value, so their earned XP counts as
 * both earned and possible (100% attainment). Other activities fall back to a
 * base of 10 points when the API omits `points`.
 */
function getXPAttainmentParts(activity: Activity): { earned: number; possible: number } {
  const earned = activity.pointsAwarded || 0;
  const possible = isDiagnostic(activity) ? earned : activity.points || 10;
  return { earned, possible };
}

/**
 * Group activities by day
 */
export function groupActivitiesByDay(activities: Activity[]): DailyData[] {
  const dailyGroups: { [key: string]: DailyData } = {};

  activities.forEach((activity) => {
    const dateKey = toLocalDateKey(parseActivityTime(activity.completed));

    if (!dailyGroups[dateKey]) {
      dailyGroups[dateKey] = {
        date: dateKey,
        xp: 0,
        count: 0,
        totalPossible: 0,
        totalEarned: 0,
      };
    }

    const { earned, possible } = getXPAttainmentParts(activity);
    dailyGroups[dateKey].xp += activity.pointsAwarded || 0;
    dailyGroups[dateKey].count += 1;
    dailyGroups[dateKey].totalPossible += possible;
    dailyGroups[dateKey].totalEarned += earned;
  });

  return Object.values(dailyGroups).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Calculate total XP earned
 */
export function calculateTotalXP(activities: Activity[]): number {
  return activities.reduce((sum, activity) => sum + (activity.pointsAwarded || 0), 0);
}

/**
 * Calculate average XP per day (calendar days, not just days with activities)
 */
export function calculateAvgXPPerDay(activities: Activity[]): number {
  if (activities.length === 0) return 0;

  const totalXP = calculateTotalXP(activities);

  const dates = activities.map((activity) => parseActivityTime(activity.completed).getTime());
  const firstDate = new Date(Math.min(...dates));
  const lastDate = new Date(Math.max(...dates));

  // Set to start of day for accurate day counting
  firstDate.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);

  // Calculate number of calendar days
  const daysDiff =
    Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return daysDiff > 0 ? Math.round(totalXP / daysDiff) : 0;
}

/**
 * Calculate XP attainment rate (percentage of possible XP achieved)
 */
export function calculateXPAttainment(activities: Activity[]): number {
  let totalEarned = 0;
  let totalPossible = 0;

  activities.forEach((activity) => {
    const { earned, possible } = getXPAttainmentParts(activity);
    totalEarned += earned;
    totalPossible += possible;
  });

  return totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 1000) / 10 : 0;
}

/**
 * Calculate activity type counts
 */
export function calculateActivityCounts(activities: Activity[]): ActivityCounts {
  const counts: ActivityCounts = {
    diagnostics: 0,
    lessons: 0,
    reviews: 0,
    multisteps: 0,
    quizzes: 0,
  };

  activities.forEach((activity) => {
    switch (classifyActivity(activity)) {
      case 'lesson':
        counts.lessons++;
        break;
      case 'review':
        counts.reviews++;
        break;
      case 'multistep':
        counts.multisteps++;
        break;
      case 'quiz':
        counts.quizzes++;
        break;
      case 'diagnostic':
        counts.diagnostics++;
        break;
      default:
        // Unknown activity type - skip
        break;
    }
  });

  return counts;
}

/**
 * Get current course from most recent activity
 */
export function getCurrentCourse(activities: Activity[]): string {
  if (activities.length === 0) return 'No Activities';

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.completed).getTime() - new Date(a.completed).getTime()
  );

  return sortedActivities[0]?.test?.course?.name || 'Unknown Course';
}

/**
 * Abbreviate course names for display on charts
 */
function abbreviateCourseName(courseName: string): string {
  return courseName
    .replace(/Mathematical Foundations/g, 'MF')
    .replace(/Mathematics for/g, 'M4')
    .replace(/Machine Learning/g, 'ML')
    .replace(/Grade Math/g, 'Grade')
    .replace(/Prealgebra/g, 'Prealg')
    .replace(/Algebra/g, 'Alg')
    .replace(/Integrated Math/g, 'IM');
}

/**
 * Course transition point
 */
export interface CourseTransition {
  timestamp: number; // Unix timestamp in seconds
  fromCourse: string;
  toCourse: string;
  label: string; // e.g., "MFII → MFIII"
}

/**
 * Detect course transitions in activities
 */
export function getCourseTransitions(activities: Activity[]): CourseTransition[] {
  if (activities.length === 0) return [];

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(a.completed).getTime() - new Date(b.completed).getTime()
  );

  const transitions: CourseTransition[] = [];
  let currentCourse = sortedActivities[0]?.test?.course?.name || 'Unknown';

  for (let i = 1; i < sortedActivities.length; i++) {
    const activity = sortedActivities[i];
    const courseName = activity.test?.course?.name || 'Unknown';

    if (courseName !== currentCourse && courseName !== 'Unknown' && currentCourse !== 'Unknown') {
      const timestamp = parseActivityTime(activity.completed).getTime() / 1000;
      transitions.push({
        timestamp,
        fromCourse: currentCourse,
        toCourse: courseName,
        label: `${abbreviateCourseName(currentCourse)} → ${abbreviateCourseName(courseName)}`,
      });
      currentCourse = courseName;
    } else if (courseName !== 'Unknown') {
      currentCourse = courseName;
    }
  }

  return transitions;
}

export type TimePeriod =
  | 'all time'
  | 'the past 7 days'
  | 'the past 30 days'
  | 'last month'
  | 'this month to date'
  | 'last year'
  | 'this year to date';

export const TIME_PERIODS: TimePeriod[] = [
  'all time',
  'the past 7 days',
  'the past 30 days',
  'last month',
  'this month to date',
  'last year',
  'this year to date',
];

/**
 * The date range a time period covers. `start` is undefined for "all time";
 * `end` is only set for periods that exclude today (e.g. "last month").
 */
export function getPeriodRange(period: TimePeriod): { start?: Date; end?: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'all time':
      return {};
    case 'the past 7 days': {
      const start = new Date(today);
      start.setDate(today.getDate() - 6); // Last 7 days including today
      return { start };
    }
    case 'the past 30 days': {
      const start = new Date(today);
      start.setDate(today.getDate() - 29); // Last 30 days including today
      return { start };
    }
    case 'last month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59), // End of previous month's last day
      };
    case 'this month to date':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1) };
    case 'last year':
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
      };
    case 'this year to date':
      return { start: new Date(now.getFullYear(), 0, 1) };
  }
}

export function filterActivitiesByPeriod(activities: Activity[], period: TimePeriod): Activity[] {
  const { start, end } = getPeriodRange(period);
  if (!start && !end) return activities;

  return activities.filter((activity) => {
    const activityDate = parseActivityTime(activity.completed);
    if (start && activityDate < start) return false;
    if (end && activityDate > end) return false;
    return true;
  });
}
