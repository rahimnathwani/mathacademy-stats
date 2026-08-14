import { useCallback, useMemo } from 'react';
import type uPlot from 'uplot';
import { useStoredActivities } from '@/hooks/useStoredActivities';
import { PageStatus } from '@/components/PageStatus';
import { CategoricalBarChart } from '@/components/CategoricalBarChart';
import { groupActivitiesByDay } from '../overview/overview-calculations';

interface DailyXPStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  totalDays: number;
}

interface HistogramBin {
  rangeStart: number;
  rangeEnd: number;
  count: number;
  label: string;
}

const MEAN_LINE_COLOR = '#d73a49';
const MEDIAN_LINE_COLOR = '#f97316';

function calculateHistogramData(
  dailyXPValues: number[],
  bins: number
): {
  histogram: HistogramBin[];
  stats: DailyXPStats;
} {
  const xpValues = dailyXPValues.filter((xp) => xp > 0);

  if (xpValues.length === 0) {
    return {
      histogram: [],
      stats: { min: 0, max: 0, mean: 0, median: 0, totalDays: 0 },
    };
  }

  xpValues.sort((a, b) => a - b);

  const min = xpValues[0];
  const max = xpValues[xpValues.length - 1];
  const mean = xpValues.reduce((sum, xp) => sum + xp, 0) / xpValues.length;
  const mid = Math.floor(xpValues.length / 2);
  const median =
    xpValues.length % 2 === 1 ? xpValues[mid] : (xpValues[mid - 1] + xpValues[mid]) / 2;

  // Create bins
  const binSize = Math.ceil((max - min) / bins) || 1;
  const histogram: HistogramBin[] = [];

  for (let i = 0; i < bins; i++) {
    const rangeStart = min + i * binSize;
    const rangeEnd = i === bins - 1 ? max : rangeStart + binSize - 1;

    const count = xpValues.filter((xp) => xp >= rangeStart && xp <= rangeEnd).length;

    histogram.push({
      rangeStart,
      rangeEnd,
      count,
      label: `${rangeStart}-${rangeEnd}`,
    });
  }

  return {
    histogram: histogram.filter((bin) => bin.count > 0), // Remove empty bins
    stats: { min, max, mean, median, totalDays: xpValues.length },
  };
}

export default function DailyXPPage() {
  const { activities, loading, error, ready } = useStoredActivities();

  const { histogram, stats } = useMemo(
    () =>
      calculateHistogramData(
        groupActivitiesByDay(activities).map((day) => day.xp),
        12
      ),
    [activities]
  );

  // Dashed vertical lines marking the bins containing the mean and median.
  const drawStatLines = useCallback(
    (u: uPlot) => {
      const drawLine = (value: number, color: string) => {
        const binIndex = histogram.findIndex(
          (bin) => value >= bin.rangeStart && value <= bin.rangeEnd
        );
        if (binIndex < 0) return;

        const x = u.valToPos(binIndex, 'x', true);
        const ctx = u.ctx;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, u.bbox.top);
        ctx.lineTo(x, u.bbox.top + u.bbox.height);
        ctx.stroke();
        ctx.restore();
      };

      drawLine(stats.mean, MEAN_LINE_COLOR);
      drawLine(stats.median, MEDIAN_LINE_COLOR);
    },
    [histogram, stats]
  );

  if (!ready) {
    return <PageStatus className="daily-xp-container" loading={loading} error={error} />;
  }

  return (
    <div className="daily-xp-container">
      <div className="daily-xp-header">
        <h1>Daily XP Distribution</h1>
        <p className="daily-xp-subtitle">
          Distribution of daily XP across {stats.totalDays} active days
        </p>
      </div>

      <div className="stats-cards">
        <div className="stats-card">
          <div className="stats-value">{Math.round(stats.mean)}</div>
          <div className="stats-label">Mean Daily XP</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">{Math.round(stats.median)}</div>
          <div className="stats-label">Median Daily XP</div>
        </div>
        <div className="stats-card">
          <div className="stats-value">
            {stats.min}-{stats.max}
          </div>
          <div className="stats-label">Range</div>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-wrapper">
          <CategoricalBarChart
            title="Daily XP Distribution"
            labels={histogram.map((bin) => bin.label)}
            values={histogram.map((bin) => bin.count)}
            colors="#2E86AB"
            height={500}
            barWidthRatio={0.8}
            showValueLabels
            drawExtra={drawStatLines}
          />
          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-line mean"></div>
              <span>Mean ({Math.round(stats.mean)} XP)</span>
            </div>
            <div className="legend-item">
              <div className="legend-line median"></div>
              <span>Median ({Math.round(stats.median)} XP)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="distribution-details">
        <h2>Distribution Details</h2>
        <div className="distribution-grid">
          {histogram.map((bin, idx) => (
            <div key={idx} className="bin-card">
              <div className="bin-range">{bin.label} XP</div>
              <div className="bin-count">
                {bin.count} {bin.count === 1 ? 'day' : 'days'}{' '}
                <span className="bin-percentage">
                  ({((bin.count / stats.totalDays) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
