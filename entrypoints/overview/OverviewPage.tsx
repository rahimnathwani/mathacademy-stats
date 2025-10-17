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
} from './overview-calculations';
import {
  getCumulativeXPData,
  getCumulativeActivitiesData,
  getAvgXPOverTimeData,
  getSuccessRateOverTimeData,
} from './chart-data';

interface MetricCardProps {
  label: string;
  value: string | number;
  chartData: { timestamps: number[]; values: number[] };
  color: string;
}

function MetricCard({ label, value, chartData, color }: MetricCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!chartRef.current || chartData.timestamps.length === 0) return;

    const opts: uPlot.Options = {
      width: chartRef.current.clientWidth,
      height: 100,
      cursor: { show: false },
      legend: { show: false },
      scales: {
        x: { time: true },
        y: { auto: true },
      },
      axes: [
        { show: false },
        { show: false },
      ],
      series: [
        {},
        {
          stroke: color,
          fill: color.replace('rgb', 'rgba').replace(')', ', 0.15)'),
          width: 2,
        },
      ],
      padding: [0, 0, 0, 0],
    };

    const data: uPlot.AlignedData = [chartData.timestamps, chartData.values];

    plotRef.current = new uPlot(opts, data, chartRef.current);

    return () => {
      if (plotRef.current) {
        plotRef.current.destroy();
        plotRef.current = null;
      }
    };
  }, [chartData, color]);

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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Calculate all metrics
  const totalXP = calculateTotalXP(activities);
  const totalActivities = activities.length;
  const avgXPPerDay = calculateAvgXPPerDay(activities);
  const xpAttainment = calculateXPAttainment(activities);
  const activityCounts = calculateActivityCounts(activities);
  const currentCourse = getCurrentCourse(activities);

  // Get chart data
  const cumulativeXPData = getCumulativeXPData(activities);
  const cumulativeActivitiesData = getCumulativeActivitiesData(activities);
  const avgXPOverTimeData = getAvgXPOverTimeData(activities);
  const successRateData = getSuccessRateOverTimeData(activities);

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  return (
    <div className="overview-container">
      <h1 className="overview-title">Your MathAcademy stats for all time</h1>
      
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
        />
        <MetricCard
          label="TOTAL ACTIVITIES"
          value={formatNumber(totalActivities)}
          chartData={cumulativeActivitiesData}
          color="rgb(139, 92, 246)"
        />
        <MetricCard
          label="AVERAGE XP/DAY"
          value={formatNumber(avgXPPerDay)}
          chartData={avgXPOverTimeData}
          color="rgb(139, 92, 246)"
        />
        <MetricCard
          label="XP ATTAINMENT"
          value={`${xpAttainment}%`}
          chartData={successRateData}
          color="rgb(139, 92, 246)"
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

