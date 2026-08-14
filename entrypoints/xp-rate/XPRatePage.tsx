import { useEffect, useMemo, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { useStoredActivities } from '@/hooks/useStoredActivities';
import { PageStatus } from '@/components/PageStatus';
import { toLocalDateKey } from '@/utils/dates';
import {
  computeDailyRates,
  computeRollingRates,
  computeWeeklyRates,
  computeRateSummary,
} from './xp-rate-calculations';

const DAILY_COLOR = 'rgb(178, 158, 240)';
const TREND_COLOR = 'rgb(139, 92, 246)';

interface TrendSeries {
  label: string;
  color: string;
  width: number;
  values: (number | null)[];
  showPoints?: boolean;
}

interface TrendChartProps {
  /** Unix timestamps in seconds, shared by all series */
  timestamps: number[];
  series: TrendSeries[];
  height?: number;
}

/** Time-series line chart for XP/min values; null values render as gaps. */
function TrendChart({ timestamps, series, height = 320 }: TrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!chartRef.current || timestamps.length === 0) return;

    const opts: uPlot.Options = {
      width: chartRef.current.clientWidth,
      height,
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
          values: (_u, splits) =>
            splits.map((ts) =>
              new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            ),
        },
        {
          show: true,
          stroke: '#888',
          size: 45,
          grid: { show: true, stroke: '#eee' },
          ticks: { show: false },
          font: '11px sans-serif',
          values: (_u, splits) => splits.map((v) => v.toFixed(1)),
        },
      ],
      series: [
        {},
        ...series.map((s) => ({
          stroke: s.color,
          width: s.width,
          spanGaps: false,
          points: { show: s.showPoints ?? false, size: 4, fill: s.color },
        })),
      ],
      padding: [10, 10, 0, 0],
    };

    const data: uPlot.AlignedData = [timestamps, ...series.map((s) => s.values)];
    plotRef.current = new uPlot(opts, data, chartRef.current);

    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [timestamps, series, height]);

  return <div ref={chartRef} className="chart"></div>;
}

function formatRate(rate: number | null): string {
  return rate === null ? 'n/a' : rate.toFixed(2);
}

function formatChange(last7: number | null, previous7: number | null): string {
  if (last7 === null || previous7 === null || previous7 === 0) return 'n/a';
  const percent = ((last7 - previous7) / previous7) * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(0)}%`;
}

export default function XPRatePage() {
  const { activities, loading, error, ready } = useStoredActivities();

  const derived = useMemo(() => {
    const dailyRates = computeDailyRates(activities);
    return {
      dailyRates,
      rollingRates: computeRollingRates(dailyRates, 7),
      weeklyRates: computeWeeklyRates(dailyRates),
      summary: computeRateSummary(dailyRates),
    };
  }, [activities]);

  if (!ready) {
    return <PageStatus className="xp-rate-container" loading={loading} error={error} />;
  }

  const { dailyRates, rollingRates, weeklyRates, summary } = derived;
  const recentWeeks = weeklyRates.slice(-12).reverse();

  return (
    <div className="xp-rate-container">
      <div className="xp-rate-header">
        <h1>XP per Minute Trend</h1>
        <p className="xp-rate-subtitle">
          How efficiently you earn XP, and how that changes over time (activities over 2 hours
          excluded)
        </p>
      </div>

      <div className="stats-cards">
        <div className="stats-card">
          <div className="stats-value">{formatRate(summary.last7)}</div>
          <div className="stats-label">Last 7 Days</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">{formatRate(summary.previous7)}</div>
          <div className="stats-label">Previous 7 Days</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">{formatChange(summary.last7, summary.previous7)}</div>
          <div className="stats-label">Week-over-week</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">{formatRate(summary.allTime)}</div>
          <div className="stats-label">All Time</div>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-wrapper">
          <h2 className="chart-title">Daily XP/min</h2>
          <TrendChart
            timestamps={dailyRates.map((d) => d.date.getTime() / 1000)}
            series={[
              {
                label: 'Daily',
                color: DAILY_COLOR,
                width: 1,
                values: dailyRates.map((d) => d.rate),
                showPoints: true,
              },
              {
                label: '7-day trend',
                color: TREND_COLOR,
                width: 2.5,
                values: rollingRates,
              },
            ]}
          />
          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-line" style={{ background: DAILY_COLOR }}></div>
              <span>Daily XP/min</span>
            </div>
            <div className="legend-item">
              <div className="legend-line" style={{ background: TREND_COLOR }}></div>
              <span>7-day rolling XP/min</span>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-wrapper">
          <h2 className="chart-title">Weekly XP/min</h2>
          <TrendChart
            timestamps={weeklyRates.map((w) => w.weekStart.getTime() / 1000)}
            series={[
              {
                label: 'Weekly',
                color: TREND_COLOR,
                width: 2,
                values: weeklyRates.map((w) => w.rate),
                showPoints: true,
              },
            ]}
            height={280}
          />
        </div>
      </div>

      <div className="weekly-table-section">
        <h2>Recent Weeks</h2>
        <table className="weekly-table">
          <thead>
            <tr>
              <th>Week of</th>
              <th>XP</th>
              <th>Minutes</th>
              <th>Active Days</th>
              <th>XP/min</th>
            </tr>
          </thead>
          <tbody>
            {recentWeeks.map((week) => (
              <tr key={toLocalDateKey(week.weekStart)}>
                <td>
                  {week.weekStart.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td>{week.xp.toLocaleString()}</td>
                <td>{Math.round(week.minutes).toLocaleString()}</td>
                <td>{week.activeDays}</td>
                <td className="rate-cell">{formatRate(week.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
