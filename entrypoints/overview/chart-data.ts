import type { Activity } from '@/types/mathacademy';
import { toLocalDateKey } from '@/utils/dates';
import { groupActivitiesByDay, type DailyData } from './overview-calculations';

/**
 * Chart data format for uPlot
 */
export interface ChartData {
  timestamps: number[];
  values: number[];
}

interface DailySeries {
  /** One entry per calendar day from the chart start through today. */
  dates: Date[];
  dateKeys: string[];
  /** Aggregated activity data for days that had any activity. */
  byDay: Map<string, DailyData>;
}

/**
 * Build the day-by-day scaffolding every chart shares: a continuous range of
 * calendar days (including zero-activity days) from the chart start date
 * through today, plus a lookup of aggregated data for active days.
 *
 * Returns null when there are no activities; charts then render a flat line.
 */
function buildDailySeries(activities: Activity[], explicitStartDate?: Date): DailySeries | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (activities.length === 0) return null;

  const dailyData = groupActivitiesByDay(activities);
  const firstDate = explicitStartDate || new Date(dailyData[0].date);

  const dates: Date[] = [];
  const dateKeys: string[] = [];
  const currentDate = new Date(firstDate);
  while (currentDate <= today) {
    dates.push(new Date(currentDate));
    dateKeys.push(toLocalDateKey(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const byDay = new Map(dailyData.map((day) => [day.date, day]));

  return { dates, dateKeys, byDay };
}

function emptyChart(explicitStartDate?: Date): ChartData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDate = explicitStartDate || today;
  return {
    timestamps: [firstDate.getTime() / 1000, today.getTime() / 1000],
    values: [0, 0],
  };
}

/**
 * Map each day in the series to a value.
 */
function buildChart(
  activities: Activity[],
  startDate: Date | undefined,
  valueForDay: (series: DailySeries, index: number) => number
): ChartData {
  const series = buildDailySeries(activities, startDate);
  if (!series) return emptyChart(startDate);

  const timestamps: number[] = [];
  const values: number[] = [];

  series.dates.forEach((date, i) => {
    timestamps.push(date.getTime() / 1000);
    values.push(valueForDay(series, i));
  });

  return { timestamps, values };
}

/**
 * Cumulative XP over time (includes zero-activity days).
 */
export function getCumulativeXPData(activities: Activity[], startDate?: Date): ChartData {
  let cumulative = 0;
  return buildChart(activities, startDate, ({ byDay, dateKeys }, i) => {
    cumulative += byDay.get(dateKeys[i])?.xp ?? 0;
    return cumulative;
  });
}

/**
 * Cumulative activity count over time (includes zero-activity days).
 */
export function getCumulativeActivitiesData(activities: Activity[], startDate?: Date): ChartData {
  let cumulative = 0;
  return buildChart(activities, startDate, ({ byDay, dateKeys }, i) => {
    cumulative += byDay.get(dateKeys[i])?.count ?? 0;
    return cumulative;
  });
}

/**
 * Actual XP earned per day (not a rolling average).
 */
export function getDailyXPData(activities: Activity[], startDate?: Date): ChartData {
  return buildChart(
    activities,
    startDate,
    ({ byDay, dateKeys }, i) => byDay.get(dateKeys[i])?.xp ?? 0
  );
}

/** Rolling window of the 7 days ending at index i (fewer at the range start). */
function rollingWindow(dateKeys: string[], i: number): string[] {
  return dateKeys.slice(Math.max(0, i - 6), i + 1);
}

/**
 * Average XP per day over time (7-day rolling average).
 */
export function getAvgXPOverTimeData(activities: Activity[], startDate?: Date): ChartData {
  return buildChart(activities, startDate, ({ byDay, dateKeys }, i) => {
    const window = rollingWindow(dateKeys, i);
    const totalXP = window.reduce((sum, key) => sum + (byDay.get(key)?.xp ?? 0), 0);
    return Math.round(totalXP / window.length);
  });
}

/**
 * XP attainment percentage over time (7-day rolling average).
 */
export function getSuccessRateOverTimeData(activities: Activity[], startDate?: Date): ChartData {
  return buildChart(activities, startDate, ({ byDay, dateKeys }, i) => {
    let totalEarned = 0;
    let totalPossible = 0;

    rollingWindow(dateKeys, i).forEach((key) => {
      const day = byDay.get(key);
      if (day) {
        totalEarned += day.totalEarned;
        totalPossible += day.totalPossible;
      }
    });

    return totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
  });
}
