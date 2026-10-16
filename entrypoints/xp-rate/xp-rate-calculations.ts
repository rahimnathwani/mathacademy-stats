import type { Activity } from '@/types/mathacademy';
import { parseActivityTime, toLocalDateKey } from '@/utils/dates';
import { getActivityDurationMinutes } from '@/utils/duration';

/**
 * One calendar day's XP-earning rate. Days with no valid activity have
 * rate === null so charts can show a gap instead of a misleading zero.
 */
export interface DailyRate {
  /** Local midnight of the day */
  date: Date;
  xp: number;
  minutes: number;
  rate: number | null;
}

export interface WeeklyRate {
  /** Local midnight of the week's Sunday (matching the heatmap's week start) */
  weekStart: Date;
  xp: number;
  minutes: number;
  rate: number | null;
  activeDays: number;
}

export interface RateSummary {
  /** XP/min over the last 7 calendar days including today */
  last7: number | null;
  /** XP/min over the 7 days before that */
  previous7: number | null;
  allTime: number | null;
}

const rateOf = (xp: number, minutes: number): number | null => (minutes > 0 ? xp / minutes : null);

const localMidnight = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * XP and study minutes per calendar day, as a continuous range from the first
 * valid activity through today. Rates divide total XP by total minutes (not an
 * average of per-activity ratios), so long and short activities weigh in
 * proportionally.
 */
export function computeDailyRates(activities: Activity[]): DailyRate[] {
  const byDay = new Map<string, { xp: number; minutes: number }>();
  let firstDay: Date | null = null;

  for (const activity of activities) {
    const minutes = getActivityDurationMinutes(activity);
    if (minutes === null) continue;

    const completed = parseActivityTime(activity.completed);
    const key = toLocalDateKey(completed);
    const entry = byDay.get(key) ?? { xp: 0, minutes: 0 };
    entry.xp += activity.pointsAwarded;
    entry.minutes += minutes;
    byDay.set(key, entry);

    const day = localMidnight(completed);
    if (!firstDay || day < firstDay) firstDay = day;
  }

  if (!firstDay) return [];

  const today = localMidnight(new Date());
  const days: DailyRate[] = [];
  const cursor = new Date(firstDay);

  while (cursor <= today) {
    const entry = byDay.get(toLocalDateKey(cursor)) ?? { xp: 0, minutes: 0 };
    days.push({
      date: new Date(cursor),
      xp: entry.xp,
      minutes: entry.minutes,
      rate: rateOf(entry.xp, entry.minutes),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

/**
 * Trailing-window rate for each day: total XP over the last `windowDays`
 * calendar days divided by total minutes in that window. Aligned with the
 * input array; null where the window contains no activity.
 */
export function computeRollingRates(
  dailyRates: DailyRate[],
  windowDays: number
): (number | null)[] {
  return dailyRates.map((_, i) => {
    let xp = 0;
    let minutes = 0;
    for (let j = Math.max(0, i - windowDays + 1); j <= i; j++) {
      xp += dailyRates[j].xp;
      minutes += dailyRates[j].minutes;
    }
    return rateOf(xp, minutes);
  });
}

/**
 * Daily rates grouped into Sunday-to-Saturday weeks.
 */
export function computeWeeklyRates(dailyRates: DailyRate[]): WeeklyRate[] {
  const weeks = new Map<string, WeeklyRate>();

  for (const day of dailyRates) {
    const weekStart = new Date(day.date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = toLocalDateKey(weekStart);

    const week = weeks.get(key) ?? { weekStart, xp: 0, minutes: 0, rate: null, activeDays: 0 };
    week.xp += day.xp;
    week.minutes += day.minutes;
    if (day.minutes > 0) week.activeDays++;
    weeks.set(key, week);
  }

  const result = Array.from(weeks.values());
  result.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  result.forEach((week) => {
    week.rate = rateOf(week.xp, week.minutes);
  });

  return result;
}

export function computeRateSummary(dailyRates: DailyRate[]): RateSummary {
  const total = (days: DailyRate[]) =>
    rateOf(
      days.reduce((sum, d) => sum + d.xp, 0),
      days.reduce((sum, d) => sum + d.minutes, 0)
    );

  return {
    last7: total(dailyRates.slice(-7)),
    previous7: total(dailyRates.slice(-14, -7)),
    allTime: total(dailyRates),
  };
}
