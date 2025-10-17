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
 * Get cumulative XP data for chart (include zero-activity days)
 */
export function getCumulativeXPData(activities: Activity[]): ChartData {
  if (activities.length === 0) {
    return { timestamps: [], values: [] };
  }

  const dailyData = groupActivitiesByDay(activities);
  
  // Create complete date range from first to last activity day
  const firstDate = new Date(dailyData[0].date);
  const lastDate = new Date(dailyData[dailyData.length - 1].date);
  
  // Create lookup for daily XP
  const dailyXPLookup: { [key: string]: number } = {};
  dailyData.forEach(day => {
    dailyXPLookup[day.date] = day.xp;
  });
  
  // Generate cumulative data for ALL days (including zero-activity days)
  const timestamps: number[] = [];
  const values: number[] = [];
  let cumulativeXP = 0;
  const currentDate = new Date(firstDate);
  
  while (currentDate <= lastDate) {
    const dateKey = toLocalDateString(currentDate);
    const dayXP = dailyXPLookup[dateKey] || 0;
    cumulativeXP += dayXP;
    
    timestamps.push(currentDate.getTime() / 1000); // Unix timestamp in seconds
    values.push(cumulativeXP);
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return { timestamps, values };
}

/**
 * Get cumulative activities data for chart (include zero-activity days)
 */
export function getCumulativeActivitiesData(activities: Activity[]): ChartData {
  if (activities.length === 0) {
    return { timestamps: [], values: [] };
  }

  const dailyData = groupActivitiesByDay(activities);
  
  // Create complete date range from first to last activity day
  const firstDate = new Date(dailyData[0].date);
  const lastDate = new Date(dailyData[dailyData.length - 1].date);
  
  // Create lookup for daily activity count
  const dailyCountLookup: { [key: string]: number } = {};
  dailyData.forEach(day => {
    dailyCountLookup[day.date] = day.count;
  });
  
  // Generate cumulative data for ALL days (including zero-activity days)
  const timestamps: number[] = [];
  const values: number[] = [];
  let cumulativeCount = 0;
  const currentDate = new Date(firstDate);
  
  while (currentDate <= lastDate) {
    const dateKey = toLocalDateString(currentDate);
    const dayCount = dailyCountLookup[dateKey] || 0;
    cumulativeCount += dayCount;
    
    timestamps.push(currentDate.getTime() / 1000);
    values.push(cumulativeCount);
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return { timestamps, values };
}

/**
 * Get average XP per day over time (7-day rolling average)
 */
export function getAvgXPOverTimeData(activities: Activity[]): ChartData {
  if (activities.length === 0) {
    return { timestamps: [], values: [] };
  }

  const dailyData = groupActivitiesByDay(activities);
  
  // Calculate 7-day rolling average for each day
  const timestamps: number[] = [];
  const values: number[] = [];
  
  for (let i = 0; i < dailyData.length; i++) {
    const windowStart = Math.max(0, i - 6); // 7 days including current day
    const window = dailyData.slice(windowStart, i + 1);
    
    const totalXP = window.reduce((sum, day) => sum + day.xp, 0);
    const rollingAvg = Math.round(totalXP / window.length);
    
    const date = new Date(dailyData[i].date);
    timestamps.push(date.getTime() / 1000);
    values.push(rollingAvg);
  }
  
  return { timestamps, values };
}

/**
 * Get success rate (attainment %) over time (7-day rolling average)
 */
export function getSuccessRateOverTimeData(activities: Activity[]): ChartData {
  if (activities.length === 0) {
    return { timestamps: [], values: [] };
  }

  const dailyData = groupActivitiesByDay(activities);
  
  // Calculate 7-day rolling attainment rate for each day
  const timestamps: number[] = [];
  const values: number[] = [];
  
  for (let i = 0; i < dailyData.length; i++) {
    const windowStart = Math.max(0, i - 6); // 7 days including current day
    const window = dailyData.slice(windowStart, i + 1);
    
    const totalEarned = window.reduce((sum, day) => sum + day.totalEarned, 0);
    const totalPossible = window.reduce((sum, day) => sum + day.totalPossible, 0);
    const rollingAttainment = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;
    
    const date = new Date(dailyData[i].date);
    timestamps.push(date.getTime() / 1000);
    values.push(rollingAttainment);
  }
  
  return { timestamps, values };
}

