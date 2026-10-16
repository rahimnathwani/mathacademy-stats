import { useMemo, useState } from 'react';
import type { Activity } from '@/types/mathacademy';
import { parseActivityTime, toLocalDateKey } from '@/utils/dates';
import { useStoredActivities } from '@/hooks/useStoredActivities';
import { PageStatus } from '@/components/PageStatus';

interface DayData {
  date: Date;
  xp: number;
  weekday: number; // 0 = Sunday, 6 = Saturday
  courseNames: Set<string>;
}

interface HeatmapStats {
  totalActiveDays: number;
  totalDays: number;
  currentStreak: number;
  maxDailyXP: number;
  averageXP: number;
}

function getColorForXP(xp: number): string {
  if (xp === 0) return '#ebedf0';
  if (xp < 15) return '#9be9a8';
  if (xp < 30) return '#40c463';
  return '#30a14e';
}

function calculateDailyXP(activities: Activity[]): Map<string, DayData> {
  const dailyMap = new Map<string, DayData>();

  activities.forEach((activity) => {
    const date = parseActivityTime(activity.completed);
    const dateKey = toLocalDateKey(date);

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        // Local midnight, so weekday and tooltip dates match the user's timezone
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        xp: 0,
        weekday: date.getDay(),
        courseNames: new Set(),
      });
    }

    const dayData = dailyMap.get(dateKey)!;
    dayData.xp += activity.pointsAwarded;
    if (activity.test.course.name) {
      dayData.courseNames.add(activity.test.course.name);
    }
  });

  return dailyMap;
}

function calculateHeatmapData(activities: Activity[]): { grid: DayData[][]; stats: HeatmapStats } {
  if (activities.length === 0) {
    return {
      grid: [],
      stats: { totalActiveDays: 0, totalDays: 0, currentStreak: 0, maxDailyXP: 0, averageXP: 0 },
    };
  }

  const dailyMap = calculateDailyXP(activities);

  // Get the last date and create 365-day range
  const maxDate = new Date(Math.max(...Array.from(dailyMap.values()).map((d) => d.date.getTime())));
  const endDate = new Date(maxDate);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 364); // 365 days inclusive

  // Align to week boundaries (Sunday to Saturday)
  const daysSinceSunday = (startDate.getDay() + 7) % 7;
  const alignedStartDate = new Date(startDate);
  alignedStartDate.setDate(alignedStartDate.getDate() - daysSinceSunday);

  const daysUntilSaturday = (6 - endDate.getDay() + 7) % 7;
  const alignedEndDate = new Date(endDate);
  alignedEndDate.setDate(alignedEndDate.getDate() + daysUntilSaturday);

  // Create grid data (7 rows x 53 columns)
  const grid: DayData[][] = Array.from({ length: 7 }, () => []);

  const currentDate = new Date(alignedStartDate);
  let weekIndex = 0;

  while (currentDate <= alignedEndDate && weekIndex < 53) {
    // Process one week at a time
    for (let day = 0; day < 7; day++) {
      const dateKey = toLocalDateKey(currentDate);
      const dayData = dailyMap.get(dateKey);

      grid[day].push(
        dayData || {
          date: new Date(currentDate),
          xp: 0,
          weekday: currentDate.getDay(),
          courseNames: new Set(),
        }
      );

      currentDate.setDate(currentDate.getDate() + 1);
    }
    weekIndex++;
  }

  // Calculate statistics over real days only (the grid is padded to full
  // weeks, and grid.flat() is in weekday-row order, not chronological order)
  const chronologicalDays: DayData[] = [];
  for (let col = 0; col < grid[0].length; col++) {
    for (let day = 0; day < 7; day++) {
      const dayData = grid[day][col];
      if (dayData.date >= startDate && dayData.date <= endDate) {
        chronologicalDays.push(dayData);
      }
    }
  }

  const activeDays = chronologicalDays.filter((d) => d.xp > 0);
  const totalActiveDays = activeDays.length;
  const totalDays = chronologicalDays.length;
  const maxDailyXP = Math.max(...chronologicalDays.map((d) => d.xp), 0);
  const averageXP =
    totalActiveDays > 0 ? activeDays.reduce((sum, d) => sum + d.xp, 0) / totalActiveDays : 0;

  // Current streak: consecutive active days ending at the most recent active day
  let currentStreak = 0;
  for (let i = chronologicalDays.length - 1; i >= 0; i--) {
    if (chronologicalDays[i].xp > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    grid,
    stats: {
      totalActiveDays,
      totalDays,
      currentStreak,
      maxDailyXP,
      averageXP,
    },
  };
}

export default function HeatmapPage() {
  const { activities, loading, error, ready } = useStoredActivities();
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { grid, stats } = useMemo(() => calculateHeatmapData(activities), [activities]);

  if (!ready) {
    return <PageStatus className="heatmap-container" loading={loading} error={error} />;
  }
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get month labels for columns
  const monthLabels: { label: string; colStart: number; colSpan: number }[] = [];
  let currentMonth: string | null = null;
  let monthStart = 0;

  grid[0].forEach((dayData, colIndex) => {
    const monthName = dayData.date.toLocaleDateString('en-US', { month: 'short' });
    if (monthName !== currentMonth) {
      if (currentMonth !== null) {
        monthLabels.push({
          label: currentMonth,
          colStart: monthStart,
          colSpan: colIndex - monthStart,
        });
      }
      currentMonth = monthName;
      monthStart = colIndex;
    }
  });

  // Add final month
  if (currentMonth !== null) {
    monthLabels.push({
      label: currentMonth,
      colStart: monthStart,
      colSpan: grid[0].length - monthStart,
    });
  }

  const handleMouseEnter = (dayData: DayData, event: React.MouseEvent) => {
    setHoveredDay(dayData);
    setMousePos({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredDay) {
      setMousePos({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  return (
    <div className="heatmap-container" onMouseMove={handleMouseMove}>
      <div className="heatmap-header">
        <h1>Learning Activity Heatmap</h1>
        <p className="heatmap-subtitle">Your Math Academy learning pattern over the last year</p>
      </div>

      <div className="stats-summary">
        <div className="stat-item">
          <div className="stat-value">{stats.totalActiveDays}</div>
          <div className="stat-label">Active Days</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.currentStreak}</div>
          <div className="stat-label">Current Streak</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{Math.round(stats.averageXP)}</div>
          <div className="stat-label">Avg Daily XP</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.maxDailyXP}</div>
          <div className="stat-label">Max Daily XP</div>
        </div>
      </div>

      <div className="heatmap-wrapper">
        <div className="heatmap-grid-container">
          {/* Month labels */}
          <div className="month-labels">
            {monthLabels.map((month, idx) => (
              <div
                key={idx}
                className="month-label"
                style={{
                  gridColumn: `${month.colStart + 2} / span ${month.colSpan}`,
                }}
              >
                {month.label}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="heatmap-grid">
            {/* Weekday labels column */}
            <div className="weekday-labels">
              {weekdayLabels.map((label, idx) => (
                <div key={idx} className="weekday-label">
                  {idx % 2 === 1 ? label : ''}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="days-grid">
              {grid.map((week, weekdayIdx) =>
                week.map((dayData, colIdx) => (
                  <div
                    key={`${weekdayIdx}-${colIdx}`}
                    className="day-cell"
                    style={{
                      backgroundColor: getColorForXP(dayData.xp),
                      gridRow: weekdayIdx + 1,
                      gridColumn: colIdx + 1,
                    }}
                    onMouseEnter={(e) => handleMouseEnter(dayData, e)}
                    onMouseLeave={handleMouseLeave}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="heatmap-legend">
          <span className="legend-label">Less</span>
          <div className="legend-box" style={{ backgroundColor: '#ebedf0' }} />
          <div className="legend-box" style={{ backgroundColor: '#9be9a8' }} />
          <div className="legend-box" style={{ backgroundColor: '#40c463' }} />
          <div className="legend-box" style={{ backgroundColor: '#30a14e' }} />
          <span className="legend-label">More</span>
        </div>
      </div>

      {hoveredDay && (
        <div
          className="tooltip"
          style={{
            left: mousePos.x + 10,
            top: mousePos.y + 10,
          }}
        >
          <div className="tooltip-date">
            {hoveredDay.date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <div className="tooltip-xp">
            {hoveredDay.xp === 0 ? 'No activity' : `${hoveredDay.xp} XP`}
          </div>
          {hoveredDay.courseNames.size > 0 && (
            <div className="tooltip-courses">{Array.from(hoveredDay.courseNames).join(', ')}</div>
          )}
        </div>
      )}
    </div>
  );
}
