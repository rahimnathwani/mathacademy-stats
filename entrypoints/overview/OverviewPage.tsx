import { useEffect, useState, useRef } from 'react';
import type { Activity } from '@/types/mathacademy';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './overview.css';
import {
  calculateTotalXP,
  calculateAvgXPPerDay,
  calculateXPAttainment,
  calculateActivityCounts,
  getCurrentCourse,
  getCourseTransitions,
  type CourseTransition,
} from './overview-calculations';
import {
  getCumulativeXPData,
  getCumulativeActivitiesData,
  getDailyXPData,
  getAvgXPOverTimeData,
  getSuccessRateOverTimeData,
} from './chart-data';

interface MetricCardProps {
  label: string;
  value: string | number;
  chartData: { timestamps: number[]; values: number[] };
  color: string;
  courseTransitions: CourseTransition[];
}

function MetricCard({ label, value, chartData, color, courseTransitions }: MetricCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!chartRef.current || chartData.timestamps.length === 0) return;

    // Format numbers with k suffix
    const formatValue = (val: number) => {
      if (val >= 1000) {
        return `${Math.round(val / 100) / 10}k`;
      }
      return Math.round(val).toString();
    };

    const opts: uPlot.Options = {
      width: chartRef.current.clientWidth,
      height: 140,
      cursor: { show: false },
      legend: { show: false },
      scales: {
        x: { time: true },
        y: { auto: true },
      },
      axes: [
        {
          show: true,
          stroke: '#888',
          size: 30,
          grid: { show: false },
          ticks: { show: false },
          font: '11px sans-serif',
          values: (self, splits) => {
            return splits.map((timestamp) => {
              const date = new Date(timestamp * 1000);
              return date.toLocaleDateString('en-US', { month: 'short' });
            });
          },
        },
        {
          show: true,
          stroke: '#888',
          size: 45,
          grid: { show: false },
          ticks: { show: false },
          font: '11px sans-serif',
          values: (self, splits) => splits.map(formatValue),
        },
      ],
      series: [
        {},
        {
          stroke: color,
          fill: color.replace('rgb', 'rgba').replace(')', ', 0.15)'),
          width: 2,
        },
      ],
      padding: [10, 10, 0, 0],
      hooks: {
        draw: [
          (u) => {
            const ctx = u.ctx;
            
            // Draw vertical lines for course transitions
            courseTransitions.forEach((transition) => {
              const x = u.valToPos(transition.timestamp, 'x', true);
              const y0 = u.bbox.top;
              const y1 = u.bbox.top + u.bbox.height;

              if (x >= u.bbox.left && x <= u.bbox.left + u.bbox.width) {
                ctx.save();
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(x, y0);
                ctx.lineTo(x, y1);
                ctx.stroke();
                ctx.restore();

                // Draw label
                ctx.save();
                ctx.font = '12px sans-serif';
                ctx.fillStyle = '#888';
                ctx.textAlign = 'center';
                ctx.fillText(transition.label, x, y0 - 2);
                ctx.restore();
              }
            });
          },
        ],
      },
    };

    const data: uPlot.AlignedData = [chartData.timestamps, chartData.values];

    plotRef.current = new uPlot(opts, data, chartRef.current);

    return () => {
      if (plotRef.current) {
        plotRef.current.destroy();
        plotRef.current = null;
      }
    };
  }, [chartData, color, courseTransitions]);

  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-chart" ref={chartRef}></div>
    </div>
  );
}

interface ActivityBoxProps {
  count: number;
  label: string;
}

function ActivityBox({ count, label }: ActivityBoxProps) {
  return (
    <div className="activity-box">
      <div className="activity-count">{count}</div>
      <div className="activity-label">{label}</div>
    </div>
  );
}

type TimePeriod = 
  | 'all time'
  | 'the past 7 days'
  | 'the past 30 days'
  | 'last month'
  | 'this month to date'
  | 'last year'
  | 'this year to date';

function filterActivitiesByPeriod(activities: Activity[], period: TimePeriod): Activity[] {
  if (period === 'all time') {
    return activities;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let startDate: Date;

  switch (period) {
    case 'the past 7 days':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 6); // Last 7 days including today
      break;
    
    case 'the past 30 days':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 29); // Last 30 days including today
      break;
    
    case 'last month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
      return activities.filter(activity => {
        const activityDate = new Date(activity.completed);
        return activityDate >= startDate && activityDate <= endDate;
      });
    
    case 'this month to date':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    
    case 'last year':
      startDate = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      return activities.filter(activity => {
        const activityDate = new Date(activity.completed);
        return activityDate >= startDate && activityDate <= lastYearEnd;
      });
    
    case 'this year to date':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    
    default:
      return activities;
  }

  return activities.filter(activity => {
    const activityDate = new Date(activity.completed);
    return activityDate >= startDate;
  });
}

export default function OverviewPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all time');

  useEffect(() => {
    browser.storage.local.get('activitiesData').then((result) => {
      if (result.activitiesData) {
        setActivities(result.activitiesData as Activity[]);
        setLoading(false);
      } else {
        setError('No activities data found. Please generate overview from the popup first.');
        setLoading(false);
      }
    }).catch((err) => {
      setError(`Error loading activities: ${err.message}`);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="overview-container">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overview-container">
        <h1>Error</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="overview-container">
        <h1>No Activities</h1>
        <p>No activities available to display.</p>
      </div>
    );
  }

  // Filter activities based on selected time period
  const filteredActivities = filterActivitiesByPeriod(activities, timePeriod);

  // Calculate all metrics
  const totalXP = calculateTotalXP(filteredActivities);
  const totalActivities = filteredActivities.length;
  const avgXPPerDay = calculateAvgXPPerDay(filteredActivities);
  const xpAttainment = calculateXPAttainment(filteredActivities);
  const activityCounts = calculateActivityCounts(filteredActivities);
  const currentCourse = getCurrentCourse(filteredActivities);
  const courseTransitions = getCourseTransitions(filteredActivities);

  // Get chart data
  const cumulativeXPData = getCumulativeXPData(filteredActivities);
  const cumulativeActivitiesData = getCumulativeActivitiesData(filteredActivities);

  // Use actual daily XP for short periods, rolling average for longer periods
  const useRollingAverage = timePeriod === 'all time' || timePeriod === 'last year' || timePeriod === 'this year to date';
  const avgXPOverTimeData = useRollingAverage
    ? getAvgXPOverTimeData(filteredActivities)
    : getDailyXPData(filteredActivities);

  const successRateData = getSuccessRateOverTimeData(filteredActivities);

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  return (
    <div className="overview-container">
      <h1 className="overview-title">
        Your MathAcademy stats for{' '}
        <select 
          className="time-period-select"
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
        >
          <option value="all time">all time</option>
          <option value="the past 7 days">the past 7 days</option>
          <option value="the past 30 days">the past 30 days</option>
          <option value="last month">last month</option>
          <option value="this month to date">this month to date</option>
          <option value="last year">last year</option>
          <option value="this year to date">this year to date</option>
        </select>
      </h1>
      
      <div className="current-course-section">
        <div className="current-course-label">CURRENT COURSE</div>
        <div className="current-course-name">{currentCourse}</div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="TOTAL XP EARNED"
          value={formatNumber(totalXP)}
          chartData={cumulativeXPData}
          color="rgb(139, 92, 246)"
          courseTransitions={courseTransitions}
        />
        <MetricCard
          label="TOTAL ACTIVITIES"
          value={formatNumber(totalActivities)}
          chartData={cumulativeActivitiesData}
          color="rgb(139, 92, 246)"
          courseTransitions={courseTransitions}
        />
        <MetricCard
          label="AVERAGE XP/DAY"
          value={formatNumber(avgXPPerDay)}
          chartData={avgXPOverTimeData}
          color="rgb(139, 92, 246)"
          courseTransitions={courseTransitions}
        />
        <MetricCard
          label="XP ATTAINMENT"
          value={`${xpAttainment}%`}
          chartData={successRateData}
          color="rgb(139, 92, 246)"
          courseTransitions={courseTransitions}
        />
      </div>

      <div className="activity-boxes">
        <ActivityBox count={activityCounts.lessons} label="LESSONS" />
        <ActivityBox count={activityCounts.reviews} label="REVIEWS" />
        <ActivityBox count={activityCounts.multisteps} label="MULTISTEPS" />
        <ActivityBox count={activityCounts.quizzes} label="QUIZZES" />
        <ActivityBox count={activityCounts.diagnostics} label="DIAGNOSTICS" />
      </div>
    </div>
  );
}

