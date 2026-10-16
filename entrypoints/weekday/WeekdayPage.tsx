import { useMemo } from 'react';
import type { Activity } from '@/types/mathacademy';
import { parseActivityTime, toLocalDateKey } from '@/utils/dates';
import { useStoredActivities } from '@/hooks/useStoredActivities';
import { PageStatus } from '@/components/PageStatus';
import { CategoricalBarChart } from '@/components/CategoricalBarChart';

interface WeekdayData {
  day: string;
  dayIndex: number;
  totalXP: number;
  totalActivities: number;
  avgXP: number;
  activeDays: number;
}

const WEEKDAY_ORDER = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const WEEKDAY_COLORS = [
  '#F18F01', // Sunday
  '#2E86AB', // Monday
  '#A23B72', // Tuesday
  '#6A994E', // Wednesday
  '#8B5CF6', // Thursday
  '#C73E1D', // Friday
  '#F97316', // Saturday
];

function calculateWeekdayData(activities: Activity[]): WeekdayData[] {
  const weekdayMap = new Map<
    number,
    { totalXP: number; activeDays: Set<string>; totalActivities: number }
  >();

  activities.forEach((activity) => {
    const date = parseActivityTime(activity.completed);
    const dayIndex = date.getDay(); // 0 = Sunday, 6 = Saturday
    const dateKey = toLocalDateKey(date);

    if (!weekdayMap.has(dayIndex)) {
      weekdayMap.set(dayIndex, { totalXP: 0, activeDays: new Set(), totalActivities: 0 });
    }

    const data = weekdayMap.get(dayIndex)!;
    data.totalXP += activity.pointsAwarded;
    data.activeDays.add(dateKey);
    data.totalActivities++;
  });

  return WEEKDAY_ORDER.map((day, dayIndex) => {
    const data = weekdayMap.get(dayIndex) || {
      totalXP: 0,
      activeDays: new Set<string>(),
      totalActivities: 0,
    };
    const activeDays = data.activeDays.size;

    return {
      day,
      dayIndex,
      totalXP: data.totalXP,
      totalActivities: data.totalActivities,
      avgXP: activeDays > 0 ? Math.round(data.totalXP / activeDays) : 0,
      activeDays,
    };
  });
}

export default function WeekdayPage() {
  const { activities, loading, error, ready } = useStoredActivities();
  const weekdayData = useMemo(() => calculateWeekdayData(activities), [activities]);

  if (!ready) {
    return <PageStatus className="weekday-container" loading={loading} error={error} />;
  }

  const totalXP = weekdayData.reduce((sum, d) => sum + d.totalXP, 0);
  const totalActiveDays = weekdayData.reduce((sum, d) => sum + d.activeDays, 0);
  const avgOverall = totalActiveDays > 0 ? Math.round(totalXP / totalActiveDays) : 0;

  return (
    <div className="weekday-container">
      <div className="weekday-header">
        <h1>Weekday Distribution</h1>
        <p className="weekday-subtitle">
          Your learning patterns across the week (Overall avg: {avgOverall} XP/day)
        </p>
      </div>

      <div className="chart-section">
        <div className="chart-wrapper">
          <CategoricalBarChart
            title="Average Daily XP by Weekday"
            labels={weekdayData.map((d) => d.day.substring(0, 3))}
            values={weekdayData.map((d) => d.avgXP)}
            colors={WEEKDAY_COLORS}
            height={500}
            showValueLabels
          />
        </div>
      </div>

      <div className="weekday-details">
        {weekdayData.map((data, idx) => (
          <div key={data.day} className="weekday-card">
            <div className="weekday-indicator" style={{ backgroundColor: WEEKDAY_COLORS[idx] }} />
            <div className="weekday-info">
              <div className="weekday-name">{data.day}</div>
              <div className="weekday-stats">
                <div className="weekday-stat">
                  <span className="stat-label">Avg XP:</span>
                  <span className="stat-value">{data.avgXP}</span>
                </div>
                <div className="weekday-stat">
                  <span className="stat-label">Active Days:</span>
                  <span className="stat-value">{data.activeDays}</span>
                </div>
                <div className="weekday-stat">
                  <span className="stat-label">Total XP:</span>
                  <span className="stat-value">{data.totalXP.toLocaleString()}</span>
                </div>
                <div className="weekday-stat">
                  <span className="stat-label">Activities:</span>
                  <span className="stat-value">{data.totalActivities}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
