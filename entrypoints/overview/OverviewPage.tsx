import { useEffect, useMemo, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './overview.css';
import { useStoredActivities } from '@/hooks/useStoredActivities';
import { PageStatus } from '@/components/PageStatus';
import {
  calculateTotalXP,
  calculateAvgXPPerDay,
  calculateXPAttainment,
  calculateActivityCounts,
  getCurrentCourse,
  getCourseTransitions,
  getPeriodRange,
  filterActivitiesByPeriod,
  TIME_PERIODS,
  type TimePeriod,
  type CourseTransition,
} from './overview-calculations';
import {
  getCumulativeXPData,
  getCumulativeActivitiesData,
  getDailyXPData,
  getAvgXPOverTimeData,
  getSuccessRateOverTimeData,
} from './chart-data';

const METRIC_COLOR = 'rgb(139, 92, 246)';

interface MetricCardProps {
  label: string;
  value: string | number;
  chartData: { timestamps: number[]; values: number[] };
  courseTransitions: CourseTransition[];
}

function MetricCard({ label, value, chartData, courseTransitions }: MetricCardProps) {
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
          stroke: METRIC_COLOR,
          fill: METRIC_COLOR.replace('rgb', 'rgba').replace(')', ', 0.15)'),
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
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [chartData, courseTransitions]);

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

export default function OverviewPage() {
  const { activities, loading, error, ready } = useStoredActivities();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all time');

  // Memoized so metric and chart identities stay stable across re-renders;
  // MetricCard rebuilds its uPlot canvas whenever chartData changes.
  const derived = useMemo(() => {
    const filteredActivities = filterActivitiesByPeriod(activities, timePeriod);
    const chartStartDate = getPeriodRange(timePeriod).start;

    // Use actual daily XP for short periods, rolling average for longer periods
    const useRollingAverage =
      timePeriod === 'all time' || timePeriod === 'last year' || timePeriod === 'this year to date';

    return {
      totalXP: calculateTotalXP(filteredActivities),
      totalActivities: filteredActivities.length,
      avgXPPerDay: calculateAvgXPPerDay(filteredActivities),
      xpAttainment: calculateXPAttainment(filteredActivities),
      activityCounts: calculateActivityCounts(filteredActivities),
      currentCourse: getCurrentCourse(filteredActivities),
      courseTransitions: getCourseTransitions(filteredActivities),
      cumulativeXPData: getCumulativeXPData(filteredActivities, chartStartDate),
      cumulativeActivitiesData: getCumulativeActivitiesData(filteredActivities, chartStartDate),
      avgXPOverTimeData: useRollingAverage
        ? getAvgXPOverTimeData(filteredActivities, chartStartDate)
        : getDailyXPData(filteredActivities, chartStartDate),
      successRateData: getSuccessRateOverTimeData(filteredActivities, chartStartDate),
    };
  }, [activities, timePeriod]);

  if (!ready) {
    return <PageStatus className="overview-container" loading={loading} error={error} />;
  }

  const {
    totalXP,
    totalActivities,
    avgXPPerDay,
    xpAttainment,
    activityCounts,
    currentCourse,
    courseTransitions,
    cumulativeXPData,
    cumulativeActivitiesData,
    avgXPOverTimeData,
    successRateData,
  } = derived;

  const formatNumber = (num: number) => num.toLocaleString('en-US');

  return (
    <div className="overview-container">
      <h1 className="overview-title">
        Your MathAcademy stats for{' '}
        <select
          className="time-period-select"
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
        >
          {TIME_PERIODS.map((period) => (
            <option key={period} value={period}>
              {period}
            </option>
          ))}
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
          courseTransitions={courseTransitions}
        />
        <MetricCard
          label="TOTAL ACTIVITIES"
          value={formatNumber(totalActivities)}
          chartData={cumulativeActivitiesData}
          courseTransitions={courseTransitions}
        />
        <MetricCard
          label="AVERAGE XP/DAY"
          value={formatNumber(avgXPPerDay)}
          chartData={avgXPOverTimeData}
          courseTransitions={courseTransitions}
        />
        <MetricCard
          label="XP ATTAINMENT"
          value={`${xpAttainment}%`}
          chartData={successRateData}
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
