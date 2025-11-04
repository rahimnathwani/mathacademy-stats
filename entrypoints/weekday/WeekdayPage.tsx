import { useEffect, useState, useRef } from 'react';
import type { Activity } from '@/types/mathacademy';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

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
  const weekdayMap = new Map<number, { totalXP: number; activeDays: Set<string>; totalActivities: number }>();

  activities.forEach(activity => {
    const date = new Date(activity.completed);
    const dayIndex = date.getDay(); // 0 = Sunday, 6 = Saturday
    const dateKey = date.toISOString().split('T')[0];

    if (!weekdayMap.has(dayIndex)) {
      weekdayMap.set(dayIndex, { totalXP: 0, activeDays: new Set(), totalActivities: 0 });
    }

    const data = weekdayMap.get(dayIndex)!;
    data.totalXP += activity.pointsAwarded;
    data.activeDays.add(dateKey);
    data.totalActivities++;
  });

  return WEEKDAY_ORDER.map((day, dayIndex) => {
    const data = weekdayMap.get(dayIndex) || { totalXP: 0, activeDays: new Set(), totalActivities: 0 };
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    browser.storage.local.get('activitiesData').then((result) => {
      if (result.activitiesData) {
        setActivities(result.activitiesData as Activity[]);
        setLoading(false);
      } else {
        setError('No activities data found. Please fetch data from the popup first.');
        setLoading(false);
      }
    }).catch((err) => {
      setError(`Error loading activities: ${err.message}`);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activities.length === 0 || !chartRef.current) return;

    const weekdayData = calculateWeekdayData(activities);

    // Create bar chart using uPlot
    const labels = weekdayData.map(d => d.day.substring(0, 3));
    const values = weekdayData.map(d => d.avgXP);
    const xData = weekdayData.map((_, i) => i);

    const opts: uPlot.Options = {
      width: chartRef.current.clientWidth,
      height: 500,
      title: 'Average Daily XP by Weekday',
      cursor: { show: false },
      legend: { show: false },
      scales: {
        x: {
          time: false,
          range: [-0.5, weekdayData.length - 0.5]
        },
        y: { auto: true },
      },
      axes: [
        {
          show: true,
          stroke: '#888',
          size: 60,
          grid: { show: false },
          ticks: { show: false },
          font: '14px sans-serif',
          values: (_self, _splits) => labels,
        },
        {
          show: true,
          stroke: '#888',
          size: 60,
          grid: { show: true, stroke: '#eee' },
          ticks: { show: true },
          font: '14px sans-serif',
        },
      ],
      series: [
        {},
        {
          stroke: 'transparent',
          width: 0,
        },
      ],
      hooks: {
        draw: [
          (u) => {
            const ctx = u.ctx;
            const barWidth = 0.7;

            for (let i = 0; i < xData.length; i++) {
              const x = u.valToPos(i, 'x', true);
              const y = u.valToPos(values[i], 'y', true);
              const y0 = u.valToPos(0, 'y', true);
              const barWidthPx = (u.bbox.width / weekdayData.length) * barWidth;

              ctx.fillStyle = WEEKDAY_COLORS[i];
              ctx.fillRect(
                x - barWidthPx / 2,
                y,
                barWidthPx,
                y0 - y
              );

              // Draw value labels on top of bars
              ctx.fillStyle = '#24292e';
              ctx.font = 'bold 14px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(values[i].toString(), x, y - 8);
            }
          },
        ],
      },
      padding: [60, 10, 0, 10],
    };

    const plotData: uPlot.AlignedData = [xData, values];
    plotRef.current = new uPlot(opts, plotData, chartRef.current);

    return () => {
      if (plotRef.current) {
        plotRef.current.destroy();
        plotRef.current = null;
      }
    };
  }, [activities]);

  if (loading) {
    return (
      <div className="weekday-container">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weekday-container">
        <h1>Error</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="weekday-container">
        <h1>No Activities</h1>
        <p>No activities available to display.</p>
      </div>
    );
  }

  const weekdayData = calculateWeekdayData(activities);
  const totalXP = weekdayData.reduce((sum, d) => sum + d.totalXP, 0);
  const avgOverall = Math.round(totalXP / weekdayData.reduce((sum, d) => sum + d.activeDays, 0));

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
          <div ref={chartRef} className="chart"></div>
        </div>
      </div>

      <div className="weekday-details">
        {weekdayData.map((data, idx) => (
          <div key={data.day} className="weekday-card">
            <div
              className="weekday-indicator"
              style={{ backgroundColor: WEEKDAY_COLORS[idx] }}
            />
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
