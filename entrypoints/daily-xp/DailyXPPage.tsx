import { useEffect, useState, useRef } from 'react';
import type { Activity } from '@/types/mathacademy';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

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

function calculateDailyXP(activities: Activity[]): Map<string, number> {
  const dailyMap = new Map<string, number>();

  activities.forEach(activity => {
    const date = new Date(activity.completed);
    const dateKey = date.toISOString().split('T')[0];

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, 0);
    }

    dailyMap.set(dateKey, dailyMap.get(dateKey)! + activity.pointsAwarded);
  });

  return dailyMap;
}

function calculateHistogramData(dailyXP: Map<string, number>, bins: number = 10): {
  histogram: HistogramBin[];
  stats: DailyXPStats;
} {
  const xpValues = Array.from(dailyXP.values()).filter(xp => xp > 0);

  if (xpValues.length === 0) {
    return {
      histogram: [],
      stats: { min: 0, max: 0, mean: 0, median: 0, totalDays: 0 }
    };
  }

  xpValues.sort((a, b) => a - b);

  const min = xpValues[0];
  const max = xpValues[xpValues.length - 1];
  const mean = xpValues.reduce((sum, xp) => sum + xp, 0) / xpValues.length;
  const median = xpValues[Math.floor(xpValues.length / 2)];

  // Create bins
  const binSize = Math.ceil((max - min) / bins);
  const histogram: HistogramBin[] = [];

  for (let i = 0; i < bins; i++) {
    const rangeStart = min + i * binSize;
    const rangeEnd = i === bins - 1 ? max : rangeStart + binSize - 1;

    const count = xpValues.filter(xp => xp >= rangeStart && xp <= rangeEnd).length;

    histogram.push({
      rangeStart,
      rangeEnd,
      count,
      label: `${rangeStart}-${rangeEnd}`,
    });
  }

  return {
    histogram: histogram.filter(bin => bin.count > 0), // Remove empty bins
    stats: { min, max, mean, median, totalDays: xpValues.length }
  };
}

export default function DailyXPPage() {
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

    const dailyXP = calculateDailyXP(activities);
    const { histogram, stats } = calculateHistogramData(dailyXP, 12);

    if (histogram.length === 0) return;

    // Create histogram chart using uPlot
    const labels = histogram.map(bin => bin.label);
    const counts = histogram.map(bin => bin.count);
    const xData = histogram.map((_, i) => i);

    const opts: uPlot.Options = {
      width: chartRef.current.clientWidth,
      height: 500,
      title: 'Daily XP Distribution',
      cursor: { show: false },
      legend: { show: false },
      scales: {
        x: {
          time: false,
          range: [-0.5, histogram.length - 0.5]
        },
        y: { auto: true },
      },
      axes: [
        {
          show: true,
          stroke: '#888',
          size: 60,
          grid: { show: false },
          ticks: { show: true },
          font: '12px sans-serif',
          values: (_self, _splits) => labels,
        },
        {
          show: true,
          stroke: '#888',
          size: 60,
          grid: { show: true, stroke: '#eee' },
          ticks: { show: true },
          font: '13px sans-serif',
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
            const barWidth = 0.8;

            for (let i = 0; i < xData.length; i++) {
              const x = u.valToPos(i, 'x', true);
              const y = u.valToPos(counts[i], 'y', true);
              const y0 = u.valToPos(0, 'y', true);
              const barWidthPx = (u.bbox.width / histogram.length) * barWidth;

              ctx.fillStyle = '#2E86AB';
              ctx.fillRect(
                x - barWidthPx / 2,
                y,
                barWidthPx,
                y0 - y
              );

              // Draw count labels on top of bars
              ctx.fillStyle = '#24292e';
              ctx.font = 'bold 13px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(counts[i].toString(), x, y - 8);
            }

            // Draw mean line
            const meanX = histogram.findIndex(bin =>
              stats.mean >= bin.rangeStart && stats.mean <= bin.rangeEnd
            );
            if (meanX >= 0) {
              const x = u.valToPos(meanX, 'x', true);
              ctx.save();
              ctx.strokeStyle = '#d73a49';
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.moveTo(x, u.bbox.top);
              ctx.lineTo(x, u.bbox.top + u.bbox.height);
              ctx.stroke();
              ctx.restore();
            }

            // Draw median line
            const medianX = histogram.findIndex(bin =>
              stats.median >= bin.rangeStart && stats.median <= bin.rangeEnd
            );
            if (medianX >= 0) {
              const x = u.valToPos(medianX, 'x', true);
              ctx.save();
              ctx.strokeStyle = '#f97316';
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.moveTo(x, u.bbox.top);
              ctx.lineTo(x, u.bbox.top + u.bbox.height);
              ctx.stroke();
              ctx.restore();
            }
          },
        ],
      },
      padding: [60, 10, 0, 10],
    };

    const plotData: uPlot.AlignedData = [xData, counts];
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
      <div className="daily-xp-container">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="daily-xp-container">
        <h1>Error</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="daily-xp-container">
        <h1>No Activities</h1>
        <p>No activities available to display.</p>
      </div>
    );
  }

  const dailyXP = calculateDailyXP(activities);
  const { histogram, stats } = calculateHistogramData(dailyXP, 12);

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
          <div className="stats-value">{stats.min}-{stats.max}</div>
          <div className="stats-label">Range</div>
        </div>
      </div>

      <div className="chart-section">
        <div className="chart-wrapper">
          <div ref={chartRef} className="chart"></div>
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
