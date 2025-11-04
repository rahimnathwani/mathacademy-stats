import type { Activity } from '@/types/mathacademy';
import { groupActivitiesByDay, toLocalDateString, type DailyData } from './overview-calculations';

/**
 * Chart data format for uPlot
 */
export interface ChartData {
  timestamps: number[];
  values: number[];
}

/**
 * Get the date range for charts, ensuring it extends through today
 * If explicitStartDate is provided, use that instead of the first activity date
 */
function getChartDateRange(activities: Activity[], explicitStartDate?: Date): { firstDate: Date; lastDate: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (activities.length === 0) {
    const firstDate = explicitStartDate || today;
    return { firstDate, lastDate: today };
  }

  const dailyData = groupActivitiesByDay(activities);
  const firstActivityDate = new Date(dailyData[0].date);

  // Use explicit start date if provided, otherwise use first activity date
  const firstDate = explicitStartDate || firstActivityDate;

  return { firstDate, lastDate: today };
}

/**
 * Generate all dates in a range as an array of date strings and Date objects
 */
function generateDateRange(firstDate: Date, lastDate: Date): { dateStrings: string[]; dates: Date[] } {
  const dateStrings: string[] = [];
  const dates: Date[] = [];
  const currentDate = new Date(firstDate);

  while (currentDate <= lastDate) {
    dateStrings.push(toLocalDateString(currentDate));
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { dateStrings, dates };
}

/**
 * Get cumulative XP data for chart (include zero-activity days)
 * @param startDate Optional explicit start date for the chart range (useful for filtered time periods)
 */
export function getCumulativeXPData(activities: Activity[], startDate?: Date): ChartData {
  const { firstDate, lastDate } = getChartDateRange(activities, startDate);

  if (activities.length === 0) {
    return { timestamps: [firstDate.getTime() / 1000, lastDate.getTime() / 1000], values: [0, 0] };
  }

  const dailyData = groupActivitiesByDay(activities);

  // Create lookup for daily XP
  const dailyXPLookup: { [key: string]: number } = {};
  dailyData.forEach(day => {
    dailyXPLookup[day.date] = day.xp;
  });

  // Generate cumulative data for ALL days (including zero-activity days)
  const { dateStrings, dates } = generateDateRange(firstDate, lastDate);
  const timestamps: number[] = [];
  const values: number[] = [];
  let cumulativeXP = 0;

  dates.forEach((date, i) => {
    const dayXP = dailyXPLookup[dateStrings[i]] || 0;
    cumulativeXP += dayXP;
    timestamps.push(date.getTime() / 1000);
    values.push(cumulativeXP);
  });

  return { timestamps, values };
}

/**
 * Get cumulative activities data for chart (include zero-activity days)
 * @param startDate Optional explicit start date for the chart range (useful for filtered time periods)
 */
export function getCumulativeActivitiesData(activities: Activity[], startDate?: Date): ChartData {
  const { firstDate, lastDate } = getChartDateRange(activities, startDate);

  if (activities.length === 0) {
    return { timestamps: [firstDate.getTime() / 1000, lastDate.getTime() / 1000], values: [0, 0] };
  }

  const dailyData = groupActivitiesByDay(activities);

  // Create lookup for daily activity count
  const dailyCountLookup: { [key: string]: number } = {};
  dailyData.forEach(day => {
    dailyCountLookup[day.date] = day.count;
  });

  // Generate cumulative data for ALL days (including zero-activity days)
  const { dateStrings, dates } = generateDateRange(firstDate, lastDate);
  const timestamps: number[] = [];
  const values: number[] = [];
  let cumulativeCount = 0;

  dates.forEach((date, i) => {
    const dayCount = dailyCountLookup[dateStrings[i]] || 0;
    cumulativeCount += dayCount;
    timestamps.push(date.getTime() / 1000);
    values.push(cumulativeCount);
  });

  return { timestamps, values };
}

/**
 * Get daily XP data (actual XP per day, not rolling average)
 * @param startDate Optional explicit start date for the chart range (useful for filtered time periods)
 */
export function getDailyXPData(activities: Activity[], startDate?: Date): ChartData {
  const { firstDate, lastDate } = getChartDateRange(activities, startDate);

  if (activities.length === 0) {
    return { timestamps: [firstDate.getTime() / 1000, lastDate.getTime() / 1000], values: [0, 0] };
  }

  const dailyData = groupActivitiesByDay(activities);

  // Create lookup for daily XP
  const dailyXPLookup: { [key: string]: number } = {};
  dailyData.forEach(day => {
    dailyXPLookup[day.date] = day.xp;
  });

  // Generate data for ALL days (including zero-activity days)
  const { dateStrings, dates } = generateDateRange(firstDate, lastDate);
  const timestamps: number[] = [];
  const values: number[] = [];

  dates.forEach((date, i) => {
    const dayXP = dailyXPLookup[dateStrings[i]] || 0;
    timestamps.push(date.getTime() / 1000);
    values.push(dayXP);
  });

  return { timestamps, values };
}

/**
 * Get average XP per day over time (7-day rolling average)
 * @param startDate Optional explicit start date for the chart range (useful for filtered time periods)
 */
export function getAvgXPOverTimeData(activities: Activity[], startDate?: Date): ChartData {
  const { firstDate, lastDate } = getChartDateRange(activities, startDate);

  if (activities.length === 0) {
    return { timestamps: [firstDate.getTime() / 1000, lastDate.getTime() / 1000], values: [0, 0] };
  }

  const dailyData = groupActivitiesByDay(activities);

  // Create lookup for daily XP
  const dailyXPLookup: { [key: string]: number } = {};
  dailyData.forEach(day => {
    dailyXPLookup[day.date] = day.xp;
  });

  // Generate all dates and calculate 7-day rolling average
  const { dateStrings, dates } = generateDateRange(firstDate, lastDate);
  const timestamps: number[] = [];
  const values: number[] = [];

  // Calculate 7-day rolling average for each day (including zero-XP days)
  for (let i = 0; i < dateStrings.length; i++) {
    const windowStart = Math.max(0, i - 6); // 7 days including current day
    const window = dateStrings.slice(windowStart, i + 1);

    const totalXP = window.reduce((sum, dateKey) => sum + (dailyXPLookup[dateKey] || 0), 0);
    const rollingAvg = Math.round(totalXP / window.length);

    timestamps.push(dates[i].getTime() / 1000);
    values.push(rollingAvg);
  }

  return { timestamps, values };
}

/**
 * Get success rate (attainment %) over time (7-day rolling average)
 * @param startDate Optional explicit start date for the chart range (useful for filtered time periods)
 */
export function getSuccessRateOverTimeData(activities: Activity[], startDate?: Date): ChartData {
  const { firstDate, lastDate } = getChartDateRange(activities, startDate);

  if (activities.length === 0) {
    return { timestamps: [firstDate.getTime() / 1000, lastDate.getTime() / 1000], values: [0, 0] };
  }

  const dailyData = groupActivitiesByDay(activities);

  // Create lookup for daily data
  const dailyDataLookup: { [key: string]: DailyData } = {};
  dailyData.forEach(day => {
    dailyDataLookup[day.date] = day;
  });

  // Generate all dates and calculate 7-day rolling attainment
  const { dateStrings, dates } = generateDateRange(firstDate, lastDate);
  const timestamps: number[] = [];
  const values: number[] = [];

  for (let i = 0; i < dateStrings.length; i++) {
    const windowStart = Math.max(0, i - 6); // 7 days including current day
    const window = dateStrings.slice(windowStart, i + 1);

    let totalEarned = 0;
    let totalPossible = 0;

    window.forEach(dateKey => {
      const dayData = dailyDataLookup[dateKey];
      if (dayData) {
        totalEarned += dayData.totalEarned;
        totalPossible += dayData.totalPossible;
      }
    });

    const rollingAttainment = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

    timestamps.push(dates[i].getTime() / 1000);
    values.push(rollingAttainment);
  }

  return { timestamps, values };
}

